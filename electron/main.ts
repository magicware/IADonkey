import { app, BrowserWindow, globalShortcut, ipcMain, dialog, shell, clipboard } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
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

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

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

function setupIpcHandlers() {
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
  });

  ipcMain.handle('resume-global-hotkey', () => {
    const cfg = store.getConfig();
    const hotkey = cfg.hotkey || currentHotkey;
    if (hotkey) {
      registerGlobalHotkey(hotkey);
      console.log(`[Main] Global hotkey resumed: ${hotkey}`);
    }
  });

  ipcMain.handle('get-items', () => {
    return getCombinedItems();
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

  ipcMain.handle('select-json-file', async () => {
    const win = windowManager.getMainWindow();
    const result = await dialog.showOpenDialog(win || undefined as any, {
      title: 'Vyberte JSON soubor s daty',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('select-xml-file', async () => {
    const win = windowManager.getSettingsWindow() || windowManager.getMainWindow();
    const result = await dialog.showOpenDialog(win || (undefined as any), {
      title: 'Vyberte MagicGate XML soubor konfigurace',
      filters: [
        { name: 'XML soubory', extensions: ['xml'] },
        { name: 'Všechny soubory', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('select-directory', async () => {
    const win = windowManager.getSettingsWindow() || windowManager.getMainWindow();
    const result = await dialog.showOpenDialog(win || (undefined as any), {
      title: 'Vyberte složku pro klonování repozitářů',
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
    windowManager.hideImmediately();
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
    updateChecker.installAndRestart(filePath);
  });

  // VS Code integration handlers
  ipcMain.handle('open-in-vscode', async (_event, folderPath: string) => {
    if (!folderPath) {
      return { success: false, error: 'Chybí cesta ke složce.' };
    }
    return await openPathInVscode(folderPath);
  });

  ipcMain.handle('select-vscode-path', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Vyberte spustitelný soubor VS Code (Code.exe)',
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

  ipcMain.handle('get-existing-cloned-repos', (_event, baseDir?: string) => {
    const config = store.getConfig();
    const targetDir = baseDir?.trim() || config.github?.defaultCloneDir?.trim();
    if (!targetDir || !fs.existsSync(targetDir)) {
      return [];
    }
    try {
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const repoNames: string[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(targetDir, entry.name);
          try {
            const subEntries = fs.readdirSync(subPath);
            if (subEntries.length > 0) {
              repoNames.push(entry.name.toLowerCase());
            }
          } catch {}
        }
      }
      return repoNames;
    } catch (err) {
      console.warn('[Main] Error reading existing cloned repos:', err);
      return [];
    }
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
app.whenReady().then(() => {
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
    }
  );

  windowManager.createMainWindow();
  windowManager.createTray(currentHotkey);

  setupIpcHandlers();
  registerGlobalHotkey(currentHotkey);
  startBackgroundTasks();

  // Background refresh of search engine favicons from baseUrl metadata
  faviconService.refreshFavicons((favicons) => {
    windowManager.getMainWindow()?.webContents.send('search-engine-favicons-updated', favicons);
    windowManager.getSettingsWindow()?.webContents.send('search-engine-favicons-updated', favicons);
  }).catch((err) => {
    console.warn('[Main] Favicon refresh error:', err);
  });
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
