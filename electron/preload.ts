import { contextBridge, ipcRenderer } from 'electron';
import { AppConfig, LauncherItem, UpdateInfo } from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('get-config'),
  saveConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke('save-config', config),
  getItems: (): Promise<LauncherItem[]> => ipcRenderer.invoke('get-items'),
  syncNow: (): Promise<LauncherItem[]> => ipcRenderer.invoke('sync-now'),
  selectJsonFile: (): Promise<string | null> => ipcRenderer.invoke('select-json-file'),
  selectXmlFile: (): Promise<string | null> => ipcRenderer.invoke('select-xml-file'),
  inspectSource: (source: any): Promise<{ keys: string[]; sample: any }> =>
    ipcRenderer.invoke('inspect-source', source),
  executeAction: (data: { action: string; location: string; settings?: string | null }): Promise<void> =>
    ipcRenderer.invoke('execute-action', data),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
  openPath: (path: string): Promise<void> => ipcRenderer.invoke('open-path', path),
  hideWindow: (): Promise<void> => ipcRenderer.invoke('hide-window'),
  resetAndHideSpotlight: (): Promise<void> => ipcRenderer.invoke('reset-and-hide-spotlight'),
  openSettingsWindow: (): Promise<void> => ipcRenderer.invoke('open-settings-window'),
  openGitCloneWindow: (params: { repoName: string; repoUrl?: string; initialRecursive?: boolean; isInstanceMode?: boolean; adminUrl?: string; targetDir?: string }): Promise<void> =>
    ipcRenderer.invoke('open-git-clone-window', params),
  checkUpdate: (): Promise<UpdateInfo> => ipcRenderer.invoke('check-update'),
  downloadUpdate: (downloadUrl: string): Promise<string> => ipcRenderer.invoke('download-update', downloadUrl),
  installUpdate: (filePath: string): Promise<void> => ipcRenderer.invoke('install-update', filePath),
  pauseGlobalHotkey: (): Promise<void> => ipcRenderer.invoke('pause-global-hotkey'),
  resumeGlobalHotkey: (): Promise<void> => ipcRenderer.invoke('resume-global-hotkey'),
  fetchFaviconForUrl: (url: string): Promise<string | null> => ipcRenderer.invoke('fetch-favicon-for-url', url),
  testGitHubConnection: (settings: any): Promise<any> => ipcRenderer.invoke('test-github-connection', settings),
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('select-directory'),
  runGitClone: (params: { repoUrl: string; targetDir: string; recursive?: boolean }): Promise<{ success: boolean; targetPath: string; output?: string; error?: string; alreadyExists?: boolean }> =>
    ipcRenderer.invoke('run-git-clone', params),
  openInVscode: (folderPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('open-in-vscode', folderPath),
  selectVscodePath: (): Promise<string | null> => ipcRenderer.invoke('select-vscode-path'),
  detectVscodePath: (): Promise<string | null> => ipcRenderer.invoke('detect-vscode-path'),
  openInAndroidStudio: (folderPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('open-in-android-studio', folderPath),
  selectAndroidStudioPath: (): Promise<string | null> => ipcRenderer.invoke('select-android-studio-path'),
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
});
