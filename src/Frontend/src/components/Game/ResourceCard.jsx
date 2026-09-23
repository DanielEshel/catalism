// src/Frontend/src/components/Game/ResourceCard.jsx
import React from "react";

// Thematic colors for each resource type
const RESOURCE_COLORS = {
    carbonFiber: "#6b6969",   // Metallic Gray
    spaceCrystal: "#b55aea",  // Neon Purple
    catnip: "#53c772",        // Neon Green
    mice: "#6f93db",          // Light Blue
    cosmicMilk: "#fffce8"     // Off-White
};

const RESOURCE_LABELS = {
    carbonFiber: "Carbon Fiber",
    spaceCrystal: "Space Crystal",
    catnip: "Catnip",
    mice: "Mice",
    cosmicMilk: "Cosmic Milk"
};

export default function ResourceCard({ resourceType, count }) {
    const color = RESOURCE_COLORS[resourceType] || "#ffffff";
    const label = RESOURCE_LABELS[resourceType] || resourceType;

    return (
        <div style={{
            width: "75px",
            height: "90px",
            backgroundColor: color,
            border: "6px solid #d6d6d6", // Fixed the stray '}' typo here
            borderRadius: "6px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 4px",
            boxShadow: `0px 2px 8px ${color}40`, 
            boxSizing: "border-box"
        }}>
            <span style={{ fontSize: "11px", color: "#111", textAlign: "center", lineHeight: "1.1", fontWeight: "bold" }}>
                {label}
            </span>
            <span style={{ fontSize: "28px", fontWeight: "bold", color: "#111" }}>
                {count}
            </span>
        </div>
    );
}