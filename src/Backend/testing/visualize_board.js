const { generateBoardGraph } = require('../logic/boardLogic');

const C = {
    WOOD: '\x1b[32m', SHEEP: '\x1b[36m', WHEAT: '\x1b[33m', 
    BRICK: '\x1b[31m', ORE: '\x1b[37m', VOID: '\x1b[35m', 
    NODE: '\x1b[90m', RESET: '\x1b[0m'
};

const RES_MAP = {
    'Space Crystal': { char: 'Cry', color: C.WOOD },
    'Mice':          { char: 'Mic', color: C.SHEEP },
    'Catnip':        { char: 'Nip', color: C.WHEAT },
    'Carbon Fiber':  { char: 'Fib', color: C.BRICK },
    'Cosmic Milk':   { char: 'Mil', color: C.ORE },
    'Void':          { char: 'VOID', color: C.VOID }
};

const drawBoard = () => {
    const graph = generateBoardGraph();
    
    // 1. BOUNDS
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    graph.nodes.forEach(n => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
    });

    // 2. SCALE
    // We stretch X by 3 to fit the text "Cry" (3 chars) comfortably
    // We stretch Y by 2 to separate the rows for diagonals
    const X_SCALE = 3;
    const Y_SCALE = 2; 
    
    // Bounds Padding (+6 just to be safe)
    const GRID_W = (maxX - minX) * X_SCALE + 10; 
    const GRID_H = (maxY - minY) * Y_SCALE + 6;
    
    const getX = (val) => (val - minX) * X_SCALE + 2; 
    const getY = (val) => (val - minY) * Y_SCALE + 2;

    const grid = Array(GRID_H).fill(null).map(() => Array(GRID_W).fill(' '));

    // 3. PLOT NODES
    graph.nodes.forEach(n => {
        const x = getX(n.x);
        const y = getY(n.y);
        if (grid[y]) grid[y][x] = `${C.NODE}O${C.RESET}`; 
    });

    // 4. PLOT EDGES
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

        // Draw the edge symbol
        if (grid[midY] && grid[midY][midX] === ' ') {
            grid[midY][midX] = `${C.NODE}${char}${C.RESET}`;
        }
        
        // Horizontal dashes (fill the gap because X is stretched)
        if (char === '-') {
             // Fill somewhat between the nodes to make it look connected
             grid[midY][midX - 1] = `${C.NODE}-${C.RESET}`;
             grid[midY][midX + 1] = `${C.NODE}-${C.RESET}`;
        }
    });

    // 5. PLOT RESOURCES (Character by Character)
    graph.hexes.forEach(h => {
        const nodes = h.nodeIds.map(id => graph.nodes.find(n => n.id === id));
        
        const rawAvgX = nodes.reduce((sum, n) => sum + n.x, 0) / 6;
        const rawAvgY = nodes.reduce((sum, n) => sum + n.y, 0) / 6;
        
        const cx = Math.floor(getX(rawAvgX));
        const cy = Math.floor(getY(rawAvgY));

        const meta = RES_MAP[h.resource] || { char: '???', color: C.RESET };
        const num = h.number !== null ? String(h.number).padStart(2, '0') : 'RB'; 

        // Write Resource Name (split across cells)
        // "Cry" -> grid[y][x-1]=C, grid[y][x]=r, grid[y][x+1]=y
        if (grid[cy]) {
             const str = meta.char; // e.g. "Cry"
             const startOffset = -1; // Center 3 chars
             for(let i=0; i<str.length; i++) {
                 grid[cy][cx + startOffset + i] = `${meta.color}${str[i]}${C.RESET}`;
             }
        }
        // Write Number
        if (grid[cy + 1]) {
             const str = num; // e.g. "08"
             const startOffset = -1; // Center roughly
             for(let i=0; i<str.length; i++) {
                 grid[cy + 1][cx + startOffset + i] = `${C.RESET}${str[i]}${C.RESET}`;
             }
        }
    });

    // 6. RENDER (Using empty string join to lock alignment)
    console.log('\n');
    console.log(grid.map(row => row.join('')).join('\n'));
    console.log('\n');
};

drawBoard();