
const COSTS = {
  WORMHOLE_LANE: { carbonFiber: 1, spaceCrystal: 1 },
  SMALL_CAT: { carbonFiber: 1, catnip: 1, mice: 1, spaceCrystal: 1 },
  BIG_CAT: { cosmicMilk: 3, catnip: 2 },
};

const getEdgeKey = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);

const getNextActivePlayer = (game, currentUserId) => {
  const pIds = game.playerIds;
  let currentIndex = pIds.findIndex((id) => id.toString() === currentUserId);
  for (let i = 1; i < pIds.length; i++) {
    const nextIndex = (currentIndex + i) % pIds.length;
    const nextId = pIds[nextIndex];
    const nextPlayer = game.playerStates.find((p) => p.userId.toString() === nextId.toString());
    if (!nextPlayer.hasQuit) return nextId;
  }
  return null; 
};

const checkSettlementSpacing = (newNodeId, game) => {
  const occupiedNodes = new Set();
  game.playerStates.forEach((p) => {
    p.settlements.forEach((s) => occupiedNodes.add(s));
    p.cities.forEach((c) => occupiedNodes.add(c));
  });
  if (occupiedNodes.has(newNodeId)) return false;
  const node = game.boardState.nodes.find((n) => n.id === newNodeId);
  if (!node) throw new Error(`Invalid Node ID: ${newNodeId}`);
  for (const neighborId of node.connections) {
    if (occupiedNodes.has(neighborId)) return false;
  }
  return true;
};

const checkRoadAdjacency = (u, v, player) => {
  const hasStructure = [...player.settlements, ...player.cities].some(nodeId => nodeId === u || nodeId === v);
  if (hasStructure) return true;
  return player.roads.some((roadKey) => {
    const [rU, rV] = roadKey.split("-").map(Number);
    return rU === u || rU === v || rV === u || rV === v;
  });
};

const hasEnoughResources = (player, costType, isFree = false) => {
  if (isFree) return true;
  const cost = COSTS[costType];
  for (const [res, amount] of Object.entries(cost)) {
    if ((player.resources[res] || 0) < amount) {
      throw new Error(`Insufficient ${res}. Need ${amount}.`);
    }
  }
  return true;
};

const consumeResources = (player, costType, isFree = false) => {
  if (isFree) return;
  const cost = COSTS[costType];
  for (const [res, amount] of Object.entries(cost)) {
    player.resources[res] -= amount;
  }
};

const distributeResources = (game, diceNumber) => {
  if (diceNumber === 7) return {};
  const distributionLog = {};
  const activeHexes = game.boardState.hexes.filter(h => h.number === diceNumber && h.resource !== "Void");

  activeHexes.forEach((hex) => {
    if (game.boardState.robberHex === hex.id) return;
    const resourceMap = { "Space Crystal": "spaceCrystal", Mice: "mice", Catnip: "catnip", "Carbon Fiber": "carbonFiber", "Cosmic Milk": "cosmicMilk" };
    const resKey = resourceMap[hex.resource];
    if (!resKey) return;

    hex.nodeIds.forEach((nodeId) => {
      game.playerStates.forEach((player) => {
        if (player.hasQuit) return;
        let amount = 0;
        if (player.settlements.includes(nodeId)) amount += 1;
        if (player.cities.includes(nodeId)) amount += 2;

        if (amount > 0) {
          player.resources[resKey] = (player.resources[resKey] || 0) + amount;
          const pId = player.userId.toString();
          if (!distributionLog[pId]) distributionLog[pId] = {};
          distributionLog[pId][resKey] = (distributionLog[pId][resKey] || 0) + amount;
        }
      });
    });
  });
  return distributionLog;
};

const performAutoPlacement = (game, player) => {
  const shuffledNodes = [...game.boardState.nodes].sort(() => Math.random() - 0.5);
  let validNode = null;
  for (const node of shuffledNodes) {
    if (checkSettlementSpacing(node.id, game)) { validNode = node; break; }
  }
  if (!validNode) throw new Error("Auto-place failed: No space left!");

  const neighborId = validNode.connections[0];
  const roadKey = getEdgeKey(validNode.id, neighborId);
  player.settlements.push(validNode.id);
  player.roads.push(roadKey);
  player.victoryPoints += 1;

  return { message: `Server auto-placed at Node ${validNode.id}.`, details: { settlement: validNode.id, road: roadKey } };
};

module.exports = { COSTS, getEdgeKey, getNextActivePlayer, checkSettlementSpacing, checkRoadAdjacency, hasEnoughResources, consumeResources, distributeResources, performAutoPlacement };