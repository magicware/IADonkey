import { AppConfig, LauncherItem, UpdateInfo, SyncProgress, DataSource, GithubSettings } from './index';

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
      openGitCloneWindow: (params: {
        repoName: string;
        repoUrl?: string;
        initialRecursive?: boolean;
        isInstanceMode?: boolean;
        adminUrl?: string;
      }) => Promise<void>;
      checkUpdate: () => Promise<UpdateInfo>;
      downloadUpdate: (url: string) => Promise<string>;
      installUpdate: (filePath: string) => Promise<void>;
      pauseGlobalHotkey: () => Promise<void>;
      resumeGlobalHotkey: () => Promise<void>;
      fetchFaviconForUrl: (url: string) => Promise<string | null>;
      testGitHubConnection: (settings: GithubSettings) => Promise<{
        ok: boolean;
        user?: { login: string; name?: string; avatar_url?: string };
        orgs?: string[];
        repoCount?: number;
        error?: string;
      }>;
      selectDirectory: () => Promise<string | null>;
      runGitClone: (params: { repoUrl: string; targetDir: string; recursive?: boolean }) => Promise<{
        success: boolean;
        targetPath: string;
        output?: string;
        error?: string;
        alreadyExists?: boolean;
      }>;
      openInVscode: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
      selectVscodePath: () => Promise<string | null>;
      detectVscodePath: () => Promise<string | null>;
      getExistingClonedRepos: (baseDir?: string) => Promise<string[]>;
      fetchInstanceRepos: (adminUrl: string) => Promise<{
        ok: boolean;
        repos: Array<{
          sectionId: number;
          manifestPath: string;
          repoUrl: string;
          version?: string;
          targetSubdir: string;
        }>;
        rawJson?: string;
        error?: string;
      }>;
      runMultiRepoClone: (params: { repos: any[]; targetDir: string; recursive?: boolean; rawJson?: string }) => Promise<{
        success: boolean;
        targetPath: string;
        error?: string;
        alreadyExists?: boolean;
      }>;
      onMagicGateCloneProgress: (callback: (data: { current: number; total: number; repoName: string; log: string }) => void) => () => void;
      onGitCloneParams: (callback: (params: {
        repoName: string;
        repoUrl?: string;
        recursive?: boolean;
        initialRecursive?: boolean;
        isInstanceMode?: boolean;
        adminUrl?: string;
      }) => void) => () => void;
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
