/**
 * models/Schemas.js
 * * This file contains the MongoDB schemas for the CATalism project.
 * It includes the User, Game, and Action collections based on the 
 * "Space Cat Catan: DB Design document"[cite: 1, 11].
 */

const mongoose = require('mongoose');

// --- 1. USER COLLECTION ---
// Stores persistent player statistics and profiles[cite: 14, 15].
const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true }, // [cite: 16, 27]
  email: { type: String, required: true, unique: true }, // [cite: 27]
  passwordHash: { type: String, required: true }, // [cite: 27]
  wins: { type: Number, default: 0 }, // [cite: 16, 27]
  losses: { type: Number, default: 0 }, // [cite: 16, 27]
  longestDriftLaneAchieved: { type: Number, default: 0 }, // [cite: 16]
  largestVoidHoundHunterFleet: { type: Number, default: 0 } // [cite: 16]
});

// --- 2. PLAYER_STATE (Object within GAME) ---
// Embedded within the GAME document for real-time performance[cite: 36, 37].
const playerStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // [cite: 38]
  resources: { // Map of resource counts [cite: 38]
    carbonFiber: { type: Number, default: 0 }, // Classic: Brick 
    catnip: { type: Number, default: 0 },      // Classic: Grain 
    mice: { type: Number, default: 0 },        // Classic: Wool 
    cosmicMilk: { type: Number, default: 0 },   // Classic: Ore 
    spaceCrystal: { type: Number, default: 0 }  // Classic: Wood 
  },
  techCards: [{ type: String }], // Unused Directive Cards [cite: 38]
  victoryPoints: { type: Number, default: 0 }, // Public VP only [cite: 38]
  settlements: [{ type: String }], // Coordinates of "Small Cats" [cite: 38]
  cities: [{ type: String }],      // Coordinates of "Big Cats" [cite: 38]
  roads: [{ type: String }]        // Coordinates of "Wormhole Lanes" [cite: 38]
}, { _id: false }); // No separate ID needed for sub-documents

// --- 3. GAME COLLECTION ---
// Single source of truth for a live, active game[cite: 17, 28, 29].
const gameSchema = new mongoose.Schema({
  status: { 
    type: String, 
    enum: ['lobby', 'in-progress', 'finished'], 
    default: 'lobby' 
  }, // [cite: 19, 30]
  turn: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // userId of active player [cite: 19, 30]
  diceRoll: { type: Number, default: 0 }, // [cite: 19, 30]
  boardState: { type: Object, default: {} }, // Hex config/tokens [cite: 19, 30]
  voidHoundPosition: { type: String, default: "0,0" }, // Current coordinates [cite: 19, 30]
  playerStates: [playerStateSchema], // Embedded array of PLAYER_STATE [cite: 20, 30, 38]
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // [cite: 30]
  playerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // [cite: 30]
  maxPlayers: { type: Number, default: 4 }, // [cite: 30]
  startTime: { type: Date, default: Date.now } // [cite: 30]
});

// --- 4. ACTION COLLECTION ---
// Represents a single player action taken inside a game[cite: 21, 31, 32].
const actionSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true }, // FK to GAME [cite: 33]
  actionNum: { type: Number, required: true }, // Order of action [cite: 22, 33]
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // FK to USER [cite: 33]
  actionType: { type: String, required: true }, // e.g., 'roll_dice', 'build_road' [cite: 33, 35]
  payload: { type: Object }, // Stores action data like dice result [cite: 33, 35]
  timestamp: { type: Date, default: Date.now } // [cite: 33]
});

// Export all models
module.exports = {
  User: mongoose.model('User', userSchema),
  Game: mongoose.model('Game', gameSchema),
  Action: mongoose.model('Action', actionSchema)
};