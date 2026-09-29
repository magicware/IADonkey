import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ColorPalette } from '../types';

export const PaletteBar: React.FC = () => {
  const [paletteId, setPaletteId] = useState<string>('');
  const [paletteName, setPaletteName] = useState<string>('');
  const [colors, setColors] = useState<(string | null)[]>([null, null, null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [isPicking, setIsPicking] = useState<boolean>(false);
  const activeSlotRef = useRef<number | null>(activeSlot);
  activeSlotRef.current = activeSlot;
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  const paletteIdRef = useRef(paletteId);
  paletteIdRef.current = paletteId;
  const paletteNameRef = useRef(paletteName);
  paletteNameRef.current = paletteName;

  const saveNameTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save helper
  const persistPalette = useCallback(async (newColors: (string | null)[], id?: string, name?: string) => {
    const pId = id || paletteIdRef.current;
    const pName = name !== undefined ? name : paletteNameRef.current;
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
        }
      });
    }

    // Listen for IPC re-init
    if (window.electronAPI?.onPaletteBarInit) {
      return window.electronAPI.onPaletteBarInit((data) => {
        setPaletteId(data.paletteId);
        setPaletteName(data.paletteName);
      });
    }
  }, []);

  // Handle inline name editing with 400ms debounce
  const handleNameChange = (newName: string) => {
    setPaletteName(newName);
    paletteNameRef.current = newName;

    if (saveNameTimeoutRef.current) {
      clearTimeout(saveNameTimeoutRef.current);
    }

    saveNameTimeoutRef.current = setTimeout(() => {
      persistPalette(colorsRef.current, paletteIdRef.current, newName);
    }, 400);
  };

  // Trigger native eyedropper for a specific slot
  const triggerPick = async (targetSlot: number) => {
    if (isPicking) return;
    setIsPicking(true);
    setActiveSlot(targetSlot);

    try {
      let picked: string | null = null;
      if (window.electronAPI?.pickScreenColor) {
        picked = await window.electronAPI.pickScreenColor({ noClipboard: true, noSpotlight: true });
      }

      if (picked) {
        const workingColors = [...colorsRef.current];
        workingColors[targetSlot] = picked;
        setColors(workingColors);
        await persistPalette(workingColors);
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
        if (data?.color && activeSlotRef.current !== null) {
          const updated = [...colorsRef.current];
          updated[activeSlotRef.current] = data.color;
          setColors(updated);
          persistPalette(updated);
        }
      });
    }
  }, [persistPalette]);

  // Finish and open detail (Save & Open)
  const handleOpenDetail = async () => {
    if (saveNameTimeoutRef.current) {
      clearTimeout(saveNameTimeoutRef.current);
    }
    await persistPalette(colorsRef.current, paletteIdRef.current, paletteNameRef.current);
    if (window.electronAPI?.openPaletteDetail) {
      await window.electronAPI.openPaletteDetail({ paletteId: paletteIdRef.current });
    } else {
      window.close();
    }
  };

  // Cancel / Close
  const handleClose = async () => {
    if (saveNameTimeoutRef.current) {
      clearTimeout(saveNameTimeoutRef.current);
    }
    if (window.electronAPI?.closePaletteBar) {
      await window.electronAPI.closePaletteBar();
    } else {
      window.close();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not handle navigation shortcuts when editing the palette name inline
      if ((e.target as HTMLElement)?.tagName === 'INPUT') {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleOpenDetail();
      } else if (e.key >= '1' && e.key <= '5') {
        const slotIdx = parseInt(e.key, 10) - 1;
        setActiveSlot((prev) => (prev === slotIdx ? null : slotIdx));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveSlot((prev) => (prev === null ? 0 : prev > 0 ? prev - 1 : 4));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveSlot((prev) => (prev === null ? 0 : prev < 4 ? prev + 1 : 0));
      } else if (e.key.toLowerCase() === 'c' || e.key === ' ') {
        if (activeSlotRef.current !== null) {
          e.preventDefault();
          triggerPick(activeSlotRef.current);
        }
      } else if (e.key.toLowerCase() === 't') {
        if (activeSlotRef.current !== null && colorsRef.current[activeSlotRef.current]) {
          e.preventDefault();
          handleTuneColor(activeSlotRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeColor = activeSlot !== null ? colors[activeSlot] : null;

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
        {/* App Title / Icon & Inline Editable Name */}
        <div className="h-8 flex items-center gap-2 pr-1 shrink-0 border-r border-white/10">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[18px]">palette</span>
          </div>
          <input
            type="text"
            value={paletteName}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                e.currentTarget.blur();
              }
            }}
            className="w-[120px] focus:w-[150px] bg-transparent hover:bg-white/[0.06] focus:bg-black/50 rounded-lg px-2 py-1 text-xs font-semibold text-white tracking-wide outline-none border border-transparent focus:border-rose-400/40 transition-all truncate cursor-text"
            placeholder="Název palety"
            title="Klikněte pro přejmenování palety"
          />
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
                    // Click on active slot toggles it off
                    setActiveSlot(null);
                  } else {
                    // Click activates slot
                    setActiveSlot(idx);
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
                    ? `Pozice ${idx + 1}: ${color} (${isActive ? 'aktivní, klik zruší výběr' : 'klik = vybrat'})`
                    : `Pozice ${idx + 1}: Prázdné (${isActive ? 'aktivní, klik zruší výběr' : 'klik = vybrat'})`
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

        {/* Dynamic actions visible only when a slot is active */}
        {activeSlot !== null && (
          <div className="flex items-center gap-1.5 shrink-0 animate-fade-in">
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
              <span>Nabrat</span>
            </button>

            {/* Action: Doladit barvu (Tune color) if active slot has a color */}
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
                <span>Doladit</span>
              </button>
            )}
          </div>
        )}

        {/* Shortcuts pill (Spotlight kbd badges, Unified h-8) */}
        <div className="h-8 flex items-center gap-1.5 px-2 text-[11px] text-gray-400 font-sans shrink-0 border-l border-white/10">
          <kbd className="h-[20px] px-2 bg-white/[0.08] text-gray-300 rounded-full font-mono text-[10px] leading-none flex items-center justify-center">
            Enter
          </kbd>
          <span className="text-[11px] text-gray-300">uložit a otevřít</span>
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
