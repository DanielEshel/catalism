const { Game, Action } = require('../models/Schemas');

const COSTS = {
    WORMHOLE_LANE: { carbonFiber: 1, spaceCrystal: 1 },
    SMALL_CAT: { carbonFiber: 1, catnip: 1, mice: 1, spaceCrystal: 1 },
    BIG_CAT: { cosmicMilk: 3, catnip: 2 }
};

// --- ACTION CATEGORIES ---
const ACTIONS_REQUIRING_TURN = new Set([
    'build_road', 
    'build_settlement', 
    'build_city', 
    'end_turn',
    'buy_dev_card',
    'trade_bank'
]);


// --- HELPER: ADJACENCY CHECKS ---
const checkRoadAdjacency = (newRoadCoords, playerState) => {
    // Road format: "x1,y1|x2,y2" (represents an edge between two vertices)
    // We split the new road into its two vertices
    const [v1, v2] = newRoadCoords.split('|');

    // 1. Check connection to existing Settlements/Cities (Vertices)
    // If the player has a settlement at v1 or v2, it's valid.
    const hasSettlementConnection = [...playerState.settlements, ...playerState.cities].some(
        vertex => vertex === v1 || vertex === v2
    );
    if (hasSettlementConnection) return true;

    // 2. Check connection to existing Roads (Edges)
    // An existing road "A|B" connects if it shares v1 or v2.
    const hasRoadConnection = playerState.roads.some(existingRoad => {
        const [e1, e2] = existingRoad.split('|');
        return e1 === v1 || e1 === v2 || e2 === v1 || e2 === v2;
    });
    
    return hasRoadConnection;
};

// --- HELPER: RESOURCE CHECKS ---
const checkAndConsumeResources = (player, costType) => {
    const cost = COSTS[costType];
    if (!cost) throw new Error("Invalid build type");

    // Check
    for (const [res, amount] of Object.entries(cost)) {
        if ((player.resources[res] || 0) < amount) {
            throw new Error(`Insufficient ${res}. Need ${amount}.`);
        }
    }
    // Consume
    for (const [res, amount] of Object.entries(cost)) {
        player.resources[res] -= amount;
    }
};

// --- MAIN PROCESSOR ---
const processAction = async (gameId, userId, actionType, payload) => {
    
    // 1. FETCH GAME (The Single Source of Truth)
    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found");

    // 2. GENERAL VALIDATION
    if (game.status !== 'in-progress') throw new Error("Game is not active.");
    
    const player = game.playerStates.find(p => p.userId.toString() === userId);
    if (!player) throw new Error("You are not a player in this game.");

    // 3. CONDITIONAL TURN CHECK
    // Only enforce turn order if the action type demands it
    if (ACTIONS_REQUIRING_TURN.has(actionType)) {
        if (game.turn.toString() !== userId) {
            throw new Error(`It is not your turn! Current turn: ${game.turn}`);
        }
    }

    let logMessage = "";
    let event = null;

    // --- SWITCH: HANDLER ---
    
    switch (actionType) {
        // === TURN BASED ACTIONS ===
        case 'build_road':
            checkAndConsumeResources(player, 'WORMHOLE_LANE');
            // Strict adjacency check
            if (player.roads.length > 0 || player.settlements.length > 0) {
                 if (!checkRoadAdjacency(payload.location, player)) throw new Error("Not connected!");
            }
            player.roads.push(payload.location);
            logMessage = "Constructed a Wormhole Lane.";
            break;

        case 'build_settlement':
            checkAndConsumeResources(player, 'SMALL_CAT');
            player.settlements.push(payload.location);
            player.victoryPoints += 1;
            logMessage = "Established a Small Cat colony (+1 VP).";
            break;

        case 'end_turn':
            const currentIndex = game.playerIds.findIndex(id => id.toString() === userId);
            const nextIndex = (currentIndex + 1) % game.playerIds.length;
            game.turn = game.playerIds[nextIndex];
            logMessage = "Ended their turn.";
            event = { type: 'TURN_CHANGED', payload: { newTurnUserId: game.turn } };
            break;

        // === FREE ACTIONS (No Turn Needed) ===
        
        case 'resign_game':
            // Logic: Mark player as 'inactive' or remove them
            // For now, we just log it and maybe auto-end if 1 player left
            logMessage = "Resigned from the fleet.";
            // (Optional: Redistribute resources or remove pieces)
            game.playerIds = game.playerIds.filter(id => id.toString() !== userId); 
            if (game.playerIds.length === 1) {
                 game.status = 'finished';
                 event = { type: 'GAME_OVER', payload: { winnerId: game.playerIds[0], reason: "Resignation" } };
            }
            break;

        case 'trade_offer':
            // Logic: Broadcast the offer to other players (Client handles UI)
            // This doesn't change DB state usually, just notifies
            logMessage = `Offered a trade: ${JSON.stringify(payload)}`;
            event = { type: 'TRADE_OFFERED', payload: { from: userId, offer: payload } };
            break;
            
        case 'chat_message':
            logMessage = payload.message; // Just logging to chat
            break;

        default:
            throw new Error(`Unknown action type: ${actionType}`);
    }

    // --- POST-ACTION CHECKS ---
    
    // Win Condition (Only check if VP changed)
    if (player.victoryPoints >= 10) {
        game.status = 'finished';
        event = { type: 'GAME_OVER', payload: { winnerId: userId, score: player.victoryPoints } };
        logMessage = `🏆 WON THE GALAXY with ${player.victoryPoints} VP!`;
    }

    await game.save();
    
    // Audit Log
    const lastAction = await Action.findOne({ gameId }).sort({ actionNum: -1 });
    const nextNum = lastAction ? lastAction.actionNum + 1 : 1;
    await Action.create({ gameId, actionNum: nextNum, userId, actionType, payload, timestamp: new Date() });

    return { game, logMessage, event };
};

module.exports = { processAction };