import React, { useState } from 'react';

interface CombatDiceLogDrawerProps {
  logs: any[];
  onClose: () => void;
  themeConfig: any;
}

export const CombatDiceLogDrawer: React.FC<CombatDiceLogDrawerProps> = ({
  logs,
  onClose,
  themeConfig,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'COMBAT' | 'DICE'>('ALL');

  const handleExportLogs = () => {
    if (!logs || logs.length === 0) return;
    
    const header = `==================================================\n  ARCADIA TACTICS - HISTORIAL DE COMBATE TÁCTICO  \n==================================================\n\n`;
    
    const formattedLogs = logs.map((log) => {
      const timeStr = log.timestamp ? `[${new Date(log.timestamp).toLocaleTimeString()}]` : '';
      const typeStr = log.type ? `[${log.type.toUpperCase()}]` : '[INFO]';
      return `${timeStr} ${typeStr} ${log.message}`;
    }).join('\n');

    const fileContent = header + formattedLogs;
    
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arcadia_tactics_combat_log_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = (logs || [])
    .filter((log) => {
      if (!log || typeof log.message !== 'string') return false;
      if (filter === 'COMBAT') return log.type === 'combat';
      if (filter === 'DICE')
        return (
          log.message.includes('[d20') ||
          log.message.includes('Damage') ||
          log.message.includes('d6') ||
          log.message.includes('d8')
        );
      return true;
    })
    .slice(-50)
    .reverse();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl h-[75vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${themeConfig.classes.modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex justify-between items-center ${themeConfig.classes.headerBg}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🎲</span>
            <div>
              <h3
                className={`font-serif font-bold ${themeConfig.classes.titleText}`}
              >
                Historial de Dados y Combate
              </h3>
              <p className="text-[10px] text-slate-400">
                Desglose exacto de tiradas d20, modificadores, CA y fórmulas de
                daño
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportLogs}
              disabled={!logs || logs.length === 0}
              title="Exportar Historial"
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 disabled:pointer-events-none text-white shadow flex items-center gap-1 cursor-pointer"
            >
              📥 Exportar
            </button>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center border ${themeConfig.classes.circleButton}`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          className={`px-4 py-2 border-b flex gap-2 text-xs font-bold ${themeConfig.classes.divider}`}
        >
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filter === 'ALL'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({logs.length})
          </button>
          <button
            onClick={() => setFilter('COMBAT')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filter === 'COMBAT'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚔️ Combate
          </button>
          <button
            onClick={() => setFilter('DICE')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filter === 'DICE'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            🎲 Fórmulas de Dados
          </button>
        </div>

        {/* Logs List */}
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, idx) => {
              const msg = log?.message || '';
              const isCrit =
                msg.includes('CRITICAL') || msg.includes('💥');
              const isHit =
                msg.includes('HIT') || msg.includes('IMPACTO');
              const isMiss =
                msg.includes('MISS') || msg.includes('FALLO');

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs font-mono leading-relaxed transition-all ${
                    isCrit
                      ? 'bg-amber-950/40 border-amber-500/80 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                      : isHit
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : isMiss
                      ? 'bg-slate-900/80 border-slate-700 text-slate-400'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-[10px] opacity-60">
                    <span className="uppercase font-bold tracking-wider">
                      {log?.type || 'LOG'}
                    </span>
                    <span>
                      {log?.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <div className="font-semibold">{msg}</div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-slate-500 italic py-12">
              No hay tiradas registradas aún.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
