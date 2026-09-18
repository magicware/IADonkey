import { contextBridge, ipcRenderer } from 'electron';
import { AppConfig, LauncherItem, UpdateInfo, ActionLogEntry, CrashLogEntry } from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  downloadMaterialIcons: (): Promise<any> => ipcRenderer.invoke('download-material-icons'),
  getMaterialIcons: (): Promise<any> => ipcRenderer.invoke('get-material-icons'),
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('get-config'),
  saveConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke('save-config', config),
  getItems: (): Promise<LauncherItem[]> => ipcRenderer.invoke('get-items'),
  syncNow: (): Promise<LauncherItem[]> => ipcRenderer.invoke('sync-now'),
  selectJsonFile: (defaultPath?: string): Promise<string | null> => ipcRenderer.invoke('select-json-file', defaultPath),
  selectXmlFile: (defaultPath?: string): Promise<string | null> => ipcRenderer.invoke('select-xml-file', defaultPath),
  inspectSource: (source: any): Promise<{ keys: string[]; sample: any }> =>
    ipcRenderer.invoke('inspect-source', source),
  executeAction: (data: { action: string; location: string; settings?: string | null }): Promise<void> =>
    ipcRenderer.invoke('execute-action', data),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
  openPath: (path: string): Promise<void> => ipcRenderer.invoke('open-path', path),
  hideWindow: (): Promise<void> => ipcRenderer.invoke('hide-window'),
  resetAndHideSpotlight: (): Promise<void> => ipcRenderer.invoke('reset-and-hide-spotlight'),
  openSettingsWindow: (): Promise<void> => ipcRenderer.invoke('open-settings-window'),
  openPowerWindow: (): Promise<void> => ipcRenderer.invoke('open-power-window'),
  closePowerWindow: (): Promise<void> => ipcRenderer.invoke('close-power-window'),
  restartApp: (): Promise<void> => ipcRenderer.invoke('restart-app'),
  quitApp: (): Promise<void> => ipcRenderer.invoke('quit-app'),
  openGitCloneWindow: (params: { repoName: string; repoUrl?: string; initialRecursive?: boolean; isInstanceMode?: boolean; adminUrl?: string; targetDir?: string }): Promise<void> =>
    ipcRenderer.invoke('open-git-clone-window', params),
  checkUpdate: (): Promise<UpdateInfo> => ipcRenderer.invoke('check-update'),
  downloadUpdate: (downloadUrl: string): Promise<string> => ipcRenderer.invoke('download-update', downloadUrl),
  installUpdate: (filePath: string): Promise<void> => ipcRenderer.invoke('install-update', filePath),
  pauseGlobalHotkey: (): Promise<void> => ipcRenderer.invoke('pause-global-hotkey'),
  resumeGlobalHotkey: (): Promise<void> => ipcRenderer.invoke('resume-global-hotkey'),
  fetchFaviconForUrl: (url: string): Promise<string | null> => ipcRenderer.invoke('fetch-favicon-for-url', url),
  testGitHubConnection: (settings: any): Promise<any> => ipcRenderer.invoke('test-github-connection', settings),
  selectDirectory: (defaultPath?: string): Promise<string | null> => ipcRenderer.invoke('select-directory', defaultPath),
  runGitClone: (params: { repoUrl: string; targetDir: string; recursive?: boolean }): Promise<{ success: boolean; targetPath: string; output?: string; error?: string; alreadyExists?: boolean }> =>
    ipcRenderer.invoke('run-git-clone', params),
  openInVscode: (folderPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('open-in-vscode', folderPath),
  selectVscodePath: (defaultPath?: string): Promise<string | null> => ipcRenderer.invoke('select-vscode-path', defaultPath),
  detectVscodePath: (): Promise<string | null> => ipcRenderer.invoke('detect-vscode-path'),
  openInAndroidStudio: (folderPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('open-in-android-studio', folderPath),
  selectAndroidStudioPath: (defaultPath?: string): Promise<string | null> => ipcRenderer.invoke('select-android-studio-path', defaultPath),
  detectAndroidStudioPath: (): Promise<string | null> => ipcRenderer.invoke('detect-android-studio-path'),
  isAndroidProject: (folderPath: string): Promise<boolean> => ipcRenderer.invoke('is-android-project', folderPath),
  getExistingClonedRepos: (baseDir?: string): Promise<string[]> => ipcRenderer.invoke('get-existing-cloned-repos', baseDir),
  fetchInstanceRepos: (adminUrl: string): Promise<{ ok: boolean; repos: any[]; rawJson?: string; error?: string }> =>
    ipcRenderer.invoke('magicgate-get-repos', { adminUrl }),
  runMultiRepoClone: (params: { repos: any[]; targetDir: string; recursive?: boolean; rawJson?: string }): Promise<{ success: boolean; targetPath: string; error?: string; alreadyExists?: boolean }> =>
    ipcRenderer.invoke('magicgate-clone-start', params),
  onMagicGateCloneProgress: (callback: (data: { current: number; total: number; repoName: string; log: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('magicgate-clone-progress', handler);
    return () => ipcRenderer.removeListener('magicgate-clone-progress', handler);
  },
  onGitCloneParams: (callback: (params: { repoName: string; repoUrl?: string; recursive?: boolean; initialRecursive?: boolean; isInstanceMode?: boolean; adminUrl?: string }) => void) => {
    const handler = (_event: any, params: any) => callback(params);
    ipcRenderer.on('git-clone-params', handler);
    return () => ipcRenderer.removeListener('git-clone-params', handler);
  },

  // Event subscriptions from main process
  onDataUpdated: (callback: (items: LauncherItem[]) => void) => {
    const handler = (_event: any, items: LauncherItem[]) => callback(items);
    ipcRenderer.on('data-updated', handler);
    return () => ipcRenderer.removeListener('data-updated', handler);
  },

  onConfigUpdated: (callback: (config: AppConfig) => void) => {
    const handler = (_event: any, config: AppConfig) => callback(config);
    ipcRenderer.on('config-updated', handler);
    return () => ipcRenderer.removeListener('config-updated', handler);
  },

  onOpenSettingsRequest: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('open-settings', handler);
    return () => ipcRenderer.removeListener('open-settings', handler);
  },

  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    const handler = (_event: any, info: UpdateInfo) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },

  onUpdateDownloadProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },

  onWindowShown: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('window-shown', handler);
    return () => ipcRenderer.removeListener('window-shown', handler);
  },

  onWindowHideRequest: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('window-hide-request', handler);
    return () => ipcRenderer.removeListener('window-hide-request', handler);
  },

  onSyncProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('sync-progress', handler);
    return () => ipcRenderer.removeListener('sync-progress', handler);
  },

  getSearchEngineFavicons: (): Promise<Record<string, string>> => ipcRenderer.invoke('get-search-engine-favicons'),
  onSearchEngineFaviconsUpdated: (callback: (favicons: Record<string, string>) => void) => {
    const handler = (_event: any, favicons: Record<string, string>) => callback(favicons);
    ipcRenderer.on('search-engine-favicons-updated', handler);
    return () => ipcRenderer.removeListener('search-engine-favicons-updated', handler);
  },

  onFocusInput: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('focus-input', handler);
    return () => ipcRenderer.removeListener('focus-input', handler);
  },

  onResetSpotlight: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('reset-spotlight', handler);
    return () => ipcRenderer.removeListener('reset-spotlight', handler);
  },

  onTriggerEyedropper: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('trigger-eyedropper', handler);
    return () => ipcRenderer.removeListener('trigger-eyedropper', handler);
  },

  pickScreenColor: (): Promise<string | null> => ipcRenderer.invoke('pick-screen-color'),

  onColorPickedGlobal: (callback: (data: { color: string; formatted: string }) => void) => {
    const handler = (_event: any, data: { color: string; formatted: string }) => callback(data);
    ipcRenderer.on('color-picked-global', handler);
    return () => ipcRenderer.removeListener('color-picked-global', handler);
  },

  openTuneColorWindow: (params: { initialColor: string }): Promise<void> =>
    ipcRenderer.invoke('open-tune-color-window', params),

  saveTuneColor: (color: string): Promise<void> =>
    ipcRenderer.invoke('save-tune-color', color),

  closeTuneColorWindow: (): Promise<void> =>
    ipcRenderer.invoke('close-tune-color-window'),

  onTuneColorApplied: (callback: (data: { color: string }) => void) => {
    const handler = (_event: any, data: { color: string }) => callback(data);
    ipcRenderer.on('tune-color-applied', handler);
    return () => ipcRenderer.removeListener('tune-color-applied', handler);
  },

  // Installer API
  installerGetDefaultPath: (): Promise<string> => ipcRenderer.invoke('installer-get-default-path'),
  installerBrowseFolder: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('installer-browse-folder', defaultPath),
  installerPerformInstall: (options: any): Promise<void> =>
    ipcRenderer.invoke('installer-perform-install', options),
  installerLaunchAndFinish: (targetDir: string, runNow: boolean): Promise<void> =>
    ipcRenderer.invoke('installer-launch-and-finish', targetDir, runNow),
  installerPerformUninstall: (): Promise<void> => ipcRenderer.invoke('installer-perform-uninstall'),
  onInstallerProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('installer-progress', handler);
    return () => ipcRenderer.removeListener('installer-progress', handler);
  },
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('minimize-window'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('close-window'),

  // Splash Screen API
  getSplashStatus: (): Promise<{ percent: number; text: string }> => ipcRenderer.invoke('get-splash-status'),
  onSplashStatus: (callback: (status: { percent: number; text: string }) => void) => {
    const handler = (_event: any, status: any) => callback(status);
    ipcRenderer.on('splash-status', handler);
    return () => ipcRenderer.removeListener('splash-status', handler);
  },

  // Diagnostics & Logs API
  getActionLogs: (): Promise<ActionLogEntry[]> => ipcRenderer.invoke('get-action-logs'),
  clearActionLogs: (): Promise<void> => ipcRenderer.invoke('clear-action-logs'),
  getCrashLogs: (): Promise<CrashLogEntry[]> => ipcRenderer.invoke('get-crash-logs'),
  openCrashLogFolder: (): Promise<void> => ipcRenderer.invoke('open-crash-log-folder'),
  clearCrashLogs: (): Promise<void> => ipcRenderer.invoke('clear-crash-logs'),
  logAction: (entry: Omit<ActionLogEntry, 'id' | 'timestamp'> & { timestamp?: string }): Promise<void> =>
    ipcRenderer.invoke('log-action', entry),
  exportCrashReport: (fileName: string): Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }> =>
    ipcRenderer.invoke('export-crash-report', fileName),

  // QuickCap (dříve FastSnap) API
  startQuickCap: (): Promise<void> => ipcRenderer.invoke('quickcap-start'),
  finishQuickCap: (cropArea: { x: number; y: number; width: number; height: number; windowWidth?: number; windowHeight?: number }): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('quickcap-finish-crop', cropArea),
  cancelQuickCap: (): Promise<void> => ipcRenderer.invoke('quickcap-cancel'),
  getRecentQuickCaps: (): Promise<any[]> => ipcRenderer.invoke('quickcap-get-recent'),
  copyQuickCapToClipboard: (filePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('quickcap-copy-to-clipboard', filePath),
  deleteQuickCap: (filePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('quickcap-delete', filePath),
  showQuickCapInFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('quickcap-show-in-folder', filePath),
  chooseQuickCapFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('quickcap-choose-folder'),
  getQuickCapInitData: (): Promise<{ screenshotUrl: string; width: number; height: number; scaleFactor: number } | null> =>
    ipcRenderer.invoke('quickcap-get-init-data'),
  onQuickCapInitData: (callback: (data: { screenshotUrl: string; width: number; height: number; scaleFactor: number }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('quickcap-init-data', handler);
    ipcRenderer.on('fastsnap-init-data', handler);
    return () => {
      ipcRenderer.removeListener('quickcap-init-data', handler);
      ipcRenderer.removeListener('fastsnap-init-data', handler);
    };
  },
  onQuickCapCleanup: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('quickcap-cleanup', handler);
    ipcRenderer.on('fastsnap-cleanup', handler);
    return () => {
      ipcRenderer.removeListener('quickcap-cleanup', handler);
      ipcRenderer.removeListener('fastsnap-cleanup', handler);
    };
  },

  // Zpětná kompatibilita pro FastSnap
  startFastSnap: (): Promise<void> => ipcRenderer.invoke('quickcap-start'),
  finishFastSnap: (cropArea: { x: number; y: number; width: number; height: number; windowWidth?: number; windowHeight?: number }): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('quickcap-finish-crop', cropArea),
  cancelFastSnap: (): Promise<void> => ipcRenderer.invoke('quickcap-cancel'),
  getRecentFastSnaps: (): Promise<any[]> => ipcRenderer.invoke('quickcap-get-recent'),
  copyFastSnapToClipboard: (filePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('quickcap-copy-to-clipboard', filePath),
  deleteFastSnap: (filePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('quickcap-delete', filePath),
  showFastSnapInFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('quickcap-show-in-folder', filePath),
  chooseFastSnapFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('quickcap-choose-folder'),
  getFastSnapInitData: (): Promise<{ screenshotUrl: string; width: number; height: number; scaleFactor: number } | null> =>
    ipcRenderer.invoke('quickcap-get-init-data'),
  onFastSnapInitData: (callback: (data: { screenshotUrl: string; width: number; height: number; scaleFactor: number }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('quickcap-init-data', handler);
    ipcRenderer.on('fastsnap-init-data', handler);
    return () => {
      ipcRenderer.removeListener('quickcap-init-data', handler);
      ipcRenderer.removeListener('fastsnap-init-data', handler);
    };
  },
  onFastSnapCleanup: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('quickcap-cleanup', handler);
    ipcRenderer.on('fastsnap-cleanup', handler);
    return () => {
      ipcRenderer.removeListener('quickcap-cleanup', handler);
      ipcRenderer.removeListener('fastsnap-cleanup', handler);
    };
  },
});
