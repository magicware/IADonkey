import React, { useState, useEffect } from 'react';
import { ColorPalette } from '../types';
import { parseColorQuery, rgbToHex, rgbToHsl } from '../utils/colorMaster';

export const PaletteDetailModal: React.FC = () => {
  const [paletteId, setPaletteId] = useState<string>('');
  const [palette, setPalette] = useState<ColorPalette | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load palette from URL search or IPC
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('paletteId') || '';
    if (idFromUrl) {
      setPaletteId(idFromUrl);
      loadPalette(idFromUrl);
    }

    if (window.electronAPI?.onPaletteDetailInit) {
      return window.electronAPI.onPaletteDetailInit((data) => {
        setPaletteId(data.paletteId);
        loadPalette(data.paletteId);
      });
    }
  }, []);

  const loadPalette = async (id: string) => {
    if (window.electronAPI?.getPalettes) {
      const list: ColorPalette[] = await window.electronAPI.getPalettes();
      const found = list.find((p) => p.id === id);
      if (found) {
        setPalette(found);
      }
    }
  };

  // Listen for palette updates from other windows / TuneColor
  useEffect(() => {
    if (window.electronAPI?.onPalettesUpdated) {
      return window.electronAPI.onPalettesUpdated((palettes: ColorPalette[]) => {
        if (paletteId) {
          const found = palettes.find((p) => p.id === paletteId);
          if (found) setPalette(found);
        }
      });
    }
  }, [paletteId]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleOpenBar = async () => {
    if (!palette) return;
    if (window.electronAPI?.openPaletteBar) {
      await window.electronAPI.openPaletteBar({
        paletteId: palette.id,
        paletteName: palette.name,
      });
    }
  };

  const handleClose = async () => {
    if (window.electronAPI?.closePaletteDetail) {
      await window.electronAPI.closePaletteDetail();
    } else {
      window.close();
    }
  };

  const handleTuneColor = (initialColor: string) => {
    if (window.electronAPI?.openTuneColorWindow) {
      window.electronAPI.openTuneColorWindow({ initialColor });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleOpenBar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [palette]);

  const colors = palette?.colors || [null, null, null, null, null];
  const filledCount = colors.filter(Boolean).length;

  return (
    <div className="w-full h-full flex flex-col m3-surface-main text-gray-200 select-none overflow-hidden font-sans">
      {/* Header */}
      <div className="shrink-0 p-5 pb-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <span className="material-symbols-outlined text-2xl">palette</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>{palette?.name || 'Barevná paleta'}</span>
              <span className="text-[11px] font-normal px-2.5 py-0.5 rounded-full bg-white/[0.06] text-gray-300">
                {filledCount}/5 barev
              </span>
            </h2>
            <p className="text-xs text-gray-400">Přehled a export barevných odstínů</p>
          </div>
        </div>

        {/* Action: Upravit v liště */}
        <button
          type="button"
          onClick={handleOpenBar}
          className="px-4 py-2 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-sm"
          title="Otevřít plovoucí lištu pro výběr a úpravu barev (Ctrl+Enter)"
        >
          <span className="material-symbols-outlined text-sm">tune</span>
          <span>Upravit barvy v liště</span>
        </button>
      </div>

      {/* Main Content: 5 Color Cards */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
        {colors.map((color, idx) => {
          if (!color) {
            return (
              <div
                key={idx}
                onClick={handleOpenBar}
                className="p-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-dashed border-white/15 hover:border-rose-400/40 rounded-2xl flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-gray-500 group-hover:text-rose-400 group-hover:border-rose-400 transition">
                    <span className="text-sm font-mono font-bold">{idx + 1}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-200 transition">
                      Pozice {idx + 1} – prázdné políčko
                    </span>
                    <p className="text-[11px] text-gray-500">Kliknutím otevřete lištu a naberte barvu</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/[0.04] group-hover:bg-rose-500/20 text-gray-400 group-hover:text-rose-300 flex items-center justify-center transition">
                  <span className="material-symbols-outlined text-sm">colorize</span>
                </div>
              </div>
            );
          }

          const parsed = parseColorQuery(color);
          const hex = parsed ? parsed.hex : color;
          const rgb = parsed ? parsed.rgb : color;
          const hsl = parsed ? parsed.hsl : '';

          return (
            <div
              key={idx}
              className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between transition shadow-sm hover:border-white/20"
            >
              <div className="flex items-center gap-3">
                {/* Large Swatch */}
                <div
                  className="w-12 h-12 rounded-xl border border-white/20 shadow-inner flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition"
                  style={{ backgroundColor: color }}
                  onClick={() => handleTuneColor(color)}
                  title="Kliknutím doladit barvu"
                >
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                    {idx + 1}
                  </span>
                </div>

                {/* Values */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white select-all">{hex}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(hex, `hex-${idx}`)}
                      className="p-1 text-gray-400 hover:text-white transition cursor-pointer"
                      title="Kopírovat HEX"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedKey === `hex-${idx}` ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                    <span className="select-all">{rgb}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(rgb, `rgb-${idx}`)}
                      className="p-0.5 text-gray-500 hover:text-white transition cursor-pointer"
                      title="Kopírovat RGB"
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {copiedKey === `rgb-${idx}` ? 'check' : 'content_copy'}
                      </span>
                    </button>
                    {hsl && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="select-all text-gray-400">{hsl}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTuneColor(color)}
                  className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-gray-200 hover:text-white transition flex items-center gap-1 cursor-pointer"
                  title="Doladit odstín a složky barvy"
                >
                  <span className="material-symbols-outlined text-[15px] text-rose-400">tune</span>
                  <span>Doladit</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const validColors = colors.filter(Boolean);
            if (validColors.length > 0) {
              const cssVars = validColors
                .map((c, i) => `  --color-${palette?.name?.toLowerCase().replace(/\s+/g, '-') || 'palette'}-${i + 1}: ${c};`)
                .join('\n');
              const text = `:root {\n${cssVars}\n}`;
              handleCopy(text, 'all-css');
            }
          }}
          className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
          title="Zkopírovat všechny barvy jako CSS proměnné"
        >
          <span className="material-symbols-outlined text-sm">code</span>
          <span>{copiedKey === 'all-css' ? 'Zkopírováno v CSS!' : 'Kopírovat CSS proměnné'}</span>
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1"
          title="Zavřít okno (Esc)"
        >
          <span>Zavřít</span>
          <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 bg-white/[0.08] text-gray-300 rounded-full font-mono text-[9px] leading-none select-none">
            Esc
          </kbd>
        </button>
      </div>
    </div>
  );
};
