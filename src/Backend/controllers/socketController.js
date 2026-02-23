// controllers/socketController.js
const { Server } = require("socket.io");
const { socketAuth } = require("../middleware/authMiddleware");
const GameLogic = require("../logic/gameLogic");

let io;

const init = (httpServer, actionHandler) => {
	io = new Server(httpServer, {
		cors: { 
            origin: true, // Allow your frontend origin
            methods: ["GET", "POST"],
            credentials: true // <--- Critical for cookies via Socket.io
        },
	});

	io.use(socketAuth);

	io.on("connection", (socket) => {
		const userId = socket.data.userId;

		socket.join(userId);

		// A. JOIN GAME
		socket.on("join_game", async ({ gameId }) => {
			try {
				socket.join(gameId);
				console.log(`[Socket] User ${userId} joining Game ${gameId}`);

				const { game, event } = await GameLogic.finalizeSocketJoin(gameId, userId);

				if (actionHandler) {
					actionHandler(socket, {
						gameId,
						actionType: "player_connected",
						payload: { game, event },
					});
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
			console.log(`User ${userId} disconnected`);
		});
	});
};

const emitToUser = (userId, eventType, data) => {
	if (io) io.to(userId).emit(eventType, data);
};

const broadcastToRoom = (gameId, eventType, data) => {
	if (io) io.to(gameId).emit(eventType, data);
};

const sendError = (socket, message) => {
	socket.emit("error", { message });
};

module.exports = {
	init,
	emitToUser,
	broadcastToRoom,
	sendError,
};