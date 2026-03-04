// src/Backend/logic/actions/discardCards.js

const discardCards = (context) => {
    // Unpack the context
    const { game, player, userId, payload } = context;

    // 1. Find their specific requirement in pendingDiscards
    const pendingIndex = game.pendingDiscards.findIndex(
        (pd) => pd.userId.toString() === userId.toString()
    );

    if (pendingIndex === -1) {
        throw new Error("You are not required to discard cards right now.");
    }

    const { amountToDiscard } = game.pendingDiscards[pendingIndex];
    const { resourcesToDiscard } = payload; // Expecting: { mice: 2, catnip: 1 }

    // 2. Generic Validation
    let totalSent = 0;
    
    for (const [resType, amount] of Object.entries(resourcesToDiscard)) {
        if (amount < 0) throw new Error("Cannot discard negative amounts.");
        if (amount === 0) continue;

        if (player.resources[resType] === undefined) {
            throw new Error(`Invalid resource type: ${resType}`);
        }
        if (player.resources[resType] < amount) {
            throw new Error(`Insufficient ${resType}. You have ${player.resources[resType]} but tried to discard ${amount}.`);
        }

        totalSent += amount;
    }

    if (totalSent !== amountToDiscard) {
        throw new Error(`Incorrect amount. You must discard exactly ${amountToDiscard} cards, but you selected ${totalSent}.`);
    }

    // 3. Execution: Deduct resources
    for (const [resType, amount] of Object.entries(resourcesToDiscard)) {
        player.resources[resType] -= amount;
    }

    // 4. Remove from pending list
    game.pendingDiscards.splice(pendingIndex, 1);

    // 5. Check if phase is complete
    const isPhaseOver = game.pendingDiscards.length === 0;

    return {
        logMessage: `discarded ${totalSent} cards.`,
        event: isPhaseOver ? { type: "DISCARD_PHASE_COMPLETE" } : null
    };
};

module.exports = discardCards;