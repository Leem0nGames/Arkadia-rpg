import React, { useState } from 'react';
import { useContentStore } from '../../store/contentStore';
import { Item, ItemRarity, EquipmentSlot } from '../../types';
import { RARITY_COLORS } from '../../constants';

export const ItemEditor: React.FC = () => {
    const { items, updateItem, createItem, deleteItem } = useContentStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Item>>({});

    const handleSelect = (id: string) => {
        setSelectedId(id);
        setEditForm({ ...items[id] });
    };

    const handleSave = () => {
        if (selectedId && editForm.name) {
            updateItem(selectedId, editForm as Item);
            alert('Item Saved');
        }
    };

    const handleCreate = () => {
        const newId = `new_item_${Date.now()}`;
        const newItem: Item = {
            id: newId,
            name: 'New Item',
            type: 'equipment',
            rarity: ItemRarity.COMMON,
            description: 'Description here',
            icon: '',
            equipmentStats: { slot: EquipmentSlot.MAIN_HAND }
        };
        createItem(newItem);
        handleSelect(newId);
    };

    return (
        <div className="flex gap-6 h-full">
            {/* List */}
            <div className="w-1/3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <input type="text" placeholder="Search items..." className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm w-full mr-2" />
                    <button onClick={handleCreate} className="bg-amber-600 text-white px-3 py-1 rounded text-lg font-bold">+</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {Object.values(items).map((item: Item) => (
                        <div 
                            key={item.id} 
                            onClick={() => handleSelect(item.id)}
                            className={`p-3 rounded cursor-pointer flex items-center gap-3 border ${selectedId === item.id ? 'bg-slate-800 border-amber-500' : 'bg-transparent border-transparent hover:bg-slate-900'}`}
                        >
                            <div className="w-8 h-8 bg-slate-900 rounded border border-slate-700 flex items-center justify-center overflow-hidden">
                                {item.icon ? <img src={item.icon} className="w-6 h-6 object-contain" /> : '📦'}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-200">{item.name}</div>
                                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: RARITY_COLORS[item.rarity] }}>{item.rarity}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-6 overflow-y-auto custom-scrollbar">
                {selectedId ? (
                    <div className="space-y-6 max-w-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Edit Item: <span className="text-amber-400">{editForm.name}</span></h3>
                            <button onClick={() => { if(confirm('Delete item?')) { deleteItem(selectedId); setSelectedId(null); } }} className="text-red-400 hover:text-red-300 text-sm uppercase font-bold">Delete</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 uppercase font-bold">Name</label>
                                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:border-amber-500 outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 uppercase font-bold">ID</label>
                                <input type="text" value={editForm.id} disabled className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-500 cursor-not-allowed" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 uppercase font-bold">Type</label>
                                <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value as any})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
                                    <option value="equipment">Equipment</option>
                                    <option value="consumable">Consumable</option>
                                    <option value="key">Key Item</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 uppercase font-bold">Rarity</label>
                                <select value={editForm.rarity} onChange={e => setEditForm({...editForm, rarity: e.target.value as ItemRarity})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
                                    {Object.values(ItemRarity).map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 uppercase font-bold">Icon URL</label>
                            <div className="flex gap-2">
                                <div className="w-10 h-10 bg-slate-900 border border-slate-600 rounded flex items-center justify-center shrink-0">
                                    {editForm.icon ? <img src={editForm.icon} className="w-8 h-8 object-contain" /> : '❌'}
                                </div>
                                <input type="text" value={editForm.icon} onChange={e => setEditForm({...editForm, icon: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" placeholder="https://..." />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 uppercase font-bold">Description</label>
                            <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white h-20" />
                        </div>

                        {editForm.type === 'equipment' && (
                            <div className="bg-slate-900/50 p-4 rounded border border-slate-700 space-y-4">
                                <h4 className="font-bold text-slate-300 text-sm uppercase">Equipment Stats</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500">Slot</label>
                                        <select value={editForm.equipmentStats?.slot} onChange={e => setEditForm({...editForm, equipmentStats: {...editForm.equipmentStats, slot: e.target.value as EquipmentSlot}})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm">
                                            {Object.values(EquipmentSlot).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">AC Bonus</label>
                                        <input type="number" value={editForm.equipmentStats?.ac || 0} onChange={e => setEditForm({...editForm, equipmentStats: {...editForm.equipmentStats, ac: parseInt(e.target.value)}})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">Dice Count</label>
                                        <input type="number" value={editForm.equipmentStats?.diceCount || 0} onChange={e => setEditForm({...editForm, equipmentStats: {...editForm.equipmentStats, diceCount: parseInt(e.target.value)}})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">Dice Sides</label>
                                        <input type="number" value={editForm.equipmentStats?.diceSides || 0} onChange={e => setEditForm({...editForm, equipmentStats: {...editForm.equipmentStats, diceSides: parseInt(e.target.value)}})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded shadow-lg">SAVE CHANGES</button>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">Select an item to edit</div>
                )}
            </div>
        </div>
    );
};
