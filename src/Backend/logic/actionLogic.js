const { Game, Action } = require("../models/Schemas");

const COSTS = {
  WORMHOLE_LANE: { carbonFiber: 1, spaceCrystal: 1 },
  SMALL_CAT: { carbonFiber: 1, catnip: 1, mice: 1, spaceCrystal: 1 },
  BIG_CAT: { cosmicMilk: 3, catnip: 2 },
};

const ACTIONS_REQUIRING_TURN = new Set([
  "build_road",
  "build_settlement",
  "build_city",
  "end_turn",
  "buy_dev_card",
  "trade_bank",
  "play_dev_card",
  "move_robber",
  "roll_dice",
]);

const ACTIONS_REQUIRING_ROLL = new Set([
  "build_road",
  "build_settlement",
  "build_city",
  "end_turn",
  "buy_dev_card",
  "trade_bank",
  "trade_offer",
]);

// --- HELPERS (Standard) ---
const getEdgeKey = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);

const getNextActivePlayer = (game, currentUserId) => {
  const pIds = game.playerIds;
  let currentIndex = pIds.findIndex((id) => id.toString() === currentUserId);

  // Look ahead up to N times (where N is player count)
  for (let i = 1; i < pIds.length; i++) {
    const nextIndex = (currentIndex + i) % pIds.length;
    const nextId = pIds[nextIndex];
    const nextPlayer = game.playerStates.find(
      (p) => p.userId.toString() === nextId.toString(),
    );

    if (!nextPlayer.hasQuit) {
      return nextId;
    }
  }
  return null; // Should imply game over if null
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
  const hasStructure = [...player.settlements, ...player.cities].some(
    (nodeId) => nodeId === u || nodeId === v,
  );
  if (hasStructure) return true;

  return player.roads.some((roadKey) => {
    const [rU, rV] = roadKey.split("-").map(Number);
    return rU === u || rU === v || rV === u || rV === v;
  });
};

const checkAndConsumeResources = (player, costType, isFree = false) => {
  if (isFree) return;
  const cost = COSTS[costType];
  for (const [res, amount] of Object.entries(cost)) {
    if ((player.resources[res] || 0) < amount) {
      throw new Error(`Insufficient ${res}. Need ${amount}.`);
    }
  }
  for (const [res, amount] of Object.entries(cost)) {
    player.resources[res] -= amount;
  }
};

const distributeResources = (game, diceNumber) => {
  if (diceNumber === 7) return {};
  const distributionLog = {};

  const activeHexes = game.boardState.hexes.filter(
    (h) => h.number === diceNumber && h.resource !== "Void",
  );

  activeHexes.forEach((hex) => {
    if (game.boardState.robberHex === hex.id) return;

    // ... (Map resource keys same as before) ...
    const resourceMap = {
      "Space Crystal": "spaceCrystal",
      Mice: "mice",
      Catnip: "catnip",
      "Carbon Fiber": "carbonFiber",
      "Cosmic Milk": "cosmicMilk",
    };
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
          distributionLog[pId][resKey] =
            (distributionLog[pId][resKey] || 0) + amount;
        }
      });
    });
  });
  return distributionLog;
};

const performAutoPlacement = (game, player) => {
  const shuffledNodes = [...game.boardState.nodes].sort(
    () => Math.random() - 0.5,
  );
  let validNode = null;
  for (const node of shuffledNodes) {
    if (checkSettlementSpacing(node.id, game)) {
      validNode = node;
      break;
    }
  }

  if (!validNode) throw new Error("Auto-place failed: No space left!");

  const neighborId = validNode.connections[0];
  const roadKey = getEdgeKey(validNode.id, neighborId);

  player.settlements.push(validNode.id);
  player.roads.push(roadKey);
  player.victoryPoints += 1;

  return {
    message: `Server auto-placed at Node ${validNode.id}.`,
    details: { settlement: validNode.id, road: roadKey },
  };
};

// --- MAIN PROCESSOR ---
const processAction = async (gameId, userId, actionType, payload) => {
  const game = await Game.findById(gameId);
  if (!game) throw new Error("Game not found");

  const player = game.playerStates.find((p) => p.userId.toString() === userId);
  if (!player) throw new Error("Player not found.");

  // 1. Fetch Last Action (Needed for strict setup enforcement)
  // We check what this user did LAST to prevent chaining turns.
  const lastAction = await Action.findOne({ gameId }).sort({ actionNum: -1 });

  // 2. Validation
  if (ACTIONS_REQUIRING_TURN.has(actionType)) {
    if (game.turn.toString() !== userId) throw new Error(`Not your turn!`);
  }

  let totalSettlements = game.playerStates.reduce(
    (sum, p) => sum + p.settlements.length + p.cities.length,
    0,
  );
  const isSetupPhase = totalSettlements < game.maxPlayers * 2;

  if (!isSetupPhase && ACTIONS_REQUIRING_ROLL.has(actionType)) {
    if (!game.diceRolled) throw new Error("You must roll the dice first!");
  }

  let logMessage = "";
  let event = null;

  switch (actionType) {
    case "roll_dice":
      if (isSetupPhase) throw new Error("Cannot roll dice during setup phase.");
      if (game.diceRolled) throw new Error("Dice already rolled this turn.");

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2;
      const gains = distributeResources(game, sum);

      game.diceRolled = true;
      logMessage = `Rolled a ${sum} (${d1} + ${d2}).`;
      event = {
        type: "DICE_ROLLED",
        payload: { number: sum, dice: [d1, d2], gains },
      };
      break;

    case "build_settlement":
      checkAndConsumeResources(player, "SMALL_CAT", isSetupPhase);
      const sNodeId = Number(payload.nodeId);

      // 🛑 SETUP VALIDATION
      if (isSetupPhase) {
        // A. FORCE END TURN
        // If the last thing you did was build a road, you are done for this turn.
        if (
          lastAction &&
          lastAction.userId === userId &&
          lastAction.actionType === "build_road"
        ) {
          throw new Error(
            "You must end your turn before building another settlement.",
          );
        }

        // B. ROUND TARGET CHECK
        // Round 1 (Total < Max): Limit 1. Round 2 (Total >= Max): Limit 2.
        const roundTarget = totalSettlements < game.maxPlayers ? 1 : 2;
        if (player.settlements.length >= roundTarget) {
          throw new Error(
            `You can only place ${roundTarget} settlement(s) in this round.`,
          );
        }

        // C. SEQUENCE CHECK (S before R)
        if (player.settlements.length > player.roads.length) {
          throw new Error(
            "You must place a road for your current settlement first.",
          );
        }
      }

      if (!checkSettlementSpacing(sNodeId, game)) throw new Error("Too close!");
      if (!isSetupPhase) {
        const hasRoad = player.roads.some((r) => {
          const [u, v] = r.split("-").map(Number);
          return u === sNodeId || v === sNodeId;
        });
        if (!hasRoad) throw new Error("Must connect to road network.");
      }

      player.settlements.push(sNodeId);
      player.victoryPoints += 1;
      logMessage = isSetupPhase
        ? "Placed starting colony."
        : "Established a Small Cat colony.";

      event = {
        type: "BUILD_PLACED",
        payload: { type: "settlement", nodeId: sNodeId, userId },
      };
      break;

    case "build_road":
      checkAndConsumeResources(player, "WORMHOLE_LANE", isSetupPhase);
      const rU = Number(payload.u);
      const rV = Number(payload.v);
      const roadKey = getEdgeKey(rU, rV);

      // 🛑 SETUP VALIDATION
      if (isSetupPhase) {
        // A. ROUND TARGET CHECK
        const roundTarget = totalSettlements < game.maxPlayers ? 1 : 2;
        if (player.roads.length >= roundTarget) {
          throw new Error(
            `You can only place ${roundTarget} road(s) in this round.`,
          );
        }
        // B. SEQUENCE CHECK (S before R)
        if (player.settlements.length <= player.roads.length) {
          throw new Error("Place a settlement first.");
        }
      }

      if (
        !game.boardState.edges.some(
          (e) => (e.u === rU && e.v === rV) || (e.u === rV && e.v === rU),
        )
      ) {
        throw new Error("Invalid lane.");
      }
      if (game.playerStates.some((p) => p.roads.includes(roadKey))) {
        throw new Error("Lane occupied.");
      }
      if (
        (player.roads.length > 0 || player.settlements.length > 0) &&
        !checkRoadAdjacency(rU, rV, player)
      ) {
        throw new Error("Not connected!");
      }

      player.roads.push(roadKey);
      logMessage = "Constructed a Wormhole Lane.";

      event = {
        type: "BUILD_PLACED",
        payload: { type: "road", u: rU, v: rV, userId },
      };
      break;

    case "build_city":
      checkAndConsumeResources(player, "BIG_CAT");
      const cNodeId = Number(payload.nodeId);
      const settIndex = player.settlements.indexOf(cNodeId);

      if (settIndex === -1) throw new Error("No settlement there to upgrade.");
      player.settlements.splice(settIndex, 1);
      player.cities.push(cNodeId);
      player.victoryPoints += 1;
      logMessage = "Upgraded to Big Cat Metropolis.";

      event = {
        type: "BUILD_PLACED",
        payload: { type: "city", nodeId: cNodeId, userId },
      };
      break;

    case "end_turn":
      if (isSetupPhase) {
        if (player.settlements.length !== player.roads.length) {
          throw new Error(
            "Finish your build (Settlement + Road) before ending turn.",
          );
        }

        const expectedCount = totalSettlements >= game.maxPlayers ? 2 : 1;
        let autoActionData = null;

        // Auto-Placer (Protection against timeouts/errors)
        if (player.settlements.length < expectedCount) {
          const autoResult = performAutoPlacement(game, player);
          logMessage = autoResult.message;
          autoActionData = autoResult.details;
          totalSettlements++; // Update local count for turn logic
        } else {
          logMessage = "Ended their turn.";
        }

        // Snake Draft Turn Logic
        let nextPlayerIndex;
        if (totalSettlements < game.maxPlayers) {
          nextPlayerIndex = game.playerIds.indexOf(getNextActivePlayer(game, userId)); // Round 1 (Forward)
        } else {
          nextPlayerIndex = game.maxPlayers * 2 - 1 - totalSettlements; // Round 2 (Reverse)
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
          payload: {
            newTurnUserId: game.turn,
            isSetupPhase: true,
            autoAction: autoActionData,
          },
        };
      } else {
        // Normal Phase
        const currentIdx = game.playerIds.findIndex(
          (id) => id.toString() === userId,
        );
        game.turn = game.playerIds[(currentIdx + 1) % game.playerIds.length];
        game.diceRolled = false;
        logMessage = "Ended their turn.";

        event = {
          type: "TURN_CHANGED",
          payload: {
            newTurnUserId: game.turn,
            isSetupPhase: false,
          },
        };
      }
      break;
    case "quit_game":
      if (player.hasQuit) throw new Error("Already quit.");

      // A. Mark as Quit & Wipe Resources
      player.hasQuit = true;
      player.resources = {
        carbonFiber: 0,
        spaceCrystal: 0,
        mice: 0,
        catnip: 0,
        cosmicMilk: 0,
      };
      player.developmentCards = [];
      player.connected = false; // Effectively disconnect them too

      logMessage = "ABANDONED THE MISSION (Quit Game).";

      // B. Check Win Condition (Last Man Standing)
      const activeSurvivors = game.playerStates.filter((p) => !p.hasQuit);

      if (activeSurvivors.length === 1) {
        // GAME OVER - The survivor wins!
        const winner = activeSurvivors[0];
        game.status = "finished";
        event = {
          type: "GAME_OVER",
          payload: {
            winnerId: winner.userId,
            score: winner.victoryPoints,
            reason: "Last Pilot Standing",
          },
        };
        logMessage += ` ${winner.userId} is the sole survivor!`;
      } else {
        // C. If it was the quitter's turn, pass it immediately
        if (game.turn.toString() === userId) {
          const nextId = getNextActivePlayer(game, userId);
          game.turn = nextId;
          game.diceRolled = false;

          // Append event info so frontend knows turn changed
          event = {
            type: "TURN_CHANGED",
            payload: { newTurnUserId: game.turn },
          };
          logMessage += " Turn passed automatically.";
        }
      }
      break;
  }

  if (player.victoryPoints >= 10) {
    game.status = "finished";
    event = {
      type: "GAME_OVER",
      payload: { winnerId: userId, score: player.victoryPoints },
    };
  }

  await game.save();

  // Audit Log
  const nextNum = lastAction ? lastAction.actionNum + 1 : 1;
  await Action.create({
    gameId,
    actionNum: nextNum,
    userId,
    actionType,
    payload,
    timestamp: new Date(),
  });

  return { game, logMessage, event };
};

module.exports = { processAction };
