// src/Backend/logic/actions/rollDice.js
const { distributeResources } = require("../actionHelpers");

module.exports = ({ game, userId, isSetupPhase }) => {
  if (isSetupPhase) throw new Error("Cannot roll dice during setup phase.");
  if (game.diceRolled) throw new Error("Dice already rolled this turn.");

  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const sum = d1 + d2;

  game.diceRolled = true;

  if (sum === 7) {
    game.mustMoveRobber = true;
    return {
      logMessage: `Rolled a 7! The Space Robber is on the move!`,
      event: { type: "ROBBER_ACTIVATED", payload: { userId } }
    };
  } else {
    const gains = distributeResources(game, sum);
    return {
      logMessage: `Rolled a ${sum} (${d1} + ${d2}).`,
      event: { type: "DICE_ROLLED", payload: { number: sum, dice: [d1, d2], gains } }
    };
  }
};