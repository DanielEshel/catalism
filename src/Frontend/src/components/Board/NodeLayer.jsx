// src/Frontend/src/components/Board/NodeLayer.jsx
import React from "react";

export default function NodeLayer({ nodeMap, nodeOwner, validNodes, onNodeClick }) {
  return (
    <>
      {Array.from(nodeMap.values()).map((n) => {
        const owner = nodeOwner[n.id];
        const isValidEmpty = validNodes.has(n.id);

        if (owner) {
          if (owner.type === "C") {
            return (
              <rect
                key={n.id} x={n.sx - 10} y={n.sy - 10} width="20" height="20"
                fill={owner.color} stroke="#fff" strokeWidth="2"
                className={owner.isMe ? "clickable-node" : ""}
                style={{ cursor: owner.isMe ? "pointer" : "default" }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (owner.isMe && onNodeClick) onNodeClick(n.id, event);
                }}
              />
            );
          } else {
            return (
              <circle
                key={n.id} cx={n.sx} cy={n.sy} r="8"
                fill={owner.color} stroke="#fff" strokeWidth="2"
                className={owner.isMe ? "clickable-node" : ""}
                style={{ cursor: owner.isMe ? "pointer" : "default" }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (owner.isMe && onNodeClick) onNodeClick(n.id, event);
                }}
              />
            );
          }
        } else {
          return (
            <circle
              key={n.id} cx={n.sx} cy={n.sy}
              r={isValidEmpty ? "10" : "6"}
              fill={isValidEmpty ? "rgba(0, 255, 0, 0.4)" : "#222"}
              stroke={isValidEmpty ? "#00ff00" : "#555"}
              strokeWidth={isValidEmpty ? "2" : "1"}
              className="clickable-node"
              style={{ cursor: "pointer", transition: "all 0.2s" }}
              onClick={(event) => {
                event.stopPropagation();
                if (onNodeClick) onNodeClick(n.id, event);
              }}
            />
          );
        }
      })}
    </>
  );
}