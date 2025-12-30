const express = require('express');
const connectDB = require('./db');
const { Game, User } = require('./models/Schemas');

const app = express();
app.use(express.json());

// Connect to MongoDB
connectDB();

// --- ROUTES ---
// POST: Register a new user
app.post('/api/users/register', async (req, res) => {
    try {
        const user = await registerUser(req.body);
        res.status(201).json({
            message: "Welcome to the fleet!",
            userId: user._id,
            displayName: user.displayName
        });
    } catch (err) {
        // If our logic throws an error (validation, etc.), we send a 400
        res.status(400).json({ error: err.message });
    }
});

// POST: Login existing user
app.post('/api/users/login', async (req, res) => {
    try {
        const user = await loginUser(req.body);
        res.json({
            message: `Hello again, ${user.displayName}!`,
            user
        });
    } catch (err) {
        // 401 Unauthorized for login failures
        res.status(401).json({ error: err.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));