import React, { useMemo } from "react";

// Color Mappings
const RES_COLORS = {
  "Space Crystal": "#00d2ff", // Cyan
  Mice: "#a0522d", // Sienna/Brown
  Catnip: "#32cd32", // Lime Green
  "Carbon Fiber": "#696969", // Dim Gray
  "Cosmic Milk": "#ffb6c1", // Light Pink
  Void: "#4b0082", // Indigo
};

const PLAYER_COLORS = ["#ff5555", "#5555ff", "#55ff55", "#ffff55"];

export default function GameBoard({ game, user, onNodeClick, onEdgeClick }) {
  // 1. Safely grab the robberHex up here so the JSX below can actually see it!
  const robberHex = game?.boardState?.robberHex;

  const { renderData, viewBox } = useMemo(() => {
    // 2. SAFETY CHECK: Prevents editor warnings about undefined properties
    if (!game?.boardState) {
      return {
        renderData: {
          nodeMap: new Map(),
          hexData: [],
          edgeData: [],
          nodeOwner: {},
        },
        viewBox: "0 0 100 100",
      };
    }

    // 3. Destructure INSIDE useMemo to satisfy React hook dependency rules
    const { nodes, edges, hexes } = game.boardState;

    const SCALE = 25; // Scale factor for coordinates
    const PADDING = 40; // Space around the board edges

    // 4. Find the actual bounds of the generated board to center it
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    // 5. Map nodes so the board starts at (0,0) logically, then add padding
    const nodeMap = new Map();
    nodes.forEach((n) => {
      const sx = (n.x - minX) * SCALE + PADDING;
      const sy = (n.y - minY) * SCALE + PADDING;
      nodeMap.set(n.id, { ...n, sx, sy });
    });

    // 6. Map Ownership
    const nodeOwner = {};
    const edgeOwner = {};

    game.playerStates.forEach((p) => {
      const realIdx = game.playerIds.indexOf(p.userId._id || p.userId);
      const color = PLAYER_COLORS[realIdx % 4] || "#ffffff";

      p.settlements.forEach(
        (id) =>
          (nodeOwner[id] = {
            color,
            type: "S",
            isMe: p.userId._id === user?._id,
          }),
      );
      p.cities.forEach(
        (id) =>
          (nodeOwner[id] = {
            color,
            type: "C",
            isMe: p.userId._id === user?._id,
          }),
      );
      p.roads.forEach((key) => (edgeOwner[key] = color));
    });

    // 7. Prepare Hexagons
    const hexData = hexes.map((h) => {
      const hexNodes = h.nodeIds.map((id) => nodeMap.get(id));
      const points = hexNodes.map((n) => `${n.sx},${n.sy}`).join(" ");

      // Center point for the number token
      const cx = hexNodes.reduce((sum, n) => sum + n.sx, 0) / 6;
      const cy = hexNodes.reduce((sum, n) => sum + n.sy, 0) / 6;

      return { ...h, points, cx, cy };
    });

    // 8. Prepare Edges
    const edgeData = edges.map((e) => {
      const u = nodeMap.get(e.u);
      const v = nodeMap.get(e.v);
      const edgeKey = e.u < e.v ? `${e.u}-${e.v}` : `${e.v}-${e.u}`;
      return { u, v, color: edgeOwner[edgeKey] };
    });

    // 9. Calculate ViewBox based on the scaled width/height + total padding
    const width = (maxX - minX) * SCALE + PADDING * 2;
    const height = (maxY - minY) * SCALE + PADDING * 2;

    return {
      renderData: { nodeMap, hexData, edgeData, nodeOwner },
      viewBox: `0 0 ${width} ${height}`,
    };
  }, [game, user]);

  return (
    <svg
      viewBox={viewBox}
      style={{
        width: "100%",
        maxWidth: "600px",
        height: "auto",
        background: "#0a0a1a",
        borderRadius: "8px",
        border: "2px solid #333",
      }}
    >
      {/* 1. RENDER HEXAGONS */}
      {renderData.hexData.map((h) => (
        <g key={h.id}>
          <polygon
            points={h.points}
            fill={RES_COLORS[h.resource] || "#333"}
            stroke="#222"
            strokeWidth="2"
          />
          {/* Number Token */}
          {h.resource !== "Void" && (
            <circle cx={h.cx} cy={h.cy} r="14" fill="#eee" />
          )}
          <text
            x={h.cx}
            y={h.cy + 4}
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill={h.number === 6 || h.number === 8 ? "#d00" : "#111"}
          >
            {/* Now the JSX can read robberHex perfectly! */}
            {h.resource === "Void"
              ? robberHex === h.id
                ? "🤖"
                : ""
              : h.number}
          </text>
        </g>
      ))}

      {/* 2. RENDER EDGES (ROADS) */}
      {renderData.edgeData.map((e, idx) => (
        <g key={`edge-${idx}`}>
          {/* Visible Line */}
          <line
            x1={e.u.sx}
            y1={e.u.sy}
            x2={e.v.sx}
            y2={e.v.sy}
            stroke={e.color || "#444"}
            strokeWidth={e.color ? "6" : "2"}
          />
          {/* Invisible Thick Hitbox for clicking */}
          <line
            x1={e.u.sx}
            y1={e.u.sy}
            x2={e.v.sx}
            y2={e.v.sy}
            stroke="transparent"
            strokeWidth="15"
            className="clickable-edge"
            onClick={() => onEdgeClick(e.u.id, e.v.id)}
          />
        </g>
      ))}

      {/* 3. RENDER NODES (SETTLEMENTS/CITIES) */}
      {Array.from(renderData.nodeMap.values()).map((n) => {
        const owner = renderData.nodeOwner[n.id];

        if (owner) {
          if (owner.type === "C") {
            // City (Square)
            return (
              <rect
                key={n.id}
                x={n.sx - 10}
                y={n.sy - 10}
                width="20"
                height="20"
                fill={owner.color}
                stroke="#fff"
                strokeWidth="2"
                className={owner.isMe ? "clickable-node" : ""}
                onClick={() => (owner.isMe ? onNodeClick(n.id) : null)}
              />
            );
          } else {
            // Settlement (Circle)
            return (
              <circle
                key={n.id}
                cx={n.sx}
                cy={n.sy}
                r="8"
                fill={owner.color}
                stroke="#fff"
                strokeWidth="2"
                className={owner.isMe ? "clickable-node" : ""}
                onClick={() => (owner.isMe ? onNodeClick(n.id) : null)}
              />
            );
          }
        } else {
          // Empty Node
          return (
            <circle
              key={n.id}
              cx={n.sx}
              cy={n.sy}
              r="6"
              fill="#222"
              stroke="#555"
              strokeWidth="1"
              className="clickable-node"
              onClick={() => onNodeClick(n.id)}
            />
          );
        }
      })}
    </svg>
  );
}
