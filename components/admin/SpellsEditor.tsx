
import React, { useState } from 'react';
import { useContentStore } from '../../store/contentStore';
import { CharacterClass, Spell, SpellType } from '../../types';

export const SpellsEditor: React.FC = () => {
    const { spells, classSpells, updateSpell, createSpell, deleteSpell, updateClassSpells } = useContentStore();
    const [subTab, setSubTab] = useState<'MANAGE' | 'CLASSES'>('MANAGE');
    const [selectedSpellId, setSelectedSpellId] = useState<string>('');
    const [search, setSearch] = useState('');
    
    // Form State
    const [formId, setFormId] = useState('');
    const [formName, setFormName] = useState('');
    const [formLevel, setFormLevel] = useState<number>(1);
    const [formType, setFormType] = useState<SpellType>(SpellType.DAMAGE);
    const [formDiceCount, setFormDiceCount] = useState<number>(1);
    const [formDiceSides, setFormDiceSides] = useState<number>(6);
    const [formRange, setFormRange] = useState<number>(6);
    const [formDescription, setFormDescription] = useState('');
    const [formManaCost, setFormManaCost] = useState<number>(1);
    
    const [activeClass, setActiveClass] = useState<CharacterClass>(CharacterClass.WIZARD);

    const spellList = Object.keys(spells).map(key => ({
        key,
        ...spells[key]
    })).filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.key.toLowerCase().includes(search.toLowerCase()));

    const handleSelectSpell = (key: string) => {
        const s = spells[key];
        if (!s) return;
        setSelectedSpellId(key);
        setFormId(s.id || key);
        setFormName(s.name);
        setFormLevel(s.level);
        setFormType(s.type);
        setFormDiceCount(s.diceCount);
        setFormDiceSides(s.diceSides);
        setFormRange(s.range);
        setFormDescription(s.description || '');
        setFormManaCost(s.manaCost !== undefined ? s.manaCost : (s.level > 0 ? 1 : 0));
    };

    const handleNewSpell = () => {
        setSelectedSpellId('NEW_SPELL');
        setFormId('NEW_SPELL');
        setFormName('New Arcane Spell');
        setFormLevel(1);
        setFormType(SpellType.DAMAGE);
        setFormDiceCount(1);
        setFormDiceSides(6);
        setFormRange(6);
        setFormDescription('Deals magic damage or restores hit points.');
        setFormManaCost(1);
    };

    const handleSave = () => {
        if (!formId.trim()) {
            alert('Please enter a valid unique ID.');
            return;
        }
        const key = formId.toUpperCase().replace(/\s+/g, '_');
        const updatedSpell: Spell = {
            id: formId.toLowerCase().replace(/\s+/g, '_'),
            name: formName,
            level: formLevel,
            type: formType,
            diceCount: formDiceCount,
            diceSides: formDiceSides,
            range: formRange,
            description: formDescription,
            manaCost: formManaCost
        };

        if (selectedSpellId === 'NEW_SPELL') {
            createSpell(updatedSpell);
        } else {
            // Delete old one if ID changed
            if (selectedSpellId !== key) {
                deleteSpell(selectedSpellId);
            }
            updateSpell(key, updatedSpell);
        }
        setSelectedSpellId(key);
        alert('Spell configurations saved successfully!');
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete spell "${formName}"?`)) {
            deleteSpell(selectedSpellId);
            setSelectedSpellId('');
            alert('Spell deleted!');
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Sub Tabs */}
            <div className="flex border-b border-slate-800 gap-4">
                <button
                    onClick={() => setSubTab('MANAGE')}
                    className={`px-4 py-2 font-bold text-sm border-b-2 transition-all ${subTab === 'MANAGE' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    Manage Spells & Abilities
                </button>
                <button
                    onClick={() => setSubTab('CLASSES')}
                    className={`px-4 py-2 font-bold text-sm border-b-2 transition-all ${subTab === 'CLASSES' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    Class Spell Lists
                </button>
            </div>

            {subTab === 'MANAGE' ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
                    {/* Left Pane: List */}
                    <div className="md:col-span-4 bg-slate-950/60 border border-slate-800 rounded-lg p-4 flex flex-col h-[550px]">
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Search spells..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-slate-700"
                            />
                            <button
                                onClick={handleNewSpell}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 text-xs font-bold rounded"
                            >
                                + New
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {spellList.map(s => (
                                <button
                                    key={s.key}
                                    onClick={() => handleSelectSpell(s.key)}
                                    className={`w-full text-left p-3 rounded border transition-all flex items-center justify-between ${selectedSpellId === s.key ? 'bg-amber-600/20 border-amber-500/50 text-white' : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:border-slate-700'}`}
                                >
                                    <div>
                                        <div className="font-bold text-sm">{s.name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                                            {s.type} • Lvl {s.level}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono">
                                        {s.diceCount}d{s.diceSides}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Pane: Form */}
                    <div className="md:col-span-8 bg-slate-850 border border-slate-700 rounded-lg p-6 flex flex-col h-[550px] justify-between">
                        {selectedSpellId ? (
                            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Unique Spell ID</label>
                                        <input
                                            type="text"
                                            value={formId}
                                            onChange={e => setFormId(e.target.value)}
                                            placeholder="e.g. MAGIC_MISSILE"
                                            disabled={selectedSpellId !== 'NEW_SPELL'}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:border-amber-500 focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Spell Name</label>
                                        <input
                                            type="text"
                                            value={formName}
                                            onChange={e => setFormName(e.target.value)}
                                            placeholder="e.g. Magic Missile"
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Spell Level</label>
                                        <input
                                            type="number"
                                            value={formLevel}
                                            min={0}
                                            max={9}
                                            onChange={e => setFormLevel(parseInt(e.target.value) || 0)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Spell Effect Type</label>
                                        <select
                                            value={formType}
                                            onChange={e => setFormType(e.target.value as SpellType)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
                                        >
                                            <option value={SpellType.DAMAGE}>Damage (Offensive)</option>
                                            <option value={SpellType.HEAL}>Heal (Support)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Cast Range (Tiles)</label>
                                        <input
                                            type="number"
                                            value={formRange}
                                            min={1}
                                            onChange={e => setFormRange(parseInt(e.target.value) || 1)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Dice Count</label>
                                        <input
                                            type="number"
                                            value={formDiceCount}
                                            min={1}
                                            onChange={e => setFormDiceCount(parseInt(e.target.value) || 1)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Mana Cost</label>
                                        <input
                                            type="number"
                                            value={formManaCost}
                                            min={0}
                                            onChange={e => setFormManaCost(parseInt(e.target.value) || 0)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Dice Sides</label>
                                    <select
                                        value={formDiceSides}
                                        onChange={e => setFormDiceSides(parseInt(e.target.value) || 6)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                                    >
                                        <option value={4}>d4 (Light)</option>
                                        <option value={6}>d6 (Standard)</option>
                                        <option value={8}>d8 (Heavy)</option>
                                        <option value={10}>d10 (Devastating)</option>
                                        <option value={12}>d12 (Colossal)</option>
                                        <option value={20}>d20 (Legendary)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Description</label>
                                    <textarea
                                        value={formDescription}
                                        onChange={e => setFormDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Brief flavor or gameplay description..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 resize-none focus:border-amber-500 focus:outline-none"
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-800 flex gap-4">
                                    <button
                                        onClick={handleSave}
                                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-2.5 rounded text-sm transition-colors"
                                    >
                                        Save Spell Config
                                    </button>
                                    {selectedSpellId !== 'NEW_SPELL' && (
                                        <button
                                            onClick={handleDelete}
                                            className="text-red-400 hover:text-red-300 font-bold px-4 py-2 text-sm border border-red-900/60 hover:bg-red-900/10 rounded transition-all"
                                        >
                                            Delete Spell
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                                <span className="text-4xl mb-2">🪄</span>
                                <p className="text-sm">Select a spell from the list, or create a brand new spell to start editing.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
                    {/* Left Pane: Select Class */}
                    <div className="md:col-span-4 bg-slate-950/60 border border-slate-800 rounded-lg p-4 flex flex-col h-[500px]">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Select Character Class</h4>
                        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                            {Object.values(CharacterClass).map(cls => {
                                const count = (classSpells[cls] || []).length;
                                return (
                                    <button
                                        key={cls}
                                        onClick={() => setActiveClass(cls)}
                                        className={`w-full text-left px-4 py-3 rounded text-sm font-bold capitalize transition-all flex justify-between items-center ${activeClass === cls ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'}`}
                                    >
                                        <span>{cls}</span>
                                        <span className="text-xs bg-slate-900 text-slate-500 px-2 py-0.5 rounded-full font-mono">{count} Spells</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Pane: Manage Assigned Spells */}
                    <div className="md:col-span-8 bg-slate-850 border border-slate-700 rounded-lg p-6 flex flex-col h-[500px] overflow-hidden">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-200 capitalize">Spells assigned to {activeClass}</h3>
                            <p className="text-xs text-slate-400 mt-1">Select which spells this class can cast in battle.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 custom-scrollbar">
                            {Object.keys(spells).map(key => {
                                const spell = spells[key];
                                const currentList = classSpells[activeClass] || [];
                                const isChecked = currentList.includes(key) || currentList.includes(key.toLowerCase());

                                const handleToggle = () => {
                                    let newList = [...currentList];
                                    const matchIndex = newList.findIndex(id => id.toUpperCase() === key.toUpperCase());
                                    
                                    if (matchIndex > -1) {
                                        newList.splice(matchIndex, 1);
                                    } else {
                                        newList.push(key);
                                    }
                                    updateClassSpells(activeClass, newList);
                                };

                                return (
                                    <button
                                        key={key}
                                        onClick={handleToggle}
                                        className={`p-3 rounded border text-left transition-all flex items-start gap-3 ${isChecked ? 'bg-amber-600/10 border-amber-500/40 text-amber-300' : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            readOnly
                                            className="mt-1 accent-amber-500 pointer-events-none"
                                        />
                                        <div>
                                            <div className="font-bold text-sm text-slate-200">{spell.name}</div>
                                            <div className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">
                                                Level {spell.level} • {spell.type}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{spell.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
