// src/Backend/logic/actions/moveRobber.js
module.exports = ({ game, player, userId, payload }) => {
  if (!game.mustMoveRobber) throw new Error("You cannot move the robber right now.");

  const targetHexId = Number(payload.hexId);
  if (game.boardState.robberHex === targetHexId) throw new Error("The robber must move to a new hex.");

  const hex = game.boardState.hexes.find(h => h.id === targetHexId);
  if (!hex) throw new Error("Invalid sector coordinates.");

  // 1. Move the Robber
  game.boardState.robberHex = targetHexId;
  game.mustMoveRobber = false;

  // 2. Find Eligible Victims
  const adjacentNodes = hex.nodeIds;
  const eligibleVictims = game.playerStates.filter(p => {
     if (p.hasQuit || p.userId.toString() === userId) return false;

     const hasBuilding = [...p.settlements, ...p.cities].some(node => adjacentNodes.includes(node));
     const resCount = Object.values(p.resources).reduce((a, b) => a + b, 0);

     return hasBuilding && resCount > 0;
  });

  // 3. Steal!
  let victimName = null;
  if (eligibleVictims.length > 0) {
     const victim = eligibleVictims[Math.floor(Math.random() * eligibleVictims.length)];

     const availableRes = [];
     Object.entries(victim.resources).forEach(([key, val]) => {
        for(let i = 0; i < val; i++) availableRes.push(key);
     });
     const stolenRes = availableRes[Math.floor(Math.random() * availableRes.length)];

     victim.resources[stolenRes] -= 1;
     player.resources[stolenRes] += 1;

     victimName = "a neighboring pilot";
  }

  return {
    logMessage: victimName ? `Moved the robber and stole loot from ${victimName}!` : `Moved the robber (found no loot to steal).`,
    event: { type: "ROBBER_MOVED", payload: { hexId: targetHexId } }
  };
};