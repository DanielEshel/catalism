const { Game } = require("../models/Schemas");
const { generateBoardGraph } = require("./boardLogic"); // <--- IMPORT NEW LOGIC

// --- CORE LOGIC ---

// 1. Create Game (DB Only)
const createGame = async (hostId, maxPlayers = 4) => {
  const newGame = new Game({
    hostId,
    playerIds: [hostId],
    // Host initializes empty; resources/stats added upon join/start usually,
    // but initializing basic state here is fine.
    playerStates: [
      {
        userId: hostId,
        connected: true, // Host is implicitly connected
        resources: {
          carbonFiber: 3,
          catnip: 2,
          mice: 2,
          cosmicMilk: 0,
          spaceCrystal: 3,
        },
        victoryPoints: 0,
        settlements: [],
        cities: [],
        roads: [],
      },
    ],
    maxPlayers,
    status: "lobby",
    boardState: null, // Board is generated when game starts
  });
  return await newGame.save();
};

const requestJoinGame = async (gameId, userId) => {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Game not found.");

  const playerState = game.playerStates.find(p => p.userId.toString() === userId);

  // 1. Permanent Block: Once a player quits, they are out for good
  if (playerState?.hasQuit) {
    throw new Error("You have already quit this game.");
  }

  // 2. Rejoining Logic (Lobby or In-Progress)
  if (playerState) {
    // Idempotency: If already connected, skip DB save
    if (playerState.connected) return { status: "already_joined" };
    
    // User is already a registered player, just returning for socket connection
    return { status: "reserved_awaiting_socket" };
  }

  // 3. New Join Restrictions
  if (game.status !== "lobby") {
    throw new Error("Game in progress. New players cannot join.");
  }

  if (game.playerIds.length >= game.maxPlayers) {
    throw new Error("Sector is full.");
  }

  // 4. Atomic Registration (New Player)
  game.playerIds.push(userId);
  game.playerStates.push({
    userId,
    connected: false, // Will be set to true in finalizeSocketJoin
    resources: { carbonFiber: 0, catnip: 0, mice: 0, cosmicMilk: 0, spaceCrystal: 0 },
    victoryPoints: 0,
    settlements: [],
    cities: [],
    roads: [],
  });

  await game.save();

  // Ghost Purge: Clean up if they never actually open the socket
  setTimeout(() => purgeGhostPlayer(gameId, userId), 5000);

  return { status: "reserved_awaiting_socket" };
};

// 3. SOCKET STEP: Finalize & Check Start
const finalizeSocketJoin = async (gameId, userId) => {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Game not found");

  // FIND THE RESERVATION
  const player = game.playerStates.find((p) => p.userId.toString() === userId);

  if (!player) {
    throw new Error(
      "Reservation expired. You were too slow! Try joining again.",
    );
  }

  // CONFIRM CONNECTION (Saves them from the purge)
  player.connected = true;

  // Auto-Start Logic (Only count CONNECTED players)
  const connectedCount = game.playerStates.filter((p) => p.connected).length;
  let event = null;

  if (game.status === "lobby" && connectedCount === game.maxPlayers) {
    console.log(`All pilots connected. Launching Game ${gameId}...`);

    game.status = "in-progress";
    game.startTime = new Date();
    game.turn = game.playerIds[0];

    // --- HERE IS THE FIX ---
    // We use the new graph generator!
    game.boardState = generateBoardGraph();

    event = {
      type: "GAME_STARTED",
      payload: { board: game.boardState, firstTurn: game.turn },
    };
  }

  await game.save();

  // Ensure the player names are populated before returning to the server
  await game.populate("playerStates.userId", "displayName");

  return { game, event };
};

const purgeGhostPlayer = async (gameId, userId) => {
  try {
    // 1. Re-fetch the FRESH game state (Crucial!)
    const game = await Game.findById(gameId);
    if (!game) return;

    const playerIndex = game.playerStates.findIndex(
      (p) => p.userId.toString() === userId,
    );

    // 2. SAFETY CHECK: Only purge if they are STILL disconnected
    if (playerIndex !== -1) {
      const player = game.playerStates[playerIndex];

      // If they are marked 'connected: true', DO NOT PURGE THEM.
      if (player.connected) {
        console.log(
          `Ghost Purge Cancelled for ${userId} (Player successfully connected)`,
        );
        return;
      }

      console.log(
        `Purging ghost player ${userId} from game ${gameId} (Timeout)`,
      );

      // Remove from states array
      game.playerStates.splice(playerIndex, 1);
      // Remove from IDs array
      game.playerIds = game.playerIds.filter((id) => id.toString() !== userId);

      await game.save();
    }
  } catch (err) {
    console.error("Ghost Purge Error:", err.message);
  }
};

const getGameState = async (gameId) => {
  if (!gameId) return null;
  return await Game.findById(gameId)
    .populate("hostId", "displayName")
    .populate("playerStates.userId", "displayName");
};

// UPDATED: Now accepts userId to find their specific game
const listOpenGames = async (userId) => {
  // 1. Get all joinable games
  const rawGames = await Game.find({
    status: { $in: ["lobby", "in-progress"] },
  }).select("status playerStates maxPlayers startTime playerIds");

  const validGames = [];

  for (const g of rawGames) {
    const activePlayers = g.playerStates.filter((p) => !p.hasQuit);

    if (g.playerIds.length === 0 || activePlayers.length === 0) {
      await Game.updateOne({ _id: g._id }, { status: "finished" });
      continue;
    }

    validGames.push(g);
  }

  // 2. Check if THIS user is already in one of them
  let activeGameId = null;
  if (userId) {
    // ✨ THE FIX: Use .some() and .toString() to safely compare MongoDB ObjectIds to strings!
    const myGame = validGames.find((g) =>
      g.playerIds.some((id) => id.toString() === userId.toString()),
    );
    if (myGame) activeGameId = myGame._id;
  }

  return { games: validGames, activeGameId };
};


const getOldGamesByStatus = async (status, inactiveTimeMs) => {
    const thresholdDate = new Date(Date.now() - inactiveTimeMs);
    return await Game.find({
        status: status,
        updatedAt: { $lt: thresholdDate }
    }).select('_id');
};

/**
 * Completely nukes games from the database (used for abandoned lobbies).
 */
const deleteGamesCompletely = async (gameIds) => {
    if (!gameIds || gameIds.length === 0) return;
    
    await Game.deleteMany({ _id: { $in: gameIds } });
    
    await Action.deleteMany({ gameId: { $in: gameIds } });
    
    console.log(`[Cleanup] Deleted ${gameIds.length} completely abandoned games.`);
};

/**
 * Marks games as DNF (used for in-progress games that were abandoned).
 */
const markGamesAsDNF = async (gameIds) => {
    if (!gameIds || gameIds.length === 0) return;
    
    await Game.updateMany(
        { _id: { $in: gameIds } },
        { $set: { status: 'dnf' } }
    );
    // delete actions for dnf games to prevent clutter and confusion in logs
    await Action.deleteMany({ gameId: { $in: gameIds } });

    console.log(`[Cleanup] Marked ${gameIds.length} abandoned games as DNF.`);
};

module.exports = {
  createGame,
  requestJoinGame,
  finalizeSocketJoin,
  getGameState,
  listOpenGames, // Exported correctly now
  purgeGhostPlayer,
  getOldGamesByStatus,
  deleteGamesCompletely,
  markGamesAsDNF,
};
