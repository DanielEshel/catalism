const { Game } = require('../models/Schemas');

// --- CONSTANTS ---
const COSTS = {
    WORMHOLE_LANE: { carbonFiber: 1, spaceCrystal: 1 },
    SMALL_CAT: { carbonFiber: 1, catnip: 1, mice: 1, spaceCrystal: 1 },
    BIG_CAT: { cosmicMilk: 3, catnip: 2 }
};

// --- BOARD GENERATION ---
const generateBoard = () => {
    const resourceDeck = [
        ...Array(4).fill('Space Crystal'), 
        ...Array(4).fill('Mice'),          
        ...Array(4).fill('Catnip'),        
        ...Array(3).fill('Carbon Fiber'),  
        ...Array(3).fill('Cosmic Milk'),   
        'Void'                             
    ];
    const numberTokens = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

    const shuffle = (array) => array.sort(() => Math.random() - 0.5);
    const shuffledRes = shuffle(resourceDeck);
    const shuffledNums = shuffle(numberTokens);

    let numIndex = 0;
    const hexes = shuffledRes.map((resource, i) => {
        if (resource === 'Void') return { id: i, resource, number: null }; 
        return { id: i, resource, number: shuffledNums[numIndex++] };
    });

    return { hexes, robberLocation: hexes.find(h => h.resource === 'Void').id };
};

// --- CORE LOGIC ---

// 1. Create Game (DB Only)
const createGame = async (hostId, maxPlayers = 4) => {
    const newGame = new Game({
        hostId,
        playerIds: [hostId],
        playerStates: [{ userId: hostId, resources: {}, victoryPoints: 0, settlements: [], cities: [], roads: [] }],
        maxPlayers,
        status: 'lobby',
        boardState: null
    });
    return await newGame.save();
};

// --- HELPER: PURGE GHOST PLAYERS ---
const purgeGhostPlayer = async (gameId, userId) => {
    try {
        const game = await Game.findById(gameId);
        if (!game) return;

        // Check if player is still in "Ghost" mode (connected: false)
        const playerIndex = game.playerStates.findIndex(p => p.userId.toString() === userId);
        
        if (playerIndex !== -1 && game.playerStates[playerIndex].connected === false) {
            console.log(`Purging ghost player ${userId} from game ${gameId} (Timeout)`);
            
            // Remove from states array
            game.playerStates.splice(playerIndex, 1);
            // Remove from IDs array
            game.playerIds = game.playerIds.filter(id => id.toString() !== userId);
            
            await game.save();
        }
    } catch (err) {
        console.error("Ghost Purge Error:", err.message);
    }
};

// 1. HTTP STEP: Request a Reservation
const requestJoinGame = async (gameId, userId) => {
    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found.");
    
    // Idempotency: If already connected, do nothing.
    const existingPlayer = game.playerStates.find(p => p.userId.toString() === userId);
    if (existingPlayer && existingPlayer.connected) {
        return { status: "already_joined" };
    }

    if (game.status !== 'lobby') throw new Error("Game is locked/started.");
    if (game.playerIds.length >= game.maxPlayers) throw new Error("Lobby is full.");

    // RESERVE THE SLOT (Mark as NOT connected)
    // If they were already in the ID list but disconnected, this might duplicate, 
    // so we ensure cleanliness:
    if (!game.playerIds.includes(userId)) {
        game.playerIds.push(userId);
        game.playerStates.push({
            userId,
            connected: false, // <--- KEY FLAG
            resources: { carbonFiber: 2, catnip: 2, mice: 2, cosmicMilk: 0, spaceCrystal: 2 },
            victoryPoints: 0, settlements: [], cities: [], roads: []
        });
    }

    await game.save();

    // We don't await this. It runs in the background.
    setTimeout(() => purgeGhostPlayer(gameId, userId), 5000);

    return { status: "reserved_awaiting_socket" };
};


// 2. SOCKET STEP: Finalize & Check Start
const finalizeSocketJoin = async (gameId, userId) => {
    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found");

    // FIND THE RESERVATION
    const player = game.playerStates.find(p => p.userId.toString() === userId);
    
    if (!player) {
        throw new Error("Reservation expired. You were too slow! Try joining again.");
    }

    // CONFIRM CONNECTION (Saves them from the purge)
    player.connected = true;
    
    // Auto-Start Logic (Only count CONNECTED players)
    const connectedCount = game.playerStates.filter(p => p.connected).length;
    let event = null;

    if (game.status === 'lobby' && connectedCount === game.maxPlayers) {
        console.log(`All pilots connected. Launching Game ${gameId}...`);
        
        game.status = 'in-progress';
        game.startTime = new Date();
        game.turn = game.playerIds[0];
        // Ensure generateBoard is defined or imported
        // game.boardState = generateBoard(); 
        
        event = {
            type: 'GAME_STARTED',
            payload: { board: game.boardState, firstTurn: game.turn }
        };
    }

    await game.save();
    return { game, event };
};


// 4. State Fetch
const getGameState = async (gameId) => {
    return await Game.findById(gameId).populate('hostId', 'displayName');
};

module.exports = { createGame, requestJoinGame, finalizeSocketJoin, getGameState, purgeGhostPlayer };