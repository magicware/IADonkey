import { app, BrowserWindow, globalShortcut, ipcMain, dialog, shell, clipboard, protocol } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { AppStore } from './store';
import { DataSyncManager } from './dataSync';
import { UpdateChecker } from './updater';
import { WindowManager } from './windowManager';
import { AppScanner } from './appScanner';
import { AppConfig, LauncherItem } from '../src/types';
import { getMagicGateAutoLoginUrl } from './magicGate';
import { testGitHubConnection } from './githubService';
import { faviconService } from './faviconService';
import { fetchInstanceSectionRepos, runMultiRepoClone, MagicGateSectionRepo } from './magicGateService';
import { InstallerService } from './installerService';

// Register file scheme as secure
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'file',
    privileges: {
      standard: true,
      secure: true,
      bypassCSP: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught Exception:', error);
});

let store: AppStore;
let syncManager: DataSyncManager;
let updateChecker: UpdateChecker;
let windowManager: WindowManager;
let appScanner: AppScanner;
let currentHotkey = 'Ctrl+Alt+Space';
let syncIntervalTimer: NodeJS.Timeout | null = null;
let updateIntervalTimer: NodeJS.Timeout | null = null;

function getCombinedItems(): LauncherItem[] {
  const customItems = store ? store.getItems() : [];
  const config = store ? store.getConfig() : null;
  if (!config || config.searchInstalledApps !== false) {
    const apps = appScanner ? appScanner.getCachedApps() : [];
    return [...customItems, ...apps];
  }
  return customItems;
}

let lastHotkeyToggle = 0;
function registerGlobalHotkey(hotkey: string) {
  try {
    if (currentHotkey) {
      globalShortcut.unregister(currentHotkey);
    }
    const registered = globalShortcut.register(hotkey, () => {
      const now = Date.now();
      if (now - lastHotkeyToggle < 300) {
        return;
      }
      lastHotkeyToggle = now;

      const win = windowManager.getMainWindow();
      if (win && win.isVisible() && (now - windowManager.getLastShowTime() > 500)) {
        windowManager.hideSpotlight();
      } else {
        windowManager.showSpotlight();
      }
    });

    if (!registered) {
      console.warn(`[Main] Failed to register global shortcut: ${hotkey}`);
    } else {
      currentHotkey = hotkey;
      windowManager?.updateTrayTooltip(hotkey);
      console.log(`[Main] Successfully registered shortcut: ${hotkey}`);
    }
  } catch (err) {
    console.error(`[Main] Error registering shortcut ${hotkey}:`, err);
  }
}

function getColorPickerExePath(): string {
  const candidates = [
    path.join(app.getAppPath(), 'electron', 'assets', 'color-picker.exe'),
    path.join(app.getAppPath(), 'dist-electron', 'assets', 'color-picker.exe'),
    path.join(process.cwd(), 'electron', 'assets', 'color-picker.exe'),
    path.join(process.cwd(), 'dist-electron', 'assets', 'color-picker.exe'),
    path.join(__dirname, 'assets', 'color-picker.exe'),
    path.join(__dirname, '..', 'electron', 'assets', 'color-picker.exe'),
    path.join(process.resourcesPath, 'electron', 'assets', 'color-picker.exe'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'assets', 'color-picker.exe'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      console.log('[Main] Found color-picker.exe at:', c);
      return c;
    }
  }
  console.warn('[Main] color-picker.exe not found in candidates, falling back to:', candidates[0]);
  return candidates[0];
}

async function pickScreenColorNative(instant = false): Promise<string | null> {
  const exePath = getColorPickerExePath();
  if (!fs.existsSync(exePath)) {
    console.error('[Main] color-picker.exe not found at:', exePath);
    return null;
  }
  console.log('[Main] Launching color-picker.exe:', exePath, instant ? '--instant' : '(loupe mode)');

  // If Spotlight window is visible, hide it temporarily so user can pick what is under it
  const mainWin = windowManager ? windowManager.getMainWindow() : null;
  const wasMainVisible = mainWin && !mainWin.isDestroyed() && mainWin.isVisible();
  if (wasMainVisible) {
    mainWin.hide();
    await new Promise((r) => setTimeout(r, 60));
  }

  return new Promise((resolve) => {
    try {
      const args = instant ? ['--instant'] : [];
      const child = spawn(exePath, args, {
        windowsHide: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdoutData = '';
      let stderrData = '';
      child.stdout?.on('data', (data) => {
        stdoutData += data.toString();
      });
      child.stderr?.on('data', (data) => {
        stderrData += data.toString();
      });

      const restoreWindows = () => {
        setTimeout(() => {
          if (wasMainVisible && windowManager) {
            windowManager.showSpotlight();
          } else {
            const settingsWin = windowManager ? windowManager.getSettingsWindow() : null;
            if (settingsWin && !settingsWin.isDestroyed() && settingsWin.isVisible()) {
              settingsWin.focus();
            }
          }
        }, 80);
      };

      child.on('close', (code) => {
        if (stderrData.trim()) {
          console.warn('[Main] color-picker.exe stderr:', stderrData.trim());
        }
        const trimmed = stdoutData.trim();
        console.log('[Main] color-picker.exe closed with code:', code, 'stdout:', trimmed);
        const pickedColor =
          trimmed.startsWith('#') && (trimmed.length === 7 || trimmed.length === 9)
            ? trimmed.toUpperCase()
            : null;

        if (pickedColor) {
          const currentCfg = store ? store.getConfig() : null;
          const fmt = currentCfg?.donkeyTools?.colorMaster?.defaultFormat || 'hex';
          let formatted = pickedColor;
          const r = parseInt(pickedColor.slice(1, 3), 16);
          const g = parseInt(pickedColor.slice(3, 5), 16);
          const b = parseInt(pickedColor.slice(5, 7), 16);
          if (fmt === 'hex-no-hash') {
            formatted = pickedColor.replace('#', '');
          } else if (fmt === 'rgb') {
            formatted = `rgb(${r}, ${g}, ${b})`;
          } else if (fmt === 'rgba') {
            formatted = `rgba(${r}, ${g}, ${b}, 1)`;
          } else if (fmt === 'hsl') {
            const rN = r / 255, gN = g / 255, bN = b / 255;
            const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
            let h = 0, s = 0, l = (max + min) / 2;
            if (max !== min) {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              switch (max) {
                case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
                case gN: h = (bN - rN) / d + 2; break;
                case bN: h = (rN - gN) / d + 4; break;
              }
              h /= 6;
            }
            formatted = `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
          }
          clipboard.writeText(formatted);
          console.log(`[Main] Picked color ${formatted} copied to clipboard`);

          if (windowManager) {
            windowManager.showSpotlight();
            const win = windowManager.getMainWindow();
            if (win && !win.isDestroyed()) {
              win.webContents.send('color-picked-global', { color: pickedColor, formatted });
            }
          }
        } else {
          // Cancelled (Esc or right-click)
          if (wasMainVisible && windowManager) {
            windowManager.showSpotlight();
          } else {
            const settingsWin = windowManager ? windowManager.getSettingsWindow() : null;
            if (settingsWin && !settingsWin.isDestroyed() && settingsWin.isVisible()) {
              settingsWin.focus();
            }
          }
        }

        resolve(pickedColor);
      });

      child.on('error', (err) => {
        if (wasMainVisible && windowManager) {
          windowManager.showSpotlight();
        }
        console.error('[Main] Failed to execute color-picker.exe:', err);
        resolve(null);
      });
    } catch (err) {
      if (wasMainVisible && windowManager) {
        windowManager.showSpotlight();
      }
      console.error('[Main] Error launching screen color picker:', err);
      resolve(null);
    }
  });
}

let currentColorMasterHotkey = '';
function registerColorMasterHotkey(hotkey?: string) {
  try {
    if (currentColorMasterHotkey) {
      globalShortcut.unregister(currentColorMasterHotkey);
      currentColorMasterHotkey = '';
    }
    const config = store ? store.getConfig() : null;
    const isEnabled = Boolean(config?.extensions?.donkeyTools && config?.donkeyTools?.colorMaster?.enabled !== false);
    if (!isEnabled || !hotkey || !hotkey.trim()) {
      return;
    }
    const cleanHotkey = hotkey.trim();
    const registered = globalShortcut.register(cleanHotkey, async () => {
      try {
        console.log('[Main] ColorMaster hotkey triggered, opening screen color picker...');
        await pickScreenColorNative();
      } catch (err) {
        console.error('[Main] Error in ColorMaster hotkey callback:', err);
      }
    });
    if (!registered) {
      console.warn(`[Main] Failed to register ColorMaster shortcut: ${cleanHotkey}`);
    } else {
      currentColorMasterHotkey = cleanHotkey;
      console.log(`[Main] Successfully registered ColorMaster shortcut: ${cleanHotkey}`);
    }
  } catch (err) {
    console.error(`[Main] Error registering ColorMaster shortcut ${hotkey}:`, err);
  }
}

function setupIpcHandlers() {
  ipcMain.handle('pick-screen-color', async () => {
    try {
      return await pickScreenColorNative();
    } catch (err) {
      console.error('[Main] Error handling pick-screen-color IPC:', err);
      return null;
    }
  });

  ipcMain.handle('open-tune-color-window', (_event, params: { initialColor: string }) => {
    windowManager.openTuneColorWindow(params);
  });

  ipcMain.handle('save-tune-color', (_event, color: string) => {
    const win = windowManager.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('tune-color-applied', { color });
    }
    windowManager.closeTuneColorWindow();
    windowManager.showSpotlight();
  });

  ipcMain.handle('close-tune-color-window', () => {
    windowManager.closeTuneColorWindow();
    const win = windowManager.getMainWindow();
    if (win && !win.isDestroyed()) {
      windowManager.showSpotlight();
    }
  });

  ipcMain.handle('get-config', () => {
    return store.getConfig();
  });

  ipcMain.handle('save-config', (_event, newConfig: AppConfig) => {
    const oldConfig = store.getConfig();
    store.saveConfig(newConfig);

    // If hotkey was changed, re-register
    if (newConfig.hotkey && newConfig.hotkey !== oldConfig.hotkey) {
      registerGlobalHotkey(newConfig.hotkey);
    }

    // If ColorMaster hotkey or DonkeyTools settings changed, re-register
    registerColorMasterHotkey(newConfig.donkeyTools?.colorMaster?.hotkey);

    // If searchInstalledApps setting changed, refresh items in UI
    if (newConfig.searchInstalledApps !== oldConfig.searchInstalledApps) {
      const allItems = getCombinedItems();
      windowManager.getMainWindow()?.webContents.send('data-updated', allItems);
      windowManager.getSettingsWindow()?.webContents.send('data-updated', allItems);
    }

    // If MagicGate or GitHub settings/extensions changed, trigger sync to update launcher items
    const magicgateChanged =
      newConfig.magicgate?.xmlPath !== oldConfig.magicgate?.xmlPath ||
      newConfig.extensions?.magicgate !== oldConfig.extensions?.magicgate;
    const githubChanged =
      newConfig.extensions?.github !== oldConfig.extensions?.github ||
      newConfig.github?.username !== oldConfig.github?.username ||
      newConfig.github?.token !== oldConfig.github?.token ||
      newConfig.github?.org !== oldConfig.github?.org ||
      newConfig.github?.apiUrl !== oldConfig.github?.apiUrl;

    if (magicgateChanged || githubChanged) {
      syncManager.syncAll().then(() => {
        const allItems = getCombinedItems();
        windowManager.getMainWindow()?.webContents.send('data-updated', allItems);
        windowManager.getSettingsWindow()?.webContents.send('data-updated', allItems);
      });
    }

    windowManager.getMainWindow()?.webContents.send('config-updated', newConfig);
    windowManager.getSettingsWindow()?.webContents.send('config-updated', newConfig);

    return true;
  });

  ipcMain.handle('open-settings-window', () => {
    const win = windowManager.openSettingsWindow();
    win.on('closed', () => {
      const cfg = store.getConfig();
      if (cfg.hotkey) {
        registerGlobalHotkey(cfg.hotkey);
      }
    });
  });

  ipcMain.handle('open-git-clone-window', (_event, params: {
    repoName: string;
    repoUrl?: string;
    initialRecursive?: boolean;
    isInstanceMode?: boolean;
    adminUrl?: string;
  }) => {
    windowManager.openGitCloneWindow(params);
  });

  ipcMain.handle('magicgate-get-repos', async (_event, params: { adminUrl: string }) => {
    const config = store.getConfig();
    const username = config.magicgate?.username;
    const password = config.magicgate?.password;
    return fetchInstanceSectionRepos(params.adminUrl, username, password);
  });

  ipcMain.handle('magicgate-clone-start', async (event, params: {
    repos: MagicGateSectionRepo[];
    targetDir: string;
    recursive?: boolean;
    rawJson?: string;
  }) => {
    const sender = event.sender;
    return runMultiRepoClone({
      ...params,
      onProgress: (data) => {
        if (!sender.isDestroyed()) {
          sender.send('magicgate-clone-progress', data);
        }
      },
    });
  });

  ipcMain.handle('pause-global-hotkey', () => {
    if (currentHotkey) {
      globalShortcut.unregister(currentHotkey);
      console.log(`[Main] Global hotkey paused for input recording: ${currentHotkey}`);
    }
    if (currentColorMasterHotkey) {
      globalShortcut.unregister(currentColorMasterHotkey);
      console.log(`[Main] ColorMaster hotkey paused for input recording: ${currentColorMasterHotkey}`);
    }
  });

  ipcMain.handle('resume-global-hotkey', () => {
    const cfg = store.getConfig();
    const hotkey = cfg.hotkey || currentHotkey;
    if (hotkey) {
      registerGlobalHotkey(hotkey);
      console.log(`[Main] Global hotkey resumed: ${hotkey}`);
    }
    registerColorMasterHotkey(cfg.donkeyTools?.colorMaster?.hotkey);
  });

  ipcMain.handle('get-items', () => {
    return getCombinedItems();
  });

  ipcMain.handle('get-material-icons', () => {
    return store.getMaterialIcons();
  });

  ipcMain.handle('download-material-icons', async () => {
    try {
      const url = 'https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Chyba serveru Google Fonts (${res.status} ${res.statusText})`);
      }
      const text = await res.text();
      const clean = text.replace(/^\)]}'\s*/, '');
      const data = JSON.parse(clean);

      if (!Array.isArray(data.icons)) {
        throw new Error('Neplatný formát metadat z Google Fonts');
      }

      function normalizeCategory(rawCat?: string): string {
        if (!rawCat) return 'Ostatní';
        const lower = rawCat.toLowerCase().trim();
        if (lower.includes('action')) return 'Akce';
        if (lower.includes('audio') || lower === 'av' || lower.includes('video')) return 'Zvuk a video';
        if (lower.includes('image') || lower.includes('photo')) return 'Obrázky';
        if (lower.includes('social')) return 'Sociální';
        if (lower.includes('device') || lower.includes('hardware') || lower.includes('android')) return 'Hardware a zařízení';
        if (lower.includes('map') || lower.includes('transit') || lower.includes('travel') || lower.includes('places')) return 'Mapy a cestování';
        if (lower.includes('communicat')) return 'Komunikace';
        if (lower.includes('home') || lower.includes('household')) return 'Domácnost';
        if (lower.includes('business') || lower.includes('payment')) return 'Obchod a finance';
        if (lower.includes('notif') || lower.includes('alert')) return 'Upozornění';
        if (lower.includes('text') || lower.includes('editor')) return 'Text a editor';
        if (lower.includes('file')) return 'Soubory';
        if (lower.includes('privacy') || lower.includes('security')) return 'Bezpečnost';
        if (lower.includes('navigat') || lower.includes('search')) return 'Navigace a hledání';
        if (lower.includes('activit')) return 'Aktivity';
        return 'Ostatní';
      }

      // Filter only icons supported in Material Symbols Outlined (exclude legacy Material Icons)
      const symbolsOnly = data.icons.filter((item: any) => {
        const unsupported = Array.isArray(item.unsupported_families) ? item.unsupported_families : [];
        return !unsupported.includes('Material Symbols Outlined');
      });

      const iconMap = new Map<string, { name: string; category: string; tags: string[] }>();
      for (const item of symbolsOnly) {
        if (!item.name) continue;
        const name = String(item.name).trim().toLowerCase();
        const rawTags = Array.isArray(item.tags) ? item.tags : [];
        const cleanTags = rawTags
          .map((t: any) => String(t).trim().toLowerCase())
          .filter((t: string) => t.length > 0);

        if (!iconMap.has(name)) {
          iconMap.set(name, {
            name,
            category: normalizeCategory(item.categories?.[0]),
            tags: cleanTags,
          });
        } else {
          const existing = iconMap.get(name)!;
          existing.tags = Array.from(new Set([...existing.tags, ...cleanTags]));
        }
      }

      const simplified = Array.from(iconMap.values());

      store.saveMaterialIcons(simplified);

      const downloadedAt = new Date().toISOString();
      const currentConfig = store.getConfig();
      const updatedConfig = {
        ...currentConfig,
        iconsLastDownloadedAt: downloadedAt,
        iconsCount: simplified.length,
      };
      store.saveConfig(updatedConfig);

      windowManager.getMainWindow()?.webContents.send('config-updated', updatedConfig);
      windowManager.getSettingsWindow()?.webContents.send('config-updated', updatedConfig);

      return {
        success: true,
        count: simplified.length,
        downloadedAt,
      };
    } catch (err: any) {
      console.error('[Main] Failed to download material icons:', err);
      return {
        success: false,
        error: err?.message || 'Chyba při stahování ikon z Google Fonts.',
      };
    }
  });

  ipcMain.handle('sync-now', async () => {
    await syncManager.syncAll((progress) => {
      windowManager.getMainWindow()?.webContents.send('sync-progress', progress);
      windowManager.getSettingsWindow()?.webContents.send('sync-progress', progress);
    });
    const updatedConfig = store.getConfig();
    const allItems = getCombinedItems();
    windowManager.getMainWindow()?.webContents.send('config-updated', updatedConfig);
    windowManager.getSettingsWindow()?.webContents.send('config-updated', updatedConfig);
    windowManager.getMainWindow()?.webContents.send('data-updated', allItems);
    windowManager.getSettingsWindow()?.webContents.send('data-updated', allItems);
    return allItems;
  });

  ipcMain.handle('inspect-source', async (_, source: any) => {
    return await syncManager.inspectSource(source);
  });

  function resolveDefaultPath(initialPath?: string, forDirectory: boolean = false): string | undefined {
    if (!initialPath || typeof initialPath !== 'string') return undefined;
    const trimmed = initialPath.trim();
    if (!trimmed) return undefined;

    try {
      if (fs.existsSync(trimmed)) {
        if (forDirectory) {
          const stat = fs.statSync(trimmed);
          return stat.isDirectory() ? trimmed : path.dirname(trimmed);
        }
        return trimmed;
      }
      // If exact path does not exist, check its parent directory
      const parent = path.dirname(trimmed);
      if (fs.existsSync(parent)) {
        return parent;
      }
    } catch {
      // ignore filesystem errors
    }
    return undefined;
  }

  ipcMain.handle('select-json-file', async (_event, defaultPath?: string) => {
    const win = windowManager.getSettingsWindow() || windowManager.getMainWindow();
    const resolvedPath = resolveDefaultPath(defaultPath, false);
    const result = await dialog.showOpenDialog(win || (undefined as any), {
      title: 'Vyberte JSON soubor s daty',
      defaultPath: resolvedPath,
      filters: [
        { name: 'JSON soubory (*.json)', extensions: ['json'] },
        { name: 'Všechny soubory', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('select-xml-file', async (_event, defaultPath?: string) => {
    const win = windowManager.getSettingsWindow() || windowManager.getMainWindow();
    const resolvedPath = resolveDefaultPath(defaultPath, false);
    const result = await dialog.showOpenDialog(win || (undefined as any), {
      title: 'Vyberte MagicGate XML soubor konfigurace',
      defaultPath: resolvedPath,
      filters: [
        { name: 'XML soubory (*.xml)', extensions: ['xml'] },
        { name: 'Všechny soubory', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('select-directory', async (_event, defaultPath?: string) => {
    const win = windowManager.getGitCloneWindow() || windowManager.getSettingsWindow() || windowManager.getMainWindow();
    const resolvedPath = resolveDefaultPath(defaultPath, true);
    const result = await dialog.showOpenDialog(win || (undefined as any), {
      title: 'Vyberte cílovou složku',
      defaultPath: resolvedPath,
      properties: ['openDirectory', 'createDirectory'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('run-git-clone', async (_event, data: { repoUrl: string; targetDir: string; recursive?: boolean }) => {
    const { repoUrl, targetDir, recursive } = data;
    if (!repoUrl || !targetDir) {
      return { success: false, targetPath: '', error: 'Chybí URL repozitáře nebo cílová složka.' };
    }

    return new Promise((resolve) => {
      // Determine folder name from repository url
      const cleanUrl = repoUrl.trim().replace(/\.git$/i, '');
      const parts = cleanUrl.split(/[/\\\\]/);
      const repoName = parts[parts.length - 1] || 'repository';
      const targetPath = path.join(targetDir, repoName);

      const args = ['clone'];
      if (recursive) {
        args.push('--recursive');
      }
      args.push(repoUrl, targetPath);

      const gitProcess = spawn('git', args, {
        cwd: targetDir,
        shell: true,
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      gitProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      gitProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      gitProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, targetPath, output: stdout });
        } else {
          const combinedErr = stderr || stdout || `Příkaz git clone selhal s kódem ${code}`;
          const isAlreadyExists =
            /already exists and is not an empty directory/i.test(combinedErr) ||
            /již existuje a není prázdná/i.test(combinedErr);

          if (isAlreadyExists) {
            resolve({
              success: true,
              targetPath,
              alreadyExists: true,
              output: `Repozitář již existuje v cílové složce.`,
            });
          } else {
            resolve({
              success: false,
              targetPath,
              error: combinedErr,
            });
          }
        }
      });

      gitProcess.on('error', (err) => {
        resolve({
          success: false,
          targetPath,
          error: err.message || 'Nepodařilo se spustit příkaz git. Ujistěte se, že máte Git nainstalovaný a v systémové cestě PATH.',
        });
      });
    });
  });

  ipcMain.handle('execute-action', async (_event, data: { action: string; location: string; settings?: string | null }) => {
    const { action, location, settings } = data;
    if (!location) return;

    try {
      const trimmed = location.trim();
      const isUrl = /^https?:\/\//i.test(trimmed) || /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/i.test(trimmed);

      if (action === 'paste' || action === 'copy') {
        clipboard.writeText(location);
        windowManager.hideImmediately();
        return;
      }

      if (action === 'open' || !action) {
        if (isUrl) {
          let fullUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

          if (settings === 'magicgate' && store.getConfig().extensions?.magicgate !== false) {
            try {
              const config = store.getConfig();
              const autoLoginUrl = await getMagicGateAutoLoginUrl(fullUrl, config);
              fullUrl = autoLoginUrl;
            } catch (mgErr: any) {
              console.error('[Main] MagicGate login error, falling back to direct URL:', mgErr?.message || mgErr);
            }
          }

          await shell.openExternal(fullUrl);
        } else {
          // File or folder path on disk
          const openErr = await shell.openPath(trimmed);
          if (openErr) {
            console.error(`[Main] openPath error: ${openErr}`);
            // Fallback try as external url
            await shell.openExternal(trimmed);
          }
        }
      }
    } catch (err) {
      console.error('[Main] Failed to execute action:', err);
    }
  });

  ipcMain.handle('test-github-connection', async (_event, settings) => {
    return await testGitHubConnection(settings);
  });

  ipcMain.handle('open-external', async (_event, url: string) => {
    if (url) {
      const fullUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      await shell.openExternal(fullUrl);
    }
  });

  ipcMain.handle('open-path', async (_event, filePath: string) => {
    if (filePath) {
      await shell.openPath(filePath);
    }
  });

  ipcMain.handle('hide-window', () => {
    windowManager.hideSpotlight();
  });

  ipcMain.handle('open-power-window', () => {
    windowManager.openPowerWindow();
  });

  ipcMain.handle('close-power-window', () => {
    windowManager.closePowerWindow();
  });

  ipcMain.handle('restart-app', () => {
    windowManager.prepareForQuitOrRestart();
    globalShortcut.unregisterAll();
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle('quit-app', () => {
    windowManager.prepareForQuitOrRestart();
    globalShortcut.unregisterAll();
    app.quit();
  });

  ipcMain.handle('reset-and-hide-spotlight', () => {
    windowManager.setSkipSpotlightRestoreOnCloneClose(true);
    windowManager.hideImmediately();
    windowManager.getMainWindow()?.webContents.send('reset-spotlight');
  });

  ipcMain.handle('check-update', async () => {
    return await updateChecker.checkForUpdates(true);
  });

  ipcMain.handle('download-update', async (_event, downloadUrl: string) => {
    return await updateChecker.downloadUpdate(downloadUrl, (progress) => {
      windowManager.getMainWindow()?.webContents.send('update-download-progress', progress);
      windowManager.getSettingsWindow()?.webContents.send('update-download-progress', progress);
    });
  });

  ipcMain.handle('install-update', (_event, filePath: string) => {
    updateChecker.installAndRestart(filePath, () => {
      windowManager.prepareForQuitOrRestart();
      globalShortcut.unregisterAll();
      if (syncIntervalTimer) clearInterval(syncIntervalTimer);
      if (updateIntervalTimer) clearInterval(updateIntervalTimer);
    });
  });

  // Installer IPC handlers
  ipcMain.handle('installer-get-default-path', () => {
    return InstallerService.getDefaultInstallPath();
  });

  ipcMain.handle('installer-browse-folder', async (_event, defaultPath?: string) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win || (undefined as any), {
      title: 'Vyberte cílovou složku pro instalaci IADonkey',
      defaultPath: defaultPath || InstallerService.getDefaultInstallPath(),
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('installer-perform-install', async (event, options) => {
    return await InstallerService.performInstall(options, (progress) => {
      event.sender.send('installer-progress', progress);
    });
  });

  ipcMain.handle('installer-launch-and-finish', (_event, targetDir: string, runNow: boolean) => {
    if (runNow) {
      InstallerService.launchInstalledAppAndExit(targetDir);
    } else {
      app.exit(0);
    }
  });

  ipcMain.handle('installer-perform-uninstall', () => {
    InstallerService.performUninstall();
  });

  ipcMain.handle('minimize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  // VS Code integration handlers
  ipcMain.handle('open-in-vscode', async (_event, folderPath: string) => {
    if (!folderPath) {
      return { success: false, error: 'Chybí cesta ke složce.' };
    }
    return await openPathInVscode(folderPath);
  });

  ipcMain.handle('select-vscode-path', async (_event, defaultPath?: string) => {
    const win = windowManager.getSettingsWindow() || windowManager.getMainWindow();
    const resolvedPath = resolveDefaultPath(defaultPath, false);
    const result = await dialog.showOpenDialog(win || (undefined as any), {
      title: 'Vyberte spustitelný soubor VS Code (Code.exe)',
      defaultPath: resolvedPath,
      properties: ['openFile'],
      filters: [
        { name: 'Spustitelné soubory (*.exe, *.cmd)', extensions: ['exe', 'cmd'] },
        { name: 'Všechny soubory', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('detect-vscode-path', () => {
    return detectDefaultVscodePath();
  });

  ipcMain.handle('open-in-android-studio', async (_event, folderPath: string) => {
    if (!folderPath) {
      return { success: false, error: 'Chybí cesta ke složce.' };
    }
    return await openPathInAndroidStudio(folderPath);
  });

  ipcMain.handle('select-android-studio-path', async (_event, defaultPath?: string) => {
    const win = windowManager.getSettingsWindow() || windowManager.getMainWindow();
    const resolvedPath = resolveDefaultPath(defaultPath, false);
    const result = await dialog.showOpenDialog(win || (undefined as any), {
      title: 'Vyberte spustitelný soubor Android Studio (studio64.exe)',
      defaultPath: resolvedPath,
      properties: ['openFile'],
      filters: [
        { name: 'Spustitelné soubory (*.exe, *.bat, *.cmd)', extensions: ['exe', 'bat', 'cmd'] },
        { name: 'Všechny soubory', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('detect-android-studio-path', () => {
    return detectDefaultAndroidStudioPath();
  });

  ipcMain.handle('is-android-project', (_event, folderPath: string) => {
    return isAndroidProjectFolder(folderPath);
  });

  ipcMain.handle('get-existing-cloned-repos', (_event, baseDir?: string) => {
    const config = store.getConfig();
    const targetDir = baseDir?.trim() || config.github?.defaultCloneDir?.trim();
    if (!targetDir || !fs.existsSync(targetDir)) {
      return [];
    }
    try {
      const repoNames = new Set<string>();

      // 1. Direct subdirectories of targetDir (standard GitHub / git repositories)
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(targetDir, entry.name);
          try {
            const subEntries = fs.readdirSync(subPath);
            if (subEntries.length > 0) {
              repoNames.add(entry.name.toLowerCase());
            }
          } catch {}
        }
      }

      // 2. Subdirectories of targetDir/magicgate (MagicGate instances)
      const mgDir = path.join(targetDir, 'magicgate');
      if (fs.existsSync(mgDir)) {
        try {
          const mgStat = fs.statSync(mgDir);
          if (mgStat.isDirectory()) {
            const mgEntries = fs.readdirSync(mgDir, { withFileTypes: true });
            for (const mgEntry of mgEntries) {
              if (mgEntry.isDirectory()) {
                const mgSubPath = path.join(mgDir, mgEntry.name);
                try {
                  const subEntries = fs.readdirSync(mgSubPath);
                  if (subEntries.length > 0) {
                    repoNames.add(`magicgate/${mgEntry.name.toLowerCase()}`);
                  }
                } catch {}
              }
            }
          }
        } catch {}
      }

      return Array.from(repoNames);
    } catch (err) {
      console.warn('[Main] Error reading existing cloned repos:', err);
      return [];
    }
  });

  ipcMain.handle('get-splash-status', () => {
    return windowManager ? windowManager.getLastSplashStatus() : { percent: 15, text: 'Inicializace aplikace...' };
  });
}

function detectDefaultVscodePath(): string | null {
  const localAppData = process.env.LOCALAPPDATA || '';
  const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const candidates = [
    path.join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe'),
    path.join(progFiles, 'Microsoft VS Code', 'Code.exe'),
    path.join(progFilesX86, 'Microsoft VS Code', 'Code.exe'),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Check if 'code' or 'code.cmd' is available in PATH
  try {
    const check = spawnSync('where', ['code.cmd'], { windowsHide: true, encoding: 'utf-8' });
    if (check.status === 0 && check.stdout) {
      const firstLine = check.stdout.split(/\r?\n/)[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    }
  } catch {}

  return null;
}

async function openPathInVscode(folderPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const config = store.getConfig();
    let vscodeExe = config.vscode?.path?.trim();

    if (!vscodeExe || !fs.existsSync(vscodeExe)) {
      const detected = detectDefaultVscodePath();
      if (detected) {
        vscodeExe = detected;
      }
    }

    if (vscodeExe && fs.existsSync(vscodeExe)) {
      const child = spawn(`"${vscodeExe}"`, [`"${folderPath}"`], {
        shell: true,
        detached: true,
        windowsHide: true,
      });
      child.unref();
      return { success: true };
    }

    // Fallback: spawn code directly via shell
    const child = spawn('code', [`"${folderPath}"`], {
      shell: true,
      detached: true,
      windowsHide: true,
    });
    child.unref();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nepodařilo se spustit VS Code.' };
  }
}

function detectDefaultAndroidStudioPath(): string | null {
  const localAppData = process.env.LOCALAPPDATA || '';
  const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const candidates = [
    path.join(progFiles, 'Android', 'Android Studio', 'bin', 'studio64.exe'),
    path.join(localAppData, 'Programs', 'Android Studio', 'bin', 'studio64.exe'),
    path.join(progFilesX86, 'Android', 'Android Studio', 'bin', 'studio64.exe'),
    path.join(progFiles, 'Google', 'Android Studio', 'bin', 'studio64.exe'),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Check JetBrains Toolbox apps directory for Android Studio
  try {
    const toolboxDir = path.join(localAppData, 'JetBrains', 'Toolbox', 'apps', 'AndroidStudio', 'ch-0');
    if (fs.existsSync(toolboxDir)) {
      const versions = fs.readdirSync(toolboxDir);
      for (const ver of versions) {
        const candidate = path.join(toolboxDir, ver, 'bin', 'studio64.exe');
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  } catch {}

  // Check if 'studio64.exe' or 'studio.bat' is available in PATH
  try {
    const checkExe = spawnSync('where', ['studio64.exe'], { windowsHide: true, encoding: 'utf-8' });
    if (checkExe.status === 0 && checkExe.stdout) {
      const firstLine = checkExe.stdout.split(/\r?\n/)[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    }
    const checkBat = spawnSync('where', ['studio.bat'], { windowsHide: true, encoding: 'utf-8' });
    if (checkBat.status === 0 && checkBat.stdout) {
      const firstLine = checkBat.stdout.split(/\r?\n/)[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    }
  } catch {}

  return null;
}

async function openPathInAndroidStudio(folderPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const config = store.getConfig();
    let studioExe = config.androidStudio?.path?.trim();

    if (!studioExe || !fs.existsSync(studioExe)) {
      const detected = detectDefaultAndroidStudioPath();
      if (detected) {
        studioExe = detected;
      }
    }

    if (studioExe && fs.existsSync(studioExe)) {
      const child = spawn(`"${studioExe}"`, [`"${folderPath}"`], {
        shell: true,
        detached: true,
        windowsHide: true,
      });
      child.unref();
      return { success: true };
    }

    // Fallback: spawn studio64 directly via shell
    const child = spawn('studio64', [`"${folderPath}"`], {
      shell: true,
      detached: true,
      windowsHide: true,
    });
    child.unref();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nepodařilo se spustit Android Studio.' };
  }
}

function isAndroidProjectFolder(folderPath: string): boolean {
  if (!folderPath) return false;
  try {
    if (!fs.existsSync(folderPath)) return false;
    const markers = [
      path.join(folderPath, 'build.gradle'),
      path.join(folderPath, 'build.gradle.kts'),
      path.join(folderPath, 'settings.gradle'),
      path.join(folderPath, 'settings.gradle.kts'),
      path.join(folderPath, 'app', 'build.gradle'),
      path.join(folderPath, 'app', 'build.gradle.kts'),
      path.join(folderPath, 'app', 'src', 'main', 'AndroidManifest.xml'),
      path.join(folderPath, 'AndroidManifest.xml'),
    ];
    return markers.some((m) => fs.existsSync(m));
  } catch {
    return false;
  }
}

function startBackgroundTasks() {
  // 0. Initial scan of installed Windows applications
  appScanner.scanApps().then(() => {
    const config = store.getConfig();
    if (config.searchInstalledApps !== false) {
      const allItems = getCombinedItems();
      windowManager.getMainWindow()?.webContents.send('data-updated', allItems);
      windowManager.getSettingsWindow()?.webContents.send('data-updated', allItems);
    }
  }).catch((err) => {
    console.warn('[Main] AppScanner error on startup:', err);
  });

  // 1. Silent sync interval
  const config = store.getConfig();
  const intervalMs = Math.max(5, config.autoSyncIntervalMinutes || 30) * 60 * 1000;
  
  // Initial sync after 600ms if sources exist
  setTimeout(async () => {
    if (store.getConfig().sources.length > 0) {
      try {
        console.log('[Main] Running startup silent sync...');
        await syncManager.syncAll((progress) => {
          windowManager.getMainWindow()?.webContents.send('sync-progress', progress);
          windowManager.getSettingsWindow()?.webContents.send('sync-progress', progress);
        });
        const updatedConfig = store.getConfig();
        const allItems = getCombinedItems();
        windowManager.getMainWindow()?.webContents.send('config-updated', updatedConfig);
        windowManager.getSettingsWindow()?.webContents.send('config-updated', updatedConfig);
        windowManager.getMainWindow()?.webContents.send('data-updated', allItems);
        windowManager.getSettingsWindow()?.webContents.send('data-updated', allItems);
      } catch (err) {
        console.error('[Main] Startup sync error:', err);
      }
    }
  }, 600);

  syncIntervalTimer = setInterval(async () => {
    if (store.getConfig().sources.length > 0) {
      try {
        console.log('[Main] Running scheduled background sync...');
        await syncManager.syncAll((progress) => {
          windowManager.getMainWindow()?.webContents.send('sync-progress', progress);
          windowManager.getSettingsWindow()?.webContents.send('sync-progress', progress);
        });
        const updatedConfig = store.getConfig();
        const allItems = getCombinedItems();
        windowManager.getMainWindow()?.webContents.send('config-updated', updatedConfig);
        windowManager.getSettingsWindow()?.webContents.send('config-updated', updatedConfig);
        windowManager.getMainWindow()?.webContents.send('data-updated', allItems);
        windowManager.getSettingsWindow()?.webContents.send('data-updated', allItems);
      } catch (err) {
        console.error('[Main] Scheduled sync error:', err);
      }
    }
  }, intervalMs);

  // 2. Periodic update check (run once at startup after 5s, then every 24h)
  const checkUpdateSilently = async () => {
    try {
      const updateInfo = await updateChecker.checkForUpdates(false);
      if (updateInfo.hasUpdate) {
        const win = windowManager.getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('update-available', updateInfo);
        }
        const settingsWin = windowManager.getSettingsWindow();
        if (settingsWin && !settingsWin.isDestroyed()) {
          settingsWin.webContents.send('update-available', updateInfo);
        }
      }
    } catch (err) {
      // silent catch for background checks
    }
  };

  setTimeout(checkUpdateSilently, 5000);
  updateIntervalTimer = setInterval(checkUpdateSilently, 24 * 60 * 60 * 1000);
}

// App lifecycle
app.whenReady().then(async () => {
  store = new AppStore();
  syncManager = new DataSyncManager(store);
  updateChecker = new UpdateChecker(store);
  appScanner = new AppScanner();

  const initialConfig = store.getConfig();
  currentHotkey = initialConfig.hotkey || 'Ctrl+Alt+Space';

  windowManager = new WindowManager(
    // onSyncRequest from Tray
    async () => {
      await syncManager.syncAll((progress) => {
        windowManager.getMainWindow()?.webContents.send('sync-progress', progress);
        windowManager.getSettingsWindow()?.webContents.send('sync-progress', progress);
      });
      const updatedConfig = store.getConfig();
      const allItems = getCombinedItems();
      windowManager.getMainWindow()?.webContents.send('config-updated', updatedConfig);
      windowManager.getSettingsWindow()?.webContents.send('config-updated', updatedConfig);
      windowManager.getMainWindow()?.webContents.send('data-updated', allItems);
      windowManager.getSettingsWindow()?.webContents.send('data-updated', allItems);
    },
    // onSettingsRequest from Tray
    () => {
      windowManager.getMainWindow()?.webContents.send('open-settings');
    },
    // getConfig callback
    () => store.getConfig()
  );

  setupIpcHandlers();

  // Check if running in uninstaller mode
  if (process.argv.includes('--uninstall')) {
    windowManager.createUninstallerWindow();
    return;
  }

  // Check if running in installer mode
  if (InstallerService.isInstallerMode()) {
    windowManager.createInstallerWindow();
    return;
  }

  const isSilentStart =
    process.argv.includes('--background') ||
    process.argv.includes('--hidden') ||
    process.argv.includes('--silent');

  if (!isSilentStart) {
    windowManager.createSplashWindow(app.getVersion() || '1.1.16');
  }

  const mainWindow = windowManager.createMainWindow();
  windowManager.createTray(currentHotkey);
  registerGlobalHotkey(currentHotkey);
  registerColorMasterHotkey(initialConfig.donkeyTools?.colorMaster?.hotkey);

  const launchDeferredTasks = () => {
    startBackgroundTasks();
    faviconService.refreshFavicons((favicons) => {
      windowManager.getMainWindow()?.webContents.send('search-engine-favicons-updated', favicons);
      windowManager.getSettingsWindow()?.webContents.send('search-engine-favicons-updated', favicons);
    }).catch((err) => {
      console.warn('[Main] Favicon refresh error:', err);
    });
  };

  if (!isSilentStart) {
    // 1. Wait until splash screen is physically rendered and visible on screen
    await windowManager.whenSplashReady();

    // 2. Guaranteed 5-second display timer from the exact moment user sees the splash screen
    const minSplashPromise = new Promise((resolve) => setTimeout(resolve, 5000));

    // 3. Verify mainWindow is loaded
    const mainWindowReadyPromise = new Promise<void>((resolve) => {
      if (!mainWindow) {
        resolve();
        return;
      }
      if (mainWindow.webContents.isLoading()) {
        mainWindow.webContents.once('did-finish-load', () => resolve());
      } else {
        resolve();
      }
    });

    // Run splash for AT LEAST 5 seconds while visible, then reveal and focus Spotlight
    Promise.all([minSplashPromise, mainWindowReadyPromise]).then(async () => {
      await windowManager.closeSplashWindow();
      windowManager.showSpotlight();
      // Launch background scan and sync smoothly after spotlight is ready
      setTimeout(() => launchDeferredTasks(), 500);
    });
  } else {
    launchDeferredTasks();
  }
});

app.on('second-instance', () => {
  windowManager?.showSpotlight();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (syncIntervalTimer) clearInterval(syncIntervalTimer);
  if (updateIntervalTimer) clearInterval(updateIntervalTimer);
});

app.on('window-all-closed', () => {
  // Keep running in tray on Windows
});
