import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import io from "socket.io-client";
import GameBoard from "./GameBoard";

const API = "/api";

// --- HELPER: RESOURCE CARD RENDERER ---
const ResourceList = ({ resources, count }) => {
  // Case 1: Opponent (Hidden Hand)
  // The backend sends 'resources: null' and 'resourceCount: N' for opponents
  if (!resources) {
    if (!count || count === 0)
      return (
        <span style={{ fontSize: "10px", color: "#666" }}>Empty Hand</span>
      );
    return (
      <span style={{ fontSize: "11px", color: "#888", fontStyle: "italic" }}>
        Hidden Hand ({count}) 🎴
      </span>
    );
  }

  // Case 2: Me (Visible Hand)
  const map = {
    carbonFiber: "Fiber",
    spaceCrystal: "Crystal",
    catnip: "Nip",
    mice: "Mice",
    cosmicMilk: "Milk",
  };

  const items = Object.entries(resources).filter(([_, amt]) => amt > 0);
  if (items.length === 0)
    return <span style={{ fontSize: "10px", color: "#666" }}>Empty Hand</span>;

  return (
    <div
      style={{
        fontSize: "11px",
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
      }}
    >
      {items.map(([key, amount]) => (
        <span
          key={key}
          style={{
            border: "1px solid #444",
            padding: "1px 3px",
            borderRadius: "3px",
            background: "#222",
            color: "#eee",
          }}
        >
          {map[key] || key}: {amount}
        </span>
      ))}
    </div>
  );
};

export default function App() {
  // --- STATE ---
  // Lazy init: Read storage ONCE when app loads to prevent race conditions
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  // Start in 'lobby' if token exists, otherwise 'auth'
  const [view, setView] = useState(() =>
    localStorage.getItem("token") ? "lobby" : "auth",
  );

  // Data State
  const [lobbyGames, setLobbyGames] = useState([]);
  const [game, setGame] = useState(null);
  const [logs, setLogs] = useState([]);

  // Inputs
  const [email, setEmail] = useState("captain@cat.com");
  const [pass, setPass] = useState("password123");
  const [displayName, setDisplayName] = useState("");
  const [newGamePlayers, setNewGamePlayers] = useState(4);
  const [buildInput, setBuildInput] = useState("");
  const [roadU, setRoadU] = useState("");
  const [roadV, setRoadV] = useState("");

  const socketRef = useRef(null);

  // --- ACTIONS ---

  const addLog = useCallback((msg) => {
    setLogs((prev) => [...prev.slice(-5), msg]); // Keep last 5 logs
  }, []);

  const connectSocket = useCallback(
    (gameId, authToken) => {
      if (socketRef.current) socketRef.current.disconnect();

      // Always use the authToken passed to ensure it's fresh
      const socket = io("/", { auth: { token: authToken } });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join_game", { gameId });
        setView("game");
        addLog("Connected to Sector " + gameId.slice(-4));
      });

      // 1. SYNC: Full Game State Update (The Pulse)
      socket.on("game_pulse", (g) => {
        console.log("📥 State Sync Received");
        setGame(g);
      });

      // 2. LOGS: Chat/Action History
      socket.on("action_log", (data) => {
        // data: { userId, message, timestamp }
        // Attempt to find display name from game state if possible, else use ID
        const player = game?.playerStates?.find(
          (p) => (p.userId._id || p.userId) === data.userId,
        );
        const name = player?.userId?.displayName || data.userId.slice(-4);

        addLog(`${name}: ${data.message}`);
      });

      // 3. EVENTS: Animations / Alerts
      socket.on("game_event", (evt) => {
        console.log("🔔 Event:", evt.type);
        if (evt.type === "DICE_ROLLED") {
          const { number, dice, gains } = evt.payload;
          addLog(`🎲 Rolled ${number} (${dice.join("+")})`);

          // Optional: Show who got what in the log
          Object.entries(gains).forEach(([pId, resObj]) => {
            const pName =
              game?.playerStates?.find(
                (p) => (p.userId._id || p.userId) === pId,
              )?.userId?.displayName || "Someone";
            const gained = Object.keys(resObj).join(", ");
            addLog(`   -> ${pName} got ${gained}`);
          });
        }
      });

      socket.on("error", (err) => alert("Socket Error: " + err.message));
    },
    [addLog, game],
  ); // 'game' dep allows name lookup in logs

  const joinGame = useCallback(
    async (gameId, authToken = token) => {
      if (!authToken) return;
      try {
        await axios.post(
          `${API}/games/join`,
          { gameId },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );
        connectSocket(gameId, authToken);
      } catch (e) {
        alert(e.response?.data?.error || "Join failed");
      }
    },
    [token, connectSocket],
  );

  const fetchLobby = useCallback(
    async (authToken = token) => {
      if (!authToken) return;

      try {
        const res = await axios.get(`${API}/games/list`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        setLobbyGames(res.data.games);

        if (res.data.activeGameId) {
          console.log("Found active game. Joining directly...");
          joinGame(res.data.activeGameId, authToken);
        }
      } catch (e) {
        console.error("Lobby Fetch Failed:", e);
        if (e.response && e.response.status === 401) {
          localStorage.clear();
          setToken(null);
          setUser(null);
          setView("auth");
          if (socketRef.current) socketRef.current.disconnect();
        }
      }
    },
    [token, joinGame],
  );

  const auth = async (endpoint) => {
    try {
      const payload = { email, password: pass };
      if (endpoint === "register") {
        if (!displayName) return alert("Display Name required!");
        payload.displayName = displayName;
      }

      const res = await axios.post(`${API}/users/${endpoint}`, payload);

      const newToken = res.data.token;
      const newUser = { _id: res.data._id, displayName: res.data.displayName };

      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
      setView("lobby");

      fetchLobby(newToken);
    } catch (e) {
      alert(e.response?.data?.error || "Auth failed");
    }
  };

  const createGame = async () => {
    if (!token) return alert("Not authenticated");
    try {
      await axios.post(
        `${API}/games/create`,
        { maxPlayers: Number(newGamePlayers) },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchLobby(token);
    } catch (e) {
      alert(e.response?.data?.error || "Create Failed");
    }
  };

  const sendAction = (type, payload = {}) => {
    if (socketRef.current && game) {
      console.log("➡️ Sending:", type, payload);
      socketRef.current.emit("game_action", {
        gameId: game._id,
        actionType: type,
        payload,
      });
    }
  };

  const leaveGame = () => {
    if (socketRef.current) {
      // 1. Send Quit Action
      console.log("Sending Quit...");
      socketRef.current.emit("game_action", {
        gameId: game._id,
        actionType: "quit_game",
        payload: {},
      });

      // 2. Disconnect Socket
      socketRef.current.disconnect();
    }

    // 3. Reset Local State
    setGame(null);
    setView("lobby");

    // 4. Refresh Lobby (so we can join other games)
    fetchLobby(token);
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setView("auth");
    if (socketRef.current) socketRef.current.disconnect();
  };

  // Initial Load (F5 Refresh Handler)
  useEffect(() => {
    if (token) {
      fetchLobby(token);
    }
  }, []);

  // --- HELPERS ---
  const isMyTurn = game?.turn === user?._id;

  const totalSettlements =
    game?.playerStates?.reduce(
      (sum, p) => sum + p.settlements.length + p.cities.length,
      0,
    ) || 0;
  const isSetupPhase = game && totalSettlements < game.maxPlayers * 2;
  const canRoll = isMyTurn && !isSetupPhase && !game?.diceRolled;

  // --- RENDERERS ---

  if (view === "auth")
    return (
      <div className="container">
        <h1>🚀 CATALISM LOGIN</h1>
        <div className="panel">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display Name (Register Only)"
            style={{ marginBottom: "10px", width: "100%" }}
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              style={{ flex: 1 }}
            />
            <input
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              type="password"
              placeholder="Password"
              style={{ flex: 1 }}
            />
          </div>
          <br />
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={{ flex: 1 }} onClick={() => auth("login")}>
              Login
            </button>
            <button
              style={{ flex: 1, background: "#444400" }}
              onClick={() => auth("register")}
            >
              Register
            </button>
          </div>
        </div>
      </div>
    );

  if (view === "lobby")
    return (
      <div className="container">
        <div className="row">
          <h1>🌌 MISSION CONTROL</h1>
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
          <button
            onClick={() => fetchLobby(token)}
            style={{ marginLeft: "auto" }}
          >
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

  return (
    <div className="container">
      <div className="row">
        <h3>Sector: {game?._id ? game._id.slice(-6) : "..."}</h3>
        <button onClick={leaveGame}>Quit Game</button>
      </div>

      {game?.status === "lobby" && (
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <h2>⏳ WAITING FOR PILOTS...</h2>
          <p style={{ fontSize: "20px" }}>
            {game.playerStates.length} / {game.maxPlayers} Players Joined
          </p>
        </div>
      )}

      {game?.status !== "lobby" && (
        <div className="flex" style={{ alignItems: "flex-start" }}>
          {/* LEFT: BOARD */}
          <div>
            <GameBoard game={game} />
          </div>

          {/* MIDDLE: PILOTS PANEL */}
          <div style={{ minWidth: "220px", marginRight: "10px" }}>
            <div className="panel">
              <h4>🚀 Pilots</h4>
              {game?.playerStates.map((p) => {
                // 1. Resolve Identity
                // userId is populated now: { _id: "...", displayName: "..." }
                const pId = p.userId._id || p.userId;
                const pName = p.userId.displayName || "Unknown";
                const isMe = pId === user?._id;

                return (
                  <div
                    key={pId}
                    style={{
                      marginBottom: "8px",
                      padding: "6px",
                      border: isMe ? "1px solid #00ff00" : "1px solid #444",
                      background: game.turn === pId ? "#333" : "transparent",
                      boxShadow: game.turn === pId ? "0 0 5px #555" : "none",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        color: isMe ? "#00ff00" : "#ccc",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        {pName} {isMe && "(You)"}
                      </span>
                      {game.turn === pId && (
                        <span style={{ color: "gold" }}>◀ TURN</span>
                      )}
                    </div>

                    <div style={{ fontSize: "12px", color: "#aaa" }}>
                      VP: {p.victoryPoints} | Roads: {p.roads.length}
                    </div>

                    <div
                      style={{
                        marginTop: "4px",
                        borderTop: "1px dashed #444",
                        paddingTop: "4px",
                      }}
                    >
                      {/* 2. Show Resources (Full list for me, Count for them) */}
                      <ResourceList
                        resources={p.resources}
                        count={p.resourceCount}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: CONTROLS */}
          <div style={{ minWidth: "250px" }}>
            <div className="panel">
              <h4>Status Report</h4>
              <div style={{ marginBottom: "10px" }}>
                Phase:{" "}
                <span className="ansi-yellow ansi-bold">
                  {isSetupPhase ? "SETUP (Free Build)" : "NORMAL OPERATIONS"}
                </span>
              </div>
              <div>
                Turn:{" "}
                {isMyTurn ? (
                  <span className="ansi-green ansi-bold">YOUR TURN</span>
                ) : (
                  "Waiting..."
                )}
              </div>
              <div>
                Dice:{" "}
                {game?.diceRolled ? (
                  <span className="ansi-yellow">Rolled</span>
                ) : (
                  "Waiting to Roll"
                )}
              </div>
            </div>

            <div className="panel">
              <h4>Actions</h4>
              <div className="flex">
                <button
                  onClick={() => sendAction("roll_dice")}
                  disabled={!canRoll}
                  style={{ opacity: !canRoll ? 0.5 : 1 }}
                >
                  🎲 Roll
                </button>
                <button
                  onClick={() => sendAction("end_turn")}
                  disabled={!isMyTurn}
                  style={{ opacity: !isMyTurn ? 0.5 : 1 }}
                >
                  End Turn
                </button>
              </div>
            </div>

            <div className="panel">
              <h4>Construction {isSetupPhase && "(FREE)"}</h4>
              <div className="flex">
                <input
                  placeholder="Node ID"
                  style={{ width: 50 }}
                  value={buildInput}
                  onChange={(e) => setBuildInput(e.target.value)}
                />
                <button
                  onClick={() =>
                    sendAction("build_settlement", { nodeId: buildInput })
                  }
                  disabled={!isMyTurn}
                >
                  🏠 Set.
                </button>
                <button
                  onClick={() =>
                    sendAction("build_city", { nodeId: buildInput })
                  }
                  disabled={!isMyTurn || isSetupPhase}
                >
                  🏙 City
                </button>
              </div>
              <div className="flex" style={{ marginTop: 10 }}>
                <input
                  placeholder="u"
                  style={{ width: 40 }}
                  value={roadU}
                  onChange={(e) => setRoadU(e.target.value)}
                />
                <input
                  placeholder="v"
                  style={{ width: 40 }}
                  value={roadV}
                  onChange={(e) => setRoadV(e.target.value)}
                />
                <button
                  onClick={() =>
                    sendAction("build_road", { u: roadU, v: roadV })
                  }
                  disabled={!isMyTurn}
                >
                  🛣 Road
                </button>
              </div>
            </div>

            <div className="panel">
              <h4>Log</h4>
              {logs.map((l, i) => (
                <div key={i} style={{ fontSize: 12, color: "#999" }}>
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
