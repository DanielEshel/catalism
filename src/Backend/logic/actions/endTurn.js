// src/Backend/logic/actions/endTurn.js
const { performAutoPlacement, getNextActivePlayer } = require("../actionHelpers");

module.exports = ({ game, player, userId, isSetupPhase, totalSettlements }) => {
  if (game.mustMoveRobber) throw new Error("You must move the Space Robber first!");

  let logMessage = "";
  let event = null;

  if (isSetupPhase) {
    if (player.settlements.length !== player.roads.length) {
      throw new Error("Finish your build (Settlement + Road) before ending turn.");
    }

    const expectedCount = totalSettlements >= game.maxPlayers ? 2 : 1;
    let autoActionData = null;

    if (player.settlements.length < expectedCount) {
      const autoResult = performAutoPlacement(game, player);
      logMessage = autoResult.message;
      autoActionData = autoResult.details;
      totalSettlements++;
    } else {
      logMessage = "Ended their turn.";
    }

    let nextPlayerIndex;
    if (totalSettlements < game.maxPlayers) {
      nextPlayerIndex = game.playerIds.indexOf(getNextActivePlayer(game, userId));
    } else {
      nextPlayerIndex = game.maxPlayers * 2 - 1 - totalSettlements;
    }

    if (nextPlayerIndex < 0) {
      game.turn = game.playerIds[0];
      game.diceRolled = false;
      logMessage += " Setup Complete. Game Begins!";
    } else {
      game.turn = game.playerIds[nextPlayerIndex];
    }

    event = {
      type: "TURN_CHANGED",
      payload: { newTurnUserId: game.turn, isSetupPhase: true, autoAction: autoActionData }
    };
  } else {
    const currentIdx = game.playerIds.findIndex(id => id.toString() === userId);
    game.turn = game.playerIds[(currentIdx + 1) % game.playerIds.length];
    game.diceRolled = false;
    logMessage = "Ended their turn.";

    event = {
      type: "TURN_CHANGED",
      payload: { newTurnUserId: game.turn, isSetupPhase: false }
    };
  }

  return { logMessage, event };
};