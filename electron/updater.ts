import { app } from 'electron';
import { AppStore } from './store';
import { UpdateInfo } from '../src/types';

export class UpdateChecker {
  private store: AppStore;

  constructor(store: AppStore) {
    this.store = store;
  }

  /**
   * Compares two semantic version strings (e.g. '1.0.2' vs '1.0.1')
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.replace(/^v/i, '').split('.').map(Number);
    const parts2 = v2.replace(/^v/i, '').split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  /**
   * Checks for updates against the configured URL
   */
  public async checkForUpdates(isManual = false): Promise<UpdateInfo> {
    const config = this.store.getConfig();
    const currentVersion = app.getVersion() || '0.1.1';

    if (!config.updateUrl) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
      };
    }

    try {
      const res = await fetch(config.updateUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': `IADonkey-Launcher/${currentVersion}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Server vrátil kód ${res.status}`);
      }

      const data = await res.json();
      const latestVersion = data.version || currentVersion;
      const releaseNotes = data.notes || data.releaseNotes || '';
      const downloadUrl = data.downloadUrl || data.url || '';

      const isNewer = this.compareVersions(latestVersion, currentVersion) > 0;

      if (!isNewer) {
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion,
          releaseNotes,
          downloadUrl,
        };
      }

      // Check if user declined this specific version within the last 24 hours
      if (!isManual && config.lastDeclinedVersion === latestVersion && config.lastDeclinedTime) {
        const msSinceDecline = Date.now() - config.lastDeclinedTime;
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if (msSinceDecline < TWENTY_FOUR_HOURS) {
          // Still in the 24h snooze period for automatic checks
          return {
            hasUpdate: false,
            currentVersion,
            latestVersion,
            releaseNotes,
            downloadUrl,
          };
        }
      }

      return {
        hasUpdate: true,
        currentVersion,
        latestVersion,
        releaseNotes,
        downloadUrl,
      };
    } catch (err) {
      console.error('[UpdateChecker] Failed to check for updates:', err);
      throw err;
    }
  }
}
