const mongoose = require('mongoose');

// --- SUB-SCHEMAS FOR BOARD GRAPH ---

const hexSchema = new mongoose.Schema({
    id: Number,
    resource: String,
    number: Number,
    nodeIds: [Number] // The 6 corners
}, { _id: false });

const nodeSchema = new mongoose.Schema({
    id: Number,
    x: Number,
    y: Number,
    connections: [Number], // IDs of neighbor nodes
    hexIds: [Number]       // IDs of hexes touching this node
}, { _id: false });

const edgeSchema = new mongoose.Schema({
    u: Number,
    v: Number
}, { _id: false });

// --- MAIN GAME SCHEMA ---

const playerStateSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    connected: { type: Boolean, default: false },
    hasQuit: { type: Boolean, default: false },
    resources: {
        carbonFiber: { type: Number, default: 0 },
        catnip: { type: Number, default: 0 },
        mice: { type: Number, default: 0 },
        cosmicMilk: { type: Number, default: 0 },
        spaceCrystal: { type: Number, default: 0 }
    },
    victoryPoints: { type: Number, default: 0 },
    settlements: [Number], // Storing Node IDs (Integers)
    cities: [Number],      // Storing Node IDs (Integers)
    roads: [String]        // Storing Edge Keys ("u-v")
}, { _id: false });

const gameSchema = new mongoose.Schema({
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    maxPlayers: { type: Number, default: 4 },
    status: { type: String, enum: ['lobby', 'in-progress', 'finished'], default: 'lobby' },
    playerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    playerStates: [playerStateSchema],
    turn: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startTime: Date,
    
    // NEW FLAG: Tracks if the dice have been rolled for the current turn
    diceRolled: { type: Boolean, default: false }, 

    boardState: {
        hexes: [hexSchema],
        nodes: [nodeSchema],
        edges: [edgeSchema],
        robberHex: Number
    }
});

const actionSchema = new mongoose.Schema({
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    actionNum: Number,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionType: String,
    payload: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    displayName: String,
    email: { type: String, unique: true },
    passwordHash: String,
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);
const Game = mongoose.model('Game', gameSchema);
const Action = mongoose.model('Action', actionSchema);

module.exports = { User, Game, Action };