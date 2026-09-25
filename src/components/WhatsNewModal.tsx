import React, { useEffect } from 'react';
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2">
      <div className="bg-[#0e0f12] border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[510px] p-6 shadow-2xl flex flex-col gap-4 text-gray-200 animate-in fade-in zoom-in-95 duration-150 select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined text-2xl select-none leading-none">auto_awesome</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white whitespace-nowrap tracking-tight">Co je nového</h3>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenFullChangelog) {
                      onDismiss();
                      onOpenFullChangelog();
                    }
                  }}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium font-mono bg-white/[0.06] text-gray-300 border border-white/[0.08] transition shrink-0 ${
                    onOpenFullChangelog ? 'hover:bg-white/[0.1] hover:text-white cursor-pointer' : ''
                  }`}
                  title={onOpenFullChangelog ? 'Zobrazit kompletní historii verzí (Changelog)' : undefined}
                >
                  v{release.version}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{release.title}</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition shrink-0 cursor-pointer ml-2"
          >
            <span className="material-symbols-outlined text-lg leading-none select-none">close</span>
          </button>
        </div>

        {/* Highlights List - only the latest version items */}
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 py-1">
          {release.highlights.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition"
            >
              <span className="material-symbols-outlined text-gray-400 text-base mt-0.5 shrink-0">
                check_circle
              </span>
              <span className="text-xs text-gray-200 leading-relaxed font-normal">
                {item}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end">
          <button
            onClick={onDismiss}
            className="px-5 py-2 text-xs font-medium text-white bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] rounded-xl transition cursor-pointer"
          >
            Rozumím
          </button>
        </div>
      </div>
    </div>
  );
};
