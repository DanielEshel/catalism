// src/Backend/controllers/socketController.js
const { Server } = require("socket.io");
const { socketAuth } = require("../middleware/authMiddleware"); // <--- IMPORT HERE
const GameLogic = require("../logic/gameLogic");

let io;

const init = (httpServer, actionHandler) => {
	io = new Server(httpServer, {
		cors: { origin: "*", methods: ["GET", "POST"] },
	});

	io.use(socketAuth);

	io.on("connection", (socket) => {
		const userId = socket.data.userId;

		socket.join(userId);

		// A. JOIN GAME
		socket.on("join_game", async ({ gameId }) => {
			try {
				socket.join(gameId); // Still join game room for "public" broadcasts if needed

				console.log(`[Socket] User ${userId} joining Game ${gameId}`);

				// Let the SERVER decide what to send back (Game Pulse, Events, etc.)
				// We just pass the intent to the handler/logic if needed,
				// but usually the frontend triggers a "sync_request" immediately after joining,
				// or we rely on the logic in server.js to broadcast the update.

				// For this specific event, we can let the handler know, or just do the
				// socket logic here. For simplicity, we keep the DB update here:
				const { game, event } = await GameLogic.finalizeSocketJoin(
					gameId,
					userId,
				);

				// We notify the Action Handler (server.js) to broadcast the update
				// Alternatively, server.js could listen to this, but returning the result
				// lets us handle it here effectively using the new Unicast tools if we wanted,
				// BUT strictly following your request, we will emit events from server.js mostly.

				if (actionHandler) {
					// We can mock an action to trigger the broadcast in server.js
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

// 1. UNICAST: Send to a specific user
const emitToUser = (userId, eventType, data) => {
	if (io) io.to(userId).emit(eventType, data);
};

// 2. BROADCAST: Send to everyone in a game (Chat, Public Events)
const broadcastToRoom = (gameId, eventType, data) => {
	if (io) io.to(gameId).emit(eventType, data);
};

// 3. ERROR: Send to specific socket (if we have the socket instance) or userId
const sendError = (socket, message) => {
	socket.emit("error", { message });
};

module.exports = {
	init,
	emitToUser,
	broadcastToRoom,
	sendError,
};
