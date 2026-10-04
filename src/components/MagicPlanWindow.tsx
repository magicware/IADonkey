import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { AppConfig, MagicPlanData, PlanTaskItem, PlanDayInfo, MagicPlanSettings, PlanPersonInfo } from '../types';
import { applyPrimaryColor, applyActionsColor } from '../utils/theme';

export const extractPersonNameAndShortcut = (nameOrText?: string): { name: string; shortcut: string } => {
  if (!nameOrText) return { name: '', shortcut: '' };
  const clean = nameOrText.trim();
  const parenMatch = clean.match(/\(([^)]+)\)$/);
  if (parenMatch) {
    const shortcut = parenMatch[1].trim();
    const name = clean.replace(/\s*\([^)]+\)$/, '').trim();
    return { name, shortcut };
  }
  return { name: clean, shortcut: '' };
};

export const getUserInitials = (name?: string, availablePersons?: PlanPersonInfo[]): string => {
  if (!name) return '??';
  const clean = name.trim();

  // 1. Zkusit najít v availablePersons podle ID nebo jména
  if (availablePersons && availablePersons.length > 0) {
    const p = availablePersons.find(
      (x) =>
        String(x.id).trim().toLowerCase() === clean.toLowerCase() ||
        (x.name && x.name.trim().toLowerCase() === clean.toLowerCase()) ||
        (x.cleanName && x.cleanName.trim().toLowerCase() === clean.toLowerCase()) ||
        (x.shortcut && x.shortcut.trim().toLowerCase() === clean.toLowerCase())
    );
    if (p?.shortcut) return p.shortcut.toUpperCase();
  }

  // 2. Závorka např. "Kulhánek Petr (PKU)" -> zkratka je ze závorky PKU
  const parenMatch = clean.match(/\(([^)]+)\)/);
  if (parenMatch) {
    return parenMatch[1].trim().toUpperCase();
  }

  // 3. Fallback: odstranit závorky a vzít iniciály ze jména
  const cleanWithoutParen = clean.replace(/\([^)]*\)/g, '').trim();
  const parts = cleanWithoutParen.split(/[\s,.-]+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 3).toUpperCase();
  }
  return parts.slice(0, 3).map((p) => p[0].toUpperCase()).join('');
};

export const formatUserDisplayName = (name?: string, availablePersons?: PlanPersonInfo[]): string => {
  if (!name) return '';
  const clean = name.trim();
  if (availablePersons && availablePersons.length > 0) {
    const p = availablePersons.find(
      (x) =>
        String(x.id).trim().toLowerCase() === clean.toLowerCase() ||
        (x.name && x.name.trim().toLowerCase() === clean.toLowerCase()) ||
        (x.cleanName && x.cleanName.trim().toLowerCase() === clean.toLowerCase()) ||
        (x.shortcut && x.shortcut.trim().toLowerCase() === clean.toLowerCase())
    );
    if (p?.cleanName) return p.cleanName;
    if (p?.name) return p.name.replace(/\s*\([^)]*\)/g, '').trim();
  }
  const { name: parsedName } = extractPersonNameAndShortcut(clean);
  return parsedName || clean;
};

export const formatPlanDate = (dStr?: string): string => {
  if (!dStr) return '–';
  const clean = dStr.trim();
  const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${parseInt(d, 10)}. ${parseInt(m, 10)}. ${y}`;
  }
  const dmyMatch = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${parseInt(d, 10)}. ${parseInt(m, 10)}. ${y}`;
  }
  const dmMatch = clean.match(/^(\d{1,2})\.(\d{1,2})\.?$/);
  if (dmMatch) {
    const [, d, m] = dmMatch;
    const year = new Date().getFullYear();
    return `${parseInt(d, 10)}. ${parseInt(m, 10)}. ${year}`;
  }
  return clean;
};

export const isTaskForUser = (
  taskOrUserName?: string | { userName?: string; userId?: string } | PlanTaskItem,
  targetUser?: string,
  availablePersons?: PlanPersonInfo[]
): boolean => {
  if (!targetUser) return true;
  if (!taskOrUserName) return false;

  const taskUserName = typeof taskOrUserName === 'string' ? taskOrUserName : taskOrUserName.userName;
  const taskUserId = typeof taskOrUserName === 'object' ? taskOrUserName.userId : undefined;

  const tNorm = taskUserName ? taskUserName.trim().toLowerCase() : '';
  const uNorm = targetUser.trim().toLowerCase();

  // 1. Direct match on name string
  if (tNorm && (tNorm === uNorm || tNorm.includes(uNorm) || uNorm.includes(tNorm))) {
    return true;
  }

  // 2. Direct match on userId if present
  if (taskUserId && String(taskUserId).trim().toLowerCase() === uNorm) {
    return true;
  }

  // 3. Resolve targetUser or task via availablePersons
  if (availablePersons && availablePersons.length > 0) {
    const targetPerson = availablePersons.find(
      (p) =>
        String(p.id).trim().toLowerCase() === uNorm ||
        (p.name && p.name.trim().toLowerCase() === uNorm) ||
        (p.cleanName && p.cleanName.trim().toLowerCase() === uNorm) ||
        (p.shortcut && p.shortcut.trim().toLowerCase() === uNorm)
    );

    if (targetPerson) {
      const pIdNorm = String(targetPerson.id).trim().toLowerCase();
      const pNameNorm = (targetPerson.name || '').trim().toLowerCase();
      const pCleanNorm = (targetPerson.cleanName || '').trim().toLowerCase();
      const pScNorm = (targetPerson.shortcut || '').trim().toLowerCase();

      if (taskUserId && String(taskUserId).trim().toLowerCase() === pIdNorm) return true;
      if (tNorm) {
        if (pNameNorm && (tNorm === pNameNorm || tNorm.includes(pNameNorm) || pNameNorm.includes(tNorm))) return true;
        if (pCleanNorm && (tNorm === pCleanNorm || tNorm.includes(pCleanNorm) || pCleanNorm.includes(tNorm))) return true;
        if (pScNorm && tNorm.includes(`(${pScNorm})`)) return true;
      }
    }

    const taskPerson = availablePersons.find(
      (p) =>
        (tNorm && p.name && p.name.trim().toLowerCase() === tNorm) ||
        (tNorm && p.cleanName && p.cleanName.trim().toLowerCase() === tNorm) ||
        (taskUserId && String(p.id).trim().toLowerCase() === String(taskUserId).trim().toLowerCase())
    );
    if (taskPerson) {
      if (String(taskPerson.id).trim().toLowerCase() === uNorm) return true;
      if (
        taskPerson.name &&
        (taskPerson.name.trim().toLowerCase() === uNorm ||
          taskPerson.name.trim().toLowerCase().includes(uNorm) ||
          uNorm.includes(taskPerson.name.trim().toLowerCase()))
      )
        return true;
      if (
        taskPerson.cleanName &&
        (taskPerson.cleanName.trim().toLowerCase() === uNorm ||
          taskPerson.cleanName.trim().toLowerCase().includes(uNorm) ||
          uNorm.includes(taskPerson.cleanName.trim().toLowerCase()))
      )
        return true;
    }
  }

  return false;
};

export const comparePlanOrder = (a: PlanTaskItem, b: PlanTaskItem): number => {
  const aDate = a.dates && a.dates.length > 0 ? a.dates[0] : '';
  const bDate = b.dates && b.dates.length > 0 ? b.dates[0] : '';
  if (aDate && bDate && aDate !== bDate) {
    return aDate.localeCompare(bDate);
  }
  if (aDate && !bDate) return -1;
  if (!aDate && bDate) return 1;

  const aTop = typeof a.topPx === 'number' ? a.topPx : 0;
  const bTop = typeof b.topPx === 'number' ? b.topPx : 0;
  if (aTop !== bTop) {
    return aTop - bTop;
  }
  return 0;
};

export const groupDeduplicateTasks = (tasksList: PlanTaskItem[]): PlanTaskItem[] => {
  const map = new Map<string, PlanTaskItem>();
  for (const t of tasksList) {
    const key = t.taskId || `${t.taskIdentifier || ''}-${t.requirementId || ''}-${t.title}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...t, dates: t.dates ? [...t.dates] : [] });
    } else {
      if (t.userName && existing.userName && !existing.userName.includes(t.userName)) {
        existing.userName = `${existing.userName}, ${t.userName}`;
      } else if (t.userName && !existing.userName) {
        existing.userName = t.userName;
      }
      if (t.totalHours > existing.totalHours) {
        existing.totalHours = t.totalHours;
      }
      if (typeof t.topPx === 'number') {
        if (typeof existing.topPx !== 'number' || t.topPx < existing.topPx) {
          existing.topPx = t.topPx;
        }
      }
      if (t.dates) {
        for (const d of t.dates) {
          if (!existing.dates.includes(d)) existing.dates.push(d);
        }
      }
    }
  }
  return Array.from(map.values()).sort(comparePlanOrder);
};

export const isGoddayTask = (task: PlanTaskItem): boolean => {
  return Boolean(
    task.isGodday ||
    task.requirementId === 'R0' ||
    /godday/i.test(`${task.title} ${task.customName || ''} ${task.project || ''} ${task.url || ''}`)
  );
};

function hexToRgba(hexColor: string | undefined, fallbackHex: string, alpha: number): string {
  try {
    const hex = (hexColor || fallbackHex).trim().replace('#', '');
    let full = hex;
    if (full.length === 3) {
      full = full[0] + full[0] + full[1] + full[1] + full[2] + full[2];
    }
    if (full.length === 6) {
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
  } catch {}
  return fallbackHex;
}

interface MagicPlanWindowProps {
  config: AppConfig;
  onSaveConfig?: (newConfig: AppConfig) => void;
  onOpenSettings?: () => void;
}

export const MagicPlanWindow: React.FC<MagicPlanWindowProps> = ({ config, onSaveConfig, onOpenSettings }) => {
  const [currentConfig, setCurrentConfig] = useState<AppConfig>(config);
  const [data, setData] = useState<MagicPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localPlanSettings, setLocalPlanSettings] = useState<MagicPlanSettings | undefined>(config.magicplan);

  useEffect(() => {
    setCurrentConfig(config);
  }, [config]);

  useEffect(() => {
    const cleanup = window.electronAPI?.onConfigUpdated?.((newConfig) => {
      if (newConfig) {
        setCurrentConfig(newConfig);
        applyPrimaryColor(newConfig.primaryColor);
        applyActionsColor(newConfig.actionsColor);
      }
    });
    return cleanup;
  }, []);

  useEffect(() => {
    setLocalPlanSettings(currentConfig.magicplan);
  }, [currentConfig.magicplan]);

  const handleUpdateWorkHours = useCallback(
    async (newStart: string, newEnd: string) => {
      setLocalPlanSettings((prev) => ({
        ...prev,
        timelineTimeMode: 'custom',
        timelineCustomStart: newStart,
        timelineCustomEnd: newEnd,
      }));

      let baseConfig = config;
      if (window.electronAPI?.getConfig) {
        try {
          baseConfig = await window.electronAPI.getConfig();
        } catch {
          // fallback to props
        }
      }

      const updatedConfig: AppConfig = {
        ...baseConfig,
        magicplan: {
          ...baseConfig.magicplan,
          timelineTimeMode: 'custom',
          timelineCustomStart: newStart,
          timelineCustomEnd: newEnd,
        },
      };

      if (onSaveConfig) {
        onSaveConfig(updatedConfig);
      }
      if (window.electronAPI?.saveConfig) {
        await window.electronAPI.saveConfig(updatedConfig);
      }
    },
    [config, onSaveConfig]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'nastenka' | 'timeline' | 'list'>('nastenka');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Auto-focus input when search overlay is opened
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  // Global Ctrl+F / Cmd+F to open search, and Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);
  
  // Synchronize dynamic primary and actions colors from configuration
  useEffect(() => {
    applyPrimaryColor(config?.primaryColor);
    applyActionsColor(config?.actionsColor);
  }, [config?.primaryColor, config?.actionsColor]);

  // Realtime clock ticker for timeline progress line and day changes (1s interval + window focus)
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    const timer = setInterval(updateTime, 1000);
    window.addEventListener('focus', updateTime);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', updateTime);
    };
  }, []);

  // Day progress percentage (0:00 = 0%, 12:00 = 50%, 18:00 = 75%, 23:59 = 100%)
  const timeProgressPercent = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    const totalMinutes = hours * 60 + minutes + seconds / 60;
    return Math.min(100, Math.max(0, (totalMinutes / (24 * 60)) * 100));
  }, [currentTime]);

  const currentTimeLabel = useMemo(() => {
    return currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  }, [currentTime]);

  // Load cached or live data on mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        if (window.electronAPI?.getMagicPlanData) {
          const res = await window.electronAPI.getMagicPlanData();
          if (isMounted && res) {
            setData(res);
          }
        }
      } catch (err) {
        console.error('[MagicPlanWindow] Failed to load data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    // Listen to background updates
    const unsub = window.electronAPI?.onMagicPlanDataUpdated?.((newData: MagicPlanData) => {
      if (isMounted && newData) {
        setData(newData);
      }
    });

    return () => {
      isMounted = false;
      unsub?.();
    };
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (window.electronAPI?.refreshMagicPlan) {
        const res = await window.electronAPI.refreshMagicPlan();
        if (res) setData(res);
      }
    } catch (err) {
      console.error('[MagicPlanWindow] Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenPlanWeb = () => {
    const url = config.magicplan?.url?.trim();
    if (!url) return;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  /**
   * Builds TaskManager link for ticket code (R... or T...) respecting configured TaskManager prefixes
   */
  const getTaskManagerUrl = useCallback((code?: string): string | null => {
    if (!code || code === 'R0') return null;
    const isLinked = config.magicplan?.linkWithTaskManager !== false;
    if (!isLinked) return null;
    const baseUrl = config.mlog?.baseUrl?.trim().replace(/\/+$/, '');
    if (!baseUrl) return null;

    const tPref = (config.mlog?.taskPrefix || 'T').trim();
    const rPref = (config.mlog?.requestPrefix || 'R').trim();
    const numOnly = code.replace(/\D/g, '');
    if (!numOnly || numOnly === '0') return null;

    const upper = code.trim().toUpperCase();
    if (upper.startsWith(tPref.toUpperCase()) || upper.startsWith('T')) {
      return `${baseUrl}/${tPref}${numOnly}`;
    }
    if (upper.startsWith(rPref.toUpperCase()) || upper.startsWith('R')) {
      return `${baseUrl}/${rPref}${numOnly}`;
    }
    return `${baseUrl}/${code.trim()}`;
  }, [config.magicplan?.linkWithTaskManager, config.mlog]);

  const handleOpenTask = useCallback((task: PlanTaskItem) => {
    const isGodday = isGoddayTask(task);
    const tmUrl = isGodday ? null : (getTaskManagerUrl(task.taskIdentifier) || getTaskManagerUrl(task.requirementId));
    const url = isGodday
      ? (task.url || config.magicplan?.url?.trim())
      : (tmUrl || task.url || config.magicplan?.url?.trim());
    if (!url) return;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }, [getTaskManagerUrl, config.magicplan?.url]);

  const handleOpenCodeLink = useCallback((code: string, task: PlanTaskItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isGoddayTask(task)) {
      handleOpenTask(task);
      return;
    }
    const tmUrl = getTaskManagerUrl(code);
    if (tmUrl) {
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(tmUrl);
      } else {
        window.open(tmUrl, '_blank');
      }
    } else {
      navigator.clipboard.writeText(code);
      setCopiedId(task.taskId);
      setTimeout(() => setCopiedId(null), 1500);

      if (window.electronAPI?.copyToClipboard) {
        window.electronAPI.copyToClipboard(code, {
          title: 'Kód zkopírován',
          body: `${code} – ${task.title}`,
        });
      }
    }
  }, [getTaskManagerUrl, handleOpenTask]);

  const myTasks = useMemo(() => data?.myTasks || [], [data]);
  const queueTasks = useMemo(() => data?.unassignedTasks || [], [data]);

  // Current calendar date key (e.g. "2026-10-02") to detect midnight day rollover
  const currentDateKey = `${currentTime.getFullYear()}-${currentTime.getMonth() + 1}-${currentTime.getDate()}`;

  // Automatically refresh plan data when calendar day changes across midnight
  const lastLoadedDateKeyRef = useRef(currentDateKey);
  useEffect(() => {
    if (lastLoadedDateKeyRef.current !== currentDateKey) {
      lastLoadedDateKeyRef.current = currentDateKey;
      handleRefresh();
    }
  }, [currentDateKey]);

  // Always compute current work week: Monday to Friday (5 days, no Saturday or Sunday)
  const workWeekDays = useMemo((): PlanDayInfo[] => {
    const now = currentTime;
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatLocalDate(now);
    const isWeekendNow = dayOfWeek === 0 || dayOfWeek === 6;
    const dayNames = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];

    const days: PlanDayInfo[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatLocalDate(d);
      const dayNum = d.getDate();
      const monthNum = d.getMonth() + 1;

      // Pokud je sobota nebo neděle, ponecháme aktivní pátek (i === 4),
      // až v neděli po půlnoci (pondělí ráno) se novým týdnem přepne na pondělí (i === 0).
      const isToday = isWeekendNow ? i === 4 : dateStr === todayStr;

      days.push({
        date: dateStr,
        dayLabel: `${dayNames[i]} ${dayNum}.${monthNum}.`,
        isWeekend: false,
        isToday,
      });
    }

    return days;
  }, [currentDateKey]);

  const currentUser = config.magicplan?.currentUserColumn?.trim();
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState<boolean>(() => {
    if (config.magicplan?.showAllTasks !== undefined) {
      return !config.magicplan.showAllTasks;
    }
    return Boolean(currentUser);
  });

  // Sync showOnlyMyTasks whenever showAllTasks in config changes (e.g. from Settings modal)
  useEffect(() => {
    const activeCfg = currentConfig || config;
    if (activeCfg.magicplan?.showAllTasks !== undefined) {
      setShowOnlyMyTasks(!activeCfg.magicplan.showAllTasks);
    }
  }, [config.magicplan?.showAllTasks, currentConfig?.magicplan?.showAllTasks]);

  const availablePersons: PlanPersonInfo[] = useMemo(() => {
    return data?.availablePersons || [];
  }, [data]);

  const currentUserDisplayName = useMemo(() => {
    if (!currentUser) return '';
    const p = availablePersons.find((x) => String(x.id).trim().toLowerCase() === currentUser.toLowerCase());
    return formatUserDisplayName(p?.name || currentUser, availablePersons);
  }, [currentUser, availablePersons]);

  const handleToggleShowAllTasks = useCallback(async () => {
    const newShowOnly = !showOnlyMyTasks;
    setShowOnlyMyTasks(newShowOnly);
    const newShowAll = !newShowOnly;
    const baseConfig = currentConfig || config;
    const updatedConfig: AppConfig = {
      ...baseConfig,
      magicplan: {
        ...baseConfig.magicplan,
        showAllTasks: newShowAll,
      },
    };
    setCurrentConfig(updatedConfig);
    if (onSaveConfig) {
      onSaveConfig(updatedConfig);
    }
    if (window.electronAPI?.saveConfig) {
      await window.electronAPI.saveConfig(updatedConfig);
    }
  }, [showOnlyMyTasks, currentConfig, config, onSaveConfig]);

  const handleUpdateUserColumns = useCallback(
    async (newUserColumns: string[], newCurrentUser?: string) => {
      const baseConfig = currentConfig || config;
      const updatedConfig: AppConfig = {
        ...baseConfig,
        magicplan: {
          ...baseConfig.magicplan,
          userColumns: newUserColumns,
          userColumn: newUserColumns[0] || '',
          currentUserColumn: newCurrentUser !== undefined ? newCurrentUser : baseConfig.magicplan?.currentUserColumn,
        },
      };
      setCurrentConfig(updatedConfig);
      if (onSaveConfig) {
        onSaveConfig(updatedConfig);
      }
      if (window.electronAPI?.saveConfig) {
        await window.electronAPI.saveConfig(updatedConfig);
      }
    },
    [currentConfig, config, onSaveConfig]
  );

  const unassignedDisplayName = useMemo(() => {
    const raw = (config.magicplan?.unassignedColumn || '').trim();
    if (!raw) return 'Nepřiřazené úkoly';
    const p = availablePersons.find((x) => String(x.id).trim().toLowerCase() === raw.toLowerCase());
    return formatUserDisplayName(p?.name || raw, availablePersons);
  }, [config.magicplan?.unassignedColumn, availablePersons]);

  const distinctUsers = useMemo(() => {
    const userConfigs: string[] = [];
    if (config.magicplan?.userColumns && config.magicplan.userColumns.length > 0) {
      for (const u of config.magicplan.userColumns) {
        if (u && u.trim()) userConfigs.push(u.trim());
      }
    } else if (config.magicplan?.userColumn?.trim()) {
      userConfigs.push(config.magicplan.userColumn.trim());
    }

    const canonical: string[] = [];
    for (const nameOrId of userConfigs) {
      const norm = nameOrId.trim().toLowerCase();
      if (!norm) continue;
      const p = availablePersons.find((x) => String(x.id).trim().toLowerCase() === norm);
      const displayName = formatUserDisplayName(p?.name || nameOrId.trim(), availablePersons);
      if (!canonical.some((c) => c.trim().toLowerCase() === displayName.toLowerCase())) {
        canonical.push(displayName);
      }
    }

    if (canonical.length === 0) {
      for (const t of myTasks) {
        if (t.userName && t.userName.trim()) {
          const displayName = formatUserDisplayName(t.userName.trim(), availablePersons);
          if (!canonical.some((c) => c.trim().toLowerCase() === displayName.toLowerCase())) {
            canonical.push(displayName);
          }
        }
      }
    }

    return canonical;
  }, [config.magicplan, myTasks, availablePersons]);

  const hasMultipleUsers = distinctUsers.length >= 2 && !(showOnlyMyTasks && currentUser);

  // Filter tasks by active user toggle ("Pouze moje úkoly" vs "Všechny úkoly")
  const userFilteredMyTasks = useMemo(() => {
    let list = myTasks;
    if (showOnlyMyTasks && currentUser) {
      list = list.filter((t) => isTaskForUser(t, currentUser, availablePersons));
      list = [...list].sort(comparePlanOrder);
    } else {
      list = groupDeduplicateTasks(list);
    }
    return list;
  }, [myTasks, showOnlyMyTasks, currentUser, availablePersons]);

  // Filtering by search query
  const filteredMyTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return userFilteredMyTasks;
    return userFilteredMyTasks.filter((t) => {
      const titleMatch = (t.title || '').toLowerCase().includes(q);
      const customMatch = (t.customName || '').toLowerCase().includes(q);
      const reqMatch = (t.requirementId || '').toLowerCase().includes(q);
      const taskMatch = (t.taskIdentifier || '').toLowerCase().includes(q);
      const projMatch = (t.project || '').toLowerCase().includes(q);
      const authorMatch = (t.author || '').toLowerCase().includes(q);
      return titleMatch || customMatch || reqMatch || taskMatch || projMatch || authorMatch;
    });
  }, [userFilteredMyTasks, searchQuery]);

  const filteredQueueTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return queueTasks;
    return queueTasks.filter((t) => {
      const titleMatch = (t.title || '').toLowerCase().includes(q);
      const customMatch = (t.customName || '').toLowerCase().includes(q);
      const reqMatch = (t.requirementId || '').toLowerCase().includes(q);
      const taskMatch = (t.taskIdentifier || '').toLowerCase().includes(q);
      const projMatch = (t.project || '').toLowerCase().includes(q);
      const authorMatch = (t.author || '').toLowerCase().includes(q);
      return titleMatch || customMatch || reqMatch || taskMatch || projMatch || authorMatch;
    });
  }, [queueTasks, searchQuery]);

  // Completed tasks for Nástěnka
  const completedTasks = useMemo(() => {
    const list: PlanTaskItem[] = [];
    const seen = new Set<string>();
    const pool = showOnlyMyTasks && currentUser
      ? myTasks.filter((t) => isTaskForUser(t, currentUser, availablePersons))
      : groupDeduplicateTasks([...myTasks, ...queueTasks]);

    for (const t of pool) {
      if ((t.isCompleted || t.isSolved) && !seen.has(t.taskId)) {
        seen.add(t.taskId);
        list.push(t);
      }
    }
    return list.sort(comparePlanOrder);
  }, [myTasks, queueTasks, showOnlyMyTasks, currentUser, availablePersons]);

  // Active user tasks (excluding completed and notAvailable) for Nástěnka
  const activeMyTasks = useMemo(() => {
    return filteredMyTasks.filter((t) => !t.isCompleted && !t.isSolved && !t.isNotAvailable);
  }, [filteredMyTasks]);

  // Tasks for Timeline: always complete view across all tracked users
  const timelineTasks = myTasks;

  // Task hour stats
  const devHours = useMemo(() => {
    return userFilteredMyTasks.filter((t) => t.taskType === 'dev').reduce((sum, t) => sum + (t.totalHours || 0), 0);
  }, [userFilteredMyTasks]);

  const serviceHours = useMemo(() => {
    return userFilteredMyTasks.filter((t) => t.taskType === 'service').reduce((sum, t) => sum + (t.totalHours || 0), 0);
  }, [userFilteredMyTasks]);

  // Dynamically recalculate plan hours based on 'showOnlyMyTasks' toggle
  const totalDisplayPlanHours = useMemo(() => {
    return userFilteredMyTasks.reduce((sum, t) => sum + (t.totalHours || 0), 0);
  }, [userFilteredMyTasks]);

  const totalBoardHours = useMemo(() => {
    return devHours + serviceHours;
  }, [devHours, serviceHours]);

  const userDisplay = useMemo(() => {
    if (showOnlyMyTasks && currentUser) {
      return currentUserDisplayName;
    }
    if (distinctUsers.length > 0) {
      return distinctUsers.join(', ');
    }
    return config.magicplan?.userColumn || 'Plán';
  }, [showOnlyMyTasks, currentUser, currentUserDisplayName, distinctUsers, config.magicplan]);

  const isConfigured = Boolean(
    config.extensions?.magicplan &&
      ((config.magicplan?.urls && config.magicplan.urls.length > 0) || config.magicplan?.url) &&
      ((config.magicplan?.userColumns && config.magicplan.userColumns.length > 0) || config.magicplan?.userColumn)
  );

  const displayWeekRange = useMemo(() => {
    if (workWeekDays.length >= 5) {
      const mon = new Date(workWeekDays[0].date);
      const fri = new Date(workWeekDays[4].date);
      const formatD = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}.`;
      return `${formatD(mon)} – ${formatD(fri)} ${fri.getFullYear()}`;
    }
    return data?.planRange || '';
  }, [workWeekDays, data?.planRange]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0e0f12] text-gray-200 select-none overflow-hidden font-sans">
      {/* Scrollable Container with Integrated Non-Floating Header */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
        {/* Integrated Header (non-floating, scrolls with content) */}
        <div className="space-y-4">
          <div className="relative flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap min-h-[44px]">
            {/* Left branding & title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">calendar_month</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-wide">MagicPlan</h2>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className={`w-[38px] h-[38px] rounded-full flex items-center justify-center transition cursor-pointer ${
                  searchQuery
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white'
                }`}
                title="Hledat v plánu (Ctrl+F)"
              >
                <span className="material-symbols-outlined text-base">search</span>
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-[38px] h-[38px] rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                title="Obnovit plán (F5)"
              >
                <span className={`material-symbols-outlined text-base ${isRefreshing ? 'animate-spin' : ''}`}>
                  refresh
                </span>
              </button>

              <button
                type="button"
                onClick={handleOpenPlanWeb}
                className="w-[38px] h-[38px] rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Otevřít interní stránku plánu v prohlížeči"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.electronAPI?.openSettingsWindow) {
                    window.electronAPI.openSettingsWindow('magicplan');
                  } else if (onOpenSettings) {
                    onOpenSettings();
                  }
                }}
                className="w-[38px] h-[38px] rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Nastavení MagicPlan"
              >
                <span className="material-symbols-outlined text-base">settings</span>
              </button>
            </div>

            {/* Search Overlay across entire top row */}
            {isSearchOpen && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0e0f12] px-1">
                <div className="w-full max-w-lg mx-auto flex items-center gap-2.5">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                      search
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }
                      }}
                      placeholder="Hledat (název, kód R/T, projekt, zadavatel)..."
                      className="w-full h-[38px] bg-white/[0.06] hover:bg-white/[0.08] focus:bg-white/[0.1] rounded-full pl-9 pr-9 text-xs text-white placeholder-gray-400 outline-none transition border border-white/10 focus:border-indigo-500/50 shadow-sm"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                        title="Vymazat text"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-[38px] h-[38px] rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                    title="Zavřít hledání (Esc)"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls Bar: Tabs & Slide Switch */}
          <div className="flex items-center justify-between gap-3">
            {/* Unified 3-Tab Switcher (Nástěnka, Timeline, Seznam) */}
            <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] rounded-full w-fit shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('nastenka')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'nastenka'
                    ? 'bg-indigo-500/20 text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className={`material-symbols-outlined text-sm ${activeTab === 'nastenka' ? 'text-indigo-400' : 'text-gray-400'}`}>
                  dashboard
                </span>
                <span className={activeTab === 'nastenka' ? 'text-white' : ''}>Nástěnka</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-indigo-500/20 text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className={`material-symbols-outlined text-sm ${activeTab === 'timeline' ? 'text-indigo-400' : 'text-gray-400'}`}>
                  calendar_view_week
                </span>
                <span className={activeTab === 'timeline' ? 'text-white' : ''}>Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-indigo-500/20 text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className={`material-symbols-outlined text-sm ${activeTab === 'list' ? 'text-indigo-400' : 'text-gray-400'}`}>
                  format_list_bulleted
                </span>
                <span className={activeTab === 'list' ? 'text-white' : ''}>Seznam</span>
              </button>
            </div>

            {/* Classic Slide Switch for 'Všechny úkoly' (positioned on right) */}
            {currentUser && (
              <label
                className="inline-flex items-center cursor-pointer select-none group shrink-0"
                title={!showOnlyMyTasks ? 'Zobrazují se úkoly všech sledovaných osob' : `Zobrazují se pouze úkoly pro ${currentUserDisplayName || currentUser}`}
              >
                <span className="text-xs font-medium text-gray-300 group-hover:text-white transition mr-3">
                  Všechny úkoly
                </span>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={!showOnlyMyTasks}
                    onChange={handleToggleShowAllTasks}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 group-hover:bg-white/15" />
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Offline / Error notice */}
        {data?.isOffline && (
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-amber-400">cloud_off</span>
              <span>{data.error || 'Server plánu je offline nebo nejste připojeni k firemní VPN síti.'}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-medium transition cursor-pointer"
            >
              Zkusit znovu
            </button>
          </div>
        )}

        {/* Content Views */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-gray-400 space-y-3 py-20">
            <span className="material-symbols-outlined text-4xl animate-spin text-indigo-400">sync</span>
            <span className="text-xs">Načítám data plánu ze serveru...</span>
          </div>
        ) : !isConfigured ? (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-md mx-auto py-20">
            <div className="w-14 h-14 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">calendar_month</span>
            </div>
            <h3 className="text-base font-bold text-white">Sledování plánu není plně nakonfigurováno</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Pro aktivaci zadejte URL adresu plánu a identifikátor svého sloupce v nastavení rozšíření MagicPlan.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.electronAPI?.openSettingsWindow) {
                  window.electronAPI.openSettingsWindow('magicplan');
                } else if (onOpenSettings) {
                  onOpenSettings();
                }
              }}
              className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              Přejít do nastavení MagicPlan
            </button>
          </div>
        ) : activeTab === 'nastenka' ? (
          /* TAB 1: NÁSTĚNKA (4 sloupce: Nepřiřazené, Úkoly, Servis, Splněné) */
          <BoardView
            unassignedTasks={filteredQueueTasks}
            myTasks={activeMyTasks}
            completedTasks={completedTasks}
            hasMultipleUsers={hasMultipleUsers}
            userDisplay={userDisplay}
            devHours={devHours}
            serviceHours={serviceHours}
            totalHours={totalBoardHours}
            unassignedColumnName={unassignedDisplayName}
            onOpenTask={handleOpenTask}
            onOpenCodeLink={handleOpenCodeLink}
            getTaskManagerUrl={getTaskManagerUrl}
            copiedId={copiedId}
          />
        ) : activeTab === 'timeline' ? (
          /* TAB 2: TIMELINE (Po-Pá, 8h denně = 40h týdně, posouvající se linka) */
          <TimelineGridView
            days={workWeekDays}
            tasks={timelineTasks}
            timeProgressPercent={timeProgressPercent}
            currentTimeLabel={currentTimeLabel}
            currentTime={currentTime}
            planSettings={localPlanSettings || config.magicplan}
            distinctUsers={distinctUsers}
            currentUser={currentUser}
            currentUserDisplayName={currentUserDisplayName}
            availablePersons={availablePersons}
            userColumns={config.magicplan?.userColumns || (config.magicplan?.userColumn ? [config.magicplan.userColumn] : [])}
            onUpdateUserColumns={handleUpdateUserColumns}
            filterMyOverflow={showOnlyMyTasks && Boolean(currentUser)}
            showOnlyMyTasks={showOnlyMyTasks}
            searchQuery={searchQuery}
            onOpenTask={handleOpenTask}
            onOpenCodeLink={handleOpenCodeLink}
            getTaskManagerUrl={getTaskManagerUrl}
            copiedId={copiedId}
            onUpdateWorkHours={handleUpdateWorkHours}
            primaryColor={currentConfig?.primaryColor || config?.primaryColor}
            actionsColor={currentConfig?.actionsColor || config?.actionsColor}
          />
        ) : (
          /* TAB 3: SEZNAM (Moderní borderless zobrazení) */
          <ListView
            tasks={filteredMyTasks}
            hasMultipleUsers={hasMultipleUsers}
            onOpenTask={handleOpenTask}
            onOpenCodeLink={handleOpenCodeLink}
            getTaskManagerUrl={getTaskManagerUrl}
            copiedId={copiedId}
          />
        )}
      </div>

      {/* Footer / Status Bar */}
      <div className="px-6 py-2.5 bg-white/[0.02] flex items-center justify-between gap-4 text-xs text-gray-400 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span>
            Zobrazeno:{' '}
            <strong className="text-gray-200">
              {activeTab === 'nastenka'
                ? activeMyTasks.length + filteredQueueTasks.length
                : filteredMyTasks.length}
            </strong>{' '}
            úkolů
          </span>
          <span>•</span>
          <span>
            Celkem v plánu:{' '}
            <strong className="text-indigo-300 font-mono">{totalDisplayPlanHours}h</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-gray-500">
          <span>Poslední kontrola:</span>
          <span className="text-gray-400 font-semibold">{data?.lastChecked || '–'}</span>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* TAB 1: BOARD VIEW (Nástěnka – 3 sloupce)                                  */
/* ========================================================================= */
interface BoardViewProps {
  unassignedTasks: PlanTaskItem[];
  myTasks: PlanTaskItem[];
  completedTasks: PlanTaskItem[];
  hasMultipleUsers?: boolean;
  userDisplay?: string;
  devHours?: number;
  serviceHours?: number;
  totalHours?: number;
  unassignedColumnName: string;
  onOpenTask: (task: PlanTaskItem) => void;
  onOpenCodeLink: (code: string, task: PlanTaskItem, e?: React.MouseEvent) => void;
  getTaskManagerUrl: (code?: string) => string | null;
  copiedId: string | null;
}

const BoardView: React.FC<BoardViewProps> = ({
  unassignedTasks,
  myTasks,
  completedTasks,
  hasMultipleUsers,
  userDisplay,
  devHours,
  serviceHours,
  totalHours,
  unassignedColumnName,
  onOpenTask,
  onOpenCodeLink,
  getTaskManagerUrl,
  copiedId,
}) => {
  const devTasks = useMemo(() => {
    const dev = myTasks.filter((t) => !isServiceTaskItem(t));
    return [...dev].sort((a, b) => {
      const aCrit = a.isCritical ? 1 : 0;
      const bCrit = b.isCritical ? 1 : 0;
      if (bCrit !== aCrit) return bCrit - aCrit;
      return comparePlanOrder(a, b);
    });
  }, [myTasks]);

  const sortedServiceTasks = useMemo(() => {
    const srv = myTasks.filter((t) => isServiceTaskItem(t));
    return [...srv].sort((a, b) => {
      const aCrit = a.isCritical ? 1 : 0;
      const bCrit = b.isCritical ? 1 : 0;
      if (bCrit !== aCrit) return bCrit - aCrit;
      return comparePlanOrder(a, b);
    });
  }, [myTasks]);

  const unassignedHours = useMemo(() => {
    return unassignedTasks.reduce((acc, t) => acc + (t.totalHours || 0), 0);
  }, [unassignedTasks]);

  const computedDevHours = useMemo(() => {
    return devTasks.reduce((acc, t) => acc + (t.totalHours || 0), 0);
  }, [devTasks]);

  const computedServiceHours = useMemo(() => {
    return sortedServiceTasks.reduce((acc, t) => acc + (t.totalHours || 0), 0);
  }, [sortedServiceTasks]);

  const completedHours = useMemo(() => {
    return completedTasks.reduce((acc, t) => acc + (t.totalHours || 0), 0);
  }, [completedTasks]);

  const effectiveTotalHours = computedDevHours + computedServiceHours;

  return (
    <div>
      {/* Board Summary Info Bar: generous indentation and larger margin bottom */}
      <div className="flex items-center gap-2.5 text-xs text-gray-400 select-none px-2 mb-7">
        {userDisplay && <span className="text-gray-200 font-bold tracking-wide">{userDisplay}</span>}
        {userDisplay && <span className="text-gray-600">•</span>}
        <span className="text-gray-300 font-semibold">{effectiveTotalHours}h celkem</span>
        {(computedDevHours > 0 || computedServiceHours > 0) && (
          <span className="text-gray-400 font-mono text-[11px]">
            (Vývoj: {computedDevHours}h, Servis: {computedServiceHours}h)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7 xl:gap-8 items-start">
        {/* Sloupec 1: Nepřiřazené úkoly */}
        <div className="flex flex-col gap-3 min-h-[350px]">
          <div className="flex items-center justify-between pb-1 select-none">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-amber-400">hourglass_empty</span>
              <span className="text-xs font-bold text-white tracking-wide">{unassignedColumnName}</span>
            </div>
            <span className="text-xs font-mono font-semibold text-gray-400">
              {unassignedTasks.length} ({unassignedHours}h)
            </span>
          </div>

          <div className="space-y-2 flex-1">
            {unassignedTasks.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-500 italic text-center">
                Žádné nezařazené úkoly
              </div>
            ) : (
              unassignedTasks.map((task) => (
                <TaskCard
                  key={`board-unassigned-${task.taskId}`}
                  task={task}
                  onOpenTask={onOpenTask}
                  onOpenCodeLink={onOpenCodeLink}
                  getTaskManagerUrl={getTaskManagerUrl}
                  isCopied={copiedId === task.taskId}
                  showAssignee={true}
                />
              ))
            )}
          </div>
        </div>

        {/* Sloupec 2: Úkoly (Vývoj & obecné úkoly) */}
        <div className="flex flex-col gap-3 min-h-[350px]">
          <div className="flex items-center justify-between pb-1 select-none">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-indigo-400">code</span>
              <span className="text-xs font-bold text-white tracking-wide">Úkoly</span>
            </div>
            <span className="text-xs font-mono font-semibold text-indigo-300">
              {devTasks.length} ({computedDevHours}h)
            </span>
          </div>

          <div className="space-y-2 flex-1">
            {devTasks.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-500 italic text-center">
                Nemáte žádné aktivní úkoly
              </div>
            ) : (
              devTasks.map((task) => (
                <TaskCard
                  key={`board-my-${task.taskId}`}
                  task={task}
                  onOpenTask={onOpenTask}
                  onOpenCodeLink={onOpenCodeLink}
                  getTaskManagerUrl={getTaskManagerUrl}
                  isCopied={copiedId === task.taskId}
                  showAssignee={hasMultipleUsers}
                />
              ))
            )}
          </div>
        </div>

        {/* Sloupec 3: Servis (seřazený: nejdříve kritické a pak ostatní dle pořadí z plánu) */}
        <div className="flex flex-col gap-3 min-h-[350px]">
          <div className="flex items-center justify-between pb-1 select-none">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-purple-400">build</span>
              <span className="text-xs font-bold text-white tracking-wide">Servis</span>
            </div>
            <span className="text-xs font-mono font-semibold text-purple-300">
              {sortedServiceTasks.length} ({computedServiceHours}h)
            </span>
          </div>

          <div className="space-y-2 flex-1">
            {sortedServiceTasks.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-500 italic text-center">
                Žádné servisní úkoly
              </div>
            ) : (
              sortedServiceTasks.map((task) => (
                <TaskCard
                  key={`board-service-${task.taskId}`}
                  task={task}
                  onOpenTask={onOpenTask}
                  onOpenCodeLink={onOpenCodeLink}
                  getTaskManagerUrl={getTaskManagerUrl}
                  isCopied={copiedId === task.taskId}
                  showAssignee={hasMultipleUsers}
                />
              ))
            )}
          </div>
        </div>

        {/* Sloupec 4: Splněné úkoly */}
        <div className="flex flex-col gap-3 min-h-[350px]">
          <div className="flex items-center justify-between pb-1 select-none">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
              <span className="text-xs font-bold text-white tracking-wide">Splněné úkoly</span>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-300">
              {completedTasks.length} ({completedHours}h)
            </span>
          </div>

          <div className="space-y-2 flex-1">
            {completedTasks.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-500 italic text-center">
                Zatím žádné splněné úkoly v rozvrhu
              </div>
            ) : (
              completedTasks.map((task) => (
                <TaskCard
                  key={`board-completed-${task.taskId}`}
                  task={task}
                  onOpenTask={onOpenTask}
                  onOpenCodeLink={onOpenCodeLink}
                  getTaskManagerUrl={getTaskManagerUrl}
                  isCopied={copiedId === task.taskId}
                  isCompletedView={true}
                  showAssignee={hasMultipleUsers}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* ========================================================================= */
/* TAB 2: TIMELINE GRID VIEW (Po-Pá: Přepínač Den / Týden, 40h kapacita)     */
/* ========================================================================= */
interface TimelineGridViewProps {
  days: PlanDayInfo[];
  tasks: PlanTaskItem[];
  timeProgressPercent: number;
  currentTimeLabel: string;
  currentTime: Date;
  planSettings?: MagicPlanSettings;
  distinctUsers?: string[];
  currentUser?: string;
  currentUserDisplayName?: string;
  availablePersons?: PlanPersonInfo[];
  userColumns?: string[];
  onUpdateUserColumns?: (newCols: string[], newCurrentUser?: string) => Promise<void>;
  filterMyOverflow?: boolean;
  showOnlyMyTasks?: boolean;
  searchQuery?: string;
  onOpenTask: (task: PlanTaskItem) => void;
  onOpenCodeLink: (code: string, task: PlanTaskItem, e?: React.MouseEvent) => void;
  getTaskManagerUrl: (code?: string) => string | null;
  copiedId: string | null;
  onUpdateWorkHours?: (newStart: string, newEnd: string) => void;
  primaryColor?: string;
  actionsColor?: string;
}

interface TimelineScheduledBlock {
  id: string;
  task: PlanTaskItem;
  isService: boolean;
  isNotAvailable?: boolean;
  isCompleted?: boolean;
  isCritical?: boolean;
  dayIndex: number; // 0 to 4
  startCol: number; // 1-indexed CSS grid
  spanCols: number;
  chunkHours: number;
  totalHours: number;
  partIndex: number;
  totalParts: number;
  isSplit: boolean;
  isOverflowPart?: boolean;
}

interface UserScheduleResult {
  userName: string;
  initials: string;
  scheduledBlocks: TimelineScheduledBlock[];
  weekMergedBlocks: TimelineScheduledBlock[];
  overflowTasks: { task: PlanTaskItem; remainingHours: number }[];
  freeSlots: { dayIndex: number; startCol: number; spanCols: number; freeHours: number }[];
  dayCapacities: {
    dayIndex: number;
    date: string;
    dayLabel: string;
    isToday: boolean;
    naHours: number;
    completedHours: number;
    serviceHours: number;
    availableDevHours: number;
    totalCapacity: number;
  }[];
}

const isServiceTaskItem = (t: PlanTaskItem): boolean => {
  if (t.isNotAvailable) return false;
  if (t.taskType === 'dev') return false;
  if (t.taskType === 'service') return true;
  const str = `${t.title} ${t.customName || ''} ${t.project || ''}`.toLowerCase();
  return str.includes('servis') || str.includes('hd') || str.includes('support');
};

const calculateScheduleForTasks = (
  userTasks: PlanTaskItem[],
  days: PlanDayInfo[],
  todayIdx: number,
  totalDayHours: number
) => {
  const SLOTS_PER_HOUR = 2;
  const totalDaySlots = totalDayHours * SLOTS_PER_HOUR;

  // 1. Vyzobání všech požadavků a duplicit ve sloupci (rozkouskovaný úkol do jednoho záznamu)
  const naTasks: PlanTaskItem[] = [];
  const normalTasksMap = new Map<string, { task: PlanTaskItem; order: number }>();
  let taskOrderCounter = 0;

  for (const t of [...userTasks].sort(comparePlanOrder)) {
    if (t.isNotAvailable) {
      naTasks.push({ ...t, dates: t.dates ? [...t.dates] : [] });
      continue;
    }

    const key = t.taskId || `${t.taskIdentifier || ''}-${t.requirementId || ''}-${t.title}`;
    const existing = normalTasksMap.get(key);
    if (!existing) {
      normalTasksMap.set(key, {
        task: {
          ...t,
          dates: t.dates ? [...t.dates] : [],
        },
        order: taskOrderCounter++,
      });
    } else {
      const et = existing.task;
      // Sjednotíme rozkouskovaný úkol do jednoho záznamu s plným počtem hodin
      if (t.totalHours > et.totalHours) {
        et.totalHours = t.totalHours;
      }
      if (typeof t.topPx === 'number') {
        if (typeof et.topPx !== 'number' || t.topPx < et.topPx) {
          et.topPx = t.topPx;
        }
      }
      if (t.isCritical) et.isCritical = true;
      if (t.isCompleted) et.isCompleted = true;
      if (t.isSolved) et.isSolved = true;
      if (t.isGodday) et.isGodday = true;
      if (!et.requirementId && t.requirementId) et.requirementId = t.requirementId;
      if (!et.taskIdentifier && t.taskIdentifier) et.taskIdentifier = t.taskIdentifier;
      if (!et.project && t.project) et.project = t.project;
      if (!et.author && t.author) et.author = t.author;
      if (!et.customName && t.customName) et.customName = t.customName;
      if (!et.url && t.url) et.url = t.url;
      if (t.dates) {
        for (const d of t.dates) {
          if (!et.dates.includes(d)) et.dates.push(d);
        }
      }
    }
  }

  const deduplicatedTasks = Array.from(normalTasksMap.values())
    .map((item) => item.task)
    .sort(comparePlanOrder);

  // Rozdělení deduplikovaných úkolů:
  const compTasks = deduplicatedTasks
    .filter((t) => t.isCompleted || t.isSolved)
    .sort(comparePlanOrder);

  const activeDevTasks = deduplicatedTasks.filter(
    (t) => !t.isCompleted && !t.isSolved && !isServiceTaskItem(t)
  );
  const activeServiceTasks = deduplicatedTasks.filter(
    (t) => !t.isCompleted && !t.isSolved && isServiceTaskItem(t)
  );

  // Řazení: dle kritické závažnosti, pak podle přirozeného pořadí jak přišly z plánu (comparePlanOrder)
  const critDevTasks = activeDevTasks.filter((t) => t.isCritical).sort(comparePlanOrder);
  const normDevTasks = activeDevTasks.filter((t) => !t.isCritical).sort(comparePlanOrder);
  const critServiceTasks = activeServiceTasks.filter((t) => t.isCritical).sort(comparePlanOrder);
  const normServiceTasks = activeServiceTasks.filter((t) => !t.isCritical).sort(comparePlanOrder);

  const sortedDevTasks = [...critDevTasks, ...normDevTasks];
  const sortedServiceTasks = [...critServiceTasks, ...normServiceTasks];

  // Mapování NA bloků na konkrétní dny
  const dayNA = new Map<number, PlanTaskItem[]>();
  for (let i = 0; i < 5; i++) dayNA.set(i, []);
  for (const na of naTasks) {
    if (na.dates && na.dates.length > 0) {
      for (const dStr of na.dates) {
        const idx = days.findIndex((d) => d.date === dStr);
        if (idx !== -1 && idx < 5) {
          dayNA.get(idx)?.push(na);
        }
      }
    }
  }

  const blocks: TimelineScheduledBlock[] = [];

  // Alokace NA bloků na jejich dny (pevně dané na začátek dne)
  for (let d = 0; d < 5; d++) {
    const naList = dayNA.get(d) || [];
    let slotInDay = 0;
    for (const na of naList) {
      let naH = na.totalHours > 0 ? na.totalHours : totalDayHours;
      if (naH > 4) {
        naH = totalDayHours;
      }
      const spanCols = Math.min(totalDaySlots - slotInDay, Math.max(1, Math.round(naH * SLOTS_PER_HOUR)));
      const chunkHours = spanCols / SLOTS_PER_HOUR;
      if (spanCols > 0) {
        blocks.push({
          id: `na-${na.taskId}-d${d}`,
          task: na,
          isService: false,
          isNotAvailable: true,
          isCompleted: false,
          isCritical: false,
          dayIndex: d,
          startCol: d * totalDaySlots + slotInDay + 1,
          spanCols,
          chunkHours,
          totalHours: naH,
          partIndex: 1,
          totalParts: 1,
          isSplit: false,
        });
        slotInDay += spanCols;
      }
    }
  }

  // 2. Předchozí dny: za sebou plní zpracované požadavky do aktuálního dne
  const maxCompDay = todayIdx !== -1 ? todayIdx - 1 : -1;
  let compDay = 0;
  for (const comp of compTasks) {
    if (compDay > maxCompDay) break;
    let compHoursRemaining = comp.totalHours > 0 ? comp.totalHours : 1;
    let compPart = 1;

    while (compHoursRemaining > 0 && compDay <= maxCompDay) {
      const usedOnTarget = blocks
        .filter((b) => b.dayIndex === compDay)
        .reduce((s, b) => s + b.spanCols, 0);
      const availableOnTarget = totalDaySlots - usedOnTarget;
      if (availableOnTarget <= 0) {
        compDay++;
        continue;
      }
      const remainingSlots = Math.round(compHoursRemaining * SLOTS_PER_HOUR);
      const spanCols = Math.min(availableOnTarget, remainingSlots);
      const chunkHours = spanCols / SLOTS_PER_HOUR;
      const startCol = compDay * totalDaySlots + usedOnTarget + 1;
      blocks.push({
        id: `comp-${comp.taskId}-d${compDay}-p${compPart}`,
        task: comp,
        isService: false,
        isNotAvailable: false,
        isCompleted: true,
        isCritical: comp.isCritical,
        dayIndex: compDay,
        startCol,
        spanCols,
        chunkHours,
        totalHours: comp.totalHours > 0 ? comp.totalHours : chunkHours,
        partIndex: compPart,
        totalParts: 1,
        isSplit: false,
        isOverflowPart: compPart > 1,
      });
      compHoursRemaining = Math.max(0, Math.round((compHoursRemaining - chunkHours) * 10) / 10);
      compPart++;
      if (compHoursRemaining > 0) {
        compDay++;
      }
    }
  }

  // Příprava front pro aktivní úkoly
  interface TaskQueueItem {
    task: PlanTaskItem;
    remainingHours: number;
    part: number;
  }

  const devQueue: TaskQueueItem[] = sortedDevTasks.map((t) => ({
    task: t,
    remainingHours: t.totalHours > 0 ? t.totalHours : 1,
    part: 1,
  }));

  const serviceQueue: TaskQueueItem[] = sortedServiceTasks.map((t) => ({
    task: t,
    remainingHours: t.totalHours > 0 ? t.totalHours : 1,
    part: 1,
  }));

  // 3. & 4. Aktuální den (todayIdx)
  if (todayIdx >= 0 && todayIdx < 5) {
    const usedNaSlots = blocks
      .filter((b) => b.dayIndex === todayIdx)
      .reduce((s, b) => s + b.spanCols, 0);
    const availableTotalSlots = Math.max(0, totalDaySlots - usedNaSlots);
    const availableTotalHours = availableTotalSlots / SLOTS_PER_HOUR;

    // Pravidlo servisu v aktuálním dni:
    // Max 3h servisu, pokud je dev >= 5h. Pokud má dev méně, zbytek kapacity se doplní servisem od konce dne.
    const standardDevCap = Math.max(0, availableTotalHours - 3); // 5h při 8h dni
    const totalDevNeeded = devQueue.reduce((s, q) => s + q.remainingHours, 0);
    const totalServiceNeeded = serviceQueue.reduce((s, q) => s + q.remainingHours, 0);

    const plannedDevHours = Math.min(standardDevCap, totalDevNeeded);
    const unusedDevHours = Math.max(0, standardDevCap - plannedDevHours);
    const maxServiceHoursForToday = Math.min(availableTotalHours - plannedDevHours, 3 + unusedDevHours);

    const targetServiceHours = Math.min(maxServiceHoursForToday, totalServiceNeeded);
    const targetServiceSlots = Math.round(targetServiceHours * SLOTS_PER_HOUR);

    if (targetServiceSlots > 0) {
      let srvSlotInDay = totalDaySlots - targetServiceSlots;
      for (const q of serviceQueue) {
        if (srvSlotInDay >= totalDaySlots) break;
        if (q.remainingHours <= 0) continue;

        const slotsLeft = totalDaySlots - srvSlotInDay;
        const maxH = slotsLeft / SLOTS_PER_HOUR;
        const chunkH = Math.min(maxH, q.remainingHours);
        const spanCols = Math.round(chunkH * SLOTS_PER_HOUR);
        const actualChunkH = spanCols / SLOTS_PER_HOUR;

        blocks.push({
          id: `service-${q.task.taskId}-d${todayIdx}-p${q.part}`,
          task: q.task,
          isService: true,
          isCritical: q.task.isCritical,
          dayIndex: todayIdx,
          startCol: todayIdx * totalDaySlots + srvSlotInDay + 1,
          spanCols,
          chunkHours: actualChunkH,
          totalHours: q.task.totalHours || actualChunkH,
          partIndex: q.part,
          totalParts: 1,
          isSplit: false,
          isOverflowPart: q.part > 1,
        });

        srvSlotInDay += spanCols;
        q.remainingHours = Math.max(0, Math.round((q.remainingHours - actualChunkH) * 10) / 10);
        q.part++;
      }
    }

    // 4. Aktualni den: Ze zbyleho casu odecteni servisu vlozim vyvojove ukoly
    let devSlotInDay = usedNaSlots;
    const devMaxSlotInDay = totalDaySlots - targetServiceSlots;

    for (const q of devQueue) {
      if (devSlotInDay >= devMaxSlotInDay) break;
      if (q.remainingHours <= 0) continue;

      const slotsLeft = devMaxSlotInDay - devSlotInDay;
      const maxH = slotsLeft / SLOTS_PER_HOUR;
      const chunkH = Math.min(maxH, q.remainingHours);
      const spanCols = Math.round(chunkH * SLOTS_PER_HOUR);
      const actualChunkH = spanCols / SLOTS_PER_HOUR;

      blocks.push({
        id: `${q.task.taskId}-d${todayIdx}-p${q.part}`,
        task: q.task,
        isService: false,
        isCritical: q.task.isCritical,
        dayIndex: todayIdx,
        startCol: todayIdx * totalDaySlots + devSlotInDay + 1,
        spanCols,
        chunkHours: actualChunkH,
        totalHours: q.task.totalHours || actualChunkH,
        partIndex: q.part,
        totalParts: 1,
        isSplit: false,
        isOverflowPart: q.part > 1,
      });

      devSlotInDay += spanCols;
      q.remainingHours = Math.max(0, Math.round((q.remainingHours - actualChunkH) * 10) / 10);
      q.part++;
    }
  }

  // 5. Následující dny:
  // Do zbylých dnů vkládáme od rána do odpoledne v pořadí:
  // 1) kritické vývojové
  // 2) kritické servisní
  // 3) nekritické vývojové
  // 4) nekritické servisní
  // vždy dle pořadí jak přišly z plánu
  const subsequentQueue: TaskQueueItem[] = [
    ...devQueue.filter((q) => q.task.isCritical && q.remainingHours > 0),
    ...serviceQueue.filter((q) => q.task.isCritical && q.remainingHours > 0),
    ...devQueue.filter((q) => !q.task.isCritical && q.remainingHours > 0),
    ...serviceQueue.filter((q) => !q.task.isCritical && q.remainingHours > 0),
  ];

  const firstSubsequentDay = todayIdx !== -1 ? todayIdx + 1 : 0;
  for (let d = firstSubsequentDay; d < 5; d++) {
    const usedNa = blocks
      .filter((b) => b.dayIndex === d)
      .reduce((s, b) => s + b.spanCols, 0);
    let slotInDay = usedNa;

    for (const q of subsequentQueue) {
      if (slotInDay >= totalDaySlots) break;
      if (q.remainingHours <= 0) continue;

      const slotsLeft = totalDaySlots - slotInDay;
      const maxH = slotsLeft / SLOTS_PER_HOUR;
      const chunkH = Math.min(maxH, q.remainingHours);
      const spanCols = Math.round(chunkH * SLOTS_PER_HOUR);
      const actualChunkH = spanCols / SLOTS_PER_HOUR;
      const isSrv = isServiceTaskItem(q.task);

      blocks.push({
        id: `${isSrv ? 'service-' : ''}${q.task.taskId}-d${d}-p${q.part}`,
        task: q.task,
        isService: isSrv,
        isCritical: q.task.isCritical,
        dayIndex: d,
        startCol: d * totalDaySlots + slotInDay + 1,
        spanCols,
        chunkHours: actualChunkH,
        totalHours: q.task.totalHours || actualChunkH,
        partIndex: q.part,
        totalParts: 1,
        isSplit: false,
        isOverflowPart: q.part > 1,
      });

      slotInDay += spanCols;
      q.remainingHours = Math.max(0, Math.round((q.remainingHours - actualChunkH) * 10) / 10);
      q.part++;
    }
  }

  // Overflow tasks (zbylé úkoly, které se nevešly do týdne)
  const overflowTasks: { task: PlanTaskItem; remainingHours: number }[] = [];
  for (const q of subsequentQueue) {
    if (q.remainingHours > 0) {
      overflowTasks.push({
        task: q.task,
        remainingHours: q.remainingHours,
      });
    }
  }

  // Určení celkového počtu částí (totalParts) a isSplit pro každý úkol
  const taskPartsCount = new Map<string, number>();
  for (const b of blocks) {
    taskPartsCount.set(b.task.taskId, (taskPartsCount.get(b.task.taskId) || 0) + 1);
  }
  for (const b of blocks) {
    const partsTotal = taskPartsCount.get(b.task.taskId) || 1;
    const hasOverflow = overflowTasks.some((o) => o.task.taskId === b.task.taskId);
    if (partsTotal > 1 || hasOverflow) {
      b.isSplit = true;
      b.totalParts = partsTotal + (hasOverflow ? 1 : 0);
    }
  }

  // Free capacity slots (přesné určení mezer v mřížce pro každý den)
  const freeSlots: { dayIndex: number; startCol: number; spanCols: number; freeHours: number }[] = [];
  for (let d = 0; d < 5; d++) {
    const occupied = new Array(totalDaySlots).fill(false);
    for (const b of blocks) {
      if (b.dayIndex === d) {
        const localStart = b.startCol - 1 - d * totalDaySlots;
        for (let s = localStart; s < localStart + b.spanCols && s < totalDaySlots; s++) {
          occupied[s] = true;
        }
      }
    }

    let gapStart = -1;
    for (let s = 0; s < totalDaySlots; s++) {
      if (!occupied[s]) {
        if (gapStart === -1) gapStart = s;
      } else {
        if (gapStart !== -1) {
          const spanCols = s - gapStart;
          freeSlots.push({
            dayIndex: d,
            startCol: d * totalDaySlots + gapStart + 1,
            spanCols,
            freeHours: spanCols / SLOTS_PER_HOUR,
          });
          gapStart = -1;
        }
      }
    }
    if (gapStart !== -1) {
      const spanCols = totalDaySlots - gapStart;
      freeSlots.push({
        dayIndex: d,
        startCol: d * totalDaySlots + gapStart + 1,
        spanCols,
        freeHours: spanCols / SLOTS_PER_HOUR,
      });
    }
  }

  // Merged contiguous blocks of the same task for week view
  const weekMergedBlocks: TimelineScheduledBlock[] = [];
  const sortedBlocks = [...blocks].sort((a, b) => a.startCol - b.startCol);
  for (const block of sortedBlocks) {
    const prev = weekMergedBlocks[weekMergedBlocks.length - 1];
    if (
      prev &&
      prev.task.taskId === block.task.taskId &&
      prev.isService === block.isService &&
      !prev.isNotAvailable &&
      !block.isNotAvailable &&
      Boolean(prev.isCompleted) === Boolean(block.isCompleted) &&
      Boolean(prev.isCritical) === Boolean(block.isCritical) &&
      prev.startCol + prev.spanCols === block.startCol
    ) {
      prev.spanCols += block.spanCols;
      prev.chunkHours += block.chunkHours;
      prev.isSplit = block.totalHours > prev.chunkHours;
    } else {
      weekMergedBlocks.push({ ...block });
    }
  }

  // Určení partIndex, totalParts a isSplit pro týdenní bloky (včetně přetečení do dalšího týdne či rozdělení servisem)
  const weekTaskBlocksMap = new Map<string, TimelineScheduledBlock[]>();
  for (const wb of weekMergedBlocks) {
    if (!wb.isNotAvailable) {
      const list = weekTaskBlocksMap.get(wb.task.taskId) || [];
      list.push(wb);
      weekTaskBlocksMap.set(wb.task.taskId, list);
    }
  }

  for (const [taskId, tBlocks] of weekTaskBlocksMap.entries()) {
    const hasOverflow = overflowTasks.some((o) => o.task.taskId === taskId);
    const totalParts = tBlocks.length + (hasOverflow ? 1 : 0);
    const isSplit = totalParts > 1;
    tBlocks.forEach((tb, idx) => {
      tb.partIndex = idx + 1;
      tb.totalParts = totalParts;
      tb.isSplit = isSplit;
    });
  }

  const dayCapacities = days.slice(0, 5).map((day, dIdx) => {
    const dayBlocks = blocks.filter((b) => b.dayIndex === dIdx);
    const naHours = dayBlocks.filter((b) => b.isNotAvailable).reduce((s, b) => s + b.chunkHours, 0);
    const compHours = dayBlocks.filter((b) => b.isCompleted).reduce((s, b) => s + b.chunkHours, 0);
    const srvHours = dayBlocks.filter((b) => b.isService).reduce((s, b) => s + b.chunkHours, 0);
    const devH = dayBlocks
      .filter((b) => !b.isNotAvailable && !b.isCompleted && !b.isService)
      .reduce((s, b) => s + b.chunkHours, 0);

    return {
      dayIndex: dIdx,
      date: day.date,
      dayLabel: day.dayLabel,
      isToday: day.isToday,
      naHours,
      completedHours: compHours,
      serviceHours: srvHours,
      availableDevHours: devH,
      totalCapacity: totalDayHours,
    };
  });

  return {
    scheduledBlocks: blocks,
    weekMergedBlocks,
    overflowTasks,
    freeSlots,
    dayCapacities,
  };
};

const isTaskMatchingQuery = (t: PlanTaskItem, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const titleMatch = (t.title || '').toLowerCase().includes(q);
  const customMatch = (t.customName || '').toLowerCase().includes(q);
  const reqMatch = (t.requirementId || '').toLowerCase().includes(q);
  const taskMatch = (t.taskIdentifier || '').toLowerCase().includes(q);
  const projMatch = (t.project || '').toLowerCase().includes(q);
  const authorMatch = (t.author || '').toLowerCase().includes(q);
  const userMatch = (t.userName || '').toLowerCase().includes(q);
  return Boolean(titleMatch || customMatch || reqMatch || taskMatch || projMatch || authorMatch || userMatch);
};

const TimelineGridView: React.FC<TimelineGridViewProps> = ({
  days,
  tasks,
  currentTimeLabel,
  currentTime,
  planSettings,
  distinctUsers,
  currentUser,
  currentUserDisplayName,
  availablePersons = [],
  userColumns = [],
  onUpdateUserColumns,
  filterMyOverflow,
  showOnlyMyTasks,
  searchQuery,
  onOpenTask,
  onOpenCodeLink,
  getTaskManagerUrl,
  copiedId,
  onUpdateWorkHours,
  primaryColor,
  actionsColor,
}) => {
  const devColor = hexToRgba(primaryColor, '#6366f1', 0.7);
  const serviceColor = hexToRgba(actionsColor, '#a855f7', 0.7);
  const isCompact = Boolean(planSettings?.compactDayView);

  const [openUserMenuIdx, setOpenUserMenuIdx] = useState<number | null>(null);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setOpenUserMenuIdx(null);
      }
    };
    if (openUserMenuIdx !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openUserMenuIdx]);

  // Mode switcher: 'day' (výsek na vybraný den na celou šířku) vs 'week' (celý týden)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Today index (0 = Po ... 4 = Pá)
  const todayIdx = useMemo(() => {
    const idx = days.findIndex((d) => d.isToday);
    if (idx !== -1) return idx;
    const day = currentTime.getDay();
    return day === 0 || day === 6 ? 4 : 0;
  }, [days, currentTime]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() =>
    todayIdx !== -1 ? todayIdx : (currentTime.getDay() === 0 || currentTime.getDay() === 6 ? 4 : 0)
  );

  // Automatically update selectedDayIndex when calendar day rolls over (e.g. across midnight or window focus)
  const prevTodayIdxRef = useRef(todayIdx);
  useEffect(() => {
    if (prevTodayIdxRef.current !== todayIdx) {
      prevTodayIdxRef.current = todayIdx;
      if (todayIdx !== -1) {
        setSelectedDayIndex(todayIdx);
      }
    }
  }, [todayIdx]);

  // Hover state for custom tooltip in week view
  const [hoveredTask, setHoveredTask] = useState<{
    block: TimelineScheduledBlock;
    rect: DOMRect;
  } | null>(null);

  // Safe viewport positioning for the week view tooltip
  const tooltipPosition = useMemo(() => {
    if (!hoveredTask) return null;
    const padding = 16;
    const approxWidth = 280;
    const approxHeight = 160;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800;

    // Center horizontally around the hovered block
    const targetCenter = hoveredTask.rect.left + hoveredTask.rect.width / 2;
    // Clamp center so the tooltip width doesn't exceed screen left or right boundaries
    const clampedX = Math.max(
      approxWidth / 2 + padding,
      Math.min(winW - approxWidth / 2 - padding, targetCenter)
    );

    // If showing below target exceeds viewport height, show above target
    const showAbove =
      hoveredTask.rect.bottom + approxHeight + padding > winH &&
      hoveredTask.rect.top - approxHeight - padding > 0;
    const y = showAbove ? hoveredTask.rect.top - 10 : hoveredTask.rect.bottom + 10;
    const translateY = showAbove ? '-100%' : '0%';

    return {
      left: clampedX,
      top: y,
      translateY,
    };
  }, [hoveredTask]);

  // Parse start and end hour for workday (standard: 09:00 to 17:00, or user custom from settings)
  const { startHour, endHour, startTimeLabel, endTimeLabel } = useMemo(() => {
    const mode = planSettings?.timelineTimeMode || 'real8h';
    if (mode === 'custom' && planSettings?.timelineCustomStart && planSettings?.timelineCustomEnd) {
      const [sH, sM] = planSettings.timelineCustomStart.split(':').map((x: string) => parseInt(x, 10) || 0);
      const [eH, eM] = planSettings.timelineCustomEnd.split(':').map((x: string) => parseInt(x, 10) || 0);
      const s = sH + sM / 60;
      const e = eH + eM / 60;
      if (e > s) {
        return {
          startHour: s,
          endHour: e,
          startTimeLabel: planSettings.timelineCustomStart,
          endTimeLabel: planSettings.timelineCustomEnd,
        };
      }
    }
    return {
      startHour: 9,
      endHour: 17,
      startTimeLabel: '09:00',
      endTimeLabel: '17:00',
    };
  }, [planSettings?.timelineTimeMode, planSettings?.timelineCustomStart, planSettings?.timelineCustomEnd]);

  // The timeline ALWAYS has 8 dílků (each dílek = 1h from item, 8h capacity total per day)
  const totalDayHours = 8;
  const SLOTS_PER_HOUR = 2;
  const totalDaySlots = totalDayHours * SLOTS_PER_HOUR;
  const totalWeekColumns = 40;
  const totalWeekSlots = totalDaySlots * 5;

  // 8 slot markers for the day
  const daySlotMarkers = useMemo(() => {
    return [
      `${startTimeLabel} 1h`,
      '2h',
      '3h',
      '4h',
      '5h',
      '6h',
      '7h',
      `8h ${endTimeLabel}`,
    ];
  }, [startTimeLabel, endTimeLabel]);

  // Inline work hours editing (Day view header)
  const [isEditingStart, setIsEditingStart] = useState(false);
  const [tempStart, setTempStart] = useState(startTimeLabel);
  const [isEditingEnd, setIsEditingEnd] = useState(false);
  const [tempEnd, setTempEnd] = useState(endTimeLabel);

  useEffect(() => {
    if (!isEditingStart) setTempStart(startTimeLabel);
  }, [startTimeLabel, isEditingStart]);

  useEffect(() => {
    if (!isEditingEnd) setTempEnd(endTimeLabel);
  }, [endTimeLabel, isEditingEnd]);

  const handleCommitStart = useCallback(
    (valueToCommit?: string) => {
      setIsEditingStart(false);
      const val = (valueToCommit ?? tempStart).trim();
      if (!val || !/^\d{1,2}:\d{2}$/.test(val)) {
        setTempStart(startTimeLabel);
        return;
      }
      const [h, m] = val.split(':').map((x) => parseInt(x, 10) || 0);
      const formattedStart = `${String(Math.min(23, Math.max(0, h))).padStart(2, '0')}:${String(Math.min(59, Math.max(0, m))).padStart(2, '0')}`;

      const [eH, eM] = endTimeLabel.split(':').map((x) => parseInt(x, 10) || 0);
      const startDec = h + m / 60;
      const endDec = eH + eM / 60;
      let formattedEnd = endTimeLabel;
      if (startDec >= endDec) {
        const newEndH = Math.min(23, h + 8);
        formattedEnd = `${String(newEndH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      onUpdateWorkHours?.(formattedStart, formattedEnd);
    },
    [tempStart, startTimeLabel, endTimeLabel, onUpdateWorkHours]
  );

  const handleCommitEnd = useCallback(
    (valueToCommit?: string) => {
      setIsEditingEnd(false);
      const val = (valueToCommit ?? tempEnd).trim();
      if (!val || !/^\d{1,2}:\d{2}$/.test(val)) {
        setTempEnd(endTimeLabel);
        return;
      }
      const [h, m] = val.split(':').map((x) => parseInt(x, 10) || 0);
      const formattedEnd = `${String(Math.min(23, Math.max(0, h))).padStart(2, '0')}:${String(Math.min(59, Math.max(0, m))).padStart(2, '0')}`;

      const [sH, sM] = startTimeLabel.split(':').map((x) => parseInt(x, 10) || 0);
      const startDec = sH + sM / 60;
      const endDec = h + m / 60;
      let formattedStart = startTimeLabel;
      if (endDec <= startDec) {
        const newStartH = Math.max(0, h - 8);
        formattedStart = `${String(newStartH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      onUpdateWorkHours?.(formattedStart, formattedEnd);
    },
    [tempEnd, startTimeLabel, endTimeLabel, onUpdateWorkHours]
  );

  // Realtime progress fraction according to custom start & end time
  const timeProgressFraction = useMemo(() => {
    const currentHourDec =
      currentTime.getHours() +
      currentTime.getMinutes() / 60 +
      currentTime.getSeconds() / 3600;
    const span = Math.max(0.0001, endHour - startHour);
    return Math.max(0, Math.min(1, (currentHourDec - startHour) / span));
  }, [currentTime, startHour, endHour]);

  const isWeekendNow = useMemo(() => {
    const day = currentTime.getDay();
    return day === 0 || day === 6;
  }, [currentTime]);

  const weekTimeIndicatorPercent = useMemo(() => {
    if (todayIdx === -1 || isWeekendNow) return null;
    const colPosition = todayIdx * 8 + timeProgressFraction * 8;
    return Math.max(0, Math.min(100, (colPosition / 40) * 100));
  }, [todayIdx, timeProgressFraction, isWeekendNow]);

  const dayTimeIndicatorPercent = useMemo(() => {
    if (todayIdx === -1 || selectedDayIndex !== todayIdx || isWeekendNow) return null;
    return Math.max(0, Math.min(100, timeProgressFraction * 100));
  }, [todayIdx, selectedDayIndex, timeProgressFraction, isWeekendNow]);

  const currentIndicatorPercent = viewMode === 'day' ? dayTimeIndicatorPercent : weekTimeIndicatorPercent;

  const pillAlignment = useMemo((): 'start' | 'end' | 'center' => {
    if (currentIndicatorPercent === null) return 'center';
    if (currentIndicatorPercent <= 0.5) return 'start';
    if (currentIndicatorPercent >= 99.5) return 'end';
    return 'center';
  }, [currentIndicatorPercent]);

  // Multi-user schedules: ALWAYS keep complete view of all tracked users
  const activeUsers = useMemo(() => {
    if (distinctUsers && distinctUsers.length > 0) return distinctUsers;
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.userName?.trim()) set.add(t.userName.trim());
    }
    return Array.from(set);
  }, [distinctUsers, tasks]);

  const handleMoveUser = useCallback(
    async (fromIdx: number, toIdx: number) => {
      if (!onUpdateUserColumns) return;
      const currentList = userColumns.length > 0 ? [...userColumns] : [...activeUsers];
      if (fromIdx < 0 || fromIdx >= currentList.length || toIdx < 0 || toIdx >= currentList.length) return;
      const item = currentList.splice(fromIdx, 1)[0];
      currentList.splice(toIdx, 0, item);
      await onUpdateUserColumns(currentList);
    },
    [onUpdateUserColumns, userColumns, activeUsers]
  );

  const handleToggleMe = useCallback(
    async (uIdx: number, currentlyIsMe: boolean, userName: string) => {
      if (!onUpdateUserColumns) return;
      const currentList = userColumns.length > 0 ? [...userColumns] : [...activeUsers];
      if (currentlyIsMe) {
        await onUpdateUserColumns(currentList, '');
      } else {
        const targetPerson = availablePersons.find((p) => isTaskForUser(userName, p.id, availablePersons));
        const newCur = targetPerson?.id || currentList[uIdx] || userName;
        await onUpdateUserColumns(currentList, String(newCur));
      }
    },
    [onUpdateUserColumns, userColumns, activeUsers, availablePersons]
  );

  const handleRemoveUser = useCallback(
    async (uIdx: number, userName: string) => {
      if (!onUpdateUserColumns) return;
      const currentList = userColumns.length > 0 ? [...userColumns] : [...activeUsers];
      const deletedVal = currentList[uIdx];
      const updatedList = currentList.filter((_, i) => i !== uIdx);
      const isCur = Boolean(
        currentUser &&
          (String(currentUser).trim() === String(deletedVal).trim() ||
            isTaskForUser(userName, currentUser, availablePersons))
      );
      await onUpdateUserColumns(updatedList, isCur ? '' : undefined);
    },
    [onUpdateUserColumns, userColumns, activeUsers, currentUser, availablePersons]
  );

  const handleAddUser = useCallback(
    async (selectedPersonId: string) => {
      if (!onUpdateUserColumns || !selectedPersonId) return;
      const currentList = userColumns.length > 0 ? [...userColumns] : [...activeUsers];
      const updatedList = [...currentList, selectedPersonId];
      await onUpdateUserColumns(updatedList);
    },
    [onUpdateUserColumns, userColumns, activeUsers]
  );

  const hasMultipleUsers = activeUsers.length >= 2;

  const userSchedules = useMemo((): UserScheduleResult[] => {
    const usersToSchedule = hasMultipleUsers ? activeUsers : [activeUsers[0] || ''];

    return usersToSchedule.map((user) => {
      const userTasks = hasMultipleUsers
        ? tasks.filter((t) => !t.userName || isTaskForUser(t, user, availablePersons))
        : tasks;

      return {
        userName: user,
        initials: getUserInitials(user, availablePersons),
        ...calculateScheduleForTasks(userTasks, days, todayIdx, totalDayHours),
      };
    });
  }, [hasMultipleUsers, activeUsers, tasks, days, todayIdx, totalDayHours, availablePersons]);

  const relevantSchedulesForStats = useMemo(() => {
    if (showOnlyMyTasks && currentUser) {
      const mine = userSchedules.filter((u) => isTaskForUser(u.userName, currentUser, availablePersons));
      return mine.length > 0 ? mine : userSchedules;
    }
    return userSchedules;
  }, [userSchedules, showOnlyMyTasks, currentUser, availablePersons]);

  const totalWeekScheduledHours = useMemo(() => {
    return relevantSchedulesForStats.reduce(
      (sum, u) => sum + u.scheduledBlocks.reduce((bSum, b) => bSum + b.chunkHours, 0),
      0
    );
  }, [relevantSchedulesForStats]);

  const statsCapacityHours = useMemo(() => {
    return totalWeekColumns * relevantSchedulesForStats.length;
  }, [totalWeekColumns, relevantSchedulesForStats.length]);

  // Overflow tasks: filtered by toggle [Moje úkoly / Všechny úkoly]
  const allOverflowTasks = useMemo(() => {
    const list: { task: PlanTaskItem; remainingHours: number }[] = [];
    const schedules = (filterMyOverflow && currentUser)
      ? userSchedules.filter((u) => isTaskForUser(u.userName, currentUser, availablePersons))
      : userSchedules;
    for (const u of schedules) {
      list.push(...u.overflowTasks);
    }
    return list;
  }, [userSchedules, filterMyOverflow, currentUser, availablePersons]);

  const currentSelectedDay = useMemo(() => {
    return days[selectedDayIndex] || days[0];
  }, [days, selectedDayIndex]);

  return (
    <div className="space-y-6">
      {/* Unified Plan Box */}
      <div className="w-full rounded-3xl bg-[#13141a] p-5 shadow-xl">
        {/* Top Header Row inside the plan box: Mode Switcher on the left + Day Navigation on the right */}
        <div className="flex items-center justify-between gap-4 mb-4 select-none">
          {/* Mode Switcher (Den vs Týden) on the left */}
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] rounded-full shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewMode('day');
                setSelectedDayIndex(todayIdx !== -1 ? todayIdx : 0);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none focus-visible:outline-none ${
                viewMode === 'day'
                  ? 'bg-indigo-500/20 text-white font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className={`material-symbols-outlined text-sm ${viewMode === 'day' ? 'text-indigo-400' : 'text-gray-400'}`}>
                calendar_today
              </span>
              <span className={viewMode === 'day' ? 'text-white' : ''}>Den</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none focus-visible:outline-none ${
                viewMode === 'week'
                  ? 'bg-indigo-500/20 text-white font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className={`material-symbols-outlined text-sm ${viewMode === 'week' ? 'text-indigo-400' : 'text-gray-400'}`}>
                calendar_view_week
              </span>
              <span className={viewMode === 'week' ? 'text-white' : ''}>Týden</span>
            </button>
          </div>

          {/* Right: Day Navigator (Active in 'day' view) */}
          {viewMode === 'day' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedDayIndex === 0}
                onClick={() => setSelectedDayIndex((i) => Math.max(0, i - 1))}
                className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Předchozí den"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>

              {/* Fixed-width day display text without background */}
              <div className="w-[145px] py-1.5 text-xs font-bold text-gray-200 flex items-center justify-center text-center select-none">
                <span>{currentSelectedDay?.dayLabel}</span>
              </div>

              <button
                type="button"
                disabled={selectedDayIndex === 4}
                onClick={() => setSelectedDayIndex((i) => Math.min(4, i + 1))}
                className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Následující den"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>

              {/* Always visible 'Přejít na Dnes' button */}
              {todayIdx !== -1 && (
                <button
                  type="button"
                  disabled={selectedDayIndex === todayIdx}
                  onClick={() => setSelectedDayIndex(todayIdx)}
                  className="ml-1 px-3 py-1.5 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 disabled:opacity-30 disabled:pointer-events-none text-indigo-300 text-xs font-semibold transition cursor-pointer"
                  title="Přejít na dnešní den"
                >
                  Přejít na Dnes
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Timeline Grid Container for both Day and Week */}
        <div className="w-full overflow-x-auto pb-2 outline-none">
          <div className="min-w-[1040px] relative select-none">
            {/* Realtime Moving Time Indicator Line (SHARED persistent element - animates smoothly between Day and Week!) */}
            {currentIndicatorPercent !== null && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-40 outline-none"
                style={{
                  left: hasMultipleUsers ? 'calc(52px + 2px)' : '2px',
                  right: '2px',
                }}
              >
                <div
                  className="absolute top-0 bottom-0 w-0 flex flex-col items-start transition-[left] duration-300 ease-out outline-none pointer-events-none"
                  style={{ left: `${currentIndicatorPercent}%` }}
                >
                  {/* Floating Time Pill Indicator at top */}
                  <div
                    className={`px-2.5 py-0.5 rounded-full bg-[#1a1b24] text-indigo-300 font-mono text-[10px] font-bold shadow-md flex items-center gap-1.5 shrink-0 z-50 select-none outline-none border-0 whitespace-nowrap transition-transform duration-300 ease-out ${
                      pillAlignment === 'start'
                        ? 'translate-x-0'
                        : pillAlignment === 'end'
                        ? '-translate-x-full'
                        : '-translate-x-1/2'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    <span>{currentTimeLabel}</span>
                  </div>
                  {/* Vertical Guideline extending continuously down OVER all tasks (dashed style) */}
                  <div className="w-0 flex-1 border-l-[1.5px] border-dashed border-indigo-400/70 z-40" />
                </div>
              </div>
            )}

            {/* Top Dedicated Time Cursor Track (shared) */}
            <div className="h-8 w-full mb-1" />

            {/* VIEW 1: DENNÍ VÝSEK (1 den na celou šířku okna, podpora pro více uživatelů) */}
            {viewMode === 'day' ? (
              <div className="w-full">
                {/* Column Hour Sub-Markers Header Row */}
            <div className="flex items-center gap-3 pb-3 mb-2 border-b border-white/[0.06]">
              {hasMultipleUsers && <div className="w-10 shrink-0" />}
              <div
                className="flex-1 px-[2px] grid gap-1 text-xs text-gray-400 font-mono text-center items-center"
                style={{ gridTemplateColumns: `repeat(${totalDayHours}, minmax(0, 1fr))` }}
              >
                {daySlotMarkers.map((slot, i) => {
                  if (i === 0) {
                    return (
                      <div key={i} className="min-w-0">
                        {isEditingStart ? (
                          <div className="py-0.5 px-1 bg-white/[0.06] border border-indigo-500/50 rounded-lg flex items-center justify-center gap-1 shadow-sm">
                            <input
                              type="time"
                              value={tempStart}
                              onChange={(e) => setTempStart(e.target.value)}
                              onBlur={(e) => handleCommitStart(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCommitStart(e.currentTarget.value);
                                if (e.key === 'Escape') {
                                  setIsEditingStart(false);
                                  setTempStart(startTimeLabel);
                                }
                              }}
                              className="bg-black/60 border border-white/20 rounded px-1 text-xs text-white font-mono outline-none focus:border-indigo-400"
                              autoFocus
                            />
                            <span className="text-[10px] text-gray-500 shrink-0">1h</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTempStart(startTimeLabel);
                              setIsEditingStart(true);
                            }}
                            className="py-1 bg-white/[0.02] hover:bg-white/[0.08] hover:text-white rounded-lg truncate px-1 cursor-pointer transition flex items-center justify-center gap-1 group w-full"
                            title="Kliknutím upravit počáteční čas"
                          >
                            <span className="group-hover:text-indigo-300 font-semibold underline decoration-dashed decoration-indigo-400/40 underline-offset-2">
                              {startTimeLabel}
                            </span>
                            <span className="text-[10px] text-gray-500">1h</span>
                            <span className="material-symbols-outlined text-[11px] text-gray-500 group-hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">
                              edit
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (i === totalDayHours - 1) {
                    return (
                      <div key={i} className="min-w-0">
                        {isEditingEnd ? (
                          <div className="py-0.5 px-1 bg-white/[0.06] border border-indigo-500/50 rounded-lg flex items-center justify-center gap-1 shadow-sm">
                            <span className="text-[10px] text-gray-500 shrink-0">8h</span>
                            <input
                              type="time"
                              value={tempEnd}
                              onChange={(e) => setTempEnd(e.target.value)}
                              onBlur={(e) => handleCommitEnd(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCommitEnd(e.currentTarget.value);
                                if (e.key === 'Escape') {
                                  setIsEditingEnd(false);
                                  setTempEnd(endTimeLabel);
                                }
                              }}
                              className="bg-black/60 border border-white/20 rounded px-1 text-xs text-white font-mono outline-none focus:border-indigo-400"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTempEnd(endTimeLabel);
                              setIsEditingEnd(true);
                            }}
                            className="py-1 bg-white/[0.02] hover:bg-white/[0.08] hover:text-white rounded-lg truncate px-1 cursor-pointer transition flex items-center justify-center gap-1 group w-full"
                            title="Kliknutím upravit konečný čas"
                          >
                            <span className="text-[10px] text-gray-500">8h</span>
                            <span className="group-hover:text-indigo-300 font-semibold underline decoration-dashed decoration-indigo-400/40 underline-offset-2">
                              {endTimeLabel}
                            </span>
                            <span className="material-symbols-outlined text-[11px] text-gray-500 group-hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">
                              edit
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={i} className="py-1 bg-white/[0.02] rounded-lg truncate px-1">
                      {slot}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day Scheduled Tasks per user */}
            <div className="space-y-4">
              {userSchedules.map((uSched, uIdx) => {
                const dayItems = uSched.scheduledBlocks.filter((b) => b.dayIndex === selectedDayIndex);
                const dayFree = uSched.freeSlots.find((f) => f.dayIndex === selectedDayIndex);
                const isMe = Boolean(currentUser && isTaskForUser(uSched.userName, currentUser, availablePersons));

                return (
                  <div key={uSched.userName || 'single'} className="flex items-center gap-3">
                    {hasMultipleUsers && (
                      <div className="w-14 shrink-0 flex items-center justify-center relative">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenUserMenuIdx(openUserMenuIdx === uIdx ? null : uIdx);
                          }}
                          className={`group relative w-8 h-8 rounded-full font-mono font-bold text-xs flex items-center justify-center text-center select-none cursor-pointer transition-all ${
                            isMe
                              ? 'bg-indigo-500/20 text-indigo-400 font-bold hover:bg-indigo-500/30'
                              : 'bg-white/[0.08] text-gray-300 hover:bg-white/[0.16] hover:text-white'
                          }`}
                          title={isMe ? `${formatUserDisplayName(uSched.userName, availablePersons)} (To jste vy)` : `Uživatel: ${formatUserDisplayName(uSched.userName, availablePersons)}`}
                        >
                          <span className="group-hover:opacity-0 transition-opacity">
                            {uSched.initials}
                          </span>
                          <span className="material-symbols-outlined text-base absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            more_vert
                          </span>
                        </div>
                        {openUserMenuIdx === uIdx && (
                            <div
                              ref={userMenuRef}
                              className="absolute left-0 top-full mt-1 w-44 bg-[#1e2029] border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-fade-in text-xs select-none"
                            >
                              {uIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleMoveUser(uIdx, uIdx - 1);
                                    setOpenUserMenuIdx(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-white/5 transition text-left cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm text-gray-400">arrow_upward</span>
                                  <span>Posunout nahoru</span>
                                </button>
                              )}
                              {uIdx < userSchedules.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleMoveUser(uIdx, uIdx + 1);
                                    setOpenUserMenuIdx(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-white/5 transition text-left cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm text-gray-400">arrow_downward</span>
                                  <span>Posunout dolů</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  handleToggleMe(uIdx, isMe, uSched.userName);
                                  setOpenUserMenuIdx(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-white/5 transition text-left cursor-pointer"
                              >
                                <span className={`material-symbols-outlined text-sm ${isMe ? 'text-amber-400' : 'text-indigo-400'}`}>
                                  {isMe ? 'person_cancel' : 'person'}
                                </span>
                                <span>{isMe ? 'To nejsem já' : 'To jsem já'}</span>
                              </button>
                              <div className="h-px bg-white/10 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  handleRemoveUser(uIdx, uSched.userName);
                                  setOpenUserMenuIdx(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition text-left cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                <span>Vymazat</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 relative w-full py-1">
                      {/* Background Column Lines */}
                      <div
                        className="absolute inset-0 pointer-events-none z-0"
                          style={{ display: 'grid', gridTemplateColumns: `repeat(${totalDayHours}, minmax(0, 1fr))` }}
                        >
                          {Array.from({ length: totalDayHours }).map((_, colIdx) => (
                            <div
                              key={colIdx}
                              className="h-full border-r border-dashed border-white/[0.04] last:border-r-0"
                            />
                          ))}
                        </div>

                        {/* Day Scheduled Tasks (Neutral borderless cards with shadows) */}
                        <div
                          className="relative z-10 gap-2 items-stretch"
                          style={{ display: 'grid', gridTemplateColumns: `repeat(${totalDaySlots}, minmax(0, 1fr))` }}
                        >
                          {dayItems.length === 0 ? (
                            <div
                              style={{
                                gridColumn: `1 / span ${totalDaySlots}`,
                                gridRow: 1,
                                opacity: searchQuery?.trim() ? 0.1 : 1,
                              }}
                              className={`rounded-2xl p-4 border border-dashed border-white/10 bg-white/[0.015] text-gray-500 text-xs flex items-center justify-center gap-3 select-none transition-all duration-200 ${
                                isCompact ? 'h-[60px] !p-2' : 'h-[112px]'
                              }`}
                            >
                              <span className={`material-symbols-outlined opacity-40 ${isCompact ? 'text-lg' : 'text-2xl'}`}>
                                {selectedDayIndex < todayIdx ? 'history_toggle_off' : 'weekend'}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-400">
                                  {selectedDayIndex < todayIdx ? 'Žádné záznamy v historii' : 'Žádné úkoly pro tento den'}
                                </span>
                                <span className="text-[11px] text-gray-600">
                                  {totalDayHours} hodin {selectedDayIndex < todayIdx ? 'nevyužité kapacity' : 'volné kapacity'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            dayItems.map((block) => {
                              const { task, chunkHours, totalHours, isService, isNotAvailable, isCompleted, isCritical, isSplit, partIndex, totalParts } = block;
                              const isCrit = Boolean(isCritical || task.isCritical);
                              const dayColStart = ((block.startCol - 1) % totalDaySlots) + 1;
                              const spanCols = Math.min(totalDaySlots - dayColStart + 1, block.spanCols);
                              const reqCode = task.requirementId;
                              const taskCode = task.taskIdentifier;
                              const displayCode = taskCode || reqCode;

                              const isNaMatch = !searchQuery?.trim() || 'nedostupný volno absence dovolená'.includes(searchQuery.trim().toLowerCase());
                              const isNaMuted = Boolean(searchQuery?.trim()) && !isNaMatch;

                              if (isNotAvailable) {
                                return (
                                  <div
                                    key={block.id}
                                    style={{
                                      gridColumn: `${dayColStart} / span ${spanCols}`,
                                      gridRow: 1,
                                      opacity: isNaMuted ? 0.1 : 1,
                                    }}
                                    className={`rounded-2xl transition-all duration-200 select-none overflow-hidden min-w-0 timeline-task-unavailable text-zinc-300 cursor-default ${
                                      isCompact
                                        ? 'h-[60px] px-3 py-2 flex items-center justify-between'
                                        : 'h-[112px] p-2.5 flex flex-col justify-between gap-1'
                                    } ${isNaMuted ? 'pointer-events-none' : ''}`}
                                  >
                                    {isCompact ? (
                                      <div className="flex items-center justify-between w-full min-w-0 gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="material-symbols-outlined text-lg text-zinc-400 shrink-0">
                                            celebration
                                          </span>
                                          <span className="font-bold text-xs text-white truncate">
                                            Nedostupný / Volno
                                          </span>
                                        </div>
                                        <span className="font-mono text-xs text-zinc-300 font-bold shrink-0">
                                          {chunkHours === totalDayHours ? `${chunkHours}h` : `${chunkHours}h`}
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="min-w-0 flex flex-col gap-0.5">
                                          <div className="font-bold text-xs text-white truncate leading-tight">
                                            Nedostupný / Volno
                                          </div>
                                          <div className="font-mono text-xs text-zinc-400 font-bold pt-0.5">
                                            {chunkHours === totalDayHours ? `${chunkHours}h (celý den)` : `${chunkHours}h`}
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-end text-[10px]">
                                          <span className="material-symbols-outlined text-sm text-zinc-400">
                                            celebration
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              }

                              const isSolidCard = !isNotAvailable;

                              const isCutRight = Boolean(!isNotAvailable && isSplit && partIndex < totalParts);
                              const isCutLeft = Boolean(!isNotAvailable && isSplit && partIndex > 1);

                              const isMatch = isTaskMatchingQuery(task, searchQuery || '');
                              const isMuted = Boolean(searchQuery?.trim()) && !isMatch;

                              const taskBackgroundColor = isNotAvailable
                                ? 'rgba(39, 39, 42, 0.8)'
                                : isCompleted
                                ? 'rgba(16, 185, 129, 0.7)'
                                : isService
                                ? serviceColor
                                : devColor;

                              const blockStyle: React.CSSProperties = {
                                gridColumn: `${dayColStart} / span ${spanCols}`,
                                gridRow: 1,
                                borderRadius: `${isCutLeft ? '0px' : '16px'} ${isCutRight ? '0px' : '16px'} ${isCutRight ? '0px' : '16px'} ${isCutLeft ? '0px' : '16px'}`,
                                opacity: isMuted ? 0.1 : 1,
                                backgroundColor: taskBackgroundColor,
                              };

                              return (
                                <div
                                  key={block.id}
                                  style={blockStyle}
                                  onClick={isMuted ? undefined : () => onOpenTask(task)}
                                  className={`timeline-task-card group transition-all duration-200 select-none overflow-hidden min-w-0 text-white ${
                                    isCompact
                                      ? 'h-[60px] px-3 py-1.5 flex items-center justify-between'
                                      : 'h-[112px] p-2.5 flex flex-col justify-between gap-1'
                                  } ${isMuted ? 'pointer-events-none' : 'cursor-pointer'}`}
                                >
                                  {isCompact ? (
                                    <div className="relative w-full h-full flex flex-col justify-center min-w-0 overflow-hidden">
                                      {/* Základní stav: 1. řádek [ikona + kritická] Název (odsazený, text-[11px]) [chip zadavatele], 2. řádek Projekt */}
                                      <div className="flex flex-col justify-center min-w-0 w-full h-full group-hover:hidden select-none gap-0.5">
                                        <div className="flex items-center gap-2.5 min-w-0 w-full">
                                          <div className="relative flex items-center shrink-0">
                                            <span className="material-symbols-outlined text-lg opacity-90 text-white">
                                              {isCompleted ? 'check_circle' : isService ? 'build' : 'code'}
                                            </span>
                                            {isCrit && (
                                              <span
                                                className="material-symbols-outlined text-[13px] text-red-400 absolute -top-1.5 -right-1.5 drop-shadow"
                                                title="Kritická priorita"
                                              >
                                                warning
                                              </span>
                                            )}
                                          </div>

                                          <span className="font-semibold text-[11px] text-white truncate min-w-0 flex-1 leading-tight">
                                            {task.customName || task.title}
                                          </span>

                                          {task.author && (
                                            <span
                                              className="px-2 py-0.5 rounded-full font-mono font-bold text-[9.5px] bg-white/20 text-white shrink-0 shadow-sm"
                                              title={`Zadavatel: ${task.author}`}
                                            >
                                              {task.author}
                                            </span>
                                          )}
                                        </div>

                                        {/* 2. řádek: Název projektu pod názvem úkolu */}
                                        <div className="flex items-center min-w-0 pl-[27px] text-[10px] text-white/70 truncate">
                                          <span className="truncate" title={task.project || 'Bez projektu'}>
                                            {task.project || '–'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Hover stav (při najetí myši skryje původní info a zobrazí): Počet hodin | Projekt | úkol Txxxxx */}
                                      <div className="hidden group-hover:flex items-center gap-2 min-w-0 w-full h-full text-xs text-white select-none animate-fade-in">
                                        <span className="font-mono font-bold shrink-0 text-white bg-white/15 px-2 py-0.5 rounded-full text-[11px]">
                                          {isSplit ? `${chunkHours}h (${totalHours}h)` : `${chunkHours}h`}
                                        </span>

                                        <span className="text-white/40 shrink-0 font-bold">•</span>

                                        <span className="truncate min-w-0 font-medium text-white/90 text-[11px]" title={task.project || 'Bez projektu'}>
                                          {task.project || '–'}
                                        </span>

                                        {displayCode && displayCode !== 'R0' && (
                                          <>
                                            <span className="text-white/40 shrink-0 font-bold">•</span>
                                            {isGoddayTask(task) ? (
                                              <span
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onOpenTask(task);
                                                }}
                                                className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-amber-500/20 text-amber-300 transition cursor-pointer shrink-0"
                                                title={task.url ? 'Otevřít odkaz úkolu' : 'Godday úkol'}
                                              >
                                                godday
                                              </span>
                                            ) : (
                                              <span
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onOpenCodeLink(displayCode, task, e);
                                                }}
                                                className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-white/20 hover:bg-white/30 text-white transition cursor-pointer shrink-0"
                                                title="Otevřít v TaskManageru"
                                              >
                                                {displayCode}
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {/* Content area: Title, Project, and Part/Hours row */}
                                      <div className="min-w-0 flex flex-col gap-0.5">
                                        {/* Row 1: Task Title */}
                                        <div className="font-bold text-xs text-white truncate leading-tight">
                                          {task.customName || task.title}
                                        </div>

                                        {/* Row 2: Project name */}
                                        {task.project && (
                                          <div className={`text-[10px] truncate leading-tight ${isSolidCard ? 'text-white/80' : 'text-white/70'}`}>
                                            {task.project}
                                          </div>
                                        )}

                                        {/* Row 3: Part & Hours */}
                                        <div className="flex items-center gap-1.5 text-[10px] text-white/90 font-mono pt-0.5 flex-wrap">
                                          {isSplit && (
                                            <span className={`text-[10px] font-sans shrink-0 ${isSolidCard ? 'text-white/80' : 'text-white/70'}`}>
                                              {partIndex}/{totalParts}
                                            </span>
                                          )}
                                          <span className="font-bold text-xs">
                                            {isSplit ? `${chunkHours}h z ${totalHours}h` : `${chunkHours}h`}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Bottom row: clickable code + author initials pill + type icon with warning */}
                                      <div className="flex items-center justify-between gap-1 text-[10px] min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          {chunkHours > 0.5 && (
                                            isGoddayTask(task) ? (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onOpenTask(task);
                                                }}
                                                className={`px-2 py-0.5 rounded-full font-mono font-bold text-[11px] transition cursor-pointer truncate shrink-0 ${
                                                  isSolidCard
                                                    ? 'border border-white/60 bg-white/10 hover:bg-white/20 text-white'
                                                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                                                }`}
                                                title={task.url ? 'Otevřít odkaz úkolu' : 'Godday úkol'}
                                              >
                                                godday
                                              </button>
                                            ) : (
                                              displayCode && displayCode !== 'R0' && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => onOpenCodeLink(displayCode, task, e)}
                                                  className={`px-2 py-0.5 rounded-full font-mono font-bold text-[11px] transition cursor-pointer truncate shrink-0 ${
                                                    isSolidCard
                                                      ? 'border border-white/60 bg-white/10 hover:bg-white/20 text-white'
                                                      : 'bg-white/15 hover:bg-white/25 text-white'
                                                  }`}
                                                  title="Otevřít v TaskManageru"
                                                >
                                                  {displayCode}
                                                </button>
                                              )
                                            )
                                          )}

                                          {/* Author initials in pill: white outline when solid card */}
                                          {task.author && (
                                            <div
                                              className={`px-2.5 py-0.5 min-w-[24px] rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] font-mono text-center ${
                                                isSolidCard
                                                  ? 'border border-white/60 bg-white/10 text-white'
                                                  : 'bg-indigo-500/20 text-indigo-300'
                                              }`}
                                              title={`Zadavatel: ${task.author}`}
                                            >
                                              {task.author}
                                            </div>
                                          )}
                                        </div>

                                        {/* Type indicator icon with warning triangle next to it: white when solid card */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          {isCrit && (
                                            <span
                                              className="material-symbols-outlined text-sm text-red-400"
                                              title="Kritická priorita"
                                            >
                                              warning
                                            </span>
                                          )}
                                          <span
                                            className={`material-symbols-outlined text-sm ${isSolidCard ? 'text-white' : 'text-white/50'}`}
                                          >
                                            {isService ? 'build' : 'code'}
                                          </span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })
                          )}

                          {/* Free capacity block for the day (only when day has tasks, preventing double placeholder) */}
                          {dayItems.length > 0 && dayFree && dayFree.freeHours > 0 && (
                            <div
                              style={{
                                gridColumn: `${((dayFree.startCol - 1) % totalDaySlots) + 1} / span ${dayFree.spanCols}`,
                                gridRow: 1,
                              }}
                              className={`rounded-2xl p-4 border border-dashed border-white/10 bg-white/[0.015] hover:bg-white/[0.03] text-gray-500 text-xs flex items-center justify-center gap-2 transition select-none ${
                                isCompact ? 'h-[72px] !p-2' : 'h-[112px]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-base opacity-60">
                                {selectedDayIndex < todayIdx ? 'history' : 'hourglass_empty'}
                              </span>
                              <span className="font-mono font-semibold">
                                {dayFree.freeHours}h {selectedDayIndex < todayIdx ? 'nevyužito' : 'volná kapacita'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Row placeholder to add a new person */}
                {onUpdateUserColumns && (
                  <div className="pt-1 flex items-center">
                    {hasMultipleUsers && <div className="w-14 shrink-0" />}
                    {!isAddingPerson ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingPerson(true)}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-dashed border-white/15 hover:border-indigo-500/50 hover:bg-white/[0.03] text-xs text-gray-400 hover:text-white transition cursor-pointer select-none"
                      >
                        <span className="material-symbols-outlined text-sm text-indigo-400">add</span>
                        <span>Přidat osobu</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/[0.03] border border-white/10 animate-fade-in w-fit">
                        <div className="w-7 h-7 rounded-full bg-white/[0.06] text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                          <span className="material-symbols-outlined text-sm">person_add</span>
                        </div>
                        <select
                          autoFocus
                          defaultValue=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              handleAddUser(val);
                              setIsAddingPerson(false);
                            }
                          }}
                          className="bg-black/60 border border-white/15 rounded-xl px-3 py-1 text-xs text-white outline-none focus:border-indigo-500 transition [color-scheme:dark] cursor-pointer"
                        >
                          <option value="" disabled>Vyberte osobu k přidání...</option>
                          {availablePersons
                            .filter((p) => !userSchedules.some((u) => isTaskForUser(u.userName, p.id, availablePersons)))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name || p.id}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsAddingPerson(false)}
                          className="p-1 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5 transition cursor-pointer"
                          title="Zrušit"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
        ) : (
          /* VIEW 2: TÝDENNÍ PŘEHLED (40 sloupců, sloučené přetékající bloky, podpora pro více uživatelů) */
          <div className="w-full">
            {/* 5 Day Headers (Po, Út, St, Čt, Pá) */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3 mb-2">
              {hasMultipleUsers && <div className="w-14 shrink-0" />}
              <div className="flex-1 px-[2px] grid grid-cols-5 gap-0">
                {days.slice(0, 5).map((day, dIdx) => {
                  const dayBlocks = userSchedules.flatMap((u) =>
                    u.scheduledBlocks.filter((b) => b.dayIndex === dIdx)
                  );
                  const dayHours = dayBlocks.reduce((sum, b) => sum + b.chunkHours, 0);
                  const totalCap = totalDayHours * userSchedules.length;

                  return (
                    <div
                      key={day.date}
                      className={`px-3 py-1 flex flex-col justify-between border-r border-white/[0.05] last:border-r-0 ${
                        day.isToday ? 'bg-indigo-500/[0.04] rounded-t-xl' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              day.isToday ? 'text-indigo-300 font-extrabold' : 'text-gray-300'
                            }`}
                          >
                            {day.dayLabel}
                          </span>
                          {day.isToday && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold text-[9px] uppercase tracking-wider">
                              Dnes
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[11px] font-mono font-semibold ${
                            dayHours >= totalCap ? 'text-indigo-300' : 'text-gray-400'
                          }`}
                        >
                          {dayHours}/{totalCap}h
                        </span>
                      </div>

                      {/* 8 Column Sub-Markers (1h to 8h) */}
                      <div className="grid grid-cols-8 gap-0 mt-2 text-[10px] text-gray-500 font-mono text-center">
                        <span>1h</span>
                        <span>2h</span>
                        <span>3h</span>
                        <span>4h</span>
                        <span>5h</span>
                        <span>6h</span>
                        <span>7h</span>
                        <span>8h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Week Grid Tracks for each user */}
            <div className="space-y-4">
              {userSchedules.map((uSched, uIdx) => {
                const isMe = Boolean(currentUser && isTaskForUser(uSched.userName, currentUser, availablePersons));

                return (
                  <div key={uSched.userName || 'single'} className="flex items-center gap-3">
                    {hasMultipleUsers && (
                      <div className="w-14 shrink-0 flex items-center justify-center relative">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenUserMenuIdx(openUserMenuIdx === uIdx ? null : uIdx);
                          }}
                          className={`group relative w-8 h-8 rounded-full font-mono font-bold text-xs flex items-center justify-center text-center select-none cursor-pointer transition-all ${
                            isMe
                              ? 'bg-indigo-500/20 text-indigo-400 font-bold hover:bg-indigo-500/30'
                              : 'bg-white/[0.08] text-gray-300 hover:bg-white/[0.16] hover:text-white'
                          }`}
                          title={isMe ? `${formatUserDisplayName(uSched.userName, availablePersons)} (To jste vy)` : `Uživatel: ${formatUserDisplayName(uSched.userName, availablePersons)}`}
                        >
                          <span className="group-hover:opacity-0 transition-opacity">
                            {uSched.initials}
                          </span>
                          <span className="material-symbols-outlined text-base absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            more_vert
                          </span>
                        </div>
                        {openUserMenuIdx === uIdx && (
                            <div
                              ref={userMenuRef}
                              className="absolute left-0 top-full mt-1 w-44 bg-[#1e2029] border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-fade-in text-xs select-none"
                            >
                              {uIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleMoveUser(uIdx, uIdx - 1);
                                    setOpenUserMenuIdx(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-white/5 transition text-left cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm text-gray-400">arrow_upward</span>
                                  <span>Posunout nahoru</span>
                                </button>
                              )}
                              {uIdx < userSchedules.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleMoveUser(uIdx, uIdx + 1);
                                    setOpenUserMenuIdx(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-white/5 transition text-left cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm text-gray-400">arrow_downward</span>
                                  <span>Posunout dolů</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  handleToggleMe(uIdx, isMe, uSched.userName);
                                  setOpenUserMenuIdx(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-white/5 transition text-left cursor-pointer"
                              >
                                <span className={`material-symbols-outlined text-sm ${isMe ? 'text-amber-400' : 'text-indigo-400'}`}>
                                  {isMe ? 'person_cancel' : 'person'}
                                </span>
                                <span>{isMe ? 'To nejsem já' : 'To jsem já'}</span>
                              </button>
                              <div className="h-px bg-white/10 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  handleRemoveUser(uIdx, uSched.userName);
                                  setOpenUserMenuIdx(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition text-left cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                <span>Vymazat</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 relative w-full rounded-lg overflow-hidden py-1 px-[2px] h-[38px]">
                      {/* Background Column Lines */}
                      <div
                        className="absolute inset-0 pointer-events-none z-0 px-[2px]"
                        style={{ display: 'grid', gridTemplateColumns: `repeat(${totalWeekColumns}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: totalWeekColumns }).map((_, colIdx) => {
                          const dayIdx = Math.floor(colIdx / totalDayHours);
                          const isDayBoundary = (colIdx + 1) % totalDayHours === 0;
                          const isTodayCol = days[dayIdx]?.isToday;

                          return (
                            <div
                              key={colIdx}
                              className={`h-full ${
                                isDayBoundary
                                  ? 'border-r border-white/[0.08]'
                                  : 'border-r border-dashed border-white/[0.03]'
                              } ${isTodayCol ? 'bg-indigo-500/[0.02]' : ''}`}
                            />
                          );
                        })}
                      </div>

                      {/* Merged Items Row (Neutral card bars) */}
                      <div
                        className="relative z-10 gap-1.5 h-[30px] items-stretch"
                        style={{ display: 'grid', gridTemplateColumns: `repeat(${totalWeekSlots}, minmax(0, 1fr))` }}
                      >
                        {uSched.weekMergedBlocks.map((block) => {
                          const { task, startCol, spanCols, isService, isNotAvailable, isCompleted, isCritical, isSplit, partIndex, totalParts } = block;
                          const isCrit = Boolean(isCritical || task.isCritical);

                          const isSolidBlock = !isNotAvailable;

                          const isCutRight = Boolean(!isNotAvailable && isSplit && partIndex < totalParts);
                          const isCutLeft = Boolean(!isNotAvailable && isSplit && partIndex > 1);

                          const isMatch = isNotAvailable
                            ? (!searchQuery?.trim() || 'nedostupný volno absence dovolená'.includes(searchQuery.trim().toLowerCase()))
                            : isTaskMatchingQuery(task, searchQuery || '');
                          const isMuted = Boolean(searchQuery?.trim()) && !isMatch;

                          const taskBackgroundColor = isNotAvailable
                            ? 'rgba(39, 39, 42, 0.8)'
                            : isCompleted
                            ? 'rgba(16, 185, 129, 0.7)'
                            : isService
                            ? serviceColor
                            : devColor;

                          const blockStyle: React.CSSProperties = {
                            gridColumn: `${startCol} / span ${spanCols}`,
                            gridRow: 1,
                            borderRadius: `${isCutLeft ? '0px' : '8px'} ${isCutRight ? '0px' : '8px'} ${isCutRight ? '0px' : '8px'} ${isCutLeft ? '0px' : '8px'}`,
                            opacity: isMuted ? 0.1 : 1,
                            backgroundColor: taskBackgroundColor,
                          };

                          return (
                            <div
                              key={block.id}
                              style={blockStyle}
                              onClick={isNotAvailable || isMuted ? undefined : () => onOpenTask(task)}
                              onMouseEnter={(e) =>
                                isMuted ? undefined : setHoveredTask({ block, rect: e.currentTarget.getBoundingClientRect() })
                              }
                              onMouseLeave={() => setHoveredTask(null)}
                              className={`timeline-task-card h-full transition-all duration-200 select-none flex items-center justify-center overflow-hidden ${
                                isMuted ? 'pointer-events-none' : ''
                              } ${
                                isNotAvailable ? 'text-zinc-300 cursor-default' : 'cursor-pointer text-white'
                              }`}
                            >
                                  <div
                                    className={`pointer-events-none flex items-center justify-center ${
                                      isCrit && !isNotAvailable ? 'flex-col gap-0.5' : 'flex-row gap-1'
                                    }`}
                                  >
                                    {isCrit && !isNotAvailable && (
                                      <span
                                        className="material-symbols-outlined text-xs text-red-400"
                                        title="Kritická priorita"
                                      >
                                        warning
                                      </span>
                                    )}
                                    <span
                                      className={`material-symbols-outlined text-xs ${isSolidBlock ? 'text-white' : 'text-white/50'}`}
                                    >
                                      {isNotAvailable ? 'celebration' : isService ? 'build' : 'code'}
                                    </span>
                                  </div>
                                </div>
                              );
                        })}

                        {/* Free Capacity Slots */}
                        {uSched.freeSlots.map((free) => (
                          <div
                            key={`free-${free.dayIndex}-${free.startCol}`}
                            style={{
                              gridColumn: `${free.startCol} / span ${free.spanCols}`,
                              gridRow: 1,
                              opacity: searchQuery?.trim() ? 0.1 : 1,
                            }}
                            className="rounded-lg border border-dashed border-white/10 bg-white/[0.015] hover:bg-white/[0.03] text-gray-500 text-xs flex items-center justify-center gap-1 transition-all duration-200 select-none h-full"
                            title={free.dayIndex < todayIdx ? `${free.freeHours}h nevyužité kapacity` : `${free.freeHours}h volné kapacity`}
                          >
                            <span className="font-mono text-[10px] opacity-60">
                              {free.freeHours}h
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Row placeholder to add a new person */}
              {onUpdateUserColumns && (
                <div className="pt-1 flex items-center">
                  {hasMultipleUsers && <div className="w-14 shrink-0" />}
                  {!isAddingPerson ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingPerson(true)}
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-dashed border-white/15 hover:border-indigo-500/50 hover:bg-white/[0.03] text-xs text-gray-400 hover:text-white transition cursor-pointer select-none"
                    >
                      <span className="material-symbols-outlined text-sm text-indigo-400">add</span>
                      <span>Přidat osobu</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/[0.03] border border-white/10 animate-fade-in w-fit">
                      <div className="w-7 h-7 rounded-full bg-white/[0.06] text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                        <span className="material-symbols-outlined text-sm">person_add</span>
                      </div>
                      <select
                        autoFocus
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            handleAddUser(val);
                            setIsAddingPerson(false);
                          }
                        }}
                        className="bg-black/60 border border-white/15 rounded-xl px-3 py-1 text-xs text-white outline-none focus:border-indigo-500 transition [color-scheme:dark] cursor-pointer"
                      >
                        <option value="" disabled>Vyberte osobu k přidání...</option>
                        {availablePersons
                          .filter((p) => !userSchedules.some((u) => isTaskForUser(u.userName, p.id, availablePersons)))
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name || p.id}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsAddingPerson(false)}
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5 transition cursor-pointer"
                        title="Zrušit"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Custom Floating Tooltip for Week View (Bounded inside visible viewport) */}
      {viewMode === 'week' && hoveredTask && tooltipPosition && (
        <div
          className="fixed z-50 pointer-events-none p-3.5 rounded-2xl bg-[#161720]/95 backdrop-blur-md shadow-2xl text-xs space-y-2 min-w-[240px] max-w-[320px] animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: `translate(-50%, ${tooltipPosition.translateY})`,
          }}
        >
          {hoveredTask.block.isNotAvailable ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-white leading-snug">
                  Nedostupný / Volno
                </div>
                <span className="material-symbols-outlined text-sm text-zinc-400">
                  celebration
                </span>
              </div>
              <div className="font-mono text-xs text-zinc-300 font-bold">
                {hoveredTask.block.chunkHours === totalDayHours
                  ? `${hoveredTask.block.chunkHours}h (celý den)`
                  : `${hoveredTask.block.chunkHours}h`}
              </div>
            </>
          ) : (
            <>
              {/* Header row: Type badge + hours */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Boolean(hoveredTask.block.isCritical || hoveredTask.block.task.isCritical) && (
                    <span className="material-symbols-outlined text-xs text-red-400" title="Kritická priorita">
                      warning
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      hoveredTask.block.isCompleted
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : hoveredTask.block.isService
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {hoveredTask.block.isCompleted
                      ? 'Hotovo / Splněno'
                      : hoveredTask.block.isService
                      ? 'Servis'
                      : 'Vývoj'}
                  </span>
                  {hoveredTask.block.isSplit && (
                    <span className="text-[10px] font-mono text-white/80 font-bold">
                      ({hoveredTask.block.partIndex}/{hoveredTask.block.totalParts})
                    </span>
                  )}
                </div>
                <span className="font-mono font-bold text-gray-200">
                  {hoveredTask.block.chunkHours}h
                  {hoveredTask.block.totalHours > hoveredTask.block.chunkHours && (
                    <span className="text-gray-400 font-normal"> z {hoveredTask.block.totalHours}h</span>
                  )}
                </span>
              </div>

              {/* Title */}
              <div className="font-bold text-white leading-snug">
                {hoveredTask.block.task.customName || hoveredTask.block.task.title}
              </div>

              {/* Codes & Author */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-gray-400 font-mono">
                {hoveredTask.block.task.taskIdentifier && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                    {hoveredTask.block.task.taskIdentifier}
                  </span>
                )}
                {isGoddayTask(hoveredTask.block.task) ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    godday
                  </span>
                ) : (
                  hoveredTask.block.task.requirementId &&
                  hoveredTask.block.task.requirementId !== hoveredTask.block.task.taskIdentifier &&
                  hoveredTask.block.task.requirementId !== 'R0' && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                      {hoveredTask.block.task.requirementId}
                    </span>
                  )
                )}
                {hoveredTask.block.task.author && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-200 font-bold">
                    {hoveredTask.block.task.author}
                  </span>
                )}
                {hoveredTask.block.task.project && (
                  <span className="truncate max-w-[140px] text-gray-400 font-sans">
                    {hoveredTask.block.task.project}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-500 italic pt-0.5">
                {isGoddayTask(hoveredTask.block.task) ? 'Kliknutím otevřít odkaz' : 'Kliknutím otevřít v TaskManageru'}
              </div>
            </>
          )}
        </div>
      )}

      {/* Week Capacity & Workload Summary Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.02] flex items-center justify-between gap-4 flex-wrap text-xs text-gray-400 select-none">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded flex items-center justify-center border border-white/10 shadow-sm"
              style={{ backgroundColor: hexToRgba(primaryColor, '#6366f1', 0.85) }}
            >
              <span className="material-symbols-outlined text-[10px] text-white">code</span>
            </span>
            <span>Vývoj</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded flex items-center justify-center border border-white/10 shadow-sm"
              style={{ backgroundColor: hexToRgba(actionsColor, '#a855f7', 0.85) }}
            >
              <span className="material-symbols-outlined text-[10px] text-white">build</span>
            </span>
            <span>Servisy & HD</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded flex items-center justify-center border border-white/10 shadow-sm text-zinc-300"
              style={{ backgroundColor: 'rgba(39, 39, 42, 0.85)' }}
            >
              <span className="material-symbols-outlined text-[10px]">celebration</span>
            </span>
            <span>Volno / Absence</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-red-400">warning</span>
            <span>Kritická priorita</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-dashed border-gray-500" />
            <span>Volná kapacita</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span>
            Naplánováno:{' '}
            <strong className="text-indigo-300 font-bold">{totalWeekScheduledHours}h</strong> / {statsCapacityHours}h
          </span>
          <span>•</span>
          <span>
            Zbývá v týdnu:{' '}
            <strong className="text-gray-300 font-bold">
              {Math.max(0, statsCapacityHours - totalWeekScheduledHours)}h
            </strong>
          </span>
        </div>
      </div>

      {/* Overflow Tasks Section */}
      {allOverflowTasks.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/[0.02] space-y-3">
          <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-2 select-none">
            <span className="material-symbols-outlined text-sm text-indigo-400">arrow_forward</span>
            <span>Úkoly přesahující do dalšího týdne ({allOverflowTasks.length})</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 min-[1366px]:grid-cols-4 min-[1921px]:grid-cols-5 gap-2.5">
            {allOverflowTasks.map(({ task, remainingHours }) => (
              <TaskCard
                key={`timeline-overflow-${task.taskId}`}
                task={{ ...task, totalHours: remainingHours }}
                onOpenTask={onOpenTask}
                onOpenCodeLink={onOpenCodeLink}
                getTaskManagerUrl={getTaskManagerUrl}
                isCopied={copiedId === task.taskId}
                showAssignee={hasMultipleUsers}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ========================================================================= */
/* TAB 3: LIST VIEW COMPONENT (Modern borderless list cards)                 */
/* ========================================================================= */
interface ListViewProps {
  tasks: PlanTaskItem[];
  hasMultipleUsers?: boolean;
  onOpenTask: (task: PlanTaskItem) => void;
  onOpenCodeLink: (code: string, task: PlanTaskItem, e?: React.MouseEvent) => void;
  getTaskManagerUrl: (code?: string) => string | null;
  copiedId: string | null;
}

const ListView: React.FC<ListViewProps> = ({
  tasks,
  hasMultipleUsers,
  onOpenTask,
  onOpenCodeLink,
  getTaskManagerUrl,
  copiedId,
}) => {
  const sortedTasks = useMemo(() => {
    return [...tasks].sort(comparePlanOrder);
  }, [tasks]);

  if (sortedTasks.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400 text-xs">
        Žádné úkoly neodpovídají zadanému filtru.
      </div>
    );
  }

  const gridColsClass = hasMultipleUsers
    ? 'grid-cols-[40px_36px_120px_70px_1fr_160px_110px_60px]'
    : 'grid-cols-[36px_120px_70px_1fr_160px_110px_60px]';

  return (
    <div className="space-y-2">
      {/* Header bar */}
      <div className={`grid ${gridColsClass} items-center px-4 py-2 gap-3 text-[11px] text-gray-400 font-medium uppercase tracking-wider select-none`}>
        {hasMultipleUsers && <div className="text-center">Osoba</div>}
        <div className="text-center">Typ</div>
        <div>Kód</div>
        <div className="text-center">Zadavatel</div>
        <div>Název úkolu</div>
        <div>Projekt</div>
        <div>Termín</div>
        <div className="text-right">Hodiny</div>
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {sortedTasks.map((task) => {
          const isDev = task.taskType === 'dev';
          const isCrit = Boolean(task.isCritical);
          const isCompleted = Boolean(task.isCompleted || task.isSolved);
          return (
            <div
              key={task.taskId}
              onClick={() => onOpenTask(task)}
              className={`grid ${gridColsClass} items-center px-4 py-3 gap-3 text-xs rounded-2xl transition-colors cursor-pointer select-none group shadow-sm ${
                isCompleted
                  ? 'bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-100'
                  : 'bg-white/[0.02] hover:bg-white/[0.05]'
              }`}
            >
              {/* Assignee circle avatar if 2+ users */}
              {hasMultipleUsers && (
                <div className="flex items-center justify-center">
                  <span
                    className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-bold flex items-center justify-center text-center shadow-sm select-none"
                    title={`Přiřazeno: ${formatUserDisplayName(task.userName) || '–'}`}
                  >
                    {getUserInitials(task.userName)}
                  </span>
                </div>
              )}

              {/* Type: larger icon without chip, event_busy for unavailable */}
              <div className="flex items-center justify-center gap-1">
                <span
                  className={`material-symbols-outlined text-lg ${
                    task.isNotAvailable
                      ? 'text-zinc-400'
                      : isCompleted
                      ? 'text-emerald-400'
                      : isDev
                      ? 'text-indigo-400'
                      : task.taskType === 'service'
                      ? 'text-purple-400'
                      : 'text-gray-400'
                  }`}
                  title={
                    task.isNotAvailable
                      ? 'Nedostupnost / Volno'
                      : isCompleted
                      ? 'Splněno'
                      : isDev
                      ? 'Vývoj'
                      : 'Servis'
                  }
                >
                  {task.isNotAvailable
                    ? 'event_busy'
                    : task.isPinned && !isCompleted
                    ? 'push_pin'
                    : isDev
                    ? 'code'
                    : 'build'}
                </span>
                {isCrit && (
                  <span
                    className={`material-symbols-outlined text-sm shrink-0 ${isCompleted ? 'text-emerald-400' : 'text-red-400'}`}
                    title="Kritická priorita"
                  >
                    warning
                  </span>
                )}
              </div>

              {/* Dedicated Column: Task & Req Codes / Godday chip */}
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {isGoddayTask(task) ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTask(task);
                    }}
                    className="px-2 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 font-mono text-[10px] font-bold transition cursor-pointer"
                    title={task.url ? 'Otevřít odkaz úkolu' : 'Godday úkol'}
                  >
                    godday
                  </button>
                ) : (
                  <>
                    {task.taskIdentifier && (
                      <button
                        type="button"
                        onClick={(e) => onOpenCodeLink(task.taskIdentifier!, task, e)}
                        className="px-2 py-0.5 rounded-full bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 font-mono text-[10px] font-bold transition cursor-pointer"
                        title={getTaskManagerUrl(task.taskIdentifier) ? 'Otevřít úkol v TaskManageru' : 'Kliknutím zkopírovat kód'}
                      >
                        {task.taskIdentifier}
                      </button>
                    )}
                    {task.requirementId && task.requirementId !== task.taskIdentifier && task.requirementId !== 'R0' && (
                      <button
                        type="button"
                        onClick={(e) => onOpenCodeLink(task.requirementId!, task, e)}
                        className="px-2 py-0.5 rounded-full bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 font-mono text-[10px] font-semibold transition cursor-pointer"
                        title={getTaskManagerUrl(task.requirementId) ? 'Otevřít požadavek v TaskManageru' : 'Kliknutím zkopírovat kód'}
                      >
                        {task.requirementId}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Dedicated Column: Author chip in primary color */}
              <div className="flex items-center justify-center">
                {task.author ? (
                  <span
                    className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold tracking-wider text-center"
                    title={`Zadavatel: ${task.author}`}
                  >
                    {task.author}
                  </span>
                ) : (
                  <span className="text-gray-600 text-[11px]">–</span>
                )}
              </div>

              {/* Title */}
              <div className="min-w-0 pr-2">
                <span
                  className={`font-semibold truncate block ${isCompleted ? 'text-gray-400' : 'text-white'}`}
                  title={task.title}
                >
                  {task.customName || task.title}
                </span>
              </div>

              {/* Project */}
              <div className="truncate text-gray-400 text-xs" title={task.project}>
                {task.project || '–'}
              </div>

              {/* Formatted Dates */}
              <div className="text-gray-400 font-mono text-[11px] truncate">
                {task.dates && task.dates.length > 0 ? task.dates.map(formatPlanDate).join(', ') : '–'}
              </div>

              {/* Hours in plain text (no chip) */}
              <div className="text-right">
                <span className={`font-mono font-bold text-xs ${isCompleted ? 'text-emerald-300' : 'text-gray-300'}`}>
                  {task.totalHours}h
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ========================================================================= */
/* TASK CARD COMPONENT (Clean Material 3 borderless card – NO hover buttons)  */
/* ========================================================================= */
interface TaskCardProps {
  task: PlanTaskItem;
  onOpenTask: (task: PlanTaskItem) => void;
  onOpenCodeLink: (code: string, task: PlanTaskItem, e?: React.MouseEvent) => void;
  getTaskManagerUrl: (code?: string) => string | null;
  isCopied?: boolean;
  showAssignee?: boolean;
  isCompletedView?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onOpenTask,
  onOpenCodeLink,
  getTaskManagerUrl,
  showAssignee,
  isCompletedView,
}) => {
  const isDev = task.taskType === 'dev';
  const isService = task.taskType === 'service';
  const isCrit = Boolean(task.isCritical);

  return (
    <div
      onClick={() => onOpenTask(task)}
      className={`group relative p-3.5 rounded-2xl transition-colors cursor-pointer flex flex-col justify-between gap-2.5 select-none shadow-sm ${
        isCompletedView
          ? 'bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-100'
          : 'bg-white/[0.04] hover:bg-white/[0.08] text-white'
      }`}
    >
      {/* Top row: Type indicator (plain text & icon, no chip), author chip in primary color, plain hours */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dev / Service type indicator (no chip visual) */}
          <div
            className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isCompletedView
                ? 'text-emerald-300'
                : isDev
                ? 'text-indigo-300'
                : isService
                ? 'text-purple-300'
                : 'text-gray-300'
            }`}
          >
            {task.isPinned && !isCompletedView && <span className="material-symbols-outlined text-xs">push_pin</span>}
            <span className={`material-symbols-outlined text-xs ${isCompletedView ? 'text-emerald-400' : ''}`}>
              {isDev ? 'code' : isService ? 'build' : 'task'}
            </span>
            {isCrit && (
              <span
                className={`material-symbols-outlined text-xs ${isCompletedView ? 'text-emerald-400' : 'text-red-400'}`}
                title="Kritická priorita"
              >
                warning
              </span>
            )}
            <span>{isCompletedView ? 'Splněno' : isDev ? 'Vývoj' : isService ? 'Servis' : 'Úkol'}</span>
          </div>

          {/* Author in primary color chip */}
          {task.author && (
            <span
              className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold tracking-wider"
              title="Zadavatel úkolu"
            >
              {task.author}
            </span>
          )}
        </div>

        {/* Hours plain text (no chip visual) */}
        <span className={`font-mono text-xs font-bold shrink-0 ${isCompletedView ? 'text-emerald-300' : 'text-gray-300'}`}>
          {task.totalHours}h
        </span>
      </div>

      {/* Middle: Title */}
      <div className={`text-xs font-semibold leading-snug line-clamp-2 ${isCompletedView ? 'text-gray-400' : 'text-white'}`}>
        {task.customName || task.title}
      </div>

      {/* Bottom row: Project + Codes & Assignee */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400 pt-0.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="truncate max-w-[150px] text-gray-400 text-xs" title={task.project || 'Projekt'}>
            {task.project || '–'}
          </span>

          {/* Task / Req Codes / Godday chip moved behind project */}
          {isGoddayTask(task) ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTask(task);
              }}
              className="px-2 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 font-mono text-[10px] font-bold transition cursor-pointer"
              title={task.url ? 'Otevřít odkaz úkolu' : 'Godday úkol'}
            >
              godday
            </button>
          ) : (
            <>
              {task.taskIdentifier && (
                <button
                  type="button"
                  onClick={(e) => onOpenCodeLink(task.taskIdentifier!, task, e)}
                  className="px-2 py-0.5 rounded-full bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 font-mono text-[10px] font-bold transition cursor-pointer"
                  title={getTaskManagerUrl(task.taskIdentifier) ? 'Otevřít úkol v TaskManageru' : 'Kliknutím zkopírovat kód'}
                >
                  {task.taskIdentifier}
                </button>
              )}
              {task.requirementId && task.requirementId !== task.taskIdentifier && task.requirementId !== 'R0' && (
                <button
                  type="button"
                  onClick={(e) => onOpenCodeLink(task.requirementId!, task, e)}
                  className="px-2 py-0.5 rounded-full bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 font-mono text-[10px] font-semibold transition cursor-pointer"
                  title={getTaskManagerUrl(task.requirementId) ? 'Otevřít požadavek v TaskManageru' : 'Kliknutím zkopírovat kód'}
                >
                  {task.requirementId}
                </button>
              )}
            </>
          )}
        </div>

        {showAssignee && task.userName && (
          <div
            className={`w-6 h-6 rounded-full font-mono text-[10px] font-bold flex items-center justify-center text-center shadow-sm select-none shrink-0 ml-auto ${
              isCompletedView
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-indigo-500/20 text-indigo-300'
            }`}
            title={`Přiřazeno: ${formatUserDisplayName(task.userName)}`}
          >
            {getUserInitials(task.userName)}
          </div>
        )}
      </div>
    </div>
  );
};
