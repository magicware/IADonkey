import React from 'react';
import { CURRENT_APP_VERSION } from '../changelog';
import appLogo from '../assets/icon.png';

export const SplashScreen: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center select-none overflow-hidden font-sans">
      <div
        className="w-full h-full bg-[#141520] text-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 relative shadow-none border-none outline-none"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Photoshop-style 48px app icon */}
        <div className="relative flex items-center justify-center">
          <img
            src={appLogo}
            alt="IADonkey"
            className="w-12 h-12 object-contain rounded-xl"
          />
        </div>

        {/* Photoshop-style Title & Version */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-bold text-lg text-white tracking-wide leading-tight">
            IADonkey
          </span>
          <span className="text-xs font-semibold text-indigo-400 font-mono tracking-wider">
            v{CURRENT_APP_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
};
