import React, { useMemo } from 'react';

const COLORS = ['ansi-red', 'ansi-blue', 'ansi-green', 'ansi-yellow'];
const RES_MAP = {
    'Space Crystal': 'Cry', 'Mice': 'Mic', 'Catnip': 'Nip',
    'Carbon Fiber': 'Fib', 'Cosmic Milk': 'Mil', 'Void': 'VOI'
};

export default function GameBoard({ game }) {
    // We use useMemo so we don't recalculate the grid on every tiny React render
    const grid = useMemo(() => {
        if (!game || !game.boardState) return [];

        const graph = game.boardState;
        const X_SCALE = 3; 
        const Y_SCALE = 2;

        // 1. Calculate Bounds
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        graph.nodes.forEach(n => {
            if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
            if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
        });

        const GRID_W = (maxX - minX) * X_SCALE + 12;
        const GRID_H = (maxY - minY) * Y_SCALE + 6;
        
        const getX = (val) => (val - minX) * X_SCALE + 2; 
        const getY = (val) => (val - minY) * Y_SCALE + 2;

        // Initialize empty grid with space objects
        // Each cell = { char: ' ', color: '' }
        const rows = Array(GRID_H).fill(null).map(() => 
            Array(GRID_W).fill(null).map(() => ({ char: ' ', color: '' }))
        );

        const setCell = (y, x, char, color = '') => {
            if (rows[y] && rows[y][x]) {
                rows[y][x] = { char, color };
            }
        };

        // --- OWNERSHIP MAPS ---
        const nodeOwner = {}; 
        const edgeOwner = {}; 
        
        // Map player states to colors
        game.playerStates.forEach((p, idx) => {
            // Find which player index this is in the main list
            const realIdx = game.playerIds.indexOf(p.userId);
            const color = COLORS[realIdx % 4] || 'ansi-white';
            
            p.settlements.forEach(id => nodeOwner[id] = { color, type: 'S' });
            p.cities.forEach(id => nodeOwner[id] = { color, type: 'C' });
            p.roads.forEach(key => edgeOwner[key] = color);
        });

        // 2. RENDER EDGES
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

            const edgeKey = u.id < v.id ? `${u.id}-${v.id}` : `${v.id}-${u.id}`;
            const ownerColor = edgeOwner[edgeKey];
            
            if (ownerColor) {
                setCell(midY, midX, char, `${ownerColor} ansi-bold`);
                if(char === '-') { // Fill gaps
                    setCell(midY, midX-1, '-', ownerColor);
                    setCell(midY, midX+1, '-', ownerColor);
                }
            } else if (rows[midY][midX].char === ' ') {
                setCell(midY, midX, char, 'ansi-grey');
            }
        });

        // 3. RENDER NODES
        graph.nodes.forEach(n => {
            const x = getX(n.x);
            const y = getY(n.y);
            
            if (nodeOwner[n.id]) {
                setCell(y, x, nodeOwner[n.id].type, `${nodeOwner[n.id].color} ansi-bold`);
            } else {
                setCell(y, x, '.', 'ansi-grey');
                // HACK: Render ID for help
                const idStr = String(n.id);
                if (rows[y][x+1].char === ' ') setCell(y, x+1, idStr[0], 'ansi-grey');
                if (idStr[1] && rows[y][x+2].char === ' ') setCell(y, x+2, idStr[1], 'ansi-grey');
            }
        });

        // 4. RENDER HEX RESOURCES
        graph.hexes.forEach(h => {
            const nodes = h.nodeIds.map(id => graph.nodes.find(n => n.id === id));
            const avgX = nodes.reduce((s, n) => s + n.x, 0) / 6;
            const avgY = nodes.reduce((s, n) => s + n.y, 0) / 6;
            const cx = Math.floor(getX(avgX));
            const cy = Math.floor(getY(avgY));

            const txt = RES_MAP[h.resource] || '???';
            const num = h.number !== null ? String(h.number).padStart(2,'0') : 'RB';

            for(let i=0; i<txt.length; i++) setCell(cy, cx - 1 + i, txt[i], 'ansi-white');
            for(let i=0; i<num.length; i++) setCell(cy+1, cx - 1 + i, num[i], 'ansi-yellow');
        });

        return rows;

    }, [game]);

    return (
        <div className="board-container">
            {grid.map((row, y) => (
                <div key={y}>
                    {row.map((cell, x) => (
                        <span key={x} className={`cell ${cell.color}`}>{cell.char}</span>
                    ))}
                </div>
            ))}
        </div>
    );
}