import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { useContentStore } from '../store/contentStore';
import { Item, ItemRarity } from '../types';
import { sfx } from '../services/SoundSystem';
import { getThemeConfig } from '../services/themeSystem';

interface NpcGiftModalProps {
  onClose: () => void;
}

interface Npc {
  id: string;
  name: string;
  role: string;
  emoji: string;
  avatarColor: string;
  intro: string;
  successPhrase: string;
  claimedPhrase: string;
  goblinClue: string;
  type: 'dragon' | 'jade' | 'mixed';
}

export const NpcGiftModal: React.FC<NpcGiftModalProps> = ({ onClose }) => {
  const { addInventoryItem, uiTheme, addLog, progressQuestObjective } = useGameStore();
  const { items } = useContentStore();
  const themeConfig = getThemeConfig(uiTheme);

  const [selectedNpc, setSelectedNpc] = useState<Npc | null>(null);
  const [giftClaimedToday, setGiftClaimedToday] = useState(false);
  const [revealedItem, setRevealedItem] = useState<Item | null>(null);
  const [claimedNpcId, setClaimedNpcId] = useState<string | null>(null);
  const [activeDialogueMode, setActiveDialogueMode] = useState<'INTRO' | 'CLUE' | 'GIFT'>('INTRO');
  const [askedNpcClues, setAskedNpcClues] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('arcadia_npc_goblin_clues');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Emojis y personalidades fantásticas de los NPCs
  const npcs: Npc[] = [
    {
      id: 'drako',
      name: 'Drako El Forjador',
      role: 'Escultor de Huesos Ancestrales',
      emoji: '🐲',
      avatarColor: 'from-amber-600 via-orange-500 to-red-700',
      intro: 'Greetings, champion. For years I have carved and reinforced the scales and calcified breastplates of dead dragons. My work is heavy, durable, and worthy of legends. Let me present you with a piece of my craft.',
      successPhrase: 'Behold the weight and legacy of the wyrm. May this dragonbone armor stand between you and the jaws of death!',
      claimedPhrase: 'I am out of dragon bone fragments for today, champion. Come back tomorrow when my forge is rekindled.',
      goblinClue: '¡Esos malditos trasgos asaltaron una de nuestras caravanas de mineral de hierro! He visto sus huellas de barro y restos de campamento dirigiéndose hacia las colinas boscosas al noreste, en las coordenadas exactas (q: 2, r: -3). ¡Ten cuidado con sus trampas!',
      type: 'dragon'
    },
    {
      id: 'mei',
      name: 'Orfebre Mei',
      role: 'Artesana del Jade Imperial',
      emoji: '❇️',
      avatarColor: 'from-emerald-500 via-teal-600 to-green-800',
      intro: 'Welcome, traveler. Jade is not merely an ornamental gemstone—it flows with the dynamic, untamed ley energies of Arcadia’s mountains. I craft pristine weapons that strike with celestial grace. Choose wisely.',
      successPhrase: 'The emerald light approves of your destiny. May this jade weapon strike with true harmony!',
      claimedPhrase: 'The cosmic alignments restrict me to gifting only one jade artifact per day. Return tomorrow when the stars realign.',
      goblinClue: 'Las líneas de energía de Arcadia están alteradas hacia el noreste. Los goblins han construido empalizadas defensivas y tótems rúnicos de madera oscura alrededor de una caverna secreta. Están acumulando armas robadas.',
      type: 'jade'
    },
    {
      id: 'kaelen',
      name: 'Coleccionista Kaelen',
      role: 'Anticuario del Reino Esmeralda',
      emoji: '🧙‍♂️',
      avatarColor: 'from-purple-600 via-indigo-500 to-blue-700',
      intro: 'Ah, a fellow seeker of rare trinkets! I have traveled to the deep corners of Arcadia to retrieve lost artifacts. Some are forged from raw dragon bones, others are elegant jade weaponry. I shall bestow one of my findings upon you!',
      successPhrase: 'A magnificent find! Truly, an relic worthy of a true seeker. Keep it safe and keep adventuring!',
      claimedPhrase: 'My bag of rarities has been depleted for the day, seeker. Seek me tomorrow for another legendary gift!',
      goblinClue: 'Mis viejos mapas cartográficos indican una antigua caverna fortificada en las colinas (q: 2, r: -3). Su líder supremo es Grommash el Destripador, un orcoide enorme con un mayal de púas. ¡Ve preparado con tu grupo antes del asalto!',
      type: 'mixed'
    }
  ];

  // Chequear al montar si ya se reclamó el regalo hoy
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastClaimed = localStorage.getItem('last_npc_gift_date');
    if (lastClaimed === todayStr) {
      setGiftClaimedToday(true);
      const claimedByNpc = localStorage.getItem('last_npc_gift_by');
      if (claimedByNpc) {
        setClaimedNpcId(claimedByNpc);
      }
    }
  }, []);

  const handleClaimGift = (npc: Npc) => {
    if (giftClaimedToday) return;

    sfx.playVictory();

    // Filtrar ítems de la base de datos basándose en el tipo del NPC
    const dbItems = Object.values(items);
    let eligibleItems: Item[] = [];

    if (npc.type === 'dragon') {
      eligibleItems = dbItems.filter(item => item.id.startsWith('dragonbone_'));
    } else if (npc.type === 'jade') {
      eligibleItems = dbItems.filter(item => item.id.startsWith('jade_'));
    } else {
      eligibleItems = dbItems.filter(item => item.id.startsWith('dragonbone_') || item.id.startsWith('jade_'));
    }

    // Si por alguna razón no hay items calificados, dar un ítem común de fallback
    if (eligibleItems.length === 0) {
      eligibleItems = dbItems.filter(item => item.rarity === ItemRarity.LEGENDARY || item.rarity === ItemRarity.VERY_RARE);
    }

    // Elegir uno aleatorio
    const chosenItem = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
    if (!chosenItem) return;

    // Agregar al inventario real
    addInventoryItem(chosenItem);

    // Actualizar reputación de facciones
    const currentFactions = useGameStore.getState().factions || { dragon: 0, jade: 0, mixed: 0 };
    const nextFactions = { ...currentFactions };
    if (npc.type === 'dragon') {
      nextFactions.dragon = Math.min(100, nextFactions.dragon + 25);
      addLog(`📈 [Reputación] Tu afinidad con Drako y la Alianza del Dragón ha aumentado a ${nextFactions.dragon}!`, 'info');
    } else if (npc.type === 'jade') {
      nextFactions.jade = Math.min(100, nextFactions.jade + 25);
      addLog(`📈 [Reputación] Tu afinidad con Mei y la Orden de Jade ha aumentado a ${nextFactions.jade}!`, 'info');
    } else {
      nextFactions.mixed = Math.min(100, nextFactions.mixed + 25);
      addLog(`📈 [Reputación] Tu afinidad con Kaelen y el Sindicato de Exploradores ha aumentado a ${nextFactions.mixed}!`, 'info');
    }
    useGameStore.setState({ factions: nextFactions });

    // Guardar fecha de hoy para evitar múltiples reclamos
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('last_npc_gift_date', todayStr);
    localStorage.setItem('last_npc_gift_by', npc.id);

    // Actualizar estado local
    setRevealedItem(chosenItem);
    setGiftClaimedToday(true);
    setClaimedNpcId(npc.id);

    // Agregar mensaje descriptivo en el log del juego
    addLog(`[NPC] Recibiste un obsequio legendario de ${npc.name}: ${chosenItem.name}!`, 'loot');
  };

  const handleAskClue = (npc: Npc) => {
    sfx.playLevelUp();
    setActiveDialogueMode('CLUE');

    if (!askedNpcClues.includes(npc.id)) {
      const updated = [...askedNpcClues, npc.id];
      setAskedNpcClues(updated);
      try {
        localStorage.setItem('arcadia_npc_goblin_clues', JSON.stringify(updated));
      } catch (e) {}

      // Advance Quest Objective
      progressQuestObjective('GOBIN_TUTORIAL', 'OBJ_ASK_NPCS', 1);

      addLog(`🗣️ [Pista Tutorial] ${npc.name} te reveló: "${npc.goblinClue}"`, 'narrative');

      if (updated.length >= 3) {
        addLog(`🗺️ ¡Has reunido las 3 pistas de los aldeanos! La Guarida Oculta de Grommash está marcada en las colinas (q: 2, r: -3).`, 'loot');
      }
    } else {
      addLog(`🗣️ [Pista Tutorial] ${npc.name} reitera: "${npc.goblinClue}"`, 'info');
    }
  };

  const getRarityColor = (rarity: ItemRarity) => {
    switch (rarity) {
      case ItemRarity.LEGENDARY: return 'text-amber-400 border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
      case ItemRarity.VERY_RARE: return 'text-purple-400 border-purple-500 bg-purple-500/10';
      case ItemRarity.RARE: return 'text-blue-400 border-blue-500 bg-blue-500/10';
      default: return 'text-slate-300 border-slate-700 bg-slate-800/20';
    }
  };

  return (
    <div id="npc-gift-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl"
        style={{ boxShadow: '0 0 50px rgba(0, 0, 0, 0.9)' }}
      >
        {/* Decorative Top Border */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600" />

        <div className="p-6 md:p-8 flex flex-col h-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="mb-6 text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
              🗣️ Personajes de la Ciudad
            </span>
            <h2 className="mt-1 text-2xl md:text-3xl font-serif text-slate-100 tracking-tight">
              Plaza de Arcadia
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Los artesanos más célebres de Arcadia te esperan en la plaza. Ofrecen obsequios de materiales raros una vez al día.
            </p>
          </div>

          <div className="flex-1">
            <AnimatePresence mode="wait">
              {!selectedNpc ? (
                // --- SECCIÓN DE LISTADO DE NPCS ---
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {npcs.map(npc => {
                    const isClaimedByThisNpc = claimedNpcId === npc.id;
                    return (
                      <button
                        key={npc.id}
                        onClick={() => {
                          sfx.playUiClick();
                          setSelectedNpc(npc);
                        }}
                        className={`flex flex-col items-center p-5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/40 hover:border-slate-700 transition-all text-center relative group overflow-hidden`}
                      >
                        {/* Gradient Hover background */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Avatar */}
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-tr ${npc.avatarColor} flex items-center justify-center text-3xl mb-3 shadow-lg transform group-hover:scale-105 transition-transform`}>
                          {npc.emoji}
                        </div>

                        {/* Info */}
                        <h3 className="font-serif font-bold text-slate-200 group-hover:text-emerald-400 transition-colors text-sm">
                          {npc.name}
                        </h3>
                        <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5 tracking-wider">
                          {npc.role}
                        </span>

                        {/* Claimed Indicator */}
                        {giftClaimedToday ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full mt-3 font-semibold ${isClaimedByThisNpc ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                            {isClaimedByThisNpc ? 'Claimed Today' : 'Unavailable'}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full mt-3 font-semibold bg-amber-950 text-amber-400 border border-amber-800 animate-pulse">
                            Ready to Gift
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              ) : (
                // --- SECCIÓN DE DIÁLOGO E INTERACCIÓN CON EL NPC SELECCIONADO ---
                <motion.div
                  key="dialogue"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col md:flex-row gap-6 p-5 rounded-xl border border-slate-800 bg-slate-900/25"
                >
                  {/* Left Column: Big Avatar */}
                  <div className="flex flex-col items-center md:items-start shrink-0">
                    <div className={`w-24 h-24 rounded-2xl bg-gradient-to-tr ${selectedNpc.avatarColor} flex items-center justify-center text-5xl shadow-xl`}>
                      {selectedNpc.emoji}
                    </div>
                    <h3 className="font-serif font-black text-slate-100 text-lg mt-3 text-center md:text-left">
                      {selectedNpc.name}
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase mt-0.5 tracking-widest text-center md:text-left">
                      {selectedNpc.role}
                    </span>
                  </div>

                  {/* Right Column: Text & Interaction */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Dialogue Bubble */}
                      <div className="relative bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-slate-300 text-xs md:text-sm leading-relaxed italic font-mono">
                        {activeDialogueMode === 'CLUE' ? (
                          <div>
                            <span className="text-amber-400 font-bold not-italic block mb-1">
                              🗣️ Pista sobre la Guarida Goblin:
                            </span>
                            "{selectedNpc.goblinClue}"
                          </div>
                        ) : revealedItem ? (
                          selectedNpc.successPhrase 
                        ) : giftClaimedToday ? (
                          selectedNpc.claimedPhrase 
                        ) : (
                          selectedNpc.intro
                        )}
                      </div>

                      {/* Clue Progress Banner */}
                      <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span>🔍</span>
                          <span className="text-slate-300 font-bold">Pistas de la Guarida Goblin:</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                          askedNpcClues.length >= 3 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {askedNpcClues.length}/3 Pistas Reunidas {askedNpcClues.includes(selectedNpc.id) ? '✓' : ''}
                        </span>
                      </div>

                      {/* Revealed Item display */}
                      {revealedItem && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={`p-4 rounded-xl border flex gap-4 items-center ${getRarityColor(revealedItem.rarity)}`}
                        >
                          <div className="w-14 h-14 bg-slate-950/80 rounded-lg p-1.5 border border-white/10 shrink-0 shadow-inner flex items-center justify-center">
                            <img src={revealedItem.icon} alt={revealedItem.name} className="w-full h-full object-contain pixelated drop-shadow-md" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-black tracking-widest uppercase text-amber-500">
                              🎁 ¡Recibiste!
                            </span>
                            <h4 className="font-serif font-bold text-sm md:text-base text-slate-100 truncate">
                              {revealedItem.name}
                            </h4>
                            <p className="text-xs text-slate-300 line-clamp-1">
                              {revealedItem.description}
                            </p>
                            {revealedItem.equipmentStats && (
                              <div className="flex gap-2.5 mt-1 text-[10px] font-mono font-bold text-slate-400">
                                {revealedItem.equipmentStats.ac && <span>🛡️ AC +{revealedItem.equipmentStats.ac}</span>}
                                {revealedItem.equipmentStats.diceCount && (
                                  <span>⚔️ {revealedItem.equipmentStats.diceCount}d{revealedItem.equipmentStats.diceSides} Daño</span>
                                )}
                                {revealedItem.equipmentStats.modifiers && Object.entries(revealedItem.equipmentStats.modifiers).map(([stat, val]) => (
                                  <span key={stat} className="text-emerald-400">+{val} {stat}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2.5 mt-6">
                      <button
                        onClick={() => {
                          sfx.playUiClick();
                          setSelectedNpc(null);
                          setRevealedItem(null);
                          setActiveDialogueMode('INTRO');
                        }}
                        className="px-4 py-2 text-xs font-bold border border-slate-700 hover:border-slate-500 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        ⬅️ Volver
                      </button>

                      {/* Ask for Goblin Clue Button */}
                      <button
                        onClick={() => handleAskClue(selectedNpc)}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                          askedNpcClues.includes(selectedNpc.id)
                            ? 'bg-slate-800/80 text-emerald-300 border-emerald-800/60 hover:bg-slate-800'
                            : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 border-amber-400 font-serif shadow-md'
                        }`}
                      >
                        <span>🔍</span>
                        <span>
                          {askedNpcClues.includes(selectedNpc.id) 
                            ? 'Repetir Pista Goblin' 
                            : 'Preguntar por la Guarida Goblin'}
                        </span>
                      </button>

                      {!revealedItem && !giftClaimedToday && (
                        <button
                          onClick={() => {
                            setActiveDialogueMode('GIFT');
                            handleClaimGift(selectedNpc);
                          }}
                          className="py-2 px-3 text-xs font-bold rounded-lg text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500 hover:brightness-110 active:brightness-95 transition-all text-center flex items-center justify-center gap-1.5 font-serif shadow-lg shadow-emerald-500/20"
                        >
                          🎁 Regalo Diario
                        </button>
                      )}

                      {giftClaimedToday && !revealedItem && (
                        <div className="py-2 px-3 text-xs font-bold rounded-lg text-slate-500 bg-slate-950/60 border border-slate-800 text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                          <span>⏳ Reclamado hoy</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer & Close */}
          <div className="mt-8 pt-4 border-t border-slate-800/80 flex justify-end">
            <button
              onClick={() => {
                sfx.playUiClick();
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold rounded-lg text-slate-200 bg-slate-800 hover:bg-slate-700 active:brightness-95 border border-slate-700 transition-all font-serif"
            >
              Close Plaza
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
