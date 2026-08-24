import React from 'react';
import { useContentStore } from '../../store/contentStore';
import { CharacterRace, Ability } from '../../types';

export const RacesAndRulesEditor: React.FC = () => {
    const { raceBonus, updateRaceBonus, xpTable, updateXpTable, difficultySettings, updateDifficultySettings } = useContentStore();

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Racial Bonuses Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-xl font-bold text-amber-400 mb-4">Racial Ability Score Bonuses</h3>
                <p className="text-xs text-slate-400 mb-6">Configure the base attribute increments granted during character creation.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.values(CharacterRace).map(race => {
                        const bonus = raceBonus[race] || {};
                        return (
                            <div key={race} className="bg-slate-950/60 p-4 rounded border border-slate-800">
                                <h4 className="font-bold text-slate-200 capitalize mb-3">{race}</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.values(Ability).map(ability => (
                                        <div key={ability} className="flex flex-col">
                                            <label className="text-[10px] text-slate-500 uppercase font-mono">{ability}</label>
                                            <input
                                                type="number"
                                                value={bonus[ability] || 0}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    updateRaceBonus(race, { ...bonus, [ability]: val });
                                                }}
                                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-amber-500 focus:border-amber-500 outline-none w-full"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* XP Progression Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-xl font-bold text-amber-400 mb-4">XP Level Progression Table</h3>
                <p className="text-xs text-slate-400 mb-6">Adjust the XP threshold required to level up. Level 0 is a placeholder.</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {xpTable.map((xp, index) => {
                        if (index === 0) return null;
                        return (
                            <div key={index} className="bg-slate-950/60 p-3 rounded border border-slate-800 text-center">
                                <div className="text-xs font-bold text-slate-400">Level {index}</div>
                                <input
                                    type="number"
                                    value={xp}
                                    onChange={e => {
                                        const newTable = [...xpTable];
                                        newTable[index] = parseInt(e.target.value) || 0;
                                        updateXpTable(newTable);
                                    }}
                                    className="bg-slate-900 border border-slate-700 rounded mt-2 px-2 py-1 text-xs text-center font-mono text-emerald-400 focus:border-emerald-500 outline-none w-full"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Difficulty Settings Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-xl font-bold text-amber-400 mb-4">Difficulty Scaling Modifiers</h3>
                <p className="text-xs text-slate-400 mb-6">Modify stat offsets, XP multipliers, and gold drops based on selected difficulty.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.keys(difficultySettings).map(diff => {
                        const settings = difficultySettings[diff];
                        return (
                            <div key={diff} className="bg-slate-950/60 p-4 rounded border border-slate-800 space-y-4">
                                <h4 className="font-bold text-slate-200 uppercase tracking-wider">{diff}</h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase block font-bold">Enemy Stats Mod</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={settings.enemyStatMod}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 1.0;
                                                updateDifficultySettings(diff, { ...settings, enemyStatMod: val });
                                            }}
                                            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-red-400 focus:border-red-500 outline-none w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase block font-bold">XP Gain Mod</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={settings.xpMod}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 1.0;
                                                updateDifficultySettings(diff, { ...settings, xpMod: val });
                                            }}
                                            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-blue-400 focus:border-blue-500 outline-none w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase block font-bold">Gold Drop Mod</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={settings.goldMod}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 1.0;
                                                updateDifficultySettings(diff, { ...settings, goldMod: val });
                                            }}
                                            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-yellow-400 focus:border-yellow-500 outline-none w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
