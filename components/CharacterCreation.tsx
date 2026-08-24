import React, { useState, useMemo, useEffect } from 'react';
import { CharacterRace, CharacterClass, Attributes, Ability, Difficulty, StatGenerationMethod, EquipmentSlot, SaveSlotId } from '../types';
import { BASE_STATS, CLASS_EQUIPMENT_PACKAGES, getSprite } from '../constants';
import { 
  getModifier, 
  POINT_BUY_TOTAL, 
  STANDARD_ARRAY, 
  calculatePointBuyCost, 
  rollFullSet4d6, 
  calculateHp, 
  getHitDieForClass, 
  calculateMaxStamina, 
  getCasterSpellSlots 
} from '../services/dndRules';
import { generateFantasyName } from '../services/nameGenerator';
import { useGameStore } from '../store/gameStore';
import { useContentStore } from '../store/contentStore';
import { sfx } from '../services/SoundSystem';
import { getMostRecentSave } from '../services/saveManager';
import { SaveLoadManager } from './SaveLoadManager';
import { ClassRaceSelector } from './character/ClassRaceSelector';
import { AttributeAllocator } from './character/AttributeAllocator';
import { Character3DPreview } from './character/Character3DPreview';

import { useCharacterCreationLogic } from '../hooks/useCharacterCreationLogic';

interface CharacterCreationProps {
  onComplete: (name: string, race: CharacterRace, cls: CharacterClass, stats: Attributes, difficulty: Difficulty, startingPackageId?: string) => void;
  onOpenAdmin?: () => void;
}

export const CharacterCreation: React.FC<CharacterCreationProps> = ({ onComplete, onOpenAdmin }) => {
  const {
    step,
    setStep,
    name,
    setName,
    race,
    setRace,
    cls,
    setCls,
    difficulty,
    setDifficulty,
    selectedPackageId,
    setSelectedPackageId,
    statMethod,
    setStatMethod,
    baseScores,
    setBaseScores,
    diceRollsData,
    savedGameInfo,
    showSaveManagerModal,
    setShowSaveManagerModal,
    loadGame,
    raceBonus,
    checkSavedGames,
    pointBuyUsed,
    pointBuyRemaining,
    finalStats,
    previewHitDie,
    previewMaxHp,
    previewMaxStamina,
    previewSpellSlots,
    previewInitiative,
    availablePackages,
    currentPackage,
    previewAc,
    spriteUrl,
    handleRoll4d6,
    handleNext
  } = useCharacterCreationLogic(onComplete);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#242528] font-sans custom-scrollbar">
      {/* Background Ambience & Noise */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-[#242528] to-black pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} />

      {/* Main Container */}
      <div className="min-h-full flex items-center justify-center p-4 py-8 md:py-12">
          
          <div className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/20 p-6 md:p-10 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] max-w-5xl w-full text-amber-50 transition-all relative overflow-hidden group">
            
            {/* Ornamental Corners */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-amber-500/30 rounded-tl-xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-amber-500/30 rounded-tr-xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-amber-500/30 rounded-bl-xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-amber-500/30 rounded-br-xl pointer-events-none" />

            {/* Header */}
            <header className="text-center mb-6 md:mb-10 relative flex flex-col items-center justify-center">
                {onOpenAdmin && (
                    <button
                        type="button"
                        onClick={() => {
                            sfx.playUiClick();
                            onOpenAdmin();
                        }}
                        className="mb-4 md:mb-0 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 px-4 py-2 text-xs font-bold tracking-wide rounded-xl border border-amber-500/30 hover:border-amber-400 bg-slate-950/80 hover:bg-amber-500/10 text-amber-300 hover:text-amber-200 transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer z-20 group"
                    >
                        <span className="text-sm transition-transform group-hover:rotate-45 duration-300">⚙️</span>
                        <span>Admin Panel</span>
                    </button>
                )}
                <h1 className="text-4xl md:text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-yellow-100 to-amber-500 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] mb-3 tracking-wide">
                    Create Your Hero
                </h1>
                
                {/* Step indicator breadcrumb */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-3 text-[10px] md:text-xs uppercase tracking-[0.12em] text-slate-300 font-bold mt-1 bg-slate-950/40 px-4 py-2 rounded-full border border-slate-800/60 shadow-inner">
                  <span className={`px-2.5 py-1 rounded-md transition-all ${step === 1 ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-extrabold' : 'text-slate-400 hover:text-slate-300'}`}>1. Lineage</span>
                  <span className="text-slate-700 font-normal">›</span>
                  <span className={`px-2.5 py-1 rounded-md transition-all ${step === 2 ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-extrabold' : 'text-slate-400 hover:text-slate-300'}`}>2. Class & Gear</span>
                  <span className="text-slate-700 font-normal">›</span>
                  <span className={`px-2.5 py-1 rounded-md transition-all ${step === 3 ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-extrabold' : 'text-slate-400 hover:text-slate-300'}`}>3. Attributes</span>
                  <span className="text-slate-700 font-normal">›</span>
                  <span className={`px-2.5 py-1 rounded-md transition-all ${step === 4 ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-extrabold' : 'text-slate-400 hover:text-slate-300'}`}>4. Embark</span>
                </div>

                {savedGameInfo && step === 1 && (
                  <div className="mt-4 max-w-xl mx-auto bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border border-amber-500/50 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-in fade-in">
                    <div className="text-left w-full sm:w-auto">
                      <div className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span>💾</span> Previous Adventure Found ({savedGameInfo.slotId === 'auto_save' ? 'Auto-Save' : savedGameInfo.slotId.replace('_', ' ').toUpperCase()})
                      </div>
                      <div className="text-sm font-serif font-bold text-amber-100 mt-0.5">
                        {savedGameInfo.heroName} <span className="text-amber-400/80 font-sans text-xs font-normal">(Lvl {savedGameInfo.level} {savedGameInfo.heroRace} {savedGameInfo.heroClass})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-0.5">
                        <span>📍 {savedGameInfo.location}</span>
                        <span>•</span>
                        <span>Saved: {savedGameInfo.dateStr}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playUiClick();
                          setShowSaveManagerModal(true);
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-lg border border-slate-600 transition-all cursor-pointer"
                        title="Manage all slots or import backup"
                      >
                        Slots / Import
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playVictory();
                          loadGame(savedGameInfo.slotId);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-amber-500/30 transition-all cursor-pointer flex items-center gap-1"
                      >
                        Resume →
                      </button>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mt-4" />
            </header>

            {/* STEP 1 & STEP 2 */}
            {(step === 1 || step === 2) && (
              <ClassRaceSelector 
                step={step}
                name={name}
                setName={setName}
                race={race}
                setRace={setRace}
                cls={cls}
                setCls={setCls}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                raceBonus={raceBonus}
                availablePackages={availablePackages}
                selectedPackageId={selectedPackageId}
                setSelectedPackageId={setSelectedPackageId}
              />
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <AttributeAllocator 
                statMethod={statMethod}
                setStatMethod={setStatMethod}
                baseScores={baseScores}
                setBaseScores={setBaseScores}
                finalStats={finalStats}
                race={race}
                raceBonus={raceBonus}
                pointBuyRemaining={pointBuyRemaining}
                diceRollsData={diceRollsData}
                handleRoll4d6={handleRoll4d6}
                previewMaxHp={previewMaxHp}
                previewHitDie={previewHitDie}
                previewAc={previewAc}
                previewInitiative={previewInitiative}
                previewSpellSlots={previewSpellSlots}
                previewMaxStamina={previewMaxStamina}
              />
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <Character3DPreview 
                name={name}
                race={race}
                cls={cls}
                difficulty={difficulty}
                currentPackage={currentPackage}
                finalStats={finalStats}
                previewMaxHp={previewMaxHp}
                previewAc={previewAc}
                previewInitiative={previewInitiative}
                spriteUrl={spriteUrl}
              />
            )}

            {/* Footer / Navigation */}
            <div className="mt-8 md:mt-12 flex justify-between items-center border-t border-white/5 pt-6">
                <button 
                    onClick={() => { sfx.playUiClick(); setStep(Math.max(1, step-1)); }} 
                    className={`text-slate-400 hover:text-amber-200 flex items-center gap-2 transition-colors px-4 py-2 text-xs uppercase tracking-widest font-bold cursor-pointer ${step === 1 ? 'invisible' : ''}`}
                >
                    ← Back
                </button>
                
                {/* Step Indicators */}
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === step ? 'bg-amber-500 scale-125 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-slate-800'}`} />
                    ))}
                </div>

                <button 
                    onClick={handleNext}
                    className="
                        group relative bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 
                        text-white px-8 md:px-10 py-3 rounded-xl shadow-lg shadow-amber-900/40 
                        transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-amber-500/30
                        cursor-pointer overflow-hidden
                    "
                >
                    <span className="relative flex items-center gap-2 font-bold font-serif tracking-widest text-xs md:text-sm">
                        {step === 4 ? 'EMBARK ADVENTURE' : 'CONTINUE'} 
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                </button>
            </div>

          </div>
      </div>

      {/* Save / Load Manager Modal */}
      {showSaveManagerModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💾</span>
                <div>
                  <h3 className="text-lg font-serif font-bold text-amber-100">Saved Adventures & Cloud Portability</h3>
                  <p className="text-xs text-slate-400">Select a save slot to load or import your adventure JSON backup</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sfx.playUiClick();
                  setShowSaveManagerModal(false);
                  checkSavedGames();
                }}
                className="w-8 h-8 rounded-full border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <SaveLoadManager 
              onClose={() => {
                setShowSaveManagerModal(false);
                checkSavedGames();
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};
