import React, { useEffect } from 'react';
import { CHANGELOG_HISTORY, UPCOMING_CHANGELOG, CURRENT_APP_VERSION } from '../changelog';

interface ChangelogModalProps {
  onClose: () => void;
  isSpotlightView?: boolean;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose, isSpotlightView = false }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 ${isSpotlightView ? 'bg-transparent' : 'bg-black/75 backdrop-blur-sm'}`}>
      <div className="bg-[#0e0f12] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[510px] p-6 shadow-2xl flex flex-col gap-4 text-gray-200 animate-in fade-in zoom-in-95 duration-150 select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl">history_edu</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">Historie verzí a změn</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium font-mono bg-white/[0.06] text-gray-300 border border-white/[0.08]">
                  Aktuální verze v{CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Kompletní přehled úprav v jednotlivých vydáních aplikace IADonkey.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content: List of all releases */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {/* Upcoming / in progress section (if any) */}
          {UPCOMING_CHANGELOG.length > 0 && (
            <div className="p-4 rounded-xl border border-dashed border-amber-500/25 bg-amber-500/5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-medium text-xs uppercase tracking-wider">
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
                    ? 'bg-white/[0.04] border-white/[0.14] shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-sm text-white">v{entry.version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-medium font-mono px-2 py-0.5 rounded bg-white/[0.08] text-white border border-white/[0.12]">
                        Nainstalováno
                      </span>
                    )}
                    <span className="text-[11px] text-gray-500 font-mono">{entry.date}</span>
                  </div>
                </div>

                {entry.title && (
                  <div className="text-xs font-medium text-gray-300 mb-2 leading-relaxed">
                    {entry.title}
                  </div>
                )}

                <ul className="space-y-1.5 mt-3 pl-1">
                  {entry.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed">
                      <span className="material-symbols-outlined text-gray-400 text-sm mt-0.5 shrink-0">
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
        <div className="pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-xs text-gray-500">
            IADonkey Launcher • Verze {CURRENT_APP_VERSION}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium text-white bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] rounded-xl transition cursor-pointer"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
