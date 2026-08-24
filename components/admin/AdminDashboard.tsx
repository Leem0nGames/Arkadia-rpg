import React, { useState } from 'react';
import { DashboardHome } from './DashboardHome';
import { ItemEditor } from './ItemEditor';
import { UnitAndEncounterEditor } from './UnitAndEncounterEditor';
import { CampaignEditor } from './CampaignEditor';
import { NarrativeEventsEditor } from './NarrativeEventsEditor';
import { ClassEditor } from './ClassEditor';
import { RacesAndRulesEditor } from './RacesAndRulesEditor';
import { SpellsEditor } from './SpellsEditor';
import { StartingEquipmentEditor } from './StartingEquipmentEditor';
import { MapConfigurator } from './MapConfigurator';
import { ExportView } from './ExportView';

const TABS = [
    'DASHBOARD',
    'CAMPAIGNS',
    'ITEMS',
    'UNITS & SPAWNS',
    'NARRATIVE EVENTS',
    'CLASSES',
    'RACES & RULES',
    'SPELLS & ABILITIES',
    'EQUIPMENT PACKAGES',
    'MAP CONFIG',
    'EXPORT'
];

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('DASHBOARD');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-screen bg-slate-900 text-slate-200 font-sans overflow-hidden relative">
            {/* Backdrop Overlay for Mobile */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 lg:hidden transition-all duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Responsive Sidebar */}
            <div className={`fixed lg:relative z-40 h-full w-64 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h1 className="font-serif text-2xl text-amber-500 font-bold">Arcadia Admin</h1>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">RPG Maker Toolset</p>
                    </div>
                    {/* Close button inside sidebar on mobile */}
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-300 bg-slate-900 border border-slate-800"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setIsSidebarOpen(false); // Close mobile menu after click
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === tab ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/10' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <button onClick={() => window.location.pathname = '/'} className="w-full border border-slate-700 text-slate-400 px-4 py-2 rounded hover:bg-slate-800 hover:text-white transition-colors text-xs uppercase font-bold">
                        ← Back to Game
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden w-full">
                <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 md:px-8 justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Hamburger menu for mobile */}
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 text-slate-400 hover:text-slate-200 lg:hidden flex items-center justify-center bg-slate-800/60 rounded-lg border border-slate-700/50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h2 className="text-base md:text-xl font-bold text-slate-100 truncate">{activeTab}</h2>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] md:text-xs text-green-400 font-mono tracking-wider">ONLINE</span>
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-8 custom-scrollbar">
                    {activeTab === 'DASHBOARD' && <DashboardHome changeTab={setActiveTab} />}
                    {activeTab === 'CAMPAIGNS' && <CampaignEditor />}
                    {activeTab === 'ITEMS' && <ItemEditor />}
                    {activeTab === 'UNITS & SPAWNS' && <UnitAndEncounterEditor />}
                    {activeTab === 'NARRATIVE EVENTS' && <NarrativeEventsEditor />}
                    {activeTab === 'CLASSES' && <ClassEditor />}
                    {activeTab === 'RACES & RULES' && <RacesAndRulesEditor />}
                    {activeTab === 'SPELLS & ABILITIES' && <SpellsEditor />}
                    {activeTab === 'EQUIPMENT PACKAGES' && <StartingEquipmentEditor />}
                    {activeTab === 'MAP CONFIG' && <MapConfigurator />}
                    {activeTab === 'EXPORT' && <ExportView />}
                </main>
            </div>
        </div>
    );
};
