import { useState, useMemo, useEffect } from 'react';
import { CharacterRace, CharacterClass, Attributes, Ability, Difficulty, StatGenerationMethod, EquipmentSlot, SaveSlotId } from '../types';
import { BASE_STATS, CLASS_EQUIPMENT_PACKAGES, getSprite } from '../constants';
import { 
  getModifier, 
  POINT_BUY_TOTAL, 
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

export function useCharacterCreationLogic(onComplete: (name: string, race: CharacterRace, cls: CharacterClass, stats: Attributes, difficulty: Difficulty, startingPackageId?: string) => void) {
  const raceBonus = useContentStore(state => state.raceBonus);
  const classEquipmentPackages = useContentStore(state => state.classEquipmentPackages || {});
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [race, setRace] = useState<CharacterRace>(CharacterRace.HUMAN);
  const [cls, setCls] = useState<CharacterClass>(CharacterClass.FIGHTER);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [statMethod, setStatMethod] = useState<StatGenerationMethod>(StatGenerationMethod.POINT_BUY);
  
  const [baseScores, setBaseScores] = useState<Attributes>({
    [Ability.STR]: 8,
    [Ability.DEX]: 8,
    [Ability.CON]: 8,
    [Ability.INT]: 8,
    [Ability.WIS]: 8,
    [Ability.CHA]: 8,
  });

  const [diceRollsData, setDiceRollsData] = useState<{ scores: number[]; rolls: { total: number; dice: number[]; dropped: number }[] } | null>(null);
  const [savedGameInfo, setSavedGameInfo] = useState<{ slotId: SaveSlotId; heroName: string; level: number; heroClass: string; heroRace: string; dateStr: string; location: string } | null>(null);
  const [showSaveManagerModal, setShowSaveManagerModal] = useState(false);

  const loadGame = useGameStore(state => state.loadGame);

  useEffect(() => {
    const packages = classEquipmentPackages[cls] || CLASS_EQUIPMENT_PACKAGES[cls] || [];
    if (packages.length > 0) {
      setSelectedPackageId(packages[0].id);
    }
  }, [cls, classEquipmentPackages]);

  useEffect(() => {
    if (statMethod === StatGenerationMethod.CLASSIC_BASE) {
      const dynamicStats = useContentStore.getState().classStats[cls] || BASE_STATS[cls];
      setBaseScores({ ...dynamicStats });
    } else if (statMethod === StatGenerationMethod.STANDARD_ARRAY) {
      const defaults: Record<CharacterClass, Attributes> = {
        [CharacterClass.FIGHTER]: { STR: 15, CON: 14, DEX: 13, WIS: 12, CHA: 10, INT: 8 },
        [CharacterClass.BARBARIAN]: { STR: 15, CON: 14, DEX: 13, WIS: 12, CHA: 10, INT: 8 },
        [CharacterClass.PALADIN]: { STR: 15, CHA: 14, CON: 13, WIS: 12, DEX: 10, INT: 8 },
        [CharacterClass.RANGER]: { DEX: 15, WIS: 14, CON: 13, STR: 12, INT: 10, CHA: 8 },
        [CharacterClass.ROGUE]: { DEX: 15, INT: 14, CON: 13, CHA: 12, WIS: 10, STR: 8 },
        [CharacterClass.WIZARD]: { INT: 15, CON: 14, DEX: 13, WIS: 12, CHA: 10, STR: 8 },
        [CharacterClass.SORCERER]: { CHA: 15, CON: 14, DEX: 13, WIS: 12, INT: 10, STR: 8 },
        [CharacterClass.WARLOCK]: { CHA: 15, CON: 14, DEX: 13, WIS: 12, INT: 10, STR: 8 },
        [CharacterClass.CLERIC]: { WIS: 15, CON: 14, STR: 13, CHA: 12, DEX: 10, INT: 8 },
        [CharacterClass.DRUID]: { WIS: 15, CON: 14, DEX: 13, INT: 12, STR: 10, CHA: 8 },
        [CharacterClass.BARD]: { CHA: 15, DEX: 14, CON: 13, WIS: 12, INT: 10, STR: 8 },
      };
      setBaseScores(defaults[cls] || { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 });
    } else if (statMethod === StatGenerationMethod.POINT_BUY) {
      setBaseScores({
        [Ability.STR]: 8,
        [Ability.DEX]: 8,
        [Ability.CON]: 8,
        [Ability.INT]: 8,
        [Ability.WIS]: 8,
        [Ability.CHA]: 8,
      });
    }
  }, [cls, statMethod]);

  const checkSavedGames = () => {
    try {
      const recent = getMostRecentSave();
      if (recent && recent.meta) {
        const dateStr = recent.meta.timestamp ? new Date(recent.meta.timestamp).toLocaleDateString() : 'Recent';
        setSavedGameInfo({
          slotId: recent.slotId,
          heroName: recent.meta.heroName || 'Hero',
          level: recent.meta.level || 1,
          heroClass: recent.meta.heroClass || 'Adventurer',
          heroRace: recent.meta.heroRace || '',
          location: recent.meta.locationName || 'Unknown',
          dateStr
        });
      } else {
        setSavedGameInfo(null);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkSavedGames();
  }, []);

  const pointBuyUsed = useMemo(() => calculatePointBuyCost(baseScores), [baseScores]);
  const pointBuyRemaining = POINT_BUY_TOTAL - pointBuyUsed;

  const finalStats: Attributes = useMemo(() => {
      const final = { ...baseScores };
      const bonus = raceBonus[race] || {};
      (Object.keys(final) as Ability[]).forEach(k => {
          if (bonus[k]) final[k] += bonus[k]!;
      });
      return final;
  }, [baseScores, race, raceBonus]);

  const previewHitDie = getHitDieForClass(cls);
  const previewMaxHp = calculateHp(1, finalStats.CON, previewHitDie);
  const previewMaxStamina = calculateMaxStamina(finalStats.CON, 1);
  const previewSpellSlots = getCasterSpellSlots(cls, 1);
  const previewInitiative = getModifier(finalStats.DEX);

  const availablePackages = classEquipmentPackages[cls] || CLASS_EQUIPMENT_PACKAGES[cls] || [];
  const currentPackage = availablePackages.find(p => p.id === selectedPackageId) || availablePackages[0];
  
  const previewAc = useMemo(() => {
    let baseAc = 10 + getModifier(finalStats.DEX);
    if (currentPackage?.equipment?.[EquipmentSlot.BODY]?.equipmentStats?.ac) {
      const armorAc = currentPackage.equipment[EquipmentSlot.BODY].equipmentStats.ac;
      if (armorAc === 16) baseAc = 16;
      else if (armorAc === 13) baseAc = 13 + Math.min(2, Math.max(0, getModifier(finalStats.DEX)));
      else if (armorAc === 11) baseAc = 11 + getModifier(finalStats.DEX);
    }
    if (currentPackage?.equipment?.[EquipmentSlot.OFF_HAND]?.equipmentStats?.ac) {
      baseAc += currentPackage.equipment[EquipmentSlot.OFF_HAND].equipmentStats.ac;
    }
    return baseAc;
  }, [finalStats.DEX, currentPackage]);

  const spriteUrl = useMemo(() => getSprite(race, cls), [race, cls]);

  const handleRoll4d6 = () => {
    sfx.playDiceRoll();
    const data = rollFullSet4d6();
    setDiceRollsData(data);
    
    const abilities: Ability[] = [Ability.STR, Ability.DEX, Ability.CON, Ability.INT, Ability.WIS, Ability.CHA];
    const newStats: Partial<Attributes> = {};
    abilities.forEach((ab, idx) => {
      newStats[ab] = data.scores[idx];
    });
    setBaseScores(newStats as Attributes);
  };

  const handleNext = () => {
    if (step === 4) {
        sfx.playVictory();
        onComplete(name.trim() || generateFantasyName(race), race, cls, finalStats, difficulty, selectedPackageId);
    } else {
        sfx.playUiClick();
        setStep(step + 1);
    }
  };

  return {
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
  };
}
