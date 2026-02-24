// src/Frontend/src/utils/gameRules.js

export const COSTS = {
  WORMHOLE_LANE: { carbonFiber: 1, spaceCrystal: 1 },
  SMALL_CAT: { carbonFiber: 1, catnip: 1, mice: 1, spaceCrystal: 1 },
  BIG_CAT: { cosmicMilk: 3, catnip: 2 },
};

export const hasEnoughResources = (player, costType, isFree = false) => {
  if (isFree && costType !== "BIG_CAT") return true; 
  const cost = COSTS[costType];
  for (const [res, amount] of Object.entries(cost)) {
    if ((player.resources[res] || 0) < amount) return false; 
  }
  return true;
};

export const checkSettlementSpacing = (newNodeId, game) => {
  const occupiedNodes = new Set();
  game.playerStates.forEach((p) => {
    p.settlements.forEach((s) => occupiedNodes.add(s));
    p.cities.forEach((c) => occupiedNodes.add(c));
  });
  if (occupiedNodes.has(newNodeId)) return false;
  const node = game.boardState.nodes.find((n) => n.id === newNodeId);
  for (const neighborId of node.connections) {
    if (occupiedNodes.has(neighborId)) return false;
  }
  return true;
};

export const checkRoadAdjacency = (u, v, player) => {
  const hasStructure = [...player.settlements, ...player.cities].some(n => n === u || n === v);
  if (hasStructure) return true;
  return player.roads.some((roadKey) => {
    const [rU, rV] = roadKey.split("-").map(Number);
    return rU === u || rU === v || rV === u || rV === v;
  });
};