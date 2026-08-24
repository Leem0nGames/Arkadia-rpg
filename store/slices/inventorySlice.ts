import { StateCreator } from 'zustand';
import { InventorySlot, EquipmentSlot, Item, CombatStatsComponent, GameState } from '../../types';
import { rollDice } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { GameStore } from '../gameStore';

export interface InventorySlice {
  inventory: InventorySlot[];
  isInventoryOpen: boolean;
  activeInventoryCharacterId: string | null;
  toggleInventory: () => void;
  cycleInventoryCharacter: (direction: 'next' | 'prev') => void;
  consumeItem: (itemId: string, characterId?: string) => void;
  equipItem: (itemId: string, characterId: string) => void;
  unequipItem: (slot: EquipmentSlot, characterId: string) => void;
  addInventoryItem: (item: Item) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const createInventorySlice: StateCreator<GameStore, [], [], InventorySlice> = (set, get) => ({
  inventory: [],
  isInventoryOpen: false,
  activeInventoryCharacterId: null,

  toggleInventory: () => { 
    sfx.playUiClick(); 
    const state = get(); 
    set({ 
        isInventoryOpen: !state.isInventoryOpen, 
        isMapOpen: false, 
        activeInventoryCharacterId: !state.isInventoryOpen ? (state.party[0]?.id || null) : state.activeInventoryCharacterId 
    }); 
  },

  cycleInventoryCharacter: (direction) => { 
    const { party, activeInventoryCharacterId } = get(); 
    if (party.length === 0) return; 
    const idx = party.findIndex(p => p.id === activeInventoryCharacterId); 
    let newIdx = direction === 'next' ? idx + 1 : idx - 1; 
    if (newIdx >= party.length) newIdx = 0; 
    if (newIdx < 0) newIdx = party.length - 1; 
    set({ activeInventoryCharacterId: party[newIdx].id }); 
  },

  consumeItem: (itemId, characterId) => {
    const state = get();
    const slotIndex = state.inventory.findIndex(s => s.item.id === itemId);
    if (slotIndex === -1) return;
    sfx.playMagic(); 
    const item = state.inventory[slotIndex].item;
    let targetId = characterId || state.activeInventoryCharacterId || state.party[0].id;
    
    // If in battle, allow targeting current turn entity if player
    if (state.gameState === GameState.BATTLE_TACTICAL) {
         const turnId = state.turnOrder[state.currentTurnIndex];
         const turnEntity = state.battleEntities.find(e => e.id === turnId);
         if (turnEntity && turnEntity.type === 'PLAYER') {
             targetId = turnId;
         }
    }

    const applyEffect = (stats: CombatStatsComponent) => {
        const newStats = { ...stats };
        let amount = item.effect?.amount || 0;

        if (item.effect?.type === 'heal_hp') {
            amount = item.id.includes('greater') ? rollDice(8, 4) + 8 : item.id.includes('potion') ? rollDice(4, 2) + 4 : item.effect.amount;
            newStats.hp = Math.min(newStats.maxHp, newStats.hp + amount);
        } else if (item.effect?.type === 'restore_mana') {
            newStats.spellSlots.current = Math.min(newStats.spellSlots.max, newStats.spellSlots.current + amount);
        } else if (item.effect?.type === 'buff_str') {
            newStats.baseAttributes.STR += amount;
            newStats.attributes.STR += amount;
        } else if (item.effect?.type === 'buff_dex') {
            newStats.baseAttributes.DEX += amount;
            newStats.attributes.DEX += amount;
        } else if (item.effect?.type === 'buff_con') {
            newStats.baseAttributes.CON += amount;
            newStats.attributes.CON += amount;
        } else if (item.effect?.type === 'buff_int') {
            newStats.baseAttributes.INT += amount;
            newStats.attributes.INT += amount;
        } else if (item.effect?.type === 'buff_wis') {
            newStats.baseAttributes.WIS += amount;
            newStats.attributes.WIS += amount;
        } else if (item.effect?.type === 'buff_cha') {
            newStats.baseAttributes.CHA += amount;
            newStats.attributes.CHA += amount;
        } else if (item.effect?.type === 'cure_poison') {
            newStats.hp = Math.min(newStats.maxHp, newStats.hp + 10);
        } else if (item.effect?.type === 'reduce_fatigue') {
            // Also heal minor HP
            newStats.hp = Math.min(newStats.maxHp, newStats.hp + 8);
        }

        return { stats: newStats, amount };
    };

    if (state.gameState === GameState.BATTLE_TACTICAL) {
        const ent = state.battleEntities.find(e => e.id === targetId);
        if (ent) {
            const { stats, amount } = applyEffect(ent.stats);
            // Use battle slice action or direct set
            const newEntities = state.battleEntities.map(e => e.id === targetId ? { ...e, stats } : e);
            // We need to add damage popup, assume action exists in battle slice or we push to damagePopups
            const popups = [...state.damagePopups, { id: generateId(), position: [ent.position.x, 0, ent.position.y] as [number, number, number], amount: `+${amount}`, color: '#22c55e', isCrit: false, timestamp: Date.now() }];
            
            set({ battleEntities: newEntities, hasActed: true, isInventoryOpen: false, damagePopups: popups });
        }
    } else {
        const newParty = state.party.map(p => { 
            if (p.id === targetId) { 
                const { stats, amount } = applyEffect(p.stats); 
                get().addLog(`🧪 ${p.name} usó ${item.name}. (+${amount})`, "roll"); 
                return { ...p, stats }; 
            } 
            return p; 
        });
        if (item.effect?.type === 'reduce_fatigue') {
            const currentFatigue = state.travelFatigue || 0;
            const newFatigue = Math.max(0, currentFatigue - 20);
            set({ travelFatigue: newFatigue });
            get().addLog(`🍞 Las raciones redujeron la Fatiga de Viaje de la expedición (${currentFatigue}% ➔ ${newFatigue}%).`, "info");
        }
        set({ party: newParty });
    }
    const newInventory = [...state.inventory];
    if (newInventory[slotIndex].quantity > 1) newInventory[slotIndex].quantity--; else newInventory.splice(slotIndex, 1);
    set({ inventory: newInventory });
  },

  equipItem: (itemId, characterId) => {
    const state = get(); const slotIndex = state.inventory.findIndex(s => s.item.id === itemId); if (slotIndex === -1) return;
    const itemToEquip = state.inventory[slotIndex].item as Item; if (!itemToEquip.equipmentStats) return;
    const charIndex = state.party.findIndex(p => p.id === characterId); if (charIndex === -1) return;
    const character = state.party[charIndex];

    // Validate Level Requirement
    if (itemToEquip.requiredLevel && character.stats.level < itemToEquip.requiredLevel) {
        sfx.playStatDown();
        get().addLog(`⚠️ ${character.name} necesita Nivel ${itemToEquip.requiredLevel} para equipar ${itemToEquip.name} (Nivel actual: ${character.stats.level}).`, 'info');
        return;
    }

    // Validate Attribute Requirements
    if (itemToEquip.requiredStats) {
        const missing: string[] = [];
        Object.entries(itemToEquip.requiredStats).forEach(([ability, reqVal]) => {
            const charVal = (character.stats.attributes as any)[ability] || 0;
            if (charVal < (reqVal as number)) {
                missing.push(`${ability} ${reqVal} (Actual: ${charVal})`);
            }
        });
        if (missing.length > 0) {
            sfx.playStatDown();
            get().addLog(`⚠️ ${character.name} no cumple los requisitos de atributos para equipar ${itemToEquip.name}: ${missing.join(', ')}.`, 'info');
            return;
        }
    }

    // Validate Class Restrictions
    if (itemToEquip.allowedClasses && !itemToEquip.allowedClasses.includes(character.stats.class)) {
        sfx.playStatDown();
        get().addLog(`⚠️ La clase ${character.stats.class} no puede equipar ${itemToEquip.name}.`, 'info');
        return;
    }

    const targetSlot = itemToEquip.equipmentStats.slot; const currentEquipped = character.equipment[targetSlot];
    const newInventory = [...state.inventory];
    if (newInventory[slotIndex].quantity > 1) newInventory[slotIndex].quantity--; else newInventory.splice(slotIndex, 1);
    if (currentEquipped) { const existingSlot = newInventory.find(s => s.item.id === currentEquipped.id); if (existingSlot) existingSlot.quantity++; else newInventory.push({ item: currentEquipped, quantity: 1 }); }
    const updatedChar = { ...character, equipment: { ...character.equipment, [targetSlot]: itemToEquip } };
    updatedChar.stats = get().recalculateStats(updatedChar);
    const newParty = [...state.party]; newParty[charIndex] = updatedChar; set({ inventory: newInventory, party: newParty }); sfx.playUiClick();
  },

  unequipItem: (slot, characterId) => {
    const state = get(); const charIndex = state.party.findIndex(p => p.id === characterId); if (charIndex === -1) return;
    const character = state.party[charIndex]; const itemToRemove = character.equipment[slot]; if (!itemToRemove) return;
    const newInventory = [...state.inventory];
    const existingSlot = newInventory.find(s => s.item.id === itemToRemove.id); if (existingSlot) existingSlot.quantity++; else newInventory.push({ item: itemToRemove, quantity: 1 });
    const newEquipment = { ...character.equipment }; delete newEquipment[slot];
    const updatedChar = { ...character, equipment: newEquipment }; updatedChar.stats = get().recalculateStats(updatedChar);
    const newParty = [...state.party]; newParty[charIndex] = updatedChar; set({ inventory: newInventory, party: newParty }); sfx.playUiClick();
  },

  addInventoryItem: (item) => {
    const newInventory = [...get().inventory];
    const existingSlot = newInventory.find(s => s.item.id === item.id);
    if (existingSlot) {
        existingSlot.quantity++;
    } else {
        newInventory.push({ item, quantity: 1 });
    }
    set({ inventory: newInventory });
  }
});