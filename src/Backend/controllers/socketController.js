// src/Backend/controllers/socketController.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require('../logic/userLogic'); 
const GameLogic = require('../logic/gameLogic'); 

let io;

const init = (httpServer, actionHandler) => {
    io = new Server(httpServer, { 
        cors: { origin: "*", methods: ["GET", "POST"] } 
    });

    // --- AUTH MIDDLEWARE ---
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Auth Error"));
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.data.userId = decoded.id; 
            next();
        } catch (err) { next(new Error("Invalid Token")); }
    });

    io.on("connection", (socket) => {
        
        // A. JOIN GAME (The Fix is here)
        socket.on("join_game", async ({ gameId }) => {
            try {
                const userId = socket.data.userId;
                socket.join(gameId);

                console.log(`🔌 [Socket] User ${userId} joining Game ${gameId}`);

                const { game, event } = await GameLogic.finalizeSocketJoin(gameId, userId);

                // 1. Broadcast new state (shows player as connected)
                await broadcastGameUpdate(gameId, game);

                // 2. Announce via Log
                broadcastToRoom(gameId, "action_log", { 
                    userId, 
                    message: "Comms Link Established.", 
                    timestamp: new Date() 
                });

                // 3. If this join started the game, send the start event
                if (event) {
                    broadcastToRoom(gameId, "game_event", event);
                }

            } catch (err) {
                console.error("Socket Join Error:", err.message);
                socket.emit("error", { message: err.message });
            }
        });

        // B. GAME ACTIONS
        socket.on("game_action", (data) => {
            data.userId = socket.data.userId; 
            if (actionHandler) actionHandler(socket, data);
        });

        socket.on("disconnect", () => {
            console.log(`User ${socket.data.userId} disconnected`);
            // Optional: Mark as connected: false in DB here if you want strict presence tracking
        });
    });
};

// --- FOG OF WAR BROADCASTER ---
const broadcastGameUpdate = async (gameId, gameRaw) => {
    if (!io) return;

    // 1. Convert Mongoose Document to Plain Object
    const gameFull = gameRaw.toObject ? gameRaw.toObject() : gameRaw;

    // 2. Get all sockets in the room
    const sockets = await io.in(gameId).fetchSockets();

    for (const socket of sockets) {
        const myId = socket.data.userId;

        // 3. Deep Clone
        const personalizedGame = JSON.parse(JSON.stringify(gameFull));

        // 4. Sanitize Opponents
        personalizedGame.playerStates = personalizedGame.playerStates.map(p => {
            // Handle populated vs unpopulated IDs
            const pId = p.userId._id ? p.userId._id.toString() : p.userId.toString();

            if (pId !== myId) {
                // IT IS AN OPPONENT -> HIDE DATA
                const resCount = Object.values(p.resources || {}).reduce((a,b)=>a+b, 0);
                p.resources = null; 
                p.resourceCount = resCount; 

                const devCount = (p.developmentCards || []).length;
                p.developmentCards = null; 
                p.devCardCount = devCount; 
            }
            return p;
        });

        // 5. Emit
        socket.emit('game_pulse', personalizedGame);
    }
};

const broadcastToRoom = (gameId, eventType, data) => { 
    if (io) io.to(gameId).emit(eventType, data); 
};

const sendError = (socket, message) => { 
    socket.emit("error", { message }); 
};

module.exports = { 
    init, 
    broadcastGameUpdate, 
    broadcastToRoom,     
    sendError 
};