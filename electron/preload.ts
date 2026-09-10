import { contextBridge, ipcRenderer } from 'electron';
import { AppConfig, LauncherItem, UpdateInfo } from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('get-config'),
  saveConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke('save-config', config),
  getItems: (): Promise<LauncherItem[]> => ipcRenderer.invoke('get-items'),
  syncNow: (): Promise<LauncherItem[]> => ipcRenderer.invoke('sync-now'),
  selectJsonFile: (): Promise<string | null> => ipcRenderer.invoke('select-json-file'),
  executeAction: (data: { action: string; location: string; settings?: string | null }): Promise<void> =>
    ipcRenderer.invoke('execute-action', data),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
  openPath: (path: string): Promise<void> => ipcRenderer.invoke('open-path', path),
  hideWindow: (): Promise<void> => ipcRenderer.invoke('hide-window'),
  openSettingsWindow: (): Promise<void> => ipcRenderer.invoke('open-settings-window'),
  checkUpdate: (): Promise<UpdateInfo> => ipcRenderer.invoke('check-update'),
  downloadUpdate: (downloadUrl: string): Promise<string> => ipcRenderer.invoke('download-update', downloadUrl),
  installUpdate: (filePath: string): Promise<void> => ipcRenderer.invoke('install-update', filePath),
  pauseGlobalHotkey: (): Promise<void> => ipcRenderer.invoke('pause-global-hotkey'),
  resumeGlobalHotkey: (): Promise<void> => ipcRenderer.invoke('resume-global-hotkey'),

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
});
