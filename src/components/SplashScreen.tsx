import React from 'react';
import { CURRENT_APP_VERSION } from '../changelog';
import appLogo from '../assets/icon.png';

export const SplashScreen: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center select-none overflow-hidden font-sans">
      <div
        className="w-full h-full bg-[#141520] text-gray-200 rounded-2xl border border-white/10 flex flex-col items-start justify-start p-7 relative shadow-none outline-none"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Large icon */}
        <img
          src={appLogo}
          alt="IADonkey"
          className="w-16 h-16 object-contain rounded-2xl mb-4 shadow-xl shadow-black/40"
        />

        {/* Title & Version */}
        <span className="font-bold text-[26px] text-white tracking-tight leading-tight mb-1">
          IADonkey
        </span>
        <span className="text-[13px] font-semibold text-indigo-400 font-mono tracking-wider">
          v{CURRENT_APP_VERSION}
        </span>

        {/* Space */}
        <div className="flex-1 min-h-[16px]" />

        {/* Brief description */}
        <p className="text-xs text-gray-400 leading-relaxed mb-5">
          Rychlý a inteligentní spouštěč pro vaše každodenní úkoly a produktivitu. Sjednocuje vyhledávání, pracovní nástroje a automatizaci do jednoho přehledného prostředí.
        </p>

        {/* Bottom copyright */}
        <div className="text-[11px] text-gray-500">
          © 2026 Petr Coolhanek
        </div>
      </div>
    </div>
  );
};
