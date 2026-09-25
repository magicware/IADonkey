import React, { useState, useEffect } from 'react';
import { parseColorQuery, rgbToHex, rgbToHsl, hslToRgb } from '../utils/colorMaster';

interface TuneColorModalProps {
  initialColor?: string;
}

export const TuneColorModal: React.FC<TuneColorModalProps> = ({ initialColor = '#6366f1' }) => {
  // Parse initial color
  const initialParsed = parseColorQuery(initialColor) || {
    hex: '#6366F1',
    hexNoHash: '6366F1',
    rgb: 'rgb(99, 102, 241)',
    rgba: 'rgba(99, 102, 241, 1)',
    hsl: 'hsl(239, 84%, 67%)',
    hsla: 'hsla(239, 84%, 67%, 1)',
    r: 99,
    g: 102,
    b: 241,
    a: 1,
  };

  const [r, setR] = useState(initialParsed.r);
  const [g, setG] = useState(initialParsed.g);
  const [b, setB] = useState(initialParsed.b);
  const [a, setA] = useState(initialParsed.a);

  // Read params from URL search if available
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const colorParam = params.get('color');
    if (colorParam) {
      const parsed = parseColorQuery(colorParam);
      if (parsed) {
        setR(parsed.r);
        setG(parsed.g);
        setB(parsed.b);
        setA(parsed.a);
      }
    }
  }, []);

  // Compute derived formats
  const hex = rgbToHex(r, g, b);
  const hslObj = rgbToHsl(r, g, b);
  const rgbString = `rgb(${r}, ${g}, ${b})`;
  const rgbaString = `rgba(${r}, ${g}, ${b}, ${a})`;
  const hslString = `hsl(${hslObj.h}, ${hslObj.s}%, ${hslObj.l}%)`;

  const handleSave = async () => {
    // If alpha is 1, default to hex, else rgba
    const finalColor = a < 1 ? rgbaString : hex;
    if (window.electronAPI?.saveTuneColor) {
      await window.electronAPI.saveTuneColor(finalColor);
    } else {
      window.close();
    }
  };

  const handleCancel = async () => {
    if (window.electronAPI?.closeTuneColorWindow) {
      await window.electronAPI.closeTuneColorWindow();
    } else {
      window.close();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [r, g, b, a]);

  return (
    <div className="h-screen max-h-screen flex flex-col m3-surface-main text-gray-200 select-none overflow-hidden font-sans">
      {/* Main Content (scrollable if window height is small, includes Header) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-1">
          <div className="w-10 h-10 rounded-full bg-rose-600/20 flex items-center justify-center text-rose-400 shrink-0">
            <span className="material-symbols-outlined text-2xl">tune</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Doladění barvy</h2>
            <p className="text-xs text-gray-400">Přesné nastavení odstínu, složek a průhlednosti</p>
          </div>
        </div>

        {/* Swatches comparison */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Původní</span>
            <div
              className="h-14 rounded-2xl border border-white/10 shadow-inner flex items-center justify-center transition overflow-hidden"
              style={{ backgroundColor: initialParsed.hex }}
            >
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-mono font-semibold text-white">
                {initialParsed.hex}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Nová barva</span>
            <div
              className="h-14 rounded-2xl border border-white/10 shadow-inner flex items-center justify-center transition overflow-hidden"
              style={{ backgroundColor: rgbaString }}
            >
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-mono font-semibold text-white">
                {a < 1 ? rgbaString : hex}
              </span>
            </div>
          </div>
        </div>

        {/* Sliders Section */}
        <div className="space-y-3 bg-white/[0.03] rounded-2xl p-4">
          {/* Red Slider */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="w-16 shrink-0 text-rose-400 font-bold whitespace-nowrap">R ({r})</span>
            <input
              type="range"
              min={0}
              max={255}
              value={r}
              onChange={(e) => setR(Number(e.target.value))}
              className="flex-1 accent-rose-500 cursor-pointer h-1.5 bg-white/10 rounded-full"
            />
            <input
              type="number"
              min={0}
              max={255}
              value={r}
              onChange={(e) => setR(Math.max(0, Math.min(255, Number(e.target.value))))}
              className="w-14 bg-black/40 rounded-full px-2 py-1 text-center font-mono text-xs text-white focus:outline-none"
            />
          </div>

          {/* Green Slider */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="w-16 shrink-0 text-emerald-400 font-bold whitespace-nowrap">G ({g})</span>
            <input
              type="range"
              min={0}
              max={255}
              value={g}
              onChange={(e) => setG(Number(e.target.value))}
              className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-white/10 rounded-full"
            />
            <input
              type="number"
              min={0}
              max={255}
              value={g}
              onChange={(e) => setG(Math.max(0, Math.min(255, Number(e.target.value))))}
              className="w-14 bg-black/40 rounded-full px-2 py-1 text-center font-mono text-xs text-white focus:outline-none"
            />
          </div>

          {/* Blue Slider */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="w-16 shrink-0 text-blue-400 font-bold whitespace-nowrap">B ({b})</span>
            <input
              type="range"
              min={0}
              max={255}
              value={b}
              onChange={(e) => setB(Number(e.target.value))}
              className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full"
            />
            <input
              type="number"
              min={0}
              max={255}
              value={b}
              onChange={(e) => setB(Math.max(0, Math.min(255, Number(e.target.value))))}
              className="w-14 bg-black/40 rounded-full px-2 py-1 text-center font-mono text-xs text-white focus:outline-none"
            />
          </div>

          {/* Alpha Slider */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="w-16 shrink-0 text-gray-300 font-bold whitespace-nowrap">A ({Math.round(a * 100)}%)</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(a * 100)}
              onChange={(e) => setA(Number((Number(e.target.value) / 100).toFixed(2)))}
              className="flex-1 accent-gray-300 cursor-pointer h-1.5 bg-white/10 rounded-full"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(a * 100)}
              onChange={(e) => setA(Number((Math.max(0, Math.min(100, Number(e.target.value))) / 100).toFixed(2)))}
              className="w-14 bg-black/40 rounded-full px-2 py-1 text-center font-mono text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Format Inputs */}
        <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
          <div className="bg-white/[0.03] rounded-2xl p-3 flex items-center justify-between">
            <span className="text-gray-400 font-sans text-[11px]">HEX:</span>
            <span className="font-semibold text-white select-all">{hex}</span>
          </div>
          <div className="bg-white/[0.03] rounded-2xl p-3 flex items-center justify-between">
            <span className="text-gray-400 font-sans text-[11px]">RGB:</span>
            <span className="font-semibold text-white select-all">{rgbString}</span>
          </div>
          <div className="bg-white/[0.03] rounded-2xl p-3 flex items-center justify-between">
            <span className="text-gray-400 font-sans text-[11px]">RGBA:</span>
            <span className="font-semibold text-white select-all">{rgbaString}</span>
          </div>
          <div className="bg-white/[0.03] rounded-2xl p-3 flex items-center justify-between">
            <span className="text-gray-400 font-sans text-[11px]">HSL:</span>
            <span className="font-semibold text-white select-all">{hslString}</span>
          </div>
        </div>
      </div>

      {/* Fixed Footer Buttons */}
      <div className="shrink-0 flex items-center justify-between p-5">
        <button
          type="button"
          onClick={handleCancel}
          className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-full text-xs font-medium transition cursor-pointer"
        >
          Zrušit (Esc)
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white"
        >
          <span className="material-symbols-outlined text-sm">check</span>
          <span>Uložit barvu</span>
        </button>
      </div>
    </div>
  );
};
