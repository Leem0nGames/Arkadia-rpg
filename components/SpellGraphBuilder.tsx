import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useContentStore } from '../store/contentStore';
import { useGameStore } from '../store/gameStore';
import { sfx } from '../services/SoundSystem';
import { Spell, SpellType, Entity } from '../types';

interface SpellGraphBuilderProps {
  activeChar: Entity;
  onClose?: () => void;
}

// Node Type Declarations
type RuneType = 'BASE' | 'CORE' | 'MODIFIER';

interface RuneNode {
  id: string;
  name: string;
  type: RuneType;
  color: string;
  icon: string;
  description: string;
  modifierEffect?: any;
}

// Available Runes Configuration
const BASE_RUNES: RuneNode[] = [
  { id: 'FUEGO', name: 'Runa de Fuego', type: 'BASE', color: '#f97316', icon: '🔥', description: 'Canaliza llamas intensas. Causa quemaduras.' },
  { id: 'HIELO', name: 'Runa de Hielo', type: 'BASE', color: '#38bdf8', icon: '❄️', description: 'Fuerza gélida del norte. Reduce la velocidad del objetivo.' },
  { id: 'RAYO', name: 'Runa de Rayo', type: 'BASE', color: '#a855f7', icon: '⚡', description: 'Electricidad inestable. Alta probabilidad de impacto crítico.' },
  { id: 'SAGRADO', name: 'Runa Sagrada', type: 'BASE', color: '#eab308', icon: '✨', description: 'Luz pura y divina. Sanadora o destructora de no-muertos.' },
  { id: 'VACIO', name: 'Runa del Vacío', type: 'BASE', color: '#10b981', icon: '🌀', description: 'Fuerza de la dimensión inversa. Causa efectos caóticos.' }
];

const CORE_RUNES: RuneNode[] = [
  { id: 'PROYECTIL', name: 'Núcleo Proyectil', type: 'CORE', color: '#fb7185', icon: '🏹', description: 'Hechizo de larga distancia para un único objetivo.' },
  { id: 'EXPLOSION', name: 'Núcleo Explosión', type: 'CORE', color: '#ef4444', icon: '💥', description: 'Estalla en un área de efecto, dañando múltiples casillas.' },
  { id: 'RAFAGA', name: 'Núcleo Ráfaga', type: 'CORE', color: '#ec4899', icon: '🌪️', description: 'Múltiples ráfagas rápidas de corto rango.' },
  { id: 'OLA', name: 'Núcleo Ola', type: 'CORE', color: '#6366f1', icon: '🌊', description: 'Proyecta una onda de energía frente a ti.' },
  { id: 'SANACION', name: 'Núcleo Sanación', type: 'CORE', color: '#22c55e', icon: '💚', description: 'Restaura la vitalidad de tus aliados.' }
];

const MODIFIER_RUNES: RuneNode[] = [
  { id: 'RANGO', name: 'Runa de Rango', type: 'MODIFIER', color: '#fb923c', icon: '📏', description: 'Aumenta el rango de alcance del hechizo en +2.' },
  { id: 'AREA', name: 'Runa de Área', type: 'MODIFIER', color: '#818cf8', icon: '🎯', description: 'Expande el área o número de objetivos.' },
  { id: 'DANIO', name: 'Runa de Fuerza', type: 'MODIFIER', color: '#f43f5e', icon: '🔺', description: 'Aumenta las caras del dado de daño/curación (de d6 a d8, d8 a d10).' },
  { id: 'EFICIENCIA', name: 'Runa de Eficiencia', type: 'MODIFIER', color: '#34d399', icon: '🛡️', description: 'Reduce el coste de ranura mágica en 1 (mínimo 0).' },
  { id: 'EMPUJE', name: 'Runa de Empuje', type: 'MODIFIER', color: '#fbbf24', icon: '💨', description: 'Empuja o ralentiza al objetivo impactado.' }
];

export const SpellGraphBuilder: React.FC<SpellGraphBuilderProps> = ({ activeChar, onClose }) => {
  const { spells, classSpells, createSpell, updateClassSpells } = useContentStore();
  const [selectedBase, setSelectedBase] = useState<RuneNode | null>(null);
  const [selectedCore, setSelectedCore] = useState<RuneNode | null>(null);
  const [selectedMod1, setSelectedMod1] = useState<RuneNode | null>(null);
  const [selectedMod2, setSelectedMod2] = useState<RuneNode | null>(null);

  const [activeSlot, setActiveSlot] = useState<'BASE' | 'CORE' | 'MOD1' | 'MOD2' | null>(null);
  const [synthesizedSpell, setSynthesizedSpell] = useState<Spell | null>(null);

  // Validation & Conflict Resolution Rules
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!selectedBase) errors.push('Falta una Runa de Elemento Base.');
    if (!selectedCore) errors.push('Falta un Núcleo Mecánico de Conjuro.');
    
    if (selectedCore && selectedBase) {
      // Holy Base + Healing Core is a perfect match
      // Void Base + Healing Core is a major conflict!
      if (selectedBase.id === 'VACIO' && selectedCore.id === 'SANACION') {
        errors.push('Incompatibilidad: Las runas del Vacío anulan las energías de Sanación.');
      }
      // Fire Base + Ice modifiers?
      if (selectedMod1?.id === 'EMPUJE' && selectedMod2?.id === 'EMPUJE') {
        errors.push('Incompatibilidad: No puedes equipar dos Runas de Empuje idénticas.');
      }
      if (selectedMod1 && selectedMod2 && selectedMod1.id === selectedMod2.id) {
        errors.push('Incompatibilidad: Los modificadores rúnicos deben ser únicos.');
      }
    }
    return errors;
  }, [selectedBase, selectedCore, selectedMod1, selectedMod2]);

  // Derived Spell Stats based on active Graph configuration
  const derivedSpellStats = useMemo(() => {
    if (!selectedBase || !selectedCore) return null;

    let spellType = SpellType.DAMAGE;
    if (selectedCore.id === 'SANACION') {
      spellType = SpellType.HEAL;
    }

    let level = 1;
    let baseRange = 4;
    let diceCount = 2;
    let diceSides = 6;
    let manaCost = 1;

    // Apply Core Base Parameters
    switch (selectedCore.id) {
      case 'PROYECTIL':
        baseRange = 6;
        diceCount = 2;
        diceSides = 8;
        manaCost = 1;
        break;
      case 'EXPLOSION':
        baseRange = 4;
        diceCount = 3;
        diceSides = 6;
        manaCost = 2;
        break;
      case 'RAFAGA':
        baseRange = 2;
        diceCount = 4;
        diceSides = 4;
        manaCost = 1;
        break;
      case 'OLA':
        baseRange = 3;
        diceCount = 2;
        diceSides = 6;
        manaCost = 1;
        break;
      case 'SANACION':
        baseRange = 3;
        diceCount = 2;
        diceSides = 8;
        manaCost = 1;
        break;
    }

    // Apply Base Runic Tints / Properties
    switch (selectedBase.id) {
      case 'FUEGO':
        diceSides += 2; // Flame bursts
        break;
      case 'RAYO':
        level = 2; // Electrifying
        break;
      case 'VACIO':
        diceCount += 1; // Chaotic extra dice
        manaCost += 1;
        break;
      case 'SAGRADO':
        if (selectedCore.id === 'SANACION') {
          diceSides += 2; // Extra healing power
        }
        break;
    }

    // Apply Modifier Adjustments
    const activeModifiers = [selectedMod1, selectedMod2].filter(Boolean) as RuneNode[];
    activeModifiers.forEach(mod => {
      switch (mod.id) {
        case 'RANGO':
          baseRange += 2;
          break;
        case 'DANIO':
          diceSides += 2;
          break;
        case 'EFICIENCIA':
          manaCost = Math.max(0, manaCost - 1);
          break;
        case 'AREA':
          diceCount += 1;
          break;
        case 'EMPUJE':
          // Standard effect, no direct stat impact
          break;
      }
    });

    // Procedural Name synthesis
    let spellName = '';
    const baseNames: Record<string, string> = {
      FUEGO: 'Piro',
      HIELO: 'Criox',
      RAYO: 'Fulgor',
      SAGRADO: 'Aura',
      VACIO: 'Nox'
    };
    const coreNames: Record<string, string> = {
      PROYECTIL: 'Saeta',
      EXPLOSION: 'Detonación',
      RAFAGA: 'Tormenta',
      OLA: 'Onda',
      SANACION: 'Plegaria'
    };
    const modSuffix = selectedMod1 ? ` ${selectedMod1.name.replace('Runa de ', '')}` : '';

    if (selectedCore.id === 'SANACION') {
      spellName = `${coreNames[selectedCore.id]} ${selectedBase.id === 'SAGRADO' ? 'Celestial' : 'Rúnica'}`;
    } else {
      spellName = `${coreNames[selectedCore.id]} de ${baseNames[selectedBase.id]}`;
    }

    if (selectedMod1) {
      spellName += ` Ampliada`;
    }

    // Description creation
    let description = `Hechizo modular de ${selectedBase.name.toLowerCase()}. `;
    description += `Libera un ${selectedCore.name.toLowerCase()} `;
    if (activeModifiers.length > 0) {
      description += `con efectos mejorados de: ${activeModifiers.map(m => m.name.replace('Runa de ', '')).join(' e ')}.`;
    } else {
      description += `con trayectoria lineal pura.`;
    }

    // Map to beautiful Visual Sprite Animations
    let animation = 'MAGIC_SPELL';
    if (selectedBase.id === 'FUEGO') animation = 'FIRE';
    else if (selectedBase.id === 'HIELO') animation = 'FREEZING';
    else if (selectedBase.id === 'RAYO') animation = 'VORTEX';
    else if (selectedBase.id === 'SAGRADO') animation = 'SUNBURN';
    else if (selectedBase.id === 'VACIO') animation = 'FEL_SPELL';

    return {
      id: `CUSTOM_${selectedBase.id}_${selectedCore.id}_${Date.now()}`,
      name: spellName,
      level,
      range: baseRange,
      type: spellType,
      diceCount,
      diceSides,
      description,
      animation,
      manaCost
    };
  }, [selectedBase, selectedCore, selectedMod1, selectedMod2]);

  // Handle slot click
  const handleSlotClick = (slot: 'BASE' | 'CORE' | 'MOD1' | 'MOD2') => {
    sfx.playUiClick();
    setActiveSlot(slot === activeSlot ? null : slot);
  };

  // Select a rune for active slot
  const handleSelectRune = (rune: RuneNode) => {
    sfx.playUiClick();
    if (activeSlot === 'BASE') setSelectedBase(rune);
    else if (activeSlot === 'CORE') setSelectedCore(rune);
    else if (activeSlot === 'MOD1') setSelectedMod1(rune);
    else if (activeSlot === 'MOD2') setSelectedMod2(rune);
    setActiveSlot(null);
  };

  // Synthesize & save spell
  const handleSynthesize = () => {
    if (validationErrors.length > 0 || !derivedSpellStats) {
      sfx.playUiClose();
      return;
    }

    sfx.playLevelUp(); // majestic level up sound for success!
    const newSpell = derivedSpellStats;

    // 1. Create the Spell in content store
    createSpell(newSpell);

    // 2. Register the spell in this character class's spells
    const charClass = activeChar.stats.class;
    const currentClassSpellIds = classSpells[charClass] || [];
    if (!currentClassSpellIds.includes(newSpell.id)) {
      const updatedSpellIds = [...currentClassSpellIds, newSpell.id];
      updateClassSpells(charClass, updatedSpellIds);
    }

    setSynthesizedSpell(newSpell);

    // Auto clear selections after synthesis
    setTimeout(() => {
      setSynthesizedSpell(null);
      setSelectedBase(null);
      setSelectedCore(null);
      setSelectedMod1(null);
      setSelectedMod2(null);
    }, 4500);
  };

  const getRuneOptions = () => {
    if (activeSlot === 'BASE') return BASE_RUNES;
    if (activeSlot === 'CORE') return CORE_RUNES;
    if (activeSlot === 'MOD1' || activeSlot === 'MOD2') return MODIFIER_RUNES;
    return [];
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/80 border border-white/10 rounded-3xl overflow-hidden relative p-3 sm:p-5 select-none">
      
      {/* Title & Concept Header */}
      <div className="mb-4 text-center shrink-0">
        <h2 className="font-serif font-black text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-amber-200 to-purple-400 uppercase tracking-widest">
          🔮 Forja Rúnica de Conjuros
        </h2>
        <p className="text-[10px] text-slate-400 font-medium mt-1">
          Combina elementos arcanos bajo la gramática de grafos para sintetizar hechizos para el <span className="text-amber-400 font-bold">{activeChar.stats.class}</span>.
        </p>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0 overflow-y-auto custom-scrollbar">
        
        {/* LEFT COLUMN: The Graphical Rune Slots Visual (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-center items-center bg-slate-900/40 rounded-2xl border border-white/5 relative p-4 min-h-[280px]">
          
          {/* Subtle magical vector lines connecting nodes as a structured Graph */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-purple-500/20 stroke-[1.5] stroke-dasharray-[4,4] overflow-visible">
            {/* Base node connects to Core */}
            <line x1="30%" y1="50%" x2="50%" y2="50%" className="animate-pulse" />
            {/* Core connects to Modifier 1 and Modifier 2 */}
            <line x1="50%" y1="50%" x2="70%" y2="35%" />
            <line x1="50%" y1="50%" x2="70%" y2="65%" />
          </svg>

          {/* Node Grid Layout */}
          <div className="flex items-center justify-around w-full gap-2 relative z-10 max-w-lg">
            
            {/* NODE 1: ELEMENT BASE */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">1. Base</span>
              <button
                onClick={() => handleSlotClick('BASE')}
                style={{ borderColor: selectedBase?.color || 'rgba(255,255,255,0.15)' }}
                className={`w-14 h-14 rounded-full border-2 bg-slate-950/90 shadow-xl flex items-center justify-center text-xl transition-all relative ${
                  activeSlot === 'BASE' ? 'ring-2 ring-purple-400 scale-110' : 'active:scale-95'
                }`}
              >
                {selectedBase ? (
                  <span className="animate-bounce-slow">{selectedBase.icon}</span>
                ) : (
                  <span className="text-slate-600 text-sm">✦</span>
                )}
                {selectedBase && (
                  <div 
                    style={{ backgroundColor: selectedBase.color }}
                    className="absolute -bottom-1 px-1.5 py-0.5 rounded-full text-[6px] font-mono font-black text-slate-950 uppercase"
                  >
                    {selectedBase.id}
                  </div>
                )}
              </button>
              <span className="text-[9px] font-bold text-slate-300 truncate max-w-[80px]">
                {selectedBase?.name.replace('Runa de ', '') || 'Elemento'}
              </span>
            </div>

            {/* NODE 2: CORE ACTION */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">2. Núcleo</span>
              <button
                onClick={() => handleSlotClick('CORE')}
                style={{ borderColor: selectedCore?.color || 'rgba(255,255,255,0.15)' }}
                className={`w-16 h-16 rounded-2xl border-2 bg-slate-950/90 shadow-2xl flex items-center justify-center text-2xl transition-all relative ${
                  activeSlot === 'CORE' ? 'ring-2 ring-purple-400 scale-110' : 'active:scale-95'
                }`}
              >
                {selectedCore ? (
                  <span className="animate-pulse">{selectedCore.icon}</span>
                ) : (
                  <span className="text-slate-600 text-base">⬡</span>
                )}
                {selectedCore && (
                  <div 
                    style={{ backgroundColor: selectedCore.color }}
                    className="absolute -bottom-1.5 px-1.5 py-0.5 rounded-full text-[6px] font-mono font-black text-slate-950 uppercase"
                  >
                    {selectedCore.id}
                  </div>
                )}
              </button>
              <span className="text-[9px] font-bold text-slate-300 truncate max-w-[85px]">
                {selectedCore?.name.replace('Núcleo ', '') || 'Mecánica'}
              </span>
            </div>

            {/* NODE 3 & 4: MODIFIERS (Stacked Vertically on the Right) */}
            <div className="flex flex-col gap-4">
              
              {/* MODIFIER 1 */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Mod 1</span>
                  <span className="text-[9px] text-slate-300 font-medium truncate max-w-[70px]">
                    {selectedMod1?.name.replace('Runa de ', '') || 'Vacío'}
                  </span>
                </div>
                <button
                  onClick={() => handleSlotClick('MOD1')}
                  style={{ borderColor: selectedMod1?.color || 'rgba(255,255,255,0.15)' }}
                  className={`w-11 h-11 rotate-45 border bg-slate-950/90 shadow-lg flex items-center justify-center transition-all ${
                    activeSlot === 'MOD1' ? 'ring-2 ring-purple-400 scale-115' : 'active:scale-95'
                  }`}
                >
                  <div className="-rotate-45 text-sm">
                    {selectedMod1 ? selectedMod1.icon : '◇'}
                  </div>
                </button>
              </div>

              {/* MODIFIER 2 */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Mod 2</span>
                  <span className="text-[9px] text-slate-300 font-medium truncate max-w-[70px]">
                    {selectedMod2?.name.replace('Runa de ', '') || 'Vacío'}
                  </span>
                </div>
                <button
                  onClick={() => handleSlotClick('MOD2')}
                  style={{ borderColor: selectedMod2?.color || 'rgba(255,255,255,0.15)' }}
                  className={`w-11 h-11 rotate-45 border bg-slate-950/90 shadow-lg flex items-center justify-center transition-all ${
                    activeSlot === 'MOD2' ? 'ring-2 ring-purple-400 scale-115' : 'active:scale-95'
                  }`}
                >
                  <div className="-rotate-45 text-sm">
                    {selectedMod2 ? selectedMod2.icon : '◇'}
                  </div>
                </button>
              </div>

            </div>

          </div>

          {/* Floating Dropdown Node Selector Panel */}
          <AnimatePresence>
            {activeSlot && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className="absolute inset-x-4 bottom-4 z-20 bg-slate-950/95 border border-purple-500/30 p-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl max-h-[160px] overflow-y-auto custom-scrollbar"
              >
                <div className="flex justify-between items-center mb-2 shrink-0">
                  <span className="text-[9px] font-serif font-black uppercase text-purple-300 tracking-wider">
                    Selecciona Runa: {activeSlot}
                  </span>
                  <button onClick={() => setActiveSlot(null)} className="text-[9px] text-slate-500 hover:text-white font-bold p-1">
                    Cerrar
                  </button>
                </div>
                <div className="grid grid-cols-2 xs:grid-cols-3 gap-1.5">
                  {getRuneOptions().map(rune => (
                    <button
                      key={rune.id}
                      onClick={() => handleSelectRune(rune)}
                      className="flex items-center gap-1.5 p-1.5 rounded-xl border border-white/5 hover:border-purple-500/30 bg-slate-900/50 hover:bg-purple-950/20 text-left transition-all text-[9px] active:scale-95"
                    >
                      <span className="text-sm shrink-0">{rune.icon}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-200 truncate">{rune.name}</div>
                        <div className="text-[7px] text-slate-400 truncate">{rune.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* RIGHT COLUMN: Interactive Validation & Spell Stats Forecast (5 cols) */}
        <div className="md:col-span-5 flex flex-col justify-between bg-slate-900/60 rounded-2xl border border-white/5 p-3 sm:p-4 min-h-[280px]">
          
          <div className="flex-1 min-h-0 flex flex-col justify-between">
            <span className="text-[10px] font-serif font-black uppercase tracking-wider text-purple-300 mb-2">
              📜 Análisis del Conjuro
            </span>

            {/* Validation Panel */}
            {validationErrors.length > 0 ? (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 flex-1 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-rose-300 flex items-center gap-1 mb-1.5">
                  ⚠️ Restricciones del Grafo Rúnico:
                </span>
                <div className="space-y-1 overflow-y-auto max-h-[140px] custom-scrollbar text-left">
                  {validationErrors.map((err, i) => (
                    <div key={i} className="text-[8px] text-rose-200 flex items-start gap-1">
                      <span>•</span> <span className="leading-tight">{err}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : derivedSpellStats ? (
              /* High quality stats display */
              <div className="bg-purple-950/10 border border-purple-500/20 rounded-xl p-3 flex-1 flex flex-col justify-between relative overflow-hidden">
                
                {/* Glowing spell element accent line */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 transition-all"
                  style={{ backgroundColor: selectedBase?.color || '#a855f7' }}
                />

                <div className="pl-1.5 flex-1 flex flex-col justify-between gap-1.5">
                  
                  {/* Name & Type */}
                  <div className="text-left">
                    <span className="text-[7px] font-mono uppercase tracking-widest text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                      Conjuro Rúnico Validado
                    </span>
                    <h4 className="font-serif font-black text-sm text-amber-200 mt-1 leading-tight">
                      {derivedSpellStats.name}
                    </h4>
                    <p className="text-[8px] text-slate-300 mt-0.5 leading-tight italic">
                      "{derivedSpellStats.description}"
                    </p>
                  </div>

                  {/* Combat Stats Forecast Grid */}
                  <div className="grid grid-cols-2 gap-1.5 my-1 text-left">
                    <div className="p-1.5 bg-slate-950/50 border border-white/5 rounded-lg flex flex-col">
                      <span className="text-[7px] uppercase font-bold text-slate-400">Poder Rúnico</span>
                      <span className="text-[10px] font-mono font-black text-rose-400">
                        {derivedSpellStats.diceCount}d{derivedSpellStats.diceSides} {derivedSpellStats.type === SpellType.HEAL ? '💚' : '💥'}
                      </span>
                    </div>

                    <div className="p-1.5 bg-slate-950/50 border border-white/5 rounded-lg flex flex-col">
                      <span className="text-[7px] uppercase font-bold text-slate-400">Ranura de Maná</span>
                      <span className="text-[10px] font-mono font-black text-cyan-400">
                        {derivedSpellStats.manaCost} slots
                      </span>
                    </div>

                    <div className="p-1.5 bg-slate-950/50 border border-white/5 rounded-lg flex flex-col">
                      <span className="text-[7px] uppercase font-bold text-slate-400">Alcance</span>
                      <span className="text-[10px] font-mono font-black text-amber-400">
                        {derivedSpellStats.range} casillas ({derivedSpellStats.range * 5} pies)
                      </span>
                    </div>

                    <div className="p-1.5 bg-slate-950/50 border border-white/5 rounded-lg flex flex-col">
                      <span className="text-[7px] uppercase font-bold text-slate-400">Efecto Visual</span>
                      <span className="text-[10px] font-mono font-black text-emerald-400 truncate">
                        {derivedSpellStats.animation?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              /* Awaiting selection instructions */
              <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 flex-1 flex flex-col items-center justify-center text-center">
                <span className="text-xl animate-pulse">🔮</span>
                <span className="text-[9px] text-slate-400 font-bold mt-2">
                  Selecciona runas base y de núcleo en el panel izquierdo para forjar el conjuro.
                </span>
              </div>
            )}
          </div>

          {/* Action Trigger Synthesize Button */}
          <div className="mt-3 shrink-0">
            <button
              onClick={handleSynthesize}
              disabled={validationErrors.length > 0 || !derivedSpellStats}
              className={`w-full min-h-[44px] py-2 px-3 rounded-xl border text-xs font-serif font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xl ${
                validationErrors.length > 0 || !derivedSpellStats
                  ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-purple-400 text-white active:scale-95'
              }`}
            >
              <span>✨</span> <span>Sintetizar Conjuro</span>
            </button>
          </div>

        </div>

      </div>

      {/* Synthesis Success Majestic Overlay Screen */}
      <AnimatePresence>
        {synthesizedSpell && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center"
          >
            {/* Visual particles burst effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15)_0%,transparent_70%)] animate-pulse" />
            
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="relative z-10 max-w-sm"
            >
              <span className="text-5xl mb-4 block animate-bounce-slow">🔮</span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded border border-purple-500/30">
                ¡Conjuración Exitosa!
              </span>
              <h3 className="font-serif font-black text-lg text-amber-300 mt-3 uppercase tracking-wider">
                {synthesizedSpell.name}
              </h3>
              <p className="text-[10px] text-slate-300 mt-2 leading-relaxed px-4">
                El hechizo rúnico ha sido ligado a la memoria celular de los conjuradores de clase <span className="text-amber-400 font-bold">{activeChar.stats.class}</span>. ¡Úsalo libremente en tu próximo encuentro táctico!
              </p>

              {/* Holographic Stat Card */}
              <div className="mt-4 p-3 bg-slate-900/80 border border-white/10 rounded-2xl text-left font-mono">
                <div className="text-[8px] text-slate-400">ESTADÍSTICAS RÚNICAS</div>
                <div className="flex justify-between mt-1 text-[10px]">
                  <span className="text-slate-300">Poder:</span>
                  <span className="text-rose-400 font-bold">{synthesizedSpell.diceCount}d{synthesizedSpell.diceSides}</span>
                </div>
                <div className="flex justify-between mt-1 text-[10px]">
                  <span className="text-slate-300">Rango:</span>
                  <span className="text-amber-400 font-bold">{synthesizedSpell.range} casillas</span>
                </div>
                <div className="flex justify-between mt-1 text-[10px]">
                  <span className="text-slate-300">Coste de Ranura:</span>
                  <span className="text-cyan-400 font-bold">{synthesizedSpell.manaCost} Ranuras</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
