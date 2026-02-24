// src/Frontend/src/components/GameScreen.jsx
import React, { useState } from "react";
import GameBoard from "../GameBoard";
import useGameState from "../hooks/useGameState";

// ✨ Import our shared, isomorphic game rules!
import { hasEnoughResources, checkSettlementSpacing, checkRoadAdjacency } from "../utils/gameRules";


// Small UI Helper for displaying the player's resource hand
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
  const [buildMenu, setBuildMenu] = useState(null); 

  const handleQuit = () => {
    leaveGame();
    sessionStorage.setItem("justQuitGameId", gameId);
    setActiveGameId(null);
    setView("lobby");
  };

  if (!game) return <div className="container"><h2>Loading Sector Data...</h2></div>;

  // --- LOBBY WAITING SCREEN ---
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

  // --- GAME OVER SCREEN ---
  if (game.status === "finished") {
    const winner = [...game.playerStates].sort((a, b) => b.victoryPoints - a.victoryPoints)[0];
    const winnerName = winner?.userId?.displayName || "Unknown";
    return (
        <div className="container" style={{ marginTop: "10vh" }}>
            <div className="panel" style={{ textAlign: "center", padding: "50px", border: "2px solid #00ff00" }}>
                <h1 className="ansi-yellow" style={{ fontSize: "40px", margin: "0 0 20px 0" }}>🏆 SECTOR CLOSED 🏆</h1>
                <h2 style={{ color: "#eee" }}>{winnerName} has won the game!</h2>
                <div style={{ marginTop: "40px" }}>
                    <button onClick={handleQuit} style={{ fontSize: "18px", padding: "10px 20px" }}>Return to Lobby</button>
                </div>
            </div>
        </div>
    );
  }

  // --- GAME STATE VARIABLES ---
  const isMyTurn = game?.turn === user?._id;
  const myPlayerState = game.playerStates.find(p => (p.userId._id || p.userId) === user?._id);
  const totalSettlements = game.playerStates.reduce((sum, p) => sum + p.settlements.length + p.cities.length, 0);
  const totalRoads = game.playerStates.reduce((sum, p) => sum + p.roads.length, 0);
  
  const isSetupPhase = totalSettlements < game.maxPlayers * 2 || totalRoads < game.maxPlayers * 2;
  const canRoll = isMyTurn && !isSetupPhase && !game.diceRolled;
  const isRobberTime = isMyTurn && game.mustMoveRobber;

  // --- CLICK HANDLERS (Opens menu instead of auto-building) ---
  const handleNodeClick = (nodeId, e) => {
    if (!isMyTurn || isRobberTime) return;
    setBuildMenu({ type: 'node', data: { nodeId }, x: e.clientX, y: e.clientY });
  };

  const handleEdgeClick = (u, v, e) => {
    if (!isMyTurn || isRobberTime) return;
    setBuildMenu({ type: 'edge', data: { u, v }, x: e.clientX, y: e.clientY });
  };

  const handleHexClick = (hexId) => {
    if (!isRobberTime) return;
    sendAction("move_robber", { hexId });
  };

  // --- MENU CONFIRMATION LOGIC (Optimistic Frontend Validation) ---
  const confirmBuild = (actionType) => {
    if (!buildMenu) return;
    
    // Check rules using our imported shared logic
    if (actionType === 'build_settlement') {
        if (!hasEnoughResources(myPlayerState, 'SMALL_CAT', isSetupPhase)) return alert("Not enough resources!");
        if (!checkSettlementSpacing(buildMenu.data.nodeId, game)) return alert("Node is too close to another settlement!");
        if (!isSetupPhase) {
            const hasRoad = myPlayerState.roads.some(r => r.split("-").map(Number).includes(buildMenu.data.nodeId));
            if (!hasRoad) return alert("Must connect to your road network!");
        }
    }
    
    if (actionType === 'build_city') {
        if (!hasEnoughResources(myPlayerState, 'BIG_CAT')) return alert("Not enough resources!");
        if (!myPlayerState.settlements.includes(buildMenu.data.nodeId)) return alert("You must build a settlement here first!");
        if (isSetupPhase) return alert("Cannot build cities during setup!");
    }

    if (actionType === 'build_road') {
        if (!hasEnoughResources(myPlayerState, 'WORMHOLE_LANE', isSetupPhase)) return alert("Not enough resources!");
        if ((myPlayerState.roads.length > 0 || myPlayerState.settlements.length > 0) && !checkRoadAdjacency(buildMenu.data.u, buildMenu.data.v, myPlayerState)) {
            return alert("Must connect to your existing network!");
        }
    }

    // All frontend checks passed! Send action to backend and close the menu
    sendAction(actionType, buildMenu.data);
    setBuildMenu(null);
  };

  const currentTurnPlayerName = game.playerStates.find(p => (p.userId._id || p.userId) === game.turn)?.userId?.displayName || "Unknown";

  return (
    <div style={{ display: "flex", height: "100vh", padding: "10px", gap: "10px", boxSizing: "border-box", maxWidth: "100vw" }} onClick={() => setBuildMenu(null)}>
      
      {/* ✨ FLOATING BUILD MENU */}
      {buildMenu && (
        <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ position: 'fixed', left: buildMenu.x + 15, top: buildMenu.y - 30, zIndex: 9999, background: '#111', border: '2px solid #00ff00', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0px 0px 15px rgba(0,255,0,0.3)' }}
        >
            <h4 style={{ margin: '0 0 5px 0', color: '#eee', fontSize: '13px', textAlign: 'center' }}>Construction</h4>
            
            {buildMenu.type === 'node' && (
                <>
                    <button onClick={() => confirmBuild('build_settlement')} style={{ fontSize: '12px', padding: '6px' }}>🏠 Build Colony</button>
                    <button onClick={() => confirmBuild('build_city')} style={{ fontSize: '12px', padding: '6px' }}>🏙️ Upgrade to City</button>
                </>
            )}
            
            {buildMenu.type === 'edge' && (
                <button onClick={() => confirmBuild('build_road')} style={{ fontSize: '12px', padding: '6px' }}>🛣️ Build Lane</button>
            )}

            <button onClick={() => setBuildMenu(null)} style={{ fontSize: '11px', padding: '4px', background: '#550000', color: '#fff', marginTop: '4px' }}>Cancel</button>
        </div>
      )}

      {/* LEFT: BOARD AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
            <h3 style={{ margin: 0 }}>Sector: {game._id.slice(-6)}</h3>
            <button onClick={handleQuit} style={{ margin: 0, padding: "4px 10px" }}>Quit Game</button>
        </div>

        {isRobberTime && (
            <div style={{ background: "#aa0000", color: "#fff", padding: "10px", textAlign: "center", borderRadius: "8px", marginBottom: "10px", fontWeight: "bold", border: "2px solid #ff0000", animation: "pulse 1.5s infinite" }}>
                🚨 7 ROLLED! CLICK A HEX TO MOVE THE ROBBER! 🚨
            </div>
        )}
        
        <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "#05050a", border: "2px solid #333", borderRadius: "8px", padding: "10px", overflow: "hidden" }}>
            <GameBoard 
                game={game} 
                user={user} 
                onNodeClick={isRobberTime ? null : handleNodeClick} 
                onEdgeClick={isRobberTime ? null : handleEdgeClick} 
                onHexClick={isRobberTime ? handleHexClick : null}
            />
        </div>

        <div style={{ textAlign: "center", marginTop: "5px", color: "#666", fontSize: "13px" }}>
            💡 <i>Click nodes and lines to open the construction menu.</i>
        </div>
      </div>

      {/* RIGHT: SIDEBAR */}
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