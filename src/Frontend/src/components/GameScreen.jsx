import React from "react";
import GameBoard from "../GameBoard";
import useGameState from "../hooks/useGameState";

const ResourceList = ({ resources, count }) => {
  if (!resources) {
    if (!count || count === 0) return <span style={{ fontSize: "10px", color: "#666" }}>Empty Hand</span>;
    return <span style={{ fontSize: "11px", color: "#888", fontStyle: "italic" }}>Hidden Hand ({count}) 🎴</span>;
  }

  const map = { carbonFiber: "Fiber", spaceCrystal: "Crystal", catnip: "Nip", mice: "Mice", cosmicMilk: "Milk" };
  const items = Object.entries(resources).filter(([, amt]) => amt > 0);
  
  if (items.length === 0) return <span style={{ fontSize: "10px", color: "#666" }}>Empty Hand</span>;

  return (
    <div style={{ fontSize: "11px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {items.map(([key, amount]) => (
        <span key={key} style={{ border: "1px solid #444", padding: "1px 3px", borderRadius: "3px", background: "#222", color: "#eee" }}>
          {map[key] || key}: {amount}
        </span>
      ))}
    </div>
  );
};

export default function GameScreen({ user, gameId, setView, setActiveGameId }) {
  const { game, logs, sendAction, leaveGame } = useGameState(gameId);

  const handleQuit = () => {
    leaveGame();
    setActiveGameId(null);
    setView("lobby");
  };

  if (!game) return <div className="container"><h2>Loading Sector Data...</h2></div>;

  const isMyTurn = game?.turn === user?._id;
  const myPlayerState = game.playerStates.find(p => (p.userId._id || p.userId) === user?._id);
  const totalSettlements = game.playerStates.reduce((sum, p) => sum + p.settlements.length + p.cities.length, 0);
  
  const isSetupPhase = totalSettlements < game.maxPlayers * 2;
  const canRoll = isMyTurn && !isSetupPhase && !game.diceRolled;

  // --- SMART CLICK HANDLERS ---
  const handleNodeClick = (nodeId) => {
    if (!isMyTurn) return;
    
    // If I already have a settlement here, upgrade it to a City
    if (myPlayerState.settlements.includes(nodeId)) {
        if (!isSetupPhase) {
            sendAction("build_city", { nodeId });
        } else {
            alert("Cannot build cities during the setup phase!");
        }
    } else {
        // Otherwise, try to build a new Settlement
        sendAction("build_settlement", { nodeId });
    }
  };

  const handleEdgeClick = (u, v) => {
    if (!isMyTurn) return;
    sendAction("build_road", { u, v });
  };

  return (
    <div className="container">
      <div className="row">
        <h3>Sector: {game._id.slice(-6)}</h3>
        <button onClick={handleQuit}>Quit Game</button>
      </div>

      {game.status === "lobby" ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <h2>⏳ WAITING FOR PILOTS...</h2>
          <p style={{ fontSize: "20px" }}>{game.playerStates.length} / {game.maxPlayers} Players Joined</p>
        </div>
      ) : (
        <div className="flex" style={{ alignItems: "flex-start" }}>
          
          {/* THE NEW INTERACTIVE BOARD */}
          <div className="board-container" style={{ flex: 1 }}>
            <GameBoard 
                game={game} 
                user={user} 
                onNodeClick={handleNodeClick} 
                onEdgeClick={handleEdgeClick} 
            />
            <div style={{ textAlign: "center", marginTop: "10px", color: "#888", fontSize: "12px" }}>
               💡 <i>Click empty nodes to build Settlements. Click your existing Settlements to upgrade to Cities. Click lines to build Roads.</i>
            </div>
          </div>

          <div style={{ minWidth: "220px", marginLeft: "10px" }}>
            <div className="panel">
              <h4>🚀 Pilots</h4>
              {game.playerStates.map((p) => {
                const pId = p.userId._id || p.userId;
                const pName = p.userId.displayName || "Unknown";
                const isMe = pId === user?._id;

                return (
                  <div key={pId} style={{ marginBottom: "8px", padding: "6px", border: isMe ? "1px solid #00ff00" : "1px solid #444", background: game.turn === pId ? "#333" : "transparent", boxShadow: game.turn === pId ? "0 0 5px #555" : "none" }}>
                    <div style={{ fontWeight: "bold", color: isMe ? "#00ff00" : "#ccc", display: "flex", justifyContent: "space-between" }}>
                      <span>{pName} {isMe && "(You)"}</span>
                      {game.turn === pId && <span style={{ color: "gold" }}>◀ TURN</span>}
                    </div>
                    <div style={{ fontSize: "12px", color: "#aaa" }}>VP: {p.victoryPoints} | Roads: {p.roads.length}</div>
                    <div style={{ marginTop: "4px", borderTop: "1px dashed #444", paddingTop: "4px" }}>
                      <ResourceList resources={p.resources} count={p.resourceCount} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ minWidth: "250px", marginLeft: "10px" }}>
            <div className="panel">
              <h4>Status Report</h4>
              <div style={{ marginBottom: "10px" }}>Phase: <span className="ansi-yellow ansi-bold">{isSetupPhase ? "SETUP (Free Build)" : "NORMAL OPERATIONS"}</span></div>
              <div>Turn: {isMyTurn ? <span className="ansi-green ansi-bold">YOUR TURN</span> : "Waiting..."}</div>
              <div>Dice: {game.diceRolled ? <span className="ansi-yellow">Rolled</span> : "Waiting to Roll"}</div>
            </div>

            <div className="panel">
              <h4>Actions</h4>
              <div className="flex">
                <button onClick={() => sendAction("roll_dice")} disabled={!canRoll} style={{ opacity: !canRoll ? 0.5 : 1 }}>🎲 Roll</button>
                <button onClick={() => sendAction("end_turn")} disabled={!isMyTurn} style={{ opacity: !isMyTurn ? 0.5 : 1 }}>End Turn</button>
              </div>
            </div>

            <div className="panel">
              <h4>Log</h4>
              {logs.map((l, i) => (
                <div key={i} style={{ fontSize: 12, color: "#999", marginBottom: '4px' }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}