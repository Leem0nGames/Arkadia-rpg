import React from 'react';
import { Entity, EquipmentSlot, Item, CombatStatsComponent, VisualComponent } from '../../types';
import { getModifier } from '../../services/dndRules';
import { ItemRarityFrame } from './ItemRarityFrame';
import { UnitPortrait } from '../ui/UnitPortrait';
import { sfx } from '../../services/SoundSystem';

// Safe Item Image component with fallback icon if URL fails
const SafeItemImage: React.FC<{ icon?: string; name: string; fallbackEmoji?: string }> = ({ icon, name, fallbackEmoji = '⚔️' }) => {
    const [hasError, setHasError] = React.useState(false);

    if (!icon || hasError) {
        return (
            <div className="w-full h-full flex items-center justify-center text-amber-300/90 text-lg sm:text-xl drop-shadow select-none">
                <span>{fallbackEmoji}</span>
            </div>
        );
    }

    return (
        <img 
            src={icon} 
            alt={name} 
            onError={() => setHasError(true)} 
            className="w-full h-full object-contain pixelated drop-shadow" 
        />
    );
};

interface CharacterEquipmentSheetProps {
    party: (Entity & { stats: CombatStatsComponent; visual: VisualComponent })[];
    activeChar: Entity & { stats: CombatStatsComponent; visual: VisualComponent };
    selectedItem: Item | null;
    onSelectChar: (charId: string) => void;
    onSelectItem: (item: Item) => void;
    onUnequipSlot: (slot: EquipmentSlot) => void;
}

export const CharacterEquipmentSheet: React.FC<CharacterEquipmentSheetProps> = ({
    party,
    activeChar,
    selectedItem,
    onSelectChar,
    onSelectItem,
    onUnequipSlot
}) => {
    const mainHandItem = activeChar.equipment[EquipmentSlot.MAIN_HAND];
    const bodyItem = activeChar.equipment[EquipmentSlot.BODY];
    const offHandItem = activeChar.equipment[EquipmentSlot.OFF_HAND];

    const hpPercent = Math.max(0, Math.min(100, (activeChar.stats.hp / activeChar.stats.maxHp) * 100));

    return (
        <div className="flex flex-col h-full rounded-3xl border border-white/15 bg-slate-950/80 backdrop-blur-2xl overflow-hidden p-3 sm:p-4 gap-3 text-slate-200">
            
            {/* Party Switcher Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar shrink-0">
                {party.map(member => {
                    const isActive = member.id === activeChar.id;
                    const memberHpPercent = Math.max(0, Math.min(100, (member.stats.hp / member.stats.maxHp) * 100));

                    return (
                        <button
                            key={member.id}
                            onClick={() => {
                                sfx.playUiClick();
                                onSelectChar(member.id);
                            }}
                            className={`flex items-center gap-2 p-1.5 pr-3 rounded-2xl border transition-all shrink-0 min-h-[44px] ${
                                isActive 
                                    ? 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-500/60 shadow-md ring-1 ring-amber-400/40' 
                                    : 'bg-slate-900/60 border-white/10 hover:border-white/25 opacity-75 hover:opacity-100'
                            }`}
                        >
                            <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-500/60 bg-gradient-to-b from-slate-900 to-slate-950 shadow-md relative shrink-0 flex items-center justify-center p-0.5">
                                <UnitPortrait entity={member} />
                            </div>
                            <div className="flex flex-col text-left min-w-0">
                                <span className={`text-[11px] font-bold truncate max-w-[85px] leading-tight ${isActive ? 'text-amber-300' : 'text-slate-200'}`}>
                                    {member.name}
                                </span>
                                <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 border border-white/10">
                                    <div 
                                        className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-300" 
                                        style={{ width: `${memberHpPercent}%` }} 
                                    />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Character Header & Relic Portrait Badge */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/10 flex items-center gap-3 shrink-0 relative overflow-hidden shadow-xl">
                {/* Hero Badge Container */}
                <div className="w-16 h-16 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 overflow-hidden shadow-[0_0_15px_rgba(251,191,36,0.25)] relative shrink-0 flex items-center justify-center p-0.5">
                    {/* Corner Filigrees */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-300/90 pointer-events-none z-10" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-300/90 pointer-events-none z-10" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-300/90 pointer-events-none z-10" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-300/90 pointer-events-none z-10" />

                    <UnitPortrait entity={activeChar} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                        <h3 className="font-serif font-black text-sm text-slate-100 truncate">
                            {activeChar.name}
                        </h3>
                        <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                            Nv. {activeChar.stats.level}
                        </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                        {activeChar.stats.race} {activeChar.stats.class}
                    </div>

                    {/* Health & Mana / Spell Slots Bar */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex flex-col">
                            <div className="flex justify-between text-[9px] font-mono mb-0.5">
                                <span className="text-slate-400">Vida</span>
                                <span className="font-bold text-rose-400">{activeChar.stats.hp}/{activeChar.stats.maxHp}</span>
                            </div>
                            <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                                <div 
                                    className="h-full bg-rose-500 transition-all" 
                                    style={{ width: `${hpPercent}%` }} 
                                />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <div className="flex justify-between text-[9px] font-mono mb-0.5">
                                <span className="text-slate-400">Defensa</span>
                                <span className="font-bold text-sky-400">{activeChar.stats.ac} CA</span>
                            </div>
                            <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                                <div className="h-full bg-sky-500 w-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Paperdoll Equipment Slots */}
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col gap-2 shrink-0">
                <div className="text-[10px] font-serif font-black uppercase tracking-wider text-amber-300 flex items-center justify-between">
                    <span>🥋 Equipo Portado</span>
                    <span className="text-[9px] font-mono text-slate-400">Toca para inspeccionar</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {/* Main Hand */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400 truncate max-w-full">
                            Mano Dcha.
                        </span>
                        {mainHandItem ? (
                            <ItemRarityFrame
                                rarity={mainHandItem.rarity}
                                isSelected={selectedItem?.id === mainHandItem.id}
                                onClick={() => onSelectItem(mainHandItem)}
                                className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-2 relative"
                            >
                                <SafeItemImage icon={mainHandItem.icon} name={mainHandItem.name} fallbackEmoji="⚔️" />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUnequipSlot(EquipmentSlot.MAIN_HAND);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md z-20 border border-white/20 active:scale-90"
                                    title="Desequipar"
                                >
                                    ✕
                                </button>
                            </ItemRarityFrame>
                        ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 flex flex-col items-center justify-center text-slate-600">
                                <span className="text-xl">⚔️</span>
                                <span className="text-[7px] uppercase font-bold mt-0.5">Vacío</span>
                            </div>
                        )}
                        <span className="text-[8px] text-center font-bold text-slate-300 truncate w-full">
                            {mainHandItem?.name || 'Sin Arma'}
                        </span>
                    </div>

                    {/* Body Armor */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400 truncate max-w-full">
                            Armadura
                        </span>
                        {bodyItem ? (
                            <ItemRarityFrame
                                rarity={bodyItem.rarity}
                                isSelected={selectedItem?.id === bodyItem.id}
                                onClick={() => onSelectItem(bodyItem)}
                                className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-2 relative"
                            >
                                <SafeItemImage icon={bodyItem.icon} name={bodyItem.name} fallbackEmoji="🥋" />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUnequipSlot(EquipmentSlot.BODY);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md z-20 border border-white/20 active:scale-90"
                                    title="Desequipar"
                                >
                                    ✕
                                </button>
                            </ItemRarityFrame>
                        ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 flex flex-col items-center justify-center text-slate-600">
                                <span className="text-xl">🧥</span>
                                <span className="text-[7px] uppercase font-bold mt-0.5">Vacío</span>
                            </div>
                        )}
                        <span className="text-[8px] text-center font-bold text-slate-300 truncate w-full">
                            {bodyItem?.name || 'Sin Armadura'}
                        </span>
                    </div>

                    {/* Off Hand */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400 truncate max-w-full">
                            Mano Izq.
                        </span>
                        {offHandItem ? (
                            <ItemRarityFrame
                                rarity={offHandItem.rarity}
                                isSelected={selectedItem?.id === offHandItem.id}
                                onClick={() => onSelectItem(offHandItem)}
                                className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-2 relative"
                            >
                                <SafeItemImage icon={offHandItem.icon} name={offHandItem.name} fallbackEmoji="🛡️" />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUnequipSlot(EquipmentSlot.OFF_HAND);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md z-20 border border-white/20 active:scale-90"
                                    title="Desequipar"
                                >
                                    ✕
                                </button>
                            </ItemRarityFrame>
                        ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 flex flex-col items-center justify-center text-slate-600">
                                <span className="text-xl">🛡️</span>
                                <span className="text-[7px] uppercase font-bold mt-0.5">Vacío</span>
                            </div>
                        )}
                        <span className="text-[8px] text-center font-bold text-slate-300 truncate w-full">
                            {offHandItem?.name || 'Libre'}
                        </span>
                    </div>
                </div>
            </div>

            {/* D&D 5E Core Attributes Matrix */}
            <div className="flex-1 p-3 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                <span className="text-[10px] font-serif font-black uppercase tracking-wider text-amber-300 mb-2">
                    📊 Puntuaciones D&D 5E
                </span>

                <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(activeChar.stats.attributes).map(([attr, score]) => {
                        const mod = getModifier(score);
                        const modString = mod >= 0 ? `+${mod}` : `${mod}`;

                        return (
                            <div 
                                key={attr}
                                className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col items-center text-center"
                            >
                                <span className="text-[9px] uppercase font-bold text-slate-400">{attr}</span>
                                <span className="font-mono text-xs font-bold text-white mt-0.5">{score}</span>
                                <span className={`text-[9px] font-mono font-black ${mod > 0 ? 'text-emerald-400' : mod < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                    ({modString})
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};
