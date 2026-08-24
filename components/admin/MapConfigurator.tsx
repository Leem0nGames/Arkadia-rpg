import React from 'react';
import { useContentStore } from '../../store/contentStore';

export const MapConfigurator: React.FC = () => {
    const { gameConfig, updateConfig } = useContentStore();
    return (
        <div className="max-w-2xl mx-auto bg-slate-800 border border-slate-700 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-6">World Generation Parameters</h3>
            
            <div className="space-y-8">
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="font-bold text-slate-300">Noise Scale (Zoom)</label>
                        <span className="font-mono text-amber-400">{gameConfig.mapScale}</span>
                    </div>
                    <input 
                        type="range" min="0.05" max="0.3" step="0.01" 
                        value={gameConfig.mapScale} 
                        onChange={e => updateConfig({ mapScale: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-slate-500 mt-1">Lower values = Larger biomes. Higher values = Chaotic terrain.</p>
                </div>

                <div>
                    <div className="flex justify-between mb-2">
                        <label className="font-bold text-slate-300">Temperature Offset</label>
                        <span className="font-mono text-amber-400">{gameConfig.tempOffset}</span>
                    </div>
                    <input 
                        type="range" min="0" max="1000" step="10" 
                        value={gameConfig.tempOffset} 
                        onChange={e => updateConfig({ tempOffset: parseInt(e.target.value) })}
                        className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-slate-500 mt-1">Shifts the global temperature noise map.</p>
                </div>

                <div>
                    <div className="flex justify-between mb-2">
                        <label className="font-bold text-slate-300">Moisture Offset</label>
                        <span className="font-mono text-amber-400">{gameConfig.moistureOffset}</span>
                    </div>
                    <input 
                        type="range" min="0" max="1000" step="10" 
                        value={gameConfig.moistureOffset} 
                        onChange={e => updateConfig({ moistureOffset: parseInt(e.target.value) })}
                        className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
};
