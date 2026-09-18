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
        setInitData(null);
        setIsFinished(false);
        setIsDragging(false);
        setStartPos(null);
        setCurrentPos(null);
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

    setIsFinished(true);

    const finishFn = window.electronAPI?.finishQuickCap || window.electronAPI?.finishFastSnap;
    if (finishFn) {
      await finishFn({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      });
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

      {/* 3. Nápověda nahoře uprostřed (pokud se netáhne) */}
      {!isDragging && (!selectionBox || selectionBox.w <= 0 || selectionBox.h <= 0) && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 text-slate-100 text-sm font-medium shadow-2xl border border-white/15 backdrop-blur-md animate-fade-in">
          <span className="material-symbols-rounded text-rose-400 text-lg">crop</span>
          <span>Táhněte myší pro výběr výstřižku</span>
          <span className="text-slate-400 text-xs px-1.5 py-0.5 rounded bg-white/10 border border-white/10">Esc pro zrušení</span>
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
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-rose-600 rounded-sm" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-rose-600 rounded-sm" />
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-rose-600 rounded-sm" />
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-rose-600 rounded-sm" />

          {/* Badge s rozměry */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-rose-600 text-white font-mono text-xs font-semibold shadow-lg backdrop-blur-sm pointer-events-none flex items-center gap-1.5 whitespace-nowrap ${
              selectionBox.y > 35 ? '-top-8' : 'bottom-2'
            }`}
          >
            <span>{Math.round(selectionBox.w)} × {Math.round(selectionBox.h)} px</span>
          </div>
        </div>
      )}
    </div>
  );
};
