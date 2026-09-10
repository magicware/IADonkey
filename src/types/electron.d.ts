import { AppConfig, LauncherItem, UpdateInfo, SyncProgress } from './index';

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<AppConfig>;
      saveConfig: (config: AppConfig) => Promise<void>;
      getItems: () => Promise<LauncherItem[]>;
      syncNow: () => Promise<LauncherItem[]>;
      selectJsonFile: () => Promise<string | null>;
      executeAction: (data: { action: string; location: string; settings?: string | null }) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      openPath: (path: string) => Promise<void>;
      hideWindow: () => void;
      openSettingsWindow: () => Promise<void>;
      checkUpdate: () => Promise<UpdateInfo>;
      pauseGlobalHotkey: () => Promise<void>;
      resumeGlobalHotkey: () => Promise<void>;
      onDataUpdated: (callback: (items: LauncherItem[]) => void) => () => void;
      onConfigUpdated: (callback: (config: AppConfig) => void) => () => void;
      onOpenSettingsRequest: (callback: () => void) => () => void;
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
      onWindowShown: (callback: () => void) => () => void;
      onWindowHideRequest: (callback: () => void) => () => void;
      onSyncProgress: (callback: (progress: SyncProgress) => void) => () => void;
    };
  }
}

export {};
