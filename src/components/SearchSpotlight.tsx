import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LauncherItem, SyncProgress } from '../types';
import { MaterialIcon } from './MaterialIcon';
import { evaluateExpression } from '../utils/calculator';
import { detectUrl } from '../utils/urlHelper';
import { detectMlogTicket } from '../utils/mlog';
import { detectEmail } from '../utils/gmail';
import { getDynamicSnippets } from '../utils/snippets';
import { formatLastSyncDate } from '../utils/dateHelper';
import { SEARCH_ENGINES } from '../constants/searchEngines';
import { removeDiacritics } from '../utils/text';

interface SearchSpotlightProps {
  items: LauncherItem[];
  mlogBaseUrl?: string;
  searchGoogle?: boolean;
  defaultSearchEngine?: string;
  onOpenSettings: () => void;
  onRefreshData: () => void;
  isSyncing?: boolean;
  syncProgress?: SyncProgress | null;
  lastSyncTime?: string | null;
  snippets?: { signature?: string };
}

export const SearchSpotlight: React.FC<SearchSpotlightProps> = ({
  items,
  mlogBaseUrl,
  searchGoogle = true,
  defaultSearchEngine,
  onOpenSettings,
  onRefreshData,
  isSyncing = false,
  syncProgress,
  lastSyncTime,
  snippets,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [parentItem, setParentItem] = useState<LauncherItem | null>(null);
  const [savedQueryBeforeSubitems, setSavedQueryBeforeSubitems] = useState<string>('');
  const [savedIndexBeforeSubitems, setSavedIndexBeforeSubitems] = useState<number>(0);
  const [engineFavicons, setEngineFavicons] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load and listen for search engine metadata favicons
  useEffect(() => {
    if (window.electronAPI?.getSearchEngineFavicons) {
      window.electronAPI.getSearchEngineFavicons().then((favs) => {
        if (favs) setEngineFavicons(favs);
      });
    }

    const unsubFavicons = window.electronAPI?.onSearchEngineFaviconsUpdated?.((favs) => {
      if (favs) setEngineFavicons(favs);
    });

    const handleFocus = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    const unsubFocus = window.electronAPI?.onFocusInput?.(handleFocus);
    window.addEventListener('focus-search-input', handleFocus);

    return () => {
      unsubFavicons?.();
      unsubFocus?.();
      window.removeEventListener('focus-search-input', handleFocus);
    };
  }, []);

  // Sync icon rotation & smooth check status animation
  const [syncStatus, setSyncStatus] = useState<'idle' | 'spinning' | 'success'>('idle');
  const shouldStopSpinRef = useRef(false);

  useEffect(() => {
    if (isSyncing) {
      shouldStopSpinRef.current = false;
      setSyncStatus('spinning');
    } else {
      if (syncStatus === 'spinning') {
        shouldStopSpinRef.current = true;
      }
    }
  }, [isSyncing, syncStatus]);

  const handleSyncAnimationIteration = () => {
    if (shouldStopSpinRef.current) {
      shouldStopSpinRef.current = false;
      setSyncStatus('success');
    }
  };

  useEffect(() => {
    if (syncStatus === 'spinning' && !isSyncing) {
      const fallback = setTimeout(() => {
        setSyncStatus('success');
      }, 2500);
      return () => clearTimeout(fallback);
    }
  }, [syncStatus, isSyncing]);

  useEffect(() => {
    if (syncStatus === 'success') {
      const timer = setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);
  // Modifier keys state (Shift, Ctrl, Alt)
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [isCtrlDown, setIsCtrlDown] = useState(false);
  const [isAltDown, setIsAltDown] = useState(false);

  useEffect(() => {
    const handleModifierKeys = (e: KeyboardEvent) => {
      setIsShiftDown(e.shiftKey);
      setIsCtrlDown(e.ctrlKey);
      setIsAltDown(e.altKey);
    };
    const handleBlur = () => {
      setIsShiftDown(false);
      setIsCtrlDown(false);
      setIsAltDown(false);
    };

    window.addEventListener('keydown', handleModifierKeys);
    window.addEventListener('keyup', handleModifierKeys);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleModifierKeys);
      window.removeEventListener('keyup', handleModifierKeys);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

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
      const normQuery = removeDiacritics(trimmed).toLowerCase();
      return subitems.filter((it) => {
        const nameNorm = removeDiacritics(it.name).toLowerCase();
        const locNorm = removeDiacritics(it.location).toLowerCase();
        return nameNorm.includes(normQuery) || locNorm.includes(normQuery);
      });
    }

    // 2. Normal main mode
    const list: LauncherItem[] = [];

    // Special snippet prefix: ":" (e.g. :today, :time, :guid, :iban)
    // Snippets are ONLY shown when query starts with a colon
    if (trimmed.startsWith(':')) {
      const dynamicSnippets = getDynamicSnippets(trimmed, snippets);
      const normQuery = removeDiacritics(trimmed).toLowerCase();
      // Also find any custom items configured with name starting with ':'
      const customSnippets = items.filter((item) => {
        if (item.name?.startsWith(':')) {
          const nameNorm = removeDiacritics(item.name).toLowerCase();
          const locNorm = removeDiacritics(item.location).toLowerCase();
          return nameNorm.includes(normQuery) || locNorm.includes(normQuery);
        }
        return false;
      });
      return [...dynamicSnippets, ...customSnippets];
    }

    // Prefix search across all registered SEARCH_ENGINES (e.g. g:, google:, s:, seznam:, w:, wiki:, ...)
    for (const engine of SEARCH_ENGINES) {
      const prefixPattern = new RegExp(`^(?:${engine.prefixes.join('|')}):\\s*(.*)$`, 'i');
      const prefixMatch = trimmed.match(prefixPattern);
      if (prefixMatch) {
        const targetQuery = prefixMatch[1].trim();
        const iconImage = engineFavicons[engine.id] || engine.defaultFaviconUrl;
        list.push({
          id: `${engine.id}-search-direct`,
          name: targetQuery ? `Hledat na ${engine.name}: "${targetQuery}"` : `Hledat na ${engine.name}...`,
          location: targetQuery
            ? engine.searchUrlTemplate.replace('{query}', encodeURIComponent(targetQuery))
            : engine.baseUrl,
          action: 'open',
          icon: engine.fallbackIcon,
          image: iconImage,
          priority: 100,
          sourceId: `engine-${engine.id}`,
        });
        return list;
      }
    }

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
      const normQuery = removeDiacritics(trimmed).toLowerCase();
      const matched = items.filter((item) => {
        // Exclude items starting with ':' from normal search (require leading colon)
        if (item.name?.startsWith(':')) {
          return false;
        }
        const itemNameNorm = removeDiacritics(item.name).toLowerCase();
        const itemLocNorm = removeDiacritics(item.location).toLowerCase();

        const nameMatch = itemNameNorm.includes(normQuery);
        const locMatch = itemLocNorm.includes(normQuery);
        const optionsMatch = item.options?.some((opt) => {
          const optNameNorm = removeDiacritics(opt.name).toLowerCase();
          const optLocNorm = removeDiacritics(opt.location).toLowerCase();
          return optNameNorm.includes(normQuery) || optLocNorm.includes(normQuery);
        });
        return nameMatch || locMatch || Boolean(optionsMatch);
      });

      // Sort according to priority ascending (smaller number = higher priority, default 0)
      matched.sort((a, b) => {
        const pA = a.priority ?? 0;
        const pB = b.priority ?? 0;
        if (pA !== pB) return pA - pB;

        const aNorm = removeDiacritics(a.name).toLowerCase();
        const bNorm = removeDiacritics(b.name).toLowerCase();

        // Sub-sort: exact start match comes first
        const aStarts = aNorm.startsWith(normQuery);
        const bStarts = bNorm.startsWith(normQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Sub-sort: word boundary match (e.g. "Adobe XD" when searching "xd", "Příkazový řádek" when searching "rad")
        const aWordStarts = aNorm.split(/[\s\-_\/]+/).some((w) => w.startsWith(normQuery));
        const bWordStarts = bNorm.split(/[\s\-_\/]+/).some((w) => w.startsWith(normQuery));
        if (aWordStarts && !bWordStarts) return -1;
        if (!aWordStarts && bWordStarts) return 1;

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

    // 4. Default search engine item at the end of the list (priority 100)
    const effectiveEngineId = defaultSearchEngine !== undefined
      ? defaultSearchEngine
      : (searchGoogle !== false ? 'google' : 'none');

    if (effectiveEngineId && effectiveEngineId !== 'none' && trimmed.length >= 2 && !calcItem && !emailItem) {
      const chosenEngine = SEARCH_ENGINES.find((e) => e.id === effectiveEngineId);
      if (chosenEngine) {
        const iconImage = engineFavicons[chosenEngine.id] || chosenEngine.defaultFaviconUrl;
        list.push({
          id: `${chosenEngine.id}-search-${trimmed.toLowerCase()}`,
          name: `Hledat na ${chosenEngine.name}: "${trimmed}"`,
          location: chosenEngine.searchUrlTemplate.replace('{query}', encodeURIComponent(trimmed)),
          action: 'open',
          icon: chosenEngine.fallbackIcon,
          image: iconImage,
          priority: 100,
          sourceId: `engine-${chosenEngine.id}`,
        });
      }
    }

    return list;
  }, [query, items, parentItem, searchGoogle, defaultSearchEngine, mlogBaseUrl, engineFavicons]);

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

    if (item.action === 'copy' || item.action === 'paste') {
      const toCopy = item.location || item.name;
      if (window.electronAPI) {
        try {
          await window.electronAPI.executeAction({
            action: 'copy',
            location: toCopy,
            settings: item.settings,
          });
        } catch (err) {
          console.error('Clipboard copy error via electronAPI:', err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(toCopy);
        } catch (err) {
          console.error('Clipboard copy error:', err);
        }
      }
      handleClose();
      return;
    }

    // Default action is 'open'
    const target = item.location || item.name;
    if (target) {
      const trimmed = target.trim();
      const isUrl = /^https?:\/\//i.test(trimmed) || /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/i.test(trimmed);

      // Fetch favicon on execution for items using {favicon} placeholder or web URLs
      if (isUrl && (item.image === '{favicon}' || item.settings === 'magicgate')) {
        const fetchUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        try {
          const origin = new URL(fetchUrl).origin;
          if (!localStorage.getItem(`favicon:${origin}`)) {
            window.electronAPI?.fetchFaviconForUrl?.(fetchUrl).then((dataUrl) => {
              if (dataUrl) {
                try {
                  localStorage.setItem(`favicon:${origin}`, dataUrl);
                  window.dispatchEvent(new CustomEvent('favicon-cached', { detail: { origin, dataUrl } }));
                } catch {
                  // ignore localStorage quota error
                }
              }
            });
          }
        } catch {
          // ignore URL parsing error
        }
      }

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
        }
        return;
      }

      // 2. Ctrl + Enter -> Directly execute 1st subitem
      if (e.ctrlKey) {
        if (currentItem.options && currentItem.options.length > 0) {
          handleExecute(currentItem.options[0]);
        }
        return;
      }

      // 3. Alt + Enter -> Directly execute 2nd subitem
      if (e.altKey) {
        if (currentItem.options && currentItem.options.length > 1) {
          handleExecute(currentItem.options[1]);
        }
        return;
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

  // Click on result item (supporting Shift, Ctrl, and Alt modifiers)
  const handleItemClick = (item: LauncherItem, e: React.MouseEvent) => {
    // 1. Shift + Click -> Enter subitems navigation
    if (e.shiftKey) {
      if (item.options && item.options.length > 0) {
        enterSubitems(item);
      }
      return;
    }

    // 2. Ctrl + Click -> Execute 1st subitem
    if (e.ctrlKey) {
      if (item.options && item.options.length > 0) {
        handleExecute(item.options[0]);
      }
      return;
    }

    // 3. Alt + Click -> Execute 2nd subitem
    if (e.altKey) {
      if (item.options && item.options.length > 1) {
        handleExecute(item.options[1]);
      }
      return;
    }

    // Default Click
    handleExecute(item);
  };

  // Subtitle rendering with live modifier highlighting for subitems
  const renderSubtitle = (item: LauncherItem, isSelected: boolean) => {
    if (parentItem) {
      return <span className="text-gray-400 truncate">{item.location || item.name}</span>;
    }
    if (item.sourceId === 'snippet') {
      return (
        <span className="text-gray-400 truncate">
          {item.location ? item.location.replace(/\r?\n/g, ' ↵ ') : '(podpis zatím nevyplněn v Nastavení)'}
        </span>
      );
    }
    if (item.priority === 99) {
      return <span className="text-gray-400 truncate">Aplikace Windows</span>;
    }

    const sub1 = item.options?.[0];
    const sub2 = item.options?.[1];

    if (!sub1 && !sub2) {
      return <span className="text-gray-400 truncate">{item.location || ''}</span>;
    }

    const isSub1Active = isSelected && isCtrlDown && Boolean(sub1);
    const isSub2Active = isSelected && isAltDown && Boolean(sub2);
    const isMainActive = !isSub1Active && !isSub2Active;

    return (
      <div className="flex items-center gap-1.5 min-w-0 w-full overflow-hidden">
        {item.location && (
          <span
            title={item.location}
            className={`transition-colors duration-150 ${
              isMainActive
                ? `shrink-0 whitespace-nowrap ${isSelected ? 'text-white font-medium' : 'text-gray-300 font-medium'}`
                : 'truncate min-w-0 text-gray-500'
            }`}
          >
            {item.location}
          </span>
        )}

        {sub1 && (
          <>
            <span className="text-gray-600 shrink-0 select-none">|</span>
            <span
              title={`${sub1.name}${sub1.location ? `: ${sub1.location}` : ''}`}
              className={`transition-colors duration-150 ${
                isSub1Active
                  ? `shrink-0 whitespace-nowrap ${isSelected ? 'text-white font-medium' : 'text-gray-300 font-medium'}`
                  : 'truncate min-w-0 text-gray-500'
              }`}
            >
              {sub1.name}{sub1.location ? `: ${sub1.location}` : ''}
            </span>
          </>
        )}

        {sub2 && (
          <>
            <span className="text-gray-600 shrink-0 select-none">|</span>
            <span
              title={`${sub2.name}${sub2.location ? `: ${sub2.location}` : ''}`}
              className={`transition-colors duration-150 ${
                isSub2Active
                  ? `shrink-0 whitespace-nowrap ${isSelected ? 'text-white font-medium' : 'text-gray-300 font-medium'}`
                  : 'truncate min-w-0 text-gray-500'
              }`}
            >
              {sub2.name}{sub2.location ? `: ${sub2.location}` : ''}
            </span>
          </>
        )}
      </div>
    );
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
          className="flex-1 bg-transparent text-lg text-white placeholder-gray-400 placeholder:italic placeholder:font-normal outline-none font-medium tracking-wide"
          autoFocus
          spellCheck={false}
        />
        {query.length > 0 && (
          <button
            onClick={() => setQuery('')}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center cursor-pointer shrink-0"
            title="Vymazat dotaz"
          >
            <span className="material-symbols-outlined text-[19px] leading-none select-none">close</span>
          </button>
        )}

        <div className="h-5 w-[1px] bg-white/15 mx-0.5 shrink-0 self-center" />

        <button
          type="button"
          onClick={onRefreshData}
          disabled={syncStatus !== 'idle'}
          className="relative w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center cursor-pointer disabled:cursor-default shrink-0 self-center"
          title={
            syncStatus === 'success'
              ? 'Synchronizace proběhla úspěšně'
              : `Znovu načíst data (${lastSyncTime ? `Naposledy: ${formatLastSyncDate(lastSyncTime)}` : 'Zatím neproběhla'})`
          }
        >
          {/* Sync icon wrapper */}
          <div
            onAnimationIteration={handleSyncAnimationIteration}
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
              syncStatus === 'spinning'
                ? 'animate-sync-spin text-indigo-400 opacity-100 scale-100'
                : syncStatus === 'success'
                ? 'opacity-0 scale-75 pointer-events-none'
                : 'opacity-100 scale-100 text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] leading-none select-none flex items-center justify-center">
              sync
            </span>
          </div>

          {/* Green check icon wrapper */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 text-emerald-400 ${
              syncStatus === 'success'
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-75 pointer-events-none'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] leading-none select-none flex items-center justify-center">
              check
            </span>
          </div>
        </button>

        <button
          onClick={() => {
            setIsRevealed(false);
            window.electronAPI?.openSettingsWindow?.();
            setTimeout(() => {
              window.electronAPI?.hideWindow?.();
            }, 90);
          }}
          className="w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center cursor-pointer shrink-0"
          title="Otevřít nastavení v samostatném okně"
        >
          <span className="material-symbols-outlined text-[20px] leading-none select-none">settings</span>
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
                  onClick={(e) => handleItemClick(item, e)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 gap-3 ${
                    isSelected
                      ? 'bg-indigo-600/30 border border-indigo-500/40 text-white shadow-md'
                      : 'hover:bg-white/[0.05] text-gray-200 border border-transparent'
                  }`}
                >
                  {/* Column 1: Icon or Image with subitems badge & subtle 1px divider */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 flex items-center justify-center overflow-hidden">
                        <MaterialIcon
                          icon={item.icon}
                          image={item.image}
                          location={item.location}
                          fallbackIcon={
                            item.sourceId === 'snippet'
                              ? 'content_paste'
                              : item.priority === 99
                              ? 'apps'
                              : item.priority === -1.5
                              ? 'mail'
                              : item.priority === -1
                              ? 'calculate'
                              : item.priority === -2
                              ? 'support_agent'
                              : 'code'
                          }
                          className="w-7 h-7"
                        />
                      </div>
                      {hasOptions && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            enterSubitems(item);
                          }}
                          title={`Zobrazit ${item.options!.length} podpoložek`}
                          className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-md cursor-pointer border border-[#1c1d24] transition-transform hover:scale-110 select-none"
                          style={{ backgroundColor: 'var(--color-primary-hex, #6366f1)' }}
                        >
                          {item.options!.length}
                        </div>
                      )}
                    </div>

                    <div className={`h-6 w-[1px] shrink-0 self-center transition-colors ${isSelected ? 'bg-white/20' : 'bg-white/[0.08]'}`} />
                  </div>

                  {/* Column 2: Name <br> Location */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center pl-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate leading-tight">
                        {item.name}
                      </span>
                      {item.sourceId === 'snippet' && item.shortcuts && item.shortcuts.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {item.shortcuts.map((shortcut) => (
                            <span
                              key={shortcut}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/25 font-medium select-none"
                            >
                              {shortcut}
                            </span>
                          ))}
                        </div>
                      ) : item.sourceId === 'snippet' ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-medium">
                          Snippet
                        </span>
                      ) : null}
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
                      {item.priority === 99 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium">
                          Aplikace
                        </span>
                      )}
                      {(() => {
                        if (item.sourceId?.startsWith('engine-')) {
                          const engineId = item.sourceId.replace('engine-', '');
                          const engine = SEARCH_ENGINES.find((e) => e.id === engineId);
                          if (engine) {
                            return (
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${engine.chipClass}`}>
                                {engine.chipLabel}
                              </span>
                            );
                          }
                        }
                        return null;
                      })()}
                      {item.settings === 'magicgate' && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          MagicGate
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5 font-mono flex items-center gap-1.5 flex-nowrap min-w-0 w-full overflow-hidden">
                      {renderSubtitle(item, isSelected)}
                    </div>
                  </div>

                  {/* Action icon on selection */}
                  {isSelected && (
                    <div className="flex-shrink-0 text-xs text-indigo-300 flex items-center gap-1.5 opacity-80">
                      {isShiftDown && hasOptions ? (
                        <>
                          <span>Zobrazit</span>
                          <span className="material-symbols-outlined text-sm">folder</span>
                        </>
                      ) : isCtrlDown && item.options?.[0] ? (
                        <>
                          <span>{item.options[0].action === 'copy' ? 'Kopírovat' : 'Otevřít'}</span>
                          <span className="material-symbols-outlined text-sm">
                            {item.options[0].action === 'copy' ? 'content_copy' : 'arrow_forward'}
                          </span>
                        </>
                      ) : isAltDown && item.options?.[1] ? (
                        <>
                          <span>{item.options[1].action === 'copy' ? 'Kopírovat' : 'Otevřít'}</span>
                          <span className="material-symbols-outlined text-sm">
                            {item.options[1].action === 'copy' ? 'content_copy' : 'arrow_forward'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>{item.action === 'copy' || item.action === 'paste' ? 'Kopírovat' : 'Otevřít'}</span>
                          <span className="material-symbols-outlined text-sm">
                            {item.action === 'copy' || item.action === 'paste' ? 'content_copy' : 'arrow_forward'}
                          </span>
                        </>
                      )}
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
                <span className="text-gray-400 font-mono">Sync: {formatLastSyncDate(lastSyncTime)}</span>
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
