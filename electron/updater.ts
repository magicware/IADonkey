import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { spawn } from 'node:child_process';
import { app } from 'electron';
import { AppStore } from './store';
import { UpdateInfo, DownloadProgress } from '../src/types';

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

  /**
   * Downloads the update binary to temp folder, reporting progress along the way.
   */
  public async downloadUpdate(
    downloadUrl: string,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<string> {
    const tempDir = app.getPath('temp');
    // Extract filename from URL or default
    let fileName = 'IADonkey-update.exe';
    try {
      const parsedUrl = new URL(downloadUrl);
      const base = path.basename(parsedUrl.pathname);
      if (base && base.endsWith('.exe')) {
        fileName = base;
      }
    } catch {}

    const targetPath = path.join(tempDir, fileName);

    console.log(`[UpdateChecker] Starting download from ${downloadUrl} to ${targetPath}`);

    const response = await fetch(downloadUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': `IADonkey-Launcher/${app.getVersion() || '0.1.0'}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Server při stahování vrátil kód ${response.status}`);
    }

    const total = Number(response.headers.get('content-length')) || 0;
    const fileStream = fs.createWriteStream(targetPath);
    let transferred = 0;

    if (!response.body) {
      throw new Error('Server neposkytl žádná data k zápisu.');
    }

    const readable = Readable.fromWeb(response.body as any);

    readable.on('data', (chunk: Buffer) => {
      transferred += chunk.length;
      const percent = total > 0 ? Math.min(100, Math.round((transferred / total) * 100)) : 0;
      onProgress({ percent, transferred, total });
    });

    await new Promise<void>((resolve, reject) => {
      readable.pipe(fileStream);
      fileStream.on('finish', () => resolve());
      fileStream.on('error', (err) => reject(err));
      readable.on('error', (err) => reject(err));
    });

    console.log(`[UpdateChecker] Download complete: ${targetPath}`);
    return targetPath;
  }

  /**
   * Runs the downloaded update executable and terminates the current process.
   */
  public installAndRestart(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Soubor aktualizace nebyl nalezen: ${filePath}`);
    }

    console.log(`[UpdateChecker] Spawning new version: ${filePath} and closing old process`);

    const child = spawn(filePath, [], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    app.quit();
  }
}

