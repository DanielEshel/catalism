// src/Backend/logic/actions/quitGame.js
const { getNextActivePlayer } = require("../actionHelpers");

module.exports = ({ game, player, userId }) => {
  if (player.hasQuit) throw new Error("Already quit.");

  let logMessage = "";
  let event = null;

  if (game.status === "lobby") {
    game.playerIds = game.playerIds.filter(id => id.toString() !== userId);
    game.playerStates = game.playerStates.filter(p => p.userId.toString() !== userId);

    logMessage = `A pilot left the lobby.`;

    if (game.playerIds.length === 0) {
      game.status = "finished";
      logMessage = "Lobby is empty. Sector closed.";
    }
  } else {
    player.hasQuit = true;
    player.resources = { carbonFiber: 0, spaceCrystal: 0, mice: 0, catnip: 0, cosmicMilk: 0 };
    player.victoryPoints = 0;

    game.playerIds = game.playerIds.filter(id => id.toString() !== userId);

    logMessage = `A pilot abandoned the mission.`;

    const activeSurvivors = game.playerStates.filter(p => !p.hasQuit);

    if (activeSurvivors.length <= 1) {
      game.status = "finished";
      const winner = activeSurvivors[0] || player;
      event = {
        type: "GAME_OVER",
        payload: { winnerId: winner.userId, reason: "Last Pilot Standing" }
      };
    } else if (game.turn && game.turn.toString() === userId) {
      try {
        const nextId = getNextActivePlayer(game, userId);
        if (nextId) {
          game.turn = nextId;
          game.diceRolled = false;
          event = { type: "TURN_CHANGED", payload: { newTurnUserId: game.turn } };
        }
      } catch (e) {
        console.error("Failed to pass turn during quit:", e);
        game.turn = activeSurvivors[0].userId;
      }
    }
  }

  return { logMessage, event };
};