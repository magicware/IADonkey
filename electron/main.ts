import { app, BrowserWindow, globalShortcut, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import { AppStore } from './store';
import { DataSyncManager } from './dataSync';
import { UpdateChecker } from './updater';
import { WindowManager } from './windowManager';
import { AppConfig } from '../src/types';
import { getMagicGateAutoLoginUrl } from './magicGate';

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
let currentHotkey = 'Ctrl+Alt+Space';
let syncIntervalTimer: NodeJS.Timeout | null = null;
let updateIntervalTimer: NodeJS.Timeout | null = null;

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
    return store.getItems();
  });

  ipcMain.handle('sync-now', async () => {
    const items = await syncManager.syncAll((progress) => {
      windowManager.getMainWindow()?.webContents.send('sync-progress', progress);
      windowManager.getSettingsWindow()?.webContents.send('sync-progress', progress);
    });
    const updatedConfig = store.getConfig();
    windowManager.getMainWindow()?.webContents.send('config-updated', updatedConfig);
    windowManager.getSettingsWindow()?.webContents.send('config-updated', updatedConfig);
    windowManager.getMainWindow()?.webContents.send('data-updated', items);
    windowManager.getSettingsWindow()?.webContents.send('data-updated', items);
    return items;
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

  ipcMain.handle('execute-action', async (_event, data: { action: string; location: string; settings?: string | null }) => {
    const { action, location, settings } = data;
    if (!location) return;

    try {
      const trimmed = location.trim();
      const isUrl = /^https?:\/\//i.test(trimmed) || /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/i.test(trimmed);

      if (action === 'open' || !action) {
        if (isUrl) {
          let fullUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

          if (settings === 'magicgate') {
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
}

function startBackgroundTasks() {
  // 1. Silent sync interval
  const config = store.getConfig();
  const intervalMs = Math.max(5, config.autoSyncIntervalMinutes || 30) * 60 * 1000;
  
  // Initial sync after 600ms if sources exist
  setTimeout(async () => {
    if (store.getConfig().sources.length > 0) {
      try {
        console.log('[Main] Running startup silent sync...');
        const items = await syncManager.syncAll((progress) => {
          windowManager.getMainWindow()?.webContents.send('sync-progress', progress);
          windowManager.getSettingsWindow()?.webContents.send('sync-progress', progress);
        });
        const updatedConfig = store.getConfig();
        windowManager.getMainWindow()?.webContents.send('config-updated', updatedConfig);
        windowManager.getSettingsWindow()?.webContents.send('config-updated', updatedConfig);
        windowManager.getMainWindow()?.webContents.send('data-updated', items);
        windowManager.getSettingsWindow()?.webContents.send('data-updated', items);
      } catch (err) {
        console.error('[Main] Startup sync error:', err);
      }
    }
  }, 600);

  syncIntervalTimer = setInterval(async () => {
    if (store.getConfig().sources.length > 0) {
      try {
        console.log('[Main] Running scheduled background sync...');
        const items = await syncManager.syncAll((progress) => {
          windowManager.getMainWindow()?.webContents.send('sync-progress', progress);
          windowManager.getSettingsWindow()?.webContents.send('sync-progress', progress);
        });
        const updatedConfig = store.getConfig();
        windowManager.getMainWindow()?.webContents.send('config-updated', updatedConfig);
        windowManager.getSettingsWindow()?.webContents.send('config-updated', updatedConfig);
        windowManager.getMainWindow()?.webContents.send('data-updated', items);
        windowManager.getSettingsWindow()?.webContents.send('data-updated', items);
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

  const initialConfig = store.getConfig();
  currentHotkey = initialConfig.hotkey || 'Ctrl+Alt+Space';

  windowManager = new WindowManager(
    // onSyncRequest from Tray
    async () => {
      const items = await syncManager.syncAll((progress) => {
        windowManager.getMainWindow()?.webContents.send('sync-progress', progress);
        windowManager.getSettingsWindow()?.webContents.send('sync-progress', progress);
      });
      const updatedConfig = store.getConfig();
      windowManager.getMainWindow()?.webContents.send('config-updated', updatedConfig);
      windowManager.getSettingsWindow()?.webContents.send('config-updated', updatedConfig);
      windowManager.getMainWindow()?.webContents.send('data-updated', items);
      windowManager.getSettingsWindow()?.webContents.send('data-updated', items);
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
