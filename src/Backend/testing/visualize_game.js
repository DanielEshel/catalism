const { generateBoardGraph } = require('../logic/boardLogic');

// ANSI Colors
const C = {
    // Resources
    WOOD: '\x1b[32m', SHEEP: '\x1b[36m', WHEAT: '\x1b[33m', 
    BRICK: '\x1b[31m', ORE: '\x1b[37m', VOID: '\x1b[35m', 
    NODE: '\x1b[90m', RESET: '\x1b[0m',

    // Players
    P1: '\x1b[91m', // Bright Red
    P2: '\x1b[94m', // Bright Blue
    P3: '\x1b[92m', // Bright Green
    P4: '\x1b[93m'  // Bright Yellow
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

// --- THE RENDERER ---
const drawGame = (game) => {
    const graph = game.boardState; // Use the game's internal board
    
    // 1. BOUNDS & SCALE
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    graph.nodes.forEach(n => {
        if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
    });

    const X_SCALE = 3; 
    const Y_SCALE = 2; 
    const GRID_W = (maxX - minX) * X_SCALE + 10; 
    const GRID_H = (maxY - minY) * Y_SCALE + 6;
    
    const getX = (val) => (val - minX) * X_SCALE + 2; 
    const getY = (val) => (val - minY) * Y_SCALE + 2;

    const grid = Array(GRID_H).fill(null).map(() => Array(GRID_W).fill(' '));

    // --- HELPER: MAP STRUCTURES ---
    // Create quick lookup maps for "Is this node occupied?" and "Is this edge occupied?"
    const nodeOwner = {}; // { nodeId: { color, type: 'S'|'C' } }
    const edgeOwner = {}; // { "u-v": color }

    game.playerStates.forEach((p, idx) => {
        const color = PLAYER_COLORS[idx % 4];
        p.settlements.forEach(id => nodeOwner[id] = { color, type: 'S' });
        p.cities.forEach(id => nodeOwner[id] = { color, type: 'C' });
        p.roads.forEach(key => edgeOwner[key] = color);
    });

    // 2. PLOT NODES (Settlements/Cities)
    graph.nodes.forEach(n => {
        const x = getX(n.x);
        const y = getY(n.y);
        
        if (grid[y]) {
            if (nodeOwner[n.id]) {
                // Draw Player Piece
                const { color, type } = nodeOwner[n.id];
                // Bold text for buildings
                grid[y][x] = `${color}\x1b[1m${type}${C.RESET}`; 
            } else {
                // Empty Node
                grid[y][x] = `${C.NODE}.${C.RESET}`; 
            }
        }
    });

    // 3. PLOT EDGES (Roads)
    graph.edges.forEach(e => {
        const u = graph.nodes.find(n => n.id === e.u);
        const v = graph.nodes.find(n => n.id === e.v);
        
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

        if (grid[midY]) {
            if (roadColor) {
                // DRAW COLORED ROAD
                const cell = `${roadColor}\x1b[1m${char}${C.RESET}`;
                grid[midY][midX] = cell;
                
                // Fill gaps for aesthetics if it's horizontal
                if (char === '-') {
                    grid[midY][midX-1] = `${roadColor}\x1b[1m-${C.RESET}`;
                    grid[midY][midX+1] = `${roadColor}\x1b[1m-${C.RESET}`;
                }
            } else if (grid[midY][midX] === ' ') {
                // Draw empty path (faint)
                grid[midY][midX] = `${C.NODE}${char}${C.RESET}`;
            }
        }
    });

    // 4. PLOT RESOURCES
    graph.hexes.forEach(h => {
        const nodes = h.nodeIds.map(id => graph.nodes.find(n => n.id === id));
        const rawAvgX = nodes.reduce((sum, n) => sum + n.x, 0) / 6;
        const rawAvgY = nodes.reduce((sum, n) => sum + n.y, 0) / 6;
        const cx = Math.floor(getX(rawAvgX));
        const cy = Math.floor(getY(rawAvgY));

        const meta = RES_MAP[h.resource] || { char: '???', color: C.RESET };
        const num = h.number !== null ? String(h.number).padStart(2, '0') : 'RB'; 

        if (grid[cy]) {
             const str = meta.char;
             for(let i=0; i<str.length; i++) grid[cy][cx - 1 + i] = `${meta.color}${str[i]}${C.RESET}`;
        }
        if (grid[cy + 1]) {
             const str = num;
             for(let i=0; i<str.length; i++) grid[cy + 1][cx - 1 + i] = `${C.RESET}${str[i]}${C.RESET}`;
        }
    });

    // 5. RENDER
    console.log(`\n${C.P1}Player 1 (Red)${C.RESET} | ${C.P2}Player 2 (Blue)${C.RESET}`);
    console.log(grid.map(row => row.join('')).join('\n'));
    console.log('\n');
};


// --- MOCK DATA FOR TESTING ---
const runMockTest = () => {
    const board = generateBoardGraph();
    
    // Simulate Player 1 (Red) building a road and settlement
    // Let's pick Node 10 and 11
    const p1State = {
        settlements: [10],
        cities: [],
        roads: ["10-11", "11-12"] // A road path
    };

    // Simulate Player 2 (Blue) building a City
    // Pick Node 20
    const p2State = {
        settlements: [17],
        cities: [20],
        roads: ["20-21"]
    };

    const mockGame = {
        boardState: board,
        playerStates: [p1State, p2State]
    };

    drawGame(mockGame);
};

// If run directly, show mock. If imported, export function.
if (require.main === module) {
    runMockTest();
} else {
    module.exports = { drawGame };
}