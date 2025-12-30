const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true }, // FK to GAME._id [cite: 33]
  actionNum: { type: Number, required: true }, // Sequential order [cite: 33]
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // FK to USER._id [cite: 33]
  actionType: { 
    type: String, 
    required: true,
    enum: ['roll_dice', 'build_road', 'build_settlement', 'build_city', 'buy_dev_card', 'play_dev_card', 'trade'] 
  }, // [cite: 33, 35]
  payload: { type: Object }, // Stores data like dice results or coordinates [cite: 33, 35]
  timestamp: { type: Date, default: Date.now } // Chronological sorting [cite: 33]
});

module.exports = mongoose.model('Action', actionSchema);