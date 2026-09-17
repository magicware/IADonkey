import React, { useState, useEffect, useMemo } from 'react';
import { LauncherItem, AppConfig, UpdateInfo, SyncProgress } from './types';
import { SearchSpotlight } from './components/SearchSpotlight';
import { SettingsModal } from './components/SettingsModal';
import { UpdateDialog } from './components/UpdateDialog';
import { WhatsNewModal } from './components/WhatsNewModal';
import { ChangelogModal } from './components/ChangelogModal';
import { GitCloneModal } from './components/GitCloneModal';
import { InstallerWizard } from './components/InstallerWizard';
import { UninstallerModal } from './components/UninstallerModal';
import { SplashScreen } from './components/SplashScreen';
import { CURRENT_APP_VERSION, getLatestRelease } from './changelog';
import { applyPrimaryColor, applyActionsColor } from './utils/theme';

const DEFAULT_CONFIG: AppConfig = {
  hotkey: 'Ctrl+Alt+Space',
  sources: [],
  magicgate: {
    username: '',
    password: '',
  },
  vscode: {
    path: '',
  },
  extensions: {
    magicgate: false,
    mlog: false,
    github: false,
    vscode: false,
  },
  updateUrl: 'https://raw.githubusercontent.com/magicware/IADonkey/main/version.json',
  lastDeclinedVersion: null,
  lastDeclinedTime: null,
  autoSyncIntervalMinutes: 30,
  primaryColor: '#6366f1',
  actionsColor: '#a855f7',
  lastSeenVersion: null,
  searchGoogle: true,
  defaultSearchEngine: 'google',
};

export const App: React.FC = () => {
  const [isInstallerMode] = useState(() => {
    return window.location.hash.startsWith('#installer') || window.location.search.includes('window=installer');
  });

  const [isUninstallMode] = useState(() => {
    return window.location.hash.startsWith('#uninstall') || window.location.search.includes('window=uninstall');
  });

  const [isSplashMode] = useState(() => {
    return window.location.hash.startsWith('#splash') || window.location.search.includes('window=splash');
  });

  const [isSettingsView, setIsSettingsView] = useState(() => {
    return window.location.hash === '#settings' || window.location.search.includes('window=settings');
  });

  const [isGitCloneView, setIsGitCloneView] = useState(() => {
    return window.location.hash.startsWith('#git-clone') || window.location.search.includes('window=git-clone');
  });

  const [isPowerView] = useState(() => {
    return window.location.hash.startsWith('#power') || window.location.search.includes('window=power');
  });

  const [gitCloneParams, setGitCloneParams] = useState(() => {
    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const sp = new URLSearchParams(hash.slice(qIndex + 1));
      return {
        repoName: sp.get('name') || '',
        repoUrl: sp.get('url') || '',
        recursive: sp.get('recursive') === '1' || sp.get('recursive') === 'true',
        isInstanceMode: sp.get('isInstanceMode') === '1' || sp.get('isInstanceMode') === 'true',
        adminUrl: sp.get('adminUrl') || '',
        targetDir: sp.get('targetDir') || '',
        repoLanguage: sp.get('repoLanguage') || '',
      };
    }
    const search = window.location.search;
    if (search) {
      const sp = new URLSearchParams(search);
      if (sp.has('recursive') || sp.has('name') || sp.has('isInstanceMode') || sp.has('targetDir')) {
        return {
          repoName: sp.get('name') || '',
          repoUrl: sp.get('url') || '',
          recursive: sp.get('recursive') === '1' || sp.get('recursive') === 'true',
          isInstanceMode: sp.get('isInstanceMode') === '1' || sp.get('isInstanceMode') === 'true',
          adminUrl: sp.get('adminUrl') || '',
          targetDir: sp.get('targetDir') || '',
          repoLanguage: sp.get('repoLanguage') || '',
        };
      }
    }
    return { repoName: '', repoUrl: '', recursive: false, isInstanceMode: false, adminUrl: '', targetDir: '', repoLanguage: '' };
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
      setIsGitCloneView(window.location.hash.startsWith('#git-clone') || window.location.search.includes('window=git-clone'));
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Listen to git-clone params updates if window was already open
  useEffect(() => {
    if (window.electronAPI?.onGitCloneParams) {
      const unsubscribe = window.electronAPI.onGitCloneParams((params: any) => {
        setGitCloneParams({
          repoName: params.repoName || '',
          repoUrl: params.repoUrl || '',
          recursive: Boolean(params.recursive ?? params.initialRecursive),
          isInstanceMode: Boolean(params.isInstanceMode),
          adminUrl: params.adminUrl || '',
          targetDir: params.targetDir || '',
          repoLanguage: params.repoLanguage || '',
        });
      });
      return () => unsubscribe();
    }
  }, []);

  // Synchronize dynamic primary and actions color CSS variables
  useEffect(() => {
    applyPrimaryColor(config.primaryColor);
    applyActionsColor(config.actionsColor);
  }, [config.primaryColor, config.actionsColor]);

  // Initial load
  useEffect(() => {
    async function loadData() {
      if (window.electronAPI) {
        try {
          const cfg = await window.electronAPI.getConfig();
          if (cfg) {
            setConfig(cfg);
            applyPrimaryColor(cfg.primaryColor);
            applyActionsColor(cfg.actionsColor);
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
        const freshConfig = await window.electronAPI.getConfig();
        if (freshConfig) setConfig(freshConfig);
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

  // Dedicated Installer Window mode
  if (isInstallerMode) {
    return <InstallerWizard />;
  }

  // Dedicated Uninstaller Window mode
  if (isUninstallMode) {
    return <UninstallerModal />;
  }

  // Dedicated Splash Screen Window mode
  if (isSplashMode) {
    return <SplashScreen />;
  }

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
          updateInfo={updateInfo}
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

  // Dedicated Git Clone Window mode
  if (isGitCloneView) {
    const baseCloneDir = config.github?.defaultCloneDir || '';
    const initialTargetDir =
      gitCloneParams.targetDir ||
      (gitCloneParams.isInstanceMode && baseCloneDir && gitCloneParams.repoName
        ? `${baseCloneDir.replace(/[\\/]+$/, '')}\\magicgate\\${gitCloneParams.repoName}`
        : baseCloneDir);

    return (
      <GitCloneModal
        isOpen={true}
        onClose={() => window.close()}
        repoName={gitCloneParams.repoName}
        repoUrl={gitCloneParams.repoUrl}
        defaultTargetDir={initialTargetDir}
        initialRecursive={gitCloneParams.recursive}
        isStandaloneWindow={true}
        isInstanceMode={gitCloneParams.isInstanceMode}
        adminUrl={gitCloneParams.adminUrl}
        vscodeEnabled={config.extensions?.vscode ?? false}
        androidStudioEnabled={config.extensions?.androidStudio ?? false}
        repoLanguage={gitCloneParams.repoLanguage}
      />
    );
  }

  // Dedicated Power / Quit / Restart Window mode
  if (isPowerView) {
    return (
      <main className="w-full h-screen bg-[#181920] border border-white/10 flex flex-col justify-between p-5 text-gray-200 select-none">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-indigo-400 text-xl">power_settings_new</span>
            <span className="font-semibold text-sm text-white">Správa aplikace IADonkey</span>
          </div>
          <button
            type="button"
            onClick={() => window.electronAPI?.closePowerWindow?.()}
            className="w-7 h-7 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center cursor-pointer"
            title="Zavřít"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="py-2">
          <p className="text-xs text-gray-400 leading-relaxed">
            Zvolte požadovanou systémovou akci. Aplikaci můžete restartovat pro opětovné načtení procesů nebo ji zcela ukončit.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => window.electronAPI?.closePowerWindow?.()}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={() => window.electronAPI?.restartApp?.()}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>Restartovat</span>
          </button>
          <button
            type="button"
            onClick={() => window.electronAPI?.quitApp?.()}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-rose-600/25 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">power_settings_new</span>
            <span>Ukončit</span>
          </button>
        </div>
      </main>
    );
  }

  // Filter items by enabled extensions
  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (config?.extensions?.magicgate === false && item.sourceId === 'magicgate-xml') {
        return false;
      }
      if (config?.extensions?.github === false && item.sourceId === 'github') {
        return false;
      }
      return true;
    });
  }, [items, config?.extensions]);

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
        items={visibleItems}
        mlogBaseUrl={config?.extensions?.mlog ? config?.mlog?.baseUrl : undefined}
        mlogTaskPrefix={config?.mlog?.taskPrefix}
        mlogRequestPrefix={config?.mlog?.requestPrefix}
        searchGoogle={config.searchGoogle !== false}
        defaultSearchEngine={config.defaultSearchEngine}
        defaultCloneDir={config?.github?.defaultCloneDir}
        vscodeEnabled={config.extensions?.vscode ?? false}
        androidStudioEnabled={config.extensions?.androidStudio ?? false}
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
        snippets={config.snippets}
      />

      {/* Fallback modal if not in dedicated window */}
      {showSettings && (
        <SettingsModal
          config={config}
          items={items}
          onSaveConfig={handleSaveConfig}
          onClose={() => {
            setShowSettings(false);
            window.dispatchEvent(new CustomEvent('focus-search-input'));
          }}
          onTriggerSync={handleRefreshData}
          onCheckUpdate={handleCheckUpdate}
          isSyncing={isSyncing}
          syncProgress={syncProgress}
          updateStatusMessage={updateStatusMessage}
          updateInfo={updateInfo}
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
