const express = require('express');
const http = require('http');
const connectDB = require('./db');
const jwt = require('jsonwebtoken'); // Import JWT
require('./models/Schemas'); 

const GameLogic = require('./logic/gameLogic');
const ActionLogic = require('./logic/actionLogic');
const UserLogic = require('./logic/userLogic');
const SocketController = require('./controllers/socketController');

const app = express();
const server = http.createServer(app); 

app.use(express.json());
connectDB();

// --- AUTH MIDDLEWARE HELPER ---
const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return res.status(401).json({ error: "Not authorized, no token" });

    try {
        const decoded = jwt.verify(token, UserLogic.JWT_SECRET);
        req.user = { id: decoded.id }; // Attach user ID to request
        next();
    } catch (error) {
        res.status(401).json({ error: "Not authorized, token failed" });
    }
};

// --- SOCKET HANDLER ---
const handleClientStream = async (socket, data) => {
    // We already verified identity in the Socket Middleware!
    // Just grab the ID from the socket session.
    const userId = socket.data.userId; 
    const { gameId, actionType, payload } = data;

    try {
        if (actionType === 'sync_request') {
            const game = await GameLogic.getGameState(gameId);
            SocketController.sendToSocket(socket, 'game_pulse', game);
            return;
        }

        const result = await ActionLogic.processAction(gameId, userId, actionType, payload);
        
        if (result.game) {
            SocketController.broadcastToRoom(gameId, 'game_pulse', result.game);
            if (result.logMessage) SocketController.broadcastToRoom(gameId, 'action_log', { userId, message: result.logMessage });
            if (result.event) SocketController.broadcastToRoom(gameId, 'game_event', result.event);
        }
    } catch (err) {
        SocketController.sendError(socket, err.message);
    }
};

SocketController.init(server, handleClientStream);

// --- ROUTES ---

// 1. PUBLIC ROUTES (Auth)
app.post('/api/users/register', async (req, res) => {
    try {
        const result = await UserLogic.registerUser(req.body);
        // Result now contains { _id, displayName, token }
        res.status(201).json(result); 
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const result = await UserLogic.loginUser(req.body);
        res.json(result);
    } catch (e) { res.status(401).json({ error: e.message }); }
});

// 2. PROTECTED ROUTES (Require Token)
app.post('/api/games/create', protect, async (req, res) => {
    try {
        // We use req.user.id from the token, ignoring request body spoofing
        const game = await GameLogic.createGame(req.user.id, req.body.maxPlayers);
        res.status(201).json(game);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/games/join', protect, async (req, res) => {
    try {
        // Use req.user.id from token
        const result = await GameLogic.requestJoinGame(req.body.gameId, req.user.id);
        res.json({ message: "Slot reserved.", status: result.status });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/games/live', async (req, res) => {
    try {
        const games = await GameLogic.getGameState(null); 
        res.json(games);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = 3000;
server.listen(PORT, () => console.log(`CATalism Server (Secure) running on port ${PORT}`));