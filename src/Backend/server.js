const express = require("express");
const http = require("http");
const connectDB = require("./db");
const jwt = require("jsonwebtoken"); // Import JWT
require("./models/Schemas");

const GameLogic = require("./logic/gameLogic");
const ActionLogic = require("./logic/actionLogic");
const UserLogic = require("./logic/userLogic");
const SocketController = require("./controllers/socketController");

const app = express();
const server = http.createServer(app);

app.use(express.json());
connectDB();

// --- AUTH MIDDLEWARE HELPER ---
const protect = (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token)
    return res.status(401).json({ error: "Not authorized, no token" });

  try {
    const decoded = jwt.verify(token, UserLogic.JWT_SECRET);
    req.user = { id: decoded.id }; // Attach user ID to request
    next();
  } catch (error) {
    res.status(401).json({ error: "Not authorized, token failed" });
  }
};

const handleClientStream = async (socket, data) => {
  const userId = socket.data.userId;
  const { gameId, actionType, payload } = data;

  // Debug Log: helps you see exactly what the frontend is sending
  console.log(`[SERVER] Action: ${actionType} from ${userId.slice(-4)}`);

  try {
    // 1. SYNC REQUEST (Client asking for fresh state)
    if (actionType === "sync_request") {
      const game = await GameLogic.getGameState(gameId);
      // We use broadcastGameUpdate here purely to re-use the sanitization logic
      // effectively sending a "Pulse" just to this one room/socket context if needed,
      // or simply send directly:
      await SocketController.broadcastGameUpdate(gameId, game);
      return;
    }

    // 2. PROCESS ACTION (The Core Logic)
    // This runs the rules engine (Turn check, Resource check, etc.)
    const result = await ActionLogic.processAction(
      gameId,
      userId,
      actionType,
      payload,
    );

    console.log(`[SERVER] Action Valid. Broadcasting updates...`);

    // 3. BROADCAST UPDATES
    if (result.game) {
      // A. GAME STATE (The "Pulse")
      //  - Conceptually, this updates the board
      // Uses 'broadcastGameUpdate' to loop through sockets and hide opponents' cards
      await SocketController.broadcastGameUpdate(gameId, result.game);

      // B. EVENT (Animation Triggers)
      // Uses standard broadcast because events like "DICE_ROLLED" are public info
      if (result.event) {
        console.log(`[SERVER] Event: ${result.event.type}`);
        SocketController.broadcastToRoom(gameId, "game_event", result.event);
      }

      // C. LOGS (Chat History)
      // Standard broadcast for the text log
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

    // Send the error ONLY to the player who caused it
    SocketController.sendError(socket, err.message);
  }
};

SocketController.init(server, handleClientStream);

// --- ROUTES ---

// 1. PUBLIC ROUTES (Auth)
app.post("/api/users/register", async (req, res) => {
  try {
    const result = await UserLogic.registerUser(req.body);
    // Result now contains { _id, displayName, token }
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/users/login", async (req, res) => {
  try {
    const result = await UserLogic.loginUser(req.body);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// 2. PROTECTED ROUTES (Require Token)
app.post("/api/games/create", protect, async (req, res) => {
  try {
    // We use req.user.id from the token, ignoring request body spoofing
    const game = await GameLogic.createGame(req.user.id, req.body.maxPlayers);
    res.status(201).json(game);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/games/join", protect, async (req, res) => {
  try {
    // Use req.user.id from token
    const result = await GameLogic.requestJoinGame(
      req.body.gameId,
      req.user.id,
    );
    res.json({ message: "Slot reserved.", status: result.status });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/games/list", protect, async (req, res) => {
  try {
    // Pass req.user.id to the logic
    const result = await GameLogic.listOpenGames(req.user.id);
    res.json(result); // Returns { games: [...], activeGameId: "..." }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3000;
server.listen(PORT, () =>
  console.log(`CATalism Server (Secure) running on port ${PORT}`),
);
