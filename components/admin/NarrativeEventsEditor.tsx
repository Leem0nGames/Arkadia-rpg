import React, { useState } from 'react';
import { useContentStore } from '../../store/contentStore';
import { TerrainType } from '../../types';

export const NarrativeEventsEditor: React.FC = () => {
    const { 
        narrativeEvents, 
        updateNarrativeEvent, 
        createNarrativeEvent, 
        deleteNarrativeEvent,
        enemies,
        items
    } = useContentStore();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<any>>({});
    const [activeChoiceIdx, setActiveChoiceIdx] = useState<number>(0);

    const eventList = Object.values(narrativeEvents || {});
    const enemyList = Object.keys(enemies || []);
    const itemList = Object.values(items || {});

    const handleSelect = (id: string) => {
        setSelectedId(id);
        setEditForm({ ...narrativeEvents[id] });
        setActiveChoiceIdx(0);
    };

    const handleCreate = () => {
        const newId = 'event_' + Math.random().toString(36).substr(2, 9);
        const newEvent = {
            id: newId,
            title: 'Nuevo Evento Narrativo',
            description: 'Un misterioso encuentro se presenta ante los héroes...',
            triggerType: 'TERRAIN' as const,
            terrainType: TerrainType.FOREST,
            choices: [
                {
                    text: 'Avanzar con precaución',
                    outcome: {
                        text: 'El grupo avanza cautelosamente, evitando peligros.',
                        goldChange: 0,
                        hpChange: 0,
                        xpReward: 25,
                        startBattle: false,
                        battleEnemies: []
                    }
                }
            ]
        };
        createNarrativeEvent(newEvent);
        handleSelect(newId);
    };

    const handleSave = () => {
        if (!selectedId || !editForm.id) return;
        updateNarrativeEvent(selectedId, editForm as any);
        alert('¡Evento narrativo guardado con éxito!');
    };

    const handleDelete = () => {
        if (!selectedId) return;
        if (confirm('¿Seguro que deseas eliminar este evento narrativo?')) {
            deleteNarrativeEvent(selectedId);
            setSelectedId(null);
            setEditForm({});
        }
    };

    const handleFieldChange = (field: string, value: any) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const handleChoiceFieldChange = (idx: number, field: string, value: any) => {
        const updatedChoices = [...(editForm.choices || [])];
        updatedChoices[idx] = {
            ...updatedChoices[idx],
            [field]: value
        };
        handleFieldChange('choices', updatedChoices);
    };

    const handleOutcomeFieldChange = (idx: number, field: string, value: any) => {
        const updatedChoices = [...(editForm.choices || [])];
        updatedChoices[idx] = {
            ...updatedChoices[idx],
            outcome: {
                ...updatedChoices[idx].outcome,
                [field]: value
            }
        };
        handleFieldChange('choices', updatedChoices);
    };

    const handleAddChoice = () => {
        const updatedChoices = [...(editForm.choices || [])];
        updatedChoices.push({
            text: 'Nueva Opción',
            outcome: {
                text: 'Descripción del resultado que verán los jugadores.',
                goldChange: 0,
                hpChange: 0,
                xpReward: 0,
                startBattle: false,
                battleEnemies: []
            }
        });
        handleFieldChange('choices', updatedChoices);
        setActiveChoiceIdx(updatedChoices.length - 1);
    };

    const handleRemoveChoice = (idx: number) => {
        const updatedChoices = [...(editForm.choices || [])];
        updatedChoices.splice(idx, 1);
        handleFieldChange('choices', updatedChoices);
        setActiveChoiceIdx(Math.max(0, idx - 1));
    };

    const handleToggleEnemySelection = (choiceIdx: number, enemyId: string) => {
        const choice = editForm.choices?.[choiceIdx];
        if (!choice) return;
        const currentEnemies = choice.outcome.battleEnemies || [];
        let updated: string[];
        if (currentEnemies.includes(enemyId)) {
            updated = currentEnemies.filter((id: string) => id !== enemyId);
        } else {
            updated = [...currentEnemies, enemyId];
        }
        handleOutcomeFieldChange(choiceIdx, 'battleEnemies', updated);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
            {/* Left Pane: List of events */}
            <div className="lg:col-span-4 bg-slate-950/60 border border-slate-800 rounded-lg p-4 flex flex-col h-[650px]">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Encuentros Narrativos</h3>
                    <button
                        onClick={handleCreate}
                        className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 text-xs font-bold rounded shadow transition-all active:scale-95"
                    >
                        + Crear Evento
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                    {eventList.map(ev => (
                        <button
                            key={ev.id}
                            onClick={() => handleSelect(ev.id)}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                                selectedId === ev.id 
                                    ? 'bg-amber-600/10 border-amber-500 text-white shadow' 
                                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                        >
                            <div className="font-bold text-xs line-clamp-1">{ev.title}</div>
                            <div className="text-[10px] text-amber-500/80 font-mono mt-1 uppercase flex items-center justify-between">
                                <span>{ev.triggerType}</span>
                                {ev.triggerType === 'COORDINATES' ? (
                                    <span>Q:{ev.coordinateQ} R:{ev.coordinateR}</span>
                                ) : (
                                    <span>{ev.terrainType}</span>
                                )}
                            </div>
                        </button>
                    ))}
                    {eventList.length === 0 && (
                        <div className="text-center py-12 text-xs text-slate-500">
                            No hay encuentros configurados.
                        </div>
                    )}
                </div>
            </div>

            {/* Right Pane: Event Editor Form */}
            <div className="lg:col-span-8 bg-slate-850 border border-slate-700/80 rounded-lg p-6 flex flex-col min-h-[650px] overflow-y-auto custom-scrollbar">
                {selectedId && editForm.id ? (
                    <div className="space-y-6">
                        {/* Section 1: Basic Information */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">1. Configuración Básica</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">ID del Evento</label>
                                    <input
                                        type="text"
                                        value={editForm.id}
                                        disabled
                                        className="w-full bg-slate-900/60 border border-slate-800 text-slate-500 rounded px-3 py-2 text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Título del Evento</label>
                                    <input
                                        type="text"
                                        value={editForm.title || ''}
                                        onChange={e => handleFieldChange('title', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Descripción del Escenario (Inicio del Evento)</label>
                                <textarea
                                    value={editForm.description || ''}
                                    onChange={e => handleFieldChange('description', e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 resize-none focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Tipo de Activación</label>
                                    <select
                                        value={editForm.triggerType || 'TERRAIN'}
                                        onChange={e => handleFieldChange('triggerType', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                                    >
                                        <option value="TERRAIN">Por Terreno (Biome)</option>
                                        <option value="COORDINATES">Por Coordenadas Fijas</option>
                                    </select>
                                </div>

                                {editForm.triggerType === 'COORDINATES' ? (
                                    <>
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Coordenada Q (X)</label>
                                            <input
                                                type="number"
                                                value={editForm.coordinateQ ?? 0}
                                                onChange={e => handleFieldChange('coordinateQ', parseInt(e.target.value) || 0)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Coordenada R (Y)</label>
                                            <input
                                                type="number"
                                                value={editForm.coordinateR ?? 0}
                                                onChange={e => handleFieldChange('coordinateR', parseInt(e.target.value) || 0)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Terreno (Bioma)</label>
                                        <select
                                            value={editForm.terrainType || TerrainType.FOREST}
                                            onChange={e => handleFieldChange('terrainType', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                                        >
                                            {Object.values(TerrainType).map(t => (
                                                <option key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 2: Branching Choices & Moral Decisions */}
                        <div className="space-y-4 border-t border-slate-800 pt-5">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">2. Decisiones y Opciones ({editForm.choices?.length || 0})</h4>
                                <button
                                    onClick={handleAddChoice}
                                    className="bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-400 px-2.5 py-1 text-xs font-bold rounded transition-all"
                                >
                                    + Añadir Opción
                                </button>
                            </div>

                            {/* Options Tabs */}
                            <div className="flex flex-wrap gap-2">
                                {(editForm.choices || []).map((ch: any, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveChoiceIdx(idx)}
                                        className={`px-3 py-1.5 rounded text-xs font-extrabold transition-all border ${
                                            activeChoiceIdx === idx 
                                                ? 'bg-amber-600 text-slate-950 border-amber-500' 
                                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                                        }`}
                                    >
                                        Opción {idx + 1}
                                    </button>
                                ))}
                            </div>

                            {/* Active Option Form Panel */}
                            {editForm.choices?.[activeChoiceIdx] ? (
                                <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-300">Configuración de Opción #{activeChoiceIdx + 1}</span>
                                        <button
                                            onClick={() => handleRemoveChoice(activeChoiceIdx)}
                                            className="text-red-400 hover:text-red-300 text-xs font-bold"
                                        >
                                            ✕ Eliminar Opción
                                        </button>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Texto del Botón de Opción</label>
                                        <input
                                            type="text"
                                            value={editForm.choices[activeChoiceIdx].text || ''}
                                            onChange={e => handleChoiceFieldChange(activeChoiceIdx, 'text', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                                            placeholder="Ej: Intentar sobornar al trol con 100 de oro"
                                        />
                                    </div>

                                    {/* Option Outcomes */}
                                    <div className="border-t border-slate-800/80 pt-4 space-y-4">
                                        <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Resultados de esta Decisión</h5>
                                        
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Narrativa del Resultado</label>
                                            <textarea
                                                value={editForm.choices[activeChoiceIdx].outcome?.text || ''}
                                                onChange={e => handleOutcomeFieldChange(activeChoiceIdx, 'text', e.target.value)}
                                                rows={2}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 resize-none focus:border-amber-500 focus:outline-none"
                                                placeholder="Describe qué pasa después de elegir esta opción..."
                                            />
                                        </div>

                                        {/* Modifiers Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Modificación de Oro</label>
                                                <input
                                                    type="number"
                                                    value={editForm.choices[activeChoiceIdx].outcome?.goldChange ?? 0}
                                                    onChange={e => handleOutcomeFieldChange(activeChoiceIdx, 'goldChange', parseInt(e.target.value) || 0)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-center font-mono text-slate-200"
                                                    placeholder="Ej: -100 o +200"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Modificación de HP</label>
                                                <input
                                                    type="number"
                                                    value={editForm.choices[activeChoiceIdx].outcome?.hpChange ?? 0}
                                                    onChange={e => handleOutcomeFieldChange(activeChoiceIdx, 'hpChange', parseInt(e.target.value) || 0)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-center font-mono text-slate-200"
                                                    placeholder="Ej: -10 o +15"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Recompensa de XP</label>
                                                <input
                                                    type="number"
                                                    value={editForm.choices[activeChoiceIdx].outcome?.xpReward ?? 0}
                                                    onChange={e => handleOutcomeFieldChange(activeChoiceIdx, 'xpReward', parseInt(e.target.value) || 0)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-center font-mono text-slate-200"
                                                    placeholder="Ej: 50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Obtener Objeto</label>
                                                <select
                                                    value={editForm.choices[activeChoiceIdx].outcome?.gainItem || ''}
                                                    onChange={e => handleOutcomeFieldChange(activeChoiceIdx, 'gainItem', e.target.value || undefined)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                                                >
                                                    <option value="">-- Ninguno --</option>
                                                    {itemList.map(it => (
                                                        <option key={it.id} value={it.id}>{it.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Combat Triggers */}
                                        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
                                            <div className="flex flex-wrap gap-6">
                                                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!editForm.choices[activeChoiceIdx].outcome?.startBattle}
                                                        onChange={e => handleOutcomeFieldChange(activeChoiceIdx, 'startBattle', e.target.checked)}
                                                        className="w-4 h-4 accent-amber-500 rounded border-slate-700"
                                                    />
                                                    Activar Combate Táctico
                                                </label>

                                                {editForm.choices[activeChoiceIdx].outcome?.startBattle && (
                                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-rose-400 animate-pulse">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!editForm.choices[activeChoiceIdx].outcome?.isBoss}
                                                            onChange={e => handleOutcomeFieldChange(activeChoiceIdx, 'isBoss', e.target.checked)}
                                                            className="w-4 h-4 accent-rose-500 rounded border-slate-700"
                                                        />
                                                        Combate contra Jefe (Boss Double-HP/AC Stats)
                                                    </label>
                                                )}
                                            </div>

                                            {editForm.choices[activeChoiceIdx].outcome?.startBattle && (
                                                <div className="space-y-2 pt-2 border-t border-slate-800">
                                                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Enemigos que Spawnean en Batalla ({editForm.choices[activeChoiceIdx].outcome?.battleEnemies?.length || 0})</span>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto custom-scrollbar p-1">
                                                        {enemyList.map(enemyId => {
                                                            const isSelected = (editForm.choices[activeChoiceIdx].outcome?.battleEnemies || []).includes(enemyId);
                                                            const def = enemies[enemyId];
                                                            return (
                                                                <button
                                                                    key={enemyId}
                                                                    onClick={() => handleToggleEnemySelection(activeChoiceIdx, enemyId)}
                                                                    className={`flex items-center justify-between p-2 rounded-lg text-left text-xs border transition-all ${
                                                                        isSelected 
                                                                            ? 'bg-red-950/40 border-red-500/50 text-red-200 font-bold' 
                                                                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                                                    }`}
                                                                >
                                                                    <span>{def?.name || enemyId}</span>
                                                                    {isSelected && <span className="text-red-500 text-[10px]">✔</span>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic py-4 text-center">No hay opciones definidas para este encuentro.</p>
                            )}
                        </div>

                        {/* Save / Delete actions */}
                        <div className="border-t border-slate-800 pt-5 flex justify-between items-center">
                            <button
                                onClick={handleDelete}
                                className="bg-red-950/30 border border-red-800 text-red-400 hover:bg-red-950/50 px-4 py-2.5 text-xs font-bold rounded transition-all active:scale-95"
                            >
                                Eliminar Encuentro
                            </button>

                            <button
                                onClick={handleSave}
                                className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-6 py-2.5 text-xs font-black tracking-widest uppercase rounded shadow shadow-amber-600/10 transition-all active:scale-95"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-20">
                        <span className="text-4xl mb-3">📜</span>
                        <p className="text-sm font-bold text-slate-400">Selecciona un encuentro narrativo</p>
                        <p className="text-xs text-slate-500 mt-1">O crea uno nuevo para empezar a diseñar decisiones y aventuras.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
