import React, { useState } from 'react';
import { Item, Entity, ItemRarity, EquipmentSlot, GameState } from '../../types';
import { RARITY_COLORS } from '../../constants';
import { sfx } from '../../services/SoundSystem';

interface ItemDetailCardProps {
    item: Item | null;
    activeChar: Entity;
    party: Entity[];
    gameState: GameState;
    hasActed: boolean;
    onEquip: (itemId: string, charId: string) => void;
    onUnequip: (slot: EquipmentSlot, charId: string) => void;
    onConsume: (itemId: string, charId: string) => void;
    onClose?: () => void;
}

export const ItemDetailCard: React.FC<ItemDetailCardProps> = ({
    item,
    activeChar,
    party,
    gameState,
    hasActed,
    onEquip,
    onUnequip,
    onConsume,
    onClose
}) => {
    const [targetCharId, setTargetCharId] = useState<string>(activeChar.id);
    const [showComparison, setShowComparison] = useState<boolean>(true);

    if (!item) {
        return (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center font-serif text-center p-6 rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-xl text-slate-400">
                <span className="text-4xl mb-3 opacity-40">🎒</span>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">
                    Zurrón de Aventurero
                </h4>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                    Selecciona o toca cualquier objeto del zurrón o ranura de equipo para inspeccionar sus propiedades mágicas, estadísticas de combate y lore arcano.
                </p>
            </div>
        );
    }

    const rarityColor = RARITY_COLORS[item.rarity] || '#9ca3af';
    const isEquipment = item.type === 'equipment';
    const isConsumable = item.type === 'consumable';
    const targetSlot = item.equipmentStats?.slot;
    const isBattle = gameState === GameState.BATTLE_TACTICAL;

    // Check if the item is equipped by the active character
    const isEquippedByActive = isEquipment && targetSlot && activeChar.equipment[targetSlot]?.id === item.id;
    // Check if any character in the party has this equipped
    const equippedOwner = party.find(p => 
        Object.values(p.equipment).some(eq => eq?.id === item.id)
    );

    // Comparative item in the target slot
    const equippedInSlot = (targetSlot && activeChar.equipment[targetSlot]) ? activeChar.equipment[targetSlot] : null;
    const canCompare = isEquipment && equippedInSlot && equippedInSlot.id !== item.id;

    // Stat Deltas
    const newAc = item.equipmentStats?.ac ?? 0;
    const oldAc = equippedInSlot?.equipmentStats?.ac ?? 0;
    const acDiff = newAc - oldAc;

    const newAvgDmg = item.equipmentStats?.diceCount 
        ? (item.equipmentStats.diceCount * ((item.equipmentStats.diceSides || 6) + 1) / 2) 
        : 0;
    const oldAvgDmg = equippedInSlot?.equipmentStats?.diceCount 
        ? (equippedInSlot.equipmentStats.diceCount * ((equippedInSlot.equipmentStats.diceSides || 6) + 1) / 2) 
        : 0;
    const dmgDiff = newAvgDmg - oldAvgDmg;

    // Requirement Validation Checks
    const levelMet = !item.requiredLevel || activeChar.stats.level >= item.requiredLevel;
    const statsMet = !item.requiredStats || Object.entries(item.requiredStats).every(([st, val]) => ((activeChar.stats.attributes as any)[st] || 0) >= (val as number));
    const classMet = !item.allowedClasses || item.allowedClasses.includes(activeChar.stats.class);
    const meetsRequirements = levelMet && statsMet && classMet;

    const handleEquipClick = () => {
        sfx.playUiClick();
        onEquip(item.id, activeChar.id);
    };

    const handleUnequipClick = () => {
        if (targetSlot) {
            sfx.playUiClick();
            onUnequip(targetSlot, activeChar.id);
        }
    };

    const handleConsumeClick = () => {
        sfx.playMagic();
        onConsume(item.id, targetCharId);
    };

    return (
        <div className="h-full flex flex-col rounded-3xl border border-white/15 bg-slate-950/85 backdrop-blur-2xl shadow-2xl overflow-hidden relative text-slate-200 animate-in fade-in duration-200">
            {/* Top Close Button on Mobile / Floating */}
            {onClose && (
                <button 
                    onClick={onClose}
                    className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs shadow-lg active:scale-90"
                    aria-label="Cerrar detalles"
                >
                    ✕
                </button>
            )}

            {/* Header: Item Identity */}
            <div 
                className="p-3 sm:p-4 border-b border-white/10 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${rarityColor}18 0%, rgba(15, 23, 42, 0.6) 100%)` }}
            >
                <div className="flex items-center gap-3">
                    {/* Item Icon Frame */}
                    <div 
                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center p-2 shrink-0 bg-slate-950/80 shadow-lg relative"
                        style={{ borderColor: `${rarityColor}70` }}
                    >
                        <img 
                            src={item.icon} 
                            alt={item.name} 
                            className="w-full h-full object-contain pixelated drop-shadow" 
                        />
                    </div>

                    {/* Titles and Badges */}
                    <div className="min-w-0 flex-1 pr-6">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span 
                                className="text-[8px] sm:text-[9px] font-mono uppercase font-black px-2 py-0.5 rounded-full border shadow-sm"
                                style={{ 
                                    borderColor: `${rarityColor}60`, 
                                    backgroundColor: `${rarityColor}20`,
                                    color: rarityColor 
                                }}
                            >
                                {item.rarity}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10">
                                {item.type === 'equipment' ? (targetSlot?.replace('_', ' ') || 'Equipo') : item.type === 'consumable' ? 'Consumible' : 'Objeto Clave'}
                            </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-serif font-black truncate leading-tight" style={{ color: rarityColor }}>
                            {item.name}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Scrollable Attributes & Lore Body */}
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 custom-scrollbar">
                {/* Lore / Flavor Text */}
                {item.flavorText && (
                    <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-200/90 font-serif italic text-[11px] leading-relaxed">
                        "{item.flavorText}"
                    </div>
                )}

                {/* Description */}
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {item.description || 'Un objeto misterioso de las tierras de Arcadia.'}
                </p>

                {/* Requirements Section */}
                {(item.requiredLevel || item.requiredStats || item.allowedClasses) && (
                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between border-b border-white/10 pb-1">
                            <span>📋 Requisitos para Equipar</span>
                            <span className="text-[9px] font-mono text-slate-400">Progreso</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {item.requiredLevel && (
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold border ${
                                    activeChar.stats.level >= item.requiredLevel
                                        ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                                        : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                                }`}>
                                    {activeChar.stats.level >= item.requiredLevel ? '✓' : '✕'} Nivel {item.requiredLevel} ({activeChar.stats.level})
                                </span>
                            )}

                            {item.requiredStats && Object.entries(item.requiredStats).map(([stat, val]) => {
                                const charVal = (activeChar.stats.attributes as any)[stat] || 0;
                                const met = charVal >= (val as number);
                                return (
                                    <span key={stat} className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold border ${
                                        met ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                                    }`}>
                                        {met ? '✓' : '✕'} {stat} {val} ({charVal})
                                    </span>
                                );
                            })}

                            {item.allowedClasses && (
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold border ${
                                    item.allowedClasses.includes(activeChar.stats.class)
                                        ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                                        : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                                }`}>
                                    {item.allowedClasses.includes(activeChar.stats.class) ? '✓' : '✕'} {item.allowedClasses.join(', ')}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Equipment Combat Stats */}
                {item.equipmentStats && (
                    <div className="p-3 rounded-2xl bg-slate-900/70 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                                <span>⚔️</span> Propiedades de Combate
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 uppercase">
                                Ranura: {targetSlot}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                            {item.equipmentStats.ac !== undefined && (
                                <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col">
                                    <span className="text-slate-400 text-[9px] uppercase font-bold">Armadura</span>
                                    <span className="text-sm font-black text-sky-300">+{item.equipmentStats.ac} CA</span>
                                </div>
                            )}

                            {item.equipmentStats.diceCount !== undefined && (
                                <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col">
                                    <span className="text-slate-400 text-[9px] uppercase font-bold">Daño Base</span>
                                    <span className="text-sm font-black text-rose-400">
                                        {item.equipmentStats.diceCount}d{item.equipmentStats.diceSides}
                                        <span className="text-[9px] text-slate-400 font-normal ml-1">
                                            (Prom. {newAvgDmg.toFixed(1)})
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Modifiers (STR, DEX, etc.) */}
                        {item.equipmentStats.modifiers && Object.keys(item.equipmentStats.modifiers).length > 0 && (
                            <div className="pt-1.5 border-t border-white/5">
                                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                                    Modificadores de Atributo:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(item.equipmentStats.modifiers).map(([attr, val]) => (
                                        <span key={attr} className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[9px] font-bold">
                                            +{val} {attr}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Weapon Properties (Finesse, Versatile, etc.) */}
                        {item.equipmentStats.properties && item.equipmentStats.properties.length > 0 && (
                            <div className="pt-1 border-t border-white/5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] text-slate-400 font-bold">Rasgos:</span>
                                {item.equipmentStats.properties.map(p => (
                                    <span key={p} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[8px] font-mono uppercase">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Resistances & Immunities */}
                        {item.equipmentStats.resistances && (
                            <div className="pt-1 border-t border-white/5 space-y-1">
                                <span className="text-[9px] text-slate-400 font-bold block">Resistencias al Daño:</span>
                                <div className="flex flex-wrap gap-1">
                                    {Object.entries(item.equipmentStats.resistances).map(([type, res]) => (
                                        <span key={type} className="px-2 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[9px] font-mono">
                                            🛡️ {type}: -{Math.round(Number(res) * 100)}%
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Immunities */}
                        {item.equipmentStats.immunities && item.equipmentStats.immunities.length > 0 && (
                            <div className="pt-1 border-t border-white/5 flex items-center gap-1 flex-wrap">
                                <span className="text-[9px] text-slate-400 font-bold">Inmunidades:</span>
                                {item.equipmentStats.immunities.map(imm => (
                                    <span key={imm} className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[8px] font-mono uppercase">
                                        ✨ {imm}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Consumable Effects */}
                {item.effect && (
                    <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            <span>🧪</span> Efecto Inmediato
                        </div>
                        <div className="text-xs text-emerald-200 font-mono font-bold">
                            {item.effect.type === 'heal_hp' && `💖 Restaura +${item.effect.amount} Puntos de Golpe`}
                            {item.effect.type === 'restore_mana' && `🔮 Restaura +${item.effect.amount} Ranuras de Conjuro`}
                            {item.effect.type === 'buff_str' && `💪 Otorga +${item.effect.amount} Fuerza Temporal`}
                        </div>
                    </div>
                )}

                {/* Comparative Box vs Currently Equipped */}
                {canCompare && showComparison && equippedInSlot && (
                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/40 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-amber-300 border-b border-white/10 pb-1">
                            <span>⚖️ Comparativa con {activeChar.name}</span>
                            <span className="text-[9px] font-mono text-slate-400">Ranura: {targetSlot}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                            {/* Current Item */}
                            <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10">
                                <span className="text-[8px] uppercase font-bold text-slate-400 block mb-0.5">Equipado</span>
                                <div className="font-bold text-slate-200 truncate">{equippedInSlot.name}</div>
                                <div className="text-[9px] text-slate-400 mt-1">
                                    {equippedInSlot.equipmentStats?.ac ? `CA: +${equippedInSlot.equipmentStats.ac}` : ''}
                                    {equippedInSlot.equipmentStats?.diceCount ? `${equippedInSlot.equipmentStats.diceCount}d${equippedInSlot.equipmentStats.diceSides}` : ''}
                                </div>
                            </div>

                            {/* New Item */}
                            <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/40">
                                <span className="text-[8px] uppercase font-bold text-amber-400 block mb-0.5">Seleccionado</span>
                                <div className="font-bold text-amber-200 truncate">{item.name}</div>
                                <div className="text-[9px] text-amber-300 mt-1">
                                    {item.equipmentStats?.ac ? `CA: +${item.equipmentStats.ac}` : ''}
                                    {item.equipmentStats?.diceCount ? `${item.equipmentStats.diceCount}d${item.equipmentStats.diceSides}` : ''}
                                </div>
                            </div>
                        </div>

                        {/* Delta Pills */}
                        <div className="flex gap-1.5 flex-wrap pt-1">
                            {item.equipmentStats?.ac !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                    acDiff > 0 ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' :
                                    acDiff < 0 ? 'bg-rose-950/80 border-rose-500/50 text-rose-300' :
                                    'bg-slate-800 border-slate-600 text-slate-300'
                                }`}>
                                    🛡️ {acDiff > 0 ? `+${acDiff} CA` : acDiff < 0 ? `${acDiff} CA` : 'Misma CA'}
                                </span>
                            )}

                            {item.equipmentStats?.diceCount !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                    dmgDiff > 0 ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' :
                                    dmgDiff < 0 ? 'bg-rose-950/80 border-rose-500/50 text-rose-300' :
                                    'bg-slate-800 border-slate-600 text-slate-300'
                                }`}>
                                    ⚔️ {dmgDiff > 0 ? `+${dmgDiff.toFixed(1)} Daño Prom.` : dmgDiff < 0 ? `${dmgDiff.toFixed(1)} Daño Prom.` : 'Mismo Daño'}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-950/90 flex flex-col gap-2 shrink-0">
                {isEquipment && (
                    <div className="flex gap-2">
                        {isEquippedByActive ? (
                            <button
                                onClick={handleUnequipClick}
                                className="flex-1 min-h-[44px] py-2.5 px-4 rounded-2xl bg-rose-600/80 hover:bg-rose-600 border border-rose-400 text-white font-serif font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <span>✕</span>
                                <span>Desequipar de {activeChar.name}</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleEquipClick}
                                disabled={!meetsRequirements}
                                className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-2xl font-serif font-black text-xs uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 ${
                                    meetsRequirements
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95 cursor-pointer'
                                        : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
                                }`}
                            >
                                <span>{meetsRequirements ? '⚔️' : '🔒'}</span>
                                <span>{meetsRequirements ? `Equipar en ${activeChar.name}` : 'Requisitos no cumplidos'}</span>
                            </button>
                        )}
                    </div>
                )}

                {isConsumable && (
                    <div className="space-y-2">
                        {/* Target Selection for Multiple Party Members */}
                        {party.length > 1 && (
                            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/10">
                                <span className="text-[9px] font-bold text-slate-400 px-1">Objetivo:</span>
                                {party.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setTargetCharId(p.id)}
                                        className={`flex-1 min-h-[38px] py-1 px-1.5 rounded-lg text-[10px] font-bold truncate transition-all flex items-center justify-center ${
                                            targetCharId === p.id 
                                                ? 'bg-amber-500 text-slate-950 font-black shadow-sm' 
                                                : 'text-slate-300 hover:bg-white/5'
                                        }`}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={handleConsumeClick}
                            disabled={isBattle && hasActed}
                            className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white font-serif font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            <span>🧪</span>
                            <span>
                                Usar en {party.find(p => p.id === targetCharId)?.name || activeChar.name}
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
