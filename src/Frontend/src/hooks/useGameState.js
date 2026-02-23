import { useState, useRef, useCallback, useEffect } from 'react';
import comms from '../api/commsController';

export default function useGameState(gameId) {
  const [game, setGame] = useState(null);
  const [logs, setLogs] = useState([]);

  // Use a ref to access the latest game state inside socket callbacks
  const gameRef = useRef(null);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const addLog = useCallback((msg) => {
    setLogs((prev) => [...prev.slice(-5), msg]);
  }, []);

  useEffect(() => {
    if (!gameId) return;

    comms.connectSocket(gameId, {
      onConnect: (id) => {
        addLog("Connected to Sector " + id.slice(-4));
      },
      onGamePulse: (g) => {
        setGame(g);
      },
      onActionLog: (data) => {
        const currentGame = gameRef.current;
        const player = currentGame?.playerStates?.find(
          (p) => (p.userId._id || p.userId) === data.userId
        );
        const name = player?.userId?.displayName || data.userId.slice(-4);
        addLog(`${name}: ${data.message}`);
      },
      onGameEvent: (evt) => {
        if (evt.type === "DICE_ROLLED") {
          const { number, dice, gains } = evt.payload;
          addLog(`🎲 Rolled ${number} (${dice.join("+")})`);

          Object.entries(gains).forEach(([pId, resObj]) => {
            const currentGame = gameRef.current;
            const pName =
              currentGame?.playerStates?.find(
                (p) => (p.userId._id || p.userId) === pId
              )?.userId?.displayName || "Unknown";
            const gained = Object.keys(resObj).join(", ");
            addLog(`   -> ${pName} got ${gained}`);
          });
        }
      },
      onError: (err) => alert("Socket Error: " + err.message),
    });

    // Clean up the socket connection when the component unmounts
    return () => {
      comms.disconnectSocket();
    };
  }, [gameId, addLog]);

  const sendAction = (type, payload = {}) => {
    if (gameRef.current) {
      comms.sendAction(gameRef.current._id, type, payload);
    }
  };

  const leaveGame = () => {
    if (gameRef.current) {
      comms.sendQuit(gameRef.current._id);
    }
  };

  return { game, logs, sendAction, leaveGame };
}