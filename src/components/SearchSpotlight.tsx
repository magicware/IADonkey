import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LauncherItem, SyncProgress } from '../types';
import { MaterialIcon } from './MaterialIcon';
import { evaluateExpression } from '../utils/calculator';
import { detectUrl } from '../utils/urlHelper';
import { detectMlogTicket } from '../utils/mlog';
import { detectEmail } from '../utils/gmail';

interface SearchSpotlightProps {
  items: LauncherItem[];
  mlogBaseUrl?: string;
  onOpenSettings: () => void;
  onRefreshData: () => void;
  isSyncing?: boolean;
  syncProgress?: SyncProgress | null;
  lastSyncTime?: string | null;
}

export const SearchSpotlight: React.FC<SearchSpotlightProps> = ({
  items,
  mlogBaseUrl,
  onOpenSettings,
  onRefreshData,
  isSyncing = false,
  syncProgress,
  lastSyncTime,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [parentItem, setParentItem] = useState<LauncherItem | null>(null);
  const [savedQueryBeforeSubitems, setSavedQueryBeforeSubitems] = useState<string>('');
  const [savedIndexBeforeSubitems, setSavedIndexBeforeSubitems] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when component mounts, window gains focus or is shown
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsRevealed(true);
      inputRef.current?.focus();
    });
    const handleFocus = () => {
      inputRef.current?.focus();
    };
    window.addEventListener('focus', handleFocus);

    const cleanupShown = window.electronAPI?.onWindowShown?.(() => {
      requestAnimationFrame(() => {
        setIsRevealed(true);
      });
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    const cleanupHide = window.electronAPI?.onWindowHideRequest?.(() => {
      setIsRevealed(false);
      setParentItem(null);
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      cleanupShown?.();
      cleanupHide?.();
    };
  }, []);

  // Enter subitems mode
  const enterSubitems = (item: LauncherItem) => {
    if (!item.options || item.options.length === 0) return;
    setSavedQueryBeforeSubitems(query);
    setSavedIndexBeforeSubitems(selectedIndex);
    setParentItem(item);
    setQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus();
  };

  // Return from subitems mode back to previous main level
  const exitSubitems = () => {
    setParentItem(null);
    setQuery(savedQueryBeforeSubitems);
    setSelectedIndex(savedIndexBeforeSubitems);
    inputRef.current?.focus();
  };

  // Filter and prioritize results (or display parentItem.options if in subitems mode)
  const results = useMemo(() => {
    const trimmed = query.trim();

    // 1. If currently browsing subitems of a parent item
    if (parentItem) {
      const subitems = parentItem.options || [];
      if (!trimmed) {
        return subitems;
      }
      const lower = trimmed.toLowerCase();
      return subitems.filter(
        (it) =>
          it.name?.toLowerCase().includes(lower) ||
          (it.location && it.location.toLowerCase().includes(lower))
      );
    }

    // 2. Normal main mode
    const list: LauncherItem[] = [];

    // 0. MLog ticket engine (priority -2, active only if mlogBaseUrl is configured)
    const mlogItem = detectMlogTicket(trimmed, mlogBaseUrl);
    if (mlogItem) {
      list.push(mlogItem);
    }

    // 0b. Standalone Email -> Gmail compose engine (priority -1.5)
    const emailItem = detectEmail(trimmed);
    if (emailItem) {
      list.push(emailItem);
    }

    // 1. Calculator engine (priority -1)
    const calcItem = evaluateExpression(trimmed);
    if (calcItem) {
      list.push(calcItem);
    }

    // 2. Data items from JSON / API (min 2 characters or if query empty, wait until 2 chars)
    if (trimmed.length >= 2) {
      const lower = trimmed.toLowerCase();
      const matched = items.filter((item) => {
        const nameMatch = item.name?.toLowerCase().includes(lower);
        const locMatch = item.location ? item.location.toLowerCase().includes(lower) : false;
        return nameMatch || locMatch;
      });

      // Sort according to priority ascending (smaller number = higher priority, default 0)
      matched.sort((a, b) => {
        const pA = a.priority ?? 0;
        const pB = b.priority ?? 0;
        if (pA !== pB) return pA - pB;

        // Sub-sort: exact start match comes first
        const aStarts = a.name.toLowerCase().startsWith(lower);
        const bStarts = b.name.toLowerCase().startsWith(lower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.name.localeCompare(b.name);
      });

      list.push(...matched);
    }

    // 3. URL match (priority 999)
    const urlItem = detectUrl(trimmed);
    if (urlItem) {
      // Don't duplicate if already in matched list
      const alreadyHasSameLocation = list.some(
        (i) => i.location?.toLowerCase() === urlItem.location?.toLowerCase()
      );
      if (!alreadyHasSameLocation) {
        list.push(urlItem);
      }
    }

    return list;
  }, [query, items, parentItem]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Smooth close helper - fades out in CSS before hiding native window
  const handleClose = () => {
    setIsRevealed(false);
    setTimeout(() => {
      setParentItem(null);
      window.electronAPI?.hideWindow?.();
    }, 90);
  };

  // Execute selected item
  const handleExecute = async (item: LauncherItem) => {
    if (!item) return;

    if (item.action === 'copy') {
      try {
        await navigator.clipboard.writeText(item.name);
      } catch (err) {
        console.error('Clipboard copy error:', err);
      }
      handleClose();
      return;
    }

    // Default action is 'open'
    const target = item.location || item.name;
    if (target) {
      const trimmed = target.trim();
      const isUrl = /^https?:\/\//i.test(trimmed) || /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/i.test(trimmed);

      if (window.electronAPI) {
        try {
          await window.electronAPI.executeAction({
            action: item.action || 'open',
            location: trimmed,
            settings: item.settings,
          });
        } catch (err) {
          console.error('Failed to execute action via electronAPI:', err);
        }
      } else if (isUrl) {
        const fullUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        window.open(fullUrl, '_blank');
      }
    }

    handleClose();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        results.length > 0 ? (prev - 1 + results.length) % results.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentItem = results[selectedIndex];
      if (!currentItem) return;

      // 1. Shift + Enter -> Enter subitems navigation
      if (e.shiftKey) {
        if (currentItem.options && currentItem.options.length > 0) {
          enterSubitems(currentItem);
          return;
        }
      }

      // 2. Ctrl + Enter -> Directly execute 1st subitem without entering subitems
      if (e.ctrlKey) {
        if (currentItem.options && currentItem.options.length > 0) {
          handleExecute(currentItem.options[0]);
          return;
        }
      }

      // Default Enter -> Execute selected item
      handleExecute(currentItem);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (parentItem) {
        exitSubitems();
      } else {
        handleClose();
      }
    }
  };

  return (
    <div
      className={`w-full flex flex-col bg-[#1c1d24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-gray-100 spotlight-card ${
        isRevealed ? 'revealed' : ''
      }`}
    >
      {/* Top Search Input Bar */}
      <div
        className={`flex items-center px-4 py-3.5 gap-3 bg-white/[0.02] ${
          results.length > 0 || parentItem ? 'border-b border-white/10' : ''
        }`}
      >
        <span className="material-symbols-outlined text-indigo-400 select-none text-2xl">
          {parentItem ? 'subdirectory_arrow_right' : 'search'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            parentItem
              ? `Hledat v podpoložkách „${parentItem.name}“...`
              : "Hledejte (min. 2 znaky), zadejte výpočet nebo URL..."
          }
          className="flex-1 bg-transparent text-lg text-white placeholder-gray-400 outline-none font-medium tracking-wide"
          autoFocus
          spellCheck={false}
        />
        {query.length > 0 && (
          <button
            onClick={() => setQuery('')}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            title="Vymazat"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}

        <div className="h-5 w-[1px] bg-white/15 mx-1" />

        <button
          onClick={onRefreshData}
          disabled={isSyncing}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center disabled:opacity-50"
          title={`Znovu načíst data (${lastSyncTime ? `Naposledy: ${lastSyncTime}` : 'Zatím neproběhla'})`}
        >
          <span className={`material-symbols-outlined text-xl ${isSyncing ? 'animate-spin text-indigo-400' : ''}`}>
            sync
          </span>
        </button>

        <button
          onClick={() => {
            setIsRevealed(false);
            window.electronAPI?.openSettingsWindow?.();
            setTimeout(() => {
              window.electronAPI?.hideWindow?.();
            }, 90);
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          title="Otevřít nastavení v samostatném okně"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>
      </div>

      {/* Sync Progress Bar */}
      {syncProgress && !syncProgress.isComplete && (
        <div className="w-full h-1 bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-200"
            style={{ width: `${syncProgress.percentage}%` }}
          />
        </div>
      )}

      {/* Subitems Parent Back Navigation Banner */}
      {parentItem && (
        <div
          onClick={exitSubitems}
          className="flex items-center justify-between px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/20 text-xs text-indigo-300 hover:bg-indigo-900/40 cursor-pointer transition select-none"
          title="Klikněte pro návrat zpět (Esc)"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-indigo-400">arrow_back</span>
            <span>Podpoložky položky: <strong className="text-white font-semibold">{parentItem.name}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300">Esc</kbd>
            <span>Zpět</span>
          </div>
        </div>
      )}

      {/* Results List & Footer (only displayed when results.length > 0) */}
      {results.length > 0 && (
        <>
          <div
            ref={listRef}
            className="max-h-[430px] overflow-y-auto divide-y divide-white/[0.04] p-1.5 focus:outline-none"
          >
            {results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const hasOptions = Array.isArray(item.options) && item.options.length > 0;
              return (
                <div
                  key={item.id || `${item.name}-${idx}`}
                  data-selected={isSelected}
                  onClick={() => handleExecute(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 gap-3.5 ${
                    isSelected
                      ? 'bg-indigo-600/30 border border-indigo-500/40 text-white shadow-md'
                      : 'hover:bg-white/[0.05] text-gray-200 border border-transparent'
                  }`}
                >
                  {/* Column 1: Icon or Image */}
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-black/20 border border-white/5 overflow-hidden">
                    <MaterialIcon
                      icon={item.icon}
                      image={item.image}
                      fallbackIcon={item.priority === -1.5 ? 'mail' : item.priority === -1 ? 'calculate' : item.priority === -2 ? 'support_agent' : 'code'}
                      className="w-7 h-7"
                    />
                  </div>

                  {/* Column 2: Name <br> Location */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate leading-tight">
                        {item.name}
                      </span>
                      {item.priority === -1.5 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                          Gmail
                        </span>
                      )}
                      {item.priority === -2 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                          MLog
                        </span>
                      )}
                      {item.priority === -1 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                          Kalkulačka
                        </span>
                      )}
                      {item.settings === 'magicgate' && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          MagicGate
                        </span>
                      )}
                      {hasOptions && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            enterSubitems(item);
                          }}
                          title={`Zobrazit ${item.options!.length} podpoložek`}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/30 text-indigo-300 transition cursor-pointer"
                        >
                          {item.options!.length}
                        </button>
                      )}
                    </div>
                    {item.location && (
                      <span className="text-xs text-gray-400 truncate mt-0.5 font-mono">
                        {item.location}
                      </span>
                    )}
                  </div>

                  {/* Action icon on selection */}
                  {isSelected && (
                    <div className="flex-shrink-0 text-xs text-indigo-300 flex items-center gap-1.5 opacity-80">
                      <span>{item.action === 'copy' ? 'Kopírovat' : 'Otevřít'}</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer bar */}
          <div className="px-4 py-2 bg-black/30 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
            <div className="flex items-center gap-2">
              {parentItem && (
                <button
                  type="button"
                  onClick={exitSubitems}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Zpět na hlavní výběr</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {lastSyncTime && (
                <span className="text-gray-400 font-mono">Sync: {lastSyncTime}</span>
              )}
              <span>
                {parentItem ? `${results.length} podpoložek` : `${items.length} položek v mezipaměti`}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
