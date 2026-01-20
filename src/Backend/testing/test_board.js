const { generateBoardGraph } = require('../logic/boardLogic');

// ANSI Colors for readability
const C = {
    CYAN: '\x1b[36m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    DIM: '\x1b[2m',
    RESET: '\x1b[0m'
};

const printBoard = () => {
    console.log(`${C.CYAN}==========================================`);
    console.log(`       GALAXY MAP GENERATION REPORT       `);
    console.log(`==========================================${C.RESET}\n`);

    const graph = generateBoardGraph();

    // 1. SUMMARY STATS
    console.log(`${C.YELLOW}--- [1] SYSTEM OVERVIEW ---${C.RESET}`);
    console.log(`Hexes (Sectors): ${graph.hexes.length} (Target: 19)`);
    console.log(`Nodes (Corners): ${graph.nodes.length} (Target: 54)`);
    console.log(`Edges (Lanes):   ${graph.edges.length} (Target: 72)`);
    console.log(`Robber Location: Hex #${graph.robberHex}`);

    // 2. HEX AUDIT (Check stitching)
    console.log(`\n${C.YELLOW}--- [2] SECTOR ANALYSIS (First 5) ---${C.RESET}`);
    console.log(`(Checking if nodes are being assigned correctly to Hexes)`);
    
    // Print first row (3 hexes) and second row (first 2) to see overlap
    graph.hexes.slice(0, 5).forEach(hex => {
        const resourceStr = hex.resource.padEnd(14, ' ');
        const numStr = (hex.number || '-').toString().padStart(2, ' ');
        // Highlight shared nodes in green? No, just list them.
        console.log(`Hex #${String(hex.id).padStart(2, '0')} | ${resourceStr} | Token: ${numStr} | Nodes: [${hex.nodeIds.join(', ')}]`);
    });

    // 3. STITCHING TEST (The "Merge" Verification)
    console.log(`\n${C.YELLOW}--- [3] GRAVITY WELL (NODE) MERGE TEST ---${C.RESET}`);
    // Check specific known overlaps. In a 3-4-5 grid:
    // Hex 0 (0,0) and Hex 1 (0,1) should share 2 nodes.
    const h0 = graph.hexes[0];
    const h1 = graph.hexes[1];
    const shared01 = h0.nodeIds.filter(n => h1.nodeIds.includes(n));
    
    console.log(`Merging Hex #0 & Hex #1:`);
    console.log(`   Hex 0 Nodes: [${h0.nodeIds.join(', ')}]`);
    console.log(`   Hex 1 Nodes: [${h1.nodeIds.join(', ')}]`);
    
    if (shared01.length === 2) {
        console.log(`${C.GREEN}   ✅ SUCCESS: Shared Nodes {${shared01.join(', ')}} found.${C.RESET}`);
    } else {
        console.log(`${C.RED}   ❌ FAIL: Disconnected! Shared: ${shared01.length}${C.RESET}`);
    }

    // 4. COORDINATE MAPPING
    console.log(`\n${C.YELLOW}--- [4] COORDINATE INTEGRITY (Sample) ---${C.RESET}`);
    // Print a few nodes to see their calculated "Physical" coordinates
    graph.nodes.slice(0, 6).forEach(n => {
        console.log(`Node #${String(n.id).padStart(2, '0')} | Loc: (${String(n.x).padStart(2)}, ${String(n.y).padStart(2)}) | Neighbors: ${JSON.stringify(n.connections)}`);
    });

    // 5. EDGE LIST (First 10)
    console.log(`\n${C.YELLOW}--- [5] HYPERLANE (EDGE) REGISTRY (Sample) ---${C.RESET}`);
    const edgeSample = graph.edges.slice(0, 8).map(e => `${e.u}<->${e.v}`).join('  |  ');
    console.log(edgeSample + "  ...");

    console.log(`\n${C.CYAN}==========================================${C.RESET}`);
};

printBoard();