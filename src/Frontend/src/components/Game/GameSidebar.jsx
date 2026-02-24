import React from "react";
import ResourceList from "./ResourceList";

export default function GameSidebar({ game, user, logs, isMyTurn, canRoll, sendAction }) {
    const currentTurnPlayerName = game.playerStates.find(p => (p.userId._id || p.userId) === game.turn)?.userId?.displayName || "Unknown";
    const isSetupPhase = game.playerStates.reduce((sum, p) => sum + p.settlements.length + p.cities.length, 0) < game.maxPlayers * 2;

    return (
        <div style={{ width: "260px", display: "flex", flexDirection: "column", gap: "10px", overflowY: "hidden" }}>
            <div className="panel" style={{ padding: "12px", margin: 0 }}>
                <h4 style={{ margin: "0 0 10px 0" }}>Command Center</h4>
                <div style={{ fontSize: "13px", marginBottom: "10px", color: "#ccc" }}>
                    Phase: <span className="ansi-yellow ansi-bold">{isSetupPhase ? "SETUP" : "OPERATIONS"}</span><br/>
                    Dice: {game.diceRolled ? <span className="ansi-yellow">Rolled</span> : "Waiting to Roll"}
                </div>
                <div className="flex" style={{ gap: "6px" }}>
                    <button onClick={() => sendAction("roll_dice")} disabled={!canRoll} style={{ flex: 1, margin: 0, padding: "6px", opacity: !canRoll ? 0.5 : 1 }}>🎲 Roll</button>
                    <button onClick={() => sendAction("end_turn")} disabled={!isMyTurn} style={{ flex: 1, margin: 0, padding: "6px", opacity: !isMyTurn ? 0.5 : 1 }}>End Turn</button>
                </div>
            </div>

            <div className="panel" style={{ padding: "12px", margin: 0, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <h4 style={{ margin: "0 0 10px 0" }}>Comms Log</h4>
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    {logs.map((l, i) => (
                        <div key={i} style={{ fontSize: 12, color: "#aaa", marginBottom: '6px', lineHeight: "1.3" }}>{l}</div>
                    ))}
                </div>
            </div>

            <div className="panel" style={{ padding: "12px", margin: 0 }}>
                <h4 style={{ margin: "0 0 10px 0" }}>Pilots & Status</h4>
                <div style={{ marginBottom: "10px", padding: "8px", background: isMyTurn ? "#003300" : "#222", border: isMyTurn ? "1px solid #00ff00" : "1px solid #444", borderRadius: "4px", textAlign: "center", fontWeight: "bold", fontSize: "13px" }}>
                    {isMyTurn ? <span className="ansi-green">IT IS YOUR TURN</span> : <span style={{ color: "#aaa" }}>Waiting on {currentTurnPlayerName}...</span>}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", maxHeight: "350px" }}>
                    {game.playerStates.map((p) => {
                        const pId = p.userId._id || p.userId;
                        const isMe = pId === user?._id;
                        const isTheirTurn = game.turn === pId;

                        return (
                            <div key={pId} style={{ padding: "8px", borderRadius: "4px", border: isTheirTurn ? "2px solid gold" : (isMe ? "1px solid #00ff00" : "1px solid #444"), background: isTheirTurn ? "#333" : "transparent" }}>
                                <div style={{ fontWeight: "bold", color: isMe ? "#00ff00" : "#ccc", display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "13px" }}>
                                    <span>{p.userId.displayName} {isMe && "(You)"}</span>
                                    {isTheirTurn && <span style={{ color: "gold", fontSize: "11px" }}>◀ ACTIVE</span>}
                                </div>
                                <div style={{ fontSize: "11px", color: "#aaa" }}>
                                    VP: {p.victoryPoints} | Roads: {p.roads.length}
                                </div>
                                <div style={{ marginTop: "4px", borderTop: "1px solid #444", paddingTop: "4px" }}>
                                    <ResourceList resources={p.resources} count={p.resourceCount} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}