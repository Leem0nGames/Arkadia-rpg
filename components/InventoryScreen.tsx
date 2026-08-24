import React, { useState } from 'react';
import { EquipmentSlot } from '../types';
import { CharacterEquipmentSheet } from './inventory/CharacterEquipmentSheet';
import { InventoryGrid } from './inventory/InventoryGrid';
import { ItemDetailCard } from './inventory/ItemDetailCard';
import { SpellGraphBuilder } from './SpellGraphBuilder';
import { sfx } from '../services/SoundSystem';
import { useInventoryLogic } from '../hooks/useInventoryLogic';
import { useGameStore } from '../store/gameStore';

export const InventoryScreen: React.FC = () => {
    const {
        inventory,
        party,
        activeChar,
        activeCharId,
        setActiveCharId,
        selectedItem,
        mobileTab,
        setMobileTab,
        gold,
        hasActed,
        gameState,
        handleSelectItem,
        handleEquip,
        handleUnequip,
        handleConsume,
        handleClose
    } = useInventoryLogic();

    const [activeMode, setActiveMode] = useState<'INVENTORY' | 'RUNES' | 'FACTIONS'>('INVENTORY');
    const { factions } = useGameStore();

    if (!activeChar) return null;

    const currentFactions = factions || { dragon: 0, jade: 0, mixed: 0 };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200 p-2 sm:p-4 lg:p-6 pointer-events-auto select-none">
            
            {/* Main Fantasy Parchment / Stone Modal Container */}
            <div className="w-full max-w-7xl h-full max-h-[94dvh] flex flex-col relative overflow-hidden bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-3 sm:p-4 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
                
                {/* Global Close Button */}
                <button 
                    onClick={handleClose}
                    className="absolute top-3 right-3 lg:top-4 lg:right-4 z-50 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center border border-white/20 bg-slate-900/90 text-amber-300 hover:bg-slate-800 shadow-xl transition-transform active:scale-90 font-black text-sm"
                    aria-label="Cerrar Zurrón"
                >
                    ✕
                </button>

                {/* Sub-Header Mode Select Tabs */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 shrink-0">
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => { sfx.playUiClick(); setActiveMode('INVENTORY'); }}
                            className={`px-3.5 py-2 rounded-xl text-[10px] font-serif font-black uppercase tracking-wider transition-all flex items-center gap-1.5 min-h-[44px] ${
                                activeMode === 'INVENTORY' 
                                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg border border-amber-500/40' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                        >
                            <span>🎒</span> Equipo e Inventario
                        </button>
                        <button
                            onClick={() => { sfx.playUiClick(); setActiveMode('RUNES'); }}
                            className={`px-3.5 py-2 rounded-xl text-[10px] font-serif font-black uppercase tracking-wider transition-all flex items-center gap-1.5 min-h-[44px] ${
                                activeMode === 'RUNES' 
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg border border-purple-500/40' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                        >
                            <span>🔮</span> Forja Rúnica
                        </button>
                        <button
                            onClick={() => { sfx.playUiClick(); setActiveMode('FACTIONS'); }}
                            className={`px-3.5 py-2 rounded-xl text-[10px] font-serif font-black uppercase tracking-wider transition-all flex items-center gap-1.5 min-h-[44px] ${
                                activeMode === 'FACTIONS' 
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg border border-emerald-500/40' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                        >
                            <span>📈</span> Facciones
                        </button>
                    </div>
                    <div className="pr-12 text-[9px] font-mono text-slate-400 font-bold hidden sm:block">
                        Foco: <span className="text-amber-400 font-black">{activeChar.name}</span> ({activeChar.stats.class})
                    </div>
                </div>

                {activeMode === 'RUNES' ? (
                    /* The Runic Graph Spell Synthesizer */
                    <div className="flex-1 min-h-0">
                        <SpellGraphBuilder activeChar={activeChar} />
                    </div>
                ) : activeMode === 'FACTIONS' ? (
                    /* Factions Standing Visualizer Panel */
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
                        <div className="text-center max-w-xl mx-auto mb-2">
                            <h3 className="text-lg font-serif font-black text-amber-300">📜 Conexión de la Historia y Facciones</h3>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                Tus interacciones con los mentores de Arcadia alteran el equilibrio cósmico. Tu reputación debilita o enfurece a los guardianes procedimentales de las mazmorras.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto w-full">
                            {/* Alianza del Dragón */}
                            <div className="bg-slate-900/85 rounded-2xl border border-orange-500/20 p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-orange-500/40 transition-colors">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/5 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-600/10 transition-colors"></div>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🐲</span>
                                    <div>
                                        <h4 className="text-sm font-serif font-black text-orange-400">Alianza del Dragón</h4>
                                        <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Mentor: Drako El Forjador</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                    Escultores y cazadores de wyrms. Afecta a guardianes de tipo marcial (Caballeros, Esqueletos, Orcos).
                                </p>
                                <div className="mt-2">
                                    <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 mb-1">
                                        <span>Reputación</span>
                                        <span className={currentFactions.dragon >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                            {currentFactions.dragon > 0 ? '+' : ''}{currentFactions.dragon} / 100
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-white/5 flex">
                                        {/* Progressive color slider bar from -100 to +100 */}
                                        <div 
                                            className="h-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-500"
                                            style={{ width: `${Math.max(5, Math.min(100, ((currentFactions.dragon + 100) / 2)))}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-[9px] font-mono text-slate-400 bg-black/40 p-2 rounded-lg mt-auto">
                                    {currentFactions.dragon > 10 ? '✅ Guardianes debilitados en combate físico.' : currentFactions.dragon < -10 ? '🚨 ¡Fuerzas enemigas enfurecidas y potenciadas!' : 'Neutral: Sin modificaciones en combate.'}
                                </div>
                            </div>

                            {/* Orden de Jade */}
                            <div className="bg-slate-900/85 rounded-2xl border border-emerald-500/20 p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-600/10 transition-colors"></div>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">❇️</span>
                                    <div>
                                        <h4 className="text-sm font-serif font-black text-emerald-400">Orden de Jade</h4>
                                        <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Mentora: Orfebre Mei</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                    Guardianes de la energía celestial de Arcadia. Afecta a guardianes de tipo mágico (Wraiths, Espectros, Necromantes).
                                </p>
                                <div className="mt-2">
                                    <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 mb-1">
                                        <span>Reputación</span>
                                        <span className={currentFactions.jade >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                            {currentFactions.jade > 0 ? '+' : ''}{currentFactions.jade} / 100
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-white/5 flex">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
                                            style={{ width: `${Math.max(5, Math.min(100, ((currentFactions.jade + 100) / 2)))}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-[9px] font-mono text-slate-400 bg-black/40 p-2 rounded-lg mt-auto">
                                    {currentFactions.jade > 10 ? '✅ Hechiceros debilitados en combate mágico.' : currentFactions.jade < -10 ? '🚨 ¡Fuerzas espectrales enfurecidas y potenciadas!' : 'Neutral: Sin modificaciones en combate.'}
                                </div>
                            </div>

                            {/* Sindicato de Exploradores */}
                            <div className="bg-slate-900/85 rounded-2xl border border-blue-500/20 p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-600/10 transition-colors"></div>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🧙‍♂️</span>
                                    <div>
                                        <h4 className="text-sm font-serif font-black text-blue-400">Sindicato de Exploradores</h4>
                                        <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Mentor: Kaelen Coleccionista</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                    Buscadores de reliquias perdidas y tesoros ancestrales en las ruinas más recónditas de Arcadia.
                                </p>
                                <div className="mt-2">
                                    <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 mb-1">
                                        <span>Reputación</span>
                                        <span className={currentFactions.mixed >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                            {currentFactions.mixed > 0 ? '+' : ''}{currentFactions.mixed} / 100
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-white/5 flex">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
                                            style={{ width: `${Math.max(5, Math.min(100, ((currentFactions.mixed + 100) / 2)))}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-[9px] font-mono text-slate-400 bg-black/40 p-2 rounded-lg mt-auto">
                                    {currentFactions.mixed > 10 ? '✅ Mayor probabilidad de encontrar cofres raros en mazmorras.' : 'Neutral: Sin modificaciones de exploración.'}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Normal Inventory View */
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
                        
                        {/* Mobile View Switcher Tabs (< 1024px) */}
                        <div className="lg:hidden col-span-1 flex items-center justify-between gap-1 bg-slate-900/80 p-1 rounded-2xl border border-white/10 shrink-0 pr-12">
                            <button
                                onClick={() => {
                                    sfx.playUiClick();
                                    setMobileTab('POUCH');
                                }}
                                className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                    mobileTab === 'POUCH'
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <span>🎒</span>
                                <span>Zurrón</span>
                            </button>

                            <button
                                onClick={() => {
                                    sfx.playUiClick();
                                    setMobileTab('HERO');
                                }}
                                className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                    mobileTab === 'HERO'
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <span>🥋</span>
                                <span>Equipo</span>
                            </button>

                            <button
                                onClick={() => {
                                    sfx.playUiClick();
                                    setMobileTab('DETAILS');
                                }}
                                className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                    mobileTab === 'DETAILS'
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <span>📜</span>
                                <span>Detalles</span>
                            </button>
                        </div>

                        {/* COLUMN 1: CHARACTER HERO EQUIPMENT & STATS SHEET (4 cols on lg) */}
                        <div className={`lg:col-span-4 h-full min-h-0 ${mobileTab === 'HERO' ? 'block' : 'hidden lg:block'}`}>
                            <CharacterEquipmentSheet
                                party={party}
                                activeChar={activeChar}
                                selectedItem={selectedItem}
                                onSelectChar={setActiveCharId}
                                onSelectItem={handleSelectItem}
                                onUnequipSlot={(slot) => handleUnequip(slot, activeChar.id)}
                            />
                        </div>

                        {/* COLUMN 2: ADVENTURER'S POUCH GRID (4 or 5 cols on lg) */}
                        <div className={`lg:col-span-4 xl:col-span-5 h-full min-h-0 ${mobileTab === 'POUCH' ? 'block' : 'hidden lg:block'}`}>
                            <InventoryGrid
                                inventory={inventory}
                                party={party}
                                selectedItem={selectedItem}
                                gold={gold}
                                maxCapacity={24}
                                onSelectItem={handleSelectItem}
                            />
                        </div>

                        {/* COLUMN 3: DEEP RPG ITEM INSPECTION & ACTIONS CARD (4 or 3 cols on lg) */}
                        <div className={`lg:col-span-4 xl:col-span-3 h-full min-h-0 ${mobileTab === 'DETAILS' ? 'block' : 'hidden lg:block'}`}>
                            <ItemDetailCard
                                item={selectedItem}
                                activeChar={activeChar}
                                party={party}
                                gameState={gameState}
                                hasActed={hasActed}
                                onEquip={handleEquip}
                                onUnequip={handleUnequip}
                                onConsume={handleConsume}
                                onClose={mobileTab === 'DETAILS' ? () => setMobileTab('POUCH') : undefined}
                            />
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
};
