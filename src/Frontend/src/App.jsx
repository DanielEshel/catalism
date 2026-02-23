import React, { useState } from "react";
import comms from "./api/commsController";
import AuthScreen from "./components/AuthScreen";
import LobbyScreen from "./components/LobbyScreen";
import GameScreen from "./components/GameScreen";

export default function App() {
  // 1. Lazy Initialize User
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  // 2. Lazy Initialize View based on User
  const [view, setView] = useState(() => {
    return localStorage.getItem("user") ? "lobby" : "auth";
  });

  const [activeGameId, setActiveGameId] = useState(null);

  const logout = async () => {
    try {
      await comms.logout();
    } catch (e) {
      console.error("Logout error", e);
    }
    localStorage.removeItem("user");
    setUser(null);
    setActiveGameId(null);
    setView("auth");
  };

  if (view === "auth") {
    return <AuthScreen setUser={setUser} setView={setView} />;
  }

  if (view === "lobby") {
    return (
      <LobbyScreen 
        user={user} 
        setView={setView} 
        setActiveGameId={setActiveGameId}
        logout={logout} 
      />
    );
  }

  if (view === "game") {
    return (
      <GameScreen 
        user={user} 
        gameId={activeGameId}
        setView={setView} 
        setActiveGameId={setActiveGameId}
      />
    );
  }

  return null;
}