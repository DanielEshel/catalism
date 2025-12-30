const { Game } = require('../models/Schemas');

// Resource costs based on CATalism theme
const COSTS = {
    WORMHOLE_LANE: { carbonFiber: 1, spaceCrystal: 1 }, // [cite: 5, 7]
    SMALL_CAT: { carbonFiber: 1, catnip: 1, mice: 1, spaceCrystal: 1 }, // [cite: 5, 7]
    BIG_CAT: { cosmicMilk: 3, catnip: 2 } // [cite: 5, 7]
};

const buildWormholeLane = async (gameId, userId, location) => {
    const game = await Game.findById(gameId);
    const player = game.playerStates.find(p => p.userId.toString() === userId);

    // Check resources [cite: 5, 38]
    if (player.resources.carbonFiber >= COSTS.WORMHOLE_LANE.carbonFiber &&
        player.resources.spaceCrystal >= COSTS.WORMHOLE_LANE.spaceCrystal) {
        
        player.resources.carbonFiber -= COSTS.WORMHOLE_LANE.carbonFiber;
        player.resources.spaceCrystal -= COSTS.WORMHOLE_LANE.spaceCrystal;
        player.roads.push(location); // [cite: 38]
        
        return await game.save();
    }
    throw new Error("Insufficient Carbon Fiber or Space Crystal!");
};

module.exports = { buildWormholeLane, COSTS };