// src/Frontend/src/components/Game/Dice.jsx
import React from "react";

export default function Dice({ value, glow }) {
    // Defines grid positions (row / column) for pips based on a 3x3 grid
    const pipPositions = {
        1: ["2 / 2"],
        2: ["1 / 3", "3 / 1"],
        3: ["1 / 3", "2 / 2", "3 / 1"],
        4: ["1 / 1", "1 / 3", "3 / 1", "3 / 3"],
        5: ["1 / 1", "1 / 3", "2 / 2", "3 / 1", "3 / 3"],
        6: ["1 / 1", "1 / 3", "2 / 1", "2 / 3", "3 / 1", "3 / 3"]
    };

    const pips = pipPositions[value] || [];

    return (
        <div style={{
            width: "50px",
            height: "50px",
            backgroundColor: "#1a1a24",
            border: glow ? "2px solid #00ff00" : "2px solid #2a2a35",
            borderRadius: "10px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gridTemplateRows: "1fr 1fr 1fr",
            padding: "6px",
            boxShadow: glow 
                ? "0 0 15px rgba(0, 255, 0, 0.5), inset 0 0 10px rgba(0,0,0,0.8)" 
                : "inset 0 0 10px rgba(0,0,0,0.8), 0 4px 6px rgba(0,0,0,0.3)",
            boxSizing: "border-box",
            transition: "all 0.2s ease-in-out"
        }}>
            {pips.length > 0 ? (
                pips.map((pos, i) => (
                    <div key={i} style={{
                        gridArea: pos,
                        width: "10px",
                        height: "10px",
                        backgroundColor: "#00ff00",
                        borderRadius: "50%",
                        boxShadow: "0 0 6px #00ff00",
                        justifySelf: "center",
                        alignSelf: "center"
                    }} />
                ))
            ) : (
                // Shows a question mark when the dice haven't been rolled yet
                <div style={{
                    gridColumn: "1 / -1",
                    gridRow: "1 / -1",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: glow ? "#00ff00" : "#444",
                    fontSize: "24px",
                    fontWeight: "bold",
                    opacity: glow ? 0.8 : 0.3
                }}>
                    ?
                </div>
            )}
        </div>
    );
}