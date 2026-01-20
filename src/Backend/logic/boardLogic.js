// logic/boardLogic.js

// --- CONSTANTS ---
// The standard Catan layout: 5 rows
const ROW_SIZES = [3, 4, 5, 4, 3];

const generateBoardGraph = () => {
    const hexes = [];
    const nodesMap = new Map(); // Key: "x,y" -> Value: Node Object
    const edges = new Set();    // Set of "u-v" strings
    
    // 1. Resources & Numbers (Standard Setup)
    const resourceDeck = [
        ...Array(4).fill('Space Crystal'), ...Array(4).fill('Mice'),
        ...Array(4).fill('Catnip'), ...Array(3).fill('Carbon Fiber'),
        ...Array(3).fill('Cosmic Milk'), 'Void'
    ];
    // Note: 'Void' (Desert) usually has no number token
    const numberTokens = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
    
    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
    const resources = shuffle(resourceDeck);
    const numbers = shuffle(numberTokens);

    let hexIdCounter = 0;
    let numIndex = 0;
    let globalNodeId = 0;

    // --- HELPER: GET OR CREATE NODE ---
    const getOrCreateNode = (x, y) => {
        const key = `${x},${y}`;
        if (!nodesMap.has(key)) {
            nodesMap.set(key, {
                id: globalNodeId++,
                x: x, // Useful for frontend positioning
                y: y,
                connections: [],
                hexIds: []
            });
        }
        return nodesMap.get(key);
    };

    // --- GENERATE GRID ---
    // We use "Doubled Coordinates" logic for pointy-topped hexes.
    // Row 0 starts at Y=2. Row 1 at Y=5. (Vertical step is 3)
    // Horizontal step is 4.
    // Row offsets shift X by 2 for each row away from center.

    ROW_SIZES.forEach((size, r) => {
        // Calculate Row Offset to center the board
        // r=0 (size 3) -> Offset 4
        // r=1 (size 4) -> Offset 2
        // r=2 (size 5) -> Offset 0
        const xOffset = Math.abs(2 - r) * 2; 

        for (let c = 0; c < size; c++) {
            // 1. Calculate Hex Center (cx, cy)
            const cx = xOffset + (c * 4);
            const cy = r * 3; // Vertical spacing

            // 2. Assign Props
            const res = resources[hexIdCounter];
            const num = res === 'Void' ? null : numbers[numIndex++];
            const currentHexId = hexIdCounter++;

            // 3. Calculate the 6 Corners relative to Center
            // These integer offsets match pointy-top hex geometry perfectly.
            const cornerOffsets = [
                { x: 0, y: -2 },  // 0: Top
                { x: 2, y: -1 },  // 1: Top Right
                { x: 2, y: 1 },   // 2: Bottom Right
                { x: 0, y: 2 },   // 3: Bottom
                { x: -2, y: 1 },  // 4: Bottom Left
                { x: -2, y: -1 }  // 5: Top Left
            ];

            const hexNodeIds = [];

            cornerOffsets.forEach(offset => {
                const nx = cx + offset.x;
                const ny = cy + offset.y;
                
                // This call ensures shared nodes are merged!
                const node = getOrCreateNode(nx, ny);
                
                // Link Node to Hex
                if (!node.hexIds.includes(currentHexId)) {
                    node.hexIds.push(currentHexId);
                }
                hexNodeIds.push(node.id);
            });

            // 4. Register Hex
            hexes.push({
                id: currentHexId,
                resource: res,
                number: num,
                nodeIds: hexNodeIds
            });

            // 5. Register Edges (Connect the ring: 0-1, 1-2, 2-3...)
            for (let i = 0; i < 6; i++) {
                const u = hexNodeIds[i];
                const v = hexNodeIds[(i + 1) % 6];
                
                // Store normalized key "min-max"
                const edgeKey = u < v ? `${u}-${v}` : `${v}-${u}`;
                edges.add(edgeKey);
                
                // Update Node Connections (Adjacency List)
                const nodeU = Array.from(nodesMap.values()).find(n => n.id === u);
                const nodeV = Array.from(nodesMap.values()).find(n => n.id === v);
                
                if (!nodeU.connections.includes(v)) nodeU.connections.push(v);
                if (!nodeV.connections.includes(u)) nodeV.connections.push(u);
            }
        }
    });

    // Final Formatting
    const nodes = Array.from(nodesMap.values()).sort((a,b) => a.id - b.id);
    const edgeList = Array.from(edges).map(e => {
        const [u, v] = e.split('-').map(Number);
        return { u, v };
    });

    // Find the Desert for the Robber
    const robberHex = hexes.find(h => h.resource === 'Void').id;

    return { hexes, nodes, edges: edgeList, robberHex };
};

module.exports = { generateBoardGraph };