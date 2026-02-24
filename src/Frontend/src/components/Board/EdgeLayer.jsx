// src/Frontend/src/components/Board/EdgeLayer.jsx
import React from "react";

export default function EdgeLayer({ edgeData, onEdgeClick }) {
  return (
    <>
      {edgeData.map((e, idx) => (
        <g key={`edge-${idx}`}>
          <line
            x1={e.u.sx} y1={e.u.sy} x2={e.v.sx} y2={e.v.sy}
            stroke={e.color || (e.isValid ? "rgba(0, 255, 0, 0.5)" : "#444")}
            strokeWidth={e.color ? "6" : (e.isValid ? "4" : "2")}
            strokeDasharray={e.isValid && !e.color ? "4 4" : "none"}
          />
          <line
            x1={e.u.sx} y1={e.u.sy} x2={e.v.sx} y2={e.v.sy}
            stroke="transparent" strokeWidth="15"
            className="clickable-edge" style={{ cursor: "pointer" }}
            onClick={(event) => {
              event.stopPropagation();
              if (onEdgeClick) onEdgeClick(e.u.id, e.v.id, event);
            }}
          />
        </g>
      ))}
    </>
  );
}