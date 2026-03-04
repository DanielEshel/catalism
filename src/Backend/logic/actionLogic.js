// src/Backend/logic/actionLogic.js
const { Game, Action } = require("../models/Schemas");

// Import the modular actions
const buildSettlement = require("./actions/buildSettlement");
const buildRoad = require("./actions/buildRoad");
const buildCity = require("./actions/buildCity");
const rollDice = require("./actions/rollDice");
const moveRobber = require("./actions/moveRobber");
const endTurn = require("./actions/endTurn");
const quitGame = require("./actions/quitGame");
const discardCards = require("./actions/discardCards");
const ACTIONS_REQUIRING_TURN = new Set(["build_road", "build_settlement", "build_city", "end_turn", "buy_dev_card", "trade_bank", "play_dev_card", "move_robber", "roll_dice"]);
const ACTIONS_REQUIRING_ROLL = new Set(["build_road", "build_settlement", "build_city", "end_turn", "buy_dev_card", "trade_bank", "trade_offer"]);

const processAction = async (gameId, userId, actionType, payload) => {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Game not found");

  const player = game.playerStates.find((p) => p.userId.toString() === userId);
  if (!player) throw new Error("Player not found.");

  // ✨ THE GATEKEEPER: Is the game frozen waiting for discards?
    if (game.pendingDiscards && game.pendingDiscards.length > 0) {
        if (actionType !== 'discard_cards') {
            throw new Error("Action blocked: Waiting for players to discard cards.");
        }
    }

  const lastAction = await Action.findOne({ gameId }).sort({ actionNum: -1 });

  // Baseline Validation
  if (ACTIONS_REQUIRING_TURN.has(actionType) && game.turn?.toString() !== userId) throw new Error(`Not your turn!`);

  let totalSettlements = game.playerStates.reduce((sum, p) => sum + p.settlements.length + p.cities.length, 0);
  let totalRoads = game.playerStates.reduce((sum, p) => sum + p.roads.length, 0);
  const isSetupPhase = totalSettlements < game.maxPlayers * 2 || totalRoads < game.maxPlayers * 2;

  if (!isSetupPhase && ACTIONS_REQUIRING_ROLL.has(actionType) && !game.diceRolled) {
    throw new Error("You must roll the dice first!");
  }

  // Combine context to pass to our modular actions
  const context = { game, player, userId, payload, isSetupPhase, totalSettlements, lastAction};
  let result = { logMessage: "", event: null };

  // THE DISPATCHER
  switch (actionType) {
    case "roll_dice":        result = rollDice(context); break;
    case "move_robber":      result = moveRobber(context); break;
    case "build_settlement": result = buildSettlement(context); break;
    case "build_road":       result = buildRoad(context); break;
    case "build_city":       result = buildCity(context); break;
    case "end_turn":         result = endTurn(context); break;
    case "quit_game":        result = quitGame(context); break;
    case "discard_cards":    result = discardCards(context); break;
    default: throw new Error("Unknown action type.");
  }

  // Handle standard victory condition
  if (player.victoryPoints >= 10) {
    game.status = "finished";
    result.event = { type: "GAME_OVER", payload: { winnerId: userId, score: player.victoryPoints } };
  }

  // Force Mongoose to recognize array modifications (crucial for quit_game)
  game.markModified('playerIds');
  game.markModified('playerStates');
  game.markModified('pendingDiscards'); // ✨ Added to ensure array deletion saves
  await game.save();

  // Audit Log
  const nextNum = lastAction ? lastAction.actionNum + 1 : 1;
  await Action.create({ gameId, actionNum: nextNum, userId, actionType, payload, timestamp: new Date() });

  return { game, logMessage: result.logMessage, event: result.event };
};

module.exports = { processAction };