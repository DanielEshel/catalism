// src/Frontend/src/components/Game/GameStatusScreens.jsx
import React from "react";

export function LobbyScreen({ game, onQuit }) {
    return (
        <div className="container">
            <div className="row">
                <h3>Sector: {game._id.slice(-6)}</h3>
                <button onClick={onQuit}>Quit Game</button>
            </div>
            <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
                <h2>⏳ WAITING FOR PILOTS...</h2>
                <p style={{ fontSize: "20px" }}>{game.playerStates.length} / {game.maxPlayers} Players Joined</p>
            </div>
        </div>
    );
}

export function GameOverScreen({ game, onQuit }) {
    const winner = [...game.playerStates].sort((a, b) => b.victoryPoints - a.victoryPoints)[0];
    const winnerName = winner?.userId?.displayName || "Unknown";
    return (
        <div className="container" style={{ marginTop: "10vh" }}>
            <div className="panel" style={{ textAlign: "center", padding: "50px", border: "2px solid #00ff00" }}>
                <h1 className="ansi-yellow" style={{ fontSize: "40px", margin: "0 0 20px 0" }}>🏆 SECTOR CLOSED 🏆</h1>
                <h2 style={{ color: "#eee" }}>{winnerName} has won the game!</h2>
                <div style={{ marginTop: "40px" }}>
                    <button onClick={onQuit} style={{ fontSize: "18px", padding: "10px 20px" }}>Return to Lobby</button>
                </div>
            </div>
        </div>
    );
}