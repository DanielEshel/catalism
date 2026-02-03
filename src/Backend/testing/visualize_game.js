// visualize_game.js
const fs = require('fs');
const path = require('path');

// Try to locate boardLogic whether running from root or src/Backend/testing
let boardLogicPath = '../logic/boardLogic';
if (!fs.existsSync(path.join(__dirname, boardLogicPath + '.js'))) {
    boardLogicPath = './src/Backend/logic/boardLogic'; // Fallback for root
}
const { generateBoardGraph } = require(boardLogicPath);

// ANSI Colors
const C = {
    WOOD: '\x1b[32m', SHEEP: '\x1b[36m', WHEAT: '\x1b[33m', 
    BRICK: '\x1b[31m', ORE: '\x1b[37m', VOID: '\x1b[35m', 
    NODE: '\x1b[90m', RESET: '\x1b[0m',
    P1: '\x1b[91m', P2: '\x1b[94m', P3: '\x1b[92m', P4: '\x1b[93m'
};

const PLAYER_COLORS = [C.P1, C.P2, C.P3, C.P4];
const RES_MAP = {
    'Space Crystal': { char: 'Cry', color: C.WOOD },
    'Mice':          { char: 'Mic', color: C.SHEEP },
    'Catnip':        { char: 'Nip', color: C.WHEAT },
    'Carbon Fiber':  { char: 'Fib', color: C.BRICK },
    'Cosmic Milk':   { char: 'Mil', color: C.ORE },
    'Void':          { char: 'VOI', color: C.VOID }
};

const drawGame = (game) => {
    if (!game || !game.boardState) {
        console.error("❌ Cannot visualize: Game or Board State is missing.");
        return;
    }

    const graph = game.boardState; 
    
    // 1. CALCULATE BOUNDS
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    graph.nodes.forEach(n => {
        if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
    });

    // 2. SCALE & GRID SETUP
    const X_SCALE = 4; // Wider to fit text better
    const Y_SCALE = 2; 
    const PADDING = 4;
    
    const GRID_W = Math.ceil((maxX - minX) * X_SCALE) + (PADDING * 2); 
    const GRID_H = Math.ceil((maxY - minY) * Y_SCALE) + (PADDING * 2);
    
    const getX = (val) => Math.floor((val - minX) * X_SCALE) + PADDING; 
    const getY = (val) => Math.floor((val - minY) * Y_SCALE) + PADDING;

    // Create safe grid
    const grid = Array(GRID_H).fill(null).map(() => Array(GRID_W).fill(' '));

    // Helper to safely write to grid
    const safeSet = (y, x, char) => {
        if (y >= 0 && y < GRID_H && x >= 0 && x < GRID_W) {
            grid[y][x] = char;
        }
    };

    const nodeOwner = {}; 
    const edgeOwner = {}; 

    if (game.playerStates) {
        game.playerStates.forEach((p, idx) => {
            const color = PLAYER_COLORS[idx % 4] || C.RESET;
            p.settlements.forEach(id => nodeOwner[id] = { color, type: 'S' });
            p.cities.forEach(id => nodeOwner[id] = { color, type: 'C' });
            p.roads.forEach(key => edgeOwner[key] = color);
        });
    }

    // 3. PLOT NODES (Corners)
    graph.nodes.forEach(n => {
        const x = getX(n.x); 
        const y = getY(n.y);
        
        if (nodeOwner[n.id]) {
            // Draw Settlement/City
            const { color, type } = nodeOwner[n.id];
            safeSet(y, x, `${color}${type}${C.RESET}`);
        } else {
            // Draw Empty Node
            safeSet(y, x, `${C.NODE}.${C.RESET}`);
        }
    });

    // 4. PLOT EDGES (Roads)
    graph.edges.forEach(e => {
        const u = graph.nodes.find(n => n.id === e.u);
        const v = graph.nodes.find(n => n.id === e.v);
        
        if (!u || !v) return;

        const ux = getX(u.x), uy = getY(u.y);
        const vx = getX(v.x), vy = getY(v.y);

        const midX = Math.floor((ux + vx) / 2);
        const midY = Math.floor((uy + vy) / 2);
        
        let char = '-';
        if (ux === vx) char = '|';
        else if ((ux < vx && uy < vy) || (ux > vx && uy > vy)) char = '\\';
        else char = '/';

        // Check ownership
        const edgeKey = u.id < v.id ? `${u.id}-${v.id}` : `${v.id}-${u.id}`;
        const roadColor = edgeOwner[edgeKey];

        if (roadColor) {
            // Draw Colored Road
            safeSet(midY, midX, `${roadColor}${char}${C.RESET}`);
            // Fill gaps for horizontal roads
            if (char === '-') {
                safeSet(midY, midX - 1, `${roadColor}-${C.RESET}`);
                safeSet(midY, midX + 1, `${roadColor}-${C.RESET}`);
            }
        } else {
            // Draw Empty Path
            if (grid[midY][midX] === ' ') {
                safeSet(midY, midX, `${C.NODE}${char}${C.RESET}`);
            }
        }
    });

    // 5. PLOT RESOURCES (Hex Centers)
    graph.hexes.forEach(h => {
        const nodes = h.nodeIds.map(id => graph.nodes.find(n => n.id === id));
        const rawAvgX = nodes.reduce((sum, n) => sum + n.x, 0) / 6;
        const rawAvgY = nodes.reduce((sum, n) => sum + n.y, 0) / 6;
        
        const cx = getX(rawAvgX);
        const cy = getY(rawAvgY);

        const meta = RES_MAP[h.resource] || { char: '???', color: C.RESET };
        const num = h.number !== null ? String(h.number).padStart(2, '0') : 'RB'; 

        // Draw Resource Name (e.g., "Cry")
        const label = meta.char;
        for (let i = 0; i < label.length; i++) {
            safeSet(cy, cx - 1 + i, `${meta.color}${label[i]}${C.RESET}`);
        }

        // Draw Number Token
        for (let i = 0; i < num.length; i++) {
            safeSet(cy + 1, cx - 1 + i, `${C.RESET}${num[i]}${C.RESET}`);
        }
    });

    // 6. RENDER
    console.log(`\n${C.P1}Player 1 (Red)${C.RESET} | ${C.P2}Player 2 (Blue)${C.RESET}`);
    console.log(grid.map(row => row.join('')).join('\n'));
    console.log('\n');
};

// --- SELF-TEST MODE ---
if (require.main === module) {
    console.log("🛠️  Running Visualization Self-Test...");
    const board = generateBoardGraph();
    
    // Create Dummy Game State
    const dummyGame = {
        boardState: board,
        playerStates: [
            { 
                // Player 1
                settlements: [board.nodes[10].id, board.nodes[15].id], 
                cities: [board.nodes[20].id],
                roads: [`${board.nodes[10].id}-${board.nodes[11].id}`] 
            },
            { 
                // Player 2
                settlements: [board.nodes[30].id], 
                cities: [],
                roads: [`${board.nodes[30].id}-${board.nodes[31].id}`, `${board.nodes[31].id}-${board.nodes[32].id}`] 
            }
        ]
    };

    drawGame(dummyGame);
} else {
    module.exports = { drawGame };
}