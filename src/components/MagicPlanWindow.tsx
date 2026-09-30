import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { AppConfig, MagicPlanData, PlanTaskItem, PlanDayInfo } from '../types';

interface MagicPlanWindowProps {
  config: AppConfig;
  onOpenSettings?: () => void;
}

export const MagicPlanWindow: React.FC<MagicPlanWindowProps> = ({ config, onOpenSettings }) => {
  const [data, setData] = useState<MagicPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'nastenka' | 'timeline' | 'list'>('nastenka');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Realtime clock ticker for timeline progress line (lightweight 10s interval)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
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
    if (!code) return null;
    const isLinked = config.magicplan?.linkWithTaskManager !== false;
    if (!isLinked) return null;
    const baseUrl = config.mlog?.baseUrl?.trim().replace(/\/+$/, '');
    if (!baseUrl) return null;

    const tPref = (config.mlog?.taskPrefix || 'T').trim();
    const rPref = (config.mlog?.requestPrefix || 'R').trim();
    const numOnly = code.replace(/\D/g, '');
    if (!numOnly) return null;

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
    const tmUrl = getTaskManagerUrl(task.taskIdentifier) || getTaskManagerUrl(task.requirementId);
    const url = tmUrl || task.url || config.magicplan?.url?.trim();
    if (!url) return;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }, [getTaskManagerUrl, config.magicplan?.url]);

  const handleOpenCodeLink = useCallback((code: string, task: PlanTaskItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
  }, [getTaskManagerUrl]);

  const myTasks = useMemo(() => data?.myTasks || [], [data]);
  const queueTasks = useMemo(() => data?.unassignedTasks || [], [data]);

  // Always compute current work week: Monday to Friday (5 days, no Saturday or Sunday)
  const workWeekDays = useMemo((): PlanDayInfo[] => {
    const now = new Date();
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
    const dayNames = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];

    const days: PlanDayInfo[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatLocalDate(d);
      const dayNum = d.getDate();
      const monthNum = d.getMonth() + 1;

      days.push({
        date: dateStr,
        dayLabel: `${dayNames[i]} ${dayNum}.${monthNum}.`,
        isWeekend: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, []);

  // Filtering
  const filteredMyTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return myTasks;
    return myTasks.filter((t) => {
      const titleMatch = (t.title || '').toLowerCase().includes(q);
      const customMatch = (t.customName || '').toLowerCase().includes(q);
      const reqMatch = (t.requirementId || '').toLowerCase().includes(q);
      const taskMatch = (t.taskIdentifier || '').toLowerCase().includes(q);
      const projMatch = (t.project || '').toLowerCase().includes(q);
      const authorMatch = (t.author || '').toLowerCase().includes(q);
      return titleMatch || customMatch || reqMatch || taskMatch || projMatch || authorMatch;
    });
  }, [myTasks, searchQuery]);

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
    for (const t of [...myTasks, ...queueTasks]) {
      if ((t.isCompleted || t.isSolved) && !seen.has(t.taskId)) {
        seen.add(t.taskId);
        list.push(t);
      }
    }
    return list;
  }, [myTasks, queueTasks]);

  // Active user tasks (excluding completed and notAvailable) for Nástěnka
  const activeMyTasks = useMemo(() => {
    return filteredMyTasks.filter((t) => !t.isCompleted && !t.isSolved && !t.isNotAvailable);
  }, [filteredMyTasks]);

  // Tasks for Timeline: includes dev, service, notAvailable, AND completed/solved items
  const timelineTasks = useMemo(() => {
    return filteredMyTasks;
  }, [filteredMyTasks]);

  // Task hour stats
  const devHours = useMemo(() => {
    return myTasks.filter((t) => t.taskType === 'dev').reduce((sum, t) => sum + (t.totalHours || 0), 0);
  }, [myTasks]);

  const serviceHours = useMemo(() => {
    return myTasks.filter((t) => t.taskType === 'service').reduce((sum, t) => sum + (t.totalHours || 0), 0);
  }, [myTasks]);

  const isConfigured = Boolean(
    config.extensions?.magicplan && config.magicplan?.url && config.magicplan?.userColumn
  );

  return (
    <div className="w-full h-full flex flex-col m3-surface-main text-gray-200 select-none overflow-hidden font-sans">
      {/* Scrollable Container with Integrated Non-Floating Header */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
        {/* Integrated Header (non-floating, scrolls with content) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            {/* Left branding & summary */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">calendar_month</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">MagicPlan</h2>
                  {data?.planRange && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-gray-300 font-mono">
                      {data.planRange}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>{config.magicplan?.userColumn || 'Plán'}</span>
                  <span>•</span>
                  <span className="text-gray-300 font-semibold">{data?.totalMyHours ?? 0}h celkem</span>
                  {myTasks.length > 0 && (
                    <span className="text-gray-500 font-mono text-[11px]">
                      (Vývoj: {devHours}h, Servis: {serviceHours}h)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
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
          </div>

          {/* Controls Bar: Search & 3-Tab Switcher */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Unified 3-Tab Switcher (Nástěnka, Timeline, Seznam) */}
            <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] rounded-full w-fit shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('nastenka')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'nastenka'
                    ? 'bg-indigo-500/20 m3-primary-surface text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="material-symbols-outlined text-sm">dashboard</span>
                <span>Nástěnka</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-indigo-500/20 m3-primary-surface text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="material-symbols-outlined text-sm">calendar_view_week</span>
                <span>Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-indigo-500/20 m3-primary-surface text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
                <span>Seznam</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hledat (název, kód R/T, projekt, zadavatel)..."
                className="w-full h-[38px] bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] rounded-full pl-9 pr-8 text-xs text-white placeholder-gray-500 outline-none transition border-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
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
          /* TAB 1: NÁSTĚNKA (3 sloupce: Nepřiřazené, Úkoly na mě, Splněné) */
          <BoardView
            unassignedTasks={filteredQueueTasks}
            myTasks={activeMyTasks}
            completedTasks={completedTasks}
            unassignedColumnName={config.magicplan?.unassignedColumn || 'Nepřiřazené úkoly'}
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
            planSettings={config.magicplan}
            onOpenTask={handleOpenTask}
            onOpenCodeLink={handleOpenCodeLink}
            getTaskManagerUrl={getTaskManagerUrl}
            copiedId={copiedId}
          />
        ) : (
          /* TAB 3: SEZNAM (Moderní borderless zobrazení) */
          <ListView
            tasks={filteredMyTasks}
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
            <strong className="text-indigo-300 font-mono">{data?.totalMyHours ?? 0}h</strong>
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
  unassignedColumnName,
  onOpenTask,
  onOpenCodeLink,
  getTaskManagerUrl,
  copiedId,
}) => {
  const unassignedHours = useMemo(() => {
    return unassignedTasks.reduce((acc, t) => acc + (t.totalHours || 0), 0);
  }, [unassignedTasks]);

  const myHours = useMemo(() => {
    return myTasks.reduce((acc, t) => acc + (t.totalHours || 0), 0);
  }, [myTasks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      {/* Sloupec 1: Nepřiřazené úkoly */}
      <div className="p-4 bg-white/[0.02] rounded-2xl flex flex-col gap-3 min-h-[350px]">
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

      {/* Sloupec 2: Úkoly na mě za sebou */}
      <div className="p-4 bg-white/[0.02] rounded-2xl flex flex-col gap-3 min-h-[350px]">
        <div className="flex items-center justify-between pb-1 select-none">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-indigo-400">person</span>
            <span className="text-xs font-bold text-white tracking-wide">Úkoly na mně</span>
          </div>
          <span className="text-xs font-mono font-semibold text-indigo-300">
            {myTasks.length} ({myHours}h)
          </span>
        </div>

        <div className="space-y-2 flex-1">
          {myTasks.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-gray-500 italic text-center">
              Nemáte žádné aktivní úkoly
            </div>
          ) : (
            myTasks.map((task) => (
              <TaskCard
                key={`board-my-${task.taskId}`}
                task={task}
                onOpenTask={onOpenTask}
                onOpenCodeLink={onOpenCodeLink}
                getTaskManagerUrl={getTaskManagerUrl}
                isCopied={copiedId === task.taskId}
              />
            ))
          )}
        </div>
      </div>

      {/* Sloupec 3: Splněné úkoly */}
      <div className="p-4 bg-white/[0.02] rounded-2xl flex flex-col gap-3 min-h-[350px]">
        <div className="flex items-center justify-between pb-1 select-none">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
            <span className="text-xs font-bold text-white tracking-wide">Splněné úkoly</span>
          </div>
          <span className="text-xs font-mono font-semibold text-gray-400">
            {completedTasks.length}
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
              />
            ))
          )}
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
  onOpenTask: (task: PlanTaskItem) => void;
  onOpenCodeLink: (code: string, task: PlanTaskItem, e?: React.MouseEvent) => void;
  getTaskManagerUrl: (code?: string) => string | null;
  copiedId: string | null;
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

const TimelineGridView: React.FC<TimelineGridViewProps> = ({
  days,
  tasks,
  currentTimeLabel,
  currentTime,
  planSettings,
  onOpenTask,
  onOpenCodeLink,
  getTaskManagerUrl,
  copiedId,
}) => {
  // Mode switcher: 'day' (výsek na vybraný den na celou šířku) vs 'week' (celý týden)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Today index (0 = Po ... 4 = Pá)
  const todayIdx = useMemo(() => days.findIndex((d) => d.isToday), [days]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() =>
    todayIdx !== -1 ? todayIdx : 0
  );

  // Hover state for custom tooltip in week view
  const [hoveredTask, setHoveredTask] = useState<{
    block: TimelineScheduledBlock;
    rect: DOMRect;
  } | null>(null);

  // Parse start and end hour for workday (standard: 09:00 to 17:00, or user custom from settings)
  const { startHour, endHour, startTimeLabel, endTimeLabel } = useMemo(() => {
    const mode = planSettings?.timelineTimeMode || 'real8h';
    if (mode === 'custom' && planSettings?.timelineCustomStart && planSettings?.timelineCustomEnd) {
      const [sH, sM] = planSettings.timelineCustomStart.split(':').map((x) => parseInt(x, 10) || 0);
      const [eH, eM] = planSettings.timelineCustomEnd.split(':').map((x) => parseInt(x, 10) || 0);
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
    // Default 8h workday starting at 09:00: 09:00 – 17:00
    return {
      startHour: 9,
      endHour: 17,
      startTimeLabel: '09:00',
      endTimeLabel: '17:00',
    };
  }, [planSettings?.timelineTimeMode, planSettings?.timelineCustomStart, planSettings?.timelineCustomEnd]);

  // The timeline ALWAYS has 8 dílků (each dílek = 1h from item, 8h capacity total per day)
  const totalDayHours = 8;
  const totalWeekColumns = 40;

  // 8 slot markers for the day:
  // "U dilku tedy nezobrazujeme cas. Jen u prvniho dilku cas od a posledniho dilku cas do"
  const daySlotMarkers = useMemo(() => {
    return [
      `${startTimeLabel} (1h)`,
      '2h',
      '3h',
      '4h',
      '5h',
      '6h',
      '7h',
      `8h (${endTimeLabel})`,
    ];
  }, [startTimeLabel, endTimeLabel]);

  // Realtime progress fraction according to custom start & end time
  // Example: 10:00 - 20:00 (span = 10h). At 15:00, elapsed = 5h -> fraction = 0.5 (end of 4th dílek)
  const timeProgressFraction = useMemo(() => {
    const currentHourDec = currentTime.getHours() + currentTime.getMinutes() / 60;
    const span = Math.max(0.1, endHour - startHour);
    return Math.max(0, Math.min(1, (currentHourDec - startHour) / span));
  }, [currentTime, startHour, endHour]);

  const weekTimeIndicatorPercent = useMemo(() => {
    if (todayIdx === -1) return null;
    const colPosition = todayIdx * 8 + timeProgressFraction * 8;
    return Math.max(0.5, Math.min(99.5, (colPosition / 40) * 100));
  }, [todayIdx, timeProgressFraction]);

  const dayTimeIndicatorPercent = useMemo(() => {
    if (todayIdx === -1 || selectedDayIndex !== todayIdx) return null;
    return Math.max(0.5, Math.min(99.5, timeProgressFraction * 100));
  }, [todayIdx, selectedDayIndex, timeProgressFraction]);

  // 1. Identify service tasks vs dev tasks vs notAvailable
  const isServiceTask = useCallback((t: PlanTaskItem): boolean => {
    if (t.isNotAvailable) return false;
    if (t.taskType === 'service') return true;
    const str = `${t.title} ${t.customName || ''} ${t.project || ''}`.toLowerCase();
    return str.includes('servis') || str.includes('hd') || str.includes('support');
  }, []);

  const completedTasks = useMemo(
    () => tasks.filter((t) => (t.isCompleted || t.isSolved) && !t.isNotAvailable),
    [tasks]
  );
  const notAvailableTasks = useMemo(
    () => tasks.filter((t) => t.isNotAvailable),
    [tasks]
  );
  const serviceTasks = useMemo(
    () => tasks.filter((t) => isServiceTask(t) && !t.isNotAvailable && !t.isCompleted && !t.isSolved),
    [tasks, isServiceTask]
  );
  const devTasks = useMemo(
    () => tasks.filter((t) => !isServiceTask(t) && !t.isNotAvailable && !t.isCompleted && !t.isSolved),
    [tasks, isServiceTask]
  );

  // 2. Map unavailable tasks to days (0..4 for Po..Pá)
  const dayNA = useMemo(() => {
    const map = new Map<number, PlanTaskItem[]>();
    for (let i = 0; i < 5; i++) map.set(i, []);
    for (const na of notAvailableTasks) {
      if (na.dates && na.dates.length > 0) {
        for (const dStr of na.dates) {
          const idx = days.findIndex((d) => d.date === dStr);
          if (idx !== -1 && idx < 5) {
            map.get(idx)?.push(na);
          }
        }
      }
    }
    return map;
  }, [days, notAvailableTasks]);

  // Map completed tasks to days (if assigned day is fully NotAvailable like a state holiday, move to next work day)
  const dayCompleted = useMemo(() => {
    const map = new Map<number, PlanTaskItem[]>();
    for (let i = 0; i < 5; i++) map.set(i, []);

    const fallbackDayIndex = todayIdx !== -1 ? todayIdx : 2;

    for (const c of completedTasks) {
      let assignedDay = -1;
      if (c.dates && c.dates.length > 0) {
        for (const dStr of c.dates) {
          const idx = days.findIndex((d) => d.date === dStr);
          if (idx !== -1 && idx < 5) {
            assignedDay = idx;
            break;
          }
        }
        if (assignedDay === -1) {
          continue; // from another week
        }
      } else {
        assignedDay = fallbackDayIndex;
      }

      // If assigned day is completely full of NotAvailable (e.g. Monday holiday), push to next available work day
      const naHoursInDay = (dayNA.get(assignedDay) || []).reduce(
        (sum, na) => sum + (na.totalHours > 0 ? na.totalHours : totalDayHours),
        0
      );
      if (naHoursInDay >= totalDayHours && assignedDay + 1 < 5) {
        assignedDay = assignedDay + 1;
      }

      map.get(assignedDay)?.push(c);
    }

    return map;
  }, [days, completedTasks, dayNA, todayIdx, totalDayHours]);

  const dayServices = useMemo(() => {
    const map = new Map<number, PlanTaskItem[]>();
    for (let i = 0; i < 5; i++) map.set(i, []);

    const fallbackDayIndex = todayIdx !== -1 ? todayIdx : 2; // Default to Wednesday if undated

    for (const s of serviceTasks) {
      let assignedDay = -1;
      if (s.dates && s.dates.length > 0) {
        for (const dStr of s.dates) {
          const idx = days.findIndex((d) => d.date === dStr);
          if (idx !== -1 && idx < 5) {
            assignedDay = idx;
            break;
          }
        }
        // If service task has specific dates, but none match this work week,
        // it belongs to another week - do not squeeze it into this week!
        if (assignedDay === -1) {
          continue;
        }
      } else {
        // Only undated service tasks fall back to current active day
        assignedDay = fallbackDayIndex;
      }
      map.get(assignedDay)?.push(s);
    }

    return map;
  }, [days, serviceTasks, todayIdx]);

  // 3. Calculate day capacities (NotAvailable has absolute top priority, then completed, then services, then dev)
  const dayCapacities = useMemo(() => {
    return days.slice(0, 5).map((day, dIdx) => {
      const naItems = dayNA.get(dIdx) || [];
      const naHours = naItems.reduce((sum, na) => sum + (na.totalHours > 0 ? na.totalHours : totalDayHours), 0);
      const cappedNAHours = Math.min(totalDayHours, naHours);

      const remainingAfterNA = Math.max(0, totalDayHours - cappedNAHours);

      const compItems = dayCompleted.get(dIdx) || [];
      const compHours = compItems.reduce((sum, c) => sum + (c.totalHours > 0 ? c.totalHours : 1), 0);
      const cappedCompHours = Math.min(remainingAfterNA, compHours);

      const remainingAfterComp = Math.max(0, remainingAfterNA - cappedCompHours);

      const services = dayServices.get(dIdx) || [];
      const serviceHours = services.reduce(
        (sum, s) => sum + (s.totalHours > 0 ? s.totalHours : 1),
        0
      );
      const cappedServiceHours = Math.min(remainingAfterComp, serviceHours);
      const availableDevHours = Math.max(0, remainingAfterComp - cappedServiceHours);

      return {
        dayIndex: dIdx,
        date: day.date,
        dayLabel: day.dayLabel,
        isToday: day.isToday,
        naHours: cappedNAHours,
        completedHours: cappedCompHours,
        serviceHours: cappedServiceHours,
        availableDevHours,
        totalCapacity: totalDayHours,
      };
    });
  }, [days, dayNA, dayCompleted, dayServices, totalDayHours]);

  // 4. Sequentially schedule dev tasks across days ("za sebou"), interleaving services, completed, and NA
  const { scheduledBlocks, overflowTasks, freeSlots } = useMemo(() => {
    const blocks: TimelineScheduledBlock[] = [];
    const overflow: { task: PlanTaskItem; remainingHours: number }[] = [];
    const free: { dayIndex: number; startCol: number; spanCols: number; freeHours: number }[] = [];

    let devIdx = 0;
    let devTaskRemaining = devTasks[0] ? devTasks[0].totalHours || 1 : 0;
    let devPart = 1;

    for (let d = 0; d < 5; d++) {
      const cap = dayCapacities[d];
      let slotInDay = 0;

      // A) Allocate NotAvailable items first (e.g. state holiday, absence - takes full priority)
      const naItems = dayNA.get(d) || [];
      for (const na of naItems) {
        const naH = na.totalHours > 0 ? na.totalHours : totalDayHours;
        const spanCols = Math.min(totalDayHours - slotInDay, Math.max(1, Math.round(naH)));
        if (spanCols > 0) {
          const startCol = d * totalDayHours + slotInDay + 1;
          blocks.push({
            id: `na-${na.taskId}-d${d}`,
            task: na,
            isService: false,
            isNotAvailable: true,
            isCompleted: false,
            dayIndex: d,
            startCol,
            spanCols,
            chunkHours: spanCols,
            totalHours: naH,
            partIndex: 1,
            totalParts: 1,
            isSplit: false,
          });
          slotInDay += spanCols;
        }
      }

      // B) Allocate Completed items next (work already done on this day)
      const compItems = dayCompleted.get(d) || [];
      for (const comp of compItems) {
        const compH = comp.totalHours > 0 ? comp.totalHours : 1;
        const spanCols = Math.min(totalDayHours - slotInDay, Math.max(1, Math.round(compH)));
        if (spanCols > 0) {
          const startCol = d * totalDayHours + slotInDay + 1;
          blocks.push({
            id: `comp-${comp.taskId}-d${d}`,
            task: comp,
            isService: false,
            isNotAvailable: false,
            isCompleted: true,
            isCritical: comp.isCritical,
            dayIndex: d,
            startCol,
            spanCols,
            chunkHours: spanCols,
            totalHours: compH,
            partIndex: 1,
            totalParts: 1,
            isSplit: false,
          });
          slotInDay += spanCols;
        }
      }

      // C) Allocate dev tasks for this day up to availableDevHours
      let availableDevLeft = cap.availableDevHours;

      while (availableDevLeft > 0 && devIdx < devTasks.length) {
        const currentTask = devTasks[devIdx];
        const taskTotal = currentTask.totalHours > 0 ? currentTask.totalHours : 1;
        const chunk = Math.min(availableDevLeft, devTaskRemaining);
        const isSplit = taskTotal > chunk || devTaskRemaining < taskTotal;
        const totalPartsEst = Math.max(1, Math.ceil(taskTotal / totalDayHours));

        const spanCols = Math.max(1, Math.round(chunk));
        const startCol = d * totalDayHours + slotInDay + 1;

        blocks.push({
          id: `${currentTask.taskId}-d${d}-p${devPart}`,
          task: currentTask,
          isService: false,
          isCritical: currentTask.isCritical,
          dayIndex: d,
          startCol,
          spanCols,
          chunkHours: chunk,
          totalHours: taskTotal,
          partIndex: devPart,
          totalParts: totalPartsEst,
          isSplit,
          isOverflowPart: devPart > 1,
        });

        slotInDay += spanCols;
        availableDevLeft -= chunk;
        devTaskRemaining -= chunk;

        if (devTaskRemaining <= 0) {
          devIdx++;
          devPart = 1;
          if (devIdx < devTasks.length) {
            devTaskRemaining = devTasks[devIdx].totalHours > 0 ? devTasks[devIdx].totalHours : 1;
          }
        } else {
          devPart++;
        }
      }

      // D) Allocate services for this day right after dev tasks ("mezi ně")
      const services = dayServices.get(d) || [];
      for (const s of services) {
        const sHours = s.totalHours > 0 ? s.totalHours : 1;
        const spanCols = Math.min(totalDayHours - slotInDay, Math.max(1, Math.round(sHours)));
        if (spanCols > 0) {
          const startCol = d * totalDayHours + slotInDay + 1;
          blocks.push({
            id: `service-${s.taskId}-d${d}`,
            task: s,
            isService: true,
            isCritical: s.isCritical,
            dayIndex: d,
            startCol,
            spanCols,
            chunkHours: sHours,
            totalHours: sHours,
            partIndex: 1,
            totalParts: 1,
            isSplit: false,
          });
          slotInDay += spanCols;
        }
      }

      // E) Free capacity slot if day is under totalDayHours
      if (slotInDay < totalDayHours) {
        const freeH = totalDayHours - slotInDay;
        free.push({
          dayIndex: d,
          startCol: d * totalDayHours + slotInDay + 1,
          spanCols: freeH,
          freeHours: freeH,
        });
      }
    }

    // Dev tasks overflowing past Friday's hours
    if (devIdx < devTasks.length) {
      if (devTaskRemaining > 0) {
        overflow.push({ task: devTasks[devIdx], remainingHours: devTaskRemaining });
        devIdx++;
      }
      while (devIdx < devTasks.length) {
        overflow.push({ task: devTasks[devIdx], remainingHours: devTasks[devIdx].totalHours || 1 });
        devIdx++;
      }
    }

    return { scheduledBlocks: blocks, overflowTasks: overflow, freeSlots: free };
  }, [dayCapacities, devTasks, dayServices, dayCompleted, dayNA, totalDayHours]);

  // 5. In Week view: MERGE contiguous blocks of the same task across days into one continuous element
  const weekMergedBlocks = useMemo(() => {
    const merged: TimelineScheduledBlock[] = [];
    for (const block of scheduledBlocks) {
      const prev = merged[merged.length - 1];
      if (
        prev &&
        prev.task.taskId === block.task.taskId &&
        !prev.isService &&
        !block.isService &&
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
        merged.push({ ...block });
      }
    }
    return merged;
  }, [scheduledBlocks]);

  // Total scheduled hours
  const totalWeekScheduledHours = useMemo(() => {
    return scheduledBlocks.reduce((sum, b) => sum + b.chunkHours, 0);
  }, [scheduledBlocks]);

  // Current day data in 'day' view
  const currentSelectedDay = dayCapacities[selectedDayIndex] || dayCapacities[0];
  const dayItems = useMemo(() => {
    return scheduledBlocks.filter((b) => b.dayIndex === selectedDayIndex);
  }, [scheduledBlocks, selectedDayIndex]);

  const currentDayFree = useMemo(() => {
    return freeSlots.find((f) => f.dayIndex === selectedDayIndex);
  }, [freeSlots, selectedDayIndex]);

  return (
    <div className="space-y-6">
      {/* View Mode Switcher (Den vs Týden) + Day Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap select-none">
        {/* View Mode Pills (Den vs Týden) */}
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] rounded-full w-fit">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'day'
                ? 'bg-indigo-500/20 text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            <span>Den (Detail)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'week'
                ? 'bg-indigo-500/20 text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm">calendar_view_week</span>
            <span>Týden (40h přehled)</span>
          </button>
        </div>

        {/* Day Navigator (Active in 'day' view) */}
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

            <div className="px-4 py-1.5 rounded-full bg-white/[0.05] text-xs font-bold text-gray-200 flex items-center gap-2">
              <span>{currentSelectedDay?.dayLabel}</span>
              {currentSelectedDay?.isToday && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold uppercase tracking-wider">
                  Dnes
                </span>
              )}
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

            {todayIdx !== -1 && selectedDayIndex !== todayIdx && (
              <button
                type="button"
                onClick={() => setSelectedDayIndex(todayIdx)}
                className="ml-1 px-3 py-1.5 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-semibold transition cursor-pointer"
              >
                Přejít na Dnes
              </button>
            )}
          </div>
        )}
      </div>

      {/* VIEW 1: DENNÍ VÝSEK (1 den na celou šířku okna, 8 širokých sloupců od 09:00 do 17:00) */}
      {viewMode === 'day' ? (
        <div className="w-full rounded-3xl bg-[#0d0f17]/80 border border-white/[0.04] p-5 shadow-2xl backdrop-blur-md">
          <div className="relative select-none">
            {/* Realtime Moving Time Indicator Line (ON TOP of tasks, z-40, pointer-events-none) */}
            {dayTimeIndicatorPercent !== null && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-40 flex flex-col items-center -translate-x-1/2 transition-all duration-300"
                style={{ left: `${dayTimeIndicatorPercent}%` }}
              >
                {/* Floating Time Pill Indicator at top (dedicated lane) */}
                <div className="px-2.5 py-0.5 rounded-full bg-[#161a26] border border-indigo-400/80 text-indigo-300 font-mono text-[10px] font-bold shadow-[0_0_15px_rgba(99,102,241,0.5)] flex items-center gap-1.5 shrink-0 z-50 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  <span>{currentTimeLabel}</span>
                </div>
                {/* Vertical Guideline extending continuously down OVER all tasks */}
                <div className="w-[2px] flex-1 bg-indigo-400/80 shadow-[0_0_12px_rgba(99,102,241,0.9)] z-40" />
              </div>
            )}

            {/* Top Dedicated Time Cursor Track (32px lane so chip doesn't cover headers) */}
            <div className="h-8 w-full mb-1" />

            {/* Column Hour Sub-Markers (Dynamic according to startHour and totalDayHours) */}
            <div
              className="grid gap-1 pb-3 mb-2 border-b border-white/[0.06] text-xs text-gray-400 font-mono text-center"
              style={{ gridTemplateColumns: `repeat(${totalDayHours}, minmax(0, 1fr))` }}
            >
              {daySlotMarkers.map((slot, i) => (
                <div key={i} className="py-1 bg-white/[0.02] rounded-lg truncate px-1">
                  {slot}
                </div>
              ))}
            </div>

            {/* Day Column Grid Track */}
            <div className="relative w-full rounded-2xl overflow-hidden py-2 min-h-[140px]">
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

              {/* Day Scheduled Tasks (Primary indigo for DEV, Secondary purple for SERVIS, Muted for NA) */}
              <div
                className="relative z-10 gap-2 items-stretch"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${totalDayHours}, minmax(0, 1fr))` }}
              >
                {dayItems.length === 0 ? (
                  <div
                    style={{ gridColumn: `1 / span ${totalDayHours}`, gridRow: 1 }}
                    className="rounded-2xl p-8 border border-dashed border-white/10 bg-white/[0.015] text-gray-500 text-xs flex flex-col items-center justify-center gap-2 select-none min-h-[120px]"
                  >
                    <span className="material-symbols-outlined text-2xl opacity-40">weekend</span>
                    <span>Žádné úkoly pro tento den</span>
                    <span className="text-[11px] text-gray-600">{totalDayHours} hodin volné kapacity</span>
                  </div>
                ) : (
                  dayItems.map((block) => {
                    const { task, chunkHours, totalHours, isService, isNotAvailable, isCompleted, isCritical, isSplit, partIndex, totalParts } = block;
                    const isCrit = Boolean(isCritical || task.isCritical);
                    const dayColStart = ((block.startCol - 1) % totalDayHours) + 1;
                    const spanCols = Math.min(totalDayHours - dayColStart + 1, block.spanCols);
                    const reqCode = task.requirementId;
                    const taskCode = task.taskIdentifier;
                    const displayCode = taskCode || reqCode;

                    return (
                      <div
                        key={block.id}
                        style={{ gridColumn: `${dayColStart} / span ${spanCols}`, gridRow: 1 }}
                        onClick={() => onOpenTask(task)}
                        className={`rounded-2xl p-2.5 flex flex-col justify-between gap-1.5 transition-all cursor-pointer shadow-md select-none overflow-hidden min-w-0 ${
                          isCrit
                            ? 'outline outline-2 outline-red-500 ring-2 ring-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.45)] '
                            : ''
                        }${
                          isCompleted
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white border border-emerald-400/30 shadow-emerald-950/30'
                            : isNotAvailable
                            ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 shadow-black/20'
                            : isService
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white border border-purple-400/30 shadow-purple-950/30'
                            : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white border border-indigo-400/30 shadow-indigo-950/30'
                        }`}
                      >
                        {/* Content area: Title, Project, and Part/Hours row */}
                        <div className="min-w-0 flex flex-col gap-0.5">
                          {/* Row 1: Task Title */}
                          <div className="font-bold text-xs text-white truncate leading-tight">
                            {task.customName || task.title}
                          </div>

                          {/* Row 2: Project name */}
                          {task.project && (
                            <div className="text-[10px] text-white/70 truncate leading-tight">
                              {task.project}
                            </div>
                          )}

                          {/* Row 3: Part & Hours on their own row below title and project */}
                          <div className="flex items-center gap-1.5 text-[10px] text-white/90 font-mono pt-0.5 flex-wrap">
                            {isCrit && (
                              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold shrink-0 flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px] text-white">warning</span>
                                Kritická
                              </span>
                            )}
                            {isCompleted ? (
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/60 border border-emerald-400/40 text-emerald-200 text-[9px] font-bold shrink-0">
                                Hotovo
                              </span>
                            ) : isSplit ? (
                              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[9px] font-bold shrink-0">
                                díl {partIndex}/{totalParts}
                              </span>
                            ) : null}
                            <span className="font-bold text-[10px]">
                              {isNotAvailable
                                ? chunkHours === totalDayHours
                                  ? `${chunkHours}h (celý den)`
                                  : `${chunkHours}h`
                                : isSplit
                                ? `${chunkHours}h z ${totalHours}h`
                                : `${chunkHours}h`}
                            </span>
                          </div>
                        </div>

                        {/* Bottom row: clickable code (Txxx/Rxxx) + smaller author circle (NO divider border!) */}
                        <div className="flex items-center justify-between gap-1 text-[10px] min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isNotAvailable ? (
                              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-zinc-300 font-sans truncate">
                                Státní svátek / Volno
                              </span>
                            ) : (
                              <>
                                {displayCode && (
                                  <button
                                    type="button"
                                    onClick={(e) => onOpenCodeLink(displayCode, task, e)}
                                    className="px-1.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-mono font-bold text-[10px] transition cursor-pointer truncate shrink-0"
                                    title="Otevřít v TaskManageru"
                                  >
                                    {displayCode}
                                  </button>
                                )}

                                {/* Author initials in small compact circle next to Txxx */}
                                {task.author && (
                                  <div
                                    className="w-5 h-5 rounded-full bg-white/20 shrink-0 flex items-center justify-center font-bold text-[9px] text-white shadow-inner font-mono"
                                    title={`Zadavatel: ${task.author}`}
                                  >
                                    {task.author}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Small type indicator icon (dev vs service) */}
                          <span className="material-symbols-outlined text-xs text-white/50 shrink-0">
                            {isCompleted ? 'task_alt' : isNotAvailable ? 'celebration' : isService ? 'support_agent' : 'terminal'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Free capacity block for the day */}
                {currentDayFree && currentDayFree.freeHours > 0 && (
                  <div
                    style={{
                      gridColumn: `${((currentDayFree.startCol - 1) % totalDayHours) + 1} / span ${currentDayFree.spanCols}`,
                      gridRow: 1,
                    }}
                    className="rounded-2xl p-4 border border-dashed border-white/10 bg-white/[0.015] hover:bg-white/[0.03] text-gray-500 text-xs flex items-center justify-center gap-2 transition select-none min-h-[90px]"
                  >
                    <span className="material-symbols-outlined text-base opacity-60">hourglass_empty</span>
                    <span className="font-mono font-semibold">+{currentDayFree.freeHours}h volná kapacita</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: TÝDENNÍ PŘEHLED (40 sloupců, sloučené přetékající bloky, bez textu, custom tooltip) */
        <div className="w-full overflow-x-auto pb-4 rounded-3xl bg-[#0d0f17]/80 border border-white/[0.04] p-5 shadow-2xl backdrop-blur-md">
          <div className="min-w-[1040px] relative select-none">
            {/* Realtime Moving Time Indicator Line (ON TOP of tasks, z-40, pointer-events-none) */}
            {weekTimeIndicatorPercent !== null && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-40 flex flex-col items-center -translate-x-1/2 transition-all duration-300"
                style={{ left: `${weekTimeIndicatorPercent}%` }}
              >
                {/* Floating Time Pill Indicator at top (dedicated lane) */}
                <div className="px-2.5 py-0.5 rounded-full bg-[#161a26] border border-indigo-400/80 text-indigo-300 font-mono text-[10px] font-bold shadow-[0_0_15px_rgba(99,102,241,0.5)] flex items-center gap-1.5 shrink-0 z-50 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  <span>{currentTimeLabel}</span>
                </div>
                {/* Vertical Guideline extending continuously down OVER all tasks */}
                <div className="w-[2px] flex-1 bg-indigo-400/80 shadow-[0_0_12px_rgba(99,102,241,0.9)] z-40" />
              </div>
            )}

            {/* Top Dedicated Time Cursor Track (32px lane so chip doesn't cover headers) */}
            <div className="h-8 w-full mb-1" />

            {/* 5 Day Headers (Po, Út, St, Čt, Pá) */}
            <div className="grid grid-cols-5 gap-0 border-b border-white/[0.06] pb-3 mb-2">
              {dayCapacities.map((day) => {
                const dayBlocks = scheduledBlocks.filter((b) => b.dayIndex === day.dayIndex);
                const dayHours = dayBlocks.reduce((sum, b) => sum + b.chunkHours, 0);

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
                          dayHours >= totalDayHours ? 'text-indigo-300' : 'text-gray-400'
                        }`}
                      >
                        {dayHours}/{totalDayHours}h
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

            {/* Dynamic Column Background Grid & Week Merged Items Track */}
            <div className="relative w-full rounded-2xl overflow-hidden py-2 space-y-2">
              {/* Background Column Lines */}
              <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${totalWeekColumns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: totalWeekColumns }).map((_, colIdx) => {
                  const dayIdx = Math.floor(colIdx / totalDayHours);
                  const isDayBoundary = (colIdx + 1) % totalDayHours === 0;
                  const isTodayCol = dayCapacities[dayIdx]?.isToday;

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

              {/* Merged Items Row (No text inside, clean primary/secondary bars that overflow across days!) */}
              <div
                className="relative z-10 gap-1.5 min-h-[58px] items-stretch"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${totalWeekColumns}, minmax(0, 1fr))` }}
              >
                {weekMergedBlocks.map((block) => {
                  const { task, startCol, spanCols, isService, isNotAvailable, isCompleted, isCritical } = block;
                  const isCrit = Boolean(isCritical || task.isCritical);

                  return (
                    <div
                      key={block.id}
                      style={{ gridColumn: `${startCol} / span ${spanCols}`, gridRow: 1 }}
                      onClick={() => onOpenTask(task)}
                      onMouseEnter={(e) =>
                        setHoveredTask({ block, rect: e.currentTarget.getBoundingClientRect() })
                      }
                      onMouseLeave={() => setHoveredTask(null)}
                      className={`rounded-2xl transition-all cursor-pointer shadow-md select-none flex items-center justify-center overflow-hidden ${
                        isCrit
                          ? 'outline outline-2 outline-red-500 ring-2 ring-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.45)] '
                          : ''
                      }${
                        isCompleted
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-400/30 shadow-emerald-950/30'
                          : isNotAvailable
                          ? 'bg-zinc-800/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 shadow-black/20'
                          : isService
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border border-purple-400/30 shadow-purple-950/30'
                          : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 border border-indigo-400/30 shadow-indigo-950/30'
                      }`}
                    >
                      {/* Text is hidden in week view, clean pill bar */}
                      <span className="material-symbols-outlined text-xs pointer-events-none text-white/50">
                        {isCompleted ? 'task_alt' : isNotAvailable ? 'celebration' : isService ? 'support_agent' : 'terminal'}
                      </span>
                    </div>
                  );
                })}

                {/* Free Capacity Slots */}
                {freeSlots.map((free) => (
                  <div
                    key={`free-${free.dayIndex}-${free.startCol}`}
                    style={{ gridColumn: `${free.startCol} / span ${free.spanCols}`, gridRow: 1 }}
                    className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] hover:bg-white/[0.03] text-gray-500 text-xs flex items-center justify-center gap-1 transition select-none min-h-[58px]"
                    title={`${free.freeHours}h volné kapacity`}
                  >
                    <span className="font-mono text-[10px] opacity-60">+{free.freeHours}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Floating Tooltip for Week View (Appears below hovered element) */}
      {viewMode === 'week' && hoveredTask && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 p-3.5 rounded-2xl bg-[#161a26]/95 backdrop-blur-md border border-white/10 shadow-2xl text-xs space-y-2 min-w-[240px] max-w-[320px] animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: hoveredTask.rect.bottom + 10,
            left: hoveredTask.rect.left + hoveredTask.rect.width / 2,
          }}
        >
          {/* Header row: Type badge + hours */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {Boolean(hoveredTask.block.isCritical || hoveredTask.block.task.isCritical) && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-600 text-white flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px] text-white">warning</span>
                  Kritická
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  hoveredTask.block.isCompleted
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : hoveredTask.block.isNotAvailable
                    ? 'bg-zinc-700/60 text-zinc-300'
                    : hoveredTask.block.isService
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-indigo-500/20 text-indigo-300'
                }`}
              >
                {hoveredTask.block.isCompleted
                  ? 'Hotovo / Splněno'
                  : hoveredTask.block.isNotAvailable
                  ? 'Státní svátek / Volno'
                  : hoveredTask.block.isService
                  ? 'Servis'
                  : 'Vývoj'}
              </span>
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
            {hoveredTask.block.task.requirementId &&
              hoveredTask.block.task.requirementId !== hoveredTask.block.task.taskIdentifier && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                  {hoveredTask.block.task.requirementId}
                </span>
              )}
            {hoveredTask.block.task.author && (
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-200 font-bold">
                {hoveredTask.block.task.author}
              </span>
            )}
            {hoveredTask.block.task.project && (
              <span className="truncate max-w-[140px] text-gray-400 font-sans">
                {hoveredTask.block.task.project}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 italic pt-1 border-t border-white/5">
            Kliknutím otevřít v TaskManageru
          </div>
        </div>
      )}

      {/* Week Capacity & Workload Summary Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.02] flex items-center justify-between gap-4 flex-wrap text-xs text-gray-400 select-none">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm" />
            <span>Vývoj (DEV úkoly - primární)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm" />
            <span>Servisy & HD (sekundární)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-dashed border-gray-500" />
            <span>Volná kapacita</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span>
            Naplánováno:{' '}
            <strong className="text-indigo-300 font-bold">{totalWeekScheduledHours}h</strong> / 40h
          </span>
          <span>•</span>
          <span>
            Zbývá v týdnu:{' '}
            <strong className="text-gray-300 font-bold">
              {Math.max(0, 40 - totalWeekScheduledHours)}h
            </strong>
          </span>
        </div>
      </div>

      {/* Overflow Tasks Section (Tasks exceeding 40h workweek) */}
      {overflowTasks.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/[0.02] space-y-3">
          <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-2 select-none">
            <span className="material-symbols-outlined text-sm text-indigo-400">arrow_forward</span>
            <span>Úkoly přesahující do dalšího týdne ({overflowTasks.length})</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {overflowTasks.map(({ task, remainingHours }) => (
              <TaskCard
                key={`timeline-overflow-${task.taskId}`}
                task={{ ...task, totalHours: remainingHours }}
                onOpenTask={onOpenTask}
                onOpenCodeLink={onOpenCodeLink}
                getTaskManagerUrl={getTaskManagerUrl}
                isCopied={copiedId === task.taskId}
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
  onOpenTask: (task: PlanTaskItem) => void;
  onOpenCodeLink: (code: string, task: PlanTaskItem, e?: React.MouseEvent) => void;
  getTaskManagerUrl: (code?: string) => string | null;
  copiedId: string | null;
}

const ListView: React.FC<ListViewProps> = ({
  tasks,
  onOpenTask,
  onOpenCodeLink,
  getTaskManagerUrl,
  copiedId,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400 text-xs">
        Žádné úkoly neodpovídají zadanému filtru.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header bar */}
      <div className="grid grid-cols-[36px_140px_1fr_180px_120px_70px] items-center px-4 py-2 gap-3 text-[11px] text-gray-400 font-medium uppercase tracking-wider select-none">
        <div>Typ</div>
        <div>Kód & Zadavatel</div>
        <div>Název úkolu</div>
        <div>Projekt</div>
        <div>Termín</div>
        <div className="text-right">Hodiny</div>
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {tasks.map((task) => {
          const isDev = task.taskType === 'dev';
          const isCrit = Boolean(task.isCritical);
          return (
            <div
              key={task.taskId}
              onClick={() => onOpenTask(task)}
              className={`grid grid-cols-[36px_140px_1fr_180px_120px_70px] items-center px-4 py-3 gap-3 text-xs rounded-2xl transition-colors cursor-pointer select-none group ${
                isCrit
                  ? 'outline outline-2 outline-red-500 ring-2 ring-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)] bg-red-950/20 hover:bg-red-950/30'
                  : 'bg-white/[0.02] hover:bg-white/[0.05]'
              }`}
            >
              {/* Type icon (dev vs service) */}
              <div>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
                    isDev
                      ? 'bg-indigo-500/15 text-indigo-300'
                      : task.taskType === 'service'
                      ? 'bg-purple-500/15 text-purple-300'
                      : 'bg-white/5 text-gray-300'
                  }`}
                  title={isDev ? 'Vývoj' : 'Servis'}
                >
                  <span className="material-symbols-outlined text-sm">
                    {task.isPinned ? 'push_pin' : isDev ? 'code' : 'build'}
                  </span>
                </span>
              </div>

              {/* R / T codes & Author initials & Critical badge */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {isCrit && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold tracking-wider shrink-0 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px] text-white">warning</span>
                    <span>Kritická</span>
                  </span>
                )}
                {task.author && (
                  <span
                    className="px-2 py-0.5 rounded-full bg-white/10 text-gray-200 font-mono text-[10px] font-bold tracking-wider"
                    title="Zadavatel úkolu"
                  >
                    {task.author}
                  </span>
                )}
                {task.taskIdentifier && (
                  <button
                    type="button"
                    onClick={(e) => onOpenCodeLink(task.taskIdentifier!, task, e)}
                    className="px-2 py-0.5 rounded-full bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 font-mono text-[11px] font-semibold transition cursor-pointer"
                    title={getTaskManagerUrl(task.taskIdentifier) ? 'Otevřít úkol v TaskManageru' : 'Kliknutím zkopírovat kód'}
                  >
                    {task.taskIdentifier}
                  </button>
                )}
                {task.requirementId && task.requirementId !== task.taskIdentifier && (
                  <button
                    type="button"
                    onClick={(e) => onOpenCodeLink(task.requirementId!, task, e)}
                    className="px-2 py-0.5 rounded-full bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 font-mono text-[11px] font-semibold transition cursor-pointer"
                    title={getTaskManagerUrl(task.requirementId) ? 'Otevřít požadavek v TaskManageru' : 'Kliknutím zkopírovat kód'}
                  >
                    {task.requirementId}
                  </button>
                )}
              </div>

              {/* Title */}
              <div className="min-w-0 pr-2">
                <span className="font-semibold text-white truncate block" title={task.title}>
                  {task.customName || task.title}
                </span>
              </div>

              {/* Project */}
              <div className="truncate text-gray-400 text-xs" title={task.project}>
                {task.project || '–'}
              </div>

              {/* Dates */}
              <div className="text-gray-400 font-mono text-[11px] truncate">
                {task.dates && task.dates.length > 0 ? task.dates.join(', ') : '–'}
              </div>

              {/* Hours */}
              <div className="text-right">
                <span className="font-mono font-bold text-indigo-300 bg-indigo-500/15 px-2.5 py-0.5 rounded-full text-xs">
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
        isCrit
          ? 'outline outline-2 outline-red-500 ring-2 ring-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)] bg-red-950/20 hover:bg-red-950/30'
          : isCompletedView
          ? 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08] opacity-75'
          : 'bg-white/[0.03] hover:bg-white/[0.06]'
      }`}
    >
      {/* Top row: tags, author acronym, hours */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Critical priority badge */}
          {isCrit && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 bg-red-600 text-white">
              <span className="material-symbols-outlined text-[11px] text-white">warning</span>
              <span>Kritická</span>
            </span>
          )}

          {/* Dev / Service badge */}
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 ${
              isCompletedView
                ? 'bg-emerald-500/15 text-emerald-300'
                : isDev
                ? 'bg-indigo-500/15 text-indigo-300'
                : isService
                ? 'bg-purple-500/15 text-purple-300'
                : 'bg-white/5 text-gray-300'
            }`}
          >
            {isCompletedView ? (
              <span className="material-symbols-outlined text-[10px]">check</span>
            ) : (
              task.isPinned && <span className="material-symbols-outlined text-[10px]">push_pin</span>
            )}
            <span>{isCompletedView ? 'Splněno' : isDev ? 'Vývoj' : isService ? 'Servis' : 'Úkol'}</span>
          </span>

          {/* Author / Zadavatel acronym pill (e.g. VM) */}
          {task.author && (
            <span
              className="px-2 py-0.5 rounded-full bg-white/10 text-gray-200 font-mono text-[10px] font-bold tracking-wider"
              title="Zadavatel úkolu"
            >
              {task.author}
            </span>
          )}

          {/* Task / Req Codes */}
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
          {task.requirementId && task.requirementId !== task.taskIdentifier && (
            <button
              type="button"
              onClick={(e) => onOpenCodeLink(task.requirementId!, task, e)}
              className="px-2 py-0.5 rounded-full bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 font-mono text-[10px] font-semibold transition cursor-pointer"
              title={getTaskManagerUrl(task.requirementId) ? 'Otevřít požadavek v TaskManageru' : 'Kliknutím zkopírovat kód'}
            >
              {task.requirementId}
            </button>
          )}
        </div>

        {/* Hours Pill */}
        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono text-xs font-bold shrink-0">
          {task.totalHours}h
        </span>
      </div>

      {/* Middle: Title */}
      <div className={`text-xs font-semibold leading-snug line-clamp-2 ${isCompletedView ? 'line-through text-gray-400' : 'text-white'}`}>
        {task.customName || task.title}
      </div>

      {/* Bottom row: Project (NO hover action icons!) */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
        <div className="truncate max-w-[200px]" title={task.project || 'Projekt'}>
          {task.project || '–'}
        </div>

        {showAssignee && task.userName && (
          <div className="text-[10px] text-gray-400 flex items-center gap-1 shrink-0">
            <span className="material-symbols-outlined text-[11px]">person</span>
            <span className="truncate max-w-[90px]">{task.userName}</span>
          </div>
        )}
      </div>
    </div>
  );
};
