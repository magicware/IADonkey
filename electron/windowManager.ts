import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, Tray, Menu, screen, nativeImage, app } from 'electron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getAppIcon = () => {
  const ico = path.join(__dirname, '../electron/assets/icon.ico');
  const png = path.join(__dirname, '../electron/assets/icon.png');
  if (fs.existsSync(ico)) return ico;
  if (fs.existsSync(png)) return png;
  return undefined;
};

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private gitCloneWindow: BrowserWindow | null = null;
  private splashWindow: BrowserWindow | null = null;
  private lastSplashStatus: { percent: number; text: string } = {
    percent: 10,
    text: 'Inicializace aplikace...',
  };
  private tray: Tray | null = null;
  private isQuitting = false;
  private lastShowTime = 0;
  private shouldRestoreSpotlightOnCloneClose = true;

  public setSkipSpotlightRestoreOnCloneClose(skip: boolean): void {
    this.shouldRestoreSpotlightOnCloneClose = !skip;
  }

  constructor(
    private onSyncRequest: () => void,
    private onSettingsRequest: () => void,
    private getConfig?: () => any
  ) {}

  public createMainWindow(): BrowserWindow {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { bounds } = primaryDisplay;

    const width = 740;
    const height = 540;
    const x = Math.round(bounds.x + (bounds.width - width) / 2);
    const y = Math.round(bounds.y + (bounds.height - height) / 3);

    const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
      ? path.join(__dirname, 'preload.cjs')
      : fs.existsSync(path.join(__dirname, 'preload.mjs'))
      ? path.join(__dirname, 'preload.mjs')
      : path.join(__dirname, 'preload.js');

    this.mainWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      icon: getAppIcon(),
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      hasShadow: false,
      webPreferences: {
        preload: preloadPath,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // In dev mode, load Vite server; in prod, load index.html
    if (process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Preload window in background; spotlight is revealed via hotkey or tray click
    this.mainWindow.once('ready-to-show', () => {
      // Keep hidden in background until requested
    });

    // Hide window when it loses focus (unless devtools is active or during initial reveal)
    this.mainWindow.on('blur', () => {
      if (Date.now() - this.lastShowTime < 1000) {
        return;
      }
      if (this.mainWindow && !this.mainWindow.webContents.isDevToolsOpened()) {
        this.hideSpotlight();
      }
    });

    // Intercept close to hide instead of quit
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    return this.mainWindow;
  }

  public showSpotlight(): void {
    if (!this.mainWindow) return;

    this.lastShowTime = Date.now();

    // Center on the display where the mouse cursor is located
    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { bounds } = currentDisplay;

    const width = 740;
    const height = 540;
    const x = Math.round(bounds.x + (bounds.width - width) / 2);
    const y = Math.round(bounds.y + (bounds.height - height) / 3);

    const b = this.mainWindow.getBounds();
    if (b.x !== x || b.y !== y || b.width !== width || b.height !== height) {
      this.mainWindow.setBounds({ x, y, width, height });
    }

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }
    if (!this.mainWindow.isVisible()) {
      this.mainWindow.show();
    }
    this.mainWindow.setAlwaysOnTop(true);
    this.mainWindow.focus();

    this.mainWindow.webContents.send('window-shown');
  }

  public hideSpotlight(): void {
    if (!this.mainWindow || !this.mainWindow.isVisible()) return;
    this.mainWindow.webContents.send('window-hide-request');
    setTimeout(() => {
      this.mainWindow?.hide();
    }, 90);
  }

  public hideImmediately(): void {
    this.mainWindow?.hide();
  }

  public getLastShowTime(): number {
    return this.lastShowTime;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public getSettingsWindow(): BrowserWindow | null {
    return this.settingsWindow;
  }

  public openSettingsWindow(): BrowserWindow {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      if (this.settingsWindow.isMinimized()) this.settingsWindow.restore();
      this.settingsWindow.show();
      this.settingsWindow.focus();
      return this.settingsWindow;
    }

    const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
      ? path.join(__dirname, 'preload.cjs')
      : fs.existsSync(path.join(__dirname, 'preload.mjs'))
      ? path.join(__dirname, 'preload.mjs')
      : path.join(__dirname, 'preload.js');

    this.settingsWindow = new BrowserWindow({
      width: 960,
      height: 720,
      minWidth: 800,
      minHeight: 560,
      title: 'IADonkey – Nastavení',
      icon: getAppIcon(),
      autoHideMenuBar: true,
      backgroundColor: '#181920',
      show: false,
      webPreferences: {
        preload: preloadPath,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      this.settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#settings`);
    } else {
      this.settingsWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'settings' });
    }

    this.settingsWindow.once('ready-to-show', () => {
      if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
        this.settingsWindow.show();
        this.settingsWindow.focus();
      }
    });

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.showSpotlight();
        this.mainWindow.webContents.send('focus-input');
      }
    });

    return this.settingsWindow;
  }

  public getGitCloneWindow(): BrowserWindow | null {
    return this.gitCloneWindow;
  }

  public openGitCloneWindow(params: {
    repoName: string;
    repoUrl?: string;
    initialRecursive?: boolean;
    isInstanceMode?: boolean;
    adminUrl?: string;
    repoLanguage?: string;
  }): BrowserWindow {
    const isRecursive = Boolean(params.initialRecursive);
    const isInstanceMode = Boolean(params.isInstanceMode);
    const adminUrl = params.adminUrl || '';
    const repoLanguage = params.repoLanguage || '';

    const appConfig = this.getConfig ? this.getConfig() : null;
    const baseDir = appConfig?.github?.defaultCloneDir || '';
    let targetDir = baseDir;
    if (isInstanceMode && params.repoName && baseDir) {
      targetDir = `${baseDir.replace(/[\\/]+$/, '')}\\magicgate\\${params.repoName}`;
    }

    const query = new URLSearchParams({
      name: params.repoName || '',
      url: params.repoUrl || '',
      recursive: isRecursive ? '1' : '0',
      isInstanceMode: isInstanceMode ? '1' : '0',
      adminUrl,
      targetDir,
      repoLanguage,
    }).toString();

    const payload = {
      repoName: params.repoName || '',
      repoUrl: params.repoUrl || '',
      recursive: isRecursive,
      initialRecursive: isRecursive,
      isInstanceMode,
      adminUrl,
      targetDir,
      repoLanguage,
    };

    if (this.gitCloneWindow && !this.gitCloneWindow.isDestroyed()) {
      if (this.gitCloneWindow.isMinimized()) this.gitCloneWindow.restore();
      this.gitCloneWindow.show();
      this.gitCloneWindow.focus();
      this.gitCloneWindow.webContents.send('git-clone-params', payload);
      return this.gitCloneWindow;
    }

    const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
      ? path.join(__dirname, 'preload.cjs')
      : fs.existsSync(path.join(__dirname, 'preload.mjs'))
      ? path.join(__dirname, 'preload.mjs')
      : path.join(__dirname, 'preload.js');

    this.gitCloneWindow = new BrowserWindow({
      width: 640,
      height: 560,
      minWidth: 540,
      minHeight: 480,
      title: isInstanceMode
        ? `IADonkey – Klonovat repozitáře instance (${params.repoName})`
        : `IADonkey – Klonovat repozitář${params.repoName ? ` (${params.repoName})` : ''}`,
      icon: getAppIcon(),
      autoHideMenuBar: true,
      backgroundColor: '#181920',
      show: false,
      webPreferences: {
        preload: preloadPath,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      this.gitCloneWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#git-clone?${query}`);
    } else {
      this.gitCloneWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: `git-clone?${query}` });
    }

    this.gitCloneWindow.once('ready-to-show', () => {
      if (this.gitCloneWindow && !this.gitCloneWindow.isDestroyed()) {
        this.gitCloneWindow.show();
        this.gitCloneWindow.focus();
        this.gitCloneWindow.webContents.send('git-clone-params', payload);
      }
    });

    this.gitCloneWindow.on('closed', () => {
      this.gitCloneWindow = null;
      if (this.shouldRestoreSpotlightOnCloneClose) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.showSpotlight();
          this.mainWindow.webContents.send('focus-input');
        }
      } else {
        this.shouldRestoreSpotlightOnCloneClose = true;
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.hideSpotlight();
          this.mainWindow.webContents.send('reset-spotlight');
        }
      }
    });

    return this.gitCloneWindow;
  }

  public createInstallerWindow(): BrowserWindow {
    const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
      ? path.join(__dirname, 'preload.cjs')
      : fs.existsSync(path.join(__dirname, 'preload.mjs'))
      ? path.join(__dirname, 'preload.mjs')
      : path.join(__dirname, 'preload.js');

    const win = new BrowserWindow({
      width: 860,
      height: 580,
      minWidth: 800,
      minHeight: 520,
      resizable: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      icon: getAppIcon(),
      show: false,
      webPreferences: {
        preload: preloadPath,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      win.loadURL(`${process.env.VITE_DEV_SERVER_URL}#installer`);
    } else {
      win.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'installer' });
    }

    win.once('ready-to-show', () => {
      win.show();
      win.focus();
    });

    win.on('closed', () => {
      app.quit();
    });

    return win;
  }

  public createUninstallerWindow(): BrowserWindow {
    const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
      ? path.join(__dirname, 'preload.cjs')
      : fs.existsSync(path.join(__dirname, 'preload.mjs'))
      ? path.join(__dirname, 'preload.mjs')
      : path.join(__dirname, 'preload.js');

    const win = new BrowserWindow({
      width: 480,
      height: 320,
      resizable: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      icon: getAppIcon(),
      show: false,
      webPreferences: {
        preload: preloadPath,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      win.loadURL(`${process.env.VITE_DEV_SERVER_URL}#uninstall`);
    } else {
      win.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'uninstall' });
    }

    win.once('ready-to-show', () => {
      win.show();
      win.focus();
    });

    win.on('closed', () => {
      app.quit();
    });

    return win;
  }

  public createTray(hotkeyLabel: string): void {
    // Minimalist monochrome outline donkey in a rounded square (embedded 64x64 PNG)
    const TRAY_ICON_PNG_B64 =
      'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAFf0lEQVR4nOxbPYgcNxR+c4khRSAJuA2ZS5G4TxFDDDfX5vDBEVIa71ZJf5D21q3h0sRFrtpxGYITsEna04IDTpE+dnMCtwa3LmzW7928s6V30oy0K816vP7g7UhPP6v35umN9EazAWuODVhzrL0C3o+pPJ/Pv8bLVaQrSJeQLiK9B6vFC6QnSP8j3Ue6VxTFv6GNi5BKKPi3ePkJaQuGgRnSTVTE310VOxWAwv+Klx9gmDhCJfzYVsGrABT8E7z8CcO56z6QNeyhIp66CtucoE/4u0jXkD5HulAkAPaziVQjKUpHtr3AY7nGY5PYYlmccFqAx+z/Q9rH/5xBYuD/TfEyMlgT/J8bsACwLxL4EOkrUeScDoWjA3J4fwk2afY77OA5+P+YhCiRbmA9BRHAtnMHexkl0NPtDtKuKNqRjtGlAAW26dOdv9wh/AEN2GAppDG20dA92BIvJ57izZA+PP2SEh6AbQkz7K8y622IRvScl/N+v014RuXIn2B/I+jG9QXLWsFj3hfsLZbxFaQTvCrydwPnvPLwp2wdMdBGesIWshB47NIxWjJKBVwR+d8hDG1KmnQoYWSkNZKc9wtbAUPKYMkoFXBJ5P+BALDT0y1VnHeSeSa/xr5q0VcJy0HKYMkoFXBR5B9DOLTI1yJ/4lCCzLsQUqcNUgZLRqkAa2MT4PxMKJEnU9aCJ81ZOtyzqaQhERwyWDKm3A5LP1AhbUO7U6uMtI5dP6RAMgU4/MB1fobXourUSFdGWnv4WZE6IKKNdEV3m1dzFp9+HP5AtfFzIbUCVAifhZT+4GwK+fhZkFoBLj9AuO3hv4Ix/82y7H4hqQJcfsDgmyDvPzLyZpvKw8+CHEFRbaQrY06bfFqMlEa+pp++5z8hhwJUAP+yp06v85+QQwE+PzALaFMZvF7WBckV4PMD4J/Pz5AO0PyPwV6nf0BBlmV2gyGwAiIyMsMxt2iwMJXBOg1sIJ8Ckx9DHDTS9qKBER6PV65cb4aUh/8E4lFCE1coIQOi3gxFwOUHaqQxNEvhD6F5k9OGEl4/KSpoptJCMcI2ZJkC3BfF+UrOKuxq21HnC/6fR46yEV4OwH5cLhQoXcUUIChP+hQ4pl/w8pCI0xY4MFILdld0KRo5LaCE5g5SP2NRRnf+oWjypccSZMSZEBUtbpMrmwI6BhSsAK4vX5wQgpWwqingBQt6y2Dd8gnP9cmCtGAvGyxt+jYzfVmA8X9eJ+ioW4L9AsXpWD1t3wwLICF4dXfMwZJHIcITHOauIAFyrQN8oLlccfoElbAdut7PtRDqzQL4uV4J9vG84/UZlu8RwfnweJKdYp8WMPXxUcDP8HpbmjkL/gdnf4MM6MUCHIsXLfITiFzvF4m2ytmfAg7vfdqv59muoXmtroz2e5z8GV5PA4oVbEL4GLxy9TEF5PN6woMY47g0NEoouYyux3xGgQKpVP4R91EafShIhKwW4Lj75+4c1qmg8Q8lhCPZUji3D5B3v5YV2NxpQaMgDJNiieCIRG4FlEZa+7ayJBCv6s4UoR3Vamj8Q9KYQB9OcMp9jSPalGD7BZUrJLbSvUBfiPEBL0TDvpfKyeGQwZJRKkAGLT+F4UPKYMkoFSADld/A8CFlsGSUCrgv8t/D8CFlsGSUCrgn8rt89naQ4LHL47KWjJYCiuZLC7nNPByiM+QxHwr2rBBfk7gWQjdFns7a3hmSEozD0vLEuJTtvAL4NPWRYJMZPRjCdOAx0iFpafpHheMTmrYvRhT4P5ig46d0AvNx5FnC5OC7TY868vbk8HYd1c6dEj/Du09mfK2oAWvtCIYLMvvKJzyhczdYNJ+Z7EAPx1USgsa6U3R8MUaI2uzM1/XDybcZK3k3+CZh7RXwEgAA//9SZSqPAAAABklEQVQDAHibVW/zbmHUAAAAAElFTkSuQmCC';

    const iconImage = nativeImage
      .createFromDataURL(`data:image/png;base64,${TRAY_ICON_PNG_B64}`)
      .resize({ width: 18, height: 18 });

    this.tray = new Tray(iconImage);
    this.tray.setToolTip(`IADonkey Launcher (${hotkeyLabel})`);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Hledat (${hotkeyLabel})`,
        click: () => this.showSpotlight(),
      },
      {
        label: 'Nastavení...',
        click: () => {
          this.openSettingsWindow();
        },
      },
      {
        label: 'Synchronizovat data',
        click: () => this.onSyncRequest(),
      },
      { type: 'separator' },
      {
        label: 'Ukončit IADonkey',
        click: () => {
          this.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.on('click', () => this.showSpotlight());
    this.tray.on('double-click', () => this.showSpotlight());
  }

  public updateTrayTooltip(hotkeyLabel: string): void {
    this.tray?.setToolTip(`IADonkey Launcher (${hotkeyLabel})`);
  }

  public setQuitting(val: boolean): void {
    this.isQuitting = val;
  }

  public createSplashWindow(): BrowserWindow {
    if (this.splashWindow && !this.splashWindow.isDestroyed()) {
      return this.splashWindow;
    }

    const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
      ? path.join(__dirname, 'preload.cjs')
      : fs.existsSync(path.join(__dirname, 'preload.mjs'))
      ? path.join(__dirname, 'preload.mjs')
      : path.join(__dirname, 'preload.js');

    this.splashWindow = new BrowserWindow({
      width: 380,
      height: 130,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      icon: getAppIcon(),
      show: false,
      center: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      webPreferences: {
        preload: preloadPath,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      this.splashWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#splash`);
    } else {
      this.splashWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'splash' });
    }

    this.splashWindow.once('ready-to-show', () => {
      if (this.splashWindow && !this.splashWindow.isDestroyed()) {
        this.splashWindow.show();
        this.splashWindow.webContents.send('splash-status', this.lastSplashStatus);
      }
    });

    this.splashWindow.webContents.on('did-finish-load', () => {
      if (this.splashWindow && !this.splashWindow.isDestroyed()) {
        this.splashWindow.webContents.send('splash-status', this.lastSplashStatus);
      }
    });

    return this.splashWindow;
  }

  public updateSplashStatus(percent: number, text: string): void {
    this.lastSplashStatus = { percent, text };
    if (this.splashWindow && !this.splashWindow.isDestroyed()) {
      this.splashWindow.webContents.send('splash-status', this.lastSplashStatus);
    }
  }

  public getLastSplashStatus(): { percent: number; text: string } {
    return this.lastSplashStatus;
  }

  public async closeSplashWindow(delayMs = 0): Promise<void> {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    try {
      if (this.splashWindow && !this.splashWindow.isDestroyed()) {
        this.splashWindow.destroy();
        this.splashWindow = null;
      }
    } catch {}
  }

  public prepareForQuitOrRestart(): void {
    this.isQuitting = true;
    try {
      if (this.splashWindow && !this.splashWindow.isDestroyed()) {
        this.splashWindow.destroy();
        this.splashWindow = null;
      }
    } catch {}
    try {
      if (this.tray && !this.tray.isDestroyed()) {
        this.tray.destroy();
        this.tray = null;
      }
    } catch {}
    try {
      if (this.gitCloneWindow && !this.gitCloneWindow.isDestroyed()) {
        this.gitCloneWindow.destroy();
        this.gitCloneWindow = null;
      }
    } catch {}
    try {
      if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
        this.settingsWindow.destroy();
        this.settingsWindow = null;
      }
    } catch {}
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.removeAllListeners('close');
        this.mainWindow.destroy();
        this.mainWindow = null;
      }
    } catch {}
  }
}
