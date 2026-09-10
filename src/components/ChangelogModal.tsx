import React from 'react';
import { CHANGELOG_HISTORY, UPCOMING_CHANGELOG, CURRENT_APP_VERSION } from '../changelog';

interface ChangelogModalProps {
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1e1e28] border border-indigo-500/40 rounded-2xl w-full max-w-2xl max-h-[85vh] p-6 shadow-2xl flex flex-col gap-4 text-gray-200 animate-in fade-in zoom-in-95 duration-150 select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <span className="material-symbols-outlined text-2xl">history_edu</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Historie verzí a změn</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Aktuální verze v{CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Kompletní přehled úprav v jednotlivých vydáních aplikace IADonkey.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content: List of all releases */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-5">
          {/* Upcoming / in progress section (if any) */}
          {UPCOMING_CHANGELOG.length > 0 && (
            <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">pending</span>
                Připravuje se v příští verzi
              </div>
              <ul className="space-y-1.5 pl-2">
                {UPCOMING_CHANGELOG.map((item, i) => (
                  <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                    <span className="text-amber-400 text-xs mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Historical releases */}
          {CHANGELOG_HISTORY.map((entry) => {
            const isCurrent = entry.version === CURRENT_APP_VERSION;
            return (
              <div
                key={entry.version}
                className={`p-4 rounded-xl border transition ${
                  isCurrent
                    ? 'bg-white/[0.04] border-indigo-500/40 shadow-sm'
                    : 'bg-white/[0.02] border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">v{entry.version}</span>
                    <span className="text-xs font-semibold text-indigo-300">— {entry.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Nainstalováno
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 font-mono">{entry.date}</span>
                  </div>
                </div>

                <ul className="space-y-1.5 mt-3 pl-1">
                  {entry.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed">
                      <span className="material-symbols-outlined text-indigo-400 text-sm mt-0.5 shrink-0">
                        check
                      </span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            IADonkey Launcher • Verze {CURRENT_APP_VERSION}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
