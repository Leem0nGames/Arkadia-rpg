import React, { useState } from 'react';
import { useContentStore } from '../../store/contentStore';
import { useGameStore } from '../../store/gameStore';
import { Quest, QuestObjective } from '../../types';
import { CAMPAIGNS } from '../../data/campaigns';

export const CampaignEditor: React.FC = () => {
    const { campaigns, updateCampaign, createCampaign, deleteCampaign, items } = useContentStore();
    const { acceptQuest, quests, addLog } = useGameStore();

    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('GOBIN_TUTORIAL');
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');

    // Form State
    const [formId, setFormId] = useState('GOBIN_TUTORIAL');
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formType, setFormType] = useState<'CAMPAIGN' | 'MAIN' | 'SIDE'>('CAMPAIGN');
    const [formStageId, setFormStageId] = useState('STAGE_1');
    const [formObjectives, setFormObjectives] = useState<QuestObjective[]>([]);
    const [formRewardXp, setFormRewardXp] = useState<number>(23500);
    const [formRewardGold, setFormRewardGold] = useState<number>(1000);
    const [formRewardItems, setFormRewardItems] = useState<string[]>([]);
    const [selectedRewardItemInput, setSelectedRewardItemInput] = useState<string>('');

    // Load initial selection
    React.useEffect(() => {
        const target = campaigns[selectedCampaignId] || Object.values(campaigns)[0];
        if (target) {
            handleSelectCampaign(target.id);
        }
    }, []);

    const campaignList = Object.values(campaigns).filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'ALL' || c.type === filterType;
        return matchesSearch && matchesType;
    });

    const handleSelectCampaign = (id: string) => {
        const c = campaigns[id];
        if (!c) return;
        setSelectedCampaignId(id);
        setFormId(c.id);
        setFormTitle(c.title);
        setFormDescription(c.description);
        setFormType(c.type || 'CAMPAIGN');
        setFormStageId(c.currentStageId || 'STAGE_1');
        setFormObjectives(c.objectives ? JSON.parse(JSON.stringify(c.objectives)) : []);
        setFormRewardXp(c.reward?.xp || (c.id === 'GOBIN_TUTORIAL' ? 23500 : 5000));
        setFormRewardGold(c.reward?.gold || (c.id === 'GOBIN_TUTORIAL' ? 1000 : 2500));
        setFormRewardItems(c.reward?.items || []);
    };

    const handleNewCampaign = () => {
        const newId = `CUSTOM_CAMPAIGN_${Date.now().toString().slice(-4)}`;
        setSelectedCampaignId('NEW_CAMPAIGN');
        setFormId(newId);
        setFormTitle('Nueva Campaña de Aventuras');
        setFormDescription('Describe la trama, los objetivos de exploración, combate o interacción con NPCs.');
        setFormType('CAMPAIGN');
        setFormStageId('STAGE_1_START');
        setFormObjectives([
            {
                id: 'OBJ_1',
                description: 'Habla con los aldeanos para descubrir información',
                type: 'INTERACT',
                targetId: 'NPC_CLUE',
                currentProgress: 0,
                requiredProgress: 1,
                completed: false
            }
        ]);
        setFormRewardXp(5000);
        setFormRewardGold(500);
        setFormRewardItems([]);
    };

    const handleAddObjective = () => {
        const newObj: QuestObjective = {
            id: `OBJ_${Date.now().toString().slice(-4)}`,
            description: 'Nuevo objetivo de la misión',
            type: 'KILL',
            targetId: 'ENEMY_TARGET',
            currentProgress: 0,
            requiredProgress: 1,
            completed: false
        };
        setFormObjectives([...formObjectives, newObj]);
    };

    const handleUpdateObjective = (index: number, field: keyof QuestObjective, value: any) => {
        const updated = [...formObjectives];
        updated[index] = { ...updated[index], [field]: value };
        setFormObjectives(updated);
    };

    const handleRemoveObjective = (index: number) => {
        setFormObjectives(formObjectives.filter((_, i) => i !== index));
    };

    const handleAddRewardItem = () => {
        if (!selectedRewardItemInput) return;
        if (!formRewardItems.includes(selectedRewardItemInput)) {
            setFormRewardItems([...formRewardItems, selectedRewardItemInput]);
        }
        setSelectedRewardItemInput('');
    };

    const handleRemoveRewardItem = (itemId: string) => {
        setFormRewardItems(formRewardItems.filter(id => id !== itemId));
    };

    const handleSave = () => {
        if (!formId.trim() || !formTitle.trim()) {
            alert('Por favor completa el ID y el Título de la campaña.');
            return;
        }

        const formattedId = formId.toUpperCase().replace(/\s+/g, '_');
        const questData: Quest = {
            id: formattedId,
            title: formTitle,
            description: formDescription,
            type: formType,
            completed: false,
            currentStageId: formStageId,
            objectives: formObjectives,
            reward: {
                xp: formRewardXp,
                gold: formRewardGold,
                items: formRewardItems
            }
        };

        if (selectedCampaignId === 'NEW_CAMPAIGN') {
            createCampaign(questData);
        } else {
            if (selectedCampaignId !== formattedId) {
                deleteCampaign(selectedCampaignId);
            }
            updateCampaign(formattedId, questData);
        }

        setSelectedCampaignId(formattedId);
        alert(`¡Campaña "${formTitle}" guardada con éxito!`);
    };

    const handleDelete = () => {
        if (confirm(`¿Estás seguro de eliminar la campaña "${formTitle}"?`)) {
            deleteCampaign(selectedCampaignId);
            const remaining = Object.values(campaigns).filter(c => c.id !== selectedCampaignId);
            if (remaining.length > 0) {
                handleSelectCampaign(remaining[0].id);
            } else {
                handleNewCampaign();
            }
            alert('Campaña eliminada.');
        }
    };

    const handlePlaytest = () => {
        const questData: Quest = {
            id: formId,
            title: formTitle,
            description: formDescription,
            type: formType,
            completed: false,
            currentStageId: formStageId,
            objectives: formObjectives,
            reward: {
                xp: formRewardXp,
                gold: formRewardGold,
                items: formRewardItems
            }
        };
        acceptQuest(questData);
        addLog(`📜 [Admin] Campaña "${formTitle}" activada en el registro de misiones del grupo.`, "narrative");
        alert(`¡Campaña "${formTitle}" activada en el registro de misiones del grupo! Puedes probarla en el Overworld.`);
    };

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Header & Stats Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">📜</span>
                    <div>
                        <h2 className="text-lg font-bold text-amber-300 font-serif">Editor de Campañas y Misiones</h2>
                        <p className="text-xs text-slate-400">
                            Crea y edita campañas tutoriales, cadenas de objetivos (NPCs, mazmorras, jefes) y recompensas de experiencia y equipo.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleNewCampaign}
                        className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-900/20 flex items-center gap-1.5"
                    >
                        <span>➕</span> Nueva Campaña
                    </button>
                </div>
            </div>

            {/* Main Content Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Left Panel: Campaign List */}
                <div className="lg:col-span-4 bg-slate-900/40 rounded-xl border border-slate-800 p-4 flex flex-col gap-3 min-h-[400px]">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Buscar campaña o ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none"
                        />
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="bg-slate-950/80 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-300 focus:border-amber-500 outline-none"
                        >
                            <option value="ALL">Todas</option>
                            <option value="CAMPAIGN">Campaña</option>
                            <option value="MAIN">Principal</option>
                            <option value="SIDE">Secundaria</option>
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {campaignList.map(c => {
                            const isSelected = selectedCampaignId === c.id;
                            const isTutorial = c.id.includes('TUTORIAL') || c.id.includes('GOBIN');
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => handleSelectCampaign(c.id)}
                                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-amber-950/40 border-amber-500/80 shadow-md shadow-amber-950/30'
                                            : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="font-serif font-bold text-xs text-slate-200 truncate">
                                            {isTutorial ? '🔰 ' : '🐉 '}
                                            {c.title}
                                        </span>
                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${
                                            isTutorial ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
                                        }`}>
                                            {c.type}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                                        {c.description}
                                    </p>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
                                        <span>🎯 {c.objectives?.length || 0} Objetivos</span>
                                        <span className="text-amber-400 font-bold">
                                            +{c.reward?.xp || (c.id === 'GOBIN_TUTORIAL' ? 23500 : 5000)} XP
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel: Campaign Inspector & Editor */}
                <div className="lg:col-span-8 bg-slate-900/40 rounded-xl border border-slate-800 p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                    {/* General Info */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-serif font-bold text-sm text-amber-200 uppercase tracking-wider">
                                📋 Parámetros de la Campaña
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePlaytest}
                                    className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                    title="Cargar esta campaña directamente en la partida actual para testearla"
                                >
                                    🎮 Testear en Partida
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={selectedCampaignId === 'GOBIN_TUTORIAL' || selectedCampaignId === 'DRAGON_HUNT'}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        selectedCampaignId === 'GOBIN_TUTORIAL' || selectedCampaignId === 'DRAGON_HUNT'
                                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                            : 'bg-red-900/60 hover:bg-red-700 text-red-200 border border-red-800'
                                    }`}
                                >
                                    🗑️ Eliminar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-950/40"
                                >
                                    💾 Guardar Cambios
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1">ID Único</label>
                                <input
                                    type="text"
                                    value={formId}
                                    onChange={e => setFormId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1">Título de la Campaña</label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none font-serif font-bold"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1">Tipo de Misión</label>
                                <select
                                    value={formType}
                                    onChange={e => setFormType(e.target.value as any)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none"
                                >
                                    <option value="CAMPAIGN">Campaña Completa / Tutorial</option>
                                    <option value="MAIN">Misión Principal</option>
                                    <option value="SIDE">Misión Secundaria</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1">ID Etapa Actual</label>
                                <input
                                    type="text"
                                    value={formStageId}
                                    onChange={e => setFormStageId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-amber-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">Sinopsis y Descripción Narrativa</label>
                            <textarea
                                rows={2}
                                value={formDescription}
                                onChange={e => setFormDescription(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 focus:border-amber-500 outline-none leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* Objectives Section */}
                    <div className="space-y-3 pt-3 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-serif font-bold text-sm text-amber-200 uppercase tracking-wider">
                                    🎯 Cadena de Objetivos ({formObjectives.length})
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    Configura pasos interactivos: preguntar a NPCs, explorar puntos del mapa o derrotar jefes.
                                </p>
                            </div>
                            <button
                                onClick={handleAddObjective}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                                ➕ Añadir Objetivo
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formObjectives.map((obj, idx) => (
                                <div key={obj.id || idx} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/90 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-mono font-bold text-amber-400">
                                            #{idx + 1} - {obj.id}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveObjective(idx)}
                                            className="text-slate-500 hover:text-red-400 text-xs px-2 py-1 rounded bg-slate-900 border border-slate-800 transition-colors"
                                        >
                                            ✕ Quitar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                        <div className="md:col-span-3">
                                            <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Tipo Objetivo</label>
                                            <select
                                                value={obj.type}
                                                onChange={e => handleUpdateObjective(idx, 'type', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                                            >
                                                <option value="INTERACT">INTERACT (Hablar / NPC)</option>
                                                <option value="EXPLORE">EXPLORE (Investigar POI)</option>
                                                <option value="KILL">KILL (Derrotar Monstruo)</option>
                                                <option value="COLLECT">COLLECT (Reunir Pistas/Items)</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-4">
                                            <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Target ID (NPC / POI / Jefe)</label>
                                            <input
                                                type="text"
                                                value={obj.targetId || ''}
                                                onChange={e => handleUpdateObjective(idx, 'targetId', e.target.value)}
                                                placeholder="Ej. NPC_GOBLIN_CLUE, GOBLIN_LAIR"
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Progreso Requerido</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={obj.requiredProgress}
                                                onChange={e => handleUpdateObjective(idx, 'requiredProgress', parseInt(e.target.value) || 1)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-amber-300"
                                            />
                                        </div>

                                        <div className="md:col-span-3">
                                            <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Progreso Actual (Test)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={obj.requiredProgress}
                                                value={obj.currentProgress}
                                                onChange={e => handleUpdateObjective(idx, 'currentProgress', parseInt(e.target.value) || 0)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-emerald-300"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Descripción para el Jugador</label>
                                        <input
                                            type="text"
                                            value={obj.description}
                                            onChange={e => handleUpdateObjective(idx, 'description', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rewards Section */}
                    <div className="space-y-4 pt-3 border-t border-slate-800">
                        <div>
                            <h3 className="font-serif font-bold text-sm text-amber-200 uppercase tracking-wider">
                                🎁 Recompensas de la Campaña
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                Experiencia masiva para escalar al grupo de Nivel 1 a 7, oro y equipamiento forjado.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1">Recompensa de EXP Total (+EXP)</label>
                                <input
                                    type="number"
                                    value={formRewardXp}
                                    onChange={e => setFormRewardXp(parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-purple-400 font-bold"
                                />
                                <span className="text-[10px] text-slate-500">
                                    Nota: +23,500 EXP sube inmediatamente al grupo completo de Nivel 1 a Nivel 7.
                                </span>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1">Recompensa de Oro (🪙 GP)</label>
                                <input
                                    type="number"
                                    value={formRewardGold}
                                    onChange={e => setFormRewardGold(parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-amber-400 font-bold"
                                />
                            </div>
                        </div>

                        {/* Extra Items Reward Selector */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-400">Ítems Otorgados al Completar</label>
                            <div className="flex gap-2">
                                <select
                                    value={selectedRewardItemInput}
                                    onChange={e => setSelectedRewardItemInput(e.target.value)}
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none"
                                >
                                    <option value="">-- Seleccionar ítem de la base de datos --</option>
                                    {Object.values(items).map(item => (
                                        <option key={item.id} value={item.id}>
                                            [{item.rarity}] {item.name} ({item.type})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAddRewardItem}
                                    disabled={!selectedRewardItemInput}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                    ➕ Agregar Ítem
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-2">
                                {formRewardItems.map(itemId => {
                                    const itemData = items[itemId] || items[itemId.toUpperCase()] || Object.values(items).find(i => i.id === itemId);
                                    return (
                                        <span
                                            key={itemId}
                                            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2"
                                        >
                                            <span>⚔️ {itemData?.name || itemId}</span>
                                            <button
                                                onClick={() => handleRemoveRewardItem(itemId)}
                                                className="text-slate-500 hover:text-red-400 font-bold"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
