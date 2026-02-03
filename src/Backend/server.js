// server.js
const express = require("express");
const http = require("http");
const connectDB = require("./db");
const { protect } = require("./middleware/authMiddleware"); // <--- IMPORT HERE
require("./models/Schemas");

const GameLogic = require("./logic/gameLogic");
const ActionLogic = require("./logic/actionLogic");
const UserLogic = require("./logic/userLogic");
const SocketController = require("./controllers/socketController");

const app = express();
const server = http.createServer(app);

app.use(express.json());
connectDB();

// --- FOG OF WAR LOGIC
const distributeGamePulse = (gameRaw) => {
    // 1. Convert to Plain Object
    const gameFull = gameRaw.toObject ? gameRaw.toObject() : gameRaw;
    const gameId = gameFull._id.toString();

    // 2. Loop through every player in the game state
    gameFull.playerStates.forEach(targetPlayer => {
        const targetId = targetPlayer.userId._id 
            ? targetPlayer.userId._id.toString() 
            : targetPlayer.userId.toString();

        // 3. Deep Clone for this specific target
        const personalizedGame = JSON.parse(JSON.stringify(gameFull));

        // 4. Sanitize Opponents
        personalizedGame.playerStates = personalizedGame.playerStates.map(p => {
            const pId = p.userId._id ? p.userId._id.toString() : p.userId.toString();

            if (pId !== targetId) {
                // HIDE OPPONENT DATA
                const resCount = Object.values(p.resources || {}).reduce((a,b)=>a+b, 0);
                p.resources = null; 
                p.resourceCount = resCount; 

                const devCount = (p.developmentCards || []).length;
                p.developmentCards = null; 
                p.devCardCount = devCount; 
            }
            return p;
        });

        // 5. UNICAST via Controller
        SocketController.emitToUser(targetId, 'game_pulse', personalizedGame);
    });
};

const handleClientStream = async (socket, data) => {
  const userId = socket.data.userId;
  const { gameId, actionType, payload } = data;

  console.log(`[SERVER] Action: ${actionType} from ${userId.slice(-4)}`);

  try {
    // SPECIAL CASE: Player Just Connected
    if (actionType === "player_connected") {
         // Logic passed from controller to trigger initial pulse + events
         await distributeGamePulse(payload.game);
         if (payload.event) {
            SocketController.broadcastToRoom(gameId, "game_event", payload.event);
         }
         return;
    }

    // 1. SYNC REQUEST
    if (actionType === "sync_request") {
      const game = await GameLogic.getGameState(gameId);
      // Send pulse ONLY to this user (Unicast)
      // We can use the heavy distributor, or just craft one packet manually. 
      // Using the distributor keeps logic consistent even if slightly heavier.
      await distributeGamePulse(game); 
      return;
    }

    // 2. PROCESS ACTION
    const result = await ActionLogic.processAction(
      gameId,
      userId,
      actionType,
      payload,
    );

    console.log(`[SERVER] Action Valid. Broadcasting updates...`);

    // 3. DISTRIBUTE UPDATES
    if (result.game) {
      // A. GAME STATE (Private/Sanitized)
      distributeGamePulse(result.game); // <--- Using the new helper

      // B. EVENT (Public)
      if (result.event) {
        SocketController.broadcastToRoom(gameId, "game_event", result.event);
      }

      // C. LOGS (Public)
      if (result.logMessage) {
        SocketController.broadcastToRoom(gameId, "action_log", {
          userId,
          message: result.logMessage,
          timestamp: new Date(),
        });
      }
    }
  } catch (err) {
    console.error(`[SERVER] Error: ${err.message}`);
    SocketController.sendError(socket, err.message);
  }
};

SocketController.init(server, handleClientStream);

// --- ROUTES ---
// (Keep your existing routes: register, login, create, join, list...)
app.post("/api/users/register", async (req, res) => {
    try {
      const result = await UserLogic.registerUser(req.body);
      res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});
  
app.post("/api/users/login", async (req, res) => {
    try {
      const result = await UserLogic.loginUser(req.body);
      res.json(result);
    } catch (e) { res.status(401).json({ error: e.message }); }
});
  
app.post("/api/games/create", protect, async (req, res) => {
    try {
      const game = await GameLogic.createGame(req.user.id, req.body.maxPlayers);
      res.status(201).json(game);
    } catch (e) { res.status(400).json({ error: e.message }); }
});
  
app.post("/api/games/join", protect, async (req, res) => {
    try {
      const result = await GameLogic.requestJoinGame(req.body.gameId, req.user.id);
      res.json({ message: "Slot reserved.", status: result.status });
    } catch (e) { res.status(400).json({ error: e.message }); }
});
  
app.get("/api/games/list", protect, async (req, res) => {
    try {
      const result = await GameLogic.listOpenGames(req.user.id);
      res.json(result); 
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = 3000;
server.listen(PORT, () => console.log(`CATalism Server running on port ${PORT}`));