import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, DataSource, FileSource, ApiSource, LauncherItem, SyncProgress, UpdateInfo } from '../types';
import { applyPrimaryColor } from '../utils/theme';
import { CURRENT_APP_VERSION } from '../changelog';
import { ChangelogModal } from './ChangelogModal';

interface SettingsModalProps {
  config: AppConfig;
  items: LauncherItem[];
  onSaveConfig: (newConfig: AppConfig) => void;
  onClose: () => void;
  onTriggerSync: () => Promise<void>;
  onCheckUpdate: () => Promise<void>;
  onSimulateUpdate?: (info: UpdateInfo) => void;
  isSyncing: boolean;
  syncProgress?: SyncProgress | null;
  updateStatusMessage?: string | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  items,
  onSaveConfig,
  onClose,
  onTriggerSync,
  onCheckUpdate,
  onSimulateUpdate,
  isSyncing,
  syncProgress,
  updateStatusMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'magicgate' | 'general' | 'help'>('sources');
  const [formData, setFormData] = useState<AppConfig>(config);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [isAddingSource, setIsAddingSource] = useState<'file' | 'api' | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [recordedModifiers, setRecordedModifiers] = useState<string[]>([]);
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);
  const [hoveredEyeId, setHoveredEyeId] = useState<string | null>(null);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const maxComboRef = useRef<string[]>([]);
  const originalHotkeyRef = useRef<string>(config.hotkey || 'Ctrl+Alt+Space');

  // Keep formData in sync when config prop updates from main process
  useEffect(() => {
    setFormData(config);
    if (!isRecordingHotkey) {
      originalHotkeyRef.current = config.hotkey || 'Ctrl+Alt+Space';
    }
    if (config.primaryColor) {
      applyPrimaryColor(config.primaryColor);
    }
  }, [config, isRecordingHotkey]);

  // Clean up global hotkey pause if component unmounts
  useEffect(() => {
    return () => {
      window.electronAPI?.resumeGlobalHotkey?.();
    };
  }, []);

  // Check if at least one item has settings === 'magicgate'
  const hasMagicGateItem = items.some((i) => i.settings === 'magicgate');

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

  const handleSave = (customConfig?: AppConfig) => {
    const toSave = customConfig || formData;
    onSaveConfig(toSave);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handlePickLocalFile = async () => {
    const selectedPath = await window.electronAPI?.selectJsonFile?.();
    if (selectedPath) {
      if (editingSource && editingSource.type === 'file') {
        setEditingSource({ ...editingSource, path: selectedPath });
      } else if (isAddingSource === 'file') {
        setEditingSource({ ...initialFileSource, path: selectedPath, name: selectedPath.split(/[\\/]/).pop() || 'Lokální soubor' });
      }
    }
  };

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
    setEditingSource(null);
    setIsAddingSource(null);
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

    // If at least 2 keys were pressed: save new valid hotkey
    if (combo.length >= 2) {
      setHotkeyError(null);
      const finalHotkey = combo.join('+');
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

  return (
    <div className="w-full h-screen flex flex-col bg-[#181920] text-gray-200 select-none">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-indigo-400 text-2xl">settings</span>
          <h2 className="text-lg font-bold text-white tracking-wide">Nastavení IADonkey</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white/10 text-indigo-300">
            v{CURRENT_APP_VERSION}
          </span>
          <button
            type="button"
            onClick={() => setShowChangelog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition ml-2"
            title="Zobrazit historii verzí a změn"
          >
            <span className="material-symbols-outlined text-sm text-indigo-400">history_edu</span>
            Changelog
          </button>
        </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 px-6 gap-6 bg-white/[0.01]">
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === 'sources'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-lg">database</span>
            Zdroje dat ({formData.sources.length})
          </button>

          {/* MagicGate tab - appears if at least one record contains settings: 'magicgate' */}
          {hasMagicGateItem && (
            <button
              onClick={() => setActiveTab('magicgate')}
              className={`py-3 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
                activeTab === 'magicgate'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className="material-symbols-outlined text-lg">security</span>
              MagicGate účet
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                Aktivní
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === 'general'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-lg">tune</span>
            Obecné a aktualizace
          </button>

          <button
            onClick={() => setActiveTab('help')}
            className={`py-3 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === 'help'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-lg">help</span>
            Nápověda a zkratky
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Sources */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Importované JSON zdroje a API</h3>
                  <p className="text-xs text-gray-400">
                    Aplikace stahuje a spojuje data ze všech povolených zdrojů do lokální mezipaměti.
                  </p>
                  {formData.lastSyncTime && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-300">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>Poslední synchronizace: <strong className="font-mono">{formData.lastSyncTime}</strong></span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsAddingSource('file');
                      setEditingSource({ ...initialFileSource });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                  >
                    <span className="material-symbols-outlined text-sm">description</span>
                    Přidat JSON soubor
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingSource('api');
                      setEditingSource({ ...initialApiSource });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                  >
                    <span className="material-symbols-outlined text-sm">api</span>
                    Přidat API endpoint
                  </button>
                </div>
              </div>

              {/* Real-time sync progress bar */}
              {syncProgress && (
                <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
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
                  <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${syncProgress.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Source Edit / Add Modal Form */}
              {(isAddingSource || editingSource) && (
                <div className="p-4 bg-white/[0.04] border border-indigo-500/40 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-semibold text-sm text-indigo-300">
                      {editingSource?.type === 'file' ? 'Konfigurace lokálního souboru' : 'Konfigurace API zdroje'}
                    </span>
                    <button
                      onClick={() => {
                        setEditingSource(null);
                        setIsAddingSource(null);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Název zdroje</label>
                      <input
                        type="text"
                        value={editingSource?.name || ''}
                        onChange={(e) => setEditingSource({ ...editingSource!, name: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                        placeholder="Např. Firemní záložky"
                      />
                    </div>

                    {editingSource?.type === 'file' ? (
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-300 mb-1">Cesta k JSON souboru na disku</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={(editingSource as FileSource).path || ''}
                            onChange={(e) =>
                              setEditingSource({ ...(editingSource as FileSource), path: e.target.value })
                            }
                            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                            placeholder="C:\cesta\k\souboru.json"
                          />
                          <button
                            type="button"
                            onClick={handlePickLocalFile}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition"
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
                            onChange={(e) =>
                              setEditingSource({ ...(editingSource as ApiSource), url: e.target.value })
                            }
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                            placeholder="https://api.example.com/items"
                          />
                        </div>

                        <div>
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
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSource(null);
                        setIsAddingSource(null);
                      }}
                      className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
                    >
                      Zrušit
                    </button>
                    <button
                      type="button"
                      onClick={() => editingSource && handleSaveSource(editingSource)}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition"
                    >
                      Uložit zdroj
                    </button>
                  </div>
                </div>
              )}

              {/* Source List */}
              <div className="space-y-2">
                {formData.sources.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-gray-400 text-sm">
                    Zatím nejsou přidány žádné zdroje dat. Přidejte lokální JSON soubor nebo API.
                  </div>
                ) : (
                  formData.sources.map((src) => (
                    <div
                      key={src.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                        src.enabled
                          ? 'bg-white/[0.02] border-white/10'
                          : 'bg-black/20 border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`material-symbols-outlined p-2 rounded-lg ${
                            src.type === 'file'
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'bg-cyan-500/10 text-cyan-400'
                          }`}
                        >
                          {src.type === 'file' ? 'description' : 'api'}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">{src.name}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                              {src.type}
                            </span>
                            {src.type === 'api' && (src as ApiSource).authType === 'getToken' && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                                getToken auth
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono truncate max-w-md mt-0.5">
                            {src.type === 'file' ? (src as FileSource).path : (src as ApiSource).url}
                          </p>
                          {src.lastSync && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              Poslední synchronizace: {src.lastSync} • {src.itemCount ?? 0} položek
                            </p>
                          )}
                          {src.error && (
                            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">error</span>
                              {src.error}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSource(src.id)}
                          onMouseEnter={() => setHoveredEyeId(src.id)}
                          onMouseLeave={() => setHoveredEyeId(null)}
                          title={src.enabled ? 'Aktivní (kliknutím vypnete)' : 'Vypnuto (kliknutím aktivujete)'}
                          className={`p-1.5 rounded-lg border transition-all duration-150 flex items-center justify-center cursor-pointer ${
                            (src.enabled && hoveredEyeId !== src.id) || (!src.enabled && hoveredEyeId === src.id)
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">
                            {(src.enabled && hoveredEyeId !== src.id) || (!src.enabled && hoveredEyeId === src.id)
                              ? 'visibility'
                              : 'visibility_off'}
                          </span>
                        </button>
                        <button
                          onClick={() => setEditingSource(src)}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                          title="Upravit"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSource(src.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition"
                          title="Smazat"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Sync Trigger button */}
              <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-white/5">
                <div className="text-xs text-gray-400 flex flex-col gap-0.5">
                  <span>
                    Celkem načteno položek v lokální databázi: <strong className="text-white">{items.length}</strong>
                  </span>
                  {formData.lastSyncTime && (
                    <span className="text-gray-400">
                      Poslední aktualizace: <strong className="text-indigo-300 font-mono">{formData.lastSyncTime}</strong>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onTriggerSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>
                    sync
                  </span>
                  {isSyncing ? 'Probíhá synchronizace...' : 'Spustit synchronizaci nyní'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MagicGate Credentials */}
          {activeTab === 'magicgate' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                  Detekován záznam MagicGate v datech
                </div>
                <p className="text-xs text-gray-300">
                  Tato sekce se zobrazila automaticky, protože importovaná data obsahují položku s identifikátorem <code>settings: "magicgate"</code>. Zde zadané přihlašovací údaje budou uloženy lokálně.
                </p>
              </div>

              <div className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">MagicGate Uživatelské jméno</label>
                  <input
                    type="text"
                    value={formData.magicgate?.username || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        magicgate: { ...formData.magicgate, username: e.target.value },
                      })
                    }
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    placeholder="Uživatelské jméno pro MagicGate"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">MagicGate Heslo</label>
                  <input
                    type="password"
                    value={formData.magicgate?.password || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        magicgate: { ...formData.magicgate, password: e.target.value },
                      })
                    }
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    placeholder="••••••••••••"
                  />
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
                <p className="text-xs text-gray-400">
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
                            ? 'bg-indigo-950/60 border-indigo-400 ring-2 ring-indigo-500/50 text-indigo-200 shadow-lg shadow-indigo-500/20'
                            : 'bg-black/30 border-white/10 text-white hover:border-white/20'
                        }`}
                        placeholder="Klikněte pro nastavení zkratky"
                      />
                    </div>
                    <span className="text-xs text-gray-400">
                      {isRecordingHotkey ? (
                        <span className="text-indigo-400 font-medium animate-pulse">
                          Stiskněte klávesovou kombinaci (např. Ctrl+Alt+Space). Esc zruší.
                        </span>
                      ) : (
                        <span>Klikněte do pole a stiskněte kombinaci kláves (nelze vepisovat text)</span>
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
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div>
                  <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-indigo-400">palette</span>
                    Hlavní barva aplikace (Zvýraznění)
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Nastavení barvy tlačítek, aktivních záložek a prvků. Semaforové stavové barvy (zelená, červená, oranžová) zůstávají beze změny.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                  {/* Native color picker box */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 shadow-inner flex items-center justify-center cursor-pointer hover:scale-105 transition">
                      <input
                        type="color"
                        value={formData.primaryColor || '#6366f1'}
                        onInput={(e) => {
                          const val = (e.target as HTMLInputElement).value;
                          setFormData((prev) => ({ ...prev, primaryColor: val }));
                          applyPrimaryColor(val);
                          handleSave({ ...formData, primaryColor: val });
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = { ...formData, primaryColor: val };
                          setFormData(updated);
                          applyPrimaryColor(val);
                          handleSave(updated);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: formData.primaryColor || '#6366f1' }}
                      />
                    </div>

                    {/* Hex text input */}
                    <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-3 py-2 w-32 focus-within:border-indigo-500 transition">
                      <span className="text-gray-400 font-mono text-sm mr-1">#</span>
                      <input
                        type="text"
                        maxLength={6}
                        value={(formData.primaryColor || '#6366f1').replace(/^#/, '')}
                        onChange={(e) => {
                          const hexOnly = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                          const newColor = `#${hexOnly}`;
                          const updated = { ...formData, primaryColor: newColor };
                          setFormData(updated);
                          if (hexOnly.length === 6 || hexOnly.length === 3) {
                            applyPrimaryColor(newColor);
                            handleSave(updated);
                          }
                        }}
                        className="w-full bg-transparent text-sm font-mono text-white outline-none uppercase"
                        placeholder="6366F1"
                      />
                    </div>
                  </div>

                  {/* Preset quick colors */}
                  <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                    {[
                      { name: 'Indigo', hex: '#6366f1' },
                      { name: 'Modrá', hex: '#3b82f6' },
                      { name: 'Fialová', hex: '#8b5cf6' },
                      { name: 'Růžová', hex: '#ec4899' },
                      { name: 'Tyrkysová', hex: '#06b6d4' },
                      { name: 'Smaragdová', hex: '#10b981' },
                      { name: 'Oranžová', hex: '#f97316' },
                    ].map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => {
                          const updated = { ...formData, primaryColor: preset.hex };
                          setFormData(updated);
                          applyPrimaryColor(preset.hex);
                          handleSave(updated);
                        }}
                        title={preset.name}
                        className={`w-6 h-6 rounded-full transition transform hover:scale-110 flex items-center justify-center ${
                          (formData.primaryColor || '#6366f1').toLowerCase() === preset.hex.toLowerCase()
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-[#181920]'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Updates Section */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg text-indigo-400">system_update</span>
                      Aktualizace aplikace & Verze
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Aplikace kontroluje dostupnost nových verzí každých 24 hodin na pozadí.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-indigo-300">
                      v{CURRENT_APP_VERSION}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowChangelog(true)}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition"
                    >
                      <span className="material-symbols-outlined text-sm">history_edu</span>
                      Kompletní changelog
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">URL pro kontrolu verze (JSON)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.updateUrl}
                      onChange={(e) => setFormData({ ...formData, updateUrl: e.target.value })}
                      className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-indigo-500 outline-none"
                      placeholder="https://example.com/updates/iadonkey-version.json"
                    />
                    <button
                      type="button"
                      onClick={onCheckUpdate}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition"
                    >
                      Zkontrolovat nyní
                    </button>
                    {onSimulateUpdate && (
                      <button
                        type="button"
                        onClick={() => {
                          onSimulateUpdate({
                            hasUpdate: true,
                            latestVersion: '0.1.2',
                            currentVersion: CURRENT_APP_VERSION,
                            releaseNotes: '• Přidána nová položka v nastavení: výběr barev aplikace s živým náhledem\n• Ochrana proti nechtěnému stisku jediné klávesy při nastavování zkratky\n• Nové přehlednější ikony pro lokální JSON soubory a tlačítka v nastavení\n• Zrychlený start okna nastavení bez problikávání barev',
                            downloadUrl: 'https://github.com/iadonkey/launcher/releases',
                          });
                        }}
                        title="Simulovat detekci nové verze pro otestování dialogu aktualizace"
                        className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-lg text-xs font-medium border border-indigo-500/30 transition flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">science</span>
                        Simulovat aktualizaci (0.1.2)
                      </button>
                    )}
                  </div>
                  {updateStatusMessage && (
                    <p className="text-xs text-indigo-300 mt-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">info</span>
                      {updateStatusMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Help & Shortcuts */}
          {activeTab === 'help' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-semibold text-white text-base">Nápověda a klávesové zkratky</h3>
                <p className="text-xs text-gray-400">
                  Přehled ovládání, navigačních kláves a integrovaných funkcí launcheru IADonkey.
                </p>
              </div>

              {/* Section 1: Shortcuts */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">keyboard</span>
                  Ovládání a klávesové zkratky
                </h4>

                <div className="divide-y divide-white/5 text-xs">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Otevřít / Spustit položku</span>
                      <p className="text-gray-400 text-[11px]">Provede výchozí akci (otevření URL, spuštění programu, kopírování výsledku).</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">Enter</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Vstup do podpoložek</span>
                      <p className="text-gray-400 text-[11px]">Rozbalí vnořené možnosti (options) vybrané položky se samostatným vyhledáváním.</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">Shift + Enter</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Rychlé spuštění 1. podpoložky</span>
                      <p className="text-gray-400 text-[11px]">Okamžitě provede akci první podpoložky bez nutnosti jejího rozbalování.</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">Ctrl + Enter</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Zpět / Zavřít okno</span>
                      <p className="text-gray-400 text-[11px]">V podpoložkách vás vrátí zpět na původní hledání, v hlavním seznamu skryje IADonkey.</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">Escape</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Pohyb ve výběru položek</span>
                      <p className="text-gray-400 text-[11px]">Listování nahoru a dolů v seznamu nalezených výsledků.</p>
                    </div>
                    <div className="flex gap-1.5">
                      <kbd className="px-2 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">↑</kbd>
                      <kbd className="px-2 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">↓</kbd>
                    </div>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Globální vyvolání launcheru</span>
                      <p className="text-gray-400 text-[11px]">Aktivuje nebo skryje vyhledávací okno odkudkoliv ze systému Windows.</p>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <span className="material-symbols-outlined text-base">calculate</span>
                      Kalkulačka
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Zadejte matematický výraz (např. <code className="bg-white/10 px-1 rounded">25 * 4 + 10</code> nebo <code className="bg-white/10 px-1 rounded">1200 * 1.21</code>). Stiskem Enter se výsledek zkopíruje do schránky.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-400 font-semibold">
                      <span className="material-symbols-outlined text-base">link</span>
                      Rychlé URL
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Napište libovolnou webovou adresu (např. <code className="bg-white/10 px-1 rounded">seznam.cz</code>). Stiskem Enter ji rovnou otevřete ve vašem výchozím prohlížeči.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold">
                      <span className="material-symbols-outlined text-base">security</span>
                      MagicGate přihlášení
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      U položek se <code className="bg-white/10 px-1 rounded">settings: "magicgate"</code> aplikace provede tichý handshake a otevře instanci IS Tour v prohlížeči již plně přihlášenou.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium animate-fade-in">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Změny byly úspěšně uloženy
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition"
            >
              Zavřít
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition"
            >
              Uložit nastavení
            </button>
          </div>
        </div>

        {/* Full Changelog Modal */}
        {showChangelog && (
          <ChangelogModal onClose={() => setShowChangelog(false)} />
        )}
      </div>
    );
  };
