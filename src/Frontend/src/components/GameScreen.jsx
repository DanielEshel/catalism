// src/Frontend/src/components/GameScreen.jsx
import React, { useState } from "react";
import GameBoard from "../GameBoard.jsx"; 
import useGameState from "../hooks/useGameState";
import { useBuildValidation } from "../hooks/useBuildValidation";
import { hasEnoughResources } from "../utils/gameRules";

// Modular Components
import BuildMenu from "./Game/BuildMenu.jsx";
import GameSidebar from "./Game/GameSidebar.jsx";
import { LobbyScreen, GameOverScreen } from "./Game/GameStatusScreen.jsx";

export default function GameScreen({ user, gameId, setView, setActiveGameId }) {
  const { game, logs, sendAction, leaveGame } = useGameState(gameId);
  const [buildMenu, setBuildMenu] = useState(null); 

  // Safely derive state
  const myPlayerState = game?.playerStates?.find(p => (p.userId._id || p.userId) === user?._id);
  const isMyTurn = game?.turn === user?._id;
  const isRobberTime = isMyTurn && game?.mustMoveRobber;
  
  const totalBuilds = game?.playerStates?.reduce((s, p) => s + p.settlements.length + p.cities.length + p.roads.length, 0) || 0;
  const isSetupPhase = totalBuilds < (game?.maxPlayers * 4); 

  const buildValidation = useBuildValidation(game, myPlayerState, buildMenu, isSetupPhase);

  // --- HANDLERS ---
  const handleQuit = () => {
    // 💡 This sends the 'quit_game' action to the backend
    sendAction("quit_game", {}); 
    leaveGame(); // Clean up socket connection
    setActiveGameId(null);
    setView("lobby");
  };

  const handleNodeClick = (nodeId, e) => { 
    if (isMyTurn && !isRobberTime) {
      setBuildMenu({ type: 'node', data: { nodeId }, x: e.clientX, y: e.clientY }); 
    }
  };

  const handleEdgeClick = (u, v, e) => { 
    if (isMyTurn && !isRobberTime) {
      setBuildMenu({ type: 'edge', data: { u, v }, x: e.clientX, y: e.clientY }); 
    }
  };

  const handleHexClick = (hexId) => { 
    if (isRobberTime) sendAction("move_robber", { hexId }); 
  };

  const confirmBuild = (actionType) => {
    const costMap = { build_settlement: 'SMALL_CAT', build_city: 'BIG_CAT', build_road: 'WORMHOLE_LANE' };
    if (!hasEnoughResources(myPlayerState, costMap[actionType], isSetupPhase)) return alert("Not enough resources!");
    
    sendAction(actionType, buildMenu.data);
    setBuildMenu(null);
  };

  // 1. ALL HOOKS FINISHED? Now we can return early for status screens
  if (!game) return <div className="container"><h2>Loading Sector...</h2></div>;
  if (game.status === "lobby") return <LobbyScreen game={game} onQuit={handleQuit} />;
  if (game.status === "finished") return <GameOverScreen game={game} onQuit={handleQuit} />;

  return (
    <div 
      style={{ display: "flex", height: "100vh", padding: "10px", gap: "10px", boxSizing: "border-box" }} 
      onClick={() => setBuildMenu(null)}
    >
      <BuildMenu buildMenu={buildMenu} {...buildValidation} onConfirm={confirmBuild} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
            <h3 style={{ margin: 0 }}>Sector: {game._id.slice(-6)}</h3>
            {/* ✨ Quit button moved to Sidebar for a cleaner look, or keep here */}
            <button onClick={handleQuit} style={{ margin: 0, padding: "4px 10px" }}>Quit</button>
        </div>

        {isRobberTime && (
          <div style={{ background: "#aa0000", color: "#fff", padding: "10px", textAlign: "center", borderRadius: "8px", marginBottom: "10px", fontWeight: "bold", border: "2px solid #ff0000" }}>
            🚨 7 ROLLED! MOVE THE ROBBER! 🚨
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
      </div>

      <GameSidebar 
        game={game} 
        user={user} 
        logs={logs} 
        isMyTurn={isMyTurn} 
        canRoll={isMyTurn && !isSetupPhase && !game.diceRolled} 
        sendAction={sendAction} 
        onQuit={handleQuit} // ✨ Pass handleQuit to sidebar
      />
    </div>
  );
}