import { AppConfig, LauncherItem, UpdateInfo, SyncProgress, DataSource } from './index';

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<AppConfig>;
      saveConfig: (config: AppConfig) => Promise<void>;
      getItems: () => Promise<LauncherItem[]>;
      syncNow: () => Promise<LauncherItem[]>;
      selectJsonFile: () => Promise<string | null>;
      selectXmlFile: () => Promise<string | null>;
      inspectSource: (source: DataSource) => Promise<{ keys: string[]; sample: Record<string, any> | null }>;
      executeAction: (data: { action: string; location: string; settings?: string | null }) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      openPath: (path: string) => Promise<void>;
      hideWindow: () => void;
      openSettingsWindow: () => Promise<void>;
      checkUpdate: () => Promise<UpdateInfo>;
      downloadUpdate: (url: string) => Promise<string>;
      installUpdate: (filePath: string) => Promise<void>;
      pauseGlobalHotkey: () => Promise<void>;
      resumeGlobalHotkey: () => Promise<void>;
      fetchFaviconForUrl: (url: string) => Promise<string | null>;
      onDataUpdated: (callback: (items: LauncherItem[]) => void) => () => void;
      onConfigUpdated: (callback: (config: AppConfig) => void) => () => void;
      onOpenSettingsRequest: (callback: () => void) => () => void;
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
      onUpdateDownloadProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => () => void;
      onWindowShown: (callback: () => void) => () => void;
      onWindowHideRequest: (callback: () => void) => () => void;
      onSyncProgress: (callback: (progress: SyncProgress) => void) => () => void;
      getSearchEngineFavicons: () => Promise<Record<string, string>>;
      onSearchEngineFaviconsUpdated: (callback: (favicons: Record<string, string>) => void) => () => void;
      onFocusInput: (callback: () => void) => () => void;
    };
  }
}

export {};
