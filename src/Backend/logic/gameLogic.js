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
          carbonFiber: 0,
          catnip: 0,
          mice: 0,
          cosmicMilk: 0,
          spaceCrystal: 0,
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

// 2. HTTP STEP: Request a Reservation
const requestJoinGame = async (gameId, userId) => {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Game not found.");

  // Idempotency: If already connected, do nothing.
  const existingPlayer = game.playerStates.find(
    (p) => p.userId.toString() === userId,
  );
  if (existingPlayer && existingPlayer.connected) {
    return { status: "already_joined" };
  }

  if (game.status !== "lobby") throw new Error("Game is locked/started.");
  if (game.playerIds.length >= game.maxPlayers)
    throw new Error("Lobby is full.");

  // RESERVE THE SLOT (Mark as NOT connected)
  if (!game.playerIds.includes(userId)) {
    game.playerIds.push(userId);
    game.playerStates.push({
      userId,
      connected: false, // <--- KEY FLAG (Waiting for socket)
      resources: {
        carbonFiber: 2,
        catnip: 2,
        mice: 2,
        cosmicMilk: 0,
        spaceCrystal: 2,
      },
      victoryPoints: 0,
      settlements: [],
      cities: [],
      roads: [],
    });
  }

  await game.save();

  // Start 5-second timer to purge if they don't connect via socket
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
  return await Game.findById(gameId).populate("hostId", "displayName");
};

// UPDATED: Now accepts userId to find their specific game
const listOpenGames = async (userId) => {
  // 1. Get all joinable games
  const lobbyGames = await Game.find({
    status: { $in: ["lobby", "in-progress"] },
  }).select("status playerStates maxPlayers startTime playerIds");

  // 2. Check if THIS user is already in one of them
  let activeGameId = null;
  if (userId) {
    const myGame = lobbyGames.find((g) => g.playerIds.includes(userId));
    if (myGame) activeGameId = myGame._id;
  }

  // Return object with list AND the active ID
  return { games: lobbyGames, activeGameId };
};

module.exports = {
  createGame,
  requestJoinGame,
  finalizeSocketJoin,
  getGameState,
  listOpenGames, // Exported correctly now
  purgeGhostPlayer,
};
