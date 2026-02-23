// controllers/httpController.js
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const UserLogic = require("../logic/userLogic");
const GameLogic = require("../logic/gameLogic");

const router = express.Router();

// --- USER ROUTES ---
router.post("/users/register", async (req, res) => {
    try {
        const result = await UserLogic.registerUser(req.body);
        
        // Set the HTTP-Only cookie instead of sending the token in JSON
        res.cookie("token", result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.status(201).json({ _id: result._id, displayName: result.displayName });
    } catch (e) { 
        res.status(400).json({ error: e.message }); 
    }
});

router.post("/users/login", async (req, res) => {
    try {
        const result = await UserLogic.loginUser(req.body);
        
        // Set the HTTP-Only cookie
        res.cookie("token", result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ _id: result._id, displayName: result.displayName });
    } catch (e) { 
        res.status(401).json({ error: e.message }); 
    }
});

router.post("/users/logout", (req, res) => {
    // Clear the cookie to log the user out
    res.clearCookie("token");
    res.status(200).json({ message: "Successfully logged out" });
});

// --- GAME ROUTES ---
router.post("/games/create", protect, async (req, res) => {
    try {
        const game = await GameLogic.createGame(req.user.id, req.body.maxPlayers);
        res.status(201).json(game);
    } catch (e) { 
        res.status(400).json({ error: e.message }); 
    }
});

router.post("/games/join", protect, async (req, res) => {
    try {
        const result = await GameLogic.requestJoinGame(req.body.gameId, req.user.id);
        res.json({ message: "Slot reserved.", status: result.status });
    } catch (e) { 
        res.status(400).json({ error: e.message }); 
    }
});

router.get("/games/list", protect, async (req, res) => {
    try {
        const result = await GameLogic.listOpenGames(req.user.id);
        res.json(result); 
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

module.exports = router;