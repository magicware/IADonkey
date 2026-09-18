import React, { useState, useEffect, useRef } from 'react';

interface FastSnapInitData {
  screenshotUrl: string;
  width: number;
  height: number;
  scaleFactor: number;
}

export const FastSnapSnipper: React.FC = () => {
  const [initData, setInitData] = useState<FastSnapInitData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (window.electronAPI?.cancelFastSnap) {
          window.electronAPI.cancelFastSnap();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let unsubscribe: (() => void) | undefined;
    if (window.electronAPI?.onFastSnapInitData) {
      unsubscribe = window.electronAPI.onFastSnapInitData((data) => {
        setInitData(data);
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (unsubscribe) unsubscribe();
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

    if (window.electronAPI?.finishFastSnap) {
      await window.electronAPI.finishFastSnap({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
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
      className="fixed inset-0 select-none overflow-hidden cursor-crosshair z-50 bg-black"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => {
        e.preventDefault();
        window.electronAPI?.cancelFastSnap?.();
      }}
    >
      {/* 1. Podkladový screenshot */}
      {initData?.screenshotUrl && (
        <img
          src={initData.screenshotUrl}
          alt="Desktop Background"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      )}

      {/* 2. Ztmavení celé obrazovky */}
      <div className="absolute inset-0 bg-black/45 pointer-events-none transition-opacity duration-150" />

      {/* 3. Nápověda nahoře uprostřed (pokud se netáhne) */}
      {!isDragging && !selectionBox && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 text-slate-100 text-sm font-medium shadow-2xl border border-white/15 backdrop-blur-md animate-fade-in">
          <span className="material-symbols-rounded text-indigo-400 text-lg">crop</span>
          <span>Táhněte myší pro výběr výstřižku</span>
          <span className="text-slate-400 text-xs px-1.5 py-0.5 rounded bg-white/10 border border-white/10">Esc pro zrušení</span>
        </div>
      )}

      {/* 4. Ostrý průhledný výřez nad ztmavením */}
      {selectionBox && selectionBox.w > 0 && selectionBox.h > 0 && initData?.screenshotUrl && (
        <div
          className="absolute pointer-events-none border-2 border-indigo-500 shadow-2xl"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.w,
            height: selectionBox.h,
          }}
        >
          {/* Výřez původního snímku bez ztmavení */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={initData.screenshotUrl}
              alt="Clear cutout"
              className="absolute max-w-none pointer-events-none"
              style={{
                left: -selectionBox.x,
                top: -selectionBox.y,
                width: initData.width,
                height: initData.height,
              }}
              draggable={false}
            />
          </div>

          {/* Rohové úchyty pro profesionální vizuál */}
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm" />
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm" />
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-indigo-600 rounded-sm" />

          {/* Badge s rozměry */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-indigo-600/95 text-white font-mono text-xs font-semibold shadow-lg backdrop-blur-sm pointer-events-none flex items-center gap-1.5 whitespace-nowrap ${
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
