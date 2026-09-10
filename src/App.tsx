import React, { useState, useEffect } from 'react';
import { LauncherItem, AppConfig, UpdateInfo, SyncProgress } from './types';
import { SearchSpotlight } from './components/SearchSpotlight';
import { SettingsModal } from './components/SettingsModal';
import { UpdateDialog } from './components/UpdateDialog';
import { WhatsNewModal } from './components/WhatsNewModal';
import { ChangelogModal } from './components/ChangelogModal';
import { CURRENT_APP_VERSION, getLatestRelease } from './changelog';
import { applyPrimaryColor } from './utils/theme';

const DEFAULT_CONFIG: AppConfig = {
  hotkey: 'Ctrl+Alt+Space',
  sources: [],
  magicgate: {
    username: '',
    password: '',
  },
  updateUrl: 'https://raw.githubusercontent.com/magicware/IADonkey/main/version.json',
  lastDeclinedVersion: null,
  lastDeclinedTime: null,
  autoSyncIntervalMinutes: 30,
  primaryColor: '#6366f1',
  lastSeenVersion: null,
};

export const App: React.FC = () => {
  const [isSettingsView, setIsSettingsView] = useState(() => {
    return window.location.hash === '#settings' || window.location.search.includes('window=settings');
  });

  const [items, setItems] = useState<LauncherItem[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);
  const [isInitialReady, setIsInitialReady] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  // Hash listener for hot-reload or navigation
  useEffect(() => {
    const handleHash = () => {
      setIsSettingsView(window.location.hash === '#settings' || window.location.search.includes('window=settings'));
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Synchronize dynamic primary color CSS variables
  useEffect(() => {
    applyPrimaryColor(config.primaryColor);
  }, [config.primaryColor]);

  // Initial load
  useEffect(() => {
    async function loadData() {
      if (window.electronAPI) {
        try {
          const cfg = await window.electronAPI.getConfig();
          if (cfg) {
            setConfig(cfg);
            applyPrimaryColor(cfg.primaryColor);
            if (!isSettingsView && cfg.lastSeenVersion !== CURRENT_APP_VERSION) {
              setShowWhatsNew(true);
            }
          }
          const cachedItems = await window.electronAPI.getItems();
          setItems(cachedItems || []);
        } catch (err) {
          console.error('Failed to load initial config or items:', err);
        } finally {
          setIsInitialReady(true);
        }
      } else {
        setIsInitialReady(true);
      }
    }
    loadData();

    // Listen to IPC events from main process
    const cleanupDataListener = window.electronAPI?.onDataUpdated?.((newItems: LauncherItem[]) => {
      setItems(newItems);
      setIsSyncing(false);
    });

    const cleanupConfigListener = window.electronAPI?.onConfigUpdated?.((newConfig: AppConfig) => {
      if (newConfig) setConfig(newConfig);
    });

    const cleanupSettingsListener = window.electronAPI?.onOpenSettingsRequest?.(() => {
      window.electronAPI?.openSettingsWindow?.();
    });

    const cleanupUpdateListener = window.electronAPI?.onUpdateAvailable?.((info: UpdateInfo) => {
      setUpdateInfo(info);
    });

    const cleanupProgressListener = window.electronAPI?.onSyncProgress?.((prog: SyncProgress) => {
      setSyncProgress(prog);
      if (prog.isComplete) {
        setTimeout(() => setSyncProgress(null), 2000);
      }
    });

    return () => {
      cleanupDataListener?.();
      cleanupConfigListener?.();
      cleanupSettingsListener?.();
      cleanupUpdateListener?.();
      cleanupProgressListener?.();
    };
  }, []);

  const handleSaveConfig = async (newConfig: AppConfig) => {
    setConfig(newConfig);
    if (window.electronAPI) {
      await window.electronAPI.saveConfig(newConfig);
    }
  };

  const handleRefreshData = async () => {
    setIsSyncing(true);
    if (window.electronAPI) {
      try {
        const freshItems = await window.electronAPI.syncNow();
        setItems(freshItems || []);
      } catch (err) {
        console.error('Sync failed:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleCheckUpdate = async () => {
    setUpdateStatusMessage('Zjišťuji dostupnost nové verze...');
    if (window.electronAPI) {
      try {
        const info = await window.electronAPI.checkUpdate();
        if (info.hasUpdate) {
          setUpdateInfo(info);
          setUpdateStatusMessage(`K dispozici nová verze: ${info.latestVersion}`);
        } else {
          setUpdateStatusMessage(`Máte aktuální verzi (${info.currentVersion}).`);
          setTimeout(() => setUpdateStatusMessage(null), 4000);
        }
      } catch (err: any) {
        setUpdateStatusMessage(`Chyba kontroly aktualizace: ${err?.message || err}`);
      }
    }
  };

  const handleAcceptUpdate = () => {
    if (updateInfo?.downloadUrl && window.electronAPI) {
      window.electronAPI.openExternal(updateInfo.downloadUrl);
    }
    setUpdateInfo(null);
  };

  const handleDeclineUpdate = async () => {
    if (updateInfo && config && window.electronAPI) {
      const updatedConfig: AppConfig = {
        ...config,
        lastDeclinedVersion: updateInfo.latestVersion,
        lastDeclinedTime: Date.now(),
      };
      await window.electronAPI.saveConfig(updatedConfig);
      setConfig(updatedConfig);
    }
    setUpdateInfo(null);
  };

  const handleDismissWhatsNew = async () => {
    setShowWhatsNew(false);
    if (config && window.electronAPI) {
      const updatedConfig: AppConfig = {
        ...config,
        lastSeenVersion: CURRENT_APP_VERSION,
      };
      setConfig(updatedConfig);
      await window.electronAPI.saveConfig(updatedConfig);
    }
  };

  // Dedicated Settings Window mode
  if (isSettingsView) {
    if (!isInitialReady) {
      return (
        <main className="w-full h-screen bg-[#181920] flex flex-col items-center justify-center text-gray-400 gap-3 select-none">
          <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-indigo-500 animate-spin" />
          <span className="text-xs font-medium tracking-wide text-gray-400">Načítám nastavení...</span>
        </main>
      );
    }

    return (
      <main className="w-full h-screen bg-[#181920] overflow-hidden text-gray-200">
        <SettingsModal
          config={config}
          items={items}
          onSaveConfig={handleSaveConfig}
          onClose={() => window.close()}
          onTriggerSync={handleRefreshData}
          onCheckUpdate={handleCheckUpdate}
          isSyncing={isSyncing}
          syncProgress={syncProgress}
          updateStatusMessage={updateStatusMessage}
        />
        {/* Update Dialog in settings view if simulated */}
        {updateInfo && (
          <UpdateDialog
            updateInfo={updateInfo}
            onAccept={handleAcceptUpdate}
            onDecline={handleDeclineUpdate}
          />
        )}
      </main>
    );
  }

  // Floating Spotlight Search Bar mode
  return (
    <main
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          window.electronAPI?.hideWindow?.();
        }
      }}
      className="w-full h-screen p-2 flex flex-col justify-start select-none bg-transparent"
    >
      {/* Search Bar & Autocomplete list */}
      <SearchSpotlight
        items={items}
        mlogBaseUrl={config?.mlog?.baseUrl}
        onOpenSettings={() => {
          if (window.electronAPI?.openSettingsWindow) {
            window.electronAPI.openSettingsWindow();
          } else {
            setShowSettings(true);
          }
        }}
        onRefreshData={handleRefreshData}
        isSyncing={isSyncing}
        syncProgress={syncProgress}
        lastSyncTime={config.lastSyncTime}
      />

      {/* Fallback modal if not in dedicated window */}
      {showSettings && (
        <SettingsModal
          config={config}
          items={items}
          onSaveConfig={handleSaveConfig}
          onClose={() => setShowSettings(false)}
          onTriggerSync={handleRefreshData}
          onCheckUpdate={handleCheckUpdate}
          isSyncing={isSyncing}
          syncProgress={syncProgress}
          updateStatusMessage={updateStatusMessage}
        />
      )}

      {/* Update Dialog */}
      {updateInfo && (
        <UpdateDialog
          updateInfo={updateInfo}
          onAccept={handleAcceptUpdate}
          onDecline={handleDeclineUpdate}
        />
      )}

      {/* What's New Dialog on first launch after update */}
      {showWhatsNew && (
        <WhatsNewModal
          release={getLatestRelease()}
          onDismiss={handleDismissWhatsNew}
          onOpenFullChangelog={() => setShowChangelog(true)}
        />
      )}

      {/* Complete Changelog Modal */}
      {showChangelog && (
        <ChangelogModal onClose={() => setShowChangelog(false)} />
      )}
    </main>
  );
};
