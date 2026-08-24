import React, { useState } from 'react';
import { useContentStore } from '../../store/contentStore';
import { CharacterClass, EquipmentSlot, StartingEquipmentPackage } from '../../types';

export const StartingEquipmentEditor: React.FC = () => {
    const { items, classEquipmentPackages, updateClassEquipmentPackages } = useContentStore();
    const [selectedClass, setSelectedClass] = useState<CharacterClass>(CharacterClass.FIGHTER);
    const [selectedPkgIndex, setSelectedPkgIndex] = useState<number>(0);

    const packages = classEquipmentPackages[selectedClass] || [];
    const currentPkg = packages[selectedPkgIndex];

    const itemList = Object.values(items);

    const handleFieldChange = (field: keyof StartingEquipmentPackage, value: any) => {
        if (!currentPkg) return;
        const updatedPackages = [...packages];
        updatedPackages[selectedPkgIndex] = {
            ...currentPkg,
            [field]: value
        };
        updateClassEquipmentPackages(selectedClass, updatedPackages);
    };

    const handleEquipmentChange = (slot: EquipmentSlot, itemId: string) => {
        if (!currentPkg) return;
        const targetItem = itemId ? items[itemId] : undefined;
        const updatedEquipment = { ...currentPkg.equipment };
        if (targetItem) {
            updatedEquipment[slot] = targetItem;
        } else {
            delete updatedEquipment[slot];
        }
        handleFieldChange('equipment', updatedEquipment);
    };

    const handleAddBonusItem = () => {
        if (!currentPkg) return;
        const firstItem = itemList[0];
        if (!firstItem) return;
        const updatedBonus = [...(currentPkg.bonusItems || [])];
        updatedBonus.push({ item: firstItem, quantity: 1 });
        handleFieldChange('bonusItems', updatedBonus);
    };

    const handleBonusItemChange = (index: number, itemId: string, quantity: number) => {
        if (!currentPkg) return;
        const targetItem = items[itemId];
        if (!targetItem) return;
        const updatedBonus = [...(currentPkg.bonusItems || [])];
        updatedBonus[index] = { item: targetItem, quantity };
        handleFieldChange('bonusItems', updatedBonus);
    };

    const handleRemoveBonusItem = (index: number) => {
        if (!currentPkg) return;
        const updatedBonus = [...(currentPkg.bonusItems || [])];
        updatedBonus.splice(index, 1);
        handleFieldChange('bonusItems', updatedBonus);
    };

    const handleAddPackage = () => {
        const newPkg: StartingEquipmentPackage = {
            id: `${selectedClass.toLowerCase()}_pkg_${Date.now()}`,
            name: 'New Custom Package',
            archetype: 'Custom Build',
            description: 'A customized set of starting gear.',
            equipment: {},
            bonusItems: []
        };
        const updatedPackages = [...packages, newPkg];
        updateClassEquipmentPackages(selectedClass, updatedPackages);
        setSelectedPkgIndex(updatedPackages.length - 1);
    };

    const handleDeletePackage = () => {
        if (!currentPkg) return;
        if (confirm(`Are you sure you want to delete starting package "${currentPkg.name}"?`)) {
            const updatedPackages = [...packages];
            updatedPackages.splice(selectedPkgIndex, 1);
            updateClassEquipmentPackages(selectedClass, updatedPackages);
            setSelectedPkgIndex(Math.max(0, selectedPkgIndex - 1));
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
                {/* Left Pane: Select Class */}
                <div className="md:col-span-3 bg-slate-950/60 border border-slate-800 rounded-lg p-4 flex flex-col h-[550px]">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Select Class</h4>
                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                        {Object.values(CharacterClass).map(cls => (
                            <button
                                key={cls}
                                onClick={() => {
                                    setSelectedClass(cls);
                                    setSelectedPkgIndex(0);
                                }}
                                className={`w-full text-left px-4 py-2.5 rounded text-xs font-bold capitalize transition-all ${selectedClass === cls ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:bg-slate-900 border border-transparent'}`}
                            >
                                {cls}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Middle Pane: Packages List */}
                <div className="md:col-span-3 bg-slate-950/60 border border-slate-800 rounded-lg p-4 flex flex-col h-[550px]">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Packages</h4>
                        <button
                            onClick={handleAddPackage}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 text-[10px] font-bold rounded"
                        >
                            + Add
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                        {packages.map((pkg, idx) => (
                            <button
                                key={pkg.id || idx}
                                onClick={() => setSelectedPkgIndex(idx)}
                                className={`w-full text-left p-3 rounded border transition-all ${selectedPkgIndex === idx ? 'bg-amber-600/20 border-amber-500/50 text-white' : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:border-slate-700'}`}
                            >
                                <div className="font-bold text-xs">{pkg.name}</div>
                                <div className="text-[10px] text-amber-500 font-mono mt-1">{pkg.archetype}</div>
                            </button>
                        ))}
                        {packages.length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-4">No packages defined.</p>
                        )}
                    </div>
                </div>

                {/* Right Pane: Package Editor Form */}
                <div className="md:col-span-6 bg-slate-850 border border-slate-700 rounded-lg p-6 flex flex-col h-[550px] overflow-y-auto custom-scrollbar">
                    {currentPkg ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Package Name</label>
                                <input
                                    type="text"
                                    value={currentPkg.name}
                                    onChange={e => handleFieldChange('name', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Archetype (Build Focus)</label>
                                <input
                                    type="text"
                                    value={currentPkg.archetype}
                                    onChange={e => handleFieldChange('archetype', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Description</label>
                                <textarea
                                    value={currentPkg.description}
                                    onChange={e => handleFieldChange('description', e.target.value)}
                                    rows={2}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 resize-none focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="border-t border-slate-800 pt-4">
                                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Starting Slot Assignments</h5>
                                <div className="space-y-3">
                                    {[EquipmentSlot.MAIN_HAND, EquipmentSlot.OFF_HAND, EquipmentSlot.BODY].map(slot => {
                                        const equippedItem = currentPkg.equipment[slot];
                                        return (
                                            <div key={slot} className="grid grid-cols-3 gap-4 items-center">
                                                <span className="text-xs text-slate-400 font-mono capitalize">{slot.replace('_', ' ')}</span>
                                                <select
                                                    value={equippedItem?.id || ''}
                                                    onChange={e => handleEquipmentChange(slot, e.target.value)}
                                                    className="col-span-2 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                                                >
                                                    <option value="">-- None --</option>
                                                    {itemList.map(it => (
                                                        <option key={it.id} value={it.id}>{it.name} ({it.type})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="border-t border-slate-800 pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Starting Bonus Inventory</h5>
                                    <button
                                        onClick={handleAddBonusItem}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 text-[10px] font-bold rounded"
                                    >
                                        + Add Item
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {(currentPkg.bonusItems || []).map((bonus, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select
                                                value={bonus.item?.id || ''}
                                                onChange={e => handleBonusItemChange(idx, e.target.value, bonus.quantity)}
                                                className="col-span-2 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                                            >
                                                {itemList.map(it => (
                                                    <option key={it.id} value={it.id}>{it.name}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                value={bonus.quantity}
                                                min={1}
                                                onChange={e => handleBonusItemChange(idx, bonus.item?.id || '', parseInt(e.target.value) || 1)}
                                                className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-center font-mono focus:border-amber-500 focus:outline-none"
                                            />
                                            <button
                                                onClick={() => handleRemoveBonusItem(idx)}
                                                className="text-red-400 hover:text-red-300 text-xs px-2"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    {(currentPkg.bonusItems || []).length === 0 && (
                                        <p className="text-[11px] text-slate-500 italic">No bonus items starting in bag.</p>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-slate-800 pt-4 flex gap-4">
                                <button
                                    onClick={handleDeletePackage}
                                    className="bg-red-900/30 border border-red-800 text-red-300 hover:bg-red-900/40 px-4 py-2 text-xs font-bold rounded transition-colors"
                                >
                                    Delete Package
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                            <span className="text-3xl mb-2">🛡️</span>
                            <p className="text-xs">Select or add a package to start customization.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
