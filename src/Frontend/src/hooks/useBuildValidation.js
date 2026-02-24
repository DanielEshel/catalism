// src/Frontend/src/hooks/useBuildValidation.js
import { useMemo } from "react";
import { checkSettlementSpacing, checkRoadAdjacency } from "../utils/gameRules";

export function useBuildValidation(game, myPlayerState, buildMenu, isSetupPhase) {
    return useMemo(() => {
        let canBuildSettlement = false;
        let canBuildCity = false;
        let canBuildRoad = false;

        if (!buildMenu || !myPlayerState) return { canBuildSettlement, canBuildCity, canBuildRoad };

        if (buildMenu.type === 'node') {
            const nodeId = buildMenu.data.nodeId;
            canBuildSettlement = checkSettlementSpacing(nodeId, game) && 
                (isSetupPhase || myPlayerState.roads.some(r => r.split("-").map(Number).includes(nodeId)));
            
            canBuildCity = myPlayerState.settlements.includes(nodeId) && !isSetupPhase;
        } else if (buildMenu.type === 'edge') {
            const { u, v } = buildMenu.data;
            const edgeKey = u < v ? `${u}-${v}` : `${v}-${u}`;
            const isOccupied = game.playerStates.some(p => p.roads.includes(edgeKey));
            
            if (!isOccupied) {
                if (isSetupPhase) {
                    if (myPlayerState.settlements.length > myPlayerState.roads.length) {
                        const lastSettlement = myPlayerState.settlements[myPlayerState.settlements.length - 1];
                        canBuildRoad = [u, v].includes(lastSettlement);
                    }
                } else {
                    canBuildRoad = checkRoadAdjacency(u, v, myPlayerState);
                }
            }
        }

        return { canBuildSettlement, canBuildCity, canBuildRoad };
    }, [game, myPlayerState, buildMenu, isSetupPhase]);
}