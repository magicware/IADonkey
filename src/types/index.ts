export interface LauncherAction {
  name: string;
  action: 'open' | 'clone' | 'clonerecursive' | 'copy' | string;
  location?: string | null;
  icon?: string | null;
  settings?: 'git' | string | null;
}

export interface LauncherItem {
  id?: string;
  name: string;
  location?: string | null;
  action?: 'open' | 'copy' | string | null;
  icon?: string | null;
  image?: string | null;
  priority?: number | null;
  settings?: 'magicgate' | 'git' | string | null;
  sourceId?: string;
  options?: LauncherItem[];
  shortcuts?: string[];
  actions?: LauncherAction[];
  info?: Record<string, any>;
  colorPreview?: string;
}

export type SourceType = 'file' | 'api' | 'static';

export interface FieldMappingRule {
  type: 'field' | 'fixed';
  value: string;
}

export type MappingTargetKey = 'name' | 'location' | 'action' | 'icon' | 'image' | 'priority' | 'settings';

export interface SourceFieldMapping {
  name?: FieldMappingRule;
  location?: FieldMappingRule;
  action?: FieldMappingRule;
  icon?: FieldMappingRule;
  image?: FieldMappingRule;
  priority?: FieldMappingRule;
  settings?: FieldMappingRule;
}

export interface BaseSource {
  id: string;
  name: string;
  type: SourceType;
  enabled: boolean;
  lastSync?: string;
  itemCount?: number;
  error?: string;
  mapping?: SourceFieldMapping;
}

export interface FileSource extends BaseSource {
  type: 'file';
  path: string;
}

export interface ApiSource extends BaseSource {
  type: 'api';
  url: string;
  authType: 'none' | 'getToken';
  tokenUrl?: string;
  tokenUsername?: string;
  tokenPassword?: string;
  tokenPayload?: string; // Optional custom JSON payload
  cachedToken?: string;
  tokenExpiresAt?: number;
}

export interface StaticSource extends BaseSource {
  type: 'static';
  sharedParams?: Record<string, string>;
  items: LauncherItem[];
}

export type DataSource = FileSource | ApiSource | StaticSource;

export interface MagicGateSettings {
  username: string;
  password: string;
  xmlPath?: string;
}

export interface MlogSettings {
  baseUrl: string;
  taskPrefix?: string;
  requestPrefix?: string;
}

export interface ExtensionsConfig {
  magicgate: boolean;
  mlog: boolean;
  github: boolean;
  vscode?: boolean;
  androidStudio?: boolean;
  donkeyTools?: boolean;
}

export interface ColorMasterSettings {
  enabled: boolean;
  hotkey?: string;
  defaultFormat?: 'hex' | 'hex-no-hash' | 'rgb' | 'rgba' | 'hsl';
}

export interface QuickCapSettings {
  enabled: boolean;
  hotkey?: string;
  saveDirectory?: string;
}

export type FastSnapSettings = QuickCapSettings;

export interface QuickCapRecentItem {
  name: string;
  path: string;
  createdAt: number;
  size: number;
  dataUrl?: string;
  width?: number;
  height?: number;
}

export type FastSnapRecentItem = QuickCapRecentItem;

export interface DonkeyToolsSettings {
  colorMaster?: ColorMasterSettings;
  quickCap?: QuickCapSettings;
  fastSnap?: QuickCapSettings;
}

export interface VscodeSettings {
  path?: string;
}

export interface AndroidStudioSettings {
  path?: string;
}

export interface GithubSettings {
  username?: string;
  token: string;
  org?: string;
  apiUrl?: string;
  defaultCloneDir?: string;
}

export interface BannedItem {
  id?: string;
  name: string;
  location?: string | null;
  sourceId?: string | null;
  bannedAt: string;
}

export interface AppConfig {
  hotkey: string;
  sources: DataSource[];
  magicgate: MagicGateSettings;
  mlog?: MlogSettings;
  github?: GithubSettings;
  vscode?: VscodeSettings;
  androidStudio?: AndroidStudioSettings;
  extensions?: ExtensionsConfig;
  donkeyTools?: DonkeyToolsSettings;
  banlist?: BannedItem[];
  updateUrl: string;
  lastDeclinedVersion: string | null;
  lastDeclinedTime: number | null;
  autoSyncIntervalMinutes: number;
  lastSyncTime?: string | null;
  primaryColor?: string;
  actionsColor?: string;
  lastSeenVersion?: string | null;
  searchInstalledApps?: boolean;
  searchGoogle?: boolean;
  defaultSearchEngine?: string;
  snippets?: SnippetsConfig;
  iconsLastDownloadedAt?: string | null;
  iconsCount?: number;
}

export interface MaterialIconDef {
  name: string;
  category: string;
  tags: string[];
}

export interface CustomSnippet {
  id: string;
  name: string;
  location: string;
  icon?: string;
  shortcuts: string[];
}

export interface SnippetsConfig {
  signature?: string;
  name?: string;
  ico?: string;
  dic?: string;
  address?: string;
  phone?: string;
  email?: string;
  custom?: CustomSnippet[];
}

export interface SyncProgress {
  total: number;
  current: number;
  percentage: number;
  sourceName?: string;
  isComplete: boolean;
}

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  type: 'shortcut' | 'color-picker' | 'color-master' | 'action' | 'window' | 'sync' | 'error' | 'options' | 'ui';
  title: string;
  details?: string;
  status: 'success' | 'error' | 'warn' | 'info';
}

export interface CrashLogEntry {
  id: string;
  fileName: string;
  filePath: string;
  timestamp: string;
  action: string;
  errorSnippet: string;
  fullContent: string;
}
