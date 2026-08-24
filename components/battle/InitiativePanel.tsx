import React, { useState } from 'react';
import { Entity, CombatStatsComponent, VisualComponent, PositionComponent, InitiativeRollDetail } from '../../types';
import { UnitPortrait } from '../ui/UnitPortrait';
import { StatusIcon } from '../ui/StatusIcon';

interface InitiativePanelProps {
    turnOrder: string[];
    currentTurnIndex: number;
    battleEntities: (Entity & { stats: CombatStatsComponent, position: PositionComponent, visual: VisualComponent })[];
    initiativeRolls?: Record<string, InitiativeRollDetail>;
    roundNumber?: number;
}

export const InitiativePanel: React.FC<InitiativePanelProps> = React.memo(({
    turnOrder,
    currentTurnIndex,
    battleEntities,
    initiativeRolls = {},
    roundNumber = 1
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredCombatantId, setHoveredCombatantId] = useState<string | null>(null);

    if (!turnOrder || turnOrder.length === 0 || !battleEntities || battleEntities.length === 0) {
        return null;
    }

    const aliveEntities = battleEntities.filter(e => e.stats.hp > 0);
    const aliveTurnOrder = turnOrder.filter(id => aliveEntities.some(e => e.id === id));
    if (aliveTurnOrder.length === 0) return null;

    const currentEntityId = turnOrder[currentTurnIndex];

    // Build the expected sequence of upcoming turns (next 8 turns)
    const upcomingTurns: Array<{
        entity: Entity & { stats: CombatStatsComponent, position: PositionComponent, visual: VisualComponent };
        isCurrent: boolean;
        turnOffset: number;
        roundOffset: number;
    }> = [];

    for (let i = 0; i < Math.min(8, aliveTurnOrder.length * 2); i++) {
        const orderIdx = (currentTurnIndex + i) % turnOrder.length;
        const entId = turnOrder[orderIdx];
        const ent = battleEntities.find(e => e.id === entId);
        if (ent && ent.stats.hp > 0) {
            const roundOffset = Math.floor((currentTurnIndex + i) / turnOrder.length);
            upcomingTurns.push({
                entity: ent,
                isCurrent: i === 0,
                turnOffset: i,
                roundOffset
            });
        }
    }

    return (
        <div className="flex flex-col items-center select-none">
            {/* Header: Minimalist Glass Capsule Bar */}
            <div 
                id="initiative-tracker-bar"
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-slate-950/80 border border-white/15 shadow-2xl backdrop-blur-2xl transition-all duration-300 pointer-events-auto max-w-[94vw] sm:max-w-max"
            >
                {/* Round Badge */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px] sm:text-[10px] font-mono font-black text-amber-300 tracking-wider shrink-0">
                    <span className="text-[8px] text-amber-400/70">RND</span>
                    <span>{roundNumber}</span>
                </div>

                {/* Queue Strip of Avatars */}
                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 max-w-[42vw] sm:max-w-[380px] md:max-w-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {upcomingTurns.map((item, idx) => {
                        const ent = item.entity;
                        const isPlayer = ent.type === 'PLAYER';
                        const isCurrent = item.isCurrent;

                        return (
                            <div 
                                key={`${ent.id}-${idx}`}
                                onMouseEnter={() => setHoveredCombatantId(ent.id)}
                                onMouseLeave={() => setHoveredCombatantId(null)}
                                className={`relative group shrink-0 transition-all duration-200 cursor-pointer ${
                                    isCurrent 
                                        ? 'scale-105 z-20' 
                                        : 'scale-90 opacity-70 hover:opacity-100 hover:scale-95'
                                }`}
                            >
                                {/* Portrait Container */}
                                <div 
                                    className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border-2 bg-slate-900 shadow-md transition-all ${
                                        isCurrent 
                                            ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.5)]' 
                                            : isPlayer 
                                                ? 'border-blue-500/70 hover:border-blue-400' 
                                                : 'border-red-500/70 hover:border-red-400'
                                    }`}
                                >
                                    <UnitPortrait entity={ent} />

                                    {/* HP Gauge Mini Bar on the bottom of circle */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-950/80">
                                        <div 
                                            className={`h-full ${isPlayer ? 'bg-emerald-400' : 'bg-red-500'}`}
                                            style={{ width: `${Math.max(0, Math.min(100, (ent.stats.hp / ent.stats.maxHp) * 100))}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Active Turn Indicator Badge */}
                                {isCurrent && (
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center border border-slate-950 text-[7px] font-black text-slate-950 shadow">
                                        ▶
                                    </div>
                                )}

                                {/* Enemy Marker */}
                                {!isCurrent && !isPlayer && (
                                    <div className="absolute -top-1 -right-0.5 w-3 h-3 bg-red-950/90 border border-red-500/80 rounded-full flex items-center justify-center text-[6px] text-red-200">
                                        ⚔
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* D&D 5E Initiative Breakdown Toggle */}
                <button
                    id="initiative-details-toggle-btn"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title="Desglose de Iniciativa D&D 5E"
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider font-mono border transition-all shrink-0 ${
                        isExpanded
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                            : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-white/10'
                    }`}
                >
                    <span>🎲</span>
                    <span className="text-[8px]">{isExpanded ? '▲' : '▼'}</span>
                </button>
            </div>

            {/* Expanded D&D 5E Initiative Breakdown Table */}
            {isExpanded && (
                <div 
                    id="initiative-details-modal"
                    className="mt-2 w-full max-w-sm bg-slate-950/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl p-2.5 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto z-40"
                >
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                            <span>⚡</span>
                            <span>Orden de Iniciativa D&D 5E</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">
                            1d20 + MOD DES
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {turnOrder.map((entId, rank) => {
                            const ent = battleEntities.find(e => e.id === entId);
                            if (!ent) return null;
                            const roll = initiativeRolls[entId];
                            const isCurrent = ent.id === currentEntityId;
                            const isDead = ent.stats.hp <= 0;
                            const isPlayer = ent.type === 'PLAYER';

                            return (
                                <div 
                                    key={entId}
                                    className={`flex items-center justify-between px-2 py-1 rounded-xl text-xs font-mono transition-colors ${
                                        isCurrent 
                                            ? 'bg-amber-950/50 border border-amber-500/40 text-amber-200' 
                                            : isDead 
                                                ? 'bg-slate-900/30 opacity-40 line-through text-slate-500' 
                                                : 'bg-slate-900/60 hover:bg-slate-900 border border-white/5 text-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 text-center font-bold text-slate-500 text-[9px]">
                                            #{rank + 1}
                                        </span>
                                        <div className={`w-5 h-5 rounded-full overflow-hidden border ${isPlayer ? 'border-blue-500' : 'border-red-500'} bg-slate-950 shrink-0`}>
                                            <UnitPortrait entity={ent} />
                                        </div>
                                        <span className={`font-semibold truncate max-w-[100px] text-[10px] ${isCurrent ? 'text-amber-300' : isPlayer ? 'text-slate-200' : 'text-red-300'}`}>
                                            {ent.name}
                                        </span>
                                        {ent.stats.conditions?.map(condition => (
                                            <StatusIcon key={condition} condition={condition} />
                                        ))}
                                    </div>

                                    {/* D&D Roll Math */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {roll ? (
                                            <div className="flex items-center gap-1 text-[10px]">
                                                <span className="text-slate-500 text-[9px]">
                                                    d20(<strong className={roll.d20Roll === 20 ? 'text-amber-400' : roll.d20Roll === 1 ? 'text-red-400' : 'text-slate-300'}>{roll.d20Roll}</strong>)
                                                </span>
                                                <span className="text-slate-500 text-[9px]">
                                                    {roll.dexModifier >= 0 ? `+${roll.dexModifier}` : roll.dexModifier}
                                                </span>
                                                <span className="text-slate-600">=</span>
                                                <span className={`font-black text-xs ${isCurrent ? 'text-amber-400' : 'text-slate-100'}`}>
                                                    {roll.total}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] text-slate-500">
                                                +{ent.stats.initiativeBonus}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});
