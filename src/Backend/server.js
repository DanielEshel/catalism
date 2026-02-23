// server.js
const express = require("express");
const http = require("http");
const cookieParser = require("cookie-parser"); // <--- Import cookie-parser
const connectDB = require("./db");
require("./models/Schemas");

const GameLogic = require("./logic/gameLogic");
const ActionLogic = require("./logic/actionLogic");
const SocketController = require("./controllers/socketController");
const httpController = require("./controllers/httpController"); // <--- Import new controller

const app = express();
const server = http.createServer(app);

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cookieParser()); // <--- Apply cookie-parser globally

// --- DATABASE ---
connectDB();

// --- HTTP ROUTES ---
app.use("/api", httpController); // <--- All HTTP traffic goes to the controller

// --- FOG OF WAR LOGIC ---
const distributeGamePulse = (gameRaw) => {
    const gameFull = gameRaw.toObject ? gameRaw.toObject() : gameRaw;
    const gameId = gameFull._id.toString();

    gameFull.playerStates.forEach(targetPlayer => {
        const targetId = targetPlayer.userId._id 
            ? targetPlayer.userId._id.toString() 
            : targetPlayer.userId.toString();

        const personalizedGame = JSON.parse(JSON.stringify(gameFull));

        personalizedGame.playerStates = personalizedGame.playerStates.map(p => {
            const pId = p.userId._id ? p.userId._id.toString() : p.userId.toString();

            if (pId !== targetId) {
                const resCount = Object.values(p.resources || {}).reduce((a,b)=>a+b, 0);
                p.resources = null; 
                p.resourceCount = resCount; 

                const devCount = (p.developmentCards || []).length;
                p.developmentCards = null; 
                p.devCardCount = devCount; 
            }
            return p;
        });

        SocketController.emitToUser(targetId, 'game_pulse', personalizedGame);
    });
};

// --- SOCKET STREAM HANDLER ---
const handleClientStream = async (socket, data) => {
  const userId = socket.data.userId;
  const { gameId, actionType, payload } = data;

  console.log(`[SERVER] Action: ${actionType} from ${userId.slice(-4)}`);

  try {
    if (actionType === "player_connected") {
         await distributeGamePulse(payload.game);
         if (payload.event) {
            SocketController.broadcastToRoom(gameId, "game_event", payload.event);
         }
         return;
    }

    if (actionType === "sync_request") {
      const game = await GameLogic.getGameState(gameId);
      await distributeGamePulse(game); 
      return;
    }

    const result = await ActionLogic.processAction(
      gameId,
      userId,
      actionType,
      payload,
    );

    console.log(`[SERVER] Action Valid. Broadcasting updates...`);

    if (result.game) {
      distributeGamePulse(result.game);

      if (result.event) {
        SocketController.broadcastToRoom(gameId, "game_event", result.event);
      }

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

// Initialize Sockets
SocketController.init(server, handleClientStream);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`CATalism Server running on port ${PORT}`));