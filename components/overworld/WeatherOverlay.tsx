import React from 'react';
import { WeatherType } from '../../types';
import { ASSETS } from '../../constants';

export const WeatherOverlay: React.FC<{ type: WeatherType }> = ({ type }) => {
    if (type === WeatherType.NONE) return null;
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {type === WeatherType.RAIN && (
                <div className="w-full h-full opacity-40" 
                     style={{ backgroundImage: `url(${ASSETS.WEATHER.RAIN})`, backgroundSize: '200px 200px', animation: 'fall 0.8s linear infinite' }} />
            )}
            {type === WeatherType.SNOW && (
                <div className="w-full h-full bg-white/20 opacity-30" 
                     style={{ backgroundImage: 'radial-gradient(white 2px, transparent 2px)', backgroundSize: '40px 40px', animation: 'fall 4s linear infinite' }} />
            )}
            {type === WeatherType.FOG && (
                <div className="w-full h-full bg-slate-300/20 mix-blend-overlay opacity-50 animate-pulse" 
                     style={{ backdropFilter: 'blur(2px)' }} />
            )}
             {type === WeatherType.ASH && (
                <div className="w-full h-full opacity-50" 
                     style={{ backgroundImage: 'radial-gradient(circle, #d8b4fe 1px, transparent 1px), radial-gradient(circle, #581c87 1.5px, transparent 1.5px)', backgroundSize: '120px 120px', animation: 'ashFloat 12s linear infinite' }} />
            )}
            <style>{`
                @keyframes fall { from { background-position: 0 0; } to { background-position: 50px 200px; } }
                @keyframes ashFloat { 0% { background-position: 0 0; opacity: 0.4; } 50% { background-position: 20px -50px; opacity: 0.6; } 100% { background-position: 40px -100px; opacity: 0.4; } }
            `}</style>
        </div>
    );
};
