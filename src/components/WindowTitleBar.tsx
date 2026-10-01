import React, { useState, useEffect } from 'react';
import appLogo from '../assets/icon.png';

export interface WindowTitleBarProps {
  title: string;
  subtitle?: string;
  icon?: string;
  allowMinimize?: boolean;
  allowMaximize?: boolean;
  onClose?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: (isMaximized: boolean) => void;
  className?: string;
}

export const WindowTitleBar: React.FC<WindowTitleBarProps> = ({
  title,
  subtitle,
  icon,
  allowMinimize = true,
  allowMaximize = true,
  onClose,
  isMaximized: controlledMaximized,
  onToggleMaximize,
  className = '',
}) => {
  const [internalMaximized, setInternalMaximized] = useState(false);
  const isMaximized = controlledMaximized !== undefined ? controlledMaximized : internalMaximized;

  useEffect(() => {
    if (!allowMaximize) return;

    if (window.electronAPI?.isWindowMaximized) {
      window.electronAPI.isWindowMaximized().then((max) => {
        setInternalMaximized(Boolean(max));
        onToggleMaximize?.(Boolean(max));
      });
    }

    if (window.electronAPI?.onWindowMaximizeChanged) {
      const unsub = window.electronAPI.onWindowMaximizeChanged((max: boolean) => {
        setInternalMaximized(max);
        onToggleMaximize?.(max);
      });
      return () => unsub();
    }
  }, [allowMaximize, onToggleMaximize]);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };

  const handleMaximize = async () => {
    if (!allowMaximize) return;
    if (window.electronAPI?.maximizeWindow) {
      const state = await window.electronAPI.maximizeWindow();
      setInternalMaximized(Boolean(state));
      onToggleMaximize?.(Boolean(state));
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      window.electronAPI?.closeWindow?.() || window.close();
    }
  };

  return (
    <header
      className={`h-10 w-full bg-[#121319] flex items-center justify-between px-3.5 select-none shrink-0 border-b border-white/[0.04] transition-colors ${className}`}
      style={{ WebkitAppRegion: 'drag' } as any}
      onDoubleClick={() => {
        if (allowMaximize) {
          handleMaximize();
        }
      }}
    >
      {/* Left: App Logo / Icon & Title */}
      <div className="flex items-center gap-2.5 min-w-0 pr-3 pointer-events-none">
        {icon ? (
          <span className="material-symbols-outlined text-[17px] text-gray-300 shrink-0">
            {icon}
          </span>
        ) : (
          <img
            src={appLogo}
            alt="IADonkey"
            className="w-4 h-4 object-contain shrink-0"
          />
        )}
        <span className="text-xs font-semibold text-gray-300 tracking-wide truncate">
          {title}
        </span>
        {subtitle && (
          <span className="text-[11px] text-gray-500 font-mono hidden sm:inline-block truncate">
            {subtitle}
          </span>
        )}
      </div>

      {/* Right: Window Controls */}
      <div
        className="flex items-center gap-1 shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {allowMinimize && (
          <button
            type="button"
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
            title="Minimalizovat"
          >
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
        )}
        {allowMaximize && (
          <button
            type="button"
            onClick={handleMaximize}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
            title={isMaximized ? 'Obnovit velikost' : 'Maximalizovat'}
          >
            <span className="material-symbols-outlined text-xs">
              {isMaximized ? 'filter_none' : 'crop_square'}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-rose-600 text-gray-400 hover:text-white transition cursor-pointer"
          title="Zavřít"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </header>
  );
};
