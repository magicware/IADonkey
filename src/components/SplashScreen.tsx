import React, { useState, useEffect } from 'react';
import { CURRENT_APP_VERSION } from '../changelog';
import appLogo from '../assets/icon.png';

export const SplashScreen: React.FC = () => {
  const [percent, setPercent] = useState<number>(15);
  const [statusText, setStatusText] = useState<string>('Inicializace aplikace...');

  useEffect(() => {
    // 1. Fetch initial status in case main process already sent status before mount
    if (window.electronAPI?.getSplashStatus) {
      window.electronAPI.getSplashStatus().then((status) => {
        if (status) {
          if (typeof status.percent === 'number') setPercent(status.percent);
          if (status.text) setStatusText(status.text);
        }
      });
    }

    // 2. Subscribe to subsequent status events
    if (window.electronAPI?.onSplashStatus) {
      const unsubscribe = window.electronAPI.onSplashStatus((status) => {
        if (typeof status.percent === 'number') setPercent(status.percent);
        if (status.text) setStatusText(status.text);
      });
      return () => unsubscribe();
    }
  }, []);

  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center p-2 select-none overflow-hidden font-sans">
      <div
        className="w-full h-full bg-[#12131c] text-gray-200 border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col justify-between"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Header: Donkey icon + App name + Version badge + Pulsing status dot */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={appLogo} alt="IADonkey" className="w-5 h-5 rounded-md object-contain shadow-sm" />
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-sm text-white tracking-wide">IADonkey</span>
              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full leading-none">
                v{CURRENT_APP_VERSION}
              </span>
            </div>
          </div>

          {/* Pulsing indicator */}
          <div className="flex items-center gap-1.5 pr-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </div>
        </div>

        {/* Status text & Progress */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium truncate max-w-[270px]">
              {statusText}
            </span>
            <span className="text-indigo-400 font-mono text-[11px] font-semibold">
              {clampedPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
              style={{ width: `${clampedPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
