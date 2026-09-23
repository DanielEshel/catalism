// src/Frontend/src/components/Game/ActionBar.jsx
import React from "react";
import ResourceCard from "./ResourceCard";

export default function ActionBar({ isMyTurn, canRoll, canEndTurn, sendAction, resources }) {
    // Filter out resources the player doesn't have any of
    const activeCards = resources ? Object.entries(resources).filter(([, count]) => count > 0) : [];

    return (
        <div className="action-bar-container" style={{
            height: "120px", 
            backgroundColor: "#0d0d12", 
            border: "1px solid #2a2a35", 
            borderRadius: "8px", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            padding: "0 20px",
            boxShadow: "inset 0 0 15px rgba(0,0,0,0.8)",
            marginTop: "10px"
        }}>
            
            {/* Left Side: Resource Cards */}
            <div style={{ display: "flex", gap: "12px", height: "100%", alignItems: "center" }}>
                {activeCards.length === 0 ? (
                    <span style={{ color: "#555", fontStyle: "italic", fontFamily: "monospace" }}>
                        NO RESOURCES IN INVENTORY
                    </span>
                ) : (
                    activeCards.map(([resKey, count]) => (
                        <ResourceCard key={resKey} resourceType={resKey} count={count} />
                    ))
                )}
            </div>

            {/* Right Side: Action Buttons */}
            <div style={{ display: "flex", gap: "20px" }}>
                <button 
                    onClick={() => sendAction("roll_dice")} 
                    disabled={!canRoll} 
                    style={{ 
                        padding: "12px 24px", 
                        fontSize: "16px", 
                        opacity: !canRoll ? 0.4 : 1, 
                        cursor: canRoll ? "pointer" : "not-allowed",
                        minWidth: "140px"
                    }}
                >
                    🎲 Roll Dice
                </button>
                
                <button 
                    onClick={() => sendAction("end_turn")} 
                    disabled={!canEndTurn} 
                    style={{ 
                        padding: "12px 24px", 
                        fontSize: "16px", 
                        opacity: !canEndTurn ? 0.4 : 1, 
                        cursor: canEndTurn ? "pointer" : "not-allowed",
                        minWidth: "140px"
                    }}
                >
                    End Turn
                </button>
            </div>

        </div>
    );
}