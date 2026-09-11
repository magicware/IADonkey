import React, { useState, useMemo, useEffect } from 'react';
import { LauncherItem, DataSource } from '../types';
import { MaterialIcon } from './MaterialIcon';
import { getDynamicSnippets } from '../utils/snippets';
import { removeDiacritics } from '../utils/text';

interface SearchItemsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LauncherItem[];
  sources?: DataSource[];
  snippetsConfig?: { signature?: string };
}

export const SearchItemsViewerModal: React.FC<SearchItemsViewerModalProps> = ({
  isOpen,
  onClose,
  items,
  sources = [],
  snippetsConfig,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Copy location helper
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  // Open external location helper
  const handleOpen = (location?: string | null) => {
    if (!location) return;
    if (window.electronAPI?.openExternal && /^https?:\/\//i.test(location)) {
      window.electronAPI.openExternal(location);
    } else if (window.electronAPI?.openPath) {
      window.electronAPI.openPath(location);
    } else {
      window.open(location, '_blank');
    }
  };

  // Resolve source display name
  const getSourceName = (item: LauncherItem): string => {
    if (item.settings === 'magicgate') return 'MagicGate';
    if (item.priority === 99 || item.sourceId === 'apps') return 'Aplikace';
    if (item.sourceId === 'snippet') return 'Snippet';
    if (item.sourceId?.startsWith('engine-')) return 'Vyhledávač';
    if (item.sourceId) {
      const matched = sources.find((s) => s.id === item.sourceId);
      if (matched) return matched.name;
    }
    return item.sourceId || 'Zdroje';
  };

  const isUrlOrPath = (str?: string | null) => {
    if (!str) return false;
    return /^https?:\/\//i.test(str) || /^[a-zA-Z]:[\\\/]/i.test(str);
  };

  // Combine all launcher items with dynamic system snippets
  const allCombinedItems = useMemo(() => {
    const dynamicSnippets = getDynamicSnippets(':', snippetsConfig);
    return [...dynamicSnippets, ...items];
  }, [items, snippetsConfig]);

  // Sort items primarily by priority ascending (same as Spotlight) then alphabetically by name
  const sortedItems = useMemo(() => {
    const list = [...allCombinedItems];
    list.sort((a, b) => {
      const pA = a.priority ?? 0;
      const pB = b.priority ?? 0;
      if (pA !== pB) return pA - pB;
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  }, [allCombinedItems]);

  // Filter items and subitems based on search query
  const filteredData = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) {
      return sortedItems.map((item) => ({
        item,
        subitems: item.options
          ? [...item.options].sort((a, b) => {
              const pA = a.priority ?? 0;
              const pB = b.priority ?? 0;
              if (pA !== pB) return pA - pB;
              return (a.name || '').localeCompare(b.name || '');
            })
          : [],
      }));
    }

    const normQ = removeDiacritics(q);
    const results: { item: LauncherItem; subitems: LauncherItem[] }[] = [];

    for (const item of sortedItems) {
      const itemNameMatch = removeDiacritics(item.name?.toLowerCase() || '').includes(normQ);
      const itemLocMatch = item.location ? removeDiacritics(item.location.toLowerCase()).includes(normQ) : false;
      const itemActionMatch = item.action ? item.action.toLowerCase().includes(q) : false;
      const itemSourceMatch = item.sourceId ? item.sourceId.toLowerCase().includes(q) : false;
      const itemShortcutMatch = item.shortcuts?.some((sc) => removeDiacritics(sc.toLowerCase()).includes(normQ));
      const isParentMatch = itemNameMatch || itemLocMatch || itemActionMatch || itemSourceMatch || Boolean(itemShortcutMatch);

      const matchedSubitems = (item.options || []).filter((sub) => {
        const subName = removeDiacritics(sub.name?.toLowerCase() || '').includes(normQ);
        const subLoc = sub.location ? removeDiacritics(sub.location.toLowerCase()).includes(normQ) : false;
        const subAction = sub.action ? sub.action.toLowerCase().includes(q) : false;
        return subName || subLoc || subAction;
      });

      if (isParentMatch || matchedSubitems.length > 0) {
        // If parent matched, show all its subitems (or only matched ones if filter active)
        const subList = isParentMatch ? item.options || [] : matchedSubitems;
        const sortedSubs = [...subList].sort((a, b) => {
          const pA = a.priority ?? 0;
          const pB = b.priority ?? 0;
          if (pA !== pB) return pA - pB;
          return (a.name || '').localeCompare(b.name || '');
        });

        results.push({
          item,
          subitems: sortedSubs,
        });
      }
    }

    return results;
  }, [sortedItems, filterQuery]);

  // Counts calculation
  const totalSnippetCount = useMemo(() => {
    return allCombinedItems.filter((it) => it.sourceId === 'snippet').length;
  }, [allCombinedItems]);

  const totalMainOnlyCount = useMemo(() => {
    return allCombinedItems.filter((it) => it.sourceId !== 'snippet').length;
  }, [allCombinedItems]);

  const totalSubCount = useMemo(() => {
    return allCombinedItems.reduce((acc, it) => acc + (it.options?.length || 0), 0);
  }, [allCombinedItems]);

  const filteredSnippetCount = useMemo(() => {
    return filteredData.filter((d) => d.item.sourceId === 'snippet').length;
  }, [filteredData]);

  const filteredMainOnlyCount = useMemo(() => {
    return filteredData.filter((d) => d.item.sourceId !== 'snippet').length;
  }, [filteredData]);

  const filteredSubCount = useMemo(() => {
    return filteredData.reduce((acc, it) => acc + it.subitems.length, 0);
  }, [filteredData]);

  const totalIndexedAll = totalMainOnlyCount + totalSnippetCount + totalSubCount;
  const filteredIndexedAll = filteredMainOnlyCount + filteredSnippetCount + filteredSubCount;

  // Toggle collapse state for an item
  const toggleCollapse = (id: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const areAllCollapsed = useMemo(() => {
    const parentIds = filteredData.filter((d) => d.subitems.length > 0).map((d) => d.item.id || d.item.name);
    return parentIds.length > 0 && parentIds.every((id) => collapsedItems.has(id));
  }, [filteredData, collapsedItems]);

  const toggleAllCollapse = () => {
    if (areAllCollapsed) {
      setCollapsedItems(new Set());
    } else {
      const allParentIds = filteredData.filter((d) => d.subitems.length > 0).map((d) => d.item.id || d.item.name);
      setCollapsedItems(new Set(allParentIds));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#181920] border border-white/10 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-gray-200">
        {/* Header */}
        <header className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-[#1e1f29] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <span className="material-symbols-outlined text-2xl">format_list_bulleted</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Položky ve vyhledávání
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                    {filterQuery ? `${filteredMainOnlyCount} z ${totalMainOnlyCount}` : totalMainOnlyCount} hlavních
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-500/15 text-teal-300 border border-teal-500/25">
                    {filterQuery ? `${filteredSnippetCount} z ${totalSnippetCount}` : totalSnippetCount} snippetů
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/25">
                    {filterQuery ? `${filteredSubCount} z ${totalSubCount}` : totalSubCount} podpoložek
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    {filterQuery ? `${filteredIndexedAll} celkem` : `${totalIndexedAll} celkem`}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                Kompletní přehled všech načtených položek řazených dle priority (shodně s vyhledávačem Spotlight).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            title="Zavřít okno (Esc)"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </header>

        {/* Filter Toolbar */}
        <div className="p-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrovat v názvech, odkazech, akcích či zdrojích..."
              className="w-full bg-[#121318] border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-[13px] text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/60 transition"
              autoFocus
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded transition"
                title="Vymazat filtr"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {filteredSubCount > 0 && (
            <button
              onClick={toggleAllCollapse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium transition cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-sm">
                {areAllCollapsed ? 'unfold_more' : 'unfold_less'}
              </span>
              <span>{areAllCollapsed ? 'Rozbalit všechny podpoložky' : 'Sbalit všechny podpoložky'}</span>
            </button>
          )}
        </div>

        {/* Table Column Headers (Sticky) */}
        <div className="grid grid-cols-[70px_44px_1.5fr_2fr_80px_110px_64px] items-center px-4 py-2 bg-[#14151b] border-b border-white/10 text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">
          <div className="text-center">Priorita</div>
          <div className="text-center">Ikona</div>
          <div>Název položky</div>
          <div>Cíl / URL (Location)</div>
          <div className="text-center">Akce</div>
          <div>Zdroj</div>
          <div className="text-right">Možnosti</div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {filteredData.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <span className="material-symbols-outlined text-4xl text-gray-500">search_off</span>
              <p className="text-sm font-medium text-gray-300">
                {filterQuery ? `Žádné položky neodpovídají výrazu "${filterQuery}"` : 'Žádné položky nebyly načteny'}
              </p>
              <p className="text-xs text-gray-500">
                {filterQuery ? 'Zkuste zadat jiný hledaný výraz.' : 'Zkontrolujte konfiguraci zdrojů dat v nastavení.'}
              </p>
            </div>
          ) : (
            filteredData.map(({ item, subitems }, idx) => {
              const itemKey = item.id || `${item.name}-${idx}`;
              const hasSubitems = subitems.length > 0;
              const isCollapsed = collapsedItems.has(itemKey);
              const isCopied = copiedKey === itemKey;

              return (
                <div key={itemKey} className="group transition-colors hover:bg-white/[0.02]">
                  {/* Main Item Row */}
                  <div className="grid grid-cols-[70px_44px_1.5fr_2fr_80px_110px_64px] items-center px-4 py-2 gap-2 text-[13px]">
                    {/* Column 1: Priority */}
                    <div className="flex justify-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold select-none border ${
                          (item.priority ?? 0) < 0
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : (item.priority ?? 0) === 0
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : (item.priority ?? 0) === 99
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        }`}
                        title={`Priorita: ${item.priority ?? 0}`}
                      >
                        {item.priority ?? 0}
                      </span>
                    </div>

                    {/* Column 2: Icon or Favicon */}
                    <div className="flex items-center justify-center">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center overflow-hidden">
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
                          className="w-5 h-5 flex items-center justify-center"
                          size={16}
                        />
                      </div>
                    </div>

                    {/* Column 3: Name & Tags */}
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-white truncate text-[13px]" title={item.name}>
                          {item.name}
                        </span>

                        {hasSubitems && (
                          <button
                            onClick={() => toggleCollapse(itemKey)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition cursor-pointer select-none"
                            title={isCollapsed ? 'Rozbalit podpoložky' : 'Sbalit podpoložky'}
                          >
                            <span>{subitems.length} {subitems.length === 1 ? 'podpoložka' : subitems.length < 5 ? 'podpoložky' : 'podpoložek'}</span>
                            <span className="material-symbols-outlined text-[13px] leading-none">
                              {isCollapsed ? 'expand_more' : 'expand_less'}
                            </span>
                          </button>
                        )}

                        {item.settings === 'magicgate' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 select-none">
                            MagicGate
                          </span>
                        )}

                        {item.shortcuts && item.shortcuts.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.shortcuts.map((sc) => (
                              <span
                                key={sc}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-teal-500/15 text-teal-300 border border-teal-500/25 select-none"
                              >
                                {sc}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 4: Location / URL */}
                    <div className="min-w-0 pr-2">
                      {item.location ? (
                        <div
                          onClick={() => handleCopy(item.location!, itemKey)}
                          className="font-mono text-xs text-gray-400 hover:text-indigo-300 truncate cursor-pointer transition select-all"
                          title={`Kliknutím zkopírovat: ${item.location}`}
                        >
                          {item.location}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs italic">-</span>
                      )}
                    </div>

                    {/* Column 5: Action */}
                    <div className="flex justify-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-white/5 text-gray-300 border border-white/10 uppercase">
                        {item.action || 'open'}
                      </span>
                    </div>

                    {/* Column 6: Source */}
                    <div className="truncate text-xs text-gray-400 font-medium" title={getSourceName(item)}>
                      {getSourceName(item)}
                    </div>

                    {/* Column 7: Quick Actions */}
                    <div className="flex items-center justify-end gap-1">
                      {item.location && (
                        <>
                          <button
                            onClick={() => handleCopy(item.location!, itemKey)}
                            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                            title={isCopied ? 'Zkopírováno!' : 'Zkopírovat do schránky'}
                          >
                            <span className={`material-symbols-outlined text-[16px] ${isCopied ? 'text-emerald-400' : ''}`}>
                              {isCopied ? 'check' : 'content_copy'}
                            </span>
                          </button>
                          {isUrlOrPath(item.location) && (
                            <button
                              onClick={() => handleOpen(item.location)}
                              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                              title="Otevřít odkaz"
                            >
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Subitems (Options) Indented List */}
                  {hasSubitems && !isCollapsed && (
                    <div className="bg-white/[0.015] border-t border-white/[0.03] divide-y divide-white/[0.02]">
                      {subitems.map((sub, sIdx) => {
                        const subKey = `${itemKey}-sub-${sIdx}`;
                        const isSubCopied = copiedKey === subKey;

                        return (
                          <div
                            key={subKey}
                            className="grid grid-cols-[70px_44px_1.5fr_2fr_80px_110px_64px] items-center px-4 py-1.5 gap-2 text-[12px] hover:bg-white/[0.03] transition-colors"
                          >
                            {/* Column 1: Priority */}
                            <div className="flex justify-center items-center gap-1 pl-4">
                              <span className="text-gray-500 font-mono text-xs select-none">└─</span>
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-mono text-gray-400 bg-white/5 border border-white/5 select-none"
                                title={`Priorita podpoložky: ${sub.priority ?? item.priority ?? 0}`}
                              >
                                {sub.priority ?? item.priority ?? 0}
                              </span>
                            </div>

                            {/* Column 2: Subitem Icon / Favicon */}
                            <div className="flex items-center justify-center">
                              <div className="w-6 h-6 rounded bg-white/[0.03] border border-white/5 flex items-center justify-center overflow-hidden">
                                <MaterialIcon
                                  icon={sub.icon}
                                  image={sub.image}
                                  location={sub.location}
                                  fallbackIcon="public"
                                  className="w-4 h-4 flex items-center justify-center"
                                  size={13}
                                />
                              </div>
                            </div>

                            {/* Column 3: Subitem Name & Chip */}
                            <div className="min-w-0 pr-2 pl-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-300 truncate text-[12px]" title={sub.name}>
                                  {sub.name}
                                </span>
                                <span className="px-1 py-0.2 rounded text-[9px] font-mono text-gray-400 bg-white/5 border border-white/10 select-none">
                                  Podpoložka
                                </span>
                              </div>
                            </div>

                            {/* Column 4: Subitem Location */}
                            <div className="min-w-0 pr-2">
                              {sub.location ? (
                                <div
                                  onClick={() => handleCopy(sub.location!, subKey)}
                                  className="font-mono text-[11px] text-gray-400 hover:text-indigo-300 truncate cursor-pointer transition select-all"
                                  title={`Kliknutím zkopírovat: ${sub.location}`}
                                >
                                  {sub.location}
                                </div>
                              ) : (
                                <span className="text-gray-600 text-xs italic">-</span>
                              )}
                            </div>

                            {/* Column 5: Subitem Action */}
                            <div className="flex justify-center">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-gray-400 bg-white/5 border border-white/5 uppercase">
                                {sub.action || item.action || 'open'}
                              </span>
                            </div>

                            {/* Column 6: Source label */}
                            <div className="truncate text-[11px] text-gray-500 italic">
                              podpoložka
                            </div>

                            {/* Column 7: Quick Actions */}
                            <div className="flex items-center justify-end gap-1">
                              {sub.location && (
                                <>
                                  <button
                                    onClick={() => handleCopy(sub.location!, subKey)}
                                    className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition cursor-pointer"
                                    title={isSubCopied ? 'Zkopírováno!' : 'Zkopírovat odkaz'}
                                  >
                                    <span className={`material-symbols-outlined text-[15px] ${isSubCopied ? 'text-emerald-400' : ''}`}>
                                      {isSubCopied ? 'check' : 'content_copy'}
                                    </span>
                                  </button>
                                  {isUrlOrPath(sub.location) && (
                                    <button
                                      onClick={() => handleOpen(sub.location)}
                                      className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition cursor-pointer"
                                      title="Otevřít odkaz"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <footer className="px-4 py-2.5 bg-[#14151b] border-t border-white/10 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-indigo-400">info</span>
            <span>Pořadí položek odpovídá přesně prioritě zobrazení výsledků ve Spotlight vyhledávání.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition cursor-pointer"
          >
            Zavřít
          </button>
        </footer>
      </div>
    </div>
  );
};
