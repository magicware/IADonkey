import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppConfig, DataSource, FileSource, ApiSource, StaticSource, LauncherItem, SyncProgress, UpdateInfo, SourceFieldMapping, MappingTargetKey, BannedItem, CustomSnippet, ActionLogEntry, CrashLogEntry } from '../types';
import { applyPrimaryColor, applyActionsColor, APP_COLOR_PRESETS } from '../utils/theme';
import { formatLastSyncDate } from '../utils/dateHelper';
import { CURRENT_APP_VERSION } from '../changelog';
import { ChangelogModal } from './ChangelogModal';
import { SearchItemsViewerModal } from './SearchItemsViewerModal';
import { DataSourcesGuideModal } from './DataSourcesGuideModal';
import { SEARCH_ENGINES } from '../constants/searchEngines';
import { getDynamicSnippets } from '../utils/snippets';
import { MaterialIcon } from './MaterialIcon';
import { IconPickerInput } from './IconPickerInput';
import { pickScreenColor, parseColorQuery, formatColorValue } from '../utils/colorMaster';

interface SettingsModalProps {
  config: AppConfig;
  items: LauncherItem[];
  onSaveConfig: (newConfig: AppConfig) => void;
  onClose: () => void;
  onTriggerSync: () => Promise<void>;
  onCheckUpdate: () => Promise<void>;
  isSyncing: boolean;
  syncProgress?: SyncProgress | null;
  updateStatusMessage?: string | null;
  updateInfo?: UpdateInfo | null;
}

interface ColorPickerSectionProps {
  title: string;
  description: string;
  icon: string;
  iconColorClass: string;
  value: string;
  fallbackColor: string;
  onColorChange: (newColor: string) => void;
}

const ColorPickerSection: React.FC<ColorPickerSectionProps> = ({
  title,
  description,
  icon,
  iconColorClass,
  value,
  fallbackColor,
  onColorChange,
}) => {
  const effectiveColor = value || fallbackColor;
  const currentPreset = APP_COLOR_PRESETS.find(
    (preset) => preset.hex.toLowerCase() === effectiveColor.toLowerCase()
  );

  return (
    <div className="space-y-3 pt-4 border-t border-white/10">
      <div>
        <h4 className="font-semibold text-sm text-white flex items-center gap-2">
          <span className={`material-symbols-outlined text-lg ${iconColorClass}`}>{icon}</span>
          {title}
        </h4>
        <p className="text-[13px] text-gray-400 mt-1">{description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
        {/* Active color preview indicator (left) */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 shadow-inner flex items-center justify-center">
            <div
              className="w-full h-full"
              style={{ backgroundColor: effectiveColor }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-sm text-white font-semibold">
              {currentPreset?.name || effectiveColor.toUpperCase()}
            </span>
            <span className="text-xs text-gray-400">Vybraný odstín</span>
          </div>
        </div>

        {/* 10 Preset quick colors (right) */}
        <div className="flex items-center gap-2 flex-wrap">
          {APP_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.hex}
              type="button"
              onClick={() => onColorChange(preset.hex)}
              title={preset.name}
              className={`w-7 h-7 rounded-full transition transform hover:scale-110 flex items-center justify-center cursor-pointer ${
                effectiveColor.toLowerCase() === preset.hex.toLowerCase()
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-[#181920]'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: preset.hex }}
            />
          ))}
          <button
            type="button"
            onClick={async () => {
              try {
                const picked = await pickScreenColor();
                if (picked) {
                  onColorChange(picked);
                }
              } catch (err) {
                console.error('Eyedropper error in ColorPickerSection:', err);
              }
            }}
            title="Nabrat barvu z obrazovky (Kapátko)"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 hover:text-white transition flex items-center justify-center cursor-pointer ml-1"
          >
            <span className="material-symbols-outlined text-sm">colorize</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Rezervované klávesové zkratky z nápovědy a systému IADonkey.
 * Tyto zkratky nelze použít pro globální vyvolání z důvodu kolize s ovládáním.
 */
const RESERVED_HOTKEYS: Record<string, string> = {
  'Shift+Enter': 'zkratka je v aplikaci vyhrazena pro otevření akcí položky',
  'Alt+Enter': 'zkratka je v aplikaci vyhrazena pro vstup do podpoložek',
  'Ctrl+Enter': 'zkratka je v aplikaci vyhrazena pro rychlé spuštění první volby',
  'Ctrl+Backspace': 'zkratka je v aplikaci vyhrazena pro rychlé smazání hledaného textu',
  'Alt+Backspace': 'zkratka je v aplikaci vyhrazena pro rychlé smazání hledaného textu',
  'Ctrl+Alt+Backspace': 'zkratka je v aplikaci vyhrazena pro smazání hledaného textu',
  'Ctrl+Left': 'šipky jsou v aplikaci vyhrazeny pro listování v informacích položky',
  'Ctrl+Right': 'šipky jsou v aplikaci vyhrazeny pro listování v informacích položky',
  'Alt+Left': 'šipky jsou v aplikaci vyhrazeny pro listování v informacích položky',
  'Alt+Right': 'šipky jsou v aplikaci vyhrazeny pro listování v informacích položky',
  'Ctrl+Up': 'šipky jsou v aplikaci vyhrazeny pro pohyb ve výsledcích vyhledávání',
  'Ctrl+Down': 'šipky jsou v aplikaci vyhrazeny pro pohyb ve výsledcích vyhledávání',
  'Alt+Up': 'šipky jsou v aplikaci vyhrazeny pro pohyb ve výsledcích vyhledávání',
  'Alt+Down': 'šipky jsou v aplikaci vyhrazeny pro pohyb ve výsledcích vyhledávání',
  'Ctrl+Escape': 'kombinace s klávesou Escape nelze použít (Escape slouží k zavírání)',
  'Alt+Escape': 'kombinace s klávesou Escape nelze použít (Escape slouží k zavírání)',
  'Shift+Escape': 'kombinace s klávesou Escape nelze použít (Escape slouží k zavírání)',
};

function getReservedHotkeyCollision(combo: string[]): string | null {
  const hotkey = combo.join('+');
  if (RESERVED_HOTKEYS[hotkey]) {
    return RESERVED_HOTKEYS[hotkey];
  }
  if (combo.includes('Escape')) {
    return 'kombinace s klávesou Escape nelze použít (Escape slouží k zavírání)';
  }
  return null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  items,
  onSaveConfig,
  onClose,
  onTriggerSync,
  onCheckUpdate,
  isSyncing,
  syncProgress,
  updateStatusMessage,
  updateInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'extensions' | 'magicgate' | 'mlog' | 'github' | 'vscode' | 'android-studio' | 'donkey-tools' | 'snippets' | 'general' | 'updates' | 'help'>('sources');
  const [formData, setFormData] = useState<AppConfig>(config);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [isAddingSource, setIsAddingSource] = useState<'file' | 'api' | 'static' | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showItemsViewer, setShowItemsViewer] = useState(false);
  const [showDataSourcesGuide, setShowDataSourcesGuide] = useState(false);
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [recordedModifiers, setRecordedModifiers] = useState<string[]>([]);
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);
  const [isRecordingColorMasterHotkey, setIsRecordingColorMasterHotkey] = useState(false);
  const [colorMasterRecordedModifiers, setColorMasterRecordedModifiers] = useState<string[]>([]);
  const [colorMasterHotkeyError, setColorMasterHotkeyError] = useState<string | null>(null);
  const [isSharedDropdownOpen, setIsSharedDropdownOpen] = useState(false);
  const [hoveredEyeId, setHoveredEyeId] = useState<string | null>(null);
  const [copiedSourceId, setCopiedSourceId] = useState<string | null>(null);
  const [detectedKeys, setDetectedKeys] = useState<string[]>([]);
  const [sampleRecord, setSampleRecord] = useState<Record<string, any> | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [isTestingGitHub, setIsTestingGitHub] = useState(false);
  const [gitHubTestResult, setGitHubTestResult] = useState<{
    ok: boolean;
    user?: { login: string; name?: string; avatar_url?: string };
    orgs?: string[];
    repoCount?: number;
    error?: string;
  } | null>(null);
  const [showGitHubToken, setShowGitHubToken] = useState(false);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const maxComboRef = useRef<string[]>([]);
  const originalHotkeyRef = useRef<string>(config.hotkey || 'Ctrl+Alt+Space');
  const colorMasterPressedKeysRef = useRef<Set<string>>(new Set());
  const colorMasterMaxComboRef = useRef<string[]>([]);
  const colorMasterOriginalHotkeyRef = useRef<string>(config.donkeyTools?.colorMaster?.hotkey || '');

  // FastSnap state & refs
  const [isRecordingFastSnapHotkey, setIsRecordingFastSnapHotkey] = useState(false);
  const [fastSnapRecordedModifiers, setFastSnapRecordedModifiers] = useState<string[]>([]);
  const [fastSnapHotkeyError, setFastSnapHotkeyError] = useState<string | null>(null);
  const fastSnapPressedKeysRef = useRef<Set<string>>(new Set());
  const fastSnapMaxComboRef = useRef<string[]>([]);
  const fastSnapOriginalHotkeyRef = useRef<string>(config.donkeyTools?.fastSnap?.hotkey || '');
  const [recentFastSnaps, setRecentFastSnaps] = useState<import('../types').FastSnapRecentItem[]>([]);
  const [isLoadingFastSnaps, setIsLoadingFastSnaps] = useState(false);
  const [copiedFastSnapPath, setCopiedFastSnapPath] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const importSnippetsFileRef = useRef<HTMLInputElement>(null);
  const [snippetFeedback, setSnippetFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Diagnostics & Logs state
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>([]);
  const [crashLogs, setCrashLogs] = useState<CrashLogEntry[]>([]);
  const [selectedCrashLog, setSelectedCrashLog] = useState<CrashLogEntry | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [diagnosticsCopiedId, setDiagnosticsCopiedId] = useState<string | null>(null);
  const [diagnosticsExportedId, setDiagnosticsExportedId] = useState<string | null>(null);
  const [isExportingCrashId, setIsExportingCrashId] = useState<string | null>(null);
  const [showAllActionLogs, setShowAllActionLogs] = useState(false);
  const [showAllCrashLogs, setShowAllCrashLogs] = useState(false);

  const loadDiagnostics = async () => {
    setIsLoadingDiagnostics(true);
    try {
      if (window.electronAPI?.getActionLogs) {
        const acts = await window.electronAPI.getActionLogs();
        setActionLogs(acts || []);
      }
      if (window.electronAPI?.getCrashLogs) {
        const crashes = await window.electronAPI.getCrashLogs();
        setCrashLogs(crashes || []);
      }
    } catch (err) {
      console.error('[Settings] Failed to load diagnostics:', err);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'help') {
      loadDiagnostics();
    }
  }, [activeTab]);

  const handleClearActionLogs = async () => {
    try {
      if (window.electronAPI?.clearActionLogs) {
        await window.electronAPI.clearActionLogs();
        await loadDiagnostics();
      }
    } catch (err) {
      console.error('[Settings] Failed to clear action logs:', err);
    }
  };

  const handleClearCrashLogs = async () => {
    try {
      if (window.electronAPI?.clearCrashLogs) {
        await window.electronAPI.clearCrashLogs();
        setSelectedCrashLog(null);
        await loadDiagnostics();
      }
    } catch (err) {
      console.error('[Settings] Failed to clear crash logs:', err);
    }
  };

  const handleOpenCrashLogFolder = async () => {
    try {
      if (window.electronAPI?.openCrashLogFolder) {
        await window.electronAPI.openCrashLogFolder();
      }
    } catch (err) {
      console.error('[Settings] Failed to open crash log folder:', err);
    }
  };

  const handleCopyCrashLog = (log: CrashLogEntry) => {
    try {
      navigator.clipboard.writeText(log.fullContent);
      setDiagnosticsCopiedId(log.id);
      setTimeout(() => setDiagnosticsCopiedId(null), 2500);
    } catch (err) {
      console.error('[Settings] Failed to copy crash report:', err);
    }
  };

  const handleExportCrashLog = async (log: CrashLogEntry) => {
    try {
      if (window.electronAPI?.exportCrashReport) {
        setIsExportingCrashId(log.id);
        const res = await window.electronAPI.exportCrashReport(log.fileName);
        if (res?.success) {
          setDiagnosticsExportedId(log.id);
          setTimeout(() => setDiagnosticsExportedId(null), 3000);
        }
      }
    } catch (err) {
      console.error('[Settings] Failed to export crash report:', err);
    } finally {
      setIsExportingCrashId(null);
    }
  };

  useEffect(() => {
    if (snippetFeedback) {
      const timer = setTimeout(() => setSnippetFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [snippetFeedback]);

  const activeExtensionsCount = useMemo(() => {
    let count = 0;
    if (formData.extensions?.magicgate) count++;
    if (formData.extensions?.mlog) count++;
    if (formData.extensions?.github) count++;
    if (formData.extensions?.vscode) count++;
    if (formData.extensions?.androidStudio) count++;
    if (formData.extensions?.donkeyTools) count++;
    return count;
  }, [formData.extensions]);

  const handleTestGitHub = async () => {
    if (!formData.github?.token?.trim()) return;
    setIsTestingGitHub(true);
    setGitHubTestResult(null);
    try {
      if (window.electronAPI?.testGitHubConnection) {
        const res = await window.electronAPI.testGitHubConnection({
          username: formData.github.username,
          token: formData.github.token,
          org: formData.github.org,
          apiUrl: formData.github.apiUrl,
        });
        setGitHubTestResult(res);
      } else {
        setGitHubTestResult({ ok: false, error: 'Funkce není dostupná mimo aplikaci Electron.' });
      }
    } catch (err: any) {
      setGitHubTestResult({ ok: false, error: err?.message || 'Chyba při volání testu připojení.' });
    } finally {
      setIsTestingGitHub(false);
    }
  };

  const [isDownloadingIcons, setIsDownloadingIcons] = useState(false);
  const [downloadIconsResult, setDownloadIconsResult] = useState<{
    ok: boolean;
    count?: number;
    downloadedAt?: string;
    error?: string;
  } | null>(null);

  const handleDownloadIcons = async () => {
    setIsDownloadingIcons(true);
    setDownloadIconsResult(null);
    try {
      if (window.electronAPI?.downloadMaterialIcons) {
        const res = await window.electronAPI.downloadMaterialIcons();
        if (res.success) {
          setDownloadIconsResult({
            ok: true,
            count: res.count,
            downloadedAt: res.downloadedAt,
          });
          const updated = {
            ...formData,
            iconsLastDownloadedAt: res.downloadedAt,
            iconsCount: res.count,
          };
          setFormData(updated);
          handleSave(updated);
        } else {
          setDownloadIconsResult({
            ok: false,
            error: res.error || 'Chyba při stahování ikon.',
          });
        }
      } else {
        setDownloadIconsResult({
          ok: false,
          error: 'Funkce není dostupná mimo aplikaci Electron.',
        });
      }
    } catch (err: any) {
      setDownloadIconsResult({
        ok: false,
        error: err?.message || 'Chyba při stahování ikon.',
      });
    } finally {
      setIsDownloadingIcons(false);
    }
  };

  // Synchronization progress & smooth 2s minimum animation state
  const [syncPhase, setSyncPhase] = useState<'idle' | 'syncing' | 'success'>('idle');
  const [visualProgress, setVisualProgress] = useState(0);
  const syncStartTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isSyncing) {
      if (syncPhase !== 'syncing') {
        setSyncPhase('syncing');
        syncStartTimeRef.current = Date.now();
        setVisualProgress(5);
      }
    }
  }, [isSyncing, syncPhase]);

  useEffect(() => {
    if (syncPhase !== 'syncing') {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const MIN_SYNC_DURATION_MS = 2000;

    const tick = () => {
      const now = Date.now();
      const startTime = syncStartTimeRef.current || now;
      const elapsed = now - startTime;

      if (isSyncing) {
        // While backend is still syncing:
        // Progress smoothly advances towards either real percentage or up to 88% over MIN_SYNC_DURATION_MS
        const realPercent = syncProgress?.percentage ?? 0;
        const timePercent = Math.min((elapsed / MIN_SYNC_DURATION_MS) * 85, 88);
        const targetPercent = Math.max(realPercent, timePercent, 8);

        setVisualProgress((prev) => {
          const step = Math.max((targetPercent - prev) * 0.15, 0.5);
          return Math.min(prev + step, targetPercent);
        });

        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        // Backend finished: ensure minimum MIN_SYNC_DURATION_MS elapsed time
        if (elapsed < MIN_SYNC_DURATION_MS) {
          const remainingTime = MIN_SYNC_DURATION_MS - elapsed;
          setVisualProgress((prev) => {
            const step = Math.max((100 - prev) / (remainingTime / 16), 0.8);
            return Math.min(prev + step, 99);
          });
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          // Both backend finished and minimum duration elapsed
          setVisualProgress(100);
          setSyncPhase('success');
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [syncPhase, isSyncing, syncProgress]);

  // Transition from success state back to idle after 1.5s
  useEffect(() => {
    if (syncPhase === 'success') {
      const timer = setTimeout(() => {
        setSyncPhase('idle');
        setVisualProgress(0);
        syncStartTimeRef.current = null;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [syncPhase]);

  const handleTriggerSync = async () => {
    if (syncPhase !== 'idle') return;
    setSyncPhase('syncing');
    syncStartTimeRef.current = Date.now();
    setVisualProgress(5);
    await onTriggerSync();
  };

  const handleAddCustomSnippet = () => {
    const newSnippet: CustomSnippet = {
      id: `cs-${Date.now()}`,
      name: '',
      location: '',
      icon: 'content_paste',
      shortcuts: [],
    };
    const currentCustom = formData.snippets?.custom || [];
    const updated = {
      ...formData,
      snippets: {
        ...formData.snippets,
        custom: [newSnippet, ...currentCustom],
      },
    };
    setFormData(updated);
    handleSave(updated);
  };

  const handleExportCustomSnippets = () => {
    const list = formData.snippets?.custom || [];
    if (list.length === 0) return;

    // Clean export objects without internal id
    const exportData = list.map((snip) => ({
      name: snip.name || '',
      location: snip.location || '',
      icon: snip.icon || 'content_paste',
      shortcuts: (snip.shortcuts || []).map((s) => (s.startsWith(':') ? s : `:${s}`)),
    }));

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `iadonkey_snippety_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportCustomSnippets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Normalize raw items: could be an array, or an object wrapping custom/snippets/items
        let rawList: any[] = [];
        if (Array.isArray(parsed)) {
          rawList = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.custom)) {
            rawList = parsed.custom;
          } else if (Array.isArray(parsed.snippets)) {
            rawList = parsed.snippets;
          } else if (Array.isArray(parsed.items)) {
            rawList = parsed.items;
          }
        }

        if (!rawList || rawList.length === 0) {
          setSnippetFeedback({
            type: 'error',
            message: 'Vybraný soubor neobsahuje žádné platné položky snippetů.',
          });
          return;
        }

        const importedSnippets: CustomSnippet[] = [];
        const now = Date.now();

        rawList.forEach((raw, idx) => {
          if (!raw || typeof raw !== 'object') return;

          const rawName = String(raw.name || '').trim();
          const rawLocation = String(raw.location || raw.value || raw.text || '');
          const rawIcon = String(raw.icon || 'content_paste').trim();

          let rawShortcuts: string[] = [];
          if (Array.isArray(raw.shortcuts)) {
            rawShortcuts = raw.shortcuts.map((s: any) => String(s).trim());
          } else if (typeof raw.shortcut === 'string') {
            rawShortcuts = [raw.shortcut.trim()];
          }

          // If rawName starts with colon (e.g. ":iban"), ensure it is in shortcuts
          if (rawName.startsWith(':')) {
            if (!rawShortcuts.includes(rawName)) {
              rawShortcuts.unshift(rawName);
            }
          }

          const formattedShortcuts = rawShortcuts
            .filter(Boolean)
            .map((s) => {
              const clean = s.replace(/^:+/, '');
              return clean ? `:${clean.toLowerCase()}` : '';
            })
            .filter((s, sIdx, arr) => s && arr.indexOf(s) === sIdx);

          importedSnippets.push({
            id: `cs-${now}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            name: rawName || 'Importovaný snippet',
            location: rawLocation,
            icon: rawIcon || 'content_paste',
            shortcuts: formattedShortcuts,
          });
        });

        if (importedSnippets.length === 0) {
          setSnippetFeedback({
            type: 'error',
            message: 'Ze souboru se nepodařilo načíst žádné snippety.',
          });
          return;
        }

        // Prepend imported snippets to existing ones
        const currentCustom = formData.snippets?.custom || [];
        const updatedCustom = [...importedSnippets, ...currentCustom];
        const updated = {
          ...formData,
          snippets: {
            ...formData.snippets,
            custom: updatedCustom,
          },
        };

        setFormData(updated);
        handleSave(updated);
        setSnippetFeedback({
          type: 'success',
          message: `Úspěšně importováno ${importedSnippets.length} ${
            importedSnippets.length === 1 ? 'snippet' : importedSnippets.length < 5 ? 'snippety' : 'snippetů'
          }.`,
        });
      } catch (err: any) {
        setSnippetFeedback({
          type: 'error',
          message: `Chyba při čtení souboru: ${err?.message || 'Neplatný formát JSON.'}`,
        });
      }
    };

    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleUpdateCustomSnippet = (id: string, patch: Partial<CustomSnippet>) => {
    const currentCustom = formData.snippets?.custom || [];
    const updatedCustom = currentCustom.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    const updated = {
      ...formData,
      snippets: {
        ...formData.snippets,
        custom: updatedCustom,
      },
    };
    setFormData(updated);
    handleSave(updated);
  };

  const handleRemoveCustomSnippet = (id: string) => {
    const currentCustom = formData.snippets?.custom || [];
    const updatedCustom = currentCustom.filter((item) => item.id !== id);
    const updated = {
      ...formData,
      snippets: {
        ...formData.snippets,
        custom: updatedCustom,
      },
    };
    setFormData(updated);
    handleSave(updated);
  };

  const handleAddShortcut = (id: string, rawVal: string) => {
    const clean = rawVal.trim().replace(/^:+/, '');
    if (!clean) return;
    const formatted = `:${clean.toLowerCase()}`;
    const currentCustom = formData.snippets?.custom || [];
    const target = currentCustom.find((item) => item.id === id);
    if (!target) return;
    if ((target.shortcuts || []).includes(formatted)) return;

    handleUpdateCustomSnippet(id, {
      shortcuts: [...(target.shortcuts || []), formatted],
    });
  };

  const handleRemoveShortcut = (id: string, shortcutIdx: number) => {
    const currentCustom = formData.snippets?.custom || [];
    const target = currentCustom.find((item) => item.id === id);
    if (!target) return;
    const updatedShortcuts = (target.shortcuts || []).filter((_, idx) => idx !== shortcutIdx);
    handleUpdateCustomSnippet(id, { shortcuts: updatedShortcuts });
  };

  // Compute indexed search items counts (main items, git items, subitems, dynamic system snippets, and total)
  const { mainItemsCount, gitItemsCount, subItemsCount, snippetsCount, totalIndexedCount } = useMemo(() => {
    const gitCount = items.filter((it) => it.settings === 'git' || it.sourceId === 'github').length;
    const mainOnlyCount = items.filter((it) => !(it.settings === 'git' || it.sourceId === 'github')).length;
    const subCount = items.reduce((acc, it) => acc + (it.options?.length || 0), 0);
    const snipCount = getDynamicSnippets(':', formData.snippets).length;
    return {
      mainItemsCount: mainOnlyCount,
      gitItemsCount: gitCount,
      subItemsCount: subCount,
      snippetsCount: snipCount,
      totalIndexedCount: mainOnlyCount + gitCount + subCount + snipCount,
    };
  }, [items, formData.snippets]);

  // Keep formData in sync when config prop updates from main process
  useEffect(() => {
    setFormData(config);
    if (!isRecordingHotkey) {
      originalHotkeyRef.current = config.hotkey || 'Ctrl+Alt+Space';
    }
    if (config.primaryColor) {
      applyPrimaryColor(config.primaryColor);
    }
    if (config.actionsColor) {
      applyActionsColor(config.actionsColor);
    }
  }, [config, isRecordingHotkey]);

  // Clean up global hotkey pause if component unmounts
  useEffect(() => {
    return () => {
      window.electronAPI?.resumeGlobalHotkey?.();
    };
  }, []);

  // Reset scrollbar when switching tabs in settings modal
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    if (activeTab === 'donkey-tools') {
      loadRecentFastSnaps();
    }
  }, [activeTab]);

  // Check if at least one item (or any nested option) has settings === 'magicgate'
  const hasMagicGate = (item: LauncherItem): boolean => {
    if (item.settings === 'magicgate') return true;
    if (item.options && item.options.some(hasMagicGate)) return true;
    return false;
  };

  const hasCustomMapping = Boolean(
    editingSource?.mapping &&
    Object.values(editingSource.mapping).some((r) => r && (r.value || r.type === 'fixed'))
  );
  const hasMissingName = detectedKeys.length > 0 && !detectedKeys.includes('name');
  const hasStructureError = Boolean(inspectError || hasMissingName || editingSource?.error || hasCustomMapping);
  const hasMagicGateItem = items.some(hasMagicGate);

  // New source templates
  const initialFileSource: FileSource = {
    id: `file-${Date.now()}`,
    name: 'Nový lokální soubor',
    type: 'file',
    path: '',
    enabled: true,
  };

  const initialApiSource: ApiSource = {
    id: `api-${Date.now()}`,
    name: 'Nové API',
    type: 'api',
    url: '',
    authType: 'none',
    tokenUrl: '',
    tokenUsername: '',
    tokenPassword: '',
    enabled: true,
  };

  const initialStaticSource: StaticSource = {
    id: `static-${Date.now()}`,
    name: 'Statická data',
    type: 'static',
    enabled: true,
    sharedParams: {
      action: 'open',
      icon: 'bookmark',
      priority: '0',
    },
    items: [],
  };

  const handleSave = (customConfig?: AppConfig) => {
    const toSave = customConfig || formData;
    onSaveConfig(toSave);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleBanItem = (itemToBan: LauncherItem) => {
    const banlist = formData.banlist || [];
    const alreadyBanned = banlist.some(
      (b) =>
        (b.id && itemToBan.id && b.id === itemToBan.id) ||
        (b.location && itemToBan.location && b.location === itemToBan.location) ||
        (b.name === itemToBan.name && b.sourceId === itemToBan.sourceId)
    );
    if (alreadyBanned) return;

    const newBanned: BannedItem = {
      id: itemToBan.id,
      name: itemToBan.name,
      location: itemToBan.location,
      sourceId: itemToBan.sourceId,
      bannedAt: new Date().toISOString(),
    };
    const updated = {
      ...formData,
      banlist: [...banlist, newBanned],
    };
    setFormData(updated);
    handleSave(updated);
    onTriggerSync();
  };

  const handleUnbanItem = (bannedItem: BannedItem) => {
    const banlist = formData.banlist || [];
    const updatedBanlist = banlist.filter((b) => {
      if (bannedItem.id && b.id) return b.id !== bannedItem.id;
      if (bannedItem.location && b.location) return b.location !== bannedItem.location;
      return b.name !== bannedItem.name;
    });
    const updated = {
      ...formData,
      banlist: updatedBanlist,
    };
    setFormData(updated);
    handleSave(updated);
    onTriggerSync();
  };

  const triggerInspectSource = async (targetSource?: DataSource) => {
    const target = targetSource || editingSource;
    if (!target) return;
    if (target.type === 'file' && !target.path) {
      setInspectError('Nejprve zadejte nebo vyberte cestu k JSON souboru');
      return;
    }
    if (target.type === 'api' && !target.url) {
      setInspectError('Nejprve zadejte URL adresu API');
      return;
    }

    setIsInspecting(true);
    setInspectError(null);
    try {
      const res = await window.electronAPI?.inspectSource(target);
      if (res && res.keys && res.keys.length > 0) {
        setDetectedKeys(res.keys);
        setSampleRecord(res.sample);
      } else {
        setInspectError('V JSONu nebyl nalezen žádný záznam nebo je pole prázdné');
      }
    } catch (err: any) {
      setInspectError(err?.message || 'Chyba při čtení JSONu');
    } finally {
      setIsInspecting(false);
    }
  };

  const handlePickLocalFile = async () => {
    const currentPath = editingSource && editingSource.type === 'file' ? editingSource.path : undefined;
    const selectedPath = await window.electronAPI?.selectJsonFile?.(currentPath);
    if (selectedPath) {
      if (editingSource && editingSource.type === 'file') {
        const updated = { ...editingSource, path: selectedPath };
        setEditingSource(updated);
        triggerInspectSource(updated);
      } else if (isAddingSource === 'file') {
        const updated: FileSource = {
          ...initialFileSource,
          path: selectedPath,
          name: selectedPath.split(/[\\/]/).pop() || 'Lokální soubor',
        };
        setEditingSource(updated);
        triggerInspectSource(updated);
      }
    }
  };

  const handleStartEditSource = (src: DataSource) => {
    if (editingSource?.id === src.id && !isAddingSource) {
      handleCloseSourceForm();
      return;
    }
    setEditingSource(src);
    setIsAddingSource(null);
    setInspectError(null);
    setDetectedKeys([]);
    setSampleRecord(null);
    if ((src.type === 'file' && src.path) || (src.type === 'api' && src.url)) {
      triggerInspectSource(src);
    }
  };

  const handleCloseSourceForm = () => {
    setEditingSource(null);
    setIsAddingSource(null);
    setInspectError(null);
    setDetectedKeys([]);
    setSampleRecord(null);
  };

  const handleMappingChange = (field: MappingTargetKey, modeOrKey: string) => {
    if (!editingSource) return;
    const currentMapping: SourceFieldMapping = { ...(editingSource.mapping || {}) };

    if (!modeOrKey) {
      delete currentMapping[field];
    } else if (modeOrKey === '__fixed_open__') {
      currentMapping[field] = { type: 'fixed', value: 'open' };
    } else if (modeOrKey === '__fixed_copy__') {
      currentMapping[field] = { type: 'fixed', value: 'copy' };
    } else if (modeOrKey === '__fixed__') {
      const prev = currentMapping[field]?.type === 'fixed' ? currentMapping[field]!.value : '';
      currentMapping[field] = { type: 'fixed', value: prev };
    } else if (modeOrKey === '__custom_field__') {
      const prev = currentMapping[field]?.type === 'field' ? currentMapping[field]!.value : '';
      currentMapping[field] = { type: 'field', value: prev };
    } else {
      currentMapping[field] = { type: 'field', value: modeOrKey };
    }

    setEditingSource({ ...editingSource, mapping: currentMapping });
  };

  const handleCustomFieldChange = (field: MappingTargetKey, fieldName: string) => {
    if (!editingSource) return;
    const currentMapping: SourceFieldMapping = { ...(editingSource.mapping || {}) };
    currentMapping[field] = { type: 'field', value: fieldName };
    setEditingSource({ ...editingSource, mapping: currentMapping });
  };

  const handleFixedValueChange = (field: MappingTargetKey, value: string) => {
    if (!editingSource) return;
    const currentMapping: SourceFieldMapping = { ...(editingSource.mapping || {}) };
    currentMapping[field] = { type: 'fixed', value };
    setEditingSource({ ...editingSource, mapping: currentMapping });
  };

  const getMappedPreviewValue = (field: MappingTargetKey, fallback: string) => {
    if (!sampleRecord) return fallback;
    const rule = editingSource?.mapping?.[field];
    if (!rule) return sampleRecord[field] !== undefined ? String(sampleRecord[field]) : fallback;
    if (rule.type === 'fixed') return rule.value || fallback;
    if (rule.type === 'field' && rule.value) {
      return sampleRecord[rule.value] !== undefined ? String(sampleRecord[rule.value]) : fallback;
    }
    return sampleRecord[field] !== undefined ? String(sampleRecord[field]) : fallback;
  };

  const MAPPING_FIELDS: { key: MappingTargetKey; label: string; placeholder?: string; defaultHint: string }[] = [
    { key: 'name', label: 'Název položky (name) *', defaultHint: 'Výchozí: "name"' },
    { key: 'location', label: 'Cesta / URL / Hodnota (location)', defaultHint: 'Výchozí: "location"' },
    { key: 'action', label: 'Akce po spuštění (action)', placeholder: 'např. open, copy', defaultHint: 'Výchozí: "open" (Otevřít)' },
    { key: 'icon', label: 'Ikona (icon)', placeholder: 'např. bookmark, terminal, public...', defaultHint: 'Výchozí: "code"' },
    { key: 'image', label: 'Obrázek / URL loga (image)', defaultHint: 'Výchozí: "image"' },
    { key: 'priority', label: 'Priorita řazení (priority)', placeholder: 'např. 0, 10, -1', defaultHint: 'Výchozí: 0' },
    { key: 'settings', label: 'Speciální nastavení (settings)', placeholder: 'např. magicgate', defaultHint: 'Výchozí: žádné' },
  ];

  const handleSaveSource = (source: DataSource) => {
    let updatedSources: DataSource[];
    const exists = formData.sources.some((s) => s.id === source.id);
    if (exists) {
      updatedSources = formData.sources.map((s) => (s.id === source.id ? source : s));
    } else {
      updatedSources = [...formData.sources, source];
    }

    const updatedConfig = { ...formData, sources: updatedSources };
    setFormData(updatedConfig);
    handleCloseSourceForm();
    handleSave(updatedConfig);
    onTriggerSync();
  };

  const handleDeleteSource = (id: string) => {
    const updatedSources = formData.sources.filter((s) => s.id !== id);
    const updatedConfig = { ...formData, sources: updatedSources };
    setFormData(updatedConfig);
    handleSave(updatedConfig);
    onTriggerSync();
  };

  const handleToggleSource = (id: string) => {
    const updatedSources = formData.sources.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    const updatedConfig = { ...formData, sources: updatedSources };
    setFormData(updatedConfig);
    handleSave(updatedConfig);
    onTriggerSync();
  };

  const handleHotkeyFocus = () => {
    setIsRecordingHotkey(true);
    setHotkeyError(null);
    originalHotkeyRef.current = formData.hotkey || 'Ctrl+Alt+Space';
    pressedKeysRef.current.clear();
    maxComboRef.current = [];
    setRecordedModifiers([]);
    window.electronAPI?.pauseGlobalHotkey?.();
  };

  const handleHotkeyBlur = () => {
    setIsRecordingHotkey(false);
    pressedKeysRef.current.clear();
    maxComboRef.current = [];
    setRecordedModifiers([]);
    window.electronAPI?.resumeGlobalHotkey?.();
  };

  const handleHotkeyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Escape cancels recording and restores original hotkey
    if (e.key === 'Escape') {
      const fallback = originalHotkeyRef.current || 'Ctrl+Alt+Space';
      setFormData((prev) => ({ ...prev, hotkey: fallback }));
      setHotkeyError(null);
      setIsRecordingHotkey(false);
      pressedKeysRef.current.clear();
      maxComboRef.current = [];
      setRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }

    // Backspace when nothing held resets to default
    if (e.key === 'Backspace' && pressedKeysRef.current.size === 0) {
      const updated = { ...formData, hotkey: 'Ctrl+Alt+Space' };
      setFormData(updated);
      handleSave(updated);
      setHotkeyError(null);
      setIsRecordingHotkey(false);
      pressedKeysRef.current.clear();
      maxComboRef.current = [];
      setRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }

    // Normalize key
    let keyName = e.key;
    if (keyName === 'Control') keyName = 'Ctrl';
    else if (keyName === 'Alt') keyName = 'Alt';
    else if (keyName === 'Shift') keyName = 'Shift';
    else if (keyName === 'Meta') keyName = 'Super';
    else if (keyName === ' ') keyName = 'Space';
    else if (keyName === 'ArrowUp') keyName = 'Up';
    else if (keyName === 'ArrowDown') keyName = 'Down';
    else if (keyName === 'ArrowLeft') keyName = 'Left';
    else if (keyName === 'ArrowRight') keyName = 'Right';
    else if (/^[a-z]$/i.test(keyName)) keyName = keyName.toUpperCase();

    pressedKeysRef.current.add(keyName);

    // Sort order: Modifiers first, then normal keys
    const order = ['Ctrl', 'Alt', 'Shift', 'Super'];
    const currentKeys = Array.from(pressedKeysRef.current);
    currentKeys.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    maxComboRef.current = currentKeys;
    setRecordedModifiers(currentKeys);
    setHotkeyError(null);
  };

  const handleHotkeyKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const combo = maxComboRef.current;

    // If only 1 key was pressed and released: reset to previous hotkey + display red error
    if (combo.length === 1) {
      const fallback = originalHotkeyRef.current || 'Ctrl+Alt+Space';
      setFormData((prev) => ({ ...prev, hotkey: fallback }));
      setHotkeyError('Je potřeba minimálně dvojkombinace kláves');
      setIsRecordingHotkey(false);
      pressedKeysRef.current.clear();
      maxComboRef.current = [];
      setRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }

    // If at least 2 keys were pressed: check reserved hotkey collision, then save
    if (combo.length >= 2) {
      const finalHotkey = combo.join('+');
      const conflictReason = getReservedHotkeyCollision(combo);

      if (conflictReason) {
        const fallback = originalHotkeyRef.current || 'Ctrl+Alt+Space';
        setFormData((prev) => ({ ...prev, hotkey: fallback }));
        setHotkeyError(`Zkratku „${finalHotkey}“ nelze nastavit – ${conflictReason}. Byla zachována původní zkratka.`);
        setIsRecordingHotkey(false);
        pressedKeysRef.current.clear();
        maxComboRef.current = [];
        setRecordedModifiers([]);
        (e.target as HTMLInputElement).blur();
        window.electronAPI?.resumeGlobalHotkey?.();
        return;
      }

      // Check collision with ColorMaster hotkey
      const cmHotkey = formData.donkeyTools?.colorMaster?.hotkey;
      if (cmHotkey && finalHotkey.toLowerCase() === cmHotkey.toLowerCase()) {
        const fallback = originalHotkeyRef.current || 'Ctrl+Alt+Space';
        setFormData((prev) => ({ ...prev, hotkey: fallback }));
        setHotkeyError(`Zkratku „${finalHotkey}“ nelze nastavit – koliduje se zkratkou pro kapátko ColorMaster.`);
        setIsRecordingHotkey(false);
        pressedKeysRef.current.clear();
        maxComboRef.current = [];
        setRecordedModifiers([]);
        (e.target as HTMLInputElement).blur();
        window.electronAPI?.resumeGlobalHotkey?.();
        return;
      }

      setHotkeyError(null);
      const updated = { ...formData, hotkey: finalHotkey };
      setFormData(updated);
      handleSave(updated);
      setIsRecordingHotkey(false);
      pressedKeysRef.current.clear();
      maxComboRef.current = [];
      setRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }
  };

  const handleColorMasterHotkeyFocus = () => {
    setIsRecordingColorMasterHotkey(true);
    setColorMasterHotkeyError(null);
    colorMasterOriginalHotkeyRef.current = formData.donkeyTools?.colorMaster?.hotkey || '';
    colorMasterPressedKeysRef.current.clear();
    colorMasterMaxComboRef.current = [];
    setColorMasterRecordedModifiers([]);
    window.electronAPI?.pauseGlobalHotkey?.();
  };

  const handleColorMasterHotkeyBlur = () => {
    setIsRecordingColorMasterHotkey(false);
    colorMasterPressedKeysRef.current.clear();
    colorMasterMaxComboRef.current = [];
    setColorMasterRecordedModifiers([]);
    window.electronAPI?.resumeGlobalHotkey?.();
  };

  const handleColorMasterHotkeyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Escape cancels recording and restores original hotkey
    if (e.key === 'Escape') {
      const fallback = colorMasterOriginalHotkeyRef.current || '';
      const updated = {
        ...formData,
        donkeyTools: {
          ...formData.donkeyTools,
          colorMaster: {
            enabled: formData.donkeyTools?.colorMaster?.enabled ?? true,
            hotkey: fallback,
            defaultFormat: formData.donkeyTools?.colorMaster?.defaultFormat || 'hex',
          },
        },
      };
      setFormData(updated);
      setColorMasterHotkeyError(null);
      setIsRecordingColorMasterHotkey(false);
      colorMasterPressedKeysRef.current.clear();
      colorMasterMaxComboRef.current = [];
      setColorMasterRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }

    // Backspace when nothing held resets / clears the hotkey
    if (e.key === 'Backspace' && colorMasterPressedKeysRef.current.size === 0) {
      const updated = {
        ...formData,
        donkeyTools: {
          ...formData.donkeyTools,
          colorMaster: {
            enabled: formData.donkeyTools?.colorMaster?.enabled ?? true,
            hotkey: '',
            defaultFormat: formData.donkeyTools?.colorMaster?.defaultFormat || 'hex',
          },
        },
      };
      setFormData(updated);
      handleSave(updated);
      setColorMasterHotkeyError(null);
      setIsRecordingColorMasterHotkey(false);
      colorMasterPressedKeysRef.current.clear();
      colorMasterMaxComboRef.current = [];
      setColorMasterRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }

    // Normalize key
    let keyName = e.key;
    if (keyName === 'Control') keyName = 'Ctrl';
    else if (keyName === 'Alt') keyName = 'Alt';
    else if (keyName === 'Shift') keyName = 'Shift';
    else if (keyName === 'Meta') keyName = 'Super';
    else if (keyName === ' ') keyName = 'Space';
    else if (keyName === 'ArrowUp') keyName = 'Up';
    else if (keyName === 'ArrowDown') keyName = 'Down';
    else if (keyName === 'ArrowLeft') keyName = 'Left';
    else if (keyName === 'ArrowRight') keyName = 'Right';
    else if (/^[a-z]$/i.test(keyName)) keyName = keyName.toUpperCase();

    colorMasterPressedKeysRef.current.add(keyName);

    // Sort order: Modifiers first, then normal keys
    const order = ['Ctrl', 'Alt', 'Shift', 'Super'];
    const currentKeys = Array.from(colorMasterPressedKeysRef.current);
    currentKeys.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    colorMasterMaxComboRef.current = currentKeys;
    setColorMasterRecordedModifiers(currentKeys);
    setColorMasterHotkeyError(null);
  };

  const handleColorMasterHotkeyKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const combo = colorMasterMaxComboRef.current;

    // If only 1 key was pressed and released: reset to previous hotkey + display red error
    if (combo.length === 1) {
      const fallback = colorMasterOriginalHotkeyRef.current || '';
      const updated = {
        ...formData,
        donkeyTools: {
          ...formData.donkeyTools,
          colorMaster: {
            enabled: formData.donkeyTools?.colorMaster?.enabled ?? true,
            hotkey: fallback,
            defaultFormat: formData.donkeyTools?.colorMaster?.defaultFormat || 'hex',
          },
        },
      };
      setFormData(updated);
      setColorMasterHotkeyError('Je potřeba minimálně dvojkombinace kláves');
      setIsRecordingColorMasterHotkey(false);
      colorMasterPressedKeysRef.current.clear();
      colorMasterMaxComboRef.current = [];
      setColorMasterRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }

    // If at least 2 keys were pressed: check reserved hotkey collision and collision with launcher hotkey
    if (combo.length >= 2) {
      const finalHotkey = combo.join('+');
      const conflictReason = getReservedHotkeyCollision(combo);

      if (conflictReason) {
        const fallback = colorMasterOriginalHotkeyRef.current || '';
        const updated = {
          ...formData,
          donkeyTools: {
            ...formData.donkeyTools,
            colorMaster: {
              enabled: formData.donkeyTools?.colorMaster?.enabled ?? true,
              hotkey: fallback,
              defaultFormat: formData.donkeyTools?.colorMaster?.defaultFormat || 'hex',
            },
          },
        };
        setFormData(updated);
        setColorMasterHotkeyError(`Zkratku „${finalHotkey}“ nelze nastavit – ${conflictReason}. Byla zachována původní zkratka.`);
        setIsRecordingColorMasterHotkey(false);
        colorMasterPressedKeysRef.current.clear();
        colorMasterMaxComboRef.current = [];
        setColorMasterRecordedModifiers([]);
        (e.target as HTMLInputElement).blur();
        window.electronAPI?.resumeGlobalHotkey?.();
        return;
      }

      // Check collision with main launcher hotkey
      const launcherHotkey = formData.hotkey || 'Ctrl+Alt+Space';
      if (finalHotkey.toLowerCase() === launcherHotkey.toLowerCase()) {
        const fallback = colorMasterOriginalHotkeyRef.current || '';
        const updated = {
          ...formData,
          donkeyTools: {
            ...formData.donkeyTools,
            colorMaster: {
              enabled: formData.donkeyTools?.colorMaster?.enabled ?? true,
              hotkey: fallback,
              defaultFormat: formData.donkeyTools?.colorMaster?.defaultFormat || 'hex',
            },
          },
        };
        setFormData(updated);
        setColorMasterHotkeyError(`Zkratku „${finalHotkey}“ nelze nastavit – koliduje s globální zkratkou pro vyvolání launcheru.`);
        setIsRecordingColorMasterHotkey(false);
        colorMasterPressedKeysRef.current.clear();
        colorMasterMaxComboRef.current = [];
        setColorMasterRecordedModifiers([]);
        (e.target as HTMLInputElement).blur();
        window.electronAPI?.resumeGlobalHotkey?.();
        return;
      }

      setColorMasterHotkeyError(null);
      const updated = {
        ...formData,
        donkeyTools: {
          ...formData.donkeyTools,
          colorMaster: {
            enabled: formData.donkeyTools?.colorMaster?.enabled ?? true,
            hotkey: finalHotkey,
            defaultFormat: formData.donkeyTools?.colorMaster?.defaultFormat || 'hex',
          },
        },
      };
      setFormData(updated);
      handleSave(updated);
      setIsRecordingColorMasterHotkey(false);
      colorMasterPressedKeysRef.current.clear();
      colorMasterMaxComboRef.current = [];
      setColorMasterRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }
  };

  const handleFastSnapHotkeyFocus = () => {
    setIsRecordingFastSnapHotkey(true);
    setFastSnapHotkeyError(null);
    fastSnapOriginalHotkeyRef.current = formData.donkeyTools?.fastSnap?.hotkey || '';
    fastSnapPressedKeysRef.current.clear();
    fastSnapMaxComboRef.current = [];
    setFastSnapRecordedModifiers([]);
    window.electronAPI?.pauseGlobalHotkey?.();
  };

  const handleFastSnapHotkeyBlur = () => {
    setIsRecordingFastSnapHotkey(false);
    fastSnapPressedKeysRef.current.clear();
    fastSnapMaxComboRef.current = [];
    setFastSnapRecordedModifiers([]);
    window.electronAPI?.resumeGlobalHotkey?.();
  };

  const handleFastSnapHotkeyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Escape cancels recording and restores original hotkey
    if (e.key === 'Escape') {
      const fallback = fastSnapOriginalHotkeyRef.current || '';
      const updated = {
        ...formData,
        donkeyTools: {
          ...formData.donkeyTools,
          fastSnap: {
            enabled: formData.donkeyTools?.fastSnap?.enabled ?? true,
            hotkey: fallback,
            saveDirectory: formData.donkeyTools?.fastSnap?.saveDirectory,
          },
        },
      };
      setFormData(updated);
      setFastSnapHotkeyError(null);
      setIsRecordingFastSnapHotkey(false);
      fastSnapPressedKeysRef.current.clear();
      fastSnapMaxComboRef.current = [];
      setFastSnapRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }

    // Backspace when nothing held resets / clears the hotkey
    if (e.key === 'Backspace' && fastSnapPressedKeysRef.current.size === 0) {
      const updated = {
        ...formData,
        donkeyTools: {
          ...formData.donkeyTools,
          fastSnap: {
            enabled: formData.donkeyTools?.fastSnap?.enabled ?? true,
            hotkey: '',
            saveDirectory: formData.donkeyTools?.fastSnap?.saveDirectory,
          },
        },
      };
      setFormData(updated);
      handleSave(updated);
      setFastSnapHotkeyError(null);
      setIsRecordingFastSnapHotkey(false);
      fastSnapPressedKeysRef.current.clear();
      fastSnapMaxComboRef.current = [];
      setFastSnapRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }

    // Normalize key
    let keyName = e.key;
    if (keyName === 'Control') keyName = 'Ctrl';
    else if (keyName === 'Alt') keyName = 'Alt';
    else if (keyName === 'Shift') keyName = 'Shift';
    else if (keyName === 'Meta') keyName = 'Super';
    else if (keyName === ' ') keyName = 'Space';
    else if (keyName === 'ArrowUp') keyName = 'Up';
    else if (keyName === 'ArrowDown') keyName = 'Down';
    else if (keyName === 'ArrowLeft') keyName = 'Left';
    else if (keyName === 'ArrowRight') keyName = 'Right';
    else if (/^[a-z]$/i.test(keyName)) keyName = keyName.toUpperCase();

    fastSnapPressedKeysRef.current.add(keyName);

    // Sort order: Modifiers first, then normal keys
    const order = ['Ctrl', 'Alt', 'Shift', 'Super'];
    const currentKeys = Array.from(fastSnapPressedKeysRef.current);
    currentKeys.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    fastSnapMaxComboRef.current = currentKeys;
    const mods = currentKeys.filter((k) => order.includes(k));
    setFastSnapRecordedModifiers(mods);
  };

  const handleFastSnapHotkeyKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const combo = fastSnapMaxComboRef.current;

    // If only 1 key was pressed and released: reset to previous hotkey + display red error
    if (combo.length === 1) {
      const fallback = fastSnapOriginalHotkeyRef.current || '';
      const updated = {
        ...formData,
        donkeyTools: {
          ...formData.donkeyTools,
          fastSnap: {
            enabled: formData.donkeyTools?.fastSnap?.enabled ?? true,
            hotkey: fallback,
            saveDirectory: formData.donkeyTools?.fastSnap?.saveDirectory,
          },
        },
      };
      setFormData(updated);
      setFastSnapHotkeyError('Je potřeba minimálně dvojkombinace kláves');
      setIsRecordingFastSnapHotkey(false);
      fastSnapPressedKeysRef.current.clear();
      fastSnapMaxComboRef.current = [];
      setFastSnapRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }

    // If at least 2 keys were pressed: check reserved hotkey collision and collision with launcher / colorMaster hotkey
    if (combo.length >= 2) {
      const finalHotkey = combo.join('+');
      const conflictReason = getReservedHotkeyCollision(combo);

      if (conflictReason) {
        const fallback = fastSnapOriginalHotkeyRef.current || '';
        const updated = {
          ...formData,
          donkeyTools: {
            ...formData.donkeyTools,
            fastSnap: {
              enabled: formData.donkeyTools?.fastSnap?.enabled ?? true,
              hotkey: fallback,
              saveDirectory: formData.donkeyTools?.fastSnap?.saveDirectory,
            },
          },
        };
        setFormData(updated);
        setFastSnapHotkeyError(`Zkratku „${finalHotkey}“ nelze nastavit – ${conflictReason}. Byla zachována původní zkratka.`);
        setIsRecordingFastSnapHotkey(false);
        fastSnapPressedKeysRef.current.clear();
        fastSnapMaxComboRef.current = [];
        setFastSnapRecordedModifiers([]);
        (e.target as HTMLInputElement).blur();
        window.electronAPI?.resumeGlobalHotkey?.();
        return;
      }

      // Check collision with main launcher hotkey
      const launcherHotkey = formData.hotkey || 'Ctrl+Alt+Space';
      if (finalHotkey.toLowerCase() === launcherHotkey.toLowerCase()) {
        const fallback = fastSnapOriginalHotkeyRef.current || '';
        const updated = {
          ...formData,
          donkeyTools: {
            ...formData.donkeyTools,
            fastSnap: {
              enabled: formData.donkeyTools?.fastSnap?.enabled ?? true,
              hotkey: fallback,
              saveDirectory: formData.donkeyTools?.fastSnap?.saveDirectory,
            },
          },
        };
        setFormData(updated);
        setFastSnapHotkeyError(`Zkratku „${finalHotkey}“ nelze nastavit – koliduje se zkratkou vyhledávacího okna. Byla zachována původní zkratka.`);
        setIsRecordingFastSnapHotkey(false);
        fastSnapPressedKeysRef.current.clear();
        fastSnapMaxComboRef.current = [];
        setFastSnapRecordedModifiers([]);
        (e.target as HTMLInputElement).blur();
        window.electronAPI?.resumeGlobalHotkey?.();
        return;
      }

      // Check collision with ColorMaster hotkey
      const colorMasterHotkey = formData.donkeyTools?.colorMaster?.hotkey || '';
      if (colorMasterHotkey && finalHotkey.toLowerCase() === colorMasterHotkey.toLowerCase()) {
        const fallback = fastSnapOriginalHotkeyRef.current || '';
        const updated = {
          ...formData,
          donkeyTools: {
            ...formData.donkeyTools,
            fastSnap: {
              enabled: formData.donkeyTools?.fastSnap?.enabled ?? true,
              hotkey: fallback,
              saveDirectory: formData.donkeyTools?.fastSnap?.saveDirectory,
            },
          },
        };
        setFormData(updated);
        setFastSnapHotkeyError(`Zkratku „${finalHotkey}“ nelze nastavit – koliduje se zkratkou ColorMaster kapátka. Byla zachována původní zkratka.`);
        setIsRecordingFastSnapHotkey(false);
        fastSnapPressedKeysRef.current.clear();
        fastSnapMaxComboRef.current = [];
        setFastSnapRecordedModifiers([]);
        (e.target as HTMLInputElement).blur();
        window.electronAPI?.resumeGlobalHotkey?.();
        return;
      }

      setFastSnapHotkeyError(null);
      const updated = {
        ...formData,
        donkeyTools: {
          ...formData.donkeyTools,
          fastSnap: {
            enabled: formData.donkeyTools?.fastSnap?.enabled ?? true,
            hotkey: finalHotkey,
            saveDirectory: formData.donkeyTools?.fastSnap?.saveDirectory,
          },
        },
      };
      setFormData(updated);
      handleSave(updated);
      setIsRecordingFastSnapHotkey(false);
      fastSnapPressedKeysRef.current.clear();
      fastSnapMaxComboRef.current = [];
      setFastSnapRecordedModifiers([]);
      (e.target as HTMLInputElement).blur();
      window.electronAPI?.resumeGlobalHotkey?.();
      return;
    }
  };

  const loadRecentFastSnaps = async () => {
    if (!window.electronAPI?.getRecentFastSnaps) return;
    setIsLoadingFastSnaps(true);
    try {
      const items = await window.electronAPI.getRecentFastSnaps();
      setRecentFastSnaps(items || []);
    } catch (err) {
      console.error('Failed to load recent fastsnaps:', err);
    } finally {
      setIsLoadingFastSnaps(false);
    }
  };

  const handleCopyFastSnap = async (itemPath: string) => {
    if (!window.electronAPI?.copyFastSnapToClipboard) return;
    const res = await window.electronAPI.copyFastSnapToClipboard(itemPath);
    if (res?.success) {
      setCopiedFastSnapPath(itemPath);
      setTimeout(() => setCopiedFastSnapPath(null), 2000);
    }
  };

  const handleDeleteFastSnap = async (itemPath: string) => {
    if (!window.electronAPI?.deleteFastSnap) return;
    await window.electronAPI.deleteFastSnap(itemPath);
    await loadRecentFastSnaps();
  };

  const handleShowFastSnapInFolder = (itemPath: string) => {
    window.electronAPI?.showFastSnapInFolder?.(itemPath);
  };

  const handleChooseFastSnapFolder = async () => {
    if (!window.electronAPI?.chooseFastSnapFolder) return;
    const chosen = await window.electronAPI.chooseFastSnapFolder();
    if (chosen) {
      const updated = {
        ...formData,
        donkeyTools: {
          ...formData.donkeyTools,
          fastSnap: {
            enabled: formData.donkeyTools?.fastSnap?.enabled ?? true,
            hotkey: formData.donkeyTools?.fastSnap?.hotkey || '',
            saveDirectory: chosen,
          },
        },
      };
      setFormData(updated);
      handleSave(updated);
      loadRecentFastSnaps();
    }
  };

  const renderSourceForm = (isInline: boolean) => {
    if (!editingSource) return null;
    return (
      <div className={isInline ? 'space-y-4' : 'p-4 bg-white/[0.04] border border-indigo-500/40 rounded-xl space-y-4'}>
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="font-semibold text-sm text-indigo-300">
            {editingSource.type === 'file'
              ? (isInline ? 'Nastavení lokálního souboru' : 'Konfigurace lokálního souboru')
              : (isInline ? 'Nastavení API zdroje' : 'Konfigurace API zdroje')}
          </span>
          <button
            type="button"
            onClick={handleCloseSourceForm}
            className="text-gray-400 hover:text-white cursor-pointer p-0.5"
            title="Zavřít"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-300 mb-1">Název zdroje</label>
            <input
              type="text"
              value={editingSource.name || ''}
              onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              placeholder="Např. Firemní záložky"
            />
          </div>

          {editingSource.type === 'file' ? (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-300 mb-1">Cesta k JSON souboru na disku</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={(editingSource as FileSource).path || ''}
                  onChange={(e) => {
                    const updated = { ...(editingSource as FileSource), path: e.target.value };
                    setEditingSource(updated);
                  }}
                  onBlur={() => {
                    if ((editingSource as FileSource)?.path) triggerInspectSource();
                  }}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                  placeholder="C:\cesta\k\souboru.json"
                />
                <button
                  type="button"
                  onClick={handlePickLocalFile}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Procházet...
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">API GET Request URL</label>
                <input
                  type="text"
                  value={(editingSource as ApiSource).url || ''}
                  onChange={(e) => {
                    const updated = { ...(editingSource as ApiSource), url: e.target.value };
                    setEditingSource(updated);
                  }}
                  onBlur={() => {
                    if ((editingSource as ApiSource)?.url) triggerInspectSource();
                  }}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                  placeholder="https://api.example.com/items"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Způsob autentizace</label>
                <select
                  value={(editingSource as ApiSource).authType}
                  onChange={(e) =>
                    setEditingSource({
                      ...(editingSource as ApiSource),
                      authType: e.target.value as 'none' | 'getToken',
                    })
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                >
                  <option value="none">Bez přihlášení</option>
                  <option value="getToken">S přihlášením (getToken metoda)</option>
                </select>
              </div>

              {(editingSource as ApiSource).authType === 'getToken' && (
                <div className="col-span-2 p-3 bg-black/20 rounded-lg border border-white/5 space-y-3">
                  <p className="text-xs text-indigo-300 font-medium">Nastavení pro získání tokenu (getToken)</p>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">URL pro získání tokenu (POST)</label>
                    <input
                      type="text"
                      value={(editingSource as ApiSource).tokenUrl || ''}
                      onChange={(e) =>
                        setEditingSource({ ...(editingSource as ApiSource), tokenUrl: e.target.value })
                      }
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none"
                      placeholder="https://api.example.com/auth/get-token"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Uživatelské jméno / Klíč</label>
                      <input
                        type="text"
                        value={(editingSource as ApiSource).tokenUsername || ''}
                        onChange={(e) =>
                          setEditingSource({ ...(editingSource as ApiSource), tokenUsername: e.target.value })
                        }
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                        placeholder="admin@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Heslo / Secret</label>
                      <input
                        type="password"
                        value={(editingSource as ApiSource).tokenPassword || ''}
                        onChange={(e) =>
                          setEditingSource({ ...(editingSource as ApiSource), tokenPassword: e.target.value })
                        }
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* JSON Structure Detection and Field Mapping - shown ONLY if structure has an error or mismatch */}
          {hasStructureError && (
            <div className="col-span-2 pt-4 border-t border-white/10 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-indigo-400">tune</span>
                    Mapování polí JSONu (odlišná struktura dat)
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {hasMissingName
                      ? 'V načtených datech nebylo nalezeno standardní pole "name". Namapujte prosím atributy z JSONu na pole IADonkey.'
                      : 'Vlastní mapování atributů JSONu na pole IADonkey.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerInspectSource()}
                  disabled={isInspecting}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                  title="Znovu analyzovat data ze zdroje a načíst pole"
                >
                  <span className={`material-symbols-outlined text-xs ${isInspecting ? 'animate-spin' : ''}`}>sync</span>
                  <span>Znovu načíst pole</span>
                </button>
              </div>

              {isInspecting && (
                <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center gap-2 text-xs text-indigo-300">
                  <span className="material-symbols-outlined text-base animate-spin text-indigo-400">sync</span>
                  <span>Načítám a analyzuji strukturu JSON dat...</span>
                </div>
              )}

              {inspectError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm shrink-0">error</span>
                    <span>{inspectError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerInspectSource()}
                    className="text-[11px] underline hover:text-white shrink-0 cursor-pointer"
                  >
                    Zkusit znovu
                  </button>
                </div>
              )}

              <div className="p-3.5 bg-black/30 rounded-xl border border-white/5 space-y-3">
                {detectedKeys.length > 0 ? (
                  <div className="text-[11px] text-gray-400 pb-2 border-b border-white/5 flex flex-wrap items-center gap-1.5">
                    <span>Detekovaná pole v záznamech ({detectedKeys.length}):</span>
                    {detectedKeys.map((k) => (
                      <code key={k} className="px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 font-mono text-[10px]">
                        {k}
                      </code>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-300/80 pb-2 border-b border-white/5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-amber-400">info</span>
                    <span>Klíče z JSONu nebyly automaticky detekovány. Můžete zadat název pole ručně nebo zvolit pevnou hodnotu.</span>
                  </div>
                )}

                <div className="space-y-3">
                  {MAPPING_FIELDS.map((target) => {
                    const rule = editingSource?.mapping?.[target.key];
                    const isActionField = target.key === 'action';
                    const isFixed = rule?.type === 'fixed';
                    const isCustomField = rule?.type === 'field' && Boolean(rule.value) && !detectedKeys.includes(rule.value);
                    const selectValue = isFixed
                      ? (isActionField && (rule?.value === 'open' || rule?.value === 'copy')
                          ? (rule.value === 'open' ? '__fixed_open__' : '__fixed_copy__')
                          : '__fixed__')
                      : isCustomField
                      ? '__custom_field__'
                      : (rule?.value || '');

                    return (
                      <div key={target.key} className="space-y-1.5 bg-white/[0.02] p-3 rounded-lg border border-white/5 w-full">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-gray-300">{target.label}</label>
                          <span className="text-[10px] text-gray-500">{target.defaultHint}</span>
                        </div>
                        <select
                          value={selectValue}
                          onChange={(e) => handleMappingChange(target.key, e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          <option value="">{isActionField ? '— Výchozí: open (Otevřít) —' : '— Výchozí (z pole se stejným názvem) —'}</option>
                          {detectedKeys.length > 0 && (
                            <optgroup label="Detekovaná pole v JSONu">
                              {detectedKeys.map((k) => (
                                <option key={k} value={k}>
                                  Pole: {k}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {isActionField && (
                            <>
                              <option value="__fixed_open__">★ Pevná hodnota pro všechny: Otevřít (open)</option>
                              <option value="__fixed_copy__">★ Pevná hodnota pro všechny: Kopírovat (copy)</option>
                            </>
                          )}
                          <option value="__custom_field__">✎ Ručně zadat název pole z JSONu...</option>
                          <option value="__fixed__">{isActionField ? '★ Jiná pevná hodnota...' : '★ Vlastní pevná hodnota pro všechny záznamy...'}</option>
                        </select>

                        {isCustomField && (
                          <div className="pt-1">
                            <input
                              type="text"
                              value={rule?.value || ''}
                              onChange={(e) => handleCustomFieldChange(target.key, e.target.value)}
                              placeholder="Zadejte přesný název klíče v JSONu (např. title, link, url)"
                              className="w-full bg-black/60 border border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-400 font-mono"
                            />
                          </div>
                        )}

                        {isFixed && isActionField && (
                          <div className="pt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleFixedValueChange('action', 'open')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                                rule?.value === 'open'
                                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                                  : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                              <span>Otevřít (open)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFixedValueChange('action', 'copy')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                                rule?.value === 'copy'
                                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                                  : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">content_copy</span>
                              <span>Kopírovat (copy)</span>
                            </button>
                          </div>
                        )}

                        {isFixed && target.key === 'icon' && (
                          <div className="pt-1">
                            <IconPickerInput
                              value={rule?.value || ''}
                              onChange={(val) => handleFixedValueChange('icon', val)}
                              placeholder="Vyberte pevnou ikonu pro všechny záznamy..."
                            />
                          </div>
                        )}

                        {isFixed && target.key !== 'icon' && (!isActionField || (rule?.value !== 'open' && rule?.value !== 'copy')) && (
                          <div className="pt-1">
                            <input
                              type="text"
                              value={rule?.value || ''}
                              onChange={(e) => handleFixedValueChange(target.key, e.target.value)}
                              placeholder={target.placeholder || 'Zadejte pevnou hodnotu pro všechny záznamy'}
                              className="w-full bg-black/60 border border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-400 font-mono"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Live preview - věrná simulace Spotlight výsledku */}
                {sampleRecord && (() => {
                  const previewName = getMappedPreviewValue('name', 'Položka bez názvu');
                  const previewLocation = getMappedPreviewValue('location', '');
                  const previewIcon = getMappedPreviewValue('icon', 'code');
                  const previewImage = getMappedPreviewValue('image', '');
                  const previewAction = getMappedPreviewValue('action', 'open');

                  return (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>Náhled 1. položky ve Spotlight vyhledávači:</span>
                      </div>

                      {/* Spotlight container frame */}
                      <div className="bg-[#1c1d24] border border-white/10 rounded-xl p-1.5 shadow-xl">
                        <div className="flex items-center px-3 py-2.5 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-white shadow-md gap-3">
                          {/* Column 1: Icon / Image with separator */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="w-9 h-9 flex items-center justify-center overflow-hidden">
                              <MaterialIcon
                                icon={previewIcon}
                                image={previewImage}
                                location={previewLocation}
                                fallbackIcon="code"
                                className="w-7 h-7"
                              />
                            </div>
                            <div className="h-6 w-[1px] shrink-0 self-center bg-white/20" />
                          </div>

                          {/* Column 2: Name and Location */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center pl-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate leading-tight text-white">
                                {previewName}
                              </span>
                              {previewAction && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border font-medium uppercase bg-white/10 text-gray-300 border-white/15">
                                  {previewAction}
                                </span>
                              )}
                            </div>
                            <div className="text-xs mt-0.5 font-mono text-gray-400 truncate">
                              {previewLocation || '(žádná lokace)'}
                            </div>
                          </div>

                          {/* Column 3: Action indicator */}
                          <div className="shrink-0 text-xs flex items-center gap-1.5 text-indigo-200 opacity-90 select-none">
                            <span className="text-[11px]">Provést</span>
                            <kbd className="inline-flex items-center justify-center h-[18px] px-1.5 bg-white/10 text-gray-300 border border-white/15 rounded font-mono text-[10px] leading-none whitespace-nowrap">
                              Enter
                            </kbd>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleCloseSourceForm}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={() => editingSource && handleSaveSource(editingSource)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition cursor-pointer"
          >
            Uložit zdroj
          </button>
        </div>
      </div>
    );
  };

  const STATIC_STRUCT_FIELDS: { key: keyof LauncherItem; label: string; placeholder: string }[] = [
    { key: 'name', label: 'Název (name)', placeholder: 'např. Moje položka' },
    { key: 'location', label: 'Cesta / URL / Hodnota (location)', placeholder: 'např. https://firma.cz nebo C:\\cesta' },
    { key: 'action', label: 'Akce (action)', placeholder: 'open nebo copy' },
    { key: 'icon', label: 'Ikona (icon)', placeholder: 'např. bookmark, folder, terminal...' },
    { key: 'image', label: 'Obrázek (image)', placeholder: 'např. https://.../logo.png' },
    { key: 'priority', label: 'Priorita (priority)', placeholder: 'např. 0, 10, -1' },
    { key: 'settings', label: 'Nastavení (settings)', placeholder: 'např. magicgate, git' },
  ];

  const handleExportStaticSource = (src: StaticSource) => {
    const shared = src.sharedParams || {};
    const mergedItems = (src.items || []).map((it) => {
      const itemCopy: any = { ...it };
      delete itemCopy.id;
      for (const [k, v] of Object.entries(shared)) {
        if (v !== undefined && v !== '' && (itemCopy[k] === undefined || itemCopy[k] === '' || itemCopy[k] === null)) {
          itemCopy[k] = k === 'priority' ? Number(v) : v;
        }
      }
      if (Array.isArray(itemCopy.options)) {
        itemCopy.options = itemCopy.options.map((opt: any) => {
          const optCopy: any = { ...opt };
          delete optCopy.id;
          delete optCopy.actions;
          return optCopy;
        });
      }
      if (Array.isArray(itemCopy.actions)) {
        itemCopy.actions = itemCopy.actions.map((act: any) => {
          const actCopy: any = { ...act };
          delete actCopy.id;
          return actCopy;
        });
      }
      return itemCopy;
    });

    const jsonStr = JSON.stringify(mergedItems, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (src.name || 'static-data').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    a.download = `${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderStaticSourceForm = (isInline: boolean) => {
    if (!editingSource || editingSource.type !== 'static') return null;
    const staticSrc = editingSource as StaticSource;
    const sharedParams = staticSrc.sharedParams || {};
    const unusedFields = STATIC_STRUCT_FIELDS.filter((f) => !(f.key in sharedParams));
    const items = staticSrc.items || [];
    const itemFields = STATIC_STRUCT_FIELDS.filter((f) => !(f.key in sharedParams));

    const handleUpdateShared = (key: string, value: string) => {
      setEditingSource({
        ...staticSrc,
        sharedParams: { ...sharedParams, [key]: value },
      });
    };

    const handleRemoveShared = (key: string) => {
      const updated = { ...sharedParams };
      delete updated[key];
      setEditingSource({
        ...staticSrc,
        sharedParams: updated,
      });
    };

    const handleAddSharedField = (fieldKey: string) => {
      setEditingSource({
        ...staticSrc,
        sharedParams: {
          ...sharedParams,
          [fieldKey]: fieldKey === 'action' ? 'open' : fieldKey === 'priority' ? '0' : '',
        },
      });
      setIsSharedDropdownOpen(false);
    };

    const handleAddItem = () => {
      const newItem: LauncherItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: '',
      };
      setEditingSource({
        ...staticSrc,
        items: [...items, newItem],
      });
    };

    const handleRemoveItem = (index: number) => {
      const nextItems = items.filter((_, i) => i !== index);
      setEditingSource({
        ...staticSrc,
        items: nextItems,
      });
    };

    const handleUpdateItemField = (itemIdx: number, fieldKey: keyof LauncherItem, val: any) => {
      const nextItems = [...items];
      nextItems[itemIdx] = {
        ...nextItems[itemIdx],
        [fieldKey]: fieldKey === 'priority' ? (val === '' ? null : Number(val)) : val,
      };
      setEditingSource({
        ...staticSrc,
        items: nextItems,
      });
    };

    const handleAddAction = (itemIdx: number) => {
      const nextItems = [...items];
      const curActions = nextItems[itemIdx].actions || [];
      nextItems[itemIdx] = {
        ...nextItems[itemIdx],
        actions: [...curActions, { name: '', action: 'open', location: '', icon: '', settings: null }],
      };
      setEditingSource({ ...staticSrc, items: nextItems });
    };

    const handleUpdateAction = (itemIdx: number, actionIdx: number, fieldKey: string, val: string) => {
      const nextItems = [...items];
      const curActions = [...(nextItems[itemIdx].actions || [])];
      const normalizedVal = val === '' ? null : val;
      const updatedAction = { ...curActions[actionIdx], [fieldKey]: normalizedVal };

      // Logické provázání action a settings
      if (fieldKey === 'action') {
        if (val === 'clone' || val === 'clonerecursive') {
          updatedAction.settings = 'git';
        } else if (val === 'vscode') {
          updatedAction.settings = 'vscode';
        } else if (val === 'android-studio') {
          updatedAction.settings = 'android-studio';
        }
      } else if (fieldKey === 'settings') {
        if (val === 'vscode') {
          updatedAction.action = 'vscode';
        } else if (val === 'android-studio') {
          updatedAction.action = 'android-studio';
        } else if (val === 'git' && !['clone', 'clonerecursive'].includes(updatedAction.action)) {
          updatedAction.action = 'clone';
        }
      }

      curActions[actionIdx] = updatedAction;
      nextItems[itemIdx] = { ...nextItems[itemIdx], actions: curActions };
      setEditingSource({ ...staticSrc, items: nextItems });
    };

    const handleRemoveAction = (itemIdx: number, actionIdx: number) => {
      const nextItems = [...items];
      const curActions = (nextItems[itemIdx].actions || []).filter((_, i) => i !== actionIdx);
      nextItems[itemIdx] = { ...nextItems[itemIdx], actions: curActions.length > 0 ? curActions : undefined };
      setEditingSource({ ...staticSrc, items: nextItems });
    };

    const handleAddOption = (itemIdx: number) => {
      const nextItems = [...items];
      const curOptions = nextItems[itemIdx].options || [];
      const newOpt: LauncherItem = {
        id: `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        location: '',
        action: 'open',
        icon: '',
        image: '',
        settings: null,
      };
      nextItems[itemIdx] = {
        ...nextItems[itemIdx],
        options: [...curOptions, newOpt],
      };
      setEditingSource({ ...staticSrc, items: nextItems });
    };

    const handleUpdateOption = (itemIdx: number, optIdx: number, fieldKey: keyof LauncherItem, val: any) => {
      const nextItems = [...items];
      const curOptions = [...(nextItems[itemIdx].options || [])];
      const normalizedVal = val === '' ? null : val;
      const updatedOpt = { ...curOptions[optIdx], [fieldKey]: normalizedVal };

      // Logické provázání action a settings
      if (fieldKey === 'action') {
        if (val === 'vscode') {
          updatedOpt.settings = 'vscode';
        } else if (val === 'android-studio') {
          updatedOpt.settings = 'android-studio';
        }
      } else if (fieldKey === 'settings') {
        if (val === 'vscode') {
          updatedOpt.action = 'open';
        } else if (val === 'android-studio') {
          updatedOpt.action = 'open';
        }
      }

      curOptions[optIdx] = updatedOpt;
      nextItems[itemIdx] = { ...nextItems[itemIdx], options: curOptions };
      setEditingSource({ ...staticSrc, items: nextItems });
    };

    const handleRemoveOption = (itemIdx: number, optIdx: number) => {
      const nextItems = [...items];
      const curOptions = (nextItems[itemIdx].options || []).filter((_, i) => i !== optIdx);
      nextItems[itemIdx] = { ...nextItems[itemIdx], options: curOptions.length > 0 ? curOptions : undefined };
      setEditingSource({ ...staticSrc, items: nextItems });
    };

    return (
      <div className={isInline ? 'space-y-4' : 'p-4 bg-purple-950/10 border border-purple-500/40 rounded-xl space-y-4'}>
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="font-semibold text-sm text-purple-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">data_object</span>
            {isInline ? 'Nastavení statických dat' : 'Konfigurace statických dat'}
          </span>
          <button
            type="button"
            onClick={handleCloseSourceForm}
            className="text-gray-400 hover:text-white cursor-pointer p-0.5"
            title="Zavřít"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Source Name */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Název zdroje</label>
          <input
            type="text"
            value={staticSrc.name || ''}
            onChange={(e) => setEditingSource({ ...staticSrc, name: e.target.value })}
            placeholder="např. Oblíbené weby, Nástroje týmu..."
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-400"
          />
        </div>

        {/* ČÁST 1: Společné parametry */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h5 className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">share</span>
                Část 1: Společné parametry (dědí všechny položky)
              </h5>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Parametry nastavené zde se automaticky použijí pro každou položku a nebudou se v nich znovu zadávat.
              </p>
            </div>

            {/* Dropdown button for adding shared param */}
            <div className="relative">
              <button
                type="button"
                disabled={unusedFields.length === 0}
                onClick={() => setIsSharedDropdownOpen(!isSharedDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Přidat společný parametr</span>
                <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
              </button>

              {isSharedDropdownOpen && unusedFields.length > 0 && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#1e2029] border border-purple-500/40 rounded-xl shadow-2xl py-1 z-50 animate-fade-in">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-white/10">
                    Dostupná pole struktury:
                  </div>
                  {unusedFields.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => handleAddSharedField(f.key)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-purple-500/20 text-gray-200 hover:text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="font-mono text-purple-300">{f.key}</span>
                      <span className="text-[11px] text-gray-400">{f.label.split('(')[0].trim()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* List of active shared params */}
          {Object.keys(sharedParams).length === 0 ? (
            <div className="p-3 bg-black/20 border border-dashed border-white/10 rounded-lg text-center text-xs text-gray-400">
              Žádné společné parametry nejsou definovány. Všechna pole budete moci zadávat u každé položky zvlášť.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(sharedParams).map(([key, val]) => {
                const fieldDef = STATIC_STRUCT_FIELDS.find((f) => f.key === key);
                return (
                  <div key={key} className="p-2.5 bg-black/30 border border-purple-500/30 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-medium text-purple-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        {key}
                        <span className="text-[11px] font-sans text-gray-400">({fieldDef?.label.split('(')[0].trim() || key})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveShared(key)}
                        className="text-gray-400 hover:text-rose-400 transition cursor-pointer p-0.5"
                        title="Odebrat společný parametr (vrátí se do dropdownu)"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>

                    {key === 'action' ? (
                      <div className="flex items-center gap-1.5 h-[38px]">
                        <button
                          type="button"
                          onClick={() => handleUpdateShared('action', 'open')}
                          className={`flex-1 h-[38px] text-xs rounded-lg border transition cursor-pointer flex items-center justify-center gap-1 ${
                            val === 'open'
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          open
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateShared('action', 'copy')}
                          className={`flex-1 h-[38px] text-xs rounded-lg border transition cursor-pointer flex items-center justify-center gap-1 ${
                            val === 'copy'
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">content_copy</span>
                          copy
                        </button>
                      </div>
                    ) : key === 'icon' ? (
                      <IconPickerInput
                        value={val || ''}
                        onChange={(newIcon) => handleUpdateShared('icon', newIcon)}
                        placeholder="Vybrat společnou ikonu..."
                        accentColorClass="text-purple-300"
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleUpdateShared(key, e.target.value)}
                        placeholder={fieldDef?.placeholder || 'Hodnota'}
                        className="w-full h-[38px] bg-black/50 border border-white/10 rounded-lg px-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-400 font-mono"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ČÁST 2: Položky */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h5 className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">list</span>
                Část 2: Položky ({items.length})
              </h5>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Formulář každé položky obsahuje pouze nespolečná pole.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Přidat položku</span>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="p-4 bg-black/20 border border-dashed border-white/10 rounded-lg text-center text-xs text-gray-400">
              Zatím nejsou přidány žádné položky. Klikněte na &quot;Přidat položku&quot; výše.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, itemIdx) => (
                <div
                  key={item.id || itemIdx}
                  className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-mono flex items-center justify-center">
                        {itemIdx + 1}
                      </span>
                      <span className="text-xs font-semibold text-white truncate max-w-xs">
                        {item.name || '(Položka bez názvu)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(itemIdx)}
                      className="text-gray-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1 text-xs"
                      title="Smazat tuto položku"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <span>Smazat</span>
                    </button>
                  </div>

                  {/* Nespolečná pole položky */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {itemFields.map((field) => {
                      const isFullWidth = field.key === 'name' || field.key === 'location';
                      return (
                        <div
                          key={field.key}
                          className={`space-y-1 ${isFullWidth ? 'col-span-1 sm:col-span-2' : ''}`}
                        >
                          <label className="text-[11px] text-gray-300 font-medium flex items-center justify-between">
                            <span>{field.label}</span>
                            <span className="text-gray-500 font-mono text-[10px]">{field.key}</span>
                          </label>
                          {field.key === 'action' ? (
                            <div className="flex items-center gap-1.5 h-[38px]">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemField(itemIdx, 'action', 'open')}
                                className={`flex-1 h-[38px] text-xs rounded-lg border transition cursor-pointer flex items-center justify-center gap-1 ${
                                  (item.action || 'open') === 'open'
                                    ? 'bg-purple-600 border-purple-500 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                                }`}
                              >
                                open
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemField(itemIdx, 'action', 'copy')}
                                className={`flex-1 h-[38px] text-xs rounded-lg border transition cursor-pointer flex items-center justify-center gap-1 ${
                                  item.action === 'copy'
                                    ? 'bg-purple-600 border-purple-500 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                                }`}
                              >
                                copy
                              </button>
                            </div>
                          ) : field.key === 'location' ? (
                            <textarea
                              rows={3}
                              value={(item.location as string) ?? ''}
                              onChange={(e) => handleUpdateItemField(itemIdx, 'location', e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-400 font-mono resize-y whitespace-pre leading-relaxed"
                            />
                          ) : field.key === 'icon' ? (
                            <IconPickerInput
                              value={(item.icon as string) ?? ''}
                              onChange={(val) => handleUpdateItemField(itemIdx, 'icon', val)}
                              placeholder="Vybrat ikonu položky..."
                              accentColorClass="text-purple-300"
                            />
                          ) : (
                            <input
                              type="text"
                              value={(item[field.key as keyof LauncherItem] as string) ?? ''}
                              onChange={(e) => handleUpdateItemField(itemIdx, field.key as keyof LauncherItem, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full h-[38px] bg-black/50 border border-white/10 rounded-lg px-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-400 font-mono"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Možnosti Actions a Options */}
                  <div className="pt-2 border-t border-white/5 space-y-2.5">
                    {/* Actions list */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-purple-400">touch_app</span>
                          Akce položky ({item.actions?.length || 0})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddAction(itemIdx)}
                          className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                          Přidat akci
                        </button>
                      </div>

                      {(item.actions || []).map((act, actIdx) => (
                        <div key={actIdx} className="p-3 bg-black/60 border border-white/10 rounded-xl space-y-2.5 text-xs">
                          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                            <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono flex items-center justify-center">
                                {actIdx + 1}
                              </span>
                              <span>{act.name || `Akce #${actIdx + 1}`}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAction(itemIdx, actIdx)}
                              className="text-gray-400 hover:text-rose-400 text-xs flex items-center gap-1 cursor-pointer"
                              title="Smazat akci"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                              <span>Smazat</span>
                            </button>
                          </div>

                          {/* Řádek 1: name | action */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">Název akce (name)</label>
                              <input
                                type="text"
                                value={act.name || ''}
                                onChange={(e) => handleUpdateAction(itemIdx, actIdx, 'name', e.target.value)}
                                placeholder="např. Otevřít ve VS Code"
                                className="w-full h-[38px] bg-black/50 border border-white/10 rounded-lg px-2.5 text-xs text-white outline-none focus:border-purple-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">Typ akce (action)</label>
                              <select
                                value={act.action || ''}
                                onChange={(e) => handleUpdateAction(itemIdx, actIdx, 'action', e.target.value)}
                                className="w-full h-[38px] bg-[#181920] border border-white/10 rounded-lg px-2.5 text-xs text-white outline-none focus:border-purple-400 font-mono"
                              >
                                <option value="">(Výchozí / null)</option>
                                <option value="open">open</option>
                                <option value="copy">copy</option>
                                <option value="clone">clone</option>
                                <option value="clonerecursive">clonerecursive</option>
                                <option value="vscode">vscode</option>
                                <option value="android-studio">android-studio</option>
                              </select>
                            </div>
                          </div>

                          {/* Řádek 2: location (víceřádkové pole, respektovat odřádkování) */}
                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Cesta / Hodnota (location)</label>
                            <textarea
                              rows={2}
                              value={act.location || ''}
                              onChange={(e) => handleUpdateAction(itemIdx, actIdx, 'location', e.target.value)}
                              placeholder="Cesta k souboru, URL adresa, příkaz nebo text..."
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-400 font-mono resize-y whitespace-pre-wrap leading-relaxed"
                            />
                          </div>

                          {/* Řádek 3: icon | settings */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">Ikona (icon)</label>
                              <IconPickerInput
                                value={act.icon || ''}
                                onChange={(val) => handleUpdateAction(itemIdx, actIdx, 'icon', val)}
                                placeholder="Vybrat ikonu akce..."
                                accentColorClass="text-purple-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">Nastavení (settings)</label>
                              <select
                                value={act.settings || ''}
                                onChange={(e) => handleUpdateAction(itemIdx, actIdx, 'settings', e.target.value)}
                                className="w-full h-[38px] bg-[#181920] border border-white/10 rounded-lg px-2.5 text-xs text-white outline-none focus:border-purple-400 font-mono"
                              >
                                <option value="">(Žádné / null)</option>
                                <option value="git">git</option>
                                <option value="magicgate">magicgate</option>
                                <option value="vscode">vscode</option>
                                <option value="android-studio">android-studio</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Options list */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-purple-400">subdirectory_arrow_right</span>
                          Subpoložky ({item.options?.length || 0})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddOption(itemIdx)}
                          className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                          Přidat subpoložku
                        </button>
                      </div>

                      {(item.options || []).map((opt, optIdx) => (
                        <div key={opt.id || optIdx} className="p-3 bg-black/50 border border-white/10 rounded-xl space-y-2.5 text-xs">
                          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                            <span className="text-xs font-semibold text-purple-200 flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono flex items-center justify-center">
                                {optIdx + 1}
                              </span>
                              <span>{opt.name || `Subpoložka #${optIdx + 1}`}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(itemIdx, optIdx)}
                              className="text-gray-400 hover:text-rose-400 text-xs flex items-center gap-1 cursor-pointer"
                              title="Smazat subpoložku"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                              <span>Smazat</span>
                            </button>
                          </div>

                          {/* Řádek 1: name | action */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">Název (name)</label>
                              <input
                                type="text"
                                value={opt.name || ''}
                                onChange={(e) => handleUpdateOption(itemIdx, optIdx, 'name', e.target.value)}
                                placeholder="Název subpoložky"
                                className="w-full h-[38px] bg-black/40 border border-white/10 rounded-lg px-2.5 text-xs text-white outline-none focus:border-purple-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">Typ akce (action)</label>
                              <select
                                value={opt.action || ''}
                                onChange={(e) => handleUpdateOption(itemIdx, optIdx, 'action', e.target.value)}
                                className="w-full h-[38px] bg-[#181920] border border-white/10 rounded-lg px-2.5 text-xs text-white outline-none focus:border-purple-400 font-mono"
                              >
                                <option value="">(Výchozí / null)</option>
                                <option value="open">open</option>
                                <option value="copy">copy</option>
                              </select>
                            </div>
                          </div>

                          {/* Řádek 2: location (víceřádkové pole, respektovat odřádkování) */}
                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Cesta / URL / Hodnota (location)</label>
                            <textarea
                              rows={2}
                              value={opt.location || ''}
                              onChange={(e) => handleUpdateOption(itemIdx, optIdx, 'location', e.target.value)}
                              placeholder="Cesta k souboru, složce, URL adresa..."
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-400 font-mono resize-y whitespace-pre-wrap leading-relaxed"
                            />
                          </div>

                          {/* Řádek 3: icon | image | settings */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">Ikona (icon)</label>
                              <IconPickerInput
                                value={opt.icon || ''}
                                onChange={(val) => handleUpdateOption(itemIdx, optIdx, 'icon', val)}
                                placeholder="Vybrat ikonu podpoložky..."
                                accentColorClass="text-purple-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">Obrázek (image)</label>
                              <input
                                type="text"
                                value={opt.image || ''}
                                onChange={(e) => handleUpdateOption(itemIdx, optIdx, 'image', e.target.value)}
                                placeholder="URL obrázku / favikony"
                                className="w-full h-[38px] bg-black/40 border border-white/10 rounded-lg px-2.5 text-xs text-white outline-none focus:border-purple-400 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">Nastavení (settings)</label>
                              <select
                                value={opt.settings || ''}
                                onChange={(e) => handleUpdateOption(itemIdx, optIdx, 'settings', e.target.value)}
                                className="w-full h-[38px] bg-[#181920] border border-white/10 rounded-lg px-2.5 text-xs text-white outline-none focus:border-purple-400 font-mono"
                              >
                                <option value="">(Žádné / null)</option>
                                <option value="magicgate">magicgate</option>
                                <option value="vscode">vscode</option>
                                <option value="android-studio">android-studio</option>
                                <option value="git">git</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center gap-2 pt-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleExportStaticSource(staticSrc)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-300 hover:text-white bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 rounded-lg transition cursor-pointer"
            title="Exportovat data se sloučenými společnými parametry"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Exportovat JSON</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseSourceForm}
              className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              Zrušit
            </button>
            <button
              type="button"
              onClick={() => handleSaveSource(staticSrc)}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition cursor-pointer shadow-sm"
            >
              Uložit statická data
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex bg-[#181920] text-gray-200 select-none overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-60 bg-[#121318] border-r border-white/10 flex flex-col shrink-0">
        {/* Sidebar Brand Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <span className="material-symbols-outlined text-xl">settings</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide leading-tight">IADonkey</h2>
              <span className="text-[11px] text-gray-400 block leading-tight">Nastavení</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowChangelog(true)}
            className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/10 hover:bg-white/20 text-indigo-300 hover:text-indigo-200 transition cursor-pointer"
            title="Kliknutím zobrazíte historii verzí a novinky (Changelog)"
          >
            v{CURRENT_APP_VERSION}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer ${
              activeTab === 'sources'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl text-indigo-400">database</span>
              <span>Zdroje dat</span>
            </div>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono">
              {formData.sources.length}
            </span>
          </button>

          {/* Extensions tab */}
          <button
            type="button"
            onClick={() => setActiveTab('extensions')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer ${
              activeTab === 'extensions'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl text-indigo-400">extension</span>
              <span>Rozšíření</span>
            </div>
            {activeExtensionsCount > 0 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono">
                {activeExtensionsCount}
              </span>
            )}
          </button>

          {/* MagicGate tab - visible only when extension is enabled */}
          {formData.extensions?.magicgate && (
            <button
              type="button"
              onClick={() => setActiveTab('magicgate')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer pl-6 ${
                activeTab === 'magicgate'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-amber-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl text-amber-400">security</span>
                <span>MagicGate</span>
              </div>
            </button>
          )}

          {/* MLog tab - visible only when extension is enabled */}
          {formData.extensions?.mlog && (
            <button
              type="button"
              onClick={() => setActiveTab('mlog')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer pl-6 ${
                activeTab === 'mlog'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-sky-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl text-sky-400">support_agent</span>
                <span>Taskmanager</span>
              </div>
            </button>
          )}

          {/* GitHub tab - visible only when extension is enabled */}
          {formData.extensions?.github && (
            <button
              type="button"
              onClick={() => setActiveTab('github')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer pl-6 ${
                activeTab === 'github'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-emerald-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl text-emerald-400">
                  folder_code
                </span>
                <span>GitHub</span>
              </div>
            </button>
          )}

          {/* VS Code tab - visible only when extension is enabled */}
          {formData.extensions?.vscode && (
            <button
              type="button"
              onClick={() => setActiveTab('vscode')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer pl-6 ${
                activeTab === 'vscode'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-cyan-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl text-cyan-400">code</span>
                <span>VS Code</span>
              </div>
            </button>
          )}

          {/* Android Studio tab - visible only when extension is enabled */}
          {formData.extensions?.androidStudio && (
            <button
              type="button"
              onClick={() => setActiveTab('android-studio')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer pl-6 ${
                activeTab === 'android-studio'
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-pink-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl text-pink-400">android</span>
                <span>Android Studio</span>
              </div>
            </button>
          )}

          {/* DonkeyTools tab - visible only when extension is enabled */}
          {formData.extensions?.donkeyTools && (
            <button
              type="button"
              onClick={() => setActiveTab('donkey-tools')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer pl-6 ${
                activeTab === 'donkey-tools'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-rose-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl text-rose-400">construction</span>
                <span>DonkeyTools</span>
              </div>
            </button>
          )}

          {/* Snippets tab */}
          <button
            type="button"
            onClick={() => setActiveTab('snippets')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer ${
              activeTab === 'snippets'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-xl text-indigo-400">draw</span>
            <span>Snippety</span>
          </button>

          {/* General tab */}
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer ${
              activeTab === 'general'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-xl text-indigo-400">tune</span>
            <span>Obecné</span>
          </button>

          {/* Updates tab */}
          <button
            type="button"
            onClick={() => setActiveTab('updates')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer ${
              activeTab === 'updates'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl text-indigo-400">system_update</span>
              <span>Aktualizace</span>
            </div>
            {updateInfo?.hasUpdate ? (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-md shadow-rose-500/30 shrink-0">
                1
              </span>
            ) : null}
          </button>

          {/* Help tab */}
          <button
            type="button"
            onClick={() => setActiveTab('help')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer ${
              activeTab === 'help'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-xl text-indigo-400">help</span>
            <span>Nápověda</span>
          </button>
        </nav>

      </aside>

      {/* Main Right Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#181920]">
        {/* Right Pane Header */}
        <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              {activeTab === 'sources' && 'Zdroje dat a mezipaměť'}
              {activeTab === 'extensions' && 'Doplňková rozšíření a integrace'}
              {activeTab === 'magicgate' && 'MagicGate přihlašovací údaje'}
              {activeTab === 'mlog' && 'MLog Helpdesk'}
              {activeTab === 'github' && 'GitHub repozitáře'}
              {activeTab === 'vscode' && 'Visual Studio Code (VS Code)'}
              {activeTab === 'android-studio' && 'Android Studio'}
              {activeTab === 'donkey-tools' && 'DonkeyTools – Systémové nástroje a utility'}
              {activeTab === 'snippets' && 'Uživatelské snippety'}
              {activeTab === 'general' && 'Obecné nastavení aplikace'}
              {activeTab === 'updates' && 'Aktualizace aplikace'}
              {activeTab === 'help' && 'Nápověda a klávesové zkratky'}
            </h2>
            <p className="text-[13px] text-gray-400 mt-1">
              {activeTab === 'sources' && 'Správa lokálních JSON souborů a vzdálených API endpointů'}
              {activeTab === 'extensions' && 'Správa doplňkových modulů, firemních nástrojů a externích služeb'}
              {activeTab === 'magicgate' && 'Konfigurace tichého přihlášení pro instanci IS Tour'}
              {activeTab === 'mlog' && 'Nastavení Base URL pro rychlé otevírání požadavků a úkolů'}
              {activeTab === 'github' && 'Přístup k osobním i firemním repozitářům a rychlému klonování'}
              {activeTab === 'vscode' && 'Konfigurace cesty k editoru VS Code pro otevírání repozitářů a projektů'}
              {activeTab === 'android-studio' && 'Konfigurace cesty k Android Studiu pro otevírání mobilních a Kotlin/Java projektů'}
              {activeTab === 'donkey-tools' && 'Správa vestavěných utilit, modulu ColorMaster a klávesových zkratek'}
              {activeTab === 'snippets' && 'Předem definované textové zkratky a osobní údaje pro rychlé vložení'}
              {activeTab === 'general' && 'Globální klávesová zkratka, barva motivu a vyhledávání programů'}
              {activeTab === 'updates' && 'Kontrola nových verzí a historie změn IADonkey'}
              {activeTab === 'help' && 'Přehled všech klávesových zkratek a chytrých funkcí'}
            </p>
          </div>
          {saveSuccess && (
            <span className="text-[13px] text-emerald-400 flex items-center gap-1.5 font-medium animate-fade-in bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg shrink-0">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Změny uloženy
            </span>
          )}
        </header>

        {/* Content Area */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Sources */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              {/* Alert banner for synchronization */}
              <div
                className="p-3.5 rounded-xl border flex items-center justify-between gap-4 text-[13px] font-medium animate-fade-in min-h-[58px]"
                style={{
                  backgroundColor: `${formData.primaryColor || '#6366f1'}15`,
                  borderColor: `${formData.primaryColor || '#6366f1'}35`,
                  color: formData.primaryColor || '#6366f1',
                }}
              >
                {/* Idle state: Last sync time info bubble */}
                {syncPhase === 'idle' && (
                  <div className="flex items-center gap-3 min-w-0 animate-fade-in">
                    <span className="material-symbols-outlined text-lg shrink-0">schedule</span>
                    <span className="text-gray-300 truncate">
                      {formData.lastSyncTime ? (
                        <>
                          Poslední aktualizace proběhla: <strong className="font-mono text-white ml-1">{formatLastSyncDate(formData.lastSyncTime)}</strong>
                        </>
                      ) : (
                        'Synchronizace dat zatím neproběhla'
                      )}
                    </span>
                  </div>
                )}

                {/* Syncing state: Replaces the info bubble with smooth progress bar & status text */}
                {syncPhase === 'syncing' && (
                  <div className="flex flex-col justify-center min-w-0 flex-1 gap-1.5 pr-2 animate-fade-in">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0 text-gray-200">
                        <span className="material-symbols-outlined text-base shrink-0 animate-spin text-indigo-400">
                          sync
                        </span>
                        <span className="truncate font-medium">
                          {syncProgress?.sourceName
                            ? `Synchronizuji: ${syncProgress.sourceName}`
                            : 'Probíhá synchronizace dat...'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-white shrink-0 text-xs">
                        {Math.round(visualProgress)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-150 ease-out shadow-sm"
                        style={{ width: `${visualProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Success state: Confirmation before switching back to info bubble */}
                {syncPhase === 'success' && (
                  <div className="flex items-center gap-2.5 min-w-0 text-emerald-400 animate-fade-in">
                    <span className="material-symbols-outlined text-lg shrink-0">check_circle</span>
                    <span className="text-gray-200 truncate font-medium text-[13px]">
                      Synchronizace dat proběhla úspěšně
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleTriggerSync}
                  disabled={syncPhase !== 'idle'}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                    syncPhase === 'success'
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                  title={
                    syncPhase === 'syncing'
                      ? 'Probíhá synchronizace dat'
                      : syncPhase === 'success'
                      ? 'Synchronizace proběhla úspěšně'
                      : 'Spustit synchronizaci dat ze všech povolených zdrojů'
                  }
                >
                  <span
                    className={`material-symbols-outlined text-base ${
                      syncPhase === 'syncing' ? 'animate-spin' : ''
                    }`}
                  >
                    {syncPhase === 'success' ? 'check' : 'sync'}
                  </span>
                  <span>
                    {syncPhase === 'syncing'
                      ? 'Probíhá synchronizace...'
                      : syncPhase === 'success'
                      ? 'Dokončeno'
                      : 'Spustit synchronizaci'}
                  </span>
                </button>
              </div>

              <div className="space-y-3">
                <div className="w-full">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-indigo-400">database</span>
                    Importované JSON zdroje a API
                  </h3>
                  <p className="text-[13px] text-gray-400 mt-1">
                    Aplikace stahuje a spojuje data ze všech povolených zdrojů do lokální mezipaměti.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSource('file');
                        setEditingSource({ ...initialFileSource });
                        setDetectedKeys([]);
                        setSampleRecord(null);
                        setInspectError(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium border border-indigo-500/40 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white rounded-lg transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">description</span>
                      Přidat JSON soubor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSource('api');
                        setEditingSource({ ...initialApiSource });
                        setDetectedKeys([]);
                        setSampleRecord(null);
                        setInspectError(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium border border-indigo-500/40 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white rounded-lg transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">api</span>
                      Přidat API endpoint
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSource('static');
                        setEditingSource({ ...initialStaticSource });
                        setDetectedKeys([]);
                        setSampleRecord(null);
                        setInspectError(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium border border-purple-500/40 hover:border-purple-400 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white rounded-lg transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">data_object</span>
                      Přidat statická data
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time sync progress bar */}
              {syncProgress && (
                <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-indigo-200 font-medium flex items-center gap-2">
                      <span className={`material-symbols-outlined text-base ${syncProgress.isComplete ? 'text-emerald-400' : 'text-indigo-400 animate-spin'}`}>
                        {syncProgress.isComplete ? 'check_circle' : 'sync'}
                      </span>
                      {syncProgress.isComplete ? (
                        <span className="text-emerald-300 font-semibold">Synchronizace dokončena</span>
                      ) : (
                        <>
                          <span>Synchronizuji ({syncProgress.current}/{syncProgress.total}):</span>
                          <strong className="text-white truncate max-w-xs">{syncProgress.sourceName || 'Příprava...'}</strong>
                        </>
                      )}
                    </span>
                    <span className="font-mono font-bold text-indigo-400 text-sm">
                      {syncProgress.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/10 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-300 ease-out shadow-sm"
                      style={{ width: `${Math.min(100, Math.max(0, syncProgress.percentage))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Inline Add Source Form */}
              {isAddingSource && (
                <div className={`p-4 rounded-xl shadow-sm animate-fade-in ${
                  isAddingSource === 'static'
                    ? 'bg-purple-950/20 border border-purple-500/40'
                    : 'bg-white/[0.03] border border-indigo-500/40'
                }`}>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className={`material-symbols-outlined text-lg ${
                        isAddingSource === 'static' ? 'text-purple-400' : 'text-indigo-400'
                      }`}>
                        {isAddingSource === 'file' ? 'description' : isAddingSource === 'api' ? 'api' : 'data_object'}
                      </span>
                      {isAddingSource === 'file'
                        ? 'Nový lokální JSON soubor'
                        : isAddingSource === 'api'
                        ? 'Nový API endpoint'
                        : 'Nová statická data'}
                    </h4>
                    <button
                      type="button"
                      onClick={handleCloseSourceForm}
                      className="text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                  {isAddingSource === 'static' ? renderStaticSourceForm(false) : renderSourceForm(false)}
                </div>
              )}

              {/* Sources List */}
              <div className="space-y-2.5">
                {formData.sources.length === 0 ? (
                  <div className="p-8 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-xl space-y-2">
                    <span className="material-symbols-outlined text-3xl text-gray-400">folder_open</span>
                    <p className="text-[13px] text-gray-300 font-medium">Zatím nejsou přidány žádné zdroje dat.</p>
                    <p className="text-xs text-gray-400">
                      Přidejte první lokální soubor, API nebo statická data pomocí tlačítek výše.
                    </p>
                  </div>
                ) : (
                  formData.sources.map((src) => {
                    const isCurrentlyEditing = editingSource?.id === src.id && !isAddingSource;
                    return (
                      <div
                        key={src.id}
                        className={`p-3.5 rounded-xl border transition ${
                          isCurrentlyEditing
                            ? (src.type === 'static' ? 'bg-purple-950/20 border-purple-500/40 shadow-sm' : 'bg-white/[0.04] border-indigo-500/40 shadow-sm')
                            : src.enabled
                            ? 'bg-white/[0.02] border-white/10'
                            : 'bg-black/20 border-white/5 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`material-symbols-outlined p-2 rounded-lg shrink-0 text-xl ${
                              src.type === 'static'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-indigo-500/20 text-indigo-400'
                            }`}>
                              {src.type === 'file' ? 'description' : src.type === 'api' ? 'api' : 'data_object'}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-white">{src.name}</span>
                                <span className={`text-[11px] uppercase font-mono px-1.5 py-0.5 rounded ${
                                  src.type === 'static'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold'
                                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                                }`}>
                                  {src.type}
                                </span>
                                {src.type === 'api' && (src as ApiSource).authType === 'getToken' && (
                                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                                    getToken auth
                                  </span>
                                )}
                                {src.mapping && Object.keys(src.mapping).length > 0 && (
                                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300 border border-white/10" title="Vlastní mapování polí je aktivní">
                                    Mapováno
                                  </span>
                                )}
                              </div>
                              {src.type !== 'static' && (
                                <p className="text-[13px] text-gray-400 font-mono truncate max-w-md mt-0.5">
                                  {src.type === 'file' ? (src as FileSource).path : (src as ApiSource).url}
                                </p>
                              )}
                              {src.lastSync && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Poslední synchronizace: {src.lastSync} • {src.itemCount ?? 0} položek
                                </p>
                              )}
                              {src.error && (
                                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">error</span>
                                  {src.error}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {src.type === 'static' && (
                              <button
                                type="button"
                                onClick={() => handleExportStaticSource(src as StaticSource)}
                                title="Exportovat do JSON souboru (se sloučenými společnými parametry)"
                                className="w-8 h-8 rounded-lg border border-purple-500/25 bg-purple-500/10 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/40 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined !text-[16px]" style={{ fontSize: '16px' }}>
                                  download
                                </span>
                              </button>
                            )}
                            {src.type === 'api' && (src as ApiSource).url && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText((src as ApiSource).url);
                                  setCopiedSourceId(src.id);
                                  setTimeout(() => setCopiedSourceId(null), 2000);
                                }}
                                title={copiedSourceId === src.id ? 'Zkopírováno do schránky!' : 'Kopírovat URL adresu do schránky'}
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                  copiedSourceId === src.id
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                    : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-white'
                                }`}
                              >
                                <span className="material-symbols-outlined !text-[16px]" style={{ fontSize: '16px' }}>
                                  {copiedSourceId === src.id ? 'check' : 'content_copy'}
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleSource(src.id)}
                              onMouseEnter={() => setHoveredEyeId(src.id)}
                              onMouseLeave={() => setHoveredEyeId(null)}
                              title={src.enabled ? 'Aktivní (kliknutím vypnete)' : 'Vypnuto (kliknutím aktivujete)'}
                              className={`w-8 h-8 rounded-lg border transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer ${
                                (src.enabled && hoveredEyeId !== src.id) || (!src.enabled && hoveredEyeId === src.id)
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-500/50'
                                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25 hover:border-rose-500/50'
                              }`}
                            >
                              <span className="material-symbols-outlined !text-[16px]" style={{ fontSize: '16px' }}>
                                {(src.enabled && hoveredEyeId !== src.id) || (!src.enabled && hoveredEyeId === src.id)
                                  ? 'visibility'
                                  : 'visibility_off'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditSource(src)}
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                isCurrentlyEditing
                                  ? (src.type === 'static' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-indigo-600 border-indigo-500 text-white')
                                  : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20'
                              }`}
                              title={isCurrentlyEditing ? 'Zavřít úpravy' : 'Upravit'}
                            >
                              <span className="material-symbols-outlined !text-[16px]" style={{ fontSize: '16px' }}>edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSource(src.id)}
                              className="w-8 h-8 rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/40 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                              title="Smazat"
                            >
                              <span className="material-symbols-outlined !text-[16px]" style={{ fontSize: '16px' }}>delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline Edit Form */}
                        {isCurrentlyEditing && (
                          <div className="mt-3.5 pt-3.5 border-t border-white/10 animate-fade-in">
                            {src.type === 'static' ? renderStaticSourceForm(true) : renderSourceForm(true)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Database items count info footer with items viewer button */}
              <div className="pt-2 flex items-center justify-between text-xs text-gray-400 gap-4 flex-wrap">
                <span>
                  Celkem načteno: <strong className="text-white font-semibold text-[13px]">{totalIndexedCount}</strong> položek
                </span>

                <button
                  type="button"
                  onClick={() => setShowItemsViewer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium border border-indigo-500/40 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white rounded-lg transition cursor-pointer shrink-0 ml-auto"
                  title="Zobrazit kompletní prioritně řazený seznam všech indexovaných položek pro vyhledávání"
                >
                  <span className="material-symbols-outlined text-base text-indigo-400">format_list_bulleted</span>
                  <span>Kompletní seznam</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 ml-0.5 font-bold">
                    {totalIndexedCount}
                  </span>
                </button>
              </div>

              {/* External tools section header */}
              <div className="w-full pt-4 border-t border-white/10">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-indigo-400">handyman</span>
                  Externí nástroje
                </h3>
                <p className="text-[13px] text-gray-400 mt-1">
                  Doplňkové utility, katalogy a pomocné nástroje pro správu obsahu a vyhledávání.
                </p>
              </div>

              {/* Material Symbols Icons Download Card (aligned with Extensions cards style) */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between gap-4 transition hover:border-white/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                      <span className="material-symbols-outlined text-2xl">interests</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white tracking-wide">Katalog ikon Material Symbols</h3>
                        {formData.iconsLastDownloadedAt ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">
                            Aktualizováno
                          </span>
                        ) : (
                          <span className="text-[10px] bg-white/5 text-gray-400 border border-white/10 px-1.5 py-0.5 rounded font-medium">
                            Nestáhnuto
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Kompletní databáze ikon přímo z Google Fonts (3 900+ unikátních ikon s vyhledáváním a štítky) pro výběr ikon zdrojů, akcí i podpoložek.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadIcons}
                      disabled={isDownloadingIcons}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span className={`material-symbols-outlined text-sm ${isDownloadingIcons ? 'animate-spin' : ''}`}>
                        {isDownloadingIcons ? 'progress_activity' : 'cloud_download'}
                      </span>
                      <span>{isDownloadingIcons ? 'Stahuji...' : 'Stáhnout ikony'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-gray-500">schedule</span>
                    <span>Čas posledního stažení:</span>
                    <span className="font-medium text-gray-200">
                      {formData.iconsLastDownloadedAt ? formatLastSyncDate(formData.iconsLastDownloadedAt) : 'Zatím nestáhnuto'}
                    </span>
                  </div>
                  {typeof formData.iconsCount === 'number' && formData.iconsCount > 0 && (
                    <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                      {formData.iconsCount.toLocaleString('cs-CZ')} ikon uloženo v mezipaměti
                    </span>
                  )}
                </div>

                {downloadIconsResult && (
                  <div
                    className={`p-3 rounded-xl flex items-center gap-2 text-xs border ${
                      downloadIconsResult.ok
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {downloadIconsResult.ok ? 'check_circle' : 'error'}
                    </span>
                    <span>
                      {downloadIconsResult.ok
                        ? `Úspěšně staženo a uloženo ${downloadIconsResult.count?.toLocaleString('cs-CZ')} ikon z Google Fonts.`
                        : downloadIconsResult.error || 'Nastala chyba při stahování ikon.'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Extensions */}
          {activeTab === 'extensions' && (
            <div className="space-y-6 animate-fade-in max-w-4xl">
              <div>
                <h3 className="font-semibold text-white text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-indigo-400">extension</span>
                  Doplňková rozšíření a integrace
                </h3>
                <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                  Rozšíření umožňují propojit IADonkey s dalšími nástroji a firemními systémy. Vypnutím rozšíření se nesmaže vaše konfigurace, pouze se skryje záložka v levém menu a pozastaví se zobrazování výsledků ve vyhledávači.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* 1. MagicGate */}
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between gap-4 transition hover:border-white/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                        <span className="material-symbols-outlined text-2xl">security</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-wide">MagicGate (IS Tour)</h3>
                          {formData.magicgate?.username?.trim() || formData.magicgate?.xmlPath?.trim() ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">
                              Nakonfigurováno
                            </span>
                          ) : (
                            <span className="text-[10px] bg-white/5 text-gray-400 border border-white/10 px-1.5 py-0.5 rounded font-medium">
                              Nenakonfigurováno
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          Automatické a bezpečné tiché přihlašování do instancí IS Tour a načítání serverových konfigurací aplikací (Administrace, Web, API, BO) z deploy XML souboru.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.extensions?.magicgate ?? false}
                          onChange={(e) => {
                            const updated = {
                              ...formData,
                              extensions: {
                                ...formData.extensions,
                                magicgate: e.target.checked,
                                mlog: formData.extensions?.mlog ?? false,
                                github: formData.extensions?.github ?? false,
                              },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }}
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                      </label>
                    </div>
                  </div>
                  {formData.extensions?.magicgate && (
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Záložka je dostupná v levém menu</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('magicgate')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>Nastavení MagicGate</span>
                        <span className="material-symbols-outlined text-sm">navigate_next</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Taskmanager */}
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between gap-4 transition hover:border-white/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 text-sky-400">
                        <span className="material-symbols-outlined text-2xl">support_agent</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-wide">Taskmanager</h3>
                          {formData.mlog?.baseUrl?.trim() ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">
                              Nakonfigurováno
                            </span>
                          ) : (
                            <span className="text-[10px] bg-white/5 text-gray-400 border border-white/10 px-1.5 py-0.5 rounded font-medium">
                              Nenakonfigurováno
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          Rychlé rozpoznávání kódů úkolů a požadavků a jejich okamžité otevírání ve vašem firemním taskmanageru.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.extensions?.mlog ?? false}
                          onChange={(e) => {
                            const updated = {
                              ...formData,
                              extensions: {
                                ...formData.extensions,
                                magicgate: formData.extensions?.magicgate ?? false,
                                mlog: e.target.checked,
                                github: formData.extensions?.github ?? false,
                              },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }}
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500" />
                      </label>
                    </div>
                  </div>
                  {formData.extensions?.mlog && (
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Záložka je dostupná v levém menu</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('mlog')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>Nastavení Taskmanageru</span>
                        <span className="material-symbols-outlined text-sm">navigate_next</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. GitHub */}
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between gap-4 transition hover:border-white/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-2xl">folder_code</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-wide">GitHub repozitáře</h3>
                          {formData.github?.token?.trim() ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">
                              Nakonfigurováno
                            </span>
                          ) : (
                            <span className="text-[10px] bg-white/5 text-gray-400 border border-white/10 px-1.5 py-0.5 rounded font-medium">
                              Nenakonfigurováno
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          Automatická indexace a vyhledávání vašich osobních i firemních repozitářů na GitHubu s možností okamžitého zkopírování příkazu <code className="bg-white/10 px-1 rounded">git clone</code>.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.extensions?.github ?? false}
                          onChange={(e) => {
                            const updated = {
                              ...formData,
                              extensions: {
                                ...formData.extensions,
                                magicgate: formData.extensions?.magicgate ?? false,
                                mlog: formData.extensions?.mlog ?? false,
                                github: e.target.checked,
                              },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }}
                        />
                        <div
                          className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"
                        />
                      </label>
                    </div>
                  </div>
                  {formData.extensions?.github && (
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Záložka je dostupná v levém menu</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('github')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition flex items-center gap-1 cursor-pointer hover:opacity-90"
                      >
                        <span>Nastavení GitHub</span>
                        <span className="material-symbols-outlined text-sm">navigate_next</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. VS Code */}
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between gap-4 transition hover:border-white/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
                        <span className="material-symbols-outlined text-2xl">code</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-wide">Visual Studio Code (VS Code)</h3>
                          {formData.vscode?.path?.trim() ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">
                              Nakonfigurováno
                            </span>
                          ) : (
                            <span className="text-[10px] bg-white/5 text-gray-400 border border-white/10 px-1.5 py-0.5 rounded font-medium">
                              Výchozí instalace
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          Okamžité otevírání lokálně naklonovaných repozitářů a projektových složek přímo v editoru Visual Studio Code ze seznamu akcí.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.extensions?.vscode ?? false}
                          onChange={(e) => {
                            const updated = {
                              ...formData,
                              extensions: {
                                ...formData.extensions,
                                magicgate: formData.extensions?.magicgate ?? false,
                                mlog: formData.extensions?.mlog ?? false,
                                github: formData.extensions?.github ?? false,
                                vscode: e.target.checked,
                                androidStudio: formData.extensions?.androidStudio ?? false,
                              },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }}
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500" />
                      </label>
                    </div>
                  </div>
                  {formData.extensions?.vscode && (
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Záložka je dostupná v levém menu</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('vscode')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>Nastavení VS Code</span>
                        <span className="material-symbols-outlined text-sm">navigate_next</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. Android Studio */}
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between gap-4 transition hover:border-white/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0 text-pink-400">
                        <span className="material-symbols-outlined text-2xl">android</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-wide">Android Studio</h3>
                          {formData.androidStudio?.path?.trim() ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">
                              Nakonfigurováno
                            </span>
                          ) : (
                            <span className="text-[10px] bg-white/5 text-gray-400 border border-white/10 px-1.5 py-0.5 rounded font-medium">
                              Výchozí instalace
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          Okamžité otevírání lokálně naklonovaných mobilních repozitářů a Kotlin/Java projektů přímo v prostředí Android Studio ze seznamu akcí.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.extensions?.androidStudio ?? false}
                          onChange={(e) => {
                            const updated = {
                              ...formData,
                              extensions: {
                                ...formData.extensions,
                                magicgate: formData.extensions?.magicgate ?? false,
                                mlog: formData.extensions?.mlog ?? false,
                                github: formData.extensions?.github ?? false,
                                vscode: formData.extensions?.vscode ?? false,
                                androidStudio: e.target.checked,
                              },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }}
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500" />
                      </label>
                    </div>
                  </div>
                  {formData.extensions?.androidStudio && (
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Záložka je dostupná v levém menu</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('android-studio')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>Nastavení Android Studio</span>
                        <span className="material-symbols-outlined text-sm">navigate_next</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. DonkeyTools */}
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between gap-4 transition hover:border-white/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-400">
                        <span className="material-symbols-outlined text-2xl">construction</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-wide">DonkeyTools</h3>
                          {formData.extensions?.donkeyTools && formData.donkeyTools?.colorMaster?.enabled !== false ? (
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-medium">
                              ColorMaster aktivní
                            </span>
                          ) : (
                            <span className="text-[10px] bg-white/5 text-gray-400 border border-white/10 px-1.5 py-0.5 rounded font-medium">
                              {formData.extensions?.donkeyTools ? 'Nástroje vypnuty' : 'Vypnuto'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          Sada vestavěných systémových nástrojů a utilit – ColorMaster pro rozpoznávání barev (#HEX, RGB, HSL), převody formátů, systémové kapátko s lupou a budoucí nástroje vyvolatelné zkratkou nebo lomítkem (/).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.extensions?.donkeyTools ?? false}
                          onChange={(e) => {
                            const updated = {
                              ...formData,
                              extensions: {
                                ...formData.extensions,
                                magicgate: formData.extensions?.magicgate ?? false,
                                mlog: formData.extensions?.mlog ?? false,
                                github: formData.extensions?.github ?? false,
                                vscode: formData.extensions?.vscode ?? false,
                                androidStudio: formData.extensions?.androidStudio ?? false,
                                donkeyTools: e.target.checked,
                              },
                              donkeyTools: formData.donkeyTools || {
                                colorMaster: {
                                  enabled: true,
                                  hotkey: '',
                                  defaultFormat: 'hex',
                                },
                              },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }}
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600" />
                      </label>
                    </div>
                  </div>
                  {formData.extensions?.donkeyTools && (
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Záložka je dostupná v levém menu</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('donkey-tools')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>Nastavení DonkeyTools</span>
                        <span className="material-symbols-outlined text-sm">navigate_next</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MagicGate Credentials */}
          {activeTab === 'magicgate' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-amber-400">security</span>
                  Přihlašovací údaje MagicGate
                </h3>
                <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                  Nastavení přihlašovacích údajů pro automatické přihlašování do instancí IS Tour (položky s parametrem <code className="bg-white/10 px-1 rounded text-amber-300">settings: "magicgate"</code>). Zadané přihlašovací údaje jsou bezpečně uloženy v lokální konfiguraci.
                </p>
              </div>

              <div className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-1.5">MagicGate Uživatelské jméno</label>
                  <input
                    type="text"
                    value={formData.magicgate?.username || ''}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        magicgate: { ...formData.magicgate, username: e.target.value },
                      };
                      setFormData(updated);
                      handleSave(updated);
                    }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="Uživatelské jméno pro MagicGate"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-1.5">MagicGate Heslo</label>
                  <input
                    type="password"
                    value={formData.magicgate?.password || ''}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        magicgate: { ...formData.magicgate, password: e.target.value },
                      };
                      setFormData(updated);
                      handleSave(updated);
                    }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {/* MagicGate XML Deployment Config */}
              <div className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <div>
                  <h4 className="font-semibold text-sm text-white flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-lg text-amber-400">code_blocks</span>
                    Konfigurační XML soubor instancí (Deploy Config)
                  </h4>
                  <p className="text-[13px] text-gray-400 mb-3 leading-relaxed">
                    Vyberte XML soubor s definicí serverů a instancí. IADonkey z něj automaticky vyextrahuje jednotlivé instance
                    jako hlavní položky s akcí MagicGate a jejich dílčí aplikace (Administrace, Web, API, BO) jako podpoložky s faviconou.
                    Servery a instance s označením <span className="font-mono text-amber-300">Bench</span> jsou automaticky vynechány.
                  </p>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-1.5">Cesta k XML souboru</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.magicgate?.xmlPath || ''}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          magicgate: { ...formData.magicgate, xmlPath: e.target.value },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      className="h-[38px] flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none font-mono"
                      placeholder="C:\deploy\DeployConfig.xml"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.electronAPI?.selectXmlFile) {
                          const selected = await window.electronAPI.selectXmlFile(formData.magicgate?.xmlPath);
                          if (selected) {
                            const updated = {
                              ...formData,
                              magicgate: { ...formData.magicgate, xmlPath: selected },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }
                        }
                      }}
                      className="h-[38px] px-3.5 border border-amber-500/40 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-white rounded-lg text-[13px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">folder_open</span>
                      Procházet...
                    </button>
                    {formData.magicgate?.xmlPath && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...formData,
                            magicgate: { ...formData.magicgate, xmlPath: '' },
                          };
                          setFormData(updated);
                          handleSave(updated);
                        }}
                        className="w-[38px] h-[38px] flex items-center justify-center text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition cursor-pointer shrink-0"
                        title="Vymazat cestu"
                      >
                        <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 mt-1.5 block">
                    Změna cesty k XML souboru automaticky spustí synchronizaci položek launcheru.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB Taskmanager */}
          {activeTab === 'mlog' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-sky-400">support_agent</span>
                  Propojení s Taskmanagerem
                </h3>
                <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                  Nastavte základní webovou adresu (Base URL) vašeho firemního taskmanageru a volitelné prefixy pro úkoly a požadavky. Po nastavení můžete ve vyhledávači
                  zadat kód (např. <strong className="font-mono text-sky-300">{(formData.mlog?.taskPrefix || 'T').toUpperCase()}7821</strong>, <strong className="font-mono text-sky-300">{(formData.mlog?.requestPrefix || 'R').toUpperCase()}2345</strong>) nebo
                  přímo číslo od 3 číslic pro rychlé otevření v prohlížeči.
                </p>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                    Základní webová adresa Taskmanageru (Base URL)
                  </label>
                  <input
                    type="url"
                    value={formData.mlog?.baseUrl || ''}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        mlog: { ...formData.mlog, baseUrl: e.target.value },
                      };
                      setFormData(updated);
                      handleSave(updated);
                    }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 outline-none font-mono"
                    placeholder="https://www.company.com/tasks"
                  />
                  <span className="text-xs text-gray-400 mt-1.5 block">
                    Zadejte adresu včetně protokolu (např. https://www.company.com/tasks). Pokud pole necháte prázdné, detekce je vypnutá.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                      Prefix pro Úkol
                    </label>
                    <input
                      type="text"
                      value={formData.mlog?.taskPrefix ?? 'T'}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          mlog: {
                            baseUrl: formData.mlog?.baseUrl || '',
                            requestPrefix: formData.mlog?.requestPrefix ?? 'R',
                            ...formData.mlog,
                            taskPrefix: e.target.value,
                          },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 outline-none font-mono uppercase"
                      placeholder="T"
                    />
                    <span className="text-xs text-gray-400 mt-1.5 block">
                      Výchozí: <code className="font-mono text-gray-300">T</code> (např. {(formData.mlog?.taskPrefix || 'T').toUpperCase()}7821).
                    </span>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                      Prefix pro Požadavek
                    </label>
                    <input
                      type="text"
                      value={formData.mlog?.requestPrefix ?? 'R'}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          mlog: {
                            baseUrl: formData.mlog?.baseUrl || '',
                            taskPrefix: formData.mlog?.taskPrefix ?? 'T',
                            ...formData.mlog,
                            requestPrefix: e.target.value,
                          },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 outline-none font-mono uppercase"
                      placeholder="R"
                    />
                    <span className="text-xs text-gray-400 mt-1.5 block">
                      Výchozí: <code className="font-mono text-gray-300">R</code> (např. {(formData.mlog?.requestPrefix || 'R').toUpperCase()}2345).
                    </span>
                  </div>
                </div>

                {formData.mlog?.baseUrl?.trim() ? (
                  <div className="p-3.5 bg-sky-950/30 border border-sky-500/20 rounded-lg text-[13px] space-y-2">
                    <p className="font-semibold text-sky-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      Detekce je aktivní pro následující vzory:
                    </p>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 pl-1">
                      <li>
                        Zadání <code className="text-white font-mono bg-black/30 px-1 py-0.5 rounded">{(formData.mlog.taskPrefix || 'T').toUpperCase()}7821</code> otevře{' '}
                        <span className="font-mono text-sky-300">
                          {formData.mlog.baseUrl.trim().replace(/\/+$/, '')}/{(formData.mlog.taskPrefix || 'T').toUpperCase()}7821
                        </span>
                      </li>
                      <li>
                        Zadání <code className="text-white font-mono bg-black/30 px-1 py-0.5 rounded">{(formData.mlog.requestPrefix || 'R').toUpperCase()}2345</code> otevře{' '}
                        <span className="font-mono text-sky-300">
                          {formData.mlog.baseUrl.trim().replace(/\/+$/, '')}/{(formData.mlog.requestPrefix || 'R').toUpperCase()}2345
                        </span>
                      </li>
                      <li>
                        Zadání samotného čísla od 3 číslic (např. <code className="text-white font-mono bg-black/30 px-1 py-0.5 rounded">123</code>) nabídne ve Spotlightu obě varianty ({' '}
                        <span className="font-mono text-sky-300">{(formData.mlog.taskPrefix || 'T').toUpperCase()}123</span> i{' '}
                        <span className="font-mono text-sky-300">{(formData.mlog.requestPrefix || 'R').toUpperCase()}123</span>).
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-gray-400">
                    Detekce je v tuto chvíli vypnutá. Pro její aktivaci vyplňte webovou adresu Taskmanageru výše.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: GitHub */}
          {activeTab === 'github' && (
            <div className="space-y-6 animate-fade-in max-w-2xl">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-emerald-400">
                    folder_code
                  </span>
                  Přihlašovací údaje k profilu GitHub
                </h3>
                <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                  Zadejte Personal Access Token (PAT). Launcher automaticky načte vaše osobní i firemní repozitáře, umožní v nich bleskově vyhledávat a kopírovat příkazy pro klonování.
                </p>
              </div>

              {/* Box 1: Credentials */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-white flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-lg text-emerald-400">
                      key
                    </span>
                    Přihlašovací údaje (PAT)
                  </h4>
                  <p className="text-[13px] text-gray-400 leading-relaxed">
                    Zadejte vaše uživatelské jméno a Personal Access Token pro přístup k vašim repozitářům.
                  </p>
                </div>

                {/* Username field */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                    Uživatelské jméno (Username) <span className="text-gray-500 font-normal text-xs">(osobní profil)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.github?.username || ''}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        github: {
                          ...formData.github,
                          username: e.target.value,
                          token: formData.github?.token || '',
                          org: formData.github?.org || '',
                          apiUrl: formData.github?.apiUrl || 'https://api.github.com',
                          defaultCloneDir: formData.github?.defaultCloneDir || '',
                        },
                      };
                      setFormData(updated);
                      handleSave(updated);
                    }}
                    placeholder="např. petrkulhanek"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Vaše osobní uživatelské jméno na GitHubu.
                  </p>
                </div>

                {/* Token field */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                    Personal Access Token (PAT) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showGitHubToken ? 'text' : 'password'}
                      value={formData.github?.token || ''}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          github: {
                            ...formData.github,
                            username: formData.github?.username || '',
                            token: e.target.value,
                            org: formData.github?.org || '',
                            apiUrl: formData.github?.apiUrl || 'https://api.github.com',
                            defaultCloneDir: formData.github?.defaultCloneDir || '',
                          },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      placeholder="ghp_... nebo github_pat_..."
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGitHubToken(!showGitHubToken)}
                      className="absolute right-3 text-gray-400 hover:text-gray-200 transition cursor-pointer"
                      title={showGitHubToken ? 'Skrýt token' : 'Zobrazit token'}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showGitHubToken ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Token můžete vygenerovat v{' '}
                    <button
                      type="button"
                      onClick={() => window.electronAPI?.openExternal?.('https://github.com/settings/tokens')}
                      className="text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-0.5"
                    >
                      GitHub Settings &rarr; Personal access tokens
                      <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                    </button>
                    . Pro soukromé repozitáře zaškrtněte rozsah <code className="bg-white/10 px-1 rounded font-mono text-emerald-300">repo</code> a pro organizace <code className="bg-white/10 px-1 rounded font-mono text-emerald-300">read:org</code>.
                  </p>
                </div>
              </div>

              {/* Box 2: Organization */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-white flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-lg text-emerald-400">
                      corporate_fare
                    </span>
                    Organizace / Společnost <span className="text-gray-500 font-normal text-xs">(volitelné)</span>
                  </h4>
                  <p className="text-[13px] text-gray-400 mb-3 leading-relaxed">
                    Pokud pole necháte prázdné, repozitáře se automaticky načtou ze všech vašich organizací i osobního profilu.
                  </p>
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.github?.org || ''}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        github: {
                          ...formData.github,
                          username: formData.github?.username || '',
                          token: formData.github?.token || '',
                          org: e.target.value,
                          apiUrl: formData.github?.apiUrl || 'https://api.github.com',
                          defaultCloneDir: formData.github?.defaultCloneDir || '',
                        },
                      };
                      setFormData(updated);
                      handleSave(updated);
                    }}
                    placeholder="např. company-org"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Box 3: Custom API URL */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-white flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-lg text-emerald-400">
                      cloud
                    </span>
                    GitHub API URL <span className="text-gray-500 font-normal text-xs">(volitelné)</span>
                  </h4>
                  <p className="text-[13px] text-gray-400 mb-3 leading-relaxed">
                    Výchozí je <code className="bg-white/10 px-1 rounded text-gray-300">https://api.github.com</code>. Vyplňte pouze při použití vlastního GitHub Enterprise Serveru.
                  </p>
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.github?.apiUrl || ''}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        github: {
                          ...formData.github,
                          username: formData.github?.username || '',
                          token: formData.github?.token || '',
                          org: formData.github?.org || '',
                          apiUrl: e.target.value,
                          defaultCloneDir: formData.github?.defaultCloneDir || '',
                        },
                      };
                      setFormData(updated);
                      handleSave(updated);
                    }}
                    placeholder="https://api.github.com"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Box 4: Default Clone Directory */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-white flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-lg text-emerald-400">
                      folder_open
                    </span>
                    Výchozí složka pro klonování repozitářů <span className="text-gray-500 font-normal text-xs">(volitelné)</span>
                  </h4>
                  <p className="text-[13px] text-gray-400 mb-3 leading-relaxed">
                    Pokud je nastavena, dialog pro stažení repozitáře (akce Klonovat repozitář na <kbd className="bg-white/10 px-1 rounded font-mono text-[10px]">Shift+Enter</kbd>) ji automaticky předvyplní jako cílové umístění.
                  </p>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-1.5">Cesta k cílové složce</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.github?.defaultCloneDir || ''}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          github: {
                            ...formData.github,
                            username: formData.github?.username || '',
                            token: formData.github?.token || '',
                            org: formData.github?.org || '',
                            apiUrl: formData.github?.apiUrl || 'https://api.github.com',
                            defaultCloneDir: e.target.value,
                          },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      placeholder="např. C:\Projekty nebo D:\Git"
                      className="h-[38px] flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.electronAPI?.selectDirectory) {
                          const dir = await window.electronAPI.selectDirectory(formData.github?.defaultCloneDir);
                          if (dir) {
                            const updated = {
                              ...formData,
                              github: {
                                ...formData.github,
                                username: formData.github?.username || '',
                                token: formData.github?.token || '',
                                org: formData.github?.org || '',
                                apiUrl: formData.github?.apiUrl || 'https://api.github.com',
                                defaultCloneDir: dir,
                              },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }
                        }
                      }}
                      className="h-[38px] px-3.5 border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 rounded-lg text-[13px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">folder_open</span>
                      Procházet...
                    </button>
                    {formData.github?.defaultCloneDir && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...formData,
                            github: {
                              ...formData.github,
                              username: formData.github?.username || '',
                              token: formData.github?.token || '',
                              org: formData.github?.org || '',
                              apiUrl: formData.github?.apiUrl || 'https://api.github.com',
                              defaultCloneDir: '',
                            },
                          };
                          setFormData(updated);
                          handleSave(updated);
                        }}
                        className="w-[38px] h-[38px] flex items-center justify-center text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition cursor-pointer shrink-0"
                        title="Vymazat cestu"
                      >
                        <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Test connection button & results (outside/below boxes) */}
              <div className="pt-2 flex flex-col gap-3">
                {/* Result card or placeholder (above test button) */}
                {gitHubTestResult ? (
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed animate-fade-in ${
                      gitHubTestResult.ok
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                    }`}
                  >
                    {gitHubTestResult.ok ? (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {gitHubTestResult.user?.avatar_url ? (
                            <img
                              src={gitHubTestResult.user.avatar_url}
                              alt={gitHubTestResult.user.login}
                              className="w-10 h-10 rounded-full border border-emerald-500/30 shrink-0 self-center"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-2xl text-emerald-400 shrink-0 self-center">check_circle</span>
                          )}
                          <div className="min-w-0 space-y-0.5">
                            <div className="font-semibold text-emerald-200 text-[13px]">
                              Připojení k GitHubu bylo úspěšné!
                            </div>
                            <div className="text-gray-300 flex items-center gap-1.5 flex-wrap">
                              <span>Přihlášený profil:</span>
                              <span className="font-mono font-medium text-emerald-300">
                                @{gitHubTestResult.user?.login}
                              </span>
                              {gitHubTestResult.user?.name && (
                                <span className="text-gray-400">({gitHubTestResult.user.name})</span>
                              )}
                              {gitHubTestResult.orgs && gitHubTestResult.orgs.length > 0 && (
                                <div className="inline-flex items-center gap-1 ml-1 flex-wrap">
                                  {gitHubTestResult.orgs.map((org) => (
                                    <span
                                      key={org}
                                      className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-mono text-[10px] leading-none"
                                      title={`Organizace: ${org}`}
                                    >
                                      {org}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Celkový počet repozitářů vpravo svisle vycentrovaný */}
                        <div className="shrink-0 flex flex-col items-center justify-center pl-4 border-l border-emerald-500/20 min-w-[75px]">
                          <span className="text-2xl font-bold font-mono text-emerald-200 leading-none">
                            {gitHubTestResult.repoCount ?? 0}
                          </span>
                          <span className="text-[11px] text-emerald-400/80 mt-1 leading-none font-medium">
                            repozitářů
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl text-rose-400 shrink-0 self-center">error</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-rose-200 text-[13px]">Připojení se nezdařilo</div>
                          <div className="text-rose-300/80 mt-0.5">{gitHubTestResult.error}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.01] p-3.5 flex items-center justify-between gap-3 text-xs text-gray-400 select-none flex-wrap">
                    <span>Ověřte platnost zadaného PAT tokenu a dostupnost GitHub API</span>
                    <button
                      type="button"
                      disabled={!formData.github?.token?.trim() || isTestingGitHub}
                      onClick={handleTestGitHub}
                      className={`px-4 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition cursor-pointer shrink-0 ${
                        !formData.github?.token?.trim() || isTestingGitHub
                          ? 'bg-white/5 border-white/5 text-gray-500 cursor-not-allowed'
                          : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                      }`}
                    >
                      {isTestingGitHub ? (
                        <>
                          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          <span>Testuji připojení...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">wifi_tethering</span>
                          <span>Otestovat připojení</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {gitHubTestResult && (
                  <button
                    type="button"
                    disabled={!formData.github?.token?.trim() || isTestingGitHub}
                    onClick={handleTestGitHub}
                    className={`px-4 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition cursor-pointer w-fit ${
                      !formData.github?.token?.trim() || isTestingGitHub
                        ? 'bg-white/5 border-white/5 text-gray-500 cursor-not-allowed'
                        : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                    }`}
                  >
                    {isTestingGitHub ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        <span>Testuji připojení...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">wifi_tethering</span>
                        <span>Otestovat připojení znovu</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB: Visual Studio Code */}
          {activeTab === 'vscode' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-cyan-400">code</span>
                  Visual Studio Code (VS Code)
                </h3>
                <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                  Konfigurace editoru Visual Studio Code pro rychlé otevírání naklonovaných repozitářů a projektových složek přímo z akcí vyhledávače nebo z modálního okna klonování.
                </p>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                    Cesta ke spustitelnému souboru VS Code (Code.exe / code.cmd)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.vscode?.path || ''}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          vscode: { ...formData.vscode, path: e.target.value },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      className="h-[38px] flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none font-mono"
                      placeholder="Automatická detekce (např. C:\Users\...\Code.exe)"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.electronAPI?.selectVscodePath) {
                          const selected = await window.electronAPI.selectVscodePath(formData.vscode?.path);
                          if (selected) {
                            const updated = {
                              ...formData,
                              vscode: { ...formData.vscode, path: selected },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }
                        }
                      }}
                      className="h-[38px] px-3.5 border border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white rounded-lg text-[13px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">folder_open</span>
                      <span>Procházet...</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.electronAPI?.detectVscodePath) {
                          const detected = await window.electronAPI.detectVscodePath();
                          if (detected) {
                            const updated = {
                              ...formData,
                              vscode: { ...formData.vscode, path: detected },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }
                        }
                      }}
                      className="w-[38px] h-[38px] flex items-center justify-center border border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white rounded-lg transition cursor-pointer shrink-0"
                      title="Automaticky detekovat (prohledat standardní instalační složky a PATH)"
                    >
                      <span className="material-symbols-outlined text-[18px] leading-none">auto_awesome</span>
                    </button>
                    {formData.vscode?.path && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...formData,
                            vscode: { ...formData.vscode, path: '' },
                          };
                          setFormData(updated);
                          handleSave(updated);
                        }}
                        className="w-[38px] h-[38px] flex items-center justify-center text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition cursor-pointer shrink-0"
                        title="Vymazat cestu (použije se automatická detekce)"
                      >
                        <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 mt-2 block leading-relaxed">
                    Pokud necháte pole prázdné, aplikace zkusí VS Code automaticky nalézt ve standardních složkách uživatele nebo v systémovém příkazu <code className="bg-white/10 px-1 rounded text-cyan-300 font-mono">code</code>.
                  </span>
                </div>

                <div className="p-3.5 bg-cyan-950/30 border border-cyan-500/25 rounded-xl text-xs text-cyan-200/90 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-base text-cyan-400 shrink-0 mt-0.5">info</span>
                  <div className="space-y-1">
                    <div className="font-semibold text-white">Jak to funguje ve vyhledávači:</div>
                    <p className="text-gray-300 leading-relaxed">
                      Když u repozitáře ve Spotlight vyhledávači stisknete <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/15 rounded text-[10px] font-mono text-white">Shift+Enter</kbd> a repozitář již existuje ve vaší cílové složce, zobrazí se na prvním místě akce <strong>Otevřít ve VS Code</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Android Studio */}
          {activeTab === 'android-studio' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-pink-400">android</span>
                  Android Studio
                </h3>
                <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                  Konfigurace vývojového prostředí Android Studio pro rychlé otevírání mobilních a Kotlin/Java projektů přímo z akcí vyhledávače nebo z modálního okna klonování.
                </p>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                    Cesta ke spustitelnému souboru Android Studio (studio64.exe / studio.bat)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.androidStudio?.path || ''}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          androidStudio: { ...formData.androidStudio, path: e.target.value },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      className="h-[38px] flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-pink-500 outline-none font-mono"
                      placeholder="Automatická detekce (např. C:\Program Files\Android\Android Studio\bin\studio64.exe)"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.electronAPI?.selectAndroidStudioPath) {
                          const selected = await window.electronAPI.selectAndroidStudioPath(formData.androidStudio?.path);
                          if (selected) {
                            const updated = {
                              ...formData,
                              androidStudio: { ...formData.androidStudio, path: selected },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }
                        }
                      }}
                      className="h-[38px] px-3.5 border border-pink-500/40 hover:border-pink-400 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 hover:text-white rounded-lg text-[13px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">folder_open</span>
                      <span>Procházet...</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.electronAPI?.detectAndroidStudioPath) {
                          const detected = await window.electronAPI.detectAndroidStudioPath();
                          if (detected) {
                            const updated = {
                              ...formData,
                              androidStudio: { ...formData.androidStudio, path: detected },
                            };
                            setFormData(updated);
                            handleSave(updated);
                          }
                        }
                      }}
                      className="w-[38px] h-[38px] flex items-center justify-center border border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white rounded-lg transition cursor-pointer shrink-0"
                      title="Automaticky detekovat (prohledat standardní instalační složky Android Studia a JetBrains Toolbox)"
                    >
                      <span className="material-symbols-outlined text-[18px] leading-none">auto_awesome</span>
                    </button>
                    {formData.androidStudio?.path && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...formData,
                            androidStudio: { ...formData.androidStudio, path: '' },
                          };
                          setFormData(updated);
                          handleSave(updated);
                        }}
                        className="w-[38px] h-[38px] flex items-center justify-center text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition cursor-pointer shrink-0"
                        title="Vymazat cestu (použije se automatická detekce)"
                      >
                        <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 mt-2 block leading-relaxed">
                    Pokud necháte pole prázdné, aplikace zkusí Android Studio automaticky nalézt ve složce <code className="bg-white/10 px-1 rounded text-pink-300 font-mono">Program Files\Android\Android Studio</code>, v JetBrains Toolboxu nebo v systémovém příkazu <code className="bg-white/10 px-1 rounded text-pink-300 font-mono">studio64.exe</code>.
                  </span>
                </div>

                <div className="p-3.5 bg-pink-950/30 border border-pink-500/25 rounded-xl text-xs text-pink-200/90 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-base text-pink-400 shrink-0 mt-0.5">info</span>
                  <div className="space-y-1">
                    <div className="font-semibold text-white">Kdy se Android Studio nabízí:</div>
                    <p className="text-gray-300 leading-relaxed">
                      Aplikace se nabízí, pokud repozitář z GitHubu používá <strong>Kotlin</strong> nebo <strong>Java</strong>. Pro webové projekty a instance MagicGate se vždy nabízí VS Code (nabízí se buď VS Code, nebo Android Studio, nikdy obojí současně).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DonkeyTools */}
          {activeTab === 'donkey-tools' && (
            <div className="space-y-6 animate-fade-in max-w-4xl">
              <div>
                <h3 className="font-semibold text-white text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-rose-400">construction</span>
                  DonkeyTools – Systémové nástroje a utility
                </h3>
                <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                  Konfigurace vestavěných produktivních nástrojů pro práci s barvami, měřením a systémovými akcemi. Všechny nástroje lze rychle vyvolat ve vyhledávači pomocí prefixu <code className="bg-white/10 px-1.5 py-0.5 rounded text-rose-300 font-mono">/</code> (např. <code className="bg-white/10 px-1 rounded font-mono">/kapatko</code>).
                </p>
              </div>

              {/* SECTION 1: ColorMaster */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-4 transition hover:border-white/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-400">
                      <span className="material-symbols-outlined text-2xl">palette</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-wide">ColorMaster</h4>
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-medium">
                          Nástroj na barvy
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Chytré rozpoznávání barevných kódů (#HEX, RGB, HSL) přímo ve Spotlight vyhledávači s okamžitým náhledem barvy a převodem formátů. Obsahuje systémové kapátko s lupou pro nabrání barvy z kteréhokoliv pixelu obrazovky.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.donkeyTools?.colorMaster?.enabled ?? true}
                        onChange={(e) => {
                          const updated = {
                            ...formData,
                            donkeyTools: {
                              ...formData.donkeyTools,
                              colorMaster: {
                                enabled: e.target.checked,
                                hotkey: formData.donkeyTools?.colorMaster?.hotkey || '',
                                defaultFormat: formData.donkeyTools?.colorMaster?.defaultFormat || 'hex',
                              },
                            },
                          };
                          setFormData(updated);
                          handleSave(updated);
                        }}
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600" />
                    </label>
                  </div>
                </div>

                {/* Sub-settings when ColorMaster is enabled */}
                {(formData.donkeyTools?.colorMaster?.enabled ?? true) && (
                  <div className="pt-4 border-t border-white/5 space-y-4">
                    {/* Hotkey configuration & Eyedropper test */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-300">
                        Globální klávesová zkratka pro kapátko (volitelné)
                      </label>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="relative">
                            <input
                              type="text"
                              readOnly
                              value={
                                isRecordingColorMasterHotkey
                                  ? (colorMasterRecordedModifiers.length > 0
                                      ? colorMasterRecordedModifiers.join(' + ')
                                      : 'Stiskněte klávesy...')
                                  : formData.donkeyTools?.colorMaster?.hotkey || ''
                              }
                              onFocus={handleColorMasterHotkeyFocus}
                              onBlur={handleColorMasterHotkeyBlur}
                              onKeyDown={handleColorMasterHotkeyKeyDown}
                              onKeyUp={handleColorMasterHotkeyKeyUp}
                              className={`w-64 border rounded-xl px-3 py-2.5 text-sm font-mono cursor-pointer transition outline-none select-none text-center font-semibold ${
                                colorMasterHotkeyError
                                  ? 'bg-rose-950/30 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                                  : isRecordingColorMasterHotkey
                                  ? 'bg-rose-950/60 border-rose-400 ring-2 ring-rose-500/50 text-rose-200'
                                  : 'bg-black/30 border-white/10 text-white hover:border-white/20'
                              }`}
                              placeholder="Klikněte pro nastavení zkratky"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const picked = await pickScreenColor();
                                if (picked) {
                                  const parsed = parseColorQuery(picked);
                                  const fmt = formData.donkeyTools?.colorMaster?.defaultFormat || 'hex';
                                  const formatted = parsed ? formatColorValue(parsed, fmt) : picked;
                                  if (window.electronAPI) {
                                    await window.electronAPI.executeAction({
                                      action: 'copy',
                                      location: formatted,
                                    });
                                  } else {
                                    await navigator.clipboard.writeText(formatted);
                                  }
                                }
                              } catch (err) {
                                console.error('Test eyedropper error:', err);
                              }
                            }}
                            className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            title="Otevře systémové kapátko s lupou pro vyzkoušení"
                          >
                            <span className="material-symbols-outlined text-base">colorize</span>
                            <span>Vyzkoušet kapátko</span>
                          </button>
                        </div>

                        {colorMasterHotkeyError && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold animate-fade-in">
                            <span className="material-symbols-outlined text-sm">error</span>
                            <span>{colorMasterHotkeyError}</span>
                          </div>
                        )}

                        <span className="text-[12px] text-gray-400">
                          {isRecordingColorMasterHotkey ? (
                            <span className="text-rose-400 font-medium animate-pulse">
                              Stiskněte klávesovou kombinaci (např. Shift+Alt+C). Esc zruší, Backspace zkratku odstraní.
                            </span>
                          ) : (
                            <span>Klikněte do pole a stiskněte kombinaci kláves (např. Shift+Alt+C). Zkratka nesmí kolidovat se zkratkou launcheru ani s rezervovanými klávesami. Backspace zkratku vymaže.</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Default format selector */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <label className="block text-xs font-semibold text-gray-300">
                        Výchozí formát pro zkopírování do schránky
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { id: 'hex', label: 'HEX (#RRGGBB)', example: '#2563EB' },
                          { id: 'hex-no-hash', label: 'HEX bez #', example: '2563EB' },
                          { id: 'rgb', label: 'RGB', example: 'rgb(37, 99, 235)' },
                          { id: 'rgba', label: 'RGBA', example: 'rgba(37, 99, 235, 1)' },
                          { id: 'hsl', label: 'HSL', example: 'hsl(221, 83%, 53%)' },
                        ].map((fmt) => {
                          const isSelected = (formData.donkeyTools?.colorMaster?.defaultFormat || 'hex') === fmt.id;
                          return (
                            <button
                              key={fmt.id}
                              type="button"
                              onClick={() => {
                                const updated = {
                                  ...formData,
                                  donkeyTools: {
                                    ...formData.donkeyTools,
                                    colorMaster: {
                                      enabled: formData.donkeyTools?.colorMaster?.enabled ?? true,
                                      hotkey: formData.donkeyTools?.colorMaster?.hotkey || '',
                                      defaultFormat: fmt.id as any,
                                    },
                                  },
                                };
                                setFormData(updated);
                                handleSave(updated);
                              }}
                              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                                isSelected
                                  ? 'bg-rose-500/15 border-rose-500/40 text-white shadow-sm'
                                  : 'bg-white/[0.02] border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                              }`}
                            >
                              <span className="text-xs font-semibold">{fmt.label}</span>
                              <span className="font-mono text-[10px] text-gray-400 truncate">{fmt.example}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Usage examples banner */}
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1 text-[11px] text-gray-400">
                      <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">info</span>
                        Jak ColorMaster používat ve vyhledávači
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-gray-400 pl-1">
                        <li>Zadejte <code className="bg-white/10 px-1 rounded text-white font-mono">/kapatko</code> pro spuštění kapátka přímo z launcheru.</li>
                        <li>Zadejte kód barvy (např. <code className="bg-white/10 px-1 rounded text-white font-mono">#ff8800</code>, <code className="bg-white/10 px-1 rounded text-white font-mono">rgb(255, 128, 0)</code> nebo <code className="bg-white/10 px-1 rounded text-white font-mono">hsl(32, 100%, 50%)</code>) – vyhledávač okamžitě zobrazí živý barevný vzorník a převody formátů.</li>
                        <li>Stiskem <kbd className="bg-white/10 px-1 rounded font-mono text-[10px]">Shift+Enter</kbd> na barvě otevřete akce: kopírování jednotlivých formátů nebo přímé nastavení barvy jako motivu IADonkey!</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* SUB-EXTENSION 2: FastSnap */}
              <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                      <span className="material-symbols-outlined text-2xl">crop</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-wide">FastSnap</h4>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-medium">
                          Výstřižky obrazovky
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Rychlé pořízení výstřižku libovolné oblasti obrazovky. Snímek se automaticky uloží do vybrané složky a současně vloží do systémové schránky pro okamžité vložení (Ctrl+V).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.donkeyTools?.fastSnap?.enabled ?? true}
                        onChange={(e) => {
                          const updated = {
                            ...formData,
                            donkeyTools: {
                              ...formData.donkeyTools,
                              fastSnap: {
                                enabled: e.target.checked,
                                hotkey: formData.donkeyTools?.fastSnap?.hotkey || '',
                                saveDirectory: formData.donkeyTools?.fastSnap?.saveDirectory,
                              },
                            },
                          };
                          setFormData(updated);
                          handleSave(updated);
                        }}
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                </div>

                {/* Sub-settings when FastSnap is enabled */}
                {(formData.donkeyTools?.fastSnap?.enabled ?? true) && (
                  <div className="pt-4 border-t border-white/5 space-y-5">
                    {/* Hotkey configuration & Snipper test */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-300">
                        Globální klávesová zkratka pro pořízení výstřižku (volitelné)
                      </label>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="relative">
                            <input
                              type="text"
                              readOnly
                              value={
                                isRecordingFastSnapHotkey
                                  ? (fastSnapRecordedModifiers.length > 0
                                      ? fastSnapRecordedModifiers.join(' + ')
                                      : 'Stiskněte klávesy...')
                                  : formData.donkeyTools?.fastSnap?.hotkey || ''
                              }
                              onFocus={handleFastSnapHotkeyFocus}
                              onBlur={handleFastSnapHotkeyBlur}
                              onKeyDown={handleFastSnapHotkeyKeyDown}
                              onKeyUp={handleFastSnapHotkeyKeyUp}
                              className={`w-64 border rounded-xl px-3 py-2.5 text-sm font-mono cursor-pointer transition outline-none select-none text-center font-semibold ${
                                fastSnapHotkeyError
                                  ? 'bg-rose-950/30 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                                  : isRecordingFastSnapHotkey
                                  ? 'bg-indigo-950/60 border-indigo-400 ring-2 ring-indigo-500/50 text-indigo-200'
                                  : 'bg-black/30 border-white/10 text-white hover:border-white/20'
                              }`}
                              placeholder="Klikněte pro nastavení zkratky"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              window.electronAPI?.startFastSnap?.();
                            }}
                            className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            title="Spustí výběr výstřižku z obrazovky"
                          >
                            <span className="material-symbols-outlined text-base">crop</span>
                            <span>Vyzkoušet výstřižek</span>
                          </button>
                        </div>

                        {fastSnapHotkeyError && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold animate-fade-in">
                            <span className="material-symbols-outlined text-sm">error</span>
                            <span>{fastSnapHotkeyError}</span>
                          </div>
                        )}

                        <span className="text-[12px] text-gray-400">
                          {isRecordingFastSnapHotkey ? (
                            <span className="text-indigo-400 font-medium animate-pulse">
                              Stiskněte klávesovou kombinaci (např. Ctrl+Shift+S). Esc zruší, Backspace zkratku odstraní.
                            </span>
                          ) : (
                            <span>Klikněte do pole a stiskněte klávesy (např. Ctrl+Shift+S). Zkratka nesmí kolidovat s ostatními. Backspace zkratku vymaže.</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Target folder setting */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <label className="block text-xs font-semibold text-gray-300">
                        Složka pro ukládání výstřižků
                      </label>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                        <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-300 truncate">
                          {formData.donkeyTools?.fastSnap?.saveDirectory || 'Výchozí: Obrázky\\IADonkey Screenshots'}
                        </div>
                        <button
                          type="button"
                          onClick={handleChooseFastSnapFolder}
                          className="px-3 py-2 rounded-xl text-xs font-medium text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <span className="material-symbols-outlined text-base">folder_open</span>
                          <span>Změnit složku...</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShowFastSnapInFolder('')}
                          className="px-3 py-2 rounded-xl text-xs font-medium text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Otevře složku v Průzkumníku souborů Windows"
                        >
                          <span className="material-symbols-outlined text-base">open_in_new</span>
                          <span>Otevřít v Průzkumníku</span>
                        </button>
                      </div>
                    </div>

                    {/* Gallery: Recent 10 screenshots */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-gray-300">
                          Poslední výstřižky ({recentFastSnaps.length})
                        </label>
                        <button
                          type="button"
                          onClick={loadRecentFastSnaps}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <span className={`material-symbols-outlined text-sm ${isLoadingFastSnaps ? 'animate-spin' : ''}`}>refresh</span>
                          <span>Obnovit</span>
                        </button>
                      </div>

                      {recentFastSnaps.length === 0 ? (
                        <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl text-center text-xs text-gray-400 flex flex-col items-center gap-1.5">
                          <span className="material-symbols-outlined text-2xl text-gray-400">image_not_supported</span>
                          <span>Zatím žádné pořízené výstřižky. Zkuste vyzkoušet tlačítko výše nebo zadat <code className="bg-white/10 px-1 rounded text-white font-mono">/fastsnap</code> ve vyhledávači.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                          {recentFastSnaps.map((snap) => {
                            const isCopied = copiedFastSnapPath === snap.path;
                            const dateStr = new Date(snap.createdAt).toLocaleString('cs-CZ', {
                              dateStyle: 'short',
                              timeStyle: 'medium',
                            });
                            return (
                              <div
                                key={snap.path}
                                className="group relative p-2.5 bg-black/30 hover:bg-black/50 border border-white/5 hover:border-indigo-500/30 rounded-xl transition flex gap-3 items-center"
                              >
                                {snap.dataUrl ? (
                                  <img
                                    src={snap.dataUrl}
                                    alt={snap.name}
                                    className="w-16 h-12 object-cover rounded-lg bg-black/50 border border-white/10 shrink-0 cursor-pointer"
                                    onClick={() => handleCopyFastSnap(snap.path)}
                                    title="Kliknutím vložíte do schránky"
                                  />
                                ) : (
                                  <div className="w-16 h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-gray-400">image</span>
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div
                                    className="text-xs font-medium text-white truncate cursor-pointer hover:text-indigo-300"
                                    onClick={() => handleCopyFastSnap(snap.path)}
                                    title={snap.name}
                                  >
                                    {snap.name}
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                                    <span>{dateStr}</span>
                                    {snap.width && snap.height && (
                                      <span className="font-mono text-indigo-400/80">{snap.width}×{snap.height}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyFastSnap(snap.path)}
                                    className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                                      isCopied
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                                    title="Zkopírovat znovu do schránky"
                                  >
                                    <span className="material-symbols-outlined text-base">
                                      {isCopied ? 'check' : 'content_copy'}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleShowFastSnapInFolder(snap.path)}
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                                    title="Zobrazit ve složce"
                                  >
                                    <span className="material-symbols-outlined text-base">folder_open</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFastSnap(snap.path)}
                                    className="p-1.5 text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                                    title="Smazat výstřižek"
                                  >
                                    <span className="material-symbols-outlined text-base">delete</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Usage examples banner */}
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1 text-[11px] text-gray-400">
                      <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">info</span>
                        Jak FastSnap používat
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-gray-400 pl-1">
                        <li>Zadejte <code className="bg-white/10 px-1 rounded text-white font-mono">/fastsnap</code>, <code className="bg-white/10 px-1 rounded text-white font-mono">/snap</code> nebo <code className="bg-white/10 px-1 rounded text-white font-mono">/vystrizek</code> pro spuštění z launcheru.</li>
                        <li>Nebo použijte nakonfigurovanou globální klávesovou zkratku odkudkoliv z Windows.</li>
                        <li>Táhněte myší pro výběr oblasti. Uvolněním tlačítka myši se snímek ihned zkopíruje do schránky a uloží na disk.</li>
                        <li>Stiskem <kbd className="bg-white/10 px-1 rounded font-mono text-[10px]">Esc</kbd> pořízení výstřižku zrušíte bez uložení.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Snippets */}
          {activeTab === 'snippets' && (
            <div className="space-y-8 animate-fade-in max-w-4xl">
              {/* SECTION 1: Vlastní snippety */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-white text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-indigo-400">draw</span>
                    Vlastní snippety
                  </h3>
                  <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                    Vytvořte si vlastní zkratky přes dvojtečku a textové šablony pro rychlé zkopírování do schránky (např. IBAN, čísla účtů, smlouvy či často používané odpovědi).
                  </p>
                </div>

                {/* Action buttons on their own line, left-aligned */}
                <div className="flex items-center justify-start gap-2 flex-wrap">
                  {/* Hidden input for JSON file import */}
                  <input
                    ref={importSnippetsFileRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportCustomSnippets}
                    className="hidden"
                  />

                  {/* Import button */}
                  <button
                    type="button"
                    onClick={() => importSnippetsFileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium transition cursor-pointer"
                    title="Importovat snippety ze souboru JSON"
                  >
                    <span className="material-symbols-outlined text-[16px] text-indigo-400">file_upload</span>
                    <span>Importovat</span>
                  </button>

                  {/* Export button */}
                  <button
                    type="button"
                    onClick={handleExportCustomSnippets}
                    disabled={!formData.snippets?.custom || formData.snippets.custom.length === 0}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                      !formData.snippets?.custom || formData.snippets.custom.length === 0
                        ? 'border-white/5 bg-white/[0.02] text-gray-500 cursor-not-allowed opacity-50'
                        : 'border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white cursor-pointer'
                    }`}
                    title="Exportovat vlastní snippety do souboru JSON"
                  >
                    <span className="material-symbols-outlined text-[16px] text-indigo-400">file_download</span>
                    <span>Exportovat</span>
                  </button>

                  {/* Add snippet button */}
                  <button
                    type="button"
                    onClick={handleAddCustomSnippet}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    <span>Přidat snippet</span>
                  </button>
                </div>

                {snippetFeedback && (
                  <div
                    className={`p-2.5 px-3 rounded-lg text-xs flex items-center justify-between gap-2 border transition ${
                      snippetFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">
                        {snippetFeedback.type === 'success' ? 'check_circle' : 'error'}
                      </span>
                      <span>{snippetFeedback.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSnippetFeedback(null)}
                      className="hover:opacity-75 text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                )}

                {/* List of custom snippets */}
                {(!formData.snippets?.custom || formData.snippets.custom.length === 0) ? (
                  <div className="p-6 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl text-center space-y-2.5">
                    <span className="material-symbols-outlined text-3xl text-gray-500">content_paste</span>
                    <p className="text-xs text-gray-400">
                      Zatím nemáte vytvořené žádné vlastní snippety.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={handleAddCustomSnippet}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>Vytvořit první snippet</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => importSnippetsFileRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm text-indigo-400">file_upload</span>
                        <span>Importovat JSON</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.snippets.custom.map((snip, index) => (
                      <div
                        key={snip.id || index}
                        className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-3 hover:border-white/20 transition"
                      >
                        {/* Row 1: {vyber ikony} | {nazev} | [odebrat] */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-48 sm:w-56 shrink-0">
                            <IconPickerInput
                              value={snip.icon || ''}
                              onChange={(newIcon) => handleUpdateCustomSnippet(snip.id, { icon: newIcon })}
                              placeholder="Vybrat ikonu..."
                              accentColorClass="text-indigo-400"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={snip.name}
                              onChange={(e) => handleUpdateCustomSnippet(snip.id, { name: e.target.value })}
                              placeholder="Název snippetu (např. Číslo bankovního účtu, IBAN)"
                              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none font-medium"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomSnippet(snip.id)}
                            className="w-8 h-8 rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 flex items-center justify-center shrink-0 transition cursor-pointer"
                            title="Smazat snippet"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>

                        {/* Row 2: {location - viceradkove pole} */}
                        <div>
                          <textarea
                            rows={2}
                            value={snip.location}
                            onChange={(e) => handleUpdateCustomSnippet(snip.id, { location: e.target.value })}
                            placeholder="Obsah snippetu (víceřádkový text ke zkopírování do schránky)..."
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none font-mono resize-y leading-relaxed"
                          />
                        </div>

                        {/* Row 3: {shortcuts X} [pridat novy] */}
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <span className="h-7 flex items-center gap-1.5 text-xs text-gray-300 font-medium mr-0.5 select-none">
                            <span className="material-symbols-outlined text-[17px] text-indigo-400 leading-none">label</span>
                            <span className="leading-none">Zkratky:</span>
                          </span>
                          {(snip.shortcuts || []).map((sc, scIdx) => {
                            const clean = sc.replace(/^:+/, '');
                            return (
                              <span
                                key={scIdx}
                                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-indigo-500/15 text-indigo-200 border border-indigo-500/30 text-xs font-mono select-none"
                              >
                                <span className="text-indigo-400 font-bold leading-none">:</span>
                                <span className="leading-none">{clean}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveShortcut(snip.id, scIdx)}
                                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-rose-500/20 hover:text-rose-300 text-gray-400 transition cursor-pointer ml-0.5"
                                  title="Odebrat zkratku"
                                >
                                  <span className="material-symbols-outlined text-[13px] leading-none">close</span>
                                </button>
                              </span>
                            );
                          })}

                          {/* Inline input to add shortcut with non-deletable colon */}
                          <div className="inline-flex items-center h-7 px-2.5 bg-black/40 border border-white/15 rounded-lg focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition">
                            <span className="text-indigo-400 font-mono text-xs select-none font-bold mr-1 leading-none">:</span>
                            <input
                              type="text"
                              placeholder="přidat zkratku..."
                              className="bg-transparent text-white text-xs font-mono outline-none w-28 placeholder:text-gray-500 leading-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = e.currentTarget;
                                  const val = target.value.trim().replace(/^:+/, '');
                                  if (val) {
                                    handleAddShortcut(snip.id, val);
                                    target.value = '';
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const val = e.target.value.trim().replace(/^:+/, '');
                                if (val) {
                                  handleAddShortcut(snip.id, val);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: Předdefinované osobní údaje */}
              <div className="space-y-4 pt-6 border-t border-white/10">
                <div>
                  <h3 className="font-semibold text-white text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-indigo-400">badge</span>
                    Předdefinované osobní údaje
                  </h3>
                  <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                    Pevně definované textové zkratky a kontaktní údaje zabudované v aplikaci (podpis, jméno, IČO, DIČ, telefon, e-mail, adresa). Hodnota se po výběru okamžitě zkopíruje do schránky.
                  </p>
                </div>

              {/* Vlastní podpis */}
              <div className="space-y-2 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-gray-200">
                    Můj Podpis (<span className="text-indigo-300 font-mono">:podpis</span>, <span className="text-indigo-300 font-mono">:sign</span>, <span className="text-indigo-300 font-mono">:signature</span>)
                  </label>
                  <span className="text-[11px] text-gray-500 font-mono">Víceřádkový text</span>
                </div>
                <textarea
                  rows={4}
                  value={formData.snippets?.signature || ''}
                  onChange={(e) => {
                    const updated = {
                      ...formData,
                      snippets: {
                        ...formData.snippets,
                        signature: e.target.value,
                      },
                    };
                    setFormData(updated);
                    handleSave(updated);
                  }}
                  placeholder={`S pozdravem,\nPetr Kulhánek\ntel: +420 ...`}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono resize-y leading-relaxed"
                />
                <p className="text-xs text-gray-400">
                  Po výběru zkratky <span className="text-indigo-300 font-mono">:podpis</span> ve vyhledávači se tento text zkopíruje do schránky.
                </p>
              </div>

              {/* Company & contact snippets */}
              <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-4">
                <h5 className="text-[13px] font-medium text-gray-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-indigo-400">badge</span>
                  Osobní, firemní a kontaktní údaje pro rychlé vložení
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Moje Jmeno */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300 flex items-center justify-between">
                      <span>Moje Jméno (<code className="text-indigo-300 font-mono">:jmeno</code>, <code className="text-indigo-300 font-mono">:name</code>)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.snippets?.name || ''}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          snippets: { ...formData.snippets, name: e.target.value },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      placeholder="např. Jan Novák"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none font-mono"
                    />
                  </div>

                  {/* Moje ICO */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300 flex items-center justify-between">
                      <span>Moje IČO (<code className="text-indigo-300 font-mono">:ico</code>, <code className="text-indigo-300 font-mono">:ičo</code>)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.snippets?.ico || ''}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          snippets: { ...formData.snippets, ico: e.target.value },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      placeholder="např. 12345678"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none font-mono"
                    />
                  </div>

                  {/* DIC */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300 flex items-center justify-between">
                      <span>Moje DIČ (<code className="text-indigo-300 font-mono">:dic</code>, <code className="text-indigo-300 font-mono">:dič</code>, <code className="text-indigo-300 font-mono">:vat</code>)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.snippets?.dic || ''}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          snippets: { ...formData.snippets, dic: e.target.value },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      placeholder="např. CZ12345678"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none font-mono"
                    />
                  </div>

                  {/* Muj Telefon */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300 flex items-center justify-between">
                      <span>Můj Telefon (<code className="text-indigo-300 font-mono">:telefon</code>, <code className="text-indigo-300 font-mono">:tel</code>)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.snippets?.phone || ''}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          snippets: { ...formData.snippets, phone: e.target.value },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      placeholder="např. +420 777 123 456"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none font-mono"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300 flex items-center justify-between">
                      <span>Můj E-mail (<code className="text-indigo-300 font-mono">:email</code>, <code className="text-indigo-300 font-mono">:mail</code>, <code className="text-indigo-300 font-mono">:e-mail</code>)</span>
                    </label>
                    <input
                      type="email"
                      value={formData.snippets?.email || ''}
                      onChange={(e) => {
                        const updated = {
                          ...formData,
                          snippets: { ...formData.snippets, email: e.target.value },
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      placeholder="např. info@firma.cz"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Moje Adresa */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs text-gray-300 flex items-center justify-between">
                    <span>Moje Adresa (<code className="text-indigo-300 font-mono">:adresa</code>, <code className="text-indigo-300 font-mono">:address</code>)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.snippets?.address || ''}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        snippets: { ...formData.snippets, address: e.target.value },
                      };
                      setFormData(updated);
                      handleSave(updated);
                    }}
                    placeholder="např. Václavské náměstí 1, 110 00 Praha 1"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none font-mono"
                  />
                </div>

                <p className="text-[11px] text-gray-400">
                  Zadáním dvojtečky a názvu (např. <code className="text-indigo-300 font-mono">:ico</code> nebo <code className="text-indigo-300 font-mono">:adresa</code>) se údaj okamžitě zkopíruje do schránky.
                </p>
              </div>
            </div>
          </div>
        )}

          {/* TAB 3: General & Updates */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Hotkey Section */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-indigo-400">keyboard</span>
                  Globální klávesová zkratka
                </h4>
                <p className="text-[13px] text-gray-400 mt-1">
                  Kombinace kláves pro otevření vyhledávacího okna uprostřed monitoru s myší.
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={
                          isRecordingHotkey
                            ? (recordedModifiers.length > 0
                                ? recordedModifiers.join(' + ')
                                : 'Stiskněte klávesy...')
                            : formData.hotkey
                        }
                        onFocus={handleHotkeyFocus}
                        onBlur={handleHotkeyBlur}
                        onKeyDown={handleHotkeyKeyDown}
                        onKeyUp={handleHotkeyKeyUp}
                        className={`w-64 border rounded-xl px-3 py-2.5 text-sm font-mono cursor-pointer transition outline-none select-none text-center font-semibold ${
                          hotkeyError
                            ? 'bg-rose-950/30 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                            : isRecordingHotkey
                            ? 'bg-indigo-950/60 border-indigo-400 ring-2 ring-indigo-500/50 text-indigo-200'
                            : 'bg-black/30 border-white/10 text-white hover:border-white/20'
                        }`}
                        placeholder="Klikněte pro nastavení zkratky"
                      />
                    </div>
                    <span className="text-[13px] text-gray-400">
                      {isRecordingHotkey ? (
                        <span className="text-indigo-400 font-medium animate-pulse">
                          Stiskněte klávesovou kombinaci (např. Ctrl+Alt+Space). Esc zruší.
                        </span>
                      ) : (
                        <span>Klikněte do pole a stiskněte kombinaci kláves (např. Ctrl+Alt+Space). Rezervované zkratky z nápovědy nelze použít.</span>
                      )}
                    </span>
                  </div>

                  {hotkeyError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold animate-fade-in">
                      <span className="material-symbols-outlined text-sm">error</span>
                      <span>{hotkeyError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Primary Color Accent Section */}
              <ColorPickerSection
                title="Hlavní barva aplikace (Zvýraznění)"
                description="Nastavení barvy tlačítek, aktivních záložek a prvků. Semaforové stavové barvy (zelená, červená, oranžová) zůstávají beze změny."
                icon="palette"
                iconColorClass="text-indigo-400"
                value={formData.primaryColor || '#6366f1'}
                fallbackColor="#6366f1"
                onColorChange={(val) => {
                  const updated = { ...formData, primaryColor: val };
                  setFormData(updated);
                  applyPrimaryColor(val);
                  handleSave(updated);
                }}
              />

              {/* Actions Color Accent Section */}
              <ColorPickerSection
                title="Barva akcí a informací (Sekundární)"
                description="Nastavení barvy pro nabídku Akcí a podrobných informací (Shift+Enter), štítků akcí a dialogu pro stahování Git repozitářů."
                icon="bolt"
                iconColorClass="text-purple-400"
                value={formData.actionsColor || '#a855f7'}
                fallbackColor="#a855f7"
                onColorChange={(val) => {
                  const updated = { ...formData, actionsColor: val };
                  setFormData(updated);
                  applyActionsColor(val);
                  handleSave(updated);
                }}
              />

              {/* Installed Apps Section */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg text-indigo-400">apps</span>
                      Nainstalované programy Windows
                    </h4>
                    <p className="text-[13px] text-gray-400 mt-1 max-w-xl leading-relaxed">
                      IADonkey prohledá nainstalované programy v nabídce Start a nabídne je ve vyhledávači včetně jejich původních systémových ikon. Programy jsou řazeny pod vašimi vlastními položkami (priorita 99).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={formData.searchInstalledApps !== false}
                      onChange={(e) => {
                        const updated = { ...formData, searchInstalledApps: e.target.checked };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                </div>
              </div>

              {/* Default Search Engine Section */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg text-indigo-400">travel_explore</span>
                      Výchozí internetový vyhledávač
                    </h4>
                    <p className="text-[13px] text-gray-400 mt-1 max-w-xl leading-relaxed">
                      Vyhledávač nabízený ve Spotlightu na konci výsledků i bez prefixu (od 2 znaků).
                      Vyhledávání s přímým prefixem ({SEARCH_ENGINES.map((e) => e.prefixes.map((p) => `${p}:`).join(', ')).join(', ')}) funguje vždy bez ohledu na výchozí volbu.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <select
                      value={
                        formData.defaultSearchEngine !== undefined
                          ? formData.defaultSearchEngine
                          : (formData.searchGoogle !== false ? 'google' : 'none')
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = {
                          ...formData,
                          defaultSearchEngine: val,
                          searchGoogle: val !== 'none',
                        };
                        setFormData(updated);
                        handleSave(updated);
                      }}
                      className="bg-black/40 border border-white/15 hover:border-indigo-500/50 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition cursor-pointer min-w-[200px]"
                    >
                      {SEARCH_ENGINES.map((engine) => (
                        <option key={engine.id} value={engine.id} className="bg-[#181920] text-white">
                          {engine.name}
                        </option>
                      ))}
                      <option value="none" className="bg-[#181920] text-gray-400">
                        Žádný
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Dedicated Updates */}
          {activeTab === 'updates' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-semibold text-white text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-indigo-400">system_update</span>
                  Aktualizace aplikace & Verze
                </h3>
                <p className="text-[13px] text-gray-400 mt-1">
                  IADonkey automaticky kontroluje nové verze každých 24 hodin na pozadí. Zde můžete provést ruční kontrolu.
                </p>
              </div>

              <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <span className="text-[13px] text-gray-400 block mb-1">Nainstalovaná verze</span>
                    <div className="text-lg font-mono font-bold text-white tracking-wide">
                      v{CURRENT_APP_VERSION}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowChangelog(true)}
                      className="px-3.5 py-2 text-[13px] font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">history_edu</span>
                      Historie změn
                    </button>
                    <button
                      type="button"
                      onClick={onCheckUpdate}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[13px] font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      Zkontrolovat aktualizace nyní
                    </button>
                  </div>
                </div>

                {updateStatusMessage ? (
                  <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center gap-2.5 text-[13px] text-indigo-300">
                    <span className="material-symbols-outlined text-base text-indigo-400">info</span>
                    <span>{updateStatusMessage}</span>
                  </div>
                ) : (
                  <div className="text-[13px] text-gray-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-gray-500">check_circle</span>
                    <span>Aplikace je připravena k vyhledávání novějších verzí na GitHubu.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Help & Shortcuts */}
          {activeTab === 'help' && (
            <div className="space-y-6 animate-fade-in">
              {/* Top Banner / Button: Jak na zdroje dat */}
              <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <span className="material-symbols-outlined text-2xl">menu_book</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Jak na zdroje dat (JSON schémata)</h4>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      Kompletní dokumentace TypeScript modelu, podporované akce, subpoložky, metadata a kopírovatelné ukázky.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDataSourcesGuide(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">code</span>
                  <span>Jak na zdroje dat</span>
                </button>
              </div>

              {/* Section 1: Shortcuts */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">keyboard</span>
                  Ovládání a klávesové zkratky
                </h4>

                <div className="divide-y divide-white/5 text-[13px]">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Otevřít / Spustit položku</span>
                      <p className="text-gray-400 text-xs mt-0.5">Provede výchozí akci (otevření URL, spuštění programu, kopírování výsledku).</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm whitespace-nowrap">Enter</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Akce položky</span>
                      <p className="text-gray-400 text-xs mt-0.5">Zobrazí nabídku dostupných akcí položky (např. klonování repozitáře, otevření na GitHubu).</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm whitespace-nowrap">Shift + Enter</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Vstup do subpoložek (options)</span>
                      <p className="text-gray-400 text-xs mt-0.5">Rozbalí vnořené subpoložky a volby vybrané položky se samostatným vyhledáváním.</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm whitespace-nowrap">Alt + Enter</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Rychlé spuštění 1. subpoložky</span>
                      <p className="text-gray-400 text-xs mt-0.5">Okamžitě provede první subpoložku položky (lze také podržet Ctrl a kliknout myší).</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 text-xs font-semibold shadow-sm whitespace-nowrap">Ctrl + Enter</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Zpět / Zavřít okno</span>
                      <p className="text-gray-400 text-xs mt-0.5">V podpoložkách vás vrátí zpět na původní hledání, v hlavním seznamu skryje IADonkey.</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm whitespace-nowrap">Escape</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Pohyb ve výběru položek</span>
                      <p className="text-gray-400 text-xs mt-0.5">Listování nahoru a dolů v seznamu nalezených výsledků.</p>
                    </div>
                    <div className="flex gap-1.5">
                      <kbd className="px-2 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm whitespace-nowrap">↑</kbd>
                      <kbd className="px-2 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm whitespace-nowrap">↓</kbd>
                    </div>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Smazání celého textu hledání</span>
                      <p className="text-gray-400 text-xs mt-0.5">Rychle vyprázdní celé vyhledávací pole a vrátí výběr na první položku.</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm whitespace-nowrap">Ctrl / Alt + Backspace</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Listování v informacích položky</span>
                      <p className="text-gray-400 text-xs mt-0.5">Přepínání stránek dodatečných informací v režimu akcí (při více než 6 záznamech).</p>
                    </div>
                    <div className="flex gap-1.5">
                      <kbd className="px-2 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm whitespace-nowrap">←</kbd>
                      <kbd className="px-2 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm whitespace-nowrap">→</kbd>
                    </div>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Zkopírování systémového snippetu</span>
                      <p className="text-gray-400 text-xs mt-0.5">Napište dvojtečku a klíčové slovo (např. :today, :now, :cas, :guid, :podpis) pro zkopírování hodnoty do schránky.</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm whitespace-nowrap">:klicove_slovo</kbd>
                  </div>

                  {formData.extensions?.donkeyTools && formData.donkeyTools?.colorMaster?.enabled !== false && !!formData.donkeyTools?.colorMaster?.hotkey?.trim() && (
                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-white">Vyvolání kapátka (ColorMaster)</span>
                        <p className="text-gray-400 text-xs mt-0.5">Spustí systémové kapátko s lupou a nabere barvu do schránky odkudkoliv z Windows.</p>
                      </div>
                      <kbd className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg font-mono font-semibold shadow-sm">
                        {formData.donkeyTools.colorMaster.hotkey}
                      </kbd>
                    </div>
                  )}

                  {formData.extensions?.donkeyTools && formData.donkeyTools?.fastSnap?.enabled !== false && !!formData.donkeyTools?.fastSnap?.hotkey?.trim() && (
                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-white">Výstřižek obrazovky (FastSnap)</span>
                        <p className="text-gray-400 text-xs mt-0.5">Spustí celoobrazovkový výběr výstřižku s automatickým uložením a zkopírováním do schránky.</p>
                      </div>
                      <kbd className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg font-mono font-semibold shadow-sm">
                        {formData.donkeyTools.fastSnap.hotkey}
                      </kbd>
                    </div>
                  )}

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Globální vyvolání launcheru</span>
                      <p className="text-gray-400 text-xs mt-0.5">Aktivuje nebo skryje vyhledávací okno odkudkoliv ze systému Windows.</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg font-mono font-semibold shadow-sm">
                      {formData.hotkey || 'Ctrl+Alt+Space'}
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Section 2: Smart Features */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  Chytré funkce
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-[13px]">
                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-teal-400 font-semibold">
                      <span className="material-symbols-outlined text-base">content_copy</span>
                      Systémové snippety
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Začněte dotaz dvojtečkou (např. <code className="bg-white/10 px-1 rounded">:today</code>, <code className="bg-white/10 px-1 rounded">:now</code>, <code className="bg-white/10 px-1 rounded">:cas</code>, <code className="bg-white/10 px-1 rounded">:guid</code>, <code className="bg-white/10 px-1 rounded">:podpis</code>). Stiskem Enter se vygenerovaná hodnota zkopíruje do schránky.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <span className="material-symbols-outlined text-base">calculate</span>
                      Kalkulačka
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Zadejte matematický výraz (např. <code className="bg-white/10 px-1 rounded">25 * 4 + 10</code> nebo <code className="bg-white/10 px-1 rounded">1200 * 1.21</code>). Stiskem Enter se výsledek zkopíruje do schránky.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-400 font-semibold">
                      <span className="material-symbols-outlined text-base">link</span>
                      Rychlé URL
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Napište libovolnou webovou adresu (např. <code className="bg-white/10 px-1 rounded">seznam.cz</code>). Stiskem Enter ji rovnou otevřete ve vašem výchozím prohlížeči.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-400 font-semibold">
                      <span className="material-symbols-outlined text-base">mail</span>
                      Gmail rychlé psaní
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Zadejte e-mailovou adresu (např. <code className="bg-white/10 px-1 rounded">jmeno@company.com</code>). Stiskem Enter okamžitě otevřete okno nové zprávy v Gmailu s vyplněným příjemcem.
                    </p>
                  </div>

                  {formData.extensions?.mlog !== false && !!formData.mlog?.baseUrl?.trim() && (
                    <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                        <span className="material-symbols-outlined text-base">support_agent</span>
                        Taskmanager
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Zadejte kód úkolu (např. <code className="bg-white/10 px-1 rounded">{(formData.mlog?.taskPrefix || 'T').toUpperCase()}7821</code>) nebo požadavku (např. <code className="bg-white/10 px-1 rounded">{(formData.mlog?.requestPrefix || 'R').toUpperCase()}2345</code>), případně rovnou samotné číslo od 3 číslic (např. <code className="bg-white/10 px-1 rounded">123</code>), a vyhledávač nabídne obě možnosti pro přímé otevření v prohlížeči.
                      </p>
                    </div>
                  )}

                  {formData.extensions?.magicgate !== false && (!!formData.magicgate?.username?.trim() || !!formData.magicgate?.xmlPath?.trim()) && (
                    <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold">
                        <span className="material-symbols-outlined text-base">security</span>
                        MagicGate přihlášení a vyhledávání
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Pro vyhledávání výhradně v instancích MagicGate použijte prefix <code className="bg-white/10 px-1 rounded">magicgate:</code> nebo <code className="bg-white/10 px-1 rounded">mg:</code> (např. <code className="bg-white/10 px-1 rounded">magicgate:</code> pro zobrazení všech instancí nebo <code className="bg-white/10 px-1 rounded">magicgate: produkce</code>). U položek se <code className="bg-white/10 px-1 rounded">settings: "magicgate"</code> aplikace provede tichý handshake a otevře instanci IS Tour v prohlížeči již plně přihlášenou.
                      </p>
                    </div>
                  )}

                  {formData.extensions?.github !== false && (
                    <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <span className="material-symbols-outlined text-base">folder_code</span>
                        GitHub repozitáře
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Vyhledejte repozitář podle názvu. Pro vyhledávání výhradně v repozitářích použijte prefix <code className="bg-white/10 px-1 rounded">git:</code> (např. <code className="bg-white/10 px-1 rounded">git:</code> pro všechny nebo <code className="bg-white/10 px-1 rounded">git: iadonkey</code>). Stiskem Enter jej otevřete na GitHubu v prohlížeči, stiskem <kbd className="bg-white/10 px-1 rounded font-mono text-[11px] whitespace-nowrap">Shift+Enter</kbd> otevřete nabídku Akcí pro přímé stažení nebo rekurzivní klonování do zvolené složky.
                      </p>
                    </div>
                  )}

                  {formData.extensions?.vscode && (
                    <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                        <span className="material-symbols-outlined text-base">code</span>
                        Visual Studio Code
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Pokud existuje repozitář nebo projekt v lokální cílové složce, v nabídce akcí (<kbd className="bg-white/10 px-1 rounded font-mono text-[11px] whitespace-nowrap">Shift+Enter</kbd>) jej můžete okamžitě otevřít přímo v editoru VS Code.
                      </p>
                    </div>
                  )}

                  {formData.extensions?.androidStudio && (
                    <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-pink-400 font-semibold">
                        <span className="material-symbols-outlined text-base">android</span>
                        Android Studio
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Aplikace se nabízí, pokud repozitář z GitHubu používá jazyk Kotlin nebo Java. V nabídce akcí (<kbd className="bg-white/10 px-1 rounded font-mono text-[11px] whitespace-nowrap">Shift+Enter</kbd>) nebo v okně klonování jej můžete okamžitě otevřít přímo v Android Studiu.
                      </p>
                    </div>
                  )}

                  {formData.extensions?.donkeyTools && formData.donkeyTools?.colorMaster?.enabled !== false && (
                    <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-rose-400 font-semibold">
                        <span className="material-symbols-outlined text-base">palette</span>
                        ColorMaster (DonkeyTools)
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Napište kód barvy přímo do vyhledávání (např. <code className="bg-white/10 px-1 rounded">#ff4400</code>, <code className="bg-white/10 px-1 rounded">rgb(255, 68, 0)</code> nebo <code className="bg-white/10 px-1 rounded">hsl(16, 100%, 50%)</code>) pro okamžitý náhled barvy. V nabídce akcí (<kbd className="bg-white/10 px-1 rounded font-mono text-[11px] whitespace-nowrap">Shift+Enter</kbd>) ji můžete zkopírovat v libovolném formátu nebo nastavit jako barvu motivu. Systémové kapátko spustíte zkratkou <kbd className="bg-white/10 px-1 rounded font-mono text-[11px] whitespace-nowrap">{formData.donkeyTools?.colorMaster?.hotkey || 'Shift+Alt+C'}</kbd> nebo příkazem <code className="bg-white/10 px-1 rounded">/kapatko</code>.
                      </p>
                    </div>
                  )}

                  {formData.extensions?.donkeyTools && (
                    <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-rose-300 font-semibold">
                        <span className="material-symbols-outlined text-base">terminal</span>
                        Příkazy DonkeyTools
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Zadejte do vyhledávače lomítko <code className="bg-white/10 px-1 rounded">/</code> pro zobrazení rychlých příkazů sady DonkeyTools (např. <code className="bg-white/10 px-1 rounded">/kapatko</code>, <code className="bg-white/10 px-1 rounded">/picker</code> pro aktivaci kapátka výběru barvy z obrazovky).
                      </p>
                    </div>
                  )}

                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-fuchsia-400 font-semibold">
                      <span className="material-symbols-outlined text-base">travel_explore</span>
                      Internetové vyhledávače
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Zadejte libovolný dotaz a na konci seznamu jej otevřete ve zvoleném vyhledávači. Kdykoliv můžete vyhledat přímo s prefixy: <code className="bg-white/10 px-1 rounded">g: dotaz</code> (Google), <code className="bg-white/10 px-1 rounded">s: dotaz</code> (Seznam), <code className="bg-white/10 px-1 rounded">c: dotaz</code> (Centrum) nebo <code className="bg-white/10 px-1 rounded">w: dotaz</code> (Wikipedie).
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-sky-400 font-semibold">
                      <span className="material-symbols-outlined text-base">apps</span>
                      Programy Windows
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      IADonkey nabízí nainstalované programy ze Start Menu s jejich originálními ikonami (priorita 99). Lze kdykoliv vypnout v záložce Obecné.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Action Log */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-indigo-400">receipt_long</span>
                      Protokol prováděných akcí (Action Log)
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Průběžný auditní záznam posledních 50 spuštěných položek, nabídek, klávesových zkratek a systémových operací.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {actionLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearActionLogs}
                        className="h-8 px-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border border-white/10 hover:border-rose-500/30 shrink-0"
                        title="Vymaže historii akcí"
                      >
                        <span className="material-symbols-outlined text-base text-rose-500">delete</span>
                        <span>Vyčistit</span>
                      </button>
                    )}
                  </div>
                </div>

                {actionLogs.length === 0 ? (
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center text-gray-400 text-xs py-6">
                    Zatím nebyly zaznamenány žádné akce od spuštění aplikace.
                  </div>
                ) : (
                  <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
                    <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                      {(showAllActionLogs ? actionLogs : actionLogs.slice(0, 5)).map((entry) => {
                        let badgeBg = 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
                        let iconName = 'info';
                        let iconColor = 'text-indigo-400';

                        if (entry.status === 'success') {
                          badgeBg = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
                          iconName = 'check_circle';
                          iconColor = 'text-emerald-400';
                        } else if (entry.status === 'error') {
                          badgeBg = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
                          iconName = 'error';
                          iconColor = 'text-rose-400';
                        } else if (entry.status === 'warn') {
                          badgeBg = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
                          iconName = 'warning';
                          iconColor = 'text-amber-400';
                        }

                        if (entry.type === 'color-picker' || entry.type === 'color-master') {
                          iconName = 'colorize';
                          iconColor = 'text-rose-400';
                        } else if (entry.type === 'shortcut') {
                          iconName = 'keyboard';
                          iconColor = 'text-cyan-400';
                        } else if (entry.type === 'options') {
                          iconName = 'account_tree';
                          iconColor = 'text-amber-400';
                        } else if (entry.type === 'window') {
                          iconName = 'settings';
                          iconColor = 'text-purple-400';
                        } else if (entry.type === 'sync') {
                          iconName = 'sync';
                          iconColor = 'text-blue-400';
                        } else if (entry.type === 'ui') {
                          iconName = 'touch_app';
                          iconColor = 'text-teal-400';
                        }

                        return (
                          <div key={entry.id} className="p-2.5 px-3.5 flex items-start justify-between gap-3 text-xs hover:bg-white/[0.02] transition">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className={`material-symbols-outlined text-base ${iconColor} shrink-0 mt-0.5`}>{iconName}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-gray-200">{entry.title}</span>
                                  <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${badgeBg}`}>
                                    {entry.type}
                                  </span>
                                </div>
                                {entry.details && (
                                  <p className="text-[11.5px] text-gray-400 mt-0.5 truncate max-w-xl font-mono">
                                    {entry.details}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-[11px] text-gray-500 whitespace-nowrap font-mono shrink-0">
                              {entry.timestamp}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {actionLogs.length > 5 && (
                      <div className="p-2 bg-white/[0.02] border-t border-white/5 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllActionLogs(!showAllActionLogs)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-white/5 transition cursor-pointer"
                        >
                          <span>
                            {showAllActionLogs
                              ? 'Zobrazit méně (posledních 5)'
                              : `Ukázat vše (zobrazit všech ${actionLogs.length} záznamů)`}
                          </span>
                          <span className="material-symbols-outlined text-base">
                            {showAllActionLogs ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 4: Crashlogs & Error Diagnostics */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-rose-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-rose-400">bug_report</span>
                      Chybové protokoly a diagnostika (Crashlogs)
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Automaticky ukládané protokoly chyb ze složky <code className="bg-white/10 px-1.5 py-0.5 rounded text-gray-300 font-mono text-[11px]">crashlog/</code> pro rychlou diagnostiku.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleOpenCrashLogFolder}
                      className="h-8 px-3 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border border-white/10 shrink-0"
                      title="Otevře složku s crashlogy v Průzkumníku Windows"
                    >
                      <span className="material-symbols-outlined text-base text-indigo-400">folder_open</span>
                      <span>Otevřít složku</span>
                    </button>
                    {crashLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearCrashLogs}
                        className="h-8 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border border-rose-500/20 shrink-0"
                        title="Vymaže všechny soubory crashlogů"
                      >
                        <span className="material-symbols-outlined text-base text-rose-500">delete_sweep</span>
                        <span>Vymazat</span>
                      </button>
                    )}
                  </div>
                </div>

                {crashLogs.length === 0 ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-[13px] text-emerald-300">
                    <span className="material-symbols-outlined text-xl text-emerald-400 shrink-0">check_circle</span>
                    <div>
                      <span className="font-semibold text-emerald-200">Žádné zaznamenané chyby ani pády</span>
                      <p className="text-xs text-emerald-400/80 mt-0.5">Všechny operace, spouštěče i kapátko běží bez zachycených výjimek.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {(showAllCrashLogs ? crashLogs : crashLogs.slice(0, 5)).map((log) => {
                      const isExpanded = selectedCrashLog?.id === log.id;
                      const isCopied = diagnosticsCopiedId === log.id;
                      const isExported = diagnosticsExportedId === log.id;
                      const isExporting = isExportingCrashId === log.id;
                      return (
                        <div
                          key={log.id}
                          className="bg-white/[0.02] border border-rose-500/20 rounded-xl overflow-hidden text-[13px] transition hover:border-rose-500/40"
                        >
                          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-rose-500/5">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="material-symbols-outlined text-lg text-rose-400 shrink-0 mt-0.5">error</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-white truncate">{log.action}</span>
                                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    {log.timestamp}
                                  </span>
                                </div>
                                <p className="text-xs text-rose-200/80 mt-1 truncate max-w-xl font-mono">
                                  {log.errorSnippet}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => handleCopyCrashLog(log)}
                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer border border-white/10"
                                title="Zkopíruje celý protokol včetně časové osy do schránky"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {isCopied ? 'check' : 'content_copy'}
                                </span>
                                <span>{isCopied ? 'Zkopírováno' : 'Kopírovat'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportCrashLog(log)}
                                disabled={isExporting}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer border ${
                                  isExported
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10'
                                }`}
                                title="Exportuje protokol chyby včetně časové osy akcí do souboru (.txt / .log)"
                              >
                                <span className={`material-symbols-outlined text-sm ${isExported ? 'text-emerald-400' : isExporting ? 'animate-spin text-indigo-400' : 'text-indigo-400'}`}>
                                  {isExported ? 'check_circle' : isExporting ? 'sync' : 'download'}
                                </span>
                                <span>{isExported ? 'Exportováno' : isExporting ? 'Ukládám...' : 'Exportovat'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedCrashLog(isExpanded ? null : log)}
                                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer border border-rose-500/30"
                              >
                                <span>{isExpanded ? 'Skrýt detail' : 'Detail'}</span>
                                <span className="material-symbols-outlined text-sm">
                                  {isExpanded ? 'expand_less' : 'expand_more'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-3.5 bg-black/40 border-t border-white/5 space-y-2">
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="font-mono text-[11px] text-gray-400">{log.fileName}</span>
                                <span className="text-[11px] text-gray-500">{log.filePath}</span>
                              </div>
                              <pre className="p-3 bg-[#0d0e14] border border-white/5 rounded-lg text-[11.5px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 select-text">
                                {log.fullContent}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {crashLogs.length > 5 && (
                      <div className="pt-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllCrashLogs(!showAllCrashLogs)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition cursor-pointer"
                        >
                          <span>
                            {showAllCrashLogs
                              ? 'Zobrazit méně (posledních 5)'
                              : `Ukázat vše (zobrazit všech ${crashLogs.length} protokolů)`}
                          </span>
                          <span className="material-symbols-outlined text-base">
                            {showAllCrashLogs ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Full Changelog Modal */}
      {showChangelog && (
        <ChangelogModal onClose={() => setShowChangelog(false)} />
      )}

      {/* Search Items Viewer Modal */}
      {showItemsViewer && (
        <SearchItemsViewerModal
          isOpen={showItemsViewer}
          onClose={() => setShowItemsViewer(false)}
          items={items}
          sources={formData.sources}
          snippetsConfig={formData.snippets}
          banlist={formData.banlist || []}
          onBanItem={handleBanItem}
          onUnbanItem={handleUnbanItem}
        />
      )}

      {/* Data Sources Guide Modal */}
      {showDataSourcesGuide && (
        <DataSourcesGuideModal
          isOpen={showDataSourcesGuide}
          onClose={() => setShowDataSourcesGuide(false)}
          magicGateEnabled={formData.extensions?.magicgate !== false}
          githubEnabled={formData.extensions?.github !== false}
        />
      )}
    </div>
  );
};
