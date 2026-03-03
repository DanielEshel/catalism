// controllers/socketController.js
const { Server } = require("socket.io");
const { socketAuth } = require("../middleware/authMiddleware");
const GameLogic = require("../logic/gameLogic");

const gamePurgeTimeouts = new Map(); // gameId -> Timeout

const init = (httpServer, actionHandler) => {
	io = new Server(httpServer, {
		cors: { 
            origin: true, 
            methods: ["GET", "POST"],
            credentials: true 
        },
	});

	io.use(socketAuth);

	io.on("connection", (socket) => {
		const userId = socket.data.userId;
		socket.join(userId);

		socket.on("join_game", async ({ gameId }) => {
			try {
				// ✨ CANCEL PURGE: If someone joins, stop the deletion timer
				if (gamePurgeTimeouts.has(gameId)) {
					console.log(`[Purge] Cancelling deletion for game ${gameId} - Player reconnected.`);
					clearTimeout(gamePurgeTimeouts.get(gameId));
					gamePurgeTimeouts.delete(gameId);
				}

				socket.join(gameId);
				const { game, event } = await GameLogic.finalizeSocketJoin(gameId, userId);

				if (actionHandler) {
					actionHandler(socket, {
						gameId,
						actionType: "player_connected",
						payload: { game, event },
					});
				}
			} catch (err) {
				socket.emit("error", { message: err.message });
			}
		});

		socket.on("game_action", (data) => {
			data.userId = socket.data.userId;
			if (actionHandler) actionHandler(socket, data);
		});

		// ✨ DISCONNECT LOGIC: Check if game is empty
		socket.on("disconnecting", () => {
			// Check all rooms this socket is in (excluding their own private ID room)
			for (const gameId of socket.rooms) {
				if (gameId === socket.id) continue;

				const room = io.sockets.adapter.rooms.get(gameId);
				// If room size is 1, it means this socket is the last one leaving
				if (room && room.size === 1) {
					console.log(`[Purge] Game ${gameId} is now empty. Deleting in 60s if no one returns.`);
					
					const timeout = setTimeout(async () => {
						try {
							await Game.findByIdAndDelete(gameId);
							console.log(`[Purge] Successfully deleted inactive game ${gameId}`);
							gamePurgeTimeouts.delete(gameId);
						} catch (err) {
							console.error(`[Purge] Error deleting game ${gameId}:`, err);
						}
					}, 60000); // 1 minute

					gamePurgeTimeouts.set(gameId, timeout);
				}
			}
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

const isRoomEmpty = (roomId) => {
    if (!io) return true;
    const room = io.sockets.adapter.rooms.get(roomId);
    return !room || room.size === 0;
};

module.exports = {
	init,
	emitToUser,
	broadcastToRoom,
	sendError,
	isRoomEmpty,
};