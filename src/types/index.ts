export interface LauncherItem {
  id?: string;
  name: string;
  location?: string | null;
  action?: 'open' | 'copy' | string | null;
  icon?: string | null;
  image?: string | null;
  priority?: number | null;
  settings?: 'magicgate' | string | null;
  sourceId?: string;
  options?: LauncherItem[];
  shortcuts?: string[];
}

export type SourceType = 'file' | 'api';

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

export type DataSource = FileSource | ApiSource;

export interface MagicGateSettings {
  username: string;
  password: string;
  xmlPath?: string;
}

export interface MlogSettings {
  baseUrl: string;
}

export interface AppConfig {
  hotkey: string;
  sources: DataSource[];
  magicgate: MagicGateSettings;
  mlog?: MlogSettings;
  updateUrl: string;
  lastDeclinedVersion: string | null;
  lastDeclinedTime: number | null;
  autoSyncIntervalMinutes: number;
  lastSyncTime?: string | null;
  primaryColor?: string;
  lastSeenVersion?: string | null;
  searchInstalledApps?: boolean;
  searchGoogle?: boolean;
  defaultSearchEngine?: string;
  snippets?: {
    signature?: string;
  };
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
