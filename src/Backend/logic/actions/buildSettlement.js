// src/Backend/logic/actions/buildSettlement.js
const { hasEnoughResources, consumeResources, checkSettlementSpacing } = require("../actionHelpers");

module.exports = ({ game, player, userId, payload, isSetupPhase, lastAction, totalSettlements }) => {
  const sNodeId = Number(payload.nodeId);

  // 1. VALIDATE PHASE-SPECIFIC RULES & RESOURCES
  if (isSetupPhase) {
    const isPivotTurn = totalSettlements === game.maxPlayers && player.settlements.length === 1;
    if (!isPivotTurn && lastAction?.userId.toString() === userId && lastAction?.actionType === "build_road" ) {
      throw new Error("You must end your turn before building another settlement.");
    }
    const roundTarget = totalSettlements < game.maxPlayers ? 1 : 2;
    if (player.settlements.length >= roundTarget) {
        throw new Error(`You can only place ${roundTarget} settlement(s) in this round.`);
    }
    if (player.settlements.length > player.roads.length) {
        throw new Error("You must place a road for your current settlement first.");
    }
  } else {
    hasEnoughResources(player, "SMALL_CAT");
    
    const hasRoad = player.roads.some((r) => r.split("-").map(Number).includes(sNodeId));
    if (!hasRoad) throw new Error("Must connect to road network.");
  }

  // 2. VALIDATE BOARD POSITION
  if (!checkSettlementSpacing(sNodeId, game)) throw new Error("Too close!");

  // 3. ALL CHECKS PASSED -> MUTATE STATE
  if (!isSetupPhase) {
    consumeResources(player, "SMALL_CAT");
  }
  
  player.settlements.push(sNodeId);
  player.victoryPoints += 1;

  return {
    logMessage: isSetupPhase ? "Placed starting colony." : "Established a Small Cat colony.",
    event: { type: "BUILD_PLACED", payload: { type: "settlement", nodeId: sNodeId, userId } }
  };
};