// src/Frontend/src/components/Game/BuildMenu.jsx
import React from "react";

export default function BuildMenu({ buildMenu, canBuildSettlement, canBuildCity, canBuildRoad, onConfirm }) {
    if (!buildMenu) return null;

    return (
        <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
                position: 'fixed', left: buildMenu.x + 15, top: buildMenu.y - 30, zIndex: 9999, 
                background: '#151520', border: '1px solid #00ff00', padding: '6px 8px', 
                borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px', 
                boxShadow: '0px 0px 10px rgba(0,255,0,0.3)' 
            }}
        >
            {buildMenu.type === 'node' && (
                <>
                    <button 
                        onClick={() => onConfirm('build_settlement')} 
                        disabled={!canBuildSettlement}
                        style={{ fontSize: '11px', padding: '4px', opacity: canBuildSettlement ? 1 : 0.4, cursor: canBuildSettlement ? 'pointer' : 'not-allowed' }}
                    >🏠 Colony</button>
                    <button 
                        onClick={() => onConfirm('build_city')} 
                        disabled={!canBuildCity}
                        style={{ fontSize: '11px', padding: '4px', opacity: canBuildCity ? 1 : 0.4, cursor: canBuildCity ? 'pointer' : 'not-allowed' }}
                    >🏙️ City</button>
                </>
            )}
            
            {buildMenu.type === 'edge' && (
                <button 
                    onClick={() => onConfirm('build_road')} 
                    disabled={!canBuildRoad}
                    style={{ fontSize: '11px', padding: '4px', opacity: canBuildRoad ? 1 : 0.4, cursor: canBuildRoad ? 'pointer' : 'not-allowed' }}
                >🛣️ Lane</button>
            )}
        </div>
    );
}