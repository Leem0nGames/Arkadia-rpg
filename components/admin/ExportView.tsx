import React, { useState } from 'react';
import { useContentStore } from '../../store/contentStore';

export const ExportView: React.FC = () => {
    const { exportData, resetToDefaults } = useContentStore();
    const [json, setJson] = useState('');

    const handleGenerate = () => {
        setJson(exportData());
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(json);
        alert('JSON copied to clipboard!');
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="bg-amber-900/20 border border-amber-600/30 p-4 rounded-lg">
                <h3 className="font-bold text-amber-200 mb-2">⚠️ Developer Mode</h3>
                <p className="text-sm text-slate-300">Since this is a client-side app, changes made here are saved to <strong>Local Storage</strong>. To make them permanent for all users, copy the JSON below and update <code className="bg-black/30 px-1 rounded">constants.ts</code> in the source code.</p>
            </div>

            <div className="flex gap-4">
                <button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold">Generate JSON</button>
                <button onClick={handleCopy} disabled={!json} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded font-bold disabled:opacity-50">Copy to Clipboard</button>
                <button onClick={() => { if(confirm('Reset all admin data?')) resetToDefaults() }} className="ml-auto text-red-400 hover:text-red-300 px-6 py-2 rounded font-bold border border-red-900">Reset to Defaults</button>
            </div>

            <textarea 
                readOnly 
                value={json} 
                placeholder="Click Generate JSON to see the export data..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-green-400 leading-relaxed resize-none focus:outline-none focus:border-slate-600"
            />
        </div>
    );
};
