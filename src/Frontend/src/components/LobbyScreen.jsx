import React, { useState, useEffect } from "react";
import comms from "../api/commsController";

export default function LobbyScreen({ user, setView, setActiveGameId, logout }) {
  const [lobbyGames, setLobbyGames] = useState([]);
  const [newGamePlayers, setNewGamePlayers] = useState(4);

  // 1. A standalone fetch function that we can call on mount AND on button clicks
  const fetchLobby = async () => {
    try {
      const data = await comms.fetchLobby();
      setLobbyGames(data.games);
      return data;
    } catch (e) {
      console.error("Lobby Fetch Failed:", e);
      if (e.response && e.response.status === 401) {
        logout();
      }
      return null;
    }
  };

  // 2. The mount effect
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const data = await fetchLobby();
      
      // If we found an active game, we need to switch to the GameScreen.
      if (isMounted && data && data.activeGameId) {
        // ✨ THE FIX: Check if the server is trying to pull us back into the game we JUST quit
        const recentlyQuitId = sessionStorage.getItem("justQuitGameId");

        if (data.activeGameId === recentlyQuitId) {
           console.log("Ignoring stale auto-join for recently quit game.");
           // Clear the tag so they can manually rejoin later if they want to
           sessionStorage.removeItem("justQuitGameId"); 
           return; 
        }

        setTimeout(() => {
          if (isMounted) {
            setActiveGameId(data.activeGameId);
            setView("game");
          }
        }, 0);
      }
    };

    init();

    // Cleanup function: If the component unmounts before the fetch finishes, 
    // we ignore the result so we don't accidentally update unmounted state.
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const createGame = async () => {
    try {
      // 1. Capture the response from the server (which contains the new game's data)
      const newGame = await comms.createGame(Number(newGamePlayers));
      
      // ✨ THE FIX: Instantly set the active game ID to the one we just created and switch views!
      setActiveGameId(newGame._id);
      setView("game");

    } catch (e) {
      alert(e.response?.data?.error || "Create Failed");
    }
  };

  const joinGame = async (gameId) => {
    try {
      await comms.joinGame(gameId);
      setActiveGameId(gameId);
      setView("game");
    } catch (e) {
      alert(e.response?.data?.error || "Join failed");
    }
  };

  return (
    <div className="container">
      <div className="row">
        <h1>Welcome, {user?.displayName || "Anonymous"}!</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <div className="panel flex">
        <span>Max Pilots:</span>
        <input
          type="number"
          min="2"
          max="4"
          value={newGamePlayers}
          onChange={(e) => setNewGamePlayers(e.target.value)}
          style={{ width: "50px" }}
        />
        <button onClick={createGame}>+ Create New Sector</button>
        <button onClick={fetchLobby} style={{ marginLeft: "auto" }}>
          Refresh Scan
        </button>
      </div>

      {lobbyGames.map((g) => (
        <div key={g._id} className="panel row">
          <span>
            Sector {g._id.slice(-6)} | Players: {g.playerStates?.length || 0}/
            {g.maxPlayers} |
            <span
              className={
                g.status === "in-progress" ? "ansi-green" : "ansi-yellow"
              }
            >
              {" "}
              {g.status}
            </span>
          </span>
          <button onClick={() => joinGame(g._id)}>Join</button>
        </div>
      ))}
    </div>
  );
}