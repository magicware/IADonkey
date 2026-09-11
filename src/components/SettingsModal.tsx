import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppConfig, DataSource, FileSource, ApiSource, LauncherItem, SyncProgress, UpdateInfo, SourceFieldMapping, MappingTargetKey } from '../types';
import { applyPrimaryColor } from '../utils/theme';
import { formatLastSyncDate } from '../utils/dateHelper';
import { CURRENT_APP_VERSION } from '../changelog';
import { ChangelogModal } from './ChangelogModal';
import { SearchItemsViewerModal } from './SearchItemsViewerModal';
import { SEARCH_ENGINES } from '../constants/searchEngines';
import { getDynamicSnippets } from '../utils/snippets';

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
  const [activeTab, setActiveTab] = useState<'sources' | 'magicgate' | 'mlog' | 'general' | 'updates' | 'help'>('sources');
  const [formData, setFormData] = useState<AppConfig>(config);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [isAddingSource, setIsAddingSource] = useState<'file' | 'api' | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showItemsViewer, setShowItemsViewer] = useState(false);
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [recordedModifiers, setRecordedModifiers] = useState<string[]>([]);
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);
  const [hoveredEyeId, setHoveredEyeId] = useState<string | null>(null);
  const [copiedSourceId, setCopiedSourceId] = useState<string | null>(null);
  const [detectedKeys, setDetectedKeys] = useState<string[]>([]);
  const [sampleRecord, setSampleRecord] = useState<Record<string, any> | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const maxComboRef = useRef<string[]>([]);
  const originalHotkeyRef = useRef<string>(config.hotkey || 'Ctrl+Alt+Space');

  // Compute indexed search items counts (main items, subitems, dynamic system snippets, and total)
  const { mainItemsCount, subItemsCount, snippetsCount, totalIndexedCount } = useMemo(() => {
    const mainCount = items.length;
    const subCount = items.reduce((acc, it) => acc + (it.options?.length || 0), 0);
    const snipCount = getDynamicSnippets(':', formData.snippets).length;
    return {
      mainItemsCount: mainCount,
      subItemsCount: subCount,
      snippetsCount: snipCount,
      totalIndexedCount: mainCount + subCount + snipCount,
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
  }, [config, isRecordingHotkey]);

  // Clean up global hotkey pause if component unmounts
  useEffect(() => {
    return () => {
      window.electronAPI?.resumeGlobalHotkey?.();
    };
  }, []);

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

  const handleSave = (customConfig?: AppConfig) => {
    const toSave = customConfig || formData;
    onSaveConfig(toSave);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
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
    const selectedPath = await window.electronAPI?.selectJsonFile?.();
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
                    <span className="material-symbols-outlined text-base text-amber-400">tune</span>
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
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg transition cursor-pointer disabled:opacity-50"
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

                        {isFixed && (!isActionField || (rule?.value !== 'open' && rule?.value !== 'copy')) && (
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

                {/* Live preview */}
                {sampleRecord && (
                  <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      Náhled 1. položky s aktuálním mapováním:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300 font-mono pt-1">
                      <div><strong className="text-gray-400 font-sans">Název:</strong> {getMappedPreviewValue('name', 'Položka bez názvu')}</div>
                      <div><strong className="text-gray-400 font-sans">Cesta:</strong> {getMappedPreviewValue('location', '(žádná)')}</div>
                      <div><strong className="text-gray-400 font-sans">Ikona:</strong> {getMappedPreviewValue('icon', 'code')}</div>
                      <div><strong className="text-gray-400 font-sans">Akce:</strong> {getMappedPreviewValue('action', 'open')}</div>
                    </div>
                  </div>
                )}
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

          {/* MagicGate tab */}
          <button
            type="button"
            onClick={() => setActiveTab('magicgate')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer ${
              activeTab === 'magicgate'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl text-indigo-400">security</span>
              <span>MagicGate</span>
            </div>
            {formData.magicgate?.username?.trim() || formData.magicgate?.xmlPath?.trim() ? (
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                Aktivní
              </span>
            ) : null}
          </button>

          {/* MLog tab */}
          <button
            type="button"
            onClick={() => setActiveTab('mlog')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition cursor-pointer ${
              activeTab === 'mlog'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl text-indigo-400">support_agent</span>
              <span>MLog</span>
            </div>
            {formData.mlog?.baseUrl?.trim() ? (
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                Aktivní
              </span>
            ) : null}
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
            ) : updateStatusMessage ? (
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
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
            <span>Nápověda a zkratky</span>
          </button>
        </nav>

        {/* Sidebar Footer Info */}
        {formData.lastSyncTime && (
          <div className="px-4 py-3 shrink-0">
            <div className="w-16 h-[1px] bg-white/10 mx-auto mb-3" />
            <div className="flex flex-col items-center justify-center text-center gap-1 text-xs">
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="material-symbols-outlined text-base text-white">schedule</span>
                <span className="font-medium leading-tight">Poslední aktualizace</span>
              </div>
              <span className="text-white font-bold font-mono text-xs leading-tight">
                {formatLastSyncDate(formData.lastSyncTime)}
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Right Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#181920]">
        {/* Right Pane Header */}
        <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              {activeTab === 'sources' && 'Zdroje dat a mezipaměť'}
              {activeTab === 'magicgate' && 'MagicGate přihlašovací údaje'}
              {activeTab === 'mlog' && 'MLog Helpdesk'}
              {activeTab === 'general' && 'Obecné nastavení aplikace'}
              {activeTab === 'updates' && 'Aktualizace aplikace'}
              {activeTab === 'help' && 'Nápověda a klávesové zkratky'}
            </h2>
            <p className="text-[13px] text-gray-400 mt-1">
              {activeTab === 'sources' && 'Správa lokálních JSON souborů a vzdálených API endpointů'}
              {activeTab === 'magicgate' && 'Konfigurace tichého přihlášení pro instanci IS Tour'}
              {activeTab === 'mlog' && 'Nastavení Base URL pro rychlé otevírání požadavků a úkolů'}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Sources */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              {/* Alert banner for last synchronization */}
              {formData.lastSyncTime && (
                <div
                  className="p-3.5 rounded-xl border flex items-center gap-3 text-[13px] font-medium animate-fade-in"
                  style={{
                    backgroundColor: `${formData.primaryColor || '#6366f1'}15`,
                    borderColor: `${formData.primaryColor || '#6366f1'}35`,
                    color: formData.primaryColor || '#6366f1',
                  }}
                >
                  <span className="material-symbols-outlined text-lg shrink-0">schedule</span>
                  <span className="text-gray-300">
                    Poslední aktualizace proběhla: <strong className="font-mono text-white ml-1">{formatLastSyncDate(formData.lastSyncTime)}</strong>
                  </span>
                </div>
              )}

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
                  <div className="flex items-center gap-2">
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
                  </div>
                  <button
                    type="button"
                    onClick={onTriggerSync}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[13px] font-medium transition disabled:opacity-50 cursor-pointer shrink-0"
                    title="Spustit synchronizaci dat ze všech povolených zdrojů"
                  >
                    <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin' : ''}`}>
                      sync
                    </span>
                    <span>{isSyncing ? 'Probíhá synchronizace...' : 'Spustit synchronizaci'}</span>
                  </button>
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
                <div className="p-4 rounded-xl bg-white/[0.03] border border-indigo-500/40 shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg text-indigo-400">
                        {isAddingSource === 'file' ? 'description' : 'api'}
                      </span>
                      {isAddingSource === 'file' ? 'Nový lokální JSON soubor' : 'Nový API endpoint'}
                    </h4>
                    <button
                      type="button"
                      onClick={handleCloseSourceForm}
                      className="text-gray-400 hover:text-white transition"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                  {renderSourceForm(false)}
                </div>
              )}

              {/* Sources List */}
              <div className="space-y-2.5">
                {formData.sources.length === 0 ? (
                  <div className="p-8 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-xl space-y-2">
                    <span className="material-symbols-outlined text-3xl text-gray-400">folder_open</span>
                    <p className="text-[13px] text-gray-300 font-medium">Zatím nejsou přidány žádné zdroje dat.</p>
                    <p className="text-xs text-gray-400">
                      Přidejte první lokální soubor nebo vzdálené API pomocí tlačítek výše.
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
                            ? 'bg-white/[0.04] border-indigo-500/40 shadow-sm'
                            : src.enabled
                            ? 'bg-white/[0.02] border-white/10'
                            : 'bg-black/20 border-white/5 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="material-symbols-outlined p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 text-xl">
                              {src.type === 'file' ? 'description' : 'api'}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-white">{src.name}</span>
                                <span className="text-[11px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                                  {src.type}
                                </span>
                                {src.type === 'api' && (src as ApiSource).authType === 'getToken' && (
                                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                                    getToken auth
                                  </span>
                                )}
                                {src.mapping && Object.keys(src.mapping).length > 0 && (
                                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" title="Vlastní mapování polí je aktivní">
                                    Mapováno ({Object.keys(src.mapping).length})
                                  </span>
                                )}
                              </div>
                              <p className="text-[13px] text-gray-400 font-mono truncate max-w-md mt-0.5">
                                {src.type === 'file' ? (src as FileSource).path : (src as ApiSource).url}
                              </p>
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
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
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
                            {renderSourceForm(true)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Database items count info footer with items viewer button */}
              <div className="pt-4 flex items-center justify-between border-t border-white/10 text-xs text-gray-400 gap-4 flex-wrap">
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
            </div>
          )}

          {/* TAB 2: MagicGate Credentials */}
          {activeTab === 'magicgate' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-indigo-400">security</span>
                  Přihlašovací údaje MagicGate
                </h3>
                <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                  Nastavení přihlašovacích údajů pro automatické přihlašování do instancí IS Tour (položky s parametrem <code className="bg-white/10 px-1 rounded text-indigo-300">settings: "magicgate"</code>). Zadané přihlašovací údaje jsou bezpečně uloženy v lokální konfiguraci.
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
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
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
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {/* MagicGate XML Deployment Config */}
              <div className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <div>
                  <h4 className="font-semibold text-sm text-white flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-lg text-indigo-400">code_blocks</span>
                    Konfigurační XML soubor instancí (Deploy Config)
                  </h4>
                  <p className="text-[13px] text-gray-400 mb-3 leading-relaxed">
                    Vyberte XML soubor s definicí serverů a instancí. IADonkey z něj automaticky vyextrahuje jednotlivé instance
                    jako hlavní položky s akcí MagicGate a jejich dílčí aplikace (Administrace, Web, API, BO) jako podpoložky s faviconou.
                    Servery a instance s označením <span className="font-mono text-indigo-300">Bench</span> jsou automaticky vynechány.
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
                      className="h-[38px] flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                      placeholder="C:\deploy\DeployConfig.xml"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.electronAPI?.selectXmlFile) {
                          const selected = await window.electronAPI.selectXmlFile();
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
                      className="h-[38px] px-3.5 border border-indigo-500/40 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white rounded-lg text-[13px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
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

          {/* TAB MLog */}
          {activeTab === 'mlog' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-indigo-400">support_agent</span>
                  Propojení s MLog
                </h3>
                <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                  Nastavte základní webovou adresu (Base URL) vašeho helpdesku MLog. Po nastavení můžete ve vyhledávači
                  rovnou zadat kód požadavku (např. <strong className="font-mono text-indigo-300">R1234</strong>) nebo
                  úkolu (např. <strong className="font-mono text-indigo-300">T5678</strong>) a stiskem Enter
                  přímo otevřít detail v prohlížeči.
                </p>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                    Základní webová adresa MLogu (Base URL)
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
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                    placeholder="https://mlog.magicware.cz"
                  />
                  <span className="text-xs text-gray-400 mt-1.5 block">
                    Zadejte adresu včetně protokolu (např. https://mlog.magicware.cz). Pokud pole necháte prázdné, detekce je vypnutá.
                  </span>
                </div>

                {formData.mlog?.baseUrl?.trim() ? (
                  <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-lg text-[13px] space-y-1.5">
                    <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      Detekce je aktivní pro následující vzory:
                    </p>
                    <ul className="list-disc list-inside text-gray-300 space-y-0.5 pl-1">
                      <li>
                        Zadání <code className="text-white font-mono bg-black/30 px-1 py-0.5 rounded">R2345</code> otevře{' '}
                        <span className="font-mono text-indigo-300">
                          {formData.mlog.baseUrl.trim().replace(/\/+$/, '')}/R2345
                        </span>
                      </li>
                      <li>
                        Zadání <code className="text-white font-mono bg-black/30 px-1 py-0.5 rounded">T7821</code> otevře{' '}
                        <span className="font-mono text-indigo-300">
                          {formData.mlog.baseUrl.trim().replace(/\/+$/, '')}/T7821
                        </span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-gray-400">
                    Detekce je v tuto chvíli vypnutá. Pro její aktivaci vyplňte webovou adresu MLogu výše.
                  </div>
                )}
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
                  <p className="text-[13px] text-gray-400 mt-1">
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
                    <div className="flex flex-col">
                      <span className="font-mono text-sm text-white font-semibold">
                        {(formData.primaryColor || '#6366f1').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">Vyberte odstín</span>
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

              {/* Pre-defined variable snippets */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div>
                  <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-indigo-400">draw</span>
                    Předem definované variabilní snippety
                  </h4>
                  <p className="text-[13px] text-gray-400 mt-1 max-w-xl leading-relaxed">
                    Nastavení obsahu pro textové zkratky vkládané přes dvojtečku (např. <code className="text-indigo-300 font-mono bg-white/5 px-1 py-0.5 rounded">:podpis</code>, <code className="text-indigo-300 font-mono bg-white/5 px-1 py-0.5 rounded">:sign</code> nebo <code className="text-indigo-300 font-mono bg-white/5 px-1 py-0.5 rounded">:signature</code>).
                  </p>
                </div>

                <div className="space-y-2 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-medium text-gray-200">
                      Vlastní podpis (<span className="text-indigo-300 font-mono">:podpis</span>, <span className="text-indigo-300 font-mono">:sign</span>, <span className="text-indigo-300 font-mono">:signature</span>)
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
                    <div className="mt-1.5">
                      <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Aktuální sestavení
                      </span>
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
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">Enter</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Vstup do podpoložek</span>
                      <p className="text-gray-400 text-xs mt-0.5">Rozbalí vnořené možnosti (options) vybrané položky se samostatným vyhledáváním.</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">Shift + Enter</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Rychlé spuštění 1. podpoložky</span>
                      <p className="text-gray-400 text-xs mt-0.5">Okamžitě provede akci první podpoložky (lze také podržet Ctrl a kliknout myší).</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">Ctrl + Enter</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Rychlé spuštění 2. podpoložky</span>
                      <p className="text-gray-400 text-xs mt-0.5">Okamžitě provede akci druhé podpoložky (lze také podržet Alt a kliknout myší).</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">Alt + Enter</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Zpět / Zavřít okno</span>
                      <p className="text-gray-400 text-xs mt-0.5">V podpoložkách vás vrátí zpět na původní hledání, v hlavním seznamu skryje IADonkey.</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">Escape</kbd>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Pohyb ve výběru položek</span>
                      <p className="text-gray-400 text-xs mt-0.5">Listování nahoru a dolů v seznamu nalezených výsledků.</p>
                    </div>
                    <div className="flex gap-1.5">
                      <kbd className="px-2 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">↑</kbd>
                      <kbd className="px-2 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">↓</kbd>
                    </div>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">Zkopírování systémového snippetu</span>
                      <p className="text-gray-400 text-xs mt-0.5">Napište dvojtečku a klíčové slovo (např. :today, :now, :cas, :guid, :podpis) pro zkopírování hodnoty do schránky.</p>
                    </div>
                    <kbd className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-gray-200 font-semibold shadow-sm">:klicove_slovo</kbd>
                  </div>

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
                      Zadejte e-mailovou adresu (např. <code className="bg-white/10 px-1 rounded">jmeno@magicware.cz</code>). Stiskem Enter okamžitě otevřete okno nové zprávy v Gmailu s vyplněným příjemcem.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                      <span className="material-symbols-outlined text-base">support_agent</span>
                      MLog Helpdesk
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Zadejte kód požadavku (např. <code className="bg-white/10 px-1 rounded">R234</code>) nebo úkolu (např. <code className="bg-white/10 px-1 rounded">T7821</code>). Stiskem Enter se přímo otevře v MLogu (vyžaduje nastavenou Base URL v záložce MLog).
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold">
                      <span className="material-symbols-outlined text-base">security</span>
                      MagicGate přihlášení
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      U položek se <code className="bg-white/10 px-1 rounded">settings: "magicgate"</code> aplikace provede tichý handshake a otevře instanci IS Tour v prohlížeči již plně přihlášenou.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold">
                      <span className="material-symbols-outlined text-base">travel_explore</span>
                      Internetové vyhledávače
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Zadejte libovolný dotaz a na konci seznamu jej otevřete ve zvoleném vyhledávači. Kdykoliv můžete vyhledat přímo s prefixy: <code className="bg-white/10 px-1 rounded">g: dotaz</code> (Google), <code className="bg-white/10 px-1 rounded">s: dotaz</code> (Seznam) nebo <code className="bg-white/10 px-1 rounded">w: dotaz</code> (Wikipedie).
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
        />
      )}
    </div>
  );
};
