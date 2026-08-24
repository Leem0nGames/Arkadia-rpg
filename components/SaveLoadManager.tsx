import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { 
  listAllSaveSlots, 
  exportAllSaves, 
  importSavesFromJson, 
  deleteSaveSlot, 
  writeSaveToSlot, 
  readSaveFromSlot,
  SaveSlotMeta
} from '../services/saveManager';
import { SaveSlotId, GameState } from '../types';
import { sfx } from '../services/SoundSystem';
import { getThemeConfig } from '../services/themeSystem';

interface SaveLoadManagerProps {
  onClose?: () => void;
}

export const SaveLoadManager: React.FC<SaveLoadManagerProps> = ({ onClose }) => {
  const { 
    gameState, 
    uiTheme, 
    loadGame, 
    saveGame, 
    addLog 
  } = useGameStore();

  const themeConfig = getThemeConfig(uiTheme);

  const [slots, setSlots] = useState<{ slotId: SaveSlotId; label: string; isAutoSave: boolean; meta: SaveSlotMeta | null }[]>([]);
  const [activeTab, setActiveTab] = useState<'slots' | 'backup'>('slots');
  const [importJsonText, setImportJsonText] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<SaveSlotId | null>(null);

  // Refresh slots
  const refreshSlots = () => {
    const all = listAllSaveSlots();
    setSlots(all);
  };

  useEffect(() => {
    refreshSlots();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
  };

  const handleSaveToSlot = (slotId: SaveSlotId) => {
    sfx.playVictory();
    saveGame(slotId);
    refreshSlots();
    showNotification(`Progress saved to ${slotId.replace('_', ' ').toUpperCase()}!`, 'success');
  };

  const handleLoadFromSlot = (slotId: SaveSlotId) => {
    sfx.playVictory();
    loadGame(slotId);
    refreshSlots();
    showNotification(`Loaded ${slotId.replace('_', ' ').toUpperCase()} successfully!`, 'success');
    if (onClose) onClose();
  };

  const handleDeleteSlot = (slotId: SaveSlotId) => {
    sfx.playUiClick();
    deleteSaveSlot(slotId);
    setConfirmDeleteSlot(null);
    refreshSlots();
    showNotification(`Cleared ${slotId.replace('_', ' ').toUpperCase()}`, 'success');
  };

  const handleExportAll = () => {
    sfx.playUiClick();
    const jsonStr = exportAllSaves();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcadia_tactics_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Backup exported and downloaded!', 'success');
  };

  const handleCopyToClipboard = () => {
    sfx.playUiClick();
    const jsonStr = exportAllSaves();
    navigator.clipboard.writeText(jsonStr);
    showNotification('Save data copied to clipboard!', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const result = importSavesFromJson(content);
        if (result.success) {
          sfx.playVictory();
          refreshSlots();
          showNotification(result?.message || 'Partidas importadas exitosamente.', 'success');
        } else {
          showNotification(result?.message || 'Error al importar archivo de guardado.', 'error');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportJsonText = () => {
    if (!importJsonText.trim()) return;
    const result = importSavesFromJson(importJsonText.trim());
    if (result.success) {
      sfx.playVictory();
      setImportJsonText('');
      refreshSlots();
      showNotification(result?.message || 'Partidas importadas exitosamente.', 'success');
    } else {
      showNotification(result?.message || 'Error al importar JSON de guardado.', 'error');
    }
  };

  const isInGame = gameState !== GameState.CHARACTER_CREATION;

  return (
    <div className="space-y-4">
      
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { sfx.playUiClick(); setActiveTab('slots'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'slots' 
                ? `${themeConfig.classes.buttonPrimary} shadow` 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            💾 Save Slots (3 + Auto)
          </button>
          <button
            type="button"
            onClick={() => { sfx.playUiClick(); setActiveTab('backup'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'backup' 
                ? `${themeConfig.classes.buttonPrimary} shadow` 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📦 Backup & Portability
          </button>
        </div>

        {actionMessage && (
          <div className={`text-xs font-bold px-3 py-1 rounded-full animate-in fade-in ${
            actionMessage.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-red-950/80 text-red-300 border border-red-500/40'
          }`}>
            {actionMessage.text}
          </div>
        )}
      </div>

      {/* TAB 1: SLOTS GRID */}
      {activeTab === 'slots' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {slots.map((slot) => {
            const hasSave = !!slot.meta;
            const isAuto = slot.isAutoSave;
            const isDeletingThis = confirmDeleteSlot === slot.slotId;

            return (
              <div 
                key={slot.slotId}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                  hasSave 
                    ? 'bg-slate-900/80 border-slate-700 shadow-md' 
                    : 'bg-slate-950/40 border-dashed border-slate-800'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{isAuto ? '🔄' : '💾'}</span>
                    <span className="text-sm font-serif font-bold text-amber-200">
                      {slot.label}
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${
                    hasSave 
                      ? isAuto 
                        ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                        : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}>
                    {hasSave ? (isAuto ? 'Auto' : 'Active') : 'Empty'}
                  </span>
                </div>

                {/* Card Body */}
                {hasSave && slot.meta ? (
                  <div className="space-y-1.5 text-xs text-slate-300 my-2 bg-black/30 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-100 font-serif">
                        {slot.meta.heroName}
                      </span>
                      <span className="text-[11px] font-mono text-amber-400">
                        Lvl {slot.meta.level} {slot.meta.heroClass}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>📍 {slot.meta.locationName}</span>
                      <span className="font-mono text-emerald-400">❤️ {slot.meta.currentHp}/{slot.meta.maxHp} HP</span>
                    </div>

                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 flex justify-between">
                      <span>Saved:</span>
                      <span className="font-mono">{new Date(slot.meta.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500 italic">
                    No adventurer record saved in this slot.
                  </div>
                )}

                {/* Card Actions */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Load button */}
                    <button
                      type="button"
                      onClick={() => handleLoadFromSlot(slot.slotId)}
                      disabled={!hasSave}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1 shadow"
                    >
                      <span>📂</span> Load
                    </button>

                    {/* Save / Overwrite button (only for manual slots and if in active game) */}
                    {!isAuto && isInGame && (
                      <button
                        type="button"
                        onClick={() => handleSaveToSlot(slot.slotId)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>💾</span> {hasSave ? 'Overwrite' : 'Save Here'}
                      </button>
                    )}
                  </div>

                  {/* Delete button (if has save) */}
                  {hasSave && (
                    <div>
                      {isDeletingThis ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(slot.slotId)}
                            className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-[11px] font-bold"
                          >
                            Confirm Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSlot(null)}
                            className="px-1.5 py-1 text-slate-400 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSlot(slot.slotId)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                          title="Clear Save Slot"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: BACKUP & PORTABILITY */}
      {activeTab === 'backup' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Export Box */}
          <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/70 space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-serif font-bold text-amber-200 flex items-center gap-1.5">
                  <span>📤</span> Export Your Adventure Data
                </h4>
                <p className="text-xs text-slate-400">
                  Export all save slots into a standalone JSON backup file to play on other devices or share.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportAll}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>💾</span> Download JSON Backup
              </button>
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-lg border border-slate-600 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>📋</span> Copy to Clipboard
              </button>
            </div>
          </div>

          {/* Import Box */}
          <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/70 space-y-3">
            <div>
              <h4 className="text-sm font-serif font-bold text-amber-200 flex items-center gap-1.5">
                <span>📥</span> Import Saved Adventures (.json)
              </h4>
              <p className="text-xs text-slate-400">
                Restore saves by uploading a previously downloaded backup file or pasting JSON content.
              </p>
            </div>

            {/* File Upload */}
            <div className="flex items-center gap-3">
              <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold text-xs uppercase tracking-wider rounded-lg border border-slate-600 cursor-pointer transition-all flex items-center gap-1.5 shadow">
                <span>📁</span> Browse JSON File...
                <input 
                  type="file" 
                  accept=".json,application/json" 
                  onChange={handleImportFile}
                  className="hidden" 
                />
              </label>
              <span className="text-xs text-slate-500">or paste code below:</span>
            </div>

            {/* Textarea for manual JSON pasting */}
            <div className="space-y-2">
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder="Paste Arcadia JSON save backup text here..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-amber-100 font-mono focus:border-amber-500 focus:outline-none placeholder-slate-600 custom-scrollbar"
              />

              <button
                type="button"
                onClick={handleImportJsonText}
                disabled={!importJsonText.trim()}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>✨</span> Validate & Restore Save
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
