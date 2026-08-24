import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useContentStore } from '../store/contentStore';
import { CAMPAIGNS } from '../data/campaigns';
import { sfx } from '../services/SoundSystem';
import { CharacterClass, Item } from '../types';
import { ITEMS } from '../constants';

export const AdventurersGuildModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { 
        acceptQuest, 
        quests, 
        progressQuestObjective, 
        party, 
        addLog,
        initiatePostBattleLevelUp
    } = useGameStore();

    const [rewardClaimed, setRewardClaimed] = useState(false);

    const dragonQuest = quests.find(q => q.id === 'DRAGON_HUNT');
    const hasDragonHunt = !!dragonQuest;
    const isCompleted = dragonQuest?.completed;

    const cluesObj = dragonQuest?.objectives?.find(o => o.id === 'OBJ_CLUES');
    const dungeonObj = dragonQuest?.objectives?.find(o => o.id === 'OBJ_DUNGEON_ENEMIES');
    const dragonObj = dragonQuest?.objectives?.find(o => o.id === 'OBJ_KILL_DRAGON');
    const returnObj = dragonQuest?.objectives?.find(o => o.id === 'OBJ_RETURN_GUILD');

    const isDragonDefeated = dragonObj?.completed;
    const canClaimReward = isDragonDefeated && !isCompleted && !rewardClaimed;

    // Determine party leader's character class
    const leader = party[0];
    const leaderClass: CharacterClass = leader?.stats?.class || CharacterClass.FIGHTER;

    // Determine tailored Dragonbone Armor and Jade Weapon
    const getClassRewards = (c: CharacterClass) => {
        let armorKey = 'DRAGONBONE_PLATE_FIGHTER';
        let weaponKey = 'JADE_GREATSWORD';
        let extraKey: string | null = 'JADE_SHIELD';

        switch (c) {
            case CharacterClass.FIGHTER:
                armorKey = 'DRAGONBONE_PLATE_FIGHTER';
                weaponKey = 'JADE_GREATSWORD';
                extraKey = 'JADE_SHIELD';
                break;
            case CharacterClass.PALADIN:
                armorKey = 'DRAGONBONE_CRUSADER_PALADIN';
                weaponKey = 'JADE_LONGSWORD';
                extraKey = 'JADE_SHIELD';
                break;
            case CharacterClass.BARBARIAN:
                armorKey = 'DRAGONBONE_HARNESS_BARBARIAN';
                weaponKey = 'JADE_GREATAXE';
                extraKey = null;
                break;
            case CharacterClass.ROGUE:
                armorKey = 'DRAGONBONE_SHROUD_ROGUE';
                weaponKey = 'JADE_DAGGER';
                extraKey = null;
                break;
            case CharacterClass.RANGER:
                armorKey = 'DRAGONBONE_MANTLE_RANGER';
                weaponKey = 'JADE_BOW';
                extraKey = null;
                break;
            case CharacterClass.CLERIC:
                armorKey = 'DRAGONBONE_VESTMENTS_CLERIC';
                weaponKey = 'JADE_MACE';
                extraKey = 'JADE_SHIELD';
                break;
            case CharacterClass.DRUID:
                armorKey = 'DRAGONBONE_REGALIA_DRUID';
                weaponKey = 'JADE_STAFF';
                extraKey = null;
                break;
            case CharacterClass.WIZARD:
                armorKey = 'DRAGONBONE_ROBES_WIZARD';
                weaponKey = 'JADE_STAFF';
                extraKey = null;
                break;
            case CharacterClass.SORCERER:
                armorKey = 'DRAGONBONE_GARB_SORCERER';
                weaponKey = 'JADE_SCEPTRE';
                extraKey = null;
                break;
            case CharacterClass.WARLOCK:
                armorKey = 'DRAGONBONE_RAIMENT_WARLOCK';
                weaponKey = 'JADE_SCEPTRE';
                extraKey = null;
                break;
            case CharacterClass.BARD:
                armorKey = 'DRAGONBONE_DOUBLET_BARD';
                weaponKey = 'JADE_DAGGER';
                extraKey = null;
                break;
        }

        const allItems = useContentStore.getState().items || ITEMS;
        const armorItem: Item = allItems[armorKey] || ITEMS[armorKey];
        const weaponItem: Item = allItems[weaponKey] || ITEMS[weaponKey];
        const extraItem: Item | null = extraKey ? (allItems[extraKey] || ITEMS[extraKey]) : null;

        return { armorItem, weaponItem, extraItem };
    };

    const { armorItem, weaponItem, extraItem } = getClassRewards(leaderClass);

    const handleAcceptCampaign = () => {
        sfx.playUiClick();
        acceptQuest(CAMPAIGNS.DRAGON_HUNT);
    };

    const handleClaimLegendaryReward = () => {
        sfx.playVictory();
        setRewardClaimed(true);

        // Add items to inventory
        const newInventory = [...useGameStore.getState().inventory];
        const itemsToGive = [armorItem, weaponItem, extraItem].filter(Boolean) as Item[];

        itemsToGive.forEach(item => {
            const existing = newInventory.find(slot => slot.item.id === item.id);
            if (existing) {
                existing.quantity++;
            } else {
                newInventory.push({ item, quantity: 1 });
            }
        });

        // Award Gold to party/rewards
        const currentRewards = useGameStore.getState().battleRewards || { xp: 0, gold: 0, items: [] };
        useGameStore.setState({
            inventory: newInventory,
            battleRewards: {
                ...currentRewards,
                gold: currentRewards.gold + 2500
            }
        });

        // Grant XP to party
        if (initiatePostBattleLevelUp) {
            initiatePostBattleLevelUp(2000);
        }

        // Progress and finish quest
        progressQuestObjective('DRAGON_HUNT', 'OBJ_RETURN_GUILD', 1);

        addLog(`🏆 ¡RECOMPENSA RECLAMADA! Has recibido ${armorItem?.name}, ${weaponItem?.name}${extraItem ? `, ${extraItem.name}` : ''}, +2500 Oro y +2000 XP!`, 'loot');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden max-w-xl w-full flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-amber-900/60 bg-gradient-to-r from-amber-950/60 to-slate-900 flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-serif font-bold text-amber-400 flex items-center gap-2">
                        <span className="text-2xl">⚔️</span> Gremio de Aventureros de Arcadia
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white transition-colors w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                    {/* Guildmaster Greeting */}
                    <div className="flex gap-4 items-start p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className="w-12 h-12 rounded-full bg-amber-900/50 border border-amber-600 flex items-center justify-center text-2xl shrink-0">
                            🧙‍♂️
                        </div>
                        <div className="text-sm text-slate-300 leading-relaxed">
                            <span className="font-bold text-amber-300 block mb-1">Maestre Vane del Gremio:</span>
                            {isCompleted || rewardClaimed ? (
                                <span>"¡Salud a los Matadragones! Toda Arcadia canta sus hazañas. Portad vuestro equipo de hueso de dragón y jade con orgullo."</span>
                            ) : canClaimReward ? (
                                <span>"¡Por los dioses antiguos! ¡Traéis el corazón ardiente del Gran Dragón Rojo! Vuestra hazaña pasará a los anales de la historia. Aquí tenéis la recompensa prometida."</span>
                            ) : hasDragonHunt ? (
                                <span>"El dragón acecha en las profundidades. Reúne 3 pistas en ruinas o cuevas para abrir las entradas al dungeon subterráneo, despeja a sus guardianes y cruza el portal."</span>
                            ) : (
                                <span>"Buscamos héroes con el valor para enfrentarse a la amenaza más temible de nuestro reino: el Gran Dragón Rojo Ancestral."</span>
                            )}
                        </div>
                    </div>

                    {/* Campaign Card */}
                    <div className="p-5 border border-amber-500/30 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-3xl">🐉</span>
                                <div>
                                    <h4 className="text-lg font-serif font-bold text-amber-200">{CAMPAIGNS.DRAGON_HUNT.title}</h4>
                                    <span className="text-xs uppercase tracking-wider text-amber-500 font-bold">Campaña Principal Legendaria</span>
                                </div>
                            </div>
                            {isCompleted || rewardClaimed ? (
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-bold rounded-full">
                                    ★ COMPLETADA
                                </span>
                            ) : hasDragonHunt ? (
                                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/50 text-xs font-bold rounded-full">
                                    EN CURSO
                                </span>
                            ) : null}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{CAMPAIGNS.DRAGON_HUNT.description}</p>

                        {/* Objectives Tracker if Active */}
                        {hasDragonHunt && (
                            <div className="p-3.5 bg-slate-950/70 rounded-lg border border-slate-700/80 space-y-2">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Progreso de la Campaña:</h5>
                                <div className="space-y-1.5 text-xs">
                                    <div className={`flex items-center justify-between ${cluesObj?.completed ? 'text-emerald-400 line-through' : 'text-amber-300 font-medium'}`}>
                                        <span>1. Recolectar 3 Pistas de Dragón (Ruinas/Cuevas)</span>
                                        <span className="font-mono">{cluesObj?.currentProgress || 0}/3</span>
                                    </div>
                                    <div className={`flex items-center justify-between ${dungeonObj?.completed ? 'text-emerald-400 line-through' : cluesObj?.completed ? 'text-amber-300 font-medium' : 'text-slate-500'}`}>
                                        <span>2. Derrotar a los 4 Guardianes del Dungeon Voxel (3 Salas)</span>
                                        <span className="font-mono">{dungeonObj?.currentProgress || 0}/4</span>
                                    </div>
                                    <div className={`flex items-center justify-between ${dragonObj?.completed ? 'text-emerald-400 line-through' : dungeonObj?.completed ? 'text-amber-300 font-medium' : 'text-slate-500'}`}>
                                        <span>3. Cazar al Gran Dragón Rojo en su Guarida 3D</span>
                                        <span className="font-mono">{dragonObj?.currentProgress || 0}/1</span>
                                    </div>
                                    <div className={`flex items-center justify-between ${isCompleted || rewardClaimed ? 'text-emerald-400 line-through' : dragonObj?.completed ? 'text-amber-300 font-bold animate-pulse' : 'text-slate-500'}`}>
                                        <span>4. Cobrar Recompensa en el Gremio de la Ciudad</span>
                                        <span className="font-mono">{isCompleted || rewardClaimed ? '1/1' : '0/1'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reward Showcase */}
                        <div className="pt-2 border-t border-slate-700/60">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-1.5">
                                <span>🎁</span> Recompensa Legendaria (Adaptada para {leader?.name || 'tu Héroe'} - {leaderClass}):
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="p-2.5 bg-slate-950/80 rounded-lg border border-amber-500/40 flex items-center gap-2">
                                    <span className="text-xl">🛡️</span>
                                    <div className="min-w-0">
                                        <div className="text-[11px] font-bold text-amber-300 truncate">{armorItem?.name || 'Armadura de Dragón'}</div>
                                        <div className="text-[9px] text-slate-400">Set Hueso de Dragón</div>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-slate-950/80 rounded-lg border border-emerald-500/40 flex items-center gap-2">
                                    <span className="text-xl">🗡️</span>
                                    <div className="min-w-0">
                                        <div className="text-[11px] font-bold text-emerald-300 truncate">{weaponItem?.name || 'Arma de Jade'}</div>
                                        <div className="text-[9px] text-slate-400">Arma Legendaria de Jade</div>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-slate-950/80 rounded-lg border border-yellow-500/40 flex items-center gap-2">
                                    <span className="text-xl">💰</span>
                                    <div className="min-w-0">
                                        <div className="text-[11px] font-bold text-yellow-300">+2,500 Oro</div>
                                        <div className="text-[9px] text-slate-400">+2,000 EXP de Grupo</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 flex justify-end gap-3">
                            {!hasDragonHunt && (
                                <button 
                                    onClick={handleAcceptCampaign}
                                    className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 px-6 rounded-xl border border-amber-400/50 shadow-lg shadow-amber-900/40 active:scale-95 transition-all text-sm uppercase tracking-wide cursor-pointer"
                                >
                                    ⚔️ Aceptar Campaña del Dragón
                                </button>
                            )}

                            {canClaimReward && (
                                <button 
                                    onClick={handleClaimLegendaryReward}
                                    className="w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-rose-600 hover:from-yellow-400 hover:to-rose-500 text-slate-950 font-black py-3.5 px-6 rounded-xl border border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.6)] active:scale-95 transition-all text-sm uppercase tracking-widest animate-bounce cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <span>🏆</span> Reclamar Recompensa Legendaria
                                </button>
                            )}

                            {(isCompleted || rewardClaimed) && (
                                <div className="w-full py-2.5 px-4 bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-bold text-center rounded-xl text-xs flex items-center justify-center gap-2">
                                    <span>👑</span> ¡Recompensa ya reclamada! Eres el Campeón de Arcadia.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
