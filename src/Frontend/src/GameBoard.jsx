// src/GameBoard.jsx
import React, { useMemo } from "react";

import resCarbonFiber from "./assets/resouces/res_carbon_fiber.png";
import resCatnip from "./assets/resouces/res_catnip.png";
import resCosmicMilk from "./assets/resouces/res_cosmic_milk.png";
import resMice from "./assets/resouces/res_mice.png";
import resSpaceCrystal from "./assets/resouces/res_space_crystal.png";
import Void from "./assets/resouces/void.png";

const RES_IMAGES = {
  "Space Crystal": resSpaceCrystal,
  Mice: resMice,
  Catnip: resCatnip,
  "Carbon Fiber": resCarbonFiber,
  "Cosmic Milk": resCosmicMilk,
  Void: Void,
};

const RES_COLORS = {
  Void: "#4b0082",
};

const PLAYER_COLORS = ["#ff5555", "#5555ff", "#55ff55", "#ffff55"];

export default function GameBoard({ game, user, onNodeClick, onEdgeClick }) {
  const robberHex = game?.boardState?.robberHex;

  const { renderData, viewBox } = useMemo(() => {
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

    const { nodes, edges, hexes } = game.boardState;

    // --- SCALE ADJUSTMENT ---
    // Reduced SCALE_X and SCALE_Y to shrink the board size.
    // Reduced PADDING to bring the board closer to the edges.
    const SCALE_X = 18;
    const SCALE_Y = 21;
    const PADDING = 30;

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

    const nodeMap = new Map();
    nodes.forEach((n) => {
      const sx = (n.x - minX) * SCALE_X + PADDING;
      const sy = (n.y - minY) * SCALE_Y + PADDING;
      nodeMap.set(n.id, { ...n, sx, sy });
    });

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

    const hexData = hexes.map((h) => {
      const hexNodes = h.nodeIds.map((id) => nodeMap.get(id));
      const points = hexNodes.map((n) => `${n.sx},${n.sy}`).join(" ");

      const cx = hexNodes.reduce((sum, n) => sum + n.sx, 0) / 6;
      const cy = hexNodes.reduce((sum, n) => sum + n.sy, 0) / 6;

      return { ...h, points, cx, cy };
    });

    const edgeData = edges.map((e) => {
      const u = nodeMap.get(e.u);
      const v = nodeMap.get(e.v);
      const edgeKey = e.u < e.v ? `${e.u}-${e.v}` : `${e.v}-${e.u}`;
      return { u, v, color: edgeOwner[edgeKey] };
    });

    const width = (maxX - minX) * SCALE_X + PADDING * 2;
    const height = (maxY - minY) * SCALE_Y + PADDING * 2;

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
        maxWidth: "100%",
        height: "100%",
        background: "#0a0a1a",
        borderRadius: "8px",
        border: "2px solid #333",
      }}
    >
      <defs>
        {Object.entries(RES_IMAGES).map(([resName, imgSrc]) => {
          if (!imgSrc) return null;
          const patternId = `bg-${resName.replace(/\s+/g, "")}`;

          return (
            <pattern
              key={patternId}
              id={patternId}
              patternUnits="objectBoundingBox"
              patternContentUnits="objectBoundingBox"
              width="1"
              height="1"
            >
              <image
                href={imgSrc}
                x="-0.05"
                y="-0.05"
                width="1.1"
                height="1.1"
                preserveAspectRatio="xMidYMid slice"
              />
            </pattern>
          );
        })}
      </defs>

      {/* 1. RENDER HEXAGONS */}
      {renderData.hexData.map((h) => {
        const fillUrl = RES_IMAGES[h.resource]
          ? `url(#bg-${h.resource.replace(/\s+/g, "")})`
          : RES_COLORS[h.resource] || "#333";

        return (
          <g key={h.id}>
            <polygon
              points={h.points}
              fill={fillUrl}
              stroke="#222"
              strokeWidth="2"
            />
            {h.resource !== "Void" && (
              <circle cx={h.cx} cy={h.cy} r="14" fill="#eee" opacity="0.9" />
            )}
            <text
              x={h.cx}
              y={h.cy + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fill={h.number === 6 || h.number === 8 ? "#d00" : "#111"}
            >
              {h.resource === "Void"
                ? robberHex === h.id
                  ? "👽"
                  : ""
                : robberHex === h.id
                  ? "👽"
                  : h.number}
            </text>
          </g>
        );
      })}

      {/* 2. RENDER EDGES (ROADS) */}
      {renderData.edgeData.map((e, idx) => (
        <g key={`edge-${idx}`}>
          <line
            x1={e.u.sx}
            y1={e.u.sy}
            x2={e.v.sx}
            y2={e.v.sy}
            stroke={e.color || "#444"}
            strokeWidth={e.color ? "6" : "2"}
          />
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
