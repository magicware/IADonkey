import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LauncherItem, LauncherAction, SyncProgress, SnippetsConfig, ColorMasterSettings, QuickCapSettings, FastSnapSettings, AppConfig } from '../types';
import { MaterialIcon } from './MaterialIcon';
import { evaluateExpression } from '../utils/calculator';
import { detectUrl } from '../utils/urlHelper';
import { detectMlogTicket } from '../utils/mlog';
import { detectEmail } from '../utils/gmail';
import { getDynamicSnippets } from '../utils/snippets';
import { formatLastSyncDate } from '../utils/dateHelper';
import { SEARCH_ENGINES } from '../constants/searchEngines';
import { removeDiacritics } from '../utils/text';
import {
  parseColorQuery,
  createColorLauncherItem,
  getDonkeyToolsCommands,
  pickScreenColor,
  formatColorValue,
} from '../utils/colorMaster';
import { applyPrimaryColor, applyActionsColor } from '../utils/theme';

interface SearchSpotlightProps {
  items: LauncherItem[];
  mlogBaseUrl?: string;
  mlogTaskPrefix?: string;
  mlogRequestPrefix?: string;
  searchGoogle?: boolean;
  defaultSearchEngine?: string;
  defaultCloneDir?: string;
  vscodeEnabled?: boolean;
  androidStudioEnabled?: boolean;
  donkeyToolsEnabled?: boolean;
  colorMasterConfig?: ColorMasterSettings;
  quickCapConfig?: QuickCapSettings;
  fastSnapConfig?: FastSnapSettings;
  onSaveConfig?: (newConfig: AppConfig) => Promise<void>;
  onOpenSettings: () => void;
  onRefreshData: () => void;
  isSyncing?: boolean;
  syncProgress?: SyncProgress | null;
  lastSyncTime?: string | null;
  snippets?: SnippetsConfig;
}

export const SearchSpotlight: React.FC<SearchSpotlightProps> = ({
  items,
  mlogBaseUrl,
  mlogTaskPrefix,
  mlogRequestPrefix,
  searchGoogle = true,
  defaultSearchEngine = 'google',
  defaultCloneDir,
  vscodeEnabled = false,
  androidStudioEnabled = false,
  donkeyToolsEnabled = false,
  colorMasterConfig,
  quickCapConfig,
  fastSnapConfig,
  onSaveConfig,
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
  const [actionsParentItem, setActionsParentItem] = useState<LauncherItem | null>(null);
  const [selectedActionIndex, setSelectedActionIndex] = useState<number>(0);
  const [infoPage, setInfoPage] = useState<number>(0);
  const [existingClonedRepos, setExistingClonedRepos] = useState<Set<string>>(new Set());
  const [copiedInfoKey, setCopiedInfoKey] = useState<string | null>(null);
  const [savedQueryBeforeSubitems, setSavedQueryBeforeSubitems] = useState<string>('');
  const [savedIndexBeforeSubitems, setSavedIndexBeforeSubitems] = useState<number>(0);
  const restoringIndexRef = useRef<number | null>(null);
  const savedParentItemRef = useRef<LauncherItem | null>(null);
  const [engineFavicons, setEngineFavicons] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [settingsHoldProgress, setSettingsHoldProgress] = useState<number>(0);
  const settingsHoldStartRef = useRef<number>(0);
  const settingsHoldRafRef = useRef<number | null>(null);
  const isLongPressRef = useRef(false);

  const [isDonkeyToolsOpen, setIsDonkeyToolsOpen] = useState(false);
  const donkeyToolsRef = useRef<HTMLDivElement>(null);

  const isColorMasterActive = Boolean(donkeyToolsEnabled && colorMasterConfig?.enabled === true);
  const isQuickCapActive = Boolean(donkeyToolsEnabled && (quickCapConfig?.enabled === true || fastSnapConfig?.enabled === true));
  const showDonkeyToolsIcon = Boolean(donkeyToolsEnabled && (isColorMasterActive || isQuickCapActive));

  // Click outside to close DonkeyTools quick tools menu
  useEffect(() => {
    if (!isDonkeyToolsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (donkeyToolsRef.current && !donkeyToolsRef.current.contains(e.target as Node)) {
        setIsDonkeyToolsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isDonkeyToolsOpen]);

  const handlePickColor = async () => {
    try {
      window.electronAPI?.logAction?.({
        type: 'color-picker',
        title: 'Spuštění kapátka z DonkeyTools',
        details: 'Výběr nástroje kapátka v nabídce rychlých nástrojů',
        status: 'info',
      });
      setIsDonkeyToolsOpen(false);
      setIsRevealed(false);
      await new Promise((r) => setTimeout(r, 110));
      await window.electronAPI?.resetAndHideSpotlight?.();
      await pickScreenColor();
    } catch (err) {
      console.error('Pick color error:', err);
    }
  };

  const handleStartQuickCap = async () => {
    try {
      window.electronAPI?.logAction?.({
        type: 'action',
        title: 'Spuštění QuickCap z DonkeyTools',
        details: 'Výběr nástroje výstřižku v nabídce rychlých nástrojů',
        status: 'info',
      });
      setIsDonkeyToolsOpen(false);
      setIsRevealed(false);
      await new Promise((r) => setTimeout(r, 110));
      await window.electronAPI?.resetAndHideSpotlight?.();
      const startFn = window.electronAPI?.startQuickCap || window.electronAPI?.startFastSnap;
      if (startFn) {
        await startFn();
      }
    } catch (err) {
      console.error('QuickCap start error:', err);
    }
  };

  // Listen to global color picker and tune color applied
  useEffect(() => {
    if (window.electronAPI?.onTuneColorApplied) {
      const unsub = window.electronAPI.onTuneColorApplied((data: { color: string }) => {
        if (data.color) {
          const parsed = parseColorQuery(data.color);
          const format = colorMasterConfig?.defaultFormat || 'hex';
          if (parsed) {
            const newItem = createColorLauncherItem(parsed, format);
            setQuery(data.color);
            setActionsParentItem(newItem);
            setSelectedActionIndex(0);
          }
        }
      });
      return () => unsub?.();
    }
  }, [colorMasterConfig]);

  useEffect(() => {
    if (window.electronAPI?.onColorPickedGlobal) {
      const unsub = window.electronAPI.onColorPickedGlobal((data: { color: string; formatted: string }) => {
        if (data.color) {
          const parsed = parseColorQuery(data.color);
          const format = colorMasterConfig?.defaultFormat || 'hex';
          setQuery(data.color);
          if (parsed) {
            const newItem = createColorLauncherItem(parsed, format);
            setActionsParentItem(newItem);
            setSelectedActionIndex(0);
          }
          setIsRevealed(true);
          inputRef.current?.focus();
        }
      });
      return () => unsub?.();
    }
  }, [colorMasterConfig]);

  // Listen to QuickCap screenshot captured event
  useEffect(() => {
    if (window.electronAPI?.onQuickCapCaptured) {
      const unsub = window.electronAPI.onQuickCapCaptured((data: {
        filePath: string;
        fileName: string;
        dataUrl?: string;
        width: number;
        height: number;
      }) => {
        const item: LauncherItem = {
          id: `quickcap-${Date.now()}`,
          name: data.fileName,
          location: data.filePath,
          icon: 'crop',
          imagePreview: data.dataUrl,
          info: {
            'Název': data.fileName,
            'Rozměry': `${data.width} × ${data.height} px`,
            'Cesta': data.filePath,
          },
          actions: [
            {
              name: 'Upravit (v přípravě)',
              action: 'edit-quickcap',
              location: data.filePath,
              icon: 'edit',
            },
            {
              name: 'Otevřít',
              action: 'open',
              location: data.filePath,
              icon: 'open_in_new',
            },
            {
              name: 'Otevřít v malování',
              action: 'open-paint',
              location: data.filePath,
              icon: 'draw',
            },
            {
              name: 'Otevřít ve složce',
              action: 'show-in-folder',
              location: data.filePath,
              icon: 'folder_open',
            },
          ],
        };
        setQuery('');
        setActionsParentItem(item);
        setSelectedActionIndex(1); // Select 'Otevřít' by default since 'Upravit' is in preparation
        setIsRevealed(true);
        inputRef.current?.focus();
      });
      return () => unsub?.();
    }
  }, []);

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

    const handleBlur = () => {
      if (settingsHoldRafRef.current) {
        cancelAnimationFrame(settingsHoldRafRef.current);
        settingsHoldRafRef.current = null;
      }
      setSettingsHoldProgress(0);
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      unsubFavicons?.();
      unsubFocus?.();
      window.removeEventListener('focus-search-input', handleFocus);
      window.removeEventListener('blur', handleBlur);
      if (settingsHoldRafRef.current) {
        cancelAnimationFrame(settingsHoldRafRef.current);
      }
    };
  }, []);

  // Fetch existing cloned repos for instant VS Code action availability
  const refreshExistingClonedRepos = () => {
    if (window.electronAPI?.getExistingClonedRepos) {
      window.electronAPI.getExistingClonedRepos(defaultCloneDir).then((repos) => {
        if (repos && Array.isArray(repos)) {
          setExistingClonedRepos(new Set(repos.map((r) => r.toLowerCase())));
        }
      });
    }
  };

  useEffect(() => {
    refreshExistingClonedRepos();
  }, [defaultCloneDir]);

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
      setIsRevealed(false);
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
      refreshExistingClonedRepos();
      setIsRevealed(true);
      inputRef.current?.focus();
    });

    const cleanupFocusInput = window.electronAPI?.onFocusInput?.(() => {
      setIsRevealed(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    const cleanupHide = window.electronAPI?.onWindowHideRequest?.(() => {
      setIsRevealed(false);
    });

    const cleanupReset = window.electronAPI?.onResetSpotlight?.(() => {
      setQuery('');
      setSelectedIndex(0);
      setParentItem(null);
      setActionsParentItem(null);
      savedParentItemRef.current = null;
      restoringIndexRef.current = null;
      setIsRevealed(false);
      inputRef.current?.blur();
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      cleanupShown?.();
      cleanupFocusInput?.();
      cleanupHide?.();
      cleanupReset?.();
    };
  }, [defaultCloneDir]);

  // Enter subitems mode
  const enterSubitems = (item: LauncherItem) => {
    if (!item.options || item.options.length === 0) return;
    window.electronAPI?.logAction?.({
      type: 'options',
      title: `Otevření podpoložek (options): ${item.name}`,
      details: `Počet podpoložek: ${item.options.length}`,
      status: 'info',
    });
    setActionsParentItem(null);
    setSavedQueryBeforeSubitems(query);
    setSavedIndexBeforeSubitems(selectedIndex);
    savedParentItemRef.current = item;
    setParentItem(item);
    setQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus();
  };

  // Return from subitems mode back to previous main level
  const exitSubitems = () => {
    restoringIndexRef.current = savedIndexBeforeSubitems;
    setParentItem(null);
    setQuery(savedQueryBeforeSubitems);
    setSelectedIndex(savedIndexBeforeSubitems);
    inputRef.current?.focus();
  };

  // Extract folder name of repository
  const getRepoFolderName = (item?: LauncherItem | null): string | null => {
    if (!item) return null;
    if (item.settings === 'git' || item.sourceId === 'github' || item.sourceId === 'git') {
      if (item.shortcuts && item.shortcuts[0]) {
        return item.shortcuts[0];
      }
      const parts = (item.name || '').split(/[/\\\\]/);
      return parts[parts.length - 1] || null;
    }
    if (item.settings === 'magicgate' || item.sourceId === 'magicgate' || item.sourceId === 'magicgate-xml') {
      return item.name || null;
    }
    return null;
  };

  // Resolve local directory path if repository is already cloned
  const getLocalRepoPath = (item?: LauncherItem | null): string | null => {
    if (!item || !defaultCloneDir) return null;
    const folderName = getRepoFolderName(item);
    if (!folderName) return null;

    const sep = defaultCloneDir.includes('/') ? '/' : '\\';
    const cleanBase = defaultCloneDir.replace(/[\\/]+$/, '');

    // For MagicGate instances: target directory is {defaultCloneDir}/magicgate/{instanceName}
    const isMagicGate = item.settings === 'magicgate' || item.sourceId === 'magicgate' || item.sourceId === 'magicgate-xml';
    if (isMagicGate) {
      const lowerName = folderName.toLowerCase();
      if (existingClonedRepos.has(`magicgate/${lowerName}`) || existingClonedRepos.has(lowerName)) {
        return `${cleanBase}${sep}magicgate${sep}${folderName}`;
      }
      return null;
    }

    // For standard GitHub / Git repositories: target directory is {defaultCloneDir}/{repoName}
    if (existingClonedRepos.has(folderName.toLowerCase())) {
      return `${cleanBase}${sep}${folderName}`;
    }
    return null;
  };

  const isAndroidProjectItem = (item?: LauncherItem | null): boolean => {
    if (!item) return false;
    // MagicGate projects are NEVER Android Studio projects
    if (item.settings === 'magicgate' || item.sourceId === 'magicgate' || item.sourceId === 'magicgate-xml') {
      return false;
    }
    const lang = String(item.info?.['Jazyk'] || item.info?.['Language'] || '').trim().toLowerCase();
    if (lang === 'kotlin' || lang === 'java') {
      return true;
    }
    return false;
  };

  // Dynamically resolve actions for an item, inserting either 'Otevřít v Android Studiu' or 'Otevřít ve VS Code' (never both!)
  const getItemActions = (item?: LauncherItem | null): LauncherAction[] => {
    if (!item) return [];
    let baseActions = item.actions ? [...item.actions] : [];

    // Filter out redundant recursive clone actions (handled by checkbox in clone modal)
    baseActions = baseActions.filter(
      (a) => a.action !== 'clonerecursive' && a.action !== 'mgclonerecursive'
    );

    // For Git / GitHub items: ensure 'Otevřít na GitHubu' is always at the very end
    const isGit = item.settings === 'git' || item.sourceId === 'github' || item.sourceId === 'git';
    if (isGit) {
      const openOnGithubIndex = baseActions.findIndex(
        (a) =>
          a.action === 'open' &&
          (a.name.toLowerCase().includes('github') || a.location?.includes('github.com'))
      );
      if (openOnGithubIndex >= 0 && openOnGithubIndex < baseActions.length - 1) {
        const [openOnGithubAction] = baseActions.splice(openOnGithubIndex, 1);
        baseActions.push(openOnGithubAction);
      }
    }

    const localPath = getLocalRepoPath(item);
    if (localPath) {
      const isAndroid = isAndroidProjectItem(item);

      if (isAndroid) {
        if (androidStudioEnabled) {
          const hasAndroidAction = baseActions.some((a) => a.action === 'android-studio');
          if (!hasAndroidAction) {
            baseActions.unshift({
              name: 'Otevřít v Android Studiu',
              action: 'android-studio',
              location: localPath,
              icon: 'android',
              settings: 'android-studio',
            });
          }
        } else if (vscodeEnabled) {
          // Fallback to VS Code if Android Studio extension is not active
          const hasVscodeAction = baseActions.some((a) => a.action === 'vscode');
          if (!hasVscodeAction) {
            baseActions.unshift({
              name: 'Otevřít ve VS Code',
              action: 'vscode',
              location: localPath,
              icon: 'code',
              settings: 'vscode',
            });
          }
        }
      } else {
        // Not Android (MagicGate or regular web/backend repo) -> VS Code only
        if (vscodeEnabled) {
          const hasVscodeAction = baseActions.some((a) => a.action === 'vscode');
          if (!hasVscodeAction) {
            baseActions.unshift({
              name: 'Otevřít ve VS Code',
              action: 'vscode',
              location: localPath,
              icon: 'code',
              settings: 'vscode',
            });
          }
        }
      }
    }

    return baseActions;
  };

  const hasItemActions = (item?: LauncherItem | null) =>
    Boolean(getItemActions(item).length > 0);

  const hasItemInfo = (item?: LauncherItem | null) =>
    Boolean(item?.info && typeof item.info === 'object' && Object.keys(item.info).length > 0);

  const hasItemActionsOrInfo = (item?: LauncherItem | null) =>
    hasItemActions(item) || hasItemInfo(item);

  // Enter actions / info mode for an item
  const enterActions = (item: LauncherItem) => {
    if (!hasItemActionsOrInfo(item)) return;
    window.electronAPI?.logAction?.({
      type: 'action',
      title: `Otevření nabídky akcí: ${item.name}`,
      details: item.location ? `Cíl: ${item.location}` : undefined,
      status: 'info',
    });
    refreshExistingClonedRepos();
    setActionsParentItem(item);
    setSelectedActionIndex(0);
    setInfoPage(0);
  };

  // Return from actions mode back to search results
  const exitActions = () => {
    setActionsParentItem(null);
    setSelectedActionIndex(0);
    setInfoPage(0);
    inputRef.current?.focus();
  };

  const handleCopyInfoValue = async (key: string, value: string) => {
    if (!value) return;
    try {
      window.electronAPI?.logAction?.({
        type: 'action',
        title: `Zkopírována informace položky: ${key}`,
        details: value,
        status: 'success',
      });
      if (window.electronAPI) {
        await window.electronAPI.executeAction({
          action: 'copy',
          location: value,
        });
      } else {
        await navigator.clipboard.writeText(value);
      }
      setCopiedInfoKey(key);
      setTimeout(() => {
        setCopiedInfoKey(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to copy info value:', err);
    }
  };

  // Filter and prioritize results (or display parentItem.options if in subitems mode)
  const results = useMemo(() => {
    const trimmed = query.trim();

    // 1. If currently browsing subitems of a parent item
    if (parentItem) {
      const rawSubitems = parentItem.options || [];
      const subitems = rawSubitems.map((it) => ({
        ...it,
        icon: it.icon?.trim() ? it.icon : parentItem.icon,
        image: it.image?.trim() ? it.image : parentItem.image,
        sourceId: it.sourceId || parentItem.sourceId,
        settings: it.settings || (parentItem.settings === 'magicgate' ? undefined : parentItem.settings),
      }));
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

    // Special DonkeyTools commands prefix: "/" (e.g. /kapatko, /picker, /color)
    // Commands are ONLY shown when query starts with a slash and DonkeyTools is enabled
    if (trimmed.startsWith('/') && donkeyToolsEnabled) {
      const dtCommands = getDonkeyToolsCommands(trimmed, {
        colorMasterEnabled: isColorMasterActive,
        quickCapEnabled: isQuickCapActive,
        fastSnapEnabled: isQuickCapActive,
      });
      if (dtCommands.length > 0) {
        return dtCommands;
      }
      return [];
    }

    // Prefix "git:": searches exclusively in git repositories
    const gitPrefixMatch = trimmed.match(/^git:\s*(.*)$/i);
    if (gitPrefixMatch) {
      const gitQuery = gitPrefixMatch[1].trim();
      const gitItems = items.filter(
        (item) => item.settings === 'git' || item.sourceId === 'github' || item.sourceId === 'git'
      );

      if (!gitQuery) {
        return [...gitItems].sort((a, b) => {
          const pA = a.priority ?? 0;
          const pB = b.priority ?? 0;
          if (pA !== pB) return pA - pB;
          return (a.name || '').localeCompare(b.name || '');
        });
      }

      const normGitQuery = removeDiacritics(gitQuery).toLowerCase();
      const matchedGit = gitItems.filter((item) => {
        const itemNameNorm = removeDiacritics(item.name || '').toLowerCase();
        const itemLocNorm = removeDiacritics(item.location || '').toLowerCase();
        const nameMatch = itemNameNorm.includes(normGitQuery);
        const locMatch = itemLocNorm.includes(normGitQuery);
        const optionsMatch = item.options?.some((opt) => {
          const optNameNorm = removeDiacritics(opt.name || '').toLowerCase();
          const optLocNorm = removeDiacritics(opt.location || '').toLowerCase();
          return optNameNorm.includes(normGitQuery) || optLocNorm.includes(normGitQuery);
        });
        const infoMatch =
          item.info &&
          Object.values(item.info).some((v) => {
            if (typeof v === 'string') {
              return removeDiacritics(v).toLowerCase().includes(normGitQuery);
            }
            return false;
          });
        return nameMatch || locMatch || Boolean(optionsMatch) || Boolean(infoMatch);
      });

      matchedGit.sort((a, b) => {
        const pA = a.priority ?? 0;
        const pB = b.priority ?? 0;
        if (pA !== pB) return pA - pB;

        const aNorm = removeDiacritics(a.name || '').toLowerCase();
        const bNorm = removeDiacritics(b.name || '').toLowerCase();

        const aStarts = aNorm.startsWith(normGitQuery);
        const bStarts = bNorm.startsWith(normGitQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        const aWordStarts = aNorm.split(/[\s\-_\/]+/).some((w) => w.startsWith(normGitQuery));
        const bWordStarts = bNorm.split(/[\s\-_\/]+/).some((w) => w.startsWith(normGitQuery));
        if (aWordStarts && !bWordStarts) return -1;
        if (!aWordStarts && bWordStarts) return 1;

        return (a.name || '').localeCompare(b.name || '');
      });

      return matchedGit;
    }

    // Prefix "magicgate:" (or "mg:"): searches exclusively in MagicGate items
    const mgPrefixMatch = trimmed.match(/^(?:magicgate|mg):\s*(.*)$/i);
    if (mgPrefixMatch) {
      const mgQuery = mgPrefixMatch[1].trim();
      const mgItems = items.filter(
        (item) =>
          item.settings === 'magicgate' ||
          item.sourceId === 'magicgate' ||
          Boolean(item.id?.startsWith('mg-')) ||
          Boolean(item.options?.some((opt) => opt.settings === 'magicgate' || opt.id?.startsWith('mg-')))
      );

      if (!mgQuery) {
        return [...mgItems].sort((a, b) => {
          const pA = a.priority ?? 0;
          const pB = b.priority ?? 0;
          if (pA !== pB) return pA - pB;
          return (a.name || '').localeCompare(b.name || '');
        });
      }

      const normMgQuery = removeDiacritics(mgQuery).toLowerCase();
      const matchedMg = mgItems.filter((item) => {
        const itemNameNorm = removeDiacritics(item.name || '').toLowerCase();
        const itemLocNorm = removeDiacritics(item.location || '').toLowerCase();
        const nameMatch = itemNameNorm.includes(normMgQuery);
        const locMatch = itemLocNorm.includes(normMgQuery);
        const shortcutsMatch = item.shortcuts?.some((sc) =>
          removeDiacritics(sc).toLowerCase().includes(normMgQuery)
        );
        const optionsMatch = item.options?.some((opt) => {
          const optNameNorm = removeDiacritics(opt.name || '').toLowerCase();
          const optLocNorm = removeDiacritics(opt.location || '').toLowerCase();
          return optNameNorm.includes(normMgQuery) || optLocNorm.includes(normMgQuery);
        });
        const infoMatch =
          item.info &&
          Object.values(item.info).some((v) => {
            if (typeof v === 'string') {
              return removeDiacritics(v).toLowerCase().includes(normMgQuery);
            }
            return false;
          });
        return nameMatch || locMatch || Boolean(shortcutsMatch) || Boolean(optionsMatch) || Boolean(infoMatch);
      });

      matchedMg.sort((a, b) => {
        const pA = a.priority ?? 0;
        const pB = b.priority ?? 0;
        if (pA !== pB) return pA - pB;

        const aNorm = removeDiacritics(a.name || '').toLowerCase();
        const bNorm = removeDiacritics(b.name || '').toLowerCase();

        const aStarts = aNorm.startsWith(normMgQuery);
        const bStarts = bNorm.startsWith(normMgQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        const aWordStarts = aNorm.split(/[\s\-_\/]+/).some((w) => w.startsWith(normMgQuery));
        const bWordStarts = bNorm.split(/[\s\-_\/]+/).some((w) => w.startsWith(normMgQuery));
        if (aWordStarts && !bWordStarts) return -1;
        if (!aWordStarts && bWordStarts) return 1;

        return (a.name || '').localeCompare(b.name || '');
      });

      return matchedMg;
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

    const tPref = (mlogTaskPrefix || 'T').trim();
    const rPref = (mlogRequestPrefix || 'R').trim();

    // Prefix "taskmanager:" or "mlog:": searches exclusively in Taskmanager tickets and related items
    const tmPrefixMatch = trimmed.match(/^(?:taskmanager|mlog):\s*(.*)$/i);
    if (tmPrefixMatch) {
      const tmQuery = tmPrefixMatch[1].trim();
      const tmList: LauncherItem[] = [];

      if (mlogBaseUrl) {
        const cleanBase = mlogBaseUrl.trim().replace(/\/+$/, '');
        if (tmQuery) {
          const directTicket = detectMlogTicket(tmQuery, mlogBaseUrl, tPref, rPref);
          if (directTicket) {
            tmList.push(directTicket);
          }
          const numOnly = tmQuery.match(/^(\d+)$/);
          if (numOnly) {
            const id = numOnly[1];
            const taskItem = detectMlogTicket(`${tPref}${id}`, mlogBaseUrl, tPref, rPref);
            const reqItem = detectMlogTicket(`${rPref}${id}`, mlogBaseUrl, tPref, rPref);
            if (taskItem && !tmList.some((it) => it.id === taskItem.id)) tmList.push(taskItem);
            if (reqItem && !tmList.some((it) => it.id === reqItem.id)) tmList.push(reqItem);
          }
        } else {
          tmList.push({
            id: 'taskmanager-home',
            name: 'Otevřít Taskmanager',
            location: cleanBase,
            action: 'open',
            icon: 'support_agent',
            image: null,
            priority: -2,
            settings: null,
          });
        }
      }

      // Also filter any items that mention Taskmanager or this ticket
      if (tmQuery) {
        const norm = removeDiacritics(tmQuery).toLowerCase();
        const extraTm = items.filter((it) => {
          const n = removeDiacritics(it.name || '').toLowerCase();
          const l = removeDiacritics(it.location || '').toLowerCase();
          const infoM =
            it.info &&
            Object.values(it.info).some(
              (v) => typeof v === 'string' && removeDiacritics(v).toLowerCase().includes(norm)
            );
          return (
            (it.sourceId === 'mlog' || it.settings === 'mlog' || n.includes('mlog') || n.includes('taskmanager') || Boolean(infoM)) &&
            (n.includes(norm) || l.includes(norm) || Boolean(infoM))
          );
        });
        tmList.push(...extraTm);
      }

      return tmList;
    }

    // 0. Taskmanager ticket engine (active when mlogBaseUrl is configured)
    const mlogItem = detectMlogTicket(trimmed, mlogBaseUrl, tPref, rPref);
    if (mlogItem) {
      list.push(mlogItem);
      // Also look for items that specifically reference this ticket in info
      const normTicket = removeDiacritics(trimmed.replace(/\s+/g, '')).toLowerCase();
      const referencingItems = items.filter((it) => {
        if (it.info) {
          const hasInfoTicket = Object.values(it.info).some((v) => {
            if (typeof v === 'string') {
              const cleaned = removeDiacritics(v.replace(/\s+/g, '')).toLowerCase();
              return cleaned.includes(normTicket);
            }
            return false;
          });
          if (hasInfoTicket) return true;
        }
        return false;
      });
      list.push(...referencingItems);
      return list;
    }

    // 0a. Taskmanager digits-only query (3 or more digits, e.g. 123 -> offers Task and Request with configured prefixes)
    const digitsOnlyMatch = trimmed.match(/^(\d{3,})$/);
    if (digitsOnlyMatch && mlogBaseUrl) {
      const numId = digitsOnlyMatch[1];
      const taskItem = detectMlogTicket(`${tPref}${numId}`, mlogBaseUrl, tPref, rPref);
      const reqItem = detectMlogTicket(`${rPref}${numId}`, mlogBaseUrl, tPref, rPref);
      if (taskItem) list.push(taskItem);
      if (reqItem) list.push(reqItem);

      // Also look for items that specifically reference this ticket or number in info or name
      const referencingItems = items.filter((it) => {
        if (it.info) {
          const hasInfoTicket = Object.values(it.info).some((v) => {
            if (typeof v === 'string') {
              const cleaned = removeDiacritics(v.replace(/\s+/g, '')).toLowerCase();
              return (
                cleaned.includes(`${tPref.toLowerCase()}${numId}`) ||
                cleaned.includes(`${rPref.toLowerCase()}${numId}`) ||
                cleaned.includes(numId)
              );
            }
            return false;
          });
          if (hasInfoTicket) return true;
        }
        const nameNorm = removeDiacritics(it.name || '').toLowerCase();
        return nameNorm.includes(numId);
      });
      list.push(...referencingItems);
      return list;
    }

    // 0b. Standalone Email -> Gmail compose engine (priority -1.5)
    const emailItem = detectEmail(trimmed);
    if (emailItem) {
      list.push(emailItem);
    }

    // 0c. ColorMaster regex color engine (priority -1.2, active when ColorMaster is enabled)
    if (isColorMasterActive) {
      const parsedColor = parseColorQuery(trimmed);
      if (parsedColor) {
        const colorItem = createColorLauncherItem(parsedColor, colorMasterConfig?.defaultFormat);
        list.push(colorItem);
      }
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
  }, [query, items, parentItem, searchGoogle, defaultSearchEngine, mlogBaseUrl, mlogTaskPrefix, mlogRequestPrefix, engineFavicons]);

  // Keep selected index within bounds or restore saved index when returning from subitems
  useEffect(() => {
    if (restoringIndexRef.current !== null) {
      const savedIdx = restoringIndexRef.current;
      restoringIndexRef.current = null;
      if (results.length > 0) {
        let targetIndex = savedIdx;
        if (savedParentItemRef.current) {
          const parent = savedParentItemRef.current;
          const foundIdx = results.findIndex(
            (r) =>
              (r.id && parent.id && r.id === parent.id) ||
              (r.name === parent.name && r.location === parent.location)
          );
          if (foundIdx !== -1) {
            targetIndex = foundIdx;
          }
          savedParentItemRef.current = null;
        }
        setSelectedIndex(Math.max(0, Math.min(targetIndex, results.length - 1)));
        return;
      }
    }
    setSelectedIndex(0);
  }, [results]);

  // Scroll selected item or action into view
  useEffect(() => {
    if (listRef.current) {
      if (actionsParentItem) {
        if (selectedActionIndex === 0) {
          listRef.current.scrollTop = 0;
        } else {
          const activeEl = listRef.current.querySelector('[data-action-selected="true"]');
          if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest' });
          }
        }
      } else {
        const activeEl = listRef.current.querySelector('[data-selected="true"]');
        if (activeEl) {
          activeEl.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }, [selectedIndex, selectedActionIndex, actionsParentItem]);

  // Smooth close helper - fades out in CSS before hiding native window
  const handleClose = () => {
    setIsRevealed(false);
    setIsDonkeyToolsOpen(false);
    setTimeout(() => {
      setParentItem(null);
      setActionsParentItem(null);
      savedParentItemRef.current = null;
      restoringIndexRef.current = null;
      window.electronAPI?.hideWindow?.();
    }, 90);
  };

  // Execute selected item
  const handleExecute = async (item: LauncherItem) => {
    if (!item) return;

    window.electronAPI?.logAction?.({
      type: 'action',
      title: `Vybrána položka: ${item.name}`,
      details: `Akce: ${item.action || 'open'}, cíl: ${item.location || item.name}`,
      status: 'info',
    });

    if (item.action === 'pick-color') {
      await handlePickColor();
      return;
    }

    if (item.action === 'quickcap' || item.action === 'fastsnap') {
      setIsDonkeyToolsOpen(false);
      setIsRevealed(false);
      await new Promise((r) => setTimeout(r, 110));
      await window.electronAPI?.resetAndHideSpotlight?.();
      const startFn = window.electronAPI?.startQuickCap || window.electronAPI?.startFastSnap;
      if (startFn) {
        await startFn();
      }
      return;
    }

    if (item.id === 'colormaster-detected-color' && item.colorPreview) {
      const format = colorMasterConfig?.defaultFormat || 'hex';
      const parsed = parseColorQuery(item.colorPreview);
      const toCopy = parsed ? formatColorValue(parsed, format) : item.colorPreview;
      if (window.electronAPI) {
        try {
          await window.electronAPI.executeAction({
            action: 'copy',
            location: toCopy,
          });
        } catch (err) {
          console.error('Clipboard copy error via electronAPI:', err);
        }
      } else {
        await navigator.clipboard.writeText(toCopy);
      }
      handleClose();
      return;
    }

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

      // Revalidate favicon on execution for items using {favicon} placeholder or web URLs
      if (isUrl && (item.image === '{favicon}' || item.settings === 'magicgate' || item.settings === 'git' || item.sourceId === 'github')) {
        const fetchUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        try {
          const origin = new URL(fetchUrl).origin;
          window.electronAPI?.fetchFaviconForUrl?.(fetchUrl).then((dataUrl) => {
            if (dataUrl) {
              const currentCached = localStorage.getItem(`favicon:${origin}`);
              if (dataUrl !== currentCached) {
                try {
                  localStorage.setItem(`favicon:${origin}`, dataUrl);
                  window.dispatchEvent(new CustomEvent('favicon-cached', { detail: { origin, dataUrl } }));
                } catch {
                  // ignore localStorage quota error
                }
              }
            }
          });
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

  // Execute action from actions mode
  const handleExecuteAction = async (parent: LauncherItem, actionItem: LauncherAction) => {
    const actionType = actionItem.action;
    const effectiveSettings = actionItem.settings || parent.settings;
    const effectiveLocation = actionItem.location || parent.location || '';

    window.electronAPI?.logAction?.({
      type: 'action',
      title: `Vyvolána akce: ${actionItem.name} (${parent.name})`,
      details: `Typ: ${actionType || 'open'}, cíl: ${effectiveLocation || '—'}`,
      status: 'info',
    });

    if (actionType === 'clone' || actionType === 'clonerecursive') {
      exitActions();
      window.electronAPI?.openGitCloneWindow?.({
        repoName: parent.name,
        repoUrl: effectiveLocation,
        initialRecursive: actionType === 'clonerecursive',
      });
      setTimeout(() => {
        window.electronAPI?.hideWindow?.();
      }, 60);
      return;
    }

    if (actionType === 'mgclone' || actionType === 'mgclonerecursive') {
      exitActions();
      window.electronAPI?.openGitCloneWindow?.({
        repoName: parent.name,
        adminUrl: effectiveLocation,
        isInstanceMode: true,
        initialRecursive: actionType === 'mgclonerecursive',
      });
      setTimeout(() => {
        window.electronAPI?.hideWindow?.();
      }, 60);
      return;
    }

    if (actionType === 'tune-color') {
      const colorToTune = effectiveLocation || parent.colorPreview || parent.name || '#6366f1';
      window.electronAPI?.openTuneColorWindow?.({ initialColor: colorToTune });
      window.electronAPI?.hideWindow?.();
      return;
    }

    if (actionType === 'copy') {
      if (window.electronAPI) {
        try {
          await window.electronAPI.executeAction({
            action: 'copy',
            location: effectiveLocation,
            settings: effectiveSettings,
          });
        } catch (err) {
          console.error('Clipboard copy error via electronAPI:', err);
        }
      } else {
        await navigator.clipboard.writeText(effectiveLocation);
      }
      exitActions();
      handleClose();
      return;
    }

    if (actionType === 'vscode') {
      exitActions();
      if (window.electronAPI?.openInVscode) {
        window.electronAPI.openInVscode(effectiveLocation);
      }
      setTimeout(() => {
        handleClose();
      }, 60);
      return;
    }

    if (actionType === 'android-studio') {
      exitActions();
      if (window.electronAPI?.openInAndroidStudio) {
        window.electronAPI.openInAndroidStudio(effectiveLocation);
      }
      setTimeout(() => {
        handleClose();
      }, 60);
      return;
    }

    if (actionType === 'set-primary-color') {
      applyPrimaryColor(effectiveLocation);
      if (window.electronAPI?.getConfig && window.electronAPI?.saveConfig) {
        const cfg = await window.electronAPI.getConfig();
        await window.electronAPI.saveConfig({ ...cfg, primaryColor: effectiveLocation });
      }
      exitActions();
      handleClose();
      return;
    }

    if (actionType === 'set-actions-color') {
      applyActionsColor(effectiveLocation);
      if (window.electronAPI?.getConfig && window.electronAPI?.saveConfig) {
        const cfg = await window.electronAPI.getConfig();
        await window.electronAPI.saveConfig({ ...cfg, actionsColor: effectiveLocation });
      }
      exitActions();
      handleClose();
      return;
    }

    if (actionType === 'edit-quickcap') {
      // V přípravě – momentálně nic nedělá
      window.electronAPI?.logAction?.({
        type: 'action',
        title: 'Akce v přípravě: Upravit výstřižek',
        details: 'Tato funkce bude dostupná v další aktualizaci',
        status: 'info',
      });
      return;
    }

    if (actionType === 'open-paint') {
      exitActions();
      if (window.electronAPI) {
        await window.electronAPI.executeAction({
          action: 'open-paint',
          location: effectiveLocation,
        });
      }
      handleClose();
      return;
    }

    if (actionType === 'show-in-folder') {
      exitActions();
      if (window.electronAPI) {
        await window.electronAPI.executeAction({
          action: 'show-in-folder',
          location: effectiveLocation,
        });
      }
      handleClose();
      return;
    }

    // Default / 'open' action
    if (actionType === 'open' || !actionType) {
      exitActions();
      await handleExecute({
        name: actionItem.name,
        location: effectiveLocation,
        action: 'open',
        settings: effectiveSettings,
      });
      return;
    }

    // Any other action
    if (window.electronAPI) {
      await window.electronAPI.executeAction({
        action: actionType,
        location: effectiveLocation,
        settings: effectiveSettings,
      });
    }
    exitActions();
    handleClose();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If in actions mode
    if (actionsParentItem) {
      const actionsList = getItemActions(actionsParentItem);
      const allInfoEntries = Object.entries(actionsParentItem.info || {});
      const totalInfoPages = Math.ceil(allInfoEntries.length / 8);

      if (e.key === 'ArrowRight') {
        if (totalInfoPages > 1) {
          e.preventDefault();
          setInfoPage((prev) => (prev < totalInfoPages - 1 ? prev + 1 : prev));
        }
      } else if (e.key === 'ArrowLeft') {
        if (totalInfoPages > 1) {
          e.preventDefault();
          setInfoPage((prev) => (prev > 0 ? prev - 1 : prev));
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedActionIndex((prev) => (actionsList.length > 0 ? (prev + 1) % actionsList.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedActionIndex((prev) => (actionsList.length > 0 ? (prev - 1 + actionsList.length) % actionsList.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = actionsList[selectedActionIndex];
        if (chosen) {
          handleExecuteAction(actionsParentItem, chosen);
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        exitActions();
      }
      return;
    }

    // Ctrl+Backspace or Alt+Backspace -> completely clear search query string
    if (e.key === 'Backspace' && (e.ctrlKey || e.metaKey || e.altKey)) {
      e.preventDefault();
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    // If inside subitems and search query is empty, Backspace returns to previous main level
    if (e.key === 'Backspace' && query === '' && parentItem) {
      e.preventDefault();
      exitSubitems();
      return;
    }

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

      // 1. Shift + Enter -> Enter ACTIONS & INFO mode
      if (e.shiftKey) {
        if (hasItemActionsOrInfo(currentItem)) {
          enterActions(currentItem);
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

      // 3. Alt + Enter -> Enter SUBITEMS navigation (old Shift+Enter behavior, 2nd subitem removed)
      if (e.altKey) {
        if (currentItem.options && currentItem.options.length > 0) {
          enterSubitems(currentItem);
        }
        return;
      }

      // Default Enter -> Execute selected item
      handleExecute(currentItem);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isDonkeyToolsOpen) {
        setIsDonkeyToolsOpen(false);
      } else if (parentItem) {
        exitSubitems();
      } else {
        handleClose();
      }
    }
  };

  // Click on result item (supporting Shift, Ctrl, and Alt modifiers)
  const handleItemClick = (item: LauncherItem, e: React.MouseEvent) => {
    // 1. Shift + Click -> Enter ACTIONS & INFO mode
    if (e.shiftKey) {
      if (hasItemActionsOrInfo(item)) {
        enterActions(item);
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

    // 3. Alt + Click -> Enter SUBITEMS navigation
    if (e.altKey) {
      if (item.options && item.options.length > 0) {
        enterSubitems(item);
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

    if (!sub1) {
      return <span className="text-gray-400 truncate">{item.location || ''}</span>;
    }

    const isSub1Active = isSelected && isCtrlDown && Boolean(sub1);
    const isMainActive = !isSub1Active;

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
      </div>
    );
  };

  const trimmedQuery = query.trim();
  const isGitPrefix = Boolean(trimmedQuery.match(/^git:/i));
  const isMagicGatePrefix = Boolean(trimmedQuery.match(/^(?:magicgate|mg):/i));
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tPrefEsc = escapeRegex((mlogTaskPrefix || 'T').trim());
  const rPrefEsc = escapeRegex((mlogRequestPrefix || 'R').trim());
  const isMlogMode = Boolean(
    mlogBaseUrl?.trim() &&
      trimmedQuery.match(new RegExp(`^(?:taskmanager:|mlog:|(${tPrefEsc}|${rPrefEsc})\\s*\\d+|\\d{3,})$`, 'i'))
  );

  const handleSettingsMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isLongPressRef.current = false;
    settingsHoldStartRef.current = performance.now();
    if (settingsHoldRafRef.current) {
      cancelAnimationFrame(settingsHoldRafRef.current);
    }
    const HOLD_START_DELAY = 120; // Ignore clicks under 120ms to prevent visual flicker
    const HOLD_TOTAL_DURATION = 3000;
    const tick = () => {
      const elapsed = performance.now() - settingsHoldStartRef.current;
      if (elapsed < HOLD_START_DELAY) {
        settingsHoldRafRef.current = requestAnimationFrame(tick);
        return;
      }
      const activeDuration = HOLD_TOTAL_DURATION - HOLD_START_DELAY;
      const pct = Math.min(100, ((elapsed - HOLD_START_DELAY) / activeDuration) * 100);
      setSettingsHoldProgress(pct);
      if (elapsed < HOLD_TOTAL_DURATION) {
        settingsHoldRafRef.current = requestAnimationFrame(tick);
      } else {
        isLongPressRef.current = true;
        setSettingsHoldProgress(0);
        settingsHoldRafRef.current = null;
        window.electronAPI?.openPowerWindow?.();
      }
    };
    settingsHoldRafRef.current = requestAnimationFrame(tick);
  };

  const cancelSettingsHold = () => {
    if (settingsHoldRafRef.current) {
      cancelAnimationFrame(settingsHoldRafRef.current);
      settingsHoldRafRef.current = null;
    }
    const elapsed = performance.now() - settingsHoldStartRef.current;
    if (elapsed > 400) {
      // User was intentionally holding and released before finish
      isLongPressRef.current = true;
    }
    setSettingsHoldProgress(0);
  };

  const handleSettingsMouseUp = () => {
    cancelSettingsHold();
  };

  const handleSettingsMouseLeave = () => {
    cancelSettingsHold();
  };

  const handleSettingsClick = () => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    window.electronAPI?.logAction?.({
      type: 'window',
      title: 'Otevření okna Nastavení',
      details: 'Kliknutí na ozubené kolečko v záhlaví Spotlightu',
      status: 'info',
    });
    setIsRevealed(false);
    window.electronAPI?.openSettingsWindow?.();
    setTimeout(() => {
      window.electronAPI?.hideWindow?.();
    }, 90);
  };

  return (
    <div
      className={`w-full flex flex-col bg-[#1c1d24] border border-white/10 rounded-2xl shadow-2xl overflow-visible text-gray-100 spotlight-card ${
        isRevealed ? 'revealed' : ''
      }`}
    >
      {/* Top Search Input Bar */}
      <div
        className={`flex items-center px-4 py-3.5 gap-3 bg-white/[0.02] rounded-t-2xl ${
          results.length > 0 || parentItem || actionsParentItem ? 'border-b border-white/10' : 'rounded-b-2xl'
        }`}
      >
        <span
          className={`material-symbols-outlined select-none text-2xl ${
            actionsParentItem
              ? 'text-purple-400'
              : parentItem
              ? 'text-indigo-400'
              : isMlogMode
              ? 'text-indigo-400'
              : isGitPrefix
              ? 'text-emerald-400'
              : isMagicGatePrefix
              ? 'text-amber-400'
              : 'text-indigo-400'
          }`}
        >
          {actionsParentItem
            ? 'bolt'
            : parentItem
            ? 'subdirectory_arrow_right'
            : isMlogMode
            ? 'support_agent'
            : isGitPrefix
            ? 'folder_code'
            : isMagicGatePrefix
            ? 'security'
            : 'search'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={actionsParentItem ? '' : query}
          readOnly={Boolean(actionsParentItem)}
          onChange={(e) => {
            if (!actionsParentItem) setQuery(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            actionsParentItem
              ? `Akce položky: „${actionsParentItem.name}“`
              : parentItem
              ? `Hledat v podpoložkách „${parentItem.name}“...`
              : isMlogMode
              ? 'Otevřít v Taskmanageru...'
              : isMagicGatePrefix
              ? 'Hledat v MagicGate instancích...'
              : isGitPrefix
              ? 'Hledat v repozitářích...'
              : 'Hledejte (min. 2 znaky), zadejte výpočet nebo URL...'
          }
          className="flex-1 bg-transparent text-lg text-white placeholder-gray-400 placeholder:italic placeholder:font-normal outline-none font-medium tracking-wide"
          autoFocus
          spellCheck={false}
        />
        {actionsParentItem ? (
          <button
            onClick={exitActions}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center cursor-pointer shrink-0"
            title="Zavřít nabídku akcí (Esc)"
          >
            <span className="material-symbols-outlined text-[19px] leading-none select-none">close</span>
          </button>
        ) : query.length > 0 ? (
          <button
            onClick={() => setQuery('')}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center cursor-pointer shrink-0"
            title="Vymazat dotaz"
          >
            <span className="material-symbols-outlined text-[19px] leading-none select-none">close</span>
          </button>
        ) : null}

        <div className="h-5 w-[1px] bg-white/15 mx-0.5 shrink-0 self-center" />

        {/* DonkeyTools Quick Tools Button & Subextensions Flyout */}
        {showDonkeyToolsIcon && (
          <div className="relative shrink-0 self-center" ref={donkeyToolsRef}>
            <button
              type="button"
              onClick={() => {
                const nextState = !isDonkeyToolsOpen;
                setIsDonkeyToolsOpen(nextState);
                window.electronAPI?.logAction?.({
                  type: 'ui',
                  title: nextState ? 'Otevření nabídky DonkeyTools' : 'Zavření nabídky DonkeyTools',
                  details: 'Kliknutí na tlačítko rychlých nástrojů v záhlaví Spotlightu',
                  status: 'info',
                });
              }}
              className={`relative w-8 h-8 rounded-lg transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                isDonkeyToolsOpen
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              title="DonkeyTools – Rychlé nástroje"
            >
              <span className="material-symbols-outlined text-[20px] leading-none select-none">
                construction
              </span>
            </button>

            {/* Subextensions vertical buttons list */}
            {isDonkeyToolsOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex flex-col items-center gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* ColorMaster Subextension - Eyedropper */}
                {isColorMasterActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDonkeyToolsOpen(false);
                      handlePickColor();
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all shadow-xl bg-[#1c1d28] hover:bg-rose-500/25 border border-white/15 hover:border-rose-400/50 text-gray-300 hover:text-rose-200 hover:scale-105 active:scale-95"
                    title="ColorMaster – Kapátko (nabrat barvu z obrazovky)"
                  >
                    <span className="material-symbols-outlined text-[20px] leading-none select-none">
                      colorize
                    </span>
                  </button>
                )}

                {/* QuickCap Subextension - Snipping tool */}
                {isQuickCapActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDonkeyToolsOpen(false);
                      handleStartQuickCap();
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all shadow-xl bg-[#1c1d28] hover:bg-rose-500/25 border border-white/15 hover:border-rose-400/50 text-gray-300 hover:text-rose-200 hover:scale-105 active:scale-95"
                    title="QuickCap – Výstřižek obrazovky"
                  >
                    <span className="material-symbols-outlined text-[20px] leading-none select-none">
                      crop
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

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
          onMouseDown={handleSettingsMouseDown}
          onMouseUp={handleSettingsMouseUp}
          onMouseLeave={handleSettingsMouseLeave}
          onClick={handleSettingsClick}
          className={`relative w-8 h-8 rounded-lg transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
            settingsHoldProgress > 0
              ? settingsHoldProgress > 60
                ? 'bg-rose-500/20 text-rose-300'
                : 'bg-indigo-500/20 text-indigo-300'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
          title="Otevřít nastavení (podržením 3s otevřete správce ukončení a restartu)"
        >
          {settingsHoldProgress > 0 && (
            <svg
              className="absolute inset-0 w-8 h-8 pointer-events-none"
              viewBox="0 0 32 32"
            >
              <defs>
                <linearGradient id="powerHoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>
              {/* Background track circle */}
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="2.5"
              />
              {/* Animated charging progress circle */}
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="url(#powerHoldGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={81.68}
                strokeDashoffset={81.68 * (1 - settingsHoldProgress / 100)}
                transform="rotate(-90 16 16)"
              />
            </svg>
          )}
          <span
            className="material-symbols-outlined text-[19px] leading-none select-none transition-transform duration-75"
            style={
              settingsHoldProgress > 0
                ? { transform: `rotate(${(settingsHoldProgress / 100) * 180}deg)` }
                : undefined
            }
          >
            settings
          </span>
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

      {/* Actions Mode View */}
      {actionsParentItem ? (
        <>
          {/* Actions & Info Banner */}
          <div
            onClick={exitActions}
            className="flex items-center justify-between px-4 py-2 bg-purple-950/40 border-b border-purple-500/20 text-xs text-purple-300 hover:bg-purple-900/40 cursor-pointer transition select-none"
            title="Klikněte pro návrat zpět do vyhledávání (Esc)"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-purple-400">arrow_back</span>
              {actionsParentItem.colorPreview && (
                <div
                  className="w-4 h-4 rounded border border-white/20 shadow-inner flex items-center justify-center shrink-0"
                  style={{ backgroundColor: actionsParentItem.colorPreview }}
                />
              )}
              <span>
                {hasItemActions(actionsParentItem) && hasItemInfo(actionsParentItem)
                  ? 'Akce a informace:'
                  : hasItemActions(actionsParentItem)
                  ? 'Akce položky:'
                  : 'Informace o položce:'}{' '}
                <strong className="text-white font-semibold">{actionsParentItem.name}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
              <kbd className="inline-flex items-center justify-center h-[18px] px-1.5 bg-white/10 text-gray-300 border border-white/15 rounded font-mono text-[10px] leading-none whitespace-nowrap">Esc</kbd>
              <span>Zpět</span>
            </div>
          </div>

          {/* Unified Actions & Info Scrollable View */}
          <div
            ref={listRef}
            className="max-h-[385px] overflow-y-auto p-2 focus:outline-none space-y-2"
          >
            {/* 1. Screenshot Preview or Compact Info Section (BEFORE actions) */}
            {actionsParentItem?.imagePreview ? (
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-purple-500/20 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300">
                    <span className="material-symbols-outlined text-sm text-purple-400">crop</span>
                    <span>Náhled výstřižku</span>
                  </div>
                  {actionsParentItem.info?.['Rozměry'] && (
                    <span className="text-[10px] text-purple-300/90 font-mono bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/20">
                      {actionsParentItem.info['Rozměry']}
                    </span>
                  )}
                </div>
                <div className="w-full flex items-center justify-center p-2 bg-black/40 rounded-lg border border-purple-500/15 overflow-hidden">
                  <img
                    src={actionsParentItem.imagePreview}
                    alt={actionsParentItem.name}
                    className="max-h-[190px] max-w-full object-contain rounded select-none shadow-md border border-white/10"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>
            ) : hasItemInfo(actionsParentItem) && (() => {
              const allInfoEntries = Object.entries(actionsParentItem.info!);
              const ITEMS_PER_PAGE = 8;
              const totalPages = Math.ceil(allInfoEntries.length / ITEMS_PER_PAGE);
              const safePage = Math.min(infoPage, Math.max(0, totalPages - 1));
              const visibleEntries = allInfoEntries.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE);

              return (
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300">
                      <span className="material-symbols-outlined text-sm text-purple-400">info</span>
                      <span>Informace o položce</span>
                      {allInfoEntries.length > ITEMS_PER_PAGE && (
                        <span className="text-[10px] text-purple-400/80 font-mono">
                          ({allInfoEntries.length})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {allInfoEntries.length > ITEMS_PER_PAGE && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                          <span>
                            {safePage + 1} / {totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={safePage === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoPage((prev) => Math.max(0, prev - 1));
                            }}
                            className="p-0.5 rounded hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer flex items-center"
                            title="Předchozí strana (←)"
                          >
                            <span className="material-symbols-outlined !text-[12px]" style={{ fontSize: '12px' }}>chevron_left</span>
                          </button>
                          <button
                            type="button"
                            disabled={safePage >= totalPages - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoPage((prev) => Math.min(totalPages - 1, prev + 1));
                            }}
                            className="p-0.5 rounded hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer flex items-center"
                            title="Další strana (→)"
                          >
                            <span className="material-symbols-outlined !text-[12px]" style={{ fontSize: '12px' }}>chevron_right</span>
                          </button>
                        </div>
                      )}
                      <span className="text-[10px] text-gray-400 font-mono">
                        kliknutím zkopírovat
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {visibleEntries.map(([key, val]) => {
                      const strVal = val !== null && val !== undefined ? String(val) : '—';
                      const isCopied = copiedInfoKey === key;
                      return (
                        <div
                          key={key}
                          onClick={() => handleCopyInfoValue(key, strVal)}
                          title={`Kliknutím zkopírujete „${strVal}“ do schránky`}
                          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition cursor-pointer min-w-0 ${
                            isCopied
                              ? 'bg-emerald-500/10 border-emerald-500/40'
                              : 'bg-black/30 border-white/5 hover:border-purple-500/30 hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className="text-[11px] text-gray-400 truncate shrink-0 max-w-[45%] select-none font-medium">
                            {key}
                          </span>
                          <span
                            className={`text-xs font-mono truncate select-all ${
                              isCopied ? 'text-emerald-400 font-semibold' : 'text-gray-200'
                            }`}
                            title={strVal}
                          >
                            {isCopied ? 'Zkopírováno!' : strVal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 2. Actions List */}
            {hasItemActions(actionsParentItem) && (
              <div className="divide-y divide-white/[0.04]">
                {getItemActions(actionsParentItem).map((action, idx) => {
                  const isSelected = idx === selectedActionIndex;
                  const isVscode = action.settings === 'vscode' || action.action === 'vscode';
                  const isAndroid = action.settings === 'android-studio' || action.action === 'android-studio';
                  const isPreparation = action.action === 'edit-quickcap';
                  const isPaint = action.action === 'open-paint';
                  const isFolder = action.action === 'show-in-folder';

                  const itemSelectedClass = isSelected
                    ? isVscode
                      ? 'bg-cyan-800/40 border-cyan-500/50 text-white shadow-md'
                      : isAndroid
                      ? 'bg-pink-800/40 border-pink-500/50 text-white shadow-md'
                      : 'bg-purple-600/30 border-purple-500/40 text-white shadow-md'
                    : isVscode
                    ? 'hover:bg-cyan-950/30 text-gray-200 border-white/5 bg-black/20 hover:border-cyan-500/30'
                    : isAndroid
                    ? 'hover:bg-pink-950/30 text-gray-200 border-white/5 bg-black/20 hover:border-pink-500/30'
                    : 'hover:bg-white/[0.05] text-gray-200 border-white/5 bg-black/20 hover:border-purple-500/30';

                  const iconContainerClass = isVscode
                    ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-300'
                    : isAndroid
                    ? 'bg-pink-900/40 border-pink-500/50 text-pink-300'
                    : 'bg-purple-600/20 border-purple-500/30 text-purple-300';

                  const dividerClass = isSelected
                    ? isVscode
                      ? 'bg-cyan-400/40'
                      : isAndroid
                      ? 'bg-pink-400/40'
                      : 'bg-white/20'
                    : 'bg-white/[0.08]';

                  const badgeClass = isVscode
                    ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                    : isAndroid
                    ? 'bg-pink-950/70 border-pink-500/50 text-pink-300'
                    : 'bg-purple-950/70 border-purple-500/40 text-purple-300';

                  const selectIndicatorClass = isVscode
                    ? 'text-cyan-300'
                    : isAndroid
                    ? 'text-pink-300'
                    : 'text-purple-300';

                  return (
                    <div
                      key={`${action.name}-${idx}`}
                      data-selected={isSelected}
                      data-action-selected={isSelected}
                      onClick={() => handleExecuteAction(actionsParentItem, action)}
                      onMouseEnter={() => setSelectedActionIndex(idx)}
                      className={`flex items-center px-3 py-2 rounded-xl cursor-pointer transition-colors duration-150 gap-3 border ${itemSelectedClass}`}
                    >
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${iconContainerClass}`}>
                          <span className="material-symbols-outlined text-lg">
                            {action.icon || (action.action === 'clone' ? 'download' : action.action === 'clonerecursive' ? 'folder_zip' : action.action === 'mgclone' || action.action === 'mgclonerecursive' ? 'cloud_download' : action.action === 'copy' ? 'content_copy' : 'open_in_new')}
                          </span>
                        </div>
                        <div className={`h-5 w-[1px] shrink-0 self-center transition-colors ${dividerClass}`} />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center pl-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate leading-tight">
                            {action.name}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-medium uppercase ${badgeClass}`}>
                            {isVscode
                              ? 'VS Code'
                              : isAndroid
                              ? 'Android Studio'
                              : isPreparation
                              ? 'V přípravě'
                              : isPaint
                              ? 'Malování'
                              : isFolder
                              ? 'Složka'
                              : action.action}
                          </span>
                        </div>
                        <div className="text-xs mt-0.5 font-mono text-gray-400 truncate">
                          {action.location || actionsParentItem.location || ''}
                        </div>
                      </div>

                      {isSelected && (
                        <div className={`flex-shrink-0 text-xs flex items-center gap-1.5 opacity-90 ${selectIndicatorClass}`}>
                          {isPreparation ? (
                            <span className="text-gray-400 italic text-[11px]">Připravujeme...</span>
                          ) : (
                            <>
                              <span>Provést</span>
                              <kbd className="inline-flex items-center justify-center h-[18px] px-1.5 bg-white/10 text-gray-300 border border-white/15 rounded font-mono text-[10px] leading-none whitespace-nowrap">Enter</kbd>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions & Info Footer */}
          <div className="px-4 py-2 bg-black/30 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
            <button
              type="button"
              onClick={exitActions}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Zpět do vyhledávání</span>
            </button>
            <div className="flex items-center gap-2 font-mono">
              {hasItemActions(actionsParentItem) && (
                <span>{actionsParentItem.actions!.length} akcí</span>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Regular Results List & Footer */
        results.length > 0 && (
          <>
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
                  <kbd className="inline-flex items-center justify-center h-[18px] px-1.5 bg-white/10 text-gray-300 border border-white/15 rounded font-mono text-[10px] leading-none whitespace-nowrap">Esc</kbd>
                  <span>Zpět</span>
                </div>
              </div>
            )}

            <div
              ref={listRef}
              className="max-h-[400px] overflow-y-auto divide-y divide-white/[0.04] p-1.5 focus:outline-none"
            >
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const hasOptions = Array.isArray(item.options) && item.options.length > 0;
                const hasActions = hasItemActions(item);
                const hasInfo = hasItemInfo(item);
                const hasActionsOrInfo = hasActions || hasInfo;
                const hasAnyChip = Boolean(
                  item.settings === 'git' ||
                  item.settings === 'magicgate' ||
                  item.sourceId === 'snippet' ||
                  item.sourceId === 'donkeytools' ||
                  item.priority === -1.5 ||
                  item.priority === -2 ||
                  item.priority === -1 ||
                  item.priority === 99 ||
                  item.sourceId?.startsWith('engine-')
                );

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
                          {item.colorPreview ? (
                            <div
                              className="w-7 h-7 rounded-lg border border-white/20 shadow-inner flex items-center justify-center shrink-0"
                              style={{ backgroundColor: item.colorPreview }}
                            />
                          ) : (
                            <MaterialIcon
                              icon={item.icon?.trim() ? item.icon : parentItem?.icon}
                            image={item.image?.trim() ? item.image : parentItem?.image}
                            location={item.location || parentItem?.location}
                            colorClass={
                              parentItem
                                ? undefined
                                : item.settings === 'git' || item.sourceId === 'github'
                                ? 'text-emerald-400'
                                : item.sourceId === 'magicgate-xml' || item.settings === 'magicgate'
                                ? 'text-amber-400'
                                : undefined
                            }
                            fallbackIcon={
                              parentItem?.icon || (
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
                              )
                            }
                            className="w-7 h-7"
                          />
                        )}
                        </div>
                        {hasOptions && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              enterSubitems(item);
                            }}
                            title={`Zobrazit ${item.options!.length} podpoložek (Alt+Enter)`}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate leading-tight">
                          {item.name}
                        </span>

                        {/* Standalone action/info chip only when item has actions or info but NO other chip */}
                        {hasActionsOrInfo && !hasAnyChip && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              enterActions(item);
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition cursor-pointer select-none flex items-center gap-1"
                            title={hasActions ? 'Zobrazit akce a informace (Shift+Enter)' : 'Zobrazit informace (Shift+Enter)'}
                          >
                            <span className="material-symbols-outlined text-[11px] leading-none">
                              {hasActions ? 'bolt' : 'info'}
                            </span>
                            <span>{hasActions ? 'Akce' : 'Info'}</span>
                          </button>
                        )}

                        {item.settings === 'git' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              if (hasActionsOrInfo) {
                                e.stopPropagation();
                                enterActions(item);
                              }
                            }}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 select-none ${
                              hasActionsOrInfo ? 'hover:bg-emerald-500/30 cursor-pointer' : 'cursor-default'
                            }`}
                            title={hasActionsOrInfo ? 'Git položka – klikněte nebo stiskněte Shift+Enter pro akce a informace' : 'Git položka'}
                          >
                            {hasActionsOrInfo && (
                              <span className="material-symbols-outlined text-[11px] leading-none">
                                {hasActions ? 'bolt' : 'info'}
                              </span>
                            )}
                            <span>Git</span>
                          </button>
                        )}

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

                        {item.sourceId === 'donkeytools' && item.shortcuts && item.shortcuts.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.shortcuts.map((shortcut) => (
                              <span
                                key={shortcut}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/25 font-medium select-none"
                              >
                                {shortcut}
                              </span>
                            ))}
                          </div>
                        ) : item.sourceId === 'donkeytools' ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                            DonkeyTools
                          </span>
                        ) : null}
                        {item.priority === -1.5 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                            Gmail
                          </span>
                        )}
                        {item.priority === -2 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
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
                          <button
                            type="button"
                            onClick={(e) => {
                              if (hasActionsOrInfo) {
                                e.stopPropagation();
                                enterActions(item);
                              }
                            }}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 select-none ${
                              hasActionsOrInfo ? 'hover:bg-amber-500/30 cursor-pointer' : 'cursor-default'
                            }`}
                            title={hasActionsOrInfo ? 'MagicGate položka – klikněte nebo stiskněte Shift+Enter pro podrobné informace o serveru' : 'MagicGate'}
                          >
                            {hasActionsOrInfo && (
                              <span className="material-symbols-outlined text-[11px] leading-none">
                                {hasActions ? 'bolt' : 'info'}
                              </span>
                            )}
                            <span>MagicGate</span>
                          </button>
                        )}
                      </div>
                      <div className="text-xs mt-0.5 font-mono flex items-center gap-1.5 flex-nowrap min-w-0 w-full overflow-hidden">
                        {renderSubtitle(item, isSelected)}
                      </div>
                    </div>

                    {/* Action icon on selection */}
                    {isSelected && (
                      <div className={`flex-shrink-0 text-xs flex items-center gap-1.5 opacity-80 ${isShiftDown && hasActionsOrInfo ? 'text-purple-300' : 'text-indigo-300'}`}>
                        {isShiftDown && hasActionsOrInfo ? (
                          <>
                            <span>{hasActions ? 'Akce' : 'Info'}</span>
                            <span className="material-symbols-outlined text-sm">
                              {hasActions ? 'bolt' : 'info'}
                            </span>
                          </>
                        ) : isAltDown && hasOptions ? (
                          <>
                            <span>Subpoložky</span>
                            <span className="material-symbols-outlined text-sm">subdirectory_arrow_right</span>
                          </>
                        ) : isCtrlDown && item.options?.[0] ? (
                          <>
                            <span>{item.options[0].action === 'copy' ? 'Kopírovat' : 'Otevřít'}</span>
                            <span className="material-symbols-outlined text-sm">
                              {item.options[0].action === 'copy' ? 'content_copy' : 'arrow_forward'}
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
                {parentItem ? (
                  <button
                    type="button"
                    onClick={exitSubitems}
                    className="flex items-center gap-1 text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    <span>Zpět na hlavní výběr</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <kbd className="inline-flex items-center justify-center h-[18px] px-1.5 bg-white/10 text-gray-300 border border-white/15 rounded font-mono text-[10px] leading-none whitespace-nowrap">Enter</kbd> Otevřít
                    </span>
                    {hasItemActionsOrInfo(results[selectedIndex]) && (
                      <span className="flex items-center gap-1.5 text-purple-300">
                        <kbd className="inline-flex items-center justify-center h-[18px] px-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-mono text-[10px] leading-none whitespace-nowrap">Shift+Enter</kbd>{' '}
                        {hasItemActions(results[selectedIndex]) && hasItemInfo(results[selectedIndex])
                          ? 'Akce a info'
                          : hasItemActions(results[selectedIndex])
                          ? 'Akce'
                          : 'Info'}
                      </span>
                    )}
                    {results[selectedIndex]?.options && results[selectedIndex].options!.length > 0 && (
                      <span className="flex items-center gap-1.5 text-indigo-300/90">
                        <kbd className="inline-flex items-center justify-center h-[18px] px-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-mono text-[10px] leading-none whitespace-nowrap">Alt+Enter</kbd> Subpoložky
                      </span>
                    )}
                    {results[selectedIndex]?.options?.[0] && (
                      <span className="flex items-center gap-1.5 text-teal-300/90">
                        <kbd className="inline-flex items-center justify-center h-[18px] px-1.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded font-mono text-[10px] leading-none whitespace-nowrap">Ctrl+Enter</kbd> {results[selectedIndex].options![0].action === 'copy' ? 'Kopírovat' : '1. volba'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
};
