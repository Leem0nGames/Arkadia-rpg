import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BattleAction, Entity, Spell } from '../types';
import { useContentStore } from '../store/contentStore';
import { useGameStore } from '../store/gameStore';
import { sfx } from '../services/SoundSystem';
import { SpritesheetButton, SpritesheetButtonType } from './ui/SpritesheetButton';

interface BG3RadialMenuProps {
    activeEntity: Entity;
    hasMoved: boolean;
    hasActed: boolean;
    activeActionMode: BattleAction | null;
    onAction: (action: BattleAction) => void;
    onWait: () => void;
    onRun: () => void;
    themeConfig: any;
}

type RadialSubMenu = 'main' | 'spells' | 'items';

export const BG3RadialMenu: React.FC<BG3RadialMenuProps> = ({
    activeEntity,
    hasMoved,
    hasActed,
    activeActionMode,
    onAction,
    onWait,
    onRun,
    themeConfig
}) => {
    const isRadialMenuOpen = useGameStore(state => state.isRadialMenuOpen);
    const setRadialMenuOpen = useGameStore(state => state.setRadialMenuOpen);
    const setHoveredActionPreview = useGameStore(state => state.setHoveredActionPreview);
    const selectSpell = useGameStore(state => state.selectSpell);
    const selectedSpell = useGameStore(state => state.selectedSpell);
    const inventory = useGameStore(state => state.inventory);
    const consumeItem = useGameStore(state => state.consumeItem);

    const isOpen = isRadialMenuOpen;
    const setIsOpen = setRadialMenuOpen;
    
    const [activeSubMenu, setActiveSubMenu] = useState<RadialSubMenu>('main');
    const [hoveredInfo, setHoveredInfo] = useState<{
        title: string;
        cost: string;
        costColor: string;
        description: string;
    } | null>(null);

    // Spells available for this character
    const { spells: contentSpells, classSpells: contentClassSpells } = useContentStore();
    const availableSpells: Spell[] = useMemo(() => {
        if (!activeEntity?.stats?.class) return [];
        const spellIds = contentClassSpells[activeEntity.stats.class] || [];
        return spellIds
            .map(id => (contentSpells[id.toUpperCase()] || contentSpells[id]) as Spell)
            .filter(Boolean);
    }, [activeEntity?.stats?.class, contentClassSpells, contentSpells]);

    const hasSpells = availableSpells.length > 0;
    const spellSlotsLeft = activeEntity?.stats?.spellSlots?.current ?? 0;
    const spellSlotsMax = activeEntity?.stats?.spellSlots?.max ?? 0;

    // Consumable items in inventory
    const usableItems = useMemo(() => {
        return (inventory || [])
            .filter(slot => slot && slot.item && (slot.item.type === 'consumable'))
            .map(slot => ({ ...slot.item, quantity: slot.quantity }));
    }, [inventory]);

    // Reset menu state when turn changes or active entity changes
    useEffect(() => {
        setRadialMenuOpen(true);
        setActiveSubMenu('main');
        setHoveredInfo(null);
    }, [activeEntity?.id, setRadialMenuOpen]);

    // Close menu whenever ANY action mode is active (Move, Attack, Magic, Consume) so grid tiles remain 100% visible
    useEffect(() => {
        if (activeActionMode !== null) {
            setRadialMenuOpen(false);
        } else if (activeActionMode === null && !hasActed) {
            setRadialMenuOpen(true);
        }
    }, [activeActionMode, hasActed, setRadialMenuOpen]);

    const mainActionItems: {
        id: string;
        actionId: BattleAction;
        label: string;
        cost: string;
        costColor: string;
        description: string;
        type: SpritesheetButtonType;
        disabled: boolean;
        onClick: () => void;
        activeGlow: string;
    }[] = [
        {
            id: 'action_move',
            actionId: BattleAction.MOVE,
            label: 'Mover',
            cost: 'Movimiento',
            costColor: 'text-sky-300 border-sky-500/40 bg-sky-950/60',
            description: `Desplázate por el tablero (${Math.floor((activeEntity?.stats?.speed || 30) / 5)} casillas max).`,
            type: 'MOVE',
            disabled: hasMoved,
            onClick: () => {
                sfx.playUiClick();
                onAction(BattleAction.MOVE);
            },
            activeGlow: 'ring-2 ring-sky-400 shadow-[0_0_20px_#38bdf8] scale-110'
        },
        {
            id: 'action_attack',
            actionId: BattleAction.ATTACK,
            label: 'Ataque Físico',
            cost: 'Acción Principal',
            costColor: 'text-amber-300 border-amber-500/40 bg-amber-950/60',
            description: 'Ataque cuerpo a cuerpo o a distancia según tu arma equipada.',
            type: 'ATTACK',
            disabled: hasActed,
            onClick: () => {
                sfx.playUiClick();
                onAction(BattleAction.ATTACK);
            },
            activeGlow: 'ring-2 ring-red-400 shadow-[0_0_20px_#f87171] scale-110'
        },
        ...(hasSpells ? [{
            id: 'action_spells_dial',
            actionId: BattleAction.MAGIC,
            label: 'Grimorio / Hechizos',
            cost: `${spellSlotsLeft}/${spellSlotsMax} Ranuras`,
            costColor: 'text-purple-300 border-purple-500/40 bg-purple-950/60',
            description: 'Abre el dial radial de conjuros arcanos y curaciones.',
            type: 'MAGIC' as SpritesheetButtonType,
            disabled: hasActed,
            onClick: () => {
                sfx.playUiClick();
                setActiveSubMenu('spells');
            },
            activeGlow: 'ring-2 ring-purple-400 shadow-[0_0_20px_#c084fc] scale-110'
        }] : []),
        {
            id: 'action_items_dial',
            actionId: BattleAction.ITEM,
            label: 'Objetos / Zurrón',
            cost: `${usableItems.length} Disponibles`,
            costColor: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/60',
            description: 'Usa pociones de salud, filtros o pergaminos en el dial radial.',
            type: 'ITEM',
            disabled: hasActed || usableItems.length === 0,
            onClick: () => {
                sfx.playUiClick();
                setActiveSubMenu('items');
            },
            activeGlow: 'ring-2 ring-emerald-400 shadow-[0_0_20px_#34d399] scale-110'
        },
        {
            id: 'action_wait',
            actionId: BattleAction.WAIT,
            label: 'Terminar Turno',
            cost: 'Sin Costo',
            costColor: 'text-slate-300 border-slate-500/40 bg-slate-900/60',
            description: 'Finaliza tu turno y pasa la iniciativa al siguiente combatiente.',
            type: 'WAIT',
            disabled: false,
            onClick: () => {
                sfx.playUiClick();
                onWait();
            },
            activeGlow: 'ring-2 ring-slate-200 shadow-[0_0_20px_#94a3b8] scale-110'
        },
        {
            id: 'action_run',
            actionId: BattleAction.RUN,
            label: 'Huir',
            cost: 'Acción Principal',
            costColor: 'text-orange-300 border-orange-500/40 bg-orange-950/60',
            description: 'Intenta retirar al grupo de la refriega hacia un lugar seguro.',
            type: 'RUN',
            disabled: hasActed,
            onClick: () => {
                sfx.playUiClick();
                onRun();
            },
            activeGlow: 'ring-2 ring-orange-400 shadow-[0_0_20px_#fb923c] scale-110'
        }
    ];

    // --- Spells Sub-Dial Actions ---
    const spellRadialItems = useMemo(() => {
        const backBtn = {
            id: 'spell_back',
            label: 'Volver',
            cost: 'Menú Principal',
            costColor: 'text-amber-300 border-amber-500/40 bg-amber-950/60',
            description: 'Regresa al dial de acciones principales.',
            type: 'BACK' as SpritesheetButtonType,
            disabled: false,
            onClick: () => {
                sfx.playUiClick();
                setActiveSubMenu('main');
            },
            activeGlow: ''
        };

        const list = availableSpells.map(spell => {
            const isCantrip = spell.level === 0;
            const canCast = isCantrip || spellSlotsLeft > 0;
            const isSelected = selectedSpell?.id === spell.id;

            return {
                id: `spell_${spell.id}`,
                label: spell.name,
                cost: isCantrip ? 'Truco (Gratis)' : `Nv. ${spell.level} (1 Ranura)`,
                costColor: isCantrip ? 'text-cyan-300 border-cyan-500/40 bg-cyan-950/60' : 'text-purple-300 border-purple-500/40 bg-purple-950/60',
                description: spell.description || `${spell.type === 'HEAL' ? 'Cura aliados' : 'Daña enemigos'} (Alcance: ${spell.range || 6}).`,
                type: 'MAGIC' as SpritesheetButtonType,
                badge: isCantrip ? '0' : `Nv${spell.level}`,
                disabled: !canCast || hasActed,
                onClick: () => {
                    sfx.playUiClick();
                    selectSpell(spell.id);
                    onAction(BattleAction.MAGIC);
                },
                colorClass: isCantrip ? 'border-cyan-400 shadow-cyan-500/40 text-cyan-200 bg-slate-950/80' : 'border-purple-400 shadow-purple-500/40 text-purple-200 bg-purple-950/80',
                activeGlow: isSelected ? 'ring-2 ring-purple-400 shadow-[0_0_20px_#a855f7] scale-110' : ''
            };
        });

        return [backBtn, ...list];
    }, [availableSpells, spellSlotsLeft, selectedSpell, hasActed, selectSpell, onAction]);

    // --- Items Sub-Dial Actions ---
    const itemRadialItems = useMemo(() => {
        const backBtn = {
            id: 'item_back',
            label: 'Volver',
            cost: 'Menú Principal',
            costColor: 'text-amber-300 border-amber-500/40 bg-amber-950/60',
            description: 'Regresa al dial de acciones principales.',
            type: 'BACK' as SpritesheetButtonType,
            disabled: false,
            onClick: () => {
                sfx.playUiClick();
                setActiveSubMenu('main');
            },
            activeGlow: ''
        };

        const list = usableItems.slice(0, 5).map((item, idx) => {
            return {
                id: `item_${item.id}_${idx}`,
                label: item.name,
                cost: 'Acción Rápida',
                costColor: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/60',
                description: item.description || 'Consume este objeto inmediatamente.',
                type: 'ITEM' as SpritesheetButtonType,
                badge: `${item.quantity || 1}`,
                disabled: hasActed,
                onClick: () => {
                    sfx.playUiClick();
                    consumeItem(item.id);
                    setActiveSubMenu('main');
                },
                colorClass: 'border-emerald-400 shadow-emerald-500/40 text-emerald-200 bg-emerald-950/80',
                activeGlow: ''
            };
        });

        return [backBtn, ...list];
    }, [usableItems, hasActed, consumeItem]);

    // Determine current active item set to render in arc
    const currentRenderItems = activeSubMenu === 'spells' 
        ? spellRadialItems 
        : activeSubMenu === 'items' 
            ? itemRadialItems 
            : mainActionItems;

    // Geometric parameters for unit-centered 360-degree circular radial menu
    const totalCount = currentRenderItems.length;
    const radius = 96; // Radius around unit in pixels

    return (
        <div id="bg3-radial-menu-root" className="relative flex items-center justify-center pointer-events-auto select-none z-50">
            {/* Active Action Mode Compact Banner (When Radial Menu is Closed for Tile Selection) */}
            {!isOpen && activeActionMode !== null && (
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        className="absolute -top-[120px] left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full border border-amber-500/60 bg-slate-950/95 backdrop-blur-2xl shadow-2xl flex items-center gap-2 z-50 whitespace-nowrap"
                    >
                        <span className="text-sm">
                            {activeActionMode === BattleAction.MOVE ? '🚶' : activeActionMode === BattleAction.ATTACK ? '⚔️' : activeActionMode === BattleAction.MAGIC ? '✨' : '🧪'}
                        </span>
                        <span className="text-[11px] sm:text-xs font-bold text-amber-300 font-serif">
                            {activeActionMode === BattleAction.MOVE ? 'Moverse — Toca una casilla' : activeActionMode === BattleAction.ATTACK ? 'Ataque — Toca objetivo' : activeActionMode === BattleAction.MAGIC ? 'Lanzar Conjuro — Toca objetivo' : 'Usar Objeto'}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                sfx.playUiClick();
                                onAction(null as any);
                                setRadialMenuOpen(true);
                            }}
                            className="ml-1 px-2 py-0.5 rounded-full bg-red-950/90 border border-red-500/60 text-red-300 text-[10px] font-mono font-bold hover:bg-red-900 active:scale-95 transition-all cursor-pointer shadow-md"
                        >
                            ✕ Cancelar
                        </button>
                    </motion.div>
                </AnimatePresence>
            )}

            {/* Floating Info Banner Centered Above Unit when Radial Menu is open */}
            <AnimatePresence>
                {isOpen && hoveredInfo && (
                    <motion.div 
                        initial={{ opacity: 0, y: -6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        className="absolute -top-[140px] left-1/2 -translate-x-1/2 w-[220px] sm:w-[250px] p-2 rounded-2xl border border-amber-500/40 bg-slate-950/90 backdrop-blur-2xl shadow-2xl flex flex-col gap-1 z-50 text-center"
                    >
                        <div className="flex justify-between items-center gap-1 border-b border-white/10 pb-1">
                            <span className="text-[10px] font-black uppercase text-amber-300 font-serif truncate">
                                {hoveredInfo.title}
                            </span>
                            <span className={`text-[7.5px] font-mono px-1.5 py-0.5 rounded-full border uppercase tracking-wider font-extrabold whitespace-nowrap ${hoveredInfo.costColor}`}>
                                {hoveredInfo.cost}
                            </span>
                        </div>
                        <p className="text-[9.5px] leading-relaxed text-slate-300 font-sans">
                            {hoveredInfo.description}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Circular Radial Menu Container Centered on Active Unit */}
            <div className="relative w-0 h-0 flex items-center justify-center">
                {/* Connecting Fan Rays from Center Hub to Radial Nodes */}
                <svg className="absolute -left-[140px] -top-[140px] w-[280px] h-[280px] pointer-events-none z-10 overflow-visible">
                    <AnimatePresence>
                        {isOpen && currentRenderItems.map((item, index) => {
                            const angle = (index / totalCount) * (2 * Math.PI) - (Math.PI / 2);
                            const x = Math.cos(angle) * radius + 140;
                            const y = Math.sin(angle) * radius + 140;

                            return (
                                <motion.line
                                    key={item.id}
                                    initial={{ x2: 140, y2: 140, opacity: 0 }}
                                    animate={{ x2: x, y2: y, opacity: 0.4 }}
                                    exit={{ x2: 140, y2: 140, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                                    x1={140}
                                    y1={140}
                                    stroke="#f59e0b"
                                    strokeWidth="1.5"
                                    strokeDasharray="3,3"
                                />
                            );
                        })}
                    </AnimatePresence>
                </svg>

                {/* Floating Translucent Radial Node Buttons in 360 Ring */}
                <AnimatePresence mode="popLayout">
                    {isOpen && currentRenderItems.map((item, index) => {
                        const angle = (index / totalCount) * (2 * Math.PI) - (Math.PI / 2);
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;

                        const isCurrentlySelected = 'actionId' in item && activeActionMode === item.actionId;

                        return (
                            <SpritesheetButton
                                key={item.id}
                                id={item.id}
                                type={item.type as SpritesheetButtonType}
                                title={item.label}
                                disabled={item.disabled}
                                selected={!!isCurrentlySelected}
                                onClick={item.onClick}
                                onMouseEnter={() => setHoveredInfo({
                                    title: item.label,
                                    cost: item.cost,
                                    costColor: item.costColor,
                                    description: item.description
                                })}
                                onMouseLeave={() => setHoveredInfo(null)}
                                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                animate={{ x, y, scale: 1, opacity: 1 }}
                                exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                transition={{ 
                                    type: 'spring', 
                                    stiffness: 280, 
                                    damping: 22,
                                    delay: index * 0.02
                                }}
                                style={{ 
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    transform: 'translate(-50%, -50%)'
                                }}
                                className={`
                                    !w-12 !h-12 border-2 shadow-2xl active:scale-90 transition-all cursor-pointer touch-manipulation z-40
                                    ${isCurrentlySelected ? item.activeGlow : ''}
                                `}
                            />
                        );
                    })}
                </AnimatePresence>

                {/* Central Unit Thumb Trigger Hub */}
                <button
                    onClick={() => {
                        sfx.playUiClick();
                        if (activeSubMenu !== 'main') {
                            setActiveSubMenu('main');
                        } else {
                            setIsOpen(!isOpen);
                        }
                    }}
                    style={{
                        transform: 'translate(-50%, -50%)'
                    }}
                    className={`
                        absolute left-0 top-0 w-13 h-13 rounded-full 
                        border-2 border-amber-400/90 bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center 
                        shadow-2xl overflow-hidden cursor-pointer z-30 transition-all active:scale-90 touch-manipulation
                        ${isOpen ? 'ring-2 ring-amber-400/60 shadow-[0_0_16px_rgba(251,191,36,0.6)]' : 'shadow-black/90'}
                    `}
                    title="Control de Batalla Unitaria"
                >
                    {activeSubMenu !== 'main' ? (
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-base text-amber-300 font-black">↩️</span>
                            <span className="text-[7px] text-amber-300 font-bold uppercase mt-0.5">Atrás</span>
                        </div>
                    ) : isOpen ? (
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-sm font-black text-amber-400">✕</span>
                            <span className="text-[6px] text-amber-400/80 uppercase tracking-widest font-black mt-0.5">Cerrar</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-lg select-none leading-none animate-pulse">🎯</span>
                            <span className="text-[7px] text-amber-400 font-black uppercase tracking-wider scale-90 mt-0.5">Acción</span>
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
};
