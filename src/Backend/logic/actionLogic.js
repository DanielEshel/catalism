const { Action } = require('../models/Schemas');

// Logic for logging a new game action
const logAction = async (gameId, userId, actionType, payload) => {
    // Get the next sequence number for this game [cite: 33]
    const lastAction = await Action.findOne({ gameId }).sort({ actionNum: -1 });
    const nextNum = lastAction ? lastAction.actionNum + 1 : 1;

    const newAction = new Action({
        gameId,
        actionNum: nextNum, // [cite: 33]
        userId,
        actionType, // e.g., 'roll_dice', 'build_road' [cite: 35]
        payload,
        timestamp: new Date() // [cite: 33]
    });

    return await newAction.save();
};

module.exports = { logAction };