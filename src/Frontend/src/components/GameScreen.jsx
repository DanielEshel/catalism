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
    
    if (myPlayerState.settlements.includes(nodeId)) {
        if (!isSetupPhase) {
            sendAction("build_city", { nodeId });
        } else {
            alert("Cannot build cities during the setup phase!");
        }
    } else {
        sendAction("build_settlement", { nodeId });
    }
  };

  const handleEdgeClick = (u, v) => {
    if (!isMyTurn) return;
    sendAction("build_road", { u, v });
  };

  // Find whose turn it currently is for the UI display
  const currentTurnPlayerName = game.playerStates.find(p => (p.userId._id || p.userId) === game.turn)?.userId?.displayName || "Unknown";

  if (game.status === "lobby") {
    return (
        <div className="container">
            <div className="row">
                <h3>Sector: {game._id.slice(-6)}</h3>
                <button onClick={handleQuit}>Quit Game</button>
            </div>
            <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
                <h2>⏳ WAITING FOR PILOTS...</h2>
                <p style={{ fontSize: "20px" }}>{game.playerStates.length} / {game.maxPlayers} Players Joined</p>
            </div>
        </div>
    );
  }

  if (game.status === "finished") {
    // Find who won (either the last survivor, or whoever has 10 points)
    const winner = [...game.playerStates].sort((a, b) => b.victoryPoints - a.victoryPoints)[0];
    const winnerName = winner?.userId?.displayName || "Unknown";

    return (
        <div className="container" style={{ marginTop: "10vh" }}>
            <div className="panel" style={{ textAlign: "center", padding: "50px", border: "2px solid #00ff00" }}>
                <h1 className="ansi-yellow" style={{ fontSize: "40px", margin: "0 0 20px 0" }}>🏆 SECTOR CLOSED 🏆</h1>
                <h2 style={{ color: "#eee" }}>{winnerName} has won the game!</h2>
                
                <div style={{ marginTop: "40px" }}>
                    <button onClick={handleQuit} style={{ fontSize: "18px", padding: "10px 20px" }}>
                        Return to Lobby
                    </button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", padding: "10px", gap: "10px", boxSizing: "border-box", maxWidth: "100vw" }}>
      
      {/* LEFT: MASSIVE BOARD AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
            <h3 style={{ margin: 0 }}>Sector: {game._id.slice(-6)}</h3>
            <button onClick={handleQuit} style={{ margin: 0, padding: "4px 10px" }}>Quit Game</button>
        </div>
        
        {/* Scalable SVG Container (Padding reduced to make board bigger) */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", background: "#05050a", border: "2px solid #333", borderRadius: "8px", padding: "5px", overflow: "hidden" }}>
            <GameBoard 
                game={game} 
                user={user} 
                onNodeClick={handleNodeClick} 
                onEdgeClick={handleEdgeClick} 
            />
        </div>

        {/* Board Help Text */}
        <div style={{ textAlign: "center", marginTop: "5px", color: "#666", fontSize: "13px" }}>
            💡 <i>Click empty nodes to build Settlements. Click your existing Settlements to upgrade to Cities. Click lines to build Roads.</i>
        </div>
      </div>

      {/* RIGHT: COMPACT SIDEBAR COLUMN (Width reduced to give board more space) */}
      <div style={{ width: "260px", display: "flex", flexDirection: "column", gap: "10px", overflowY: "hidden" }}>
        
        {/* 1. Command Center (Actions) */}
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

        {/* 2. Comms Log (Flex 1 to stretch, pushing players to the bottom) */}
        <div className="panel" style={{ padding: "12px", margin: 0, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <h4 style={{ margin: "0 0 10px 0" }}>Comms Log</h4>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {logs.map((l, i) => (
              <div key={i} style={{ fontSize: 12, color: "#aaa", marginBottom: '6px', lineHeight: "1.3" }}>{l}</div>
            ))}
          </div>
        </div>

        {/* 3. Pilots & Turn Status (Bottom Anchored) */}
        <div className="panel" style={{ padding: "12px", margin: 0 }}>
          <h4 style={{ margin: "0 0 10px 0" }}>Pilots & Status</h4>
          
          {/* Turn Indicator Banner */}
          <div style={{ marginBottom: "10px", padding: "8px", background: isMyTurn ? "#003300" : "#222", border: isMyTurn ? "1px solid #00ff00" : "1px solid #444", borderRadius: "4px", textAlign: "center", fontWeight: "bold", fontSize: "13px" }}>
             {isMyTurn ? <span className="ansi-green">IT IS YOUR TURN</span> : <span style={{ color: "#aaa" }}>Waiting on {currentTurnPlayerName}...</span>}
          </div>

          {/* Player Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", maxHeight: "350px" }}>
            {game.playerStates.map((p) => {
              const pId = p.userId._id || p.userId;
              const pName = p.userId.displayName || "Unknown";
              const isMe = pId === user?._id;
              const isTheirTurn = game.turn === pId;

              return (
                <div key={pId} style={{ padding: "8px", borderRadius: "4px", border: isTheirTurn ? "2px solid gold" : (isMe ? "1px solid #00ff00" : "1px solid #444"), background: isTheirTurn ? "#333" : "transparent" }}>
                  <div style={{ fontWeight: "bold", color: isMe ? "#00ff00" : "#ccc", display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "13px" }}>
                    <span>{pName} {isMe && "(You)"}</span>
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
    </div>
  );
}