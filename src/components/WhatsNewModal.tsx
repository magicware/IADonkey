import React from 'react';
import { VersionEntry } from '../changelog';

interface WhatsNewModalProps {
  release: VersionEntry;
  onDismiss: () => void;
  onOpenFullChangelog?: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  release,
  onDismiss,
  onOpenFullChangelog,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1e1e28] border border-indigo-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 text-gray-200 animate-in fade-in zoom-in-95 duration-150 select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <span className="material-symbols-outlined text-2xl">auto_awesome</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Co je nového</h3>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenFullChangelog) {
                      onDismiss();
                      onOpenFullChangelog();
                    }
                  }}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition ${
                    onOpenFullChangelog ? 'hover:bg-indigo-500/35 hover:text-indigo-200 cursor-pointer' : ''
                  }`}
                  title={onOpenFullChangelog ? 'Zobrazit kompletní historii verzí (Changelog)' : undefined}
                >
                  v{release.version}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{release.title}</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Highlights List - only the latest version items */}
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 py-1">
          {release.highlights.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition"
            >
              <span className="material-symbols-outlined text-indigo-400 text-base mt-0.5 shrink-0">
                check_circle
              </span>
              <span className="text-xs text-gray-200 leading-relaxed font-normal">
                {item}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-end">
          <button
            onClick={onDismiss}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            Rozumím
          </button>
        </div>
      </div>
    </div>
  );
};
