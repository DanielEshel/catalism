const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const GameLogic = require('../logic/gameLogic'); 
// Import the secret directly from UserLogic to ensure it matches HTTP auth
const { JWT_SECRET } = require('../logic/userLogic'); 

let io;

const init = (httpServer, actionHandler) => {
    io = new Server(httpServer, { 
        cors: { origin: "*", methods: ["GET", "POST"] } 
    });

    // This runs BEFORE 'connection'. If next(err) is called, connection is refused.
    io.use((socket, next) => {
        // Client must send: io(url, { auth: { token: "..." } })
        const token = socket.handshake.auth.token;

        if (!token) {
            console.warn(`Connection rejected: No token (Socket ID: ${socket.id})`);
            return next(new Error("Authentication error: No token provided."));
        }

        try {
            // Verify the digital signature
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Success! Attach the REAL User ID to the socket session
            // We verify identity HERE, once. We don't trust the client's payload.
            socket.data.userId = decoded.id; 
            next();
        } catch (err) {
            console.warn(`Connection rejected: Invalid token (Socket ID: ${socket.id})`);
            next(new Error("Authentication error: Invalid token."));
        }
    });

    // --- CONNECTION HANDLER ---
    // Only verified users reach this point
    io.on("connection", (socket) => {
        console.log(`🔌 [Socket] Auth Success: User ${socket.data.userId}`);

        // A. JOIN GAME
        socket.on("join_game", async ({ gameId }) => {
            try {
                // SECURITY: Use the ID from the token (socket.data.userId)
                // This prevents "I am User A but I want to join as User B"
                const userId = socket.data.userId; 

                socket.join(gameId);
                const { game, event } = await GameLogic.finalizeSocketJoin(gameId, userId);

                io.to(gameId).emit("action_log", { userId, message: "Link established." });
                socket.emit("game_pulse", game);

                if (event) {
                    io.to(gameId).emit("game_event", event);
                    io.to(gameId).emit("game_pulse", game);
                }
            } catch (err) {
                console.error("Join Error:", err.message);
                socket.emit("error", { message: err.message });
                socket.disconnect(); // Kick them out if logic fails
            }
        });

        // B. CLIENT ACTIONS
        socket.on("client_action", (data) => {
            // SECURITY: Force the userId to match the token
            data.userId = socket.data.userId; 
            
            if (actionHandler) actionHandler(socket, data);
        });

        socket.on("disconnect", () => console.log(`Disconnected: ${socket.id}`));
    });
};

const broadcastToRoom = (gameId, eventType, data) => { if (io) io.to(gameId).emit(eventType, data); };
const sendToSocket = (socket, eventType, data) => { socket.emit(eventType, data); };
const sendError = (socket, message) => { socket.emit("error", { message }); };

module.exports = { init, broadcastToRoom, sendToSocket, sendError };