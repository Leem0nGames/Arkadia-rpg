import React, { useState } from 'react';
import { useContentStore, EnemyDefinition } from '../../store/contentStore';
import { TerrainType } from '../../types';

const WESNOTH_GITHUB_BASE = "https://raw.githubusercontent.com/wesnoth/wesnoth/master/";

export const UnitAndEncounterEditor: React.FC = () => {
    const { enemies, updateEnemy, createEnemy, deleteEnemy, encounters, updateEncounterTable } = useContentStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<EnemyDefinition>>({});
    const [assetPath, setAssetPath] = useState('');
    const [activeTerrain, setActiveTerrain] = useState<TerrainType>(TerrainType.GRASS);

    const handleSelect = (id: string) => {
        setSelectedId(id);
        setEditForm({ ...enemies[id] });
        setAssetPath('');
    };

    const handleSave = () => {
        if (selectedId && editForm.name) {
            updateEnemy(selectedId, editForm as EnemyDefinition);
            alert('Unit Saved');
        }
    };

    const handleCreate = () => {
        const newId = `enemy_${Date.now()}`;
        const newEnemy: EnemyDefinition = {
            id: newId,
            name: 'New Enemy',
            sprite: '',
            hp: 10, ac: 10, damage: 4, xpReward: 10, initiativeBonus: 0
        };
        createEnemy(newEnemy);
        handleSelect(newId);
    };

    const handleImportAsset = () => {
        let cleanPath = assetPath.trim();
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
        if (cleanPath.startsWith(WESNOTH_GITHUB_BASE)) cleanPath = cleanPath.replace(WESNOTH_GITHUB_BASE, '');
        
        const fullUrl = `${WESNOTH_GITHUB_BASE}${cleanPath}`;
        setEditForm({ ...editForm, sprite: fullUrl });
    };

    const toggleEncounter = (enemyId: string) => {
        const currentList = encounters[activeTerrain] || [];
        let newList;
        if (currentList.includes(enemyId)) {
            newList = currentList.filter(id => id !== enemyId);
        } else {
            newList = [...currentList, enemyId];
        }
        updateEncounterTable(activeTerrain, newList);
    };

    return (
        <div className="flex gap-6 h-full">
            {/* Left: Unit List */}
            <div className="w-64 bg-slate-950 rounded-lg border border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-slate-400 text-sm">BESTIARY</span>
                    <button onClick={handleCreate} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">+</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {Object.values(enemies).map((enemy: EnemyDefinition) => (
                        <div 
                            key={enemy.id} 
                            onClick={() => handleSelect(enemy.id)}
                            className={`p-2 rounded cursor-pointer flex items-center gap-3 border ${selectedId === enemy.id ? 'bg-slate-800 border-red-500' : 'bg-transparent border-transparent hover:bg-slate-900'}`}
                        >
                            <div className="w-8 h-8 bg-slate-900 rounded overflow-hidden flex items-center justify-center border border-slate-700">
                                <img src={enemy.sprite} className="w-8 h-8 object-contain pixelated" alt="icon" />
                            </div>
                            <div className="text-sm font-bold text-slate-200 truncate">{enemy.name}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Middle: Editor Form */}
            <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-6 overflow-y-auto custom-scrollbar flex flex-col">
                {selectedId ? (
                    <div className="space-y-6 max-w-xl mx-auto w-full">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Edit Unit</h3>
                            <button onClick={() => { if(confirm('Delete unit?')) { deleteEnemy(selectedId); setSelectedId(null); } }} className="text-red-400 hover:text-red-300 text-xs uppercase font-bold">Delete Unit</button>
                        </div>

                        {/* Basic Stats */}
                        <div className="bg-slate-900/50 p-4 rounded border border-slate-700 grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs text-slate-500 uppercase font-bold">Name</label>
                                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">HP</label>
                                <input type="number" value={editForm.hp} onChange={e => setEditForm({...editForm, hp: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">AC</label>
                                <input type="number" value={editForm.ac} onChange={e => setEditForm({...editForm, ac: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">Damage (Approx)</label>
                                <input type="number" value={editForm.damage} onChange={e => setEditForm({...editForm, damage: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">XP Reward</label>
                                <input type="number" value={editForm.xpReward} onChange={e => setEditForm({...editForm, xpReward: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                            </div>
                        </div>

                        {/* Asset Picker & Sprite Parameters Editor */}
                        <div className="bg-slate-900/50 p-4 rounded border border-slate-700 space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Visuals & Sprite Sheet Configuration</h4>
                            <div className="flex gap-4 items-start">
                                <div className="w-24 h-24 bg-slate-950 border border-slate-600 rounded flex items-center justify-center shrink-0">
                                    {editForm.sprite ? <img src={editForm.sprite} className="w-full h-full object-contain pixelated" /> : <span className="text-xs text-slate-600">No Image</span>}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="text-xs text-slate-500">Paste Wesnoth Path (e.g., <code>data/core/images/units/trolls/troll.png</code>)</div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={assetPath} 
                                            onChange={e => setAssetPath(e.target.value)} 
                                            className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-xs font-mono text-blue-300" 
                                            placeholder="data/core/images/..."
                                        />
                                        <button onClick={handleImportAsset} className="bg-blue-600 px-3 rounded text-xs font-bold text-white hover:bg-blue-500">Load</button>
                                    </div>
                                    <div className="text-[10px] text-slate-600">Or copy existing URL:</div>
                                    <input type="text" value={editForm.sprite} onChange={e => setEditForm({...editForm, sprite: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1 text-[10px] text-slate-400" />
                                </div>
                            </div>

                            {/* Spritesheet Tuning Parameters */}
                            <div className="border-t border-slate-800 pt-3 mt-2 space-y-3">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block">Detección y Dimensiones de Sprite</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded border border-slate-800/80">
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1 font-bold">Filas (Grid Rows)</label>
                                        <input 
                                            type="number" 
                                            min={1}
                                            value={editForm.spriteConfig?.rows || 1} 
                                            onChange={e => {
                                                const rows = Math.max(1, parseInt(e.target.value) || 1);
                                                setEditForm({
                                                    ...editForm,
                                                    spriteConfig: { ...(editForm.spriteConfig || { cols: 1 }), rows }
                                                });
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-400 font-mono focus:border-amber-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1 font-bold">Columnas (Grid Cols)</label>
                                        <input 
                                            type="number" 
                                            min={1}
                                            value={editForm.spriteConfig?.cols || 1} 
                                            onChange={e => {
                                                const cols = Math.max(1, parseInt(e.target.value) || 1);
                                                setEditForm({
                                                    ...editForm,
                                                    spriteConfig: { ...(editForm.spriteConfig || { rows: 1 }), cols }
                                                });
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-400 font-mono focus:border-amber-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1 font-bold">Ancho Base (Width)</label>
                                        <input 
                                            type="number" 
                                            step="0.05"
                                            value={editForm.spriteConfig?.charWidth ?? 0.8} 
                                            onChange={e => {
                                                const charWidth = parseFloat(e.target.value) || 0.8;
                                                setEditForm({
                                                    ...editForm,
                                                    spriteConfig: { ...(editForm.spriteConfig || { rows: 1, cols: 1 }), charWidth }
                                                });
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-mono focus:border-emerald-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1 font-bold">Alto Base (Height)</label>
                                        <input 
                                            type="number" 
                                            step="0.05"
                                            value={editForm.spriteConfig?.charHeight ?? 0.8} 
                                            onChange={e => {
                                                const charHeight = parseFloat(e.target.value) || 0.8;
                                                setEditForm({
                                                    ...editForm,
                                                    spriteConfig: { ...(editForm.spriteConfig || { rows: 1, cols: 1 }), charHeight }
                                                });
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-mono focus:border-emerald-500 outline-none" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded border border-slate-800/80">
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1 font-bold">Escala Horiz. (scaleX)</label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            value={editForm.spriteConfig?.scaleX ?? 1.0} 
                                            onChange={e => {
                                                const scaleX = parseFloat(e.target.value) || 1.0;
                                                setEditForm({
                                                    ...editForm,
                                                    spriteConfig: { ...(editForm.spriteConfig || { rows: 1, cols: 1 }), scaleX }
                                                });
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-sky-400 font-mono focus:border-sky-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1 font-bold">Escala Vert. (scaleY)</label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            value={editForm.spriteConfig?.scaleY ?? 1.0} 
                                            onChange={e => {
                                                const scaleY = parseFloat(e.target.value) || 1.0;
                                                setEditForm({
                                                    ...editForm,
                                                    spriteConfig: { ...(editForm.spriteConfig || { rows: 1, cols: 1 }), scaleY }
                                                });
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-sky-400 font-mono focus:border-sky-500 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1 font-bold">Desplazamiento Y (yOffset)</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={editForm.spriteConfig?.yOffset ?? 0.0} 
                                            onChange={e => {
                                                const yOffset = parseFloat(e.target.value) || 0.0;
                                                setEditForm({
                                                    ...editForm,
                                                    spriteConfig: { ...(editForm.spriteConfig || { rows: 1, cols: 1 }), yOffset }
                                                });
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-orange-400 font-mono focus:border-orange-500 outline-none" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded shadow-lg">SAVE UNIT</button>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">Select a unit to edit</div>
                )}
            </div>

            {/* Right: Encounter Tables */}
            <div className="w-72 bg-slate-950 rounded-lg border border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800">
                    <h4 className="font-bold text-slate-400 text-sm uppercase mb-2">Encounter Manager</h4>
                    <select 
                        value={activeTerrain} 
                        onChange={(e) => setActiveTerrain(e.target.value as TerrainType)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-amber-400 font-bold"
                    >
                        {Object.values(TerrainType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    <p className="text-[10px] text-slate-500 px-2 mb-2">Check units that spawn in {activeTerrain}:</p>
                    <div className="space-y-1">
                        {Object.values(enemies).map((enemy: EnemyDefinition) => {
                            const isSpawn = encounters[activeTerrain]?.includes(enemy.id);
                            return (
                                <label key={enemy.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-slate-900 ${isSpawn ? 'bg-slate-900/80' : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={isSpawn || false} 
                                        onChange={() => toggleEncounter(enemy.id)}
                                        className="accent-amber-500"
                                    />
                                    <img src={enemy.sprite} className="w-6 h-6 object-contain pixelated" />
                                    <span className={`text-xs font-bold ${isSpawn ? 'text-amber-100' : 'text-slate-500'}`}>{enemy.name}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
