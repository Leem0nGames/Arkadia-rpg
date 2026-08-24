import React from 'react';
import { useContentStore } from '../../store/contentStore';
import { CharacterClass, Ability } from '../../types';

export const ClassEditor: React.FC = () => {
    const { classStats, updateClassStats } = useContentStore();
    
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {Object.keys(classStats).map(key => {
                const cls = key as CharacterClass;
                const stats = classStats[cls];
                return (
                    <div key={cls} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-amber-100">{cls}</h3>
                            <span className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400">Base Stats</span>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                            {Object.values(Ability).map(ability => (
                                <div key={ability} className="flex flex-col items-center">
                                    <label className="text-[10px] font-bold text-slate-500 mb-1">{ability}</label>
                                    <input 
                                        type="number" 
                                        value={stats[ability]} 
                                        onChange={(e) => updateClassStats(cls, { ...stats, [ability]: parseInt(e.target.value) })}
                                        className="w-full bg-slate-900 border border-slate-600 rounded text-center py-1 font-mono text-amber-400 focus:border-amber-500 outline-none" 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    );
};
