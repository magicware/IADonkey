import fs from 'node:fs';
import path from 'node:path';
import electronPkg from 'electron';
const app = (electronPkg as any)?.app || (electronPkg as any)?.default?.app;
import type { AppConfig, LauncherItem } from '../src/types';

const USER_DATA_PATH = app?.getPath
  ? app.getPath('userData')
  : path.join(process.cwd(), '.user_data');

if (!fs.existsSync(USER_DATA_PATH)) {
  fs.mkdirSync(USER_DATA_PATH, { recursive: true });
}

const CONFIG_FILE = path.join(USER_DATA_PATH, 'config.json');
const ITEMS_FILE = path.join(USER_DATA_PATH, 'items_cache.json');

const DEFAULT_CONFIG: AppConfig = {
  hotkey: 'Ctrl+Alt+Space',
  sources: [],
  magicgate: {
    username: '',
    password: '',
  },
  updateUrl: 'https://raw.githubusercontent.com/iadonkey/launcher/main/version.json',
  lastDeclinedVersion: null,
  lastDeclinedTime: null,
  autoSyncIntervalMinutes: 30,
  primaryColor: '#6366f1',
  lastSeenVersion: null,
};

import { tryImportWoxCredentials } from './magicGate';

export class AppStore {
  private config: AppConfig;
  private items: LauncherItem[];

  constructor() {
    this.config = this.loadConfig();
    this.items = this.loadItems();
  }

  private loadConfig(): AppConfig {
    let cfg = { ...DEFAULT_CONFIG };
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        cfg = { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (err) {
      console.error('[Store] Failed to load config, falling back to defaults:', err);
    }

    // Auto-prefill MagicGate credentials from Wox if empty
    if (!cfg.magicgate?.username || !cfg.magicgate?.password) {
      const wox = tryImportWoxCredentials();
      if (wox && (wox.username || wox.password)) {
        cfg.magicgate = {
          username: cfg.magicgate?.username || wox.username,
          password: cfg.magicgate?.password || wox.password,
        };
        try {
          fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
        } catch {}
      }
    }

    return cfg;
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public saveConfig(newConfig: AppConfig): void {
    try {
      this.config = { ...this.config, ...newConfig };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store] Failed to save config:', err);
    }
  }

  private loadItems(): LauncherItem[] {
    try {
      if (fs.existsSync(ITEMS_FILE)) {
        const raw = fs.readFileSync(ITEMS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[Store] Failed to load cached items:', err);
    }
    return [];
  }

  public getItems(): LauncherItem[] {
    return this.items;
  }

  public saveItems(items: LauncherItem[]): void {
    try {
      this.items = items;
      fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store] Failed to save items to cache:', err);
    }
  }
}
