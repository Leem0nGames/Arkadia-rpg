import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { EquipmentSlot, Item } from '../types';
import { sfx } from '../services/SoundSystem';

export function useInventoryLogic() {
    const { 
        inventory, 
        party, 
        activeInventoryCharacterId, 
        toggleInventory, 
        consumeItem, 
        equipItem, 
        unequipItem, 
        hasActed, 
        gameState,
        battleRewards
    } = useGameStore();
    
    const [selectedItem, setSelectedItem] = useState<Item | null>(() => {
        return inventory[0]?.item || null;
    });
    const [activeCharId, setActiveCharId] = useState<string>(() => {
        return activeInventoryCharacterId || party[0]?.id || '';
    });
    const [mobileTab, setMobileTab] = useState<'POUCH' | 'HERO' | 'DETAILS'>('POUCH');

    const activeChar = party.find(p => p.id === activeCharId) || party[0];
    const gold = battleRewards?.gold || 0;

    const handleSelectItem = (item: Item) => {
        setSelectedItem(item);
        if (window.innerWidth < 1024) {
            setMobileTab('DETAILS');
        }
    };

    const handleEquip = (itemId: string, charId: string) => {
        equipItem(itemId, charId);
    };

    const handleUnequip = (slot: EquipmentSlot, charId: string) => {
        unequipItem(slot, charId);
    };

    const handleConsume = (itemId: string, charId: string) => {
        consumeItem(itemId, charId);
    };

    const handleClose = () => {
        sfx.playUiClick();
        toggleInventory();
    };

    return {
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
    };
}
