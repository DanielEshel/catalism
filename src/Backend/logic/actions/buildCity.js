// src/Backend/logic/actions/buildCity.js
const { hasEnoughResources, consumeResources } = require("../actionHelpers");

module.exports = ({ player, userId, payload }) => {
  // 1. VALIDATE RESOURCES
  hasEnoughResources(player, "BIG_CAT");
  
  const cNodeId = Number(payload.nodeId);
  const settIndex = player.settlements.indexOf(cNodeId);

  // 2. VALIDATE POSITION
  if (settIndex === -1) throw new Error("No settlement there to upgrade.");
  
  // 3. ALL CHECKS PASSED -> MUTATE STATE
  consumeResources(player, "BIG_CAT");
  
  player.settlements.splice(settIndex, 1);
  player.cities.push(cNodeId);
  player.victoryPoints += 1;

  return {
    logMessage: "Upgraded to Big Cat Metropolis.",
    event: { type: "BUILD_PLACED", payload: { type: "city", nodeId: cNodeId, userId } }
  };
};