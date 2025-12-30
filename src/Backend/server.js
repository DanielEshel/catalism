const express = require('express');
const connectDB = require('./db');
const { Game, User } = require('./models/Schemas');

const app = express();
app.use(express.json());

// Connect to MongoDB
connectDB();

// --- ROUTES ---

// 1. Get all live games (Lobby and Active)
app.get('/api/games/live', async (req, res) => {
  try {
    const games = await Game.find({ status: { $in: ['lobby', 'in-progress'] } })
                            .populate('hostId', 'displayName'); // Join user data
    res.json(games);
  } catch (err) {
    res.status(500).json({ message: "Error fetching games", error: err.message });
  }
});

// 2. Create a new Game
app.post('/api/games/create', async (req, res) => {
  try {
    const { hostId, maxPlayers } = req.body;
    const newGame = new Game({
      hostId,
      playerIds: [hostId],
      maxPlayers: maxPlayers || 4
    });
    const savedGame = await newGame.save();
    res.status(201).json(savedGame);
  } catch (err) {
    res.status(400).json({ message: "Error creating game", error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🛸 Server floating on port ${PORT}`));