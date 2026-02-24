import React from "react";
import { RES_IMAGES, RES_COLORS } from "../../constants/boardConstants";

export default function HexLayer({ hexData, robberHex, onHexClick }) {
  return (
    <>
      {hexData.map((h) => {
        const fillUrl = RES_IMAGES[h.resource]
          ? `url(#bg-${h.resource.replace(/\s+/g, "")})`
          : RES_COLORS[h.resource] || "#333";

        return (
          <g
            key={h.id}
            onClick={(event) => {
              if (onHexClick) {
                event.stopPropagation();
                onHexClick(h.id);
              }
            }}
            className={onHexClick ? "clickable-hex" : ""}
            style={{ cursor: onHexClick ? "pointer" : "default" }}
          >
            <polygon points={h.points} fill={fillUrl} stroke="#222" strokeWidth="2" />
            {h.resource !== "Void" && (
              <circle cx={h.cx} cy={h.cy} r="14" fill="#eee" opacity="0.9" />
            )}
            <text
              x={h.cx} y={h.cy + 4} textAnchor="middle" fontSize="12" fontWeight="bold"
              fill={h.number === 6 || h.number === 8 ? "#d00" : "#111"}
            >
              {h.resource === "Void"
                ? robberHex === h.id ? "👽" : ""
                : robberHex === h.id ? "👽" : h.number}
            </text>
          </g>
        );
      })}
    </>
  );
}