import React from 'react';
import { Quest } from '../../types';

interface QuestLogProps {
    activeQuests: Quest[];
    themeClasses: any;
}

export const QuestLog: React.FC<QuestLogProps> = ({ activeQuests, themeClasses }) => {
    return (
        <div>
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 border-b pb-1 ${themeClasses.divider} ${themeClasses.accentText}`}>Misiones Activas</h3>
            {activeQuests.length === 0 ? (
                <p className={`text-sm italic ${themeClasses.subText}`}>No hay misiones activas.</p>
            ) : (
                <div className="space-y-4">
                    {activeQuests.map(q => (
                        <div key={q.id} className="group">
                            <h4 className={`font-serif font-bold text-sm transition-colors ${themeClasses.titleText}`}>
                                {(q.type === 'MAIN' || q.type === 'CAMPAIGN') && <span className="text-amber-500 mr-2">★</span>}
                                {q.title}
                            </h4>
                            <p className={`text-xs mt-1 leading-relaxed ${themeClasses.bodyText}`}>{q.description}</p>
                            
                            {q.objectives && q.objectives.length > 0 && (
                                <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-slate-700">
                                    {q.objectives.map(obj => (
                                        <div key={obj.id} className="text-xs flex justify-between items-start gap-2">
                                            <span className={obj.completed ? 'text-slate-500 line-through' : 'text-amber-400 leading-tight'}>
                                                {obj.description}
                                            </span>
                                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
                                                {obj.currentProgress}/{obj.requiredProgress}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
