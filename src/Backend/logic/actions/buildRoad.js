// src/Backend/logic/actions/buildRoad.js
const { hasEnoughResources, consumeResources, getEdgeKey, checkRoadAdjacency } = require("../actionHelpers");

module.exports = ({ game, player, userId, payload, isSetupPhase, totalSettlements, lastAction }) => {
  const rU = Number(payload.u);
  const rV = Number(payload.v);
  const roadKey = getEdgeKey(rU, rV);

  // 1. VALIDATE PHASE-SPECIFIC RULES & RESOURCES
  if (isSetupPhase) {
    const roundTarget = totalSettlements < game.maxPlayers ? 1 : 2;
    if (player.roads.length >= roundTarget) {
        throw new Error(`You can only place ${roundTarget} road(s) in this round.`);
    }
    if (player.settlements.length <= player.roads.length) {
        throw new Error("Place a settlement first.");
    }

    if (!lastAction || lastAction.userId.toString() !== userId || lastAction.actionType !== "build_settlement") {
        throw new Error("You must place a road immediately after your settlement.");
    }

    const lastSettlementNodeId = Number(lastAction.payload.nodeId);
    if (![rU, rV].includes(lastSettlementNodeId)) {
        throw new Error("During setup, your road must connect to the settlement you just built!");
    }
  } else {
    // Normal Gameplay: Check Resources
    hasEnoughResources(player, "WORMHOLE_LANE");
  }

  // 2. VALIDATE BOARD POSITION
  if (!game.boardState.edges.some(e => (e.u === rU && e.v === rV) || (e.u === rV && e.v === rU))) {
    throw new Error("Invalid lane.");
  }
  if (game.playerStates.some(p => p.roads.includes(roadKey))) {
    throw new Error("Lane occupied.");
  }
  if ((player.roads.length > 0 || player.settlements.length > 0) && !checkRoadAdjacency(rU, rV, player)) {
    throw new Error("Not connected to your existing network!");
  }

  // 3. ALL CHECKS PASSED -> MUTATE STATE
  if (!isSetupPhase) {
    consumeResources(player, "WORMHOLE_LANE");
  }
  
  player.roads.push(roadKey);

  return {
    logMessage: "Constructed a Wormhole Lane.",
    event: { type: "BUILD_PLACED", payload: { type: "road", u: rU, v: rV, userId } }
  };
};