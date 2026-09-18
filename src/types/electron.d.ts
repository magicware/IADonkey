import { AppConfig, LauncherItem, UpdateInfo, SyncProgress, DataSource, GithubSettings, MaterialIconDef, ActionLogEntry, CrashLogEntry } from './index';

declare global {
  interface Window {
    electronAPI: {
      downloadMaterialIcons: () => Promise<{ success: boolean; count?: number; downloadedAt?: string; error?: string }>;
      getMaterialIcons: () => Promise<MaterialIconDef[] | null>;
      getConfig: () => Promise<AppConfig>;
      saveConfig: (config: AppConfig) => Promise<void>;
      getItems: () => Promise<LauncherItem[]>;
      syncNow: () => Promise<LauncherItem[]>;
      selectJsonFile: (defaultPath?: string) => Promise<string | null>;
      selectXmlFile: (defaultPath?: string) => Promise<string | null>;
      inspectSource: (source: DataSource) => Promise<{ keys: string[]; sample: Record<string, any> | null }>;
      executeAction: (data: { action: string; location: string; settings?: string | null }) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      openPath: (path: string) => Promise<void>;
      hideWindow: () => void;
      resetAndHideSpotlight: () => Promise<void>;
      openSettingsWindow: () => Promise<void>;
      openPowerWindow: () => Promise<void>;
      closePowerWindow: () => Promise<void>;
      restartApp: () => Promise<void>;
      quitApp: () => Promise<void>;
      openGitCloneWindow: (params: {
        repoName: string;
        repoUrl?: string;
        initialRecursive?: boolean;
        isInstanceMode?: boolean;
        adminUrl?: string;
        repoLanguage?: string;
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
      selectDirectory: (defaultPath?: string) => Promise<string | null>;
      runGitClone: (params: { repoUrl: string; targetDir: string; recursive?: boolean }) => Promise<{
        success: boolean;
        targetPath: string;
        output?: string;
        error?: string;
        alreadyExists?: boolean;
      }>;
      openInVscode: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
      selectVscodePath: (defaultPath?: string) => Promise<string | null>;
      detectVscodePath: () => Promise<string | null>;
      openInAndroidStudio: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
      selectAndroidStudioPath: (defaultPath?: string) => Promise<string | null>;
      detectAndroidStudioPath: () => Promise<string | null>;
      isAndroidProject: (folderPath: string) => Promise<boolean>;
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
      runMultiRepoClone: (params: {
        repos: Array<{ sectionId: number; manifestPath: string; repoUrl: string; targetSubdir: string }>;
        targetDir: string;
        recursive?: boolean;
        rawJson?: string;
      }) => Promise<{
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
        repoLanguage?: string;
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
      onResetSpotlight: (callback: () => void) => () => void;
      onTriggerEyedropper?: (callback: () => void) => () => void;
      pickScreenColor?: () => Promise<string | null>;
      onColorPickedGlobal?: (callback: (data: { color: string; formatted: string }) => void) => () => void;
      openTuneColorWindow?: (params: { initialColor: string }) => Promise<void>;
      saveTuneColor?: (color: string) => Promise<void>;
      closeTuneColorWindow?: () => Promise<void>;
      onTuneColorApplied?: (callback: (data: { color: string }) => void) => () => void;

      // Installer API
      installerGetDefaultPath?: () => Promise<string>;
      installerBrowseFolder?: (defaultPath?: string) => Promise<string | null>;
      installerPerformInstall?: (options: {
        targetDir: string;
        createDesktopShortcut: boolean;
        createStartMenuShortcut: boolean;
        autoStartWithWindows: boolean;
      }) => Promise<{ success: boolean; error?: string }>;
      installerLaunchAndFinish?: (targetDir: string, runNow: boolean) => Promise<void>;
      installerPerformUninstall?: () => Promise<void>;
      onInstallerProgress?: (callback: (progress: { percent: number; phase: string; detail?: string }) => void) => () => void;
      minimizeWindow?: () => Promise<void>;
      closeWindow?: () => Promise<void>;

      // Splash Screen API
      getSplashStatus?: () => Promise<{ percent: number; text: string }>;
      onSplashStatus?: (callback: (status: { percent: number; text: string }) => void) => () => void;

      // Diagnostics & Logs API
      getActionLogs?: () => Promise<ActionLogEntry[]>;
      clearActionLogs?: () => Promise<void>;
      getCrashLogs?: () => Promise<CrashLogEntry[]>;
      openCrashLogFolder?: () => Promise<void>;
      clearCrashLogs?: () => Promise<void>;
      logAction?: (entry: Omit<ActionLogEntry, 'id' | 'timestamp'> & { timestamp?: string }) => Promise<void>;
      exportCrashReport?: (fileName: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;

      // FastSnap API
      startFastSnap?: () => Promise<void>;
      finishFastSnap?: (cropArea: { x: number; y: number; width: number; height: number; windowWidth?: number; windowHeight?: number }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      cancelFastSnap?: () => Promise<void>;
      getRecentFastSnaps?: () => Promise<import('./index').FastSnapRecentItem[]>;
      copyFastSnapToClipboard?: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      deleteFastSnap?: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      showFastSnapInFolder?: (filePath: string) => Promise<void>;
      chooseFastSnapFolder?: () => Promise<string | null>;
      onFastSnapInitData?: (callback: (data: { screenshotUrl: string; width: number; height: number; scaleFactor: number }) => void) => () => void;
      onFastSnapCleanup?: (callback: () => void) => () => void;
    };
  }
}

export {};
