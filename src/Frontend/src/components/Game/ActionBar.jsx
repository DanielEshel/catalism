// src/Frontend/src/components/Game/ActionBar.jsx
import React from "react";
import ResourceCard from "./ResourceCard";
import Dice from "./Dice";

export default function ActionBar({ isMyTurn, canRoll, canEndTurn, sendAction, resources, lastRoll, mustMoveRobber }) {
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
            <div style={{ display: "flex", gap: "12px", height: "100%", alignItems: "center", flex: 1 }}>
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

            {/* Center: Graphic Dice (Closer together & handles Robber 7) */}
            <div 
                onClick={() => { if (canRoll) sendAction("roll_dice"); }}
                style={{ 
                    display: "flex", 
                    gap: "6px", // <--- Reduced from 15px to bring them closer
                    flex: 1, 
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: canRoll ? "pointer" : "default",
                    transform: canRoll ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.2s ease"
                }}
                title={canRoll ? "Click to Roll Dice!" : ""}
            >
                {mustMoveRobber ? (
                    // Force a 7 display if the robber is waiting to be moved
                    <>
                        <Dice value={3} glow={false} />
                        <Dice value={4} glow={false} />
                    </>
                ) : (
                    // Otherwise show the normal roll or the glowing ? marks
                    <>
                        <Dice value={lastRoll ? lastRoll[0] : null} glow={canRoll} />
                        <Dice value={lastRoll ? lastRoll[1] : null} glow={canRoll} />
                    </>
                )}
            </div>

            {/* Right Side: Action Buttons */}
            <div style={{ display: "flex", gap: "20px", flex: 1, justifyContent: "flex-end" }}>
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