import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Ruler,
  Crosshair,
  Lock,
  Unlock,
  Copy,
  Check,
  X,
} from 'lucide-react';

export type RulerMode = 'box' | 'crosshair';
export type RulerUnit = 'px' | '%' | 'dp';

interface RulerBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenRulerInitData {
  width: number;
  height: number;
  color: string;
  defaultUnit: string;
}

export const ScreenRulerOverlay: React.FC = () => {
  const [initData, setInitData] = useState<ScreenRulerInitData>({
    width: window.innerWidth || 1920,
    height: window.innerHeight || 1080,
    color: '#f43f5e',
    defaultUnit: 'px',
  });

  const [mode, setMode] = useState<RulerMode>('box');
  const [unit, setUnit] = useState<RulerUnit>('px');
  const [accentColor, setAccentColor] = useState<string>('#f43f5e');

  // Mouse / Box state
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<RulerBox | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isLockedRef = useRef(false);
  const boxRef = useRef<RulerBox | null>(null);
  const modeRef = useRef<RulerMode>('box');

  isDraggingRef.current = isDragging;
  dragStartRef.current = dragStart;
  isLockedRef.current = isLocked;
  boxRef.current = box;
  modeRef.current = mode;

  // Sound effect / Audio beep if available
  const playCopyFeedback = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {}
  };

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (window.electronAPI?.copyScreenRulerDimensions) {
        await window.electronAPI.copyScreenRulerDimensions(text);
      } else {
        await navigator.clipboard?.writeText(text);
      }
    } catch (err) {
      console.error('[ScreenRuler] Copy error:', err);
    }
    playCopyFeedback();
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 1200);
  }, []);

  const handleClose = useCallback(() => {
    if (window.electronAPI?.closeScreenRuler) {
      window.electronAPI.closeScreenRuler();
    } else {
      window.close();
    }
  }, []);

  // Format value by unit
  const formatVal = useCallback(
    (pxValue: number, isHeight = false): string => {
      if (unit === '%') {
        const total = isHeight ? (initData.height || 1080) : (initData.width || 1920);
        return `${((pxValue / total) * 100).toFixed(1)}%`;
      }
      if (unit === 'dp') {
        const factor = window.devicePixelRatio || 1;
        return `${Math.round(pxValue / factor)} dp`;
      }
      return `${Math.round(pxValue)} px`;
    },
    [unit, initData.width, initData.height]
  );

  // GCD for aspect ratio
  const getAspectRatio = (w: number, h: number): string => {
    if (w <= 0 || h <= 0) return '1:1';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(Math.round(w), Math.round(h));
    const rw = Math.round(w / divisor);
    const rh = Math.round(h / divisor);
    if (rw <= 21 && rh <= 21) {
      return `${rw}:${rh}`;
    }
    return `${(w / h).toFixed(2)}:1`;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (boxRef.current && (boxRef.current.width > 3 || boxRef.current.height > 3)) {
          setBox(null);
          setIsDragging(false);
          setDragStart(null);
          setIsLocked(false);
          return;
        }
        handleClose();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsLocked((prev) => !prev);
        return;
      }

      if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (mode === 'box' && boxRef.current && boxRef.current.width > 0 && boxRef.current.height > 0) {
          const w = Math.round(boxRef.current.width);
          const h = Math.round(boxRef.current.height);
          copyToClipboard(`${w}×${h} ${unit}`);
        } else {
          copyToClipboard(`${Math.round(mousePos.x)} / ${Math.round(mousePos.y)} ${unit}`);
        }
        return;
      }

      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setMode((prev) => {
          const next = prev === 'box' ? 'crosshair' : 'box';
          if (next === 'crosshair') {
            setBox(null);
            setIsDragging(false);
            setDragStart(null);
          }
          return next;
        });
        return;
      }

      if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setUnit((prev) => {
          if (prev === 'px') return '%';
          if (prev === '%') return 'dp';
          return 'px';
        });
        return;
      }

      // Arrow keys for nudging box position
      if (boxRef.current && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        setBox((prev) => {
          if (!prev) return null;
          let { x, y, width, height } = prev;
          if (e.key === 'ArrowLeft') x = Math.max(0, x - delta);
          if (e.key === 'ArrowRight') x = Math.min(initData.width - width, x + delta);
          if (e.key === 'ArrowUp') y = Math.max(0, y - delta);
          if (e.key === 'ArrowDown') y = Math.min(initData.height - height, y + delta);
          return { x, y, width, height };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, copyToClipboard, initData.width, initData.height, mousePos.x, mousePos.y]);

  // IPC Initial Data & Cleanup
  useEffect(() => {
    const fetchInit = window.electronAPI?.getScreenRulerInitData;
    if (fetchInit) {
      fetchInit().then((data) => {
        if (data) {
          setInitData(data);
          if (data.color) setAccentColor(data.color);
          if (data.defaultUnit) setUnit(data.defaultUnit as RulerUnit);
        }
      });
    }

    let unsubscribeInit: (() => void) | undefined;
    if (window.electronAPI?.onScreenRulerInit) {
      unsubscribeInit = window.electronAPI.onScreenRulerInit((data) => {
        setInitData(data);
        if (data.color) setAccentColor(data.color);
        if (data.defaultUnit) setUnit(data.defaultUnit as RulerUnit);
        setBox(null);
        setIsLocked(false);
      });
    }

    let unsubscribeCleanup: (() => void) | undefined;
    if (window.electronAPI?.onScreenRulerCleanup) {
      unsubscribeCleanup = window.electronAPI.onScreenRulerCleanup(() => {
        setBox(null);
        setIsDragging(false);
        setIsLocked(false);
      });
    }

    return () => {
      if (unsubscribeInit) unsubscribeInit();
      if (unsubscribeCleanup) unsubscribeCleanup();
    };
  }, []);

  const handleSetMode = (newMode: 'box' | 'crosshair') => {
    setMode(newMode);
    if (newMode === 'crosshair') {
      setBox(null);
      setIsDragging(false);
      setDragStart(null);
    }
  };

  // Mouse handlers for dragging bounding box
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary button
    if (isLocked) return;
    if (mode !== 'box') return;

    const x = e.clientX;
    const y = e.clientY;
    setIsDragging(true);
    setDragStart({ x, y });
    setBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    setMousePos({ x, y });

    if (isDragging && dragStart && !isLocked && mode === 'box') {
      const startX = dragStart.x;
      const startY = dragStart.y;
      const boxX = Math.min(startX, x);
      const boxY = Math.min(startY, y);
      const width = Math.abs(x - startX);
      const height = Math.abs(y - startY);
      setBox({ x: boxX, y: boxY, width, height });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
    }
  };

  const boxW = box ? Math.round(box.width) : 0;
  const boxH = box ? Math.round(box.height) : 0;
  const hasBox = box !== null && (boxW > 3 || boxH > 3);
  const isSelection = mode === 'box' && box !== null && hasBox;
  const val1 = isSelection ? Math.round(box!.width) : Math.round(mousePos.x);
  const val2 = isSelection ? Math.round(box!.height) : Math.round(mousePos.y);
  const separator = isSelection ? '×' : '/';

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-screen h-screen overflow-hidden select-none cursor-crosshair bg-transparent"
      style={{ userSelect: 'none' }}
    >
      {/* SVG Canvas for precision guides, bounding boxes and edge distance lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <defs>
          {/* Arrow markers */}
          <marker
            id="ruler-arrow-start"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={accentColor} />
          </marker>
          <marker
            id="ruler-arrow-end"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={accentColor} />
          </marker>
        </defs>

        {/* ================= MODE: CROSSHAIR ================= */}
        {mode === 'crosshair' && (
          <g>
            {/* Fullscreen Crosshair lines */}
            <line
              x1={0}
              y1={mousePos.y}
              x2={initData.width || window.innerWidth}
              y2={mousePos.y}
              stroke={accentColor}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeOpacity="0.85"
            />
            <line
              x1={mousePos.x}
              y1={0}
              x2={mousePos.x}
              y2={initData.height || window.innerHeight}
              stroke={accentColor}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeOpacity="0.85"
            />

            {/* Solid distance lines from cursor to edges */}
            {/* Top guide line */}
            <line
              x1={mousePos.x}
              y1={0}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke={accentColor}
              strokeWidth="2"
              markerEnd="url(#ruler-arrow-end)"
            />
            {/* Bottom guide line */}
            <line
              x1={mousePos.x}
              y1={mousePos.y}
              x2={mousePos.x}
              y2={initData.height || window.innerHeight}
              stroke={accentColor}
              strokeWidth="2"
              markerEnd="url(#ruler-arrow-end)"
            />
            {/* Left guide line */}
            <line
              x1={0}
              y1={mousePos.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke={accentColor}
              strokeWidth="2"
              markerEnd="url(#ruler-arrow-end)"
            />
            {/* Right guide line */}
            <line
              x1={mousePos.x}
              y1={mousePos.y}
              x2={initData.width || window.innerWidth}
              y2={mousePos.y}
              stroke={accentColor}
              strokeWidth="2"
              markerEnd="url(#ruler-arrow-end)"
            />
          </g>
        )}

        {/* ================= MODE: BOUNDING BOX ================= */}
        {mode === 'box' && hasBox && box && (
          <g>
            {/* Semi-transparent filled rectangle with accent border */}
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              fill={accentColor}
              fillOpacity="0.12"
              stroke={accentColor}
              strokeWidth="2"
            />

            {/* Corner accent handles */}
            <rect x={box.x - 3} y={box.y - 3} width="6" height="6" fill={accentColor} />
            <rect x={box.x + box.width - 3} y={box.y - 3} width="6" height="6" fill={accentColor} />
            <rect x={box.x - 3} y={box.y + box.height - 3} width="6" height="6" fill={accentColor} />
            <rect x={box.x + box.width - 3} y={box.y + box.height - 3} width="6" height="6" fill={accentColor} />

            {/* Horizontal dimension line (Top) */}
            <line
              x1={box.x}
              y1={Math.max(16, box.y - 12)}
              x2={box.x + box.width}
              y2={Math.max(16, box.y - 12)}
              stroke={accentColor}
              strokeWidth="1.5"
              markerStart="url(#ruler-arrow-start)"
              markerEnd="url(#ruler-arrow-end)"
            />

            {/* Vertical dimension line (Left) */}
            <line
              x1={Math.max(16, box.x - 12)}
              y1={box.y}
              x2={Math.max(16, box.x - 12)}
              y2={box.y + box.height}
              stroke={accentColor}
              strokeWidth="1.5"
              markerStart="url(#ruler-arrow-start)"
              markerEnd="url(#ruler-arrow-end)"
            />
          </g>
        )}
      </svg>

      {/* ================= CROSSHAIR BADGES (HTML Overlays) ================= */}
      {mode === 'crosshair' && (
        <>
          {/* Top distance badge */}
          {mousePos.y > 30 && (
            <div
              className="absolute pointer-events-none px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium shadow-xl backdrop-blur-md tabular-nums transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: mousePos.x,
                top: mousePos.y / 2,
                backgroundColor: 'rgba(28, 29, 36, 0.95)',
                color: accentColor,
                border: `1px solid ${accentColor}50`,
                zIndex: 20,
              }}
            >
              {formatVal(mousePos.y, true)}
            </div>
          )}

          {/* Bottom distance badge */}
          {(initData.height || window.innerHeight) - mousePos.y > 30 && (
            <div
              className="absolute pointer-events-none px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium shadow-xl backdrop-blur-md tabular-nums transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: mousePos.x,
                top: mousePos.y + ((initData.height || window.innerHeight) - mousePos.y) / 2,
                backgroundColor: 'rgba(28, 29, 36, 0.95)',
                color: accentColor,
                border: `1px solid ${accentColor}50`,
                zIndex: 20,
              }}
            >
              {formatVal((initData.height || window.innerHeight) - mousePos.y, true)}
            </div>
          )}

          {/* Left distance badge */}
          {mousePos.x > 30 && (
            <div
              className="absolute pointer-events-none px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium shadow-xl backdrop-blur-md tabular-nums transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: mousePos.x / 2,
                top: mousePos.y,
                backgroundColor: 'rgba(28, 29, 36, 0.95)',
                color: accentColor,
                border: `1px solid ${accentColor}50`,
                zIndex: 20,
              }}
            >
              {formatVal(mousePos.x, false)}
            </div>
          )}

          {/* Right distance badge */}
          {(initData.width || window.innerWidth) - mousePos.x > 30 && (
            <div
              className="absolute pointer-events-none px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium shadow-xl backdrop-blur-md tabular-nums transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: mousePos.x + ((initData.width || window.innerWidth) - mousePos.x) / 2,
                top: mousePos.y,
                backgroundColor: 'rgba(28, 29, 36, 0.95)',
                color: accentColor,
                border: `1px solid ${accentColor}50`,
                zIndex: 20,
              }}
            >
              {formatVal((initData.width || window.innerWidth) - mousePos.x, false)}
            </div>
          )}

          {/* Center Coordinates Tooltip */}
          <div
            className="absolute pointer-events-none px-3 py-1.5 rounded-xl text-xs font-mono font-medium shadow-2xl backdrop-blur-xl"
            style={{
              left: Math.min(window.innerWidth - 130, mousePos.x + 12),
              top: Math.min(window.innerHeight - 50, mousePos.y + 12),
              backgroundColor: 'rgba(28, 29, 36, 0.95)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              zIndex: 25,
            }}
          >
            <div className="flex items-center gap-1.5 tabular-nums">
              <span className="text-gray-400">X:</span>
              <span className="text-white font-semibold">{Math.round(mousePos.x)}</span>
              <span className="text-gray-400 ml-1.5">Y:</span>
              <span className="text-white font-semibold">{Math.round(mousePos.y)}</span>
            </div>
          </div>
        </>
      )}

      {/* ================= BOX BADGES ================= */}
      {mode === 'box' && hasBox && box && (
        <>
          {/* Top Width Badge */}
          <div
            className="absolute pointer-events-none px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium shadow-xl backdrop-blur-md tabular-nums transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: box.x + box.width / 2,
              top: Math.max(16, box.y - 12),
              backgroundColor: 'rgba(28, 29, 36, 0.95)',
              color: accentColor,
              border: `1px solid ${accentColor}50`,
              zIndex: 25,
            }}
          >
            {formatVal(box.width, false)}
          </div>

          {/* Left Height Badge */}
          <div
            className="absolute pointer-events-none px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium shadow-xl backdrop-blur-md tabular-nums transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: Math.max(16, box.x - 12),
              top: box.y + box.height / 2,
              backgroundColor: 'rgba(28, 29, 36, 0.95)',
              color: accentColor,
              border: `1px solid ${accentColor}50`,
              zIndex: 25,
            }}
          >
            {formatVal(box.height, true)}
          </div>

          {/* Bottom Box Info Card (W × H, Ratio, Area) */}
          <div
            className="absolute pointer-events-none px-3.5 py-1.5 rounded-xl text-xs font-mono shadow-2xl backdrop-blur-xl flex items-center gap-3 border border-white/10"
            style={{
              left: Math.min(window.innerWidth - 240, Math.max(12, box.x)),
              top: Math.min(window.innerHeight - 50, box.y + box.height + 10),
              backgroundColor: 'rgba(28, 29, 36, 0.95)',
              color: '#f8fafc',
              zIndex: 25,
            }}
          >
            <div className="flex items-center gap-1.5 font-bold tabular-nums" style={{ color: accentColor }}>
              <span>{Math.round(box.width)}</span>
              <span className="opacity-60">×</span>
              <span>{Math.round(box.height)}</span>
              <span className="text-[10px] uppercase font-normal opacity-80">{unit}</span>
            </div>
            <div className="h-3.5 w-px bg-white/15" />
            <div className="text-[11px] text-gray-300">
              <span className="text-gray-400">Ratio: </span>
              {getAspectRatio(box.width, box.height)}
            </div>
            <div className="h-3.5 w-px bg-white/15" />
            <div className="text-[11px] text-gray-300">
              <span className="text-gray-400">Plocha: </span>
              {(Math.round(box.width) * Math.round(box.height)).toLocaleString()} px²
            </div>
          </div>
        </>
      )}

      {/* ================= FLOATING TOP TOOLBAR (Spotlight Visual Style) ================= */}
      <div
        className="fixed top-5 left-1/2 transform -translate-x-1/2 flex items-center gap-2 p-1.5 px-3 rounded-2xl shadow-2xl border border-white/10 transition-all pointer-events-auto bg-[#1c1d24] text-gray-100"
        style={{
          zIndex: 50,
        }}
        onMouseDown={(e) => e.stopPropagation()} // don't trigger canvas drag
      >
        {/* App Title / Icon (Unified h-8) */}
        <div className="h-8 flex items-center gap-2 pr-2.5 border-r border-white/10 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-sm shrink-0">
            <Ruler className="w-4 h-4 text-rose-400" />
          </div>
          <div className="hidden sm:block text-xs font-semibold text-white tracking-wide">
            ScreenRuler
          </div>
        </div>

        {/* Mode Selector (Unified h-8) */}
        <div className="h-8 flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => handleSetMode('box')}
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'box'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
            title="Obdélníkový výběr (M)"
          >
            <span className="material-symbols-outlined text-[15px] leading-none">crop_free</span>
            <span>Výběr</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetMode('crosshair')}
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'crosshair'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
            title="Kříž a vzdálenost k okrajům (M)"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Kříž</span>
          </button>
        </div>

        {/* Unit Selector (Unified h-8, Fixed Square Buttons) */}
        <div className="h-8 flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10 shrink-0">
          {(['px', '%', 'dp'] as RulerUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`w-7 h-7 p-0 rounded-lg text-[11px] font-mono font-medium transition-all flex items-center justify-center ${
                unit === u
                  ? 'bg-white/15 text-white font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={`Jednotka měření: ${u} (U)`}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Dimension display & Copy Button (Fixed 4-digit width, Unified template to prevent jitter, Unified h-8) */}
        <button
          type="button"
          onClick={() => {
            if (isSelection) {
              const text = `${val1}×${val2} ${unit}`;
              copyToClipboard(text);
            } else {
              const text = `${val1} / ${val2} ${unit}`;
              copyToClipboard(text);
            }
          }}
          className="h-8 flex items-center gap-2 px-3 bg-black/40 hover:bg-white/10 text-white rounded-xl text-xs font-mono border border-white/10 hover:border-white/20 transition-all active:scale-95 cursor-pointer shrink-0"
          title="Kliknutím zkopírujte rozměr do schránky (C)"
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
          <div className="flex items-center gap-1 font-mono text-xs tabular-nums select-none">
            <span className="w-11 text-right font-semibold text-white inline-block">
              {val1}
            </span>
            <span className="text-gray-500 font-normal mx-0.5">{separator}</span>
            <span className="w-11 text-left font-semibold text-white inline-block">
              {val2}
            </span>
            <span className="text-[10px] text-gray-400 uppercase ml-0.5">{unit}</span>
          </div>
        </button>

        {/* Lock / Freeze Button (Unified h-8 w-8) */}
        <button
          type="button"
          onClick={() => setIsLocked((prev) => !prev)}
          className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all active:scale-95 cursor-pointer shrink-0 ${
            isLocked
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
              : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10 border-white/10'
          }`}
          title={isLocked ? 'Odemknout výběr (Mezerník)' : 'Zmrazit výběr (Mezerník)'}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>

        {/* Keyboard hints pill (Spotlight kbd badges, Unified h-8) */}
        <div className="h-8 hidden lg:flex items-center gap-1.5 px-2.5 text-[11px] text-gray-400 border-l border-white/10 font-sans shrink-0">
          <kbd className="h-[18px] px-1.5 bg-white/10 text-gray-300 border border-white/15 rounded font-mono text-[10px] leading-none flex items-center justify-center">Esc</kbd>
          <span>konec</span>
          <kbd className="h-[18px] px-1.5 bg-white/10 text-gray-300 border border-white/15 rounded font-mono text-[10px] leading-none flex items-center justify-center ml-1">Space</kbd>
          <span>zámek</span>
          <kbd className="h-[18px] px-1.5 bg-white/10 text-gray-300 border border-white/15 rounded font-mono text-[10px] leading-none flex items-center justify-center ml-1">C</kbd>
          <span>kopírovat</span>
        </div>

        {/* Close Button (Unified h-8 w-8) */}
        <button
          type="button"
          onClick={handleClose}
          className="w-8 h-8 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-100 border border-rose-500/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 ml-0.5"
          title="Zavřít pravítko (Escape)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
export default ScreenRulerOverlay;
