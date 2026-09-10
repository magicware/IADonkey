import fs from 'node:fs';
import type { DataSource, FileSource, ApiSource, LauncherItem } from '../src/types';
import { AppStore } from './store';

export class DataSyncManager {
  private store: AppStore;

  constructor(store: AppStore) {
    this.store = store;
  }

  /**
   * Synchronizes all enabled data sources (local JSON files and remote GET APIs)
   */
  public async syncAll(
    onProgress?: (progress: { total: number; current: number; percentage: number; sourceName?: string; isComplete: boolean }) => void
  ): Promise<LauncherItem[]> {
    const config = this.store.getConfig();
    const sources = config.sources;
    const allItems: LauncherItem[] = [];
    const updatedSources = [...sources];

    const enabledSources = updatedSources.filter((s) => s.enabled);
    const totalCount = enabledSources.length;

    if (totalCount === 0) {
      onProgress?.({
        total: 0,
        current: 0,
        percentage: 100,
        isComplete: true,
      });
      const nowFormatted = new Date().toLocaleString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      this.store.saveConfig({ ...config, sources: updatedSources, lastSyncTime: nowFormatted });
      this.store.saveItems([]);
      return [];
    }

    onProgress?.({
      total: totalCount,
      current: 0,
      percentage: 0,
      isComplete: false,
    });

    let completedCount = 0;

    for (let i = 0; i < updatedSources.length; i++) {
      const src = updatedSources[i];
      if (!src.enabled) continue;

      try {
        let items: LauncherItem[] = [];
        if (src.type === 'file') {
          items = await this.syncFileSource(src as FileSource);
        } else if (src.type === 'api') {
          items = await this.syncApiSource(src as ApiSource);
        }

        // Tag items with source reference
        const normalized = items.map((it, idx) => this.normalizeItem(it, src.id, idx));
        allItems.push(...normalized);

        updatedSources[i] = {
          ...src,
          lastSync: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          itemCount: normalized.length,
          error: undefined,
        };
      } catch (err: any) {
        console.error(`[DataSync] Error syncing source "${src.name}":`, err);
        updatedSources[i] = {
          ...src,
          error: err?.message || 'Chyba při stahování dat',
        };
      }

      completedCount++;
      const percentage = Math.round((completedCount / totalCount) * 100);
      onProgress?.({
        total: totalCount,
        current: completedCount,
        percentage,
        sourceName: src.name,
        isComplete: completedCount === totalCount,
      });
    }

    const nowFormatted = new Date().toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Save updated source statistics and global sync timestamp into config
    this.store.saveConfig({ ...config, sources: updatedSources, lastSyncTime: nowFormatted });

    // Save combined items into local cache
    this.store.saveItems(allItems);

    return allItems;
  }

  /**
   * Reads a local JSON file
   */
  private async syncFileSource(src: FileSource): Promise<LauncherItem[]> {
    if (!src.path || !fs.existsSync(src.path)) {
      throw new Error(`Soubor nebyl nalezen na cestě: ${src.path}`);
    }

    const raw = await fs.promises.readFile(src.path, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('Soubor neobsahuje pole JSON objektů [{ ... }]');
    }

    return parsed;
  }

  /**
   * Fetches data from remote API, handling getToken auth if required
   */
  private async syncApiSource(src: ApiSource): Promise<LauncherItem[]> {
    if (!src.url) {
      throw new Error('Chybí URL adresa API');
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'IADonkey-Launcher/1.0',
    };

    // Handle authentication
    if (src.authType === 'getToken') {
      const token = await this.obtainAuthToken(src);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Perform GET request
    const response = await fetch(src.url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`API vrátilo kód ${response.status}: ${response.statusText}`);
    }

    const parsed = await response.json();

    // Handle response if wrapped in data or directly an array
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed && Array.isArray(parsed.data)) {
      return parsed.data;
    } else if (parsed && Array.isArray(parsed.items)) {
      return parsed.items;
    } else {
      throw new Error('API nevrátilo pole objektů [{ ... }]');
    }
  }

  /**
   * Obtains auth token using POST request to tokenUrl
   */
  private async obtainAuthToken(src: ApiSource): Promise<string> {
    if (!src.tokenUrl) {
      throw new Error('Je vybrána metoda getToken, ale chybí Token URL');
    }

    let bodyPayload: any = {};
    if (src.tokenPayload) {
      try {
        bodyPayload = JSON.parse(src.tokenPayload);
      } catch {
        // use raw if not valid json
        bodyPayload = { payload: src.tokenPayload };
      }
    } else {
      bodyPayload = {
        username: src.tokenUsername || '',
        password: src.tokenPassword || '',
      };
    }

    const tokenRes = await fetch(src.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!tokenRes.ok) {
      throw new Error(`Získání tokenu selhalo (HTTP ${tokenRes.status})`);
    }

    const resJson = await tokenRes.json();

    // Extract token string from typical responses
    const token =
      resJson.token ||
      resJson.access_token ||
      resJson.accessToken ||
      resJson.data?.token ||
      resJson.data?.access_token ||
      (typeof resJson === 'string' ? resJson : null);

    if (!token || typeof token !== 'string') {
      throw new Error('V odpovědi token URL nebyl nalezen žádný token');
    }

    return token;
  }

  /**
   * Ensures default values according to specifications (including recursive subitems under options)
   */
  private normalizeItem(
    raw: any,
    sourceId: string,
    index: number,
    parentId?: string,
    parentSettings?: string | null
  ): LauncherItem {
    const id = raw.id || `${sourceId}-${parentId ? `${parentId}-` : ''}${index}`;
    const effectiveSettings = raw.settings !== undefined ? raw.settings : (parentSettings || null);
    const subOptions = Array.isArray(raw.options)
      ? raw.options.map((opt: any, optIdx: number) =>
          this.normalizeItem(opt, sourceId, optIdx, id, effectiveSettings)
        )
      : undefined;

    return {
      id,
      name: String(raw.name || 'Položka bez názvu'),
      location: raw.location !== undefined ? raw.location : null,
      action: raw.action || 'open',
      icon: raw.icon || 'code',
      image: raw.image || null,
      priority: typeof raw.priority === 'number' ? raw.priority : 0,
      settings: effectiveSettings === 'magicgate' ? 'magicgate' : effectiveSettings || null,
      sourceId,
      options: subOptions,
    };
  }
}
