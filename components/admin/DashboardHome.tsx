import React from 'react';
import { useContentStore } from '../../store/contentStore';

interface DashboardHomeProps {
    changeTab: (t: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ changeTab }) => {
    const { items, enemies, campaigns } = useContentStore();
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div onClick={() => changeTab('CAMPAIGNS')} className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-blue-500 cursor-pointer transition-all group shadow-lg shadow-blue-950/20">
                <h3 className="text-lg font-bold text-blue-100 group-hover:text-blue-400">Campaign Editor</h3>
                <p className="text-slate-400 text-sm mt-2">Manage storylines, tutorial quests, and boss encounters.</p>
                <div className="mt-4 text-3xl font-bold text-slate-200">{Object.keys(campaigns || {}).length} <span className="text-sm text-slate-500 font-normal">Campaigns</span></div>
            </div>
            <div onClick={() => changeTab('ITEMS')} className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-amber-500 cursor-pointer transition-all group">
                <h3 className="text-lg font-bold text-amber-100 group-hover:text-amber-400">Item Database</h3>
                <p className="text-slate-400 text-sm mt-2">Manage weapons, armor, and consumables.</p>
                <div className="mt-4 text-3xl font-bold text-slate-200">{Object.keys(items).length} <span className="text-sm text-slate-500 font-normal">Items</span></div>
            </div>
            <div onClick={() => changeTab('UNITS & SPAWNS')} className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-red-500 cursor-pointer transition-all group">
                <h3 className="text-lg font-bold text-red-100 group-hover:text-red-400">Bestiary & Spawns</h3>
                <p className="text-slate-400 text-sm mt-2">Edit enemies and configure encounter tables.</p>
                <div className="mt-4 text-3xl font-bold text-slate-200">{Object.keys(enemies).length} <span className="text-sm text-slate-500 font-normal">Enemies</span></div>
            </div>
            <div onClick={() => changeTab('MAP CONFIG')} className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-emerald-500 cursor-pointer transition-all group">
                <h3 className="text-lg font-bold text-emerald-100 group-hover:text-emerald-400">World Generator</h3>
                <p className="text-slate-400 text-sm mt-2">Tweak procedural generation noise parameters.</p>
            </div>
        </div>
    );
};
