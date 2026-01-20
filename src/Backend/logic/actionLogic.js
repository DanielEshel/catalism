const { Game, Action } = require('../models/Schemas');

const COSTS = {
    WORMHOLE_LANE: { carbonFiber: 1, spaceCrystal: 1 },
    SMALL_CAT: { carbonFiber: 1, catnip: 1, mice: 1, spaceCrystal: 1 },
    BIG_CAT: { cosmicMilk: 3, catnip: 2 }
};

const ACTIONS_REQUIRING_TURN = new Set([
    'build_road', 'build_settlement', 'build_city', 'end_turn', 'buy_dev_card', 'trade_bank', 'play_dev_card', 'move_robber', 'roll_dice'
]);

// --- HELPER: NORMALIZE EDGE KEY ---
// Ensures edge "3-5" is always stored as "3-5", never "5-3"
const getEdgeKey = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);

// --- HELPER: SPACING CHECK (Graph Based) ---
const checkSettlementSpacing = (newNodeId, game) => {
    // 1. Collect all occupied nodes (Settlements + Cities) from ALL players
    const occupiedNodes = new Set();
    game.playerStates.forEach(p => {
        p.settlements.forEach(s => occupiedNodes.add(s)); // s is an Integer ID
        p.cities.forEach(c => occupiedNodes.add(c));
    });

    // 2. Is the spot itself taken?
    if (occupiedNodes.has(newNodeId)) return false;

    // 3. Are any neighbors taken? (The Distance Rule)
    // We look up the node in the board graph to find its physical connections
    const node = game.boardState.nodes.find(n => n.id === newNodeId);
    if (!node) throw new Error(`Invalid Node ID: ${newNodeId}`);

    for (const neighborId of node.connections) {
        if (occupiedNodes.has(neighborId)) return false;
    }

    return true;
};

// --- HELPER: ROAD ADJACENCY (Graph Based) ---
const checkRoadAdjacency = (u, v, player) => {
    // 1. Check connection to own Settlements/Cities (Node IDs)
    // If I have a house at Node U or Node V, I can build a road there.
    const hasStructure = [...player.settlements, ...player.cities].some(
        nodeId => nodeId === u || nodeId === v
    );
    if (hasStructure) return true;

    // 2. Check connection to existing Roads
    // My existing roads are strings "A-B". I check if they share a vertex.
    return player.roads.some(roadKey => {
        const [rU, rV] = roadKey.split('-').map(Number);
        // Does the existing road share a vertex with the new road?
        return rU === u || rU === v || rV === u || rV === v;
    });
};

const checkAndConsumeResources = (player, costType, isFree = false) => {
    if (isFree) return;
    const cost = COSTS[costType];
    for (const [res, amount] of Object.entries(cost)) {
        if ((player.resources[res] || 0) < amount) {
            throw new Error(`Insufficient ${res}. Need ${amount}.`);
        }
    }
    for (const [res, amount] of Object.entries(cost)) {
        player.resources[res] -= amount;
    }
};

const distributeResources = (game, diceNumber) => {
    if (diceNumber === 7) return {}; // Robber logic handled separately later

    const distributionLog = {}; // { userId: { resource: amount } }

    // 1. Find all Hexes matching the dice number
    const activeHexes = game.boardState.hexes.filter(h => h.number === diceNumber && h.resource !== 'Void');
    
    // 2. For each Hex, find players touching it
    activeHexes.forEach(hex => {
        // Robber blocks production!
        if (game.boardState.robberHex === hex.id) return; 

        const resourceType = hex.resource;
        
        // Check every node (corner) of this hex
        hex.nodeIds.forEach(nodeId => {
            // Did anyone build here?
            game.playerStates.forEach(player => {
                let amount = 0;
                
                // +1 for Settlement
                if (player.settlements.includes(nodeId)) amount += 1;
                // +2 for City
                if (player.cities.includes(nodeId)) amount += 2;

                if (amount > 0) {
                    // Update Player Inventory
                    const resKey = resourceMapKey(resourceType); // Helper to map "Space Crystal" -> "spaceCrystal"
                    if (resKey) {
                        player.resources[resKey] = (player.resources[resKey] || 0) + amount;
                        
                        // Log for the event payload
                        if (!distributionLog[player.userId]) distributionLog[player.userId] = {};
                        distributionLog[player.userId][resKey] = (distributionLog[player.userId][resKey] || 0) + amount;
                    }
                }
            });
        });
    });

    return distributionLog;
};

// --- HELPER: AUTO-PLACER ---
const performAutoPlacement = (game, player) => {
    // 1. Find a legal node
    // Shuffle nodes to make it random
    const shuffledNodes = [...game.boardState.nodes].sort(() => Math.random() - 0.5);
    
    let validNode = null;
    for (const node of shuffledNodes) {
        if (checkSettlementSpacing(node.id, game)) {
            validNode = node;
            break;
        }
    }

    if (!validNode) return "Error: No space left on board!";

    // 2. Find a connected edge for the road
    // Just pick the first neighbor
    const neighborId = validNode.connections[0];
    const roadKey = getEdgeKey(validNode.id, neighborId);

    // 3. Execute
    player.settlements.push(validNode.id);
    player.roads.push(roadKey);
    player.victoryPoints += 1;
    
    return `Server auto-placed at Node ${validNode.id}.`;
};


// --- MAIN PROCESSOR ---
const processAction = async (gameId, userId, actionType, payload) => {
    
    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== 'in-progress') throw new Error("Game is not active.");
    
    const player = game.playerStates.find(p => p.userId.toString() === userId);
    if (!player) throw new Error("You are not a player in this game.");

    // Setup Phase Logic
    const totalSettlements = game.playerStates.reduce((sum, p) => sum + p.settlements.length + p.cities.length, 0);
    const isSetupPhase = totalSettlements < (game.maxPlayers * 2);

    if (ACTIONS_REQUIRING_TURN.has(actionType)) {
        if (game.turn.toString() !== userId) throw new Error(`Not your turn!`);
    }

    let logMessage = "";
    let event = null;

    switch (actionType) {

        case 'roll_dice':
            if (isSetupPhase) throw new Error("Cannot roll dice during setup phase.");
            if (game.diceRolled) throw new Error("Dice already rolled this turn.");

            // 1. Generate Numbers
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const sum = d1 + d2;

            // 2. Distribute
            const gains = distributeResources(game, sum);

            // 3. Update State
            game.diceRolled = true;
            
            // 4. Create Event
            logMessage = `Rolled a ${sum} (${d1} + ${d2}).`;
            event = {
                type: 'DICE_ROLLED',
                payload: {
                    number: sum,
                    dice: [d1, d2],
                    gains: gains // Frontend uses this to show "+1 Wood" popups
                }
            };

            // TODO: If sum === 7, set game status to 'robbing' (Future feature)
            break;
        
        case 'build_settlement':
            // Payload: { nodeId: 12 }
            const nodeId = Number(payload.nodeId);

            // 1. Spacing Rule (Distance)
            if (!checkSettlementSpacing(nodeId, game)) {
                throw new Error("Too close to another settlement!");
            }

            // 2. Resources
            checkAndConsumeResources(player, 'SMALL_CAT', isSetupPhase);

            // 3. Connectivity (Skip in Setup)
            if (!isSetupPhase) {
                // Check if connected to one of my roads
                // Find all roads connected to this node
                const hasRoad = player.roads.some(r => {
                    const [u, v] = r.split('-').map(Number);
                    return u === nodeId || v === nodeId;
                });
                if (!hasRoad) throw new Error("Must connect to your road network.");
            }

            player.settlements.push(nodeId);
            player.victoryPoints += 1;
            logMessage = isSetupPhase ? "Placed starting colony." : "Established a Small Cat colony.";
            break;

        case 'build_road':
            // Payload: { u: 12, v: 15 }
            const u = Number(payload.u);
            const v = Number(payload.v);
            const roadKey = getEdgeKey(u, v);

            // 1. Check if edge exists on board (Valid move?)
            const isValidEdge = game.boardState.edges.some(e => 
                (e.u === u && e.v === v) || (e.u === v && e.v === u)
            );
            if (!isValidEdge) throw new Error("That is not a valid lane on the map.");

            // 2. Check if occupied
            const isOccupied = game.playerStates.some(p => p.roads.includes(roadKey));
            if (isOccupied) throw new Error("Lane already occupied.");

            checkAndConsumeResources(player, 'WORMHOLE_LANE', isSetupPhase);
            
            // 3. Adjacency
            if (player.roads.length > 0 || player.settlements.length > 0) {
                 if (!checkRoadAdjacency(u, v, player)) throw new Error("Not connected to your network!");
            }

            player.roads.push(roadKey);
            logMessage = "Constructed a Wormhole Lane.";
            break;

        case 'build_city':
             // Payload: { nodeId: 12 }
             const cityNodeId = Number(payload.nodeId);
             checkAndConsumeResources(player, 'BIG_CAT');
             
             const settIndex = player.settlements.indexOf(cityNodeId);
             if (settIndex === -1) throw new Error("No settlement there to upgrade.");

             player.settlements.splice(settIndex, 1);
             player.cities.push(cityNodeId);
             player.victoryPoints += 1;
             logMessage = "Upgraded to Big Cat Metropolis.";
             break;

        case 'end_turn':
            // --- SETUP LOGIC (Snake Draft) ---
            if (isSetupPhase) {
                const expectedCount = (totalSettlements >= game.maxPlayers) ? 2 : 1;
                
                // Auto-place if they timeout/forget
                if (player.settlements.length < expectedCount || player.roads.length < expectedCount) {
                    logMessage = performAutoPlacement(game, player);
                }

                const currentIdx = game.playerIds.findIndex(id => id.toString() === userId);
                let nextIdx;

                if (currentIdx === game.maxPlayers - 1 && totalSettlements < game.maxPlayers) {
                    nextIdx = currentIdx; // Player 4 goes again
                } else if (totalSettlements >= game.maxPlayers) {
                    nextIdx = currentIdx - 1; // Reverse order
                    if (nextIdx < 0) {
                        nextIdx = 0; // Game Starts
                        logMessage += " Setup Complete. Game Begins!";
                    }
                } else {
                    nextIdx = currentIdx + 1;
                }
                game.turn = game.playerIds[nextIdx];
            } 
            else {
                // --- NORMAL GAME LOGIC ---
                const currentIdx = game.playerIds.findIndex(id => id.toString() === userId);
                game.turn = game.playerIds[(currentIdx + 1) % game.playerIds.length];
                logMessage = "Ended their turn.";
            }
            
            event = { type: 'TURN_CHANGED', payload: { newTurnUserId: game.turn } };
            break;

        // ... (trade, resign, chat remain standard) ...
    }

    if (player.victoryPoints >= 10) {
        game.status = 'finished';
        event = { type: 'GAME_OVER', payload: { winnerId: userId, score: player.victoryPoints } };
    }

    await game.save();
    
    // Audit Log
    const lastAction = await Action.findOne({ gameId }).sort({ actionNum: -1 });
    const nextNum = lastAction ? lastAction.actionNum + 1 : 1;
    await Action.create({ gameId, actionNum: nextNum, userId, actionType, payload, timestamp: new Date() });

    return { game, logMessage, event };
};

module.exports = { processAction };