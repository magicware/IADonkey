import React, { useState, useEffect, useRef } from 'react';

interface QuickCapInitData {
  screenshotUrl: string;
  width: number;
  height: number;
  scaleFactor: number;
}

export const QuickCapSnipper: React.FC = () => {
  const [initData, setInitData] = useState<QuickCapInitData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resetState = () => {
    setInitData(null);
    setIsFinished(false);
    setIsDragging(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  useEffect(() => {
    // Okamžité vyžádání dat při prvním mountu komponenty (řeší možný race condition)
    const fetchInit = window.electronAPI?.getQuickCapInitData || window.electronAPI?.getFastSnapInitData;
    if (fetchInit) {
      fetchInit().then((data) => {
        if (data) {
          setInitData(data);
          setIsFinished(false);
          setIsDragging(false);
          setStartPos(null);
          setCurrentPos(null);
        }
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resetState();
        if (window.electronAPI?.cancelQuickCap) {
          window.electronAPI.cancelQuickCap();
        } else if (window.electronAPI?.cancelFastSnap) {
          window.electronAPI.cancelFastSnap();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let unsubscribeInit: (() => void) | undefined;
    const listenInit = window.electronAPI?.onQuickCapInitData || window.electronAPI?.onFastSnapInitData;
    if (listenInit) {
      unsubscribeInit = listenInit((data) => {
        setInitData(data);
        setIsFinished(false);
        setIsDragging(false);
        setStartPos(null);
        setCurrentPos(null);
      });
    }

    let unsubscribeCleanup: (() => void) | undefined;
    const listenCleanup = window.electronAPI?.onQuickCapCleanup || window.electronAPI?.onFastSnapCleanup;
    if (listenCleanup) {
      unsubscribeCleanup = listenCleanup(() => {
        resetState();
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (unsubscribeInit) unsubscribeInit();
      if (unsubscribeCleanup) unsubscribeCleanup();
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isFinished) return; // pouze levé tlačítko
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !startPos || isFinished) return;
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = async () => {
    if (!isDragging || !startPos || !currentPos || isFinished) return;
    setIsDragging(false);

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    // Pokud je výběr příliš malý (náhodný klik), ignorujeme nebo zrušíme
    if (width < 8 || height < 8) {
      setStartPos(null);
      setCurrentPos(null);
      return;
    }

    const payload = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    };

    // Okamžitý kompletní reset stavu výstřižku (výběr, náhled, souřadnice),
    // aby v paměti a komponentě nezůstal předchozí stav a nedocházelo k probliknutí
    resetState();

    const finishFn = window.electronAPI?.finishQuickCap || window.electronAPI?.finishFastSnap;
    if (finishFn) {
      await finishFn(payload);
    }
  };

  // Výpočet obdélníku výběru
  let selectionBox: { x: number; y: number; w: number; h: number } | null = null;
  if (startPos && currentPos) {
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const w = Math.abs(currentPos.x - startPos.x);
    const h = Math.abs(currentPos.y - startPos.y);
    selectionBox = { x, y, w, h };
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 select-none overflow-hidden cursor-crosshair z-50 bg-transparent"
      style={{ width: '100vw', height: '100vh' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => {
        e.preventDefault();
        resetState();
        if (window.electronAPI?.cancelQuickCap) {
          window.electronAPI.cancelQuickCap();
        } else {
          window.electronAPI?.cancelFastSnap?.();
        }
      }}
    >
      {/* 1. Podkladový screenshot přes celou obrazovku */}
      {initData?.screenshotUrl && (
        <img
          src={initData.screenshotUrl}
          alt="Desktop Background"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          style={{ width: '100vw', height: '100vh', objectFit: 'fill' }}
          draggable={false}
          onError={(err) => {
            console.error('[QuickCap] Image load error:', err);
          }}
        />
      )}

      {/* 2. Ztmavení celé obrazovky když není žádný aktivní výběr */}
      {(!selectionBox || selectionBox.w <= 0 || selectionBox.h <= 0) && (
        <div className="absolute inset-0 bg-black/45 pointer-events-none transition-opacity duration-150" />
      )}

      {/* 3. Nápověda nahoře uprostřed (pokud se netáhne) – Spotlight Visual Style */}
      {!isDragging && (!selectionBox || selectionBox.w <= 0 || selectionBox.h <= 0) && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-2.5 px-3.5 h-10 rounded-2xl bg-[#1c1d24]/90 text-gray-100 text-xs font-medium shadow-2xl border border-white/10 backdrop-blur-2xl animate-fade-in select-none">
          <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <span className="material-symbols-outlined text-[16px] leading-none">crop</span>
          </div>
          <span className="text-white font-medium tracking-wide">Táhněte myší pro výběr výstřižku</span>
          <div className="h-4 w-px bg-white/15 mx-0.5" />
          <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[11px]">
            <kbd className="h-[18px] px-1.5 bg-white/10 text-gray-300 border border-white/15 rounded font-mono text-[10px] leading-none flex items-center justify-center">Esc</kbd>
            <span>pro zrušení</span>
          </div>
        </div>
      )}

      {/* 4. Ostrý průhledný výřez nad ztmavením pomocí box-shadow (dokonalé zarovnání bez duplicitního obrazu) */}
      {selectionBox && selectionBox.w > 0 && selectionBox.h > 0 && (
        <div
          className="absolute pointer-events-none border-2 border-rose-500"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.w,
            height: selectionBox.h,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
          }}
        >
          {/* Rohové úchyty */}
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-rose-500 rounded-sm shadow-sm" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-rose-500 rounded-sm shadow-sm" />
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-rose-500 rounded-sm shadow-sm" />
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-rose-500 rounded-sm shadow-sm" />

          {/* Badge s rozměry (Spotlight Visual Style) */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl bg-[#1c1d24]/95 border border-white/10 text-white font-mono text-xs shadow-2xl backdrop-blur-xl pointer-events-none flex items-center gap-1.5 whitespace-nowrap tabular-nums ${
              selectionBox.y > 40 ? '-top-9' : 'bottom-3'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shrink-0" />
            <span className="font-semibold text-white">{Math.round(selectionBox.w)}</span>
            <span className="text-gray-500 font-normal">×</span>
            <span className="font-semibold text-white">{Math.round(selectionBox.h)}</span>
            <span className="text-[10px] text-gray-400 uppercase font-sans ml-0.5">px</span>
          </div>
        </div>
      )}
    </div>
  );
};
