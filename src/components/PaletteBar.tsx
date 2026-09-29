import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ColorPalette } from '../types';

export const PaletteBar: React.FC = () => {
  const [paletteId, setPaletteId] = useState<string>('');
  const [paletteName, setPaletteName] = useState<string>('');
  const [colors, setColors] = useState<(string | null)[]>([null, null, null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [isPicking, setIsPicking] = useState<boolean>(false);
  const activeSlotRef = useRef(activeSlot);
  activeSlotRef.current = activeSlot;
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  const paletteIdRef = useRef(paletteId);
  paletteIdRef.current = paletteId;
  const paletteNameRef = useRef(paletteName);
  paletteNameRef.current = paletteName;

  // Initialize from URL search or hash
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('paletteId') || '';
    const nameFromUrl = params.get('paletteName') || '';

    const initId = idFromUrl || `palette-${Date.now()}`;
    const initName = nameFromUrl || 'Nová paleta';

    setPaletteId(initId);
    setPaletteName(initName);

    // Fetch existing palettes to see if this palette already exists with colors
    if (window.electronAPI?.getPalettes) {
      window.electronAPI.getPalettes().then((list: ColorPalette[]) => {
        const found = list.find((p) => p.id === initId || p.name.toLowerCase() === initName.toLowerCase());
        if (found) {
          setPaletteId(found.id);
          setPaletteName(found.name);
          const loadedColors: (string | null)[] = [null, null, null, null, null];
          for (let i = 0; i < 5; i++) {
            loadedColors[i] = found.colors && found.colors[i] ? found.colors[i] : null;
          }
          setColors(loadedColors);
          // Pick first empty slot or stay at 0
          const firstEmpty = loadedColors.findIndex((c) => !c);
          if (firstEmpty !== -1) {
            setActiveSlot(firstEmpty);
            setTimeout(() => triggerPick(firstEmpty, loadedColors, found.id, found.name), 250);
          }
        } else {
          // New palette - start picking slot 0
          setTimeout(() => triggerPick(0, [null, null, null, null, null], initId, initName), 250);
        }
      });
    } else {
      setTimeout(() => triggerPick(0, [null, null, null, null, null], initId, initName), 250);
    }

    // Listen for IPC re-init
    if (window.electronAPI?.onPaletteBarInit) {
      return window.electronAPI.onPaletteBarInit((data) => {
        setPaletteId(data.paletteId);
        setPaletteName(data.paletteName);
      });
    }
  }, []);

  // Save helper
  const persistPalette = useCallback(async (newColors: (string | null)[], id?: string, name?: string) => {
    const pId = id || paletteIdRef.current;
    const pName = name || paletteNameRef.current;
    if (!pId || !pName) return;

    const payload: ColorPalette = {
      id: pId,
      name: pName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      colors: newColors,
    };

    if (window.electronAPI?.savePalette) {
      await window.electronAPI.savePalette(payload);
    }
  }, []);

  // Trigger native eyedropper for a specific slot
  const triggerPick = async (
    targetSlot: number,
    currentColors?: (string | null)[],
    currentId?: string,
    currentName?: string
  ) => {
    if (isPicking) return;
    setIsPicking(true);
    setActiveSlot(targetSlot);

    try {
      let picked: string | null = null;
      if (window.electronAPI?.pickScreenColor) {
        picked = await window.electronAPI.pickScreenColor({ noClipboard: true, noSpotlight: true });
      }

      if (picked) {
        const workingColors = [...(currentColors || colorsRef.current)];
        workingColors[targetSlot] = picked;
        setColors(workingColors);
        await persistPalette(workingColors, currentId, currentName);

        // Find next empty slot
        let nextSlot = -1;
        for (let i = 0; i < 5; i++) {
          const idx = (targetSlot + 1 + i) % 5;
          if (!workingColors[idx]) {
            nextSlot = idx;
            break;
          }
        }

        if (nextSlot !== -1) {
          setActiveSlot(nextSlot);
          setIsPicking(false);
          // Auto-pick next slot
          setTimeout(() => {
            triggerPick(nextSlot, workingColors, currentId, currentName);
          }, 100);
          return;
        }
      }
    } catch (err) {
      console.error('[PaletteBar] Eyedropper error:', err);
    } finally {
      setIsPicking(false);
    }
  };

  // Open TuneColorModal for a color slot
  const handleTuneColor = (slotIndex: number) => {
    const color = colors[slotIndex];
    if (!color) return;
    setActiveSlot(slotIndex);
    if (window.electronAPI?.openTuneColorWindow) {
      window.electronAPI.openTuneColorWindow({ initialColor: color });
    }
  };

  // Listen for tuned color applied
  useEffect(() => {
    if (window.electronAPI?.onTuneColorApplied) {
      return window.electronAPI.onTuneColorApplied((data) => {
        if (data?.color) {
          const updated = [...colorsRef.current];
          updated[activeSlotRef.current] = data.color;
          setColors(updated);
          persistPalette(updated);
        }
      });
    }
  }, [persistPalette]);

  // Finish and open detail
  const handleOpenDetail = async () => {
    await persistPalette(colorsRef.current);
    if (window.electronAPI?.openPaletteDetail) {
      await window.electronAPI.openPaletteDetail({ paletteId: paletteIdRef.current });
    } else {
      window.close();
    }
  };

  // Cancel / Close
  const handleClose = async () => {
    if (window.electronAPI?.closePaletteBar) {
      await window.electronAPI.closePaletteBar();
    } else {
      window.close();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleOpenDetail();
      } else if (e.key >= '1' && e.key <= '5') {
        const slotIdx = parseInt(e.key, 10) - 1;
        setActiveSlot(slotIdx);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveSlot((prev) => (prev > 0 ? prev - 1 : 4));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveSlot((prev) => (prev < 4 ? prev + 1 : 0));
      } else if (e.key.toLowerCase() === 'c' || e.key === ' ') {
        e.preventDefault();
        triggerPick(activeSlotRef.current);
      } else if (e.key.toLowerCase() === 't') {
        if (colorsRef.current[activeSlotRef.current]) {
          e.preventDefault();
          handleTuneColor(activeSlotRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeColor = colors[activeSlot];

  return (
    <div className="w-full h-full flex items-center justify-center p-1 select-none overflow-hidden bg-transparent">
      {/* Top Floating Bar (Unified style with QuickCap & ScreenRuler) */}
      <div
        className="flex items-center gap-2.5 p-2 px-4 rounded-full transition-all pointer-events-auto bg-[#15161c] text-gray-100 select-none animate-fade-in"
        style={{
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.45), 0 2px 8px -2px rgba(0, 0, 0, 0.25)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* App Title / Icon (Unified h-8) */}
        <div className="h-8 flex items-center gap-2 pr-1 shrink-0">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[18px]">palette</span>
          </div>
          <div className="max-w-[130px] truncate text-xs font-semibold text-white tracking-wide" title={paletteName}>
            {paletteName || 'Paleta'}
          </div>
        </div>

        {/* 5 Color Slots */}
        <div className="flex items-center gap-2 px-1">
          {colors.map((color, idx) => {
            const isActive = idx === activeSlot;
            const hasColor = Boolean(color);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (isActive) {
                    if (hasColor) {
                      // Already active and has color -> open tune color
                      handleTuneColor(idx);
                    } else {
                      // Already active and empty -> pick color
                      triggerPick(idx);
                    }
                  } else {
                    setActiveSlot(idx);
                    if (!hasColor) {
                      triggerPick(idx);
                    }
                  }
                }}
                className={`relative w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                  isActive
                    ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-[#15161c] scale-110 shadow-lg'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                } ${
                  hasColor
                    ? 'border border-white/20'
                    : 'border-2 border-dashed border-white/25 bg-white/[0.04] hover:bg-white/[0.08]'
                }`}
                style={hasColor ? { backgroundColor: color! } : undefined}
                title={
                  hasColor
                    ? `Pozice ${idx + 1}: ${color} (klik = doladit barvu, dvojklik = nové nabrání)`
                    : `Pozice ${idx + 1}: Prázdné (klik = nabrat barvu)`
                }
              >
                {!hasColor ? (
                  <span className="text-[11px] font-mono font-bold text-gray-400">{idx + 1}</span>
                ) : (
                  isActive && (
                    <span className="w-2 h-2 rounded-full bg-white shadow-sm ring-1 ring-black/40" />
                  )
                )}
              </button>
            );
          })}
        </div>

        {/* Action: Nabrat kapátkem (Eyedropper) */}
        <button
          type="button"
          onClick={() => triggerPick(activeSlot)}
          disabled={isPicking}
          className={`h-8 flex items-center gap-1.5 px-3 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm ${
            isPicking
              ? 'bg-rose-500/30 text-rose-300 animate-pulse'
              : 'bg-white/[0.06] hover:bg-white/[0.12] text-white'
          }`}
          title="Nabrat barvu z obrazovky pro vybranou pozici (C)"
        >
          <span className="material-symbols-outlined text-[16px] text-rose-400 shrink-0">
            colorize
          </span>
          <span className="hidden sm:inline">Nabrat</span>
        </button>

        {/* Action: Doladit barvu (Tune color) */}
        {activeColor && (
          <button
            type="button"
            onClick={() => handleTuneColor(activeSlot)}
            className="h-8 flex items-center gap-1.5 px-3 bg-white/[0.06] hover:bg-white/[0.12] text-white rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
            title="Přesně doladit barvu vybrané pozice (T)"
          >
            <span className="material-symbols-outlined text-[16px] text-gray-300 shrink-0">
              tune
            </span>
            <span className="hidden md:inline">Doladit</span>
          </button>
        )}

        {/* Shortcuts pill (Spotlight kbd badges, Unified h-8) */}
        <div className="h-8 flex items-center gap-1.5 px-2 text-[11px] text-gray-400 font-sans shrink-0 border-l border-white/10">
          <kbd className="h-[20px] px-2 bg-white/[0.08] text-gray-300 rounded-full font-mono text-[10px] leading-none flex items-center justify-center">
            Enter
          </kbd>
          <span className="text-[11px] text-gray-300">otevřít detail</span>
          <kbd className="h-[20px] px-2 bg-white/[0.08] text-gray-300 rounded-full font-mono text-[10px] leading-none flex items-center justify-center ml-1">
            Esc
          </kbd>
          <span className="text-[11px] text-gray-300">zavřít</span>
        </div>

        {/* Close Button (Unified h-8 w-8) */}
        <button
          type="button"
          onClick={handleClose}
          className="w-8 h-8 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
          title="Zavřít panel palety (Escape)"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
};
