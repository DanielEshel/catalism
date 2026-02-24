// src/Frontend/src/GameBoard.jsx
import React, { useMemo } from "react";
import { checkSettlementSpacing, checkRoadAdjacency } from "./utils/gameRules";
import { RES_IMAGES, PLAYER_COLORS } from "./constants/boardConstants.js";
import HexLayer from "./components/Board/HexLayer";
import EdgeLayer from "./components/Board/EdgeLayer";
import NodeLayer from "./components/Board/NodeLayer";

export default function GameBoard({ game, user, onNodeClick, onEdgeClick, onHexClick }) {
  const robberHex = game?.boardState?.robberHex;

  const { renderData, viewBox } = useMemo(() => {
    if (!game?.boardState) {
      return {
        renderData: { nodeMap: new Map(), hexData: [], edgeData: [], nodeOwner: {}, validNodes: new Set() },
        viewBox: "0 0 100 100",
      };
    }

    const { nodes, edges, hexes } = game.boardState;

    const SCALE_X = 18;
    const SCALE_Y = 21;
    const PADDING = 30;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
    });

    const nodeMap = new Map();
    nodes.forEach((n) => {
      const sx = (n.x - minX) * SCALE_X + PADDING;
      const sy = (n.y - minY) * SCALE_Y + PADDING;
      nodeMap.set(n.id, { ...n, sx, sy });
    });

    const nodeOwner = {};
    const edgeOwner = {};

    let totalSettlements = 0;
    let totalRoads = 0;

    game.playerStates.forEach((p) => {
      const realIdx = game.playerIds.indexOf(p.userId._id || p.userId);
      const color = PLAYER_COLORS[realIdx % 4] || "#ffffff";

      totalSettlements += p.settlements.length + p.cities.length;
      totalRoads += p.roads.length;

      p.settlements.forEach((id) => (nodeOwner[id] = { color, type: "S", isMe: p.userId._id === user?._id }));
      p.cities.forEach((id) => (nodeOwner[id] = { color, type: "C", isMe: p.userId._id === user?._id }));
      p.roads.forEach((key) => (edgeOwner[key] = color));
    });

    const isSetupPhase = totalSettlements < game.maxPlayers * 2 || totalRoads < game.maxPlayers * 2;
    const isMyTurn = game.turn === user?._id;
    const isRobberTime = isMyTurn && game.mustMoveRobber;
    const myPlayerState = game.playerStates.find((p) => (p.userId._id || p.userId) === user?._id);

    const validNodes = new Set();
    if (isMyTurn && !isRobberTime && myPlayerState) {
        nodes.forEach(n => {
            if (nodeOwner[n.id]) return;
            const spacingOk = checkSettlementSpacing(n.id, game);
            const networkOk = isSetupPhase || myPlayerState.roads.some(r => r.split("-").map(Number).includes(n.id));
            if (spacingOk && networkOk) validNodes.add(n.id);
        });
    }

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
      
      let isValid = false;
      if (isMyTurn && !isRobberTime && myPlayerState && !edgeOwner[edgeKey]) {
          if (isSetupPhase) {
              if (myPlayerState.settlements.length > myPlayerState.roads.length) {
                  const lastSettlement = myPlayerState.settlements[myPlayerState.settlements.length - 1];
                  if ([e.u, e.v].includes(lastSettlement)) isValid = true;
              }
          } else {
              if (checkRoadAdjacency(e.u, e.v, myPlayerState)) isValid = true;
          }
      }

      return { u, v, color: edgeOwner[edgeKey], isValid };
    });

    const width = (maxX - minX) * SCALE_X + PADDING * 2;
    const height = (maxY - minY) * SCALE_Y + PADDING * 2;

    return {
      renderData: { nodeMap, hexData, edgeData, nodeOwner, validNodes },
      viewBox: `0 0 ${width} ${height}`,
    };
  }, [game, user]);

  return (
    <svg
      viewBox={viewBox}
      style={{
        width: "100%", maxWidth: "100%", height: "100%",
        background: "#0a0a1a", borderRadius: "8px", border: "2px solid #333",
      }}
    >
      <defs>
        {Object.entries(RES_IMAGES).map(([resName, imgSrc]) => {
          if (!imgSrc) return null;
          const patternId = `bg-${resName.replace(/\s+/g, "")}`;
          return (
            <pattern key={patternId} id={patternId} patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href={imgSrc} x="-0.05" y="-0.05" width="1.1" height="1.1" preserveAspectRatio="xMidYMid slice" />
            </pattern>
          );
        })}
      </defs>

      <HexLayer hexData={renderData.hexData} robberHex={robberHex} onHexClick={onHexClick} />
      <EdgeLayer edgeData={renderData.edgeData} onEdgeClick={onEdgeClick} />
      <NodeLayer nodeMap={renderData.nodeMap} nodeOwner={renderData.nodeOwner} validNodes={renderData.validNodes} onNodeClick={onNodeClick} />
    </svg>
  );
}