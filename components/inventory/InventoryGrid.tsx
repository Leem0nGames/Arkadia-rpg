import React, { useState, useMemo } from 'react';
import { InventorySlot, Item, ItemRarity, Entity, EquipmentSlot } from '../../types';
import { ItemRarityFrame } from './ItemRarityFrame';
import { sfx } from '../../services/SoundSystem';

type FilterCategory = 'ALL' | 'WEAPONS' | 'ARMOR' | 'CONSUMABLES' | 'KEYS';
type SortMode = 'RARITY' | 'NAME' | 'TYPE';

interface InventoryGridProps {
    inventory: InventorySlot[];
    party: Entity[];
    selectedItem: Item | null;
    gold?: number;
    maxCapacity?: number;
    onSelectItem: (item: Item) => void;
}

const RARITY_WEIGHT: Record<ItemRarity, number> = {
    [ItemRarity.LEGENDARY]: 5,
    [ItemRarity.VERY_RARE]: 4,
    [ItemRarity.RARE]: 3,
    [ItemRarity.UNCOMMON]: 2,
    [ItemRarity.COMMON]: 1
};

export const InventoryGrid: React.FC<InventoryGridProps> = ({
    inventory,
    party,
    selectedItem,
    gold = 0,
    maxCapacity = 24,
    onSelectItem
}) => {
    const [category, setCategory] = useState<FilterCategory>('ALL');
    const [sortMode, setSortMode] = useState<SortMode>('RARITY');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Filter & Sort Inventory Items
    const filteredItems = useMemo(() => {
        return inventory.filter(slot => {
            const item = slot.item;
            
            // Category Filter
            if (category === 'WEAPONS') {
                if (item.type !== 'equipment' || item.equipmentStats?.slot !== EquipmentSlot.MAIN_HAND) return false;
            } else if (category === 'ARMOR') {
                if (item.type !== 'equipment' || (item.equipmentStats?.slot !== EquipmentSlot.BODY && item.equipmentStats?.slot !== EquipmentSlot.OFF_HAND)) return false;
            } else if (category === 'CONSUMABLES') {
                if (item.type !== 'consumable') return false;
            } else if (category === 'KEYS') {
                if (item.type !== 'key') return false;
            }

            // Search Query Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
            }

            return true;
        }).sort((a, b) => {
            if (sortMode === 'RARITY') {
                const diff = (RARITY_WEIGHT[b.item.rarity] || 0) - (RARITY_WEIGHT[a.item.rarity] || 0);
                if (diff !== 0) return diff;
                return a.item.name.localeCompare(b.item.name);
            } else if (sortMode === 'NAME') {
                return a.item.name.localeCompare(b.item.name);
            } else if (sortMode === 'TYPE') {
                return a.item.type.localeCompare(b.item.type);
            }
            return 0;
        });
    }, [inventory, category, sortMode, searchQuery]);

    const totalItemCount = inventory.reduce((acc, curr) => acc + curr.quantity, 0);
    const capacityPercent = Math.min(100, (inventory.length / maxCapacity) * 100);

    return (
        <div className="flex flex-col h-full rounded-3xl border border-white/15 bg-slate-950/80 backdrop-blur-2xl overflow-hidden p-3 sm:p-4 gap-3 text-slate-200">
            
            {/* Header: Title, Capacity & Gold Coin Counter */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🎒</span>
                    <div>
                        <h2 className="text-sm sm:text-base font-serif font-black text-amber-300 leading-none">
                            Zurrón de Aventurero
                        </h2>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                            <span>Espacio: <span className="text-slate-200 font-bold">{inventory.length}/{maxCapacity}</span></span>
                            <span>•</span>
                            <span>Objetos: <span className="text-slate-200 font-bold">{totalItemCount}</span></span>
                        </div>
                    </div>
                </div>

                {/* Gold Pouch Display */}
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/70 to-slate-900 px-3 py-1.5 rounded-2xl border border-amber-500/40 shadow-inner">
                    <span className="text-sm">🪙</span>
                    <div className="flex flex-col text-right">
                        <span className="text-[8px] uppercase font-bold text-amber-400/80 tracking-wider">Oro del Grupo</span>
                        <span className="text-xs font-mono font-black text-amber-200">{gold} PO</span>
                    </div>
                </div>
            </div>

            {/* Capacity Progress Bar */}
            <div className="w-full bg-slate-900/90 h-1.5 rounded-full overflow-hidden border border-white/10 shrink-0">
                <div 
                    className={`h-full transition-all duration-300 ${
                        capacityPercent >= 90 ? 'bg-rose-500' : capacityPercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${capacityPercent}%` }}
                />
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col gap-2 shrink-0">
                {/* Categories */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                    {[
                        { id: 'ALL', label: 'Todo', icon: '🎒' },
                        { id: 'WEAPONS', label: 'Armas', icon: '⚔️' },
                        { id: 'ARMOR', label: 'Armaduras', icon: '🛡️' },
                        { id: 'CONSUMABLES', label: 'Pociones', icon: '🧪' },
                        { id: 'KEYS', label: 'Reliquias', icon: '📜' }
                    ].map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                sfx.playUiClick();
                                setCategory(cat.id as FilterCategory);
                            }}
                            className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
                                category === cat.id 
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md' 
                                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20'
                            }`}
                        >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>

                {/* Search & Sort Controls */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <input 
                            type="text"
                            placeholder="Buscar en el zurrón..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full min-h-[36px] bg-slate-900/80 border border-white/10 rounded-xl px-2.5 pl-7 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                        />
                        <span className="absolute left-2.5 top-2.5 text-xs text-slate-500">🔍</span>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-2 text-xs text-slate-400 hover:text-white px-1"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            sfx.playUiClick();
                            setSortMode(m => m === 'RARITY' ? 'NAME' : m === 'NAME' ? 'TYPE' : 'RARITY');
                        }}
                        className="min-h-[36px] px-2.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-amber-500/40 text-[10px] font-mono text-amber-300 font-bold flex items-center gap-1 shrink-0"
                        title="Cambiar ordenación"
                    >
                        <span>⇅</span>
                        <span>{sortMode === 'RARITY' ? 'Rareza' : sortMode === 'NAME' ? 'A-Z' : 'Tipo'}</span>
                    </button>
                </div>
            </div>

            {/* Inventory Slot Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                {filteredItems.length === 0 ? (
                    <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl bg-slate-950/40 text-slate-500">
                        <span className="text-3xl mb-2 opacity-50">🍃</span>
                        <span className="text-xs font-serif font-bold text-slate-400">No hay objetos en esta categoría</span>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
                            Explora mazmorras y derrota enemigos para encontrar nuevo botín.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 content-start">
                        {filteredItems.map((slot) => {
                            const isSelected = selectedItem?.id === slot.item.id;
                            const isEquipped = party.some(p => 
                                Object.values(p.equipment).some(eq => eq?.id === slot.item.id)
                            );

                            return (
                                <ItemRarityFrame
                                    key={slot.item.id}
                                    rarity={slot.item.rarity}
                                    isSelected={isSelected}
                                    isEquipped={isEquipped}
                                    quantity={slot.quantity}
                                    onClick={() => {
                                        sfx.playUiClick();
                                        onSelectItem(slot.item);
                                    }}
                                    className="aspect-square flex items-center justify-center p-2.5"
                                >
                                    <img 
                                        src={slot.item.icon} 
                                        alt={slot.item.name} 
                                        className="w-full h-full object-contain pixelated drop-shadow hover:scale-110 transition-transform" 
                                    />
                                </ItemRarityFrame>
                            );
                        })}

                        {/* Empty Visual Backpack Slots */}
                        {Array(Math.max(0, maxCapacity - inventory.length)).fill(null).map((_, i) => (
                            <div 
                                key={`empty-${i}`} 
                                className="aspect-square rounded-2xl border border-dashed border-white/5 bg-slate-950/20 flex items-center justify-center opacity-30 select-none"
                            >
                                <span className="text-xs text-slate-700 font-mono">⬡</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};
