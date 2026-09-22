import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, Tray, Menu, screen, nativeImage, app } from 'electron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_ICON_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAABeYSURBVHhe7Z1bjBxXmcd5440Hjz2TYMc4Y8c3HMeJ42t8ndjG13GI42hubk/PTM84q/UGaTegJVkWgfKwKA9hV9pIiEUKAoG0i3aFtUJEyCISWSsCBQkyCSZ2bOzYxo4v05OAHUxcq3/NVM+pr7qm61Sdqq7u8/+kn4iG7qpTUb7/+W6n+hOfoNFoNBqNRqPRaDQajUZLyYaGrs4plsprBobHNw2Wyn9HiLWMjG2HLxSfutku/aQpDA82WBofGSiVvz9QKo8OlMqnCCHhFIfL/zUwPPYchEH6U0MYnH5guPzMQKn8inw4QogGw+MniqXy1xEtSz/LncHxiyPllwIPQQhJzvDYsVxGBcXi+CxXpeSCFYpDV/9QKJ5//1D/2et9h8+Uewq//zPo6n3TIcRWPD/oLbw7Dt8oFM9d7R+8cl76j5/x7ww+Nb5E+mFdbDK/r5rb9w9efq/v8Jmx7r7f/UU+OCEknO6+t/6KjbIwcPGS9KsKw2PPHT1655PSJzMx3LhYGvtGYFGl8iksurvv7dvyoQgh+kAMED1LPwMoGPYevfop6Z+pGm44WdX3Lebw4B8v9Bw6eVM+QDV27vmBy6YtLzjr1n/ZWbX9a4RYw9pHnnU2bH6+4gdPdv864CMSRNLVIoJiaezVzFKCiR7+2Kv+Rdw4jRxGLtjjsQPH3YddvHSf07p0pTNz/Q5nZsd+p2XHE86Mx/oJsZaWnQddX5i5YafTumy1c++irc7qtc84e/cfC/iRR8+hd/5ULF1/V/XBweHyG6l3CrDzS+fHQsJ2/S0d33TaF2x0Wh9Y57Rs3uvM6CwE/gUQQvxAEGY9uMG5p32VKwYHu14P+BaiARTWRTQwOjT04Qrpt0YMOb8M+1GtrJbr79j1XWfBwg6nbclDrsLJB/QesmVrpzNr1RYXRAZti1YQ0vwseajy333Lxt2uL8zY1xvwkRl7etzNc+5nHnQjaOlnXb2jHx8euHTRJwLD4ycQpUv/TWyDw+MvSufHAtQFQamWLjvgtLUvnXgo8TBemHPX7HbnrrvnEUIUIAwz125zWnZ1+XwHmyj+P2yqSKelEFSpC7xitDA42eqbCvuHrp2ROz8W5ob7S1f6Q/19vW44Ix+WEBIO/EgKASIGRAO79/1IisCd4OzA+HekH8cyDPn4+/w3TsucHwuaM/ez7gLVBUPN2uYsCDwcISQCs9udWSs3+dID1NI+fc9it76m+iBahf1D186qIoCDRtKftU2G/rLaj50fzo/wXt31EbIEHogQog1SajUaQPcMG+u2z33bJwI9h07ewgZd8dfhsWPSn7UMvUXV+VFwUG+InH/evaudmas7pha3q8tdsHwIQkh84PBqXQ3/jEhApgNyYGho5INu6deRTR7sgcKoN/P6+j7nZ8hPSGq47XQlxUZN4PGDv/ClAv4oYPxErHFhufuj0qg6P8IP7PSVgh/Cfu78hKTL7HbfAF3r8rXOw2ueFlHAuauJowAcNJi6yI3TUBb1JmhJtGx7vLIQ5vyEZEPbvMVuW931vT09zt3zlvmiAHQF0KlTROD70r9rmjrxhxl/1fkxlKCG/ghF5CIJIekh/S8YBVy4rEYB6OZJHw81jBOqX8axRPXi8+avmZrw29PDwR5C6kClKNhZcKMAdWQY5wVUHx4o3Tgg/TzU8LJC9cvq0A8OKWA80VMfDvkQUh9a5y/zRQFiNuCOrxioMxiE/qH3xYmR36ndH0d3PeVB1V8uihCSHThP40Xiy1cU/GmAf0R4NHI3QJ38Q0VRveh9S/dUKv841isXRAjJDnQBvCjgrkUrfe8VQOquRvKRDglNvuxDzf/HVAHAYR7vhqz8E1Jf2uYunErHV23xDQb1FE59qPpypBeKyv5/b+H0B94FMfZbGfntLLD4R0gO8NrxmA9Qx4NxZscnAEPlvdLfA4a3iqhfUt/ci1cXVW62tTOwEEJI9lQO4XUW3Ffsef6K4r3qy5EGgtAuUL+kdgA6tr9UGUBAJCAXQgjJHrUrt3bjcxUBAKovo7sn/T1gsgWoXgwDQGq+IRdCCMkedSho5eZn0xOANZu/UrkRqo9yIYSQ7Gm97/6KX+KNw6kJAC7u3YgdAELyQX0EYNGKwEIIIdkDX6QAEGIxFABCLIYCQIjFUAAIsRgKACEWQwEgxGIoAIRYDAWAEIuhABBiMRQAQiyGAkCIxVAACLEYCgAhFkMBIMRiKACEWAwFgBCLoQAQYjEUAEIshgJAiMVQAAixGAoAIRZDASDEYigAhFgMBYAQi6EAEGIxFABCLIYCQIjFUAAIsRgKACEWQwEgxGIoAIRYDAWAEIuhABBiMRQAQiyGAkCIxVAACLEYCgAhFkMBIMRiKACEWAwFgBCLoQAQYjEUAEIshgJAiMVQAAixGAoAIRZDASDEYigAhFgMBYAQi6EAEGIxFABCLIYCQIjFUAAIsRgKACEWQwEgxGIoAIRYDAWAEIuhABBiMZkJwOqt/1y5UevytYGFEEKyp3X+smwEYN2mr1ZuNGvlpsBCCCHZ07bkoSkB6PhqMgEYGvmgW/1Sd99bf/UutqXjm86Mfb3ujWau3RZYCCEkexCNewLw0CN/n0wABkfGtqtf6jl08qZ3sZ17fuC07HjCvVHLxt2BhRBCsmfWqi0VAVi/cSoCwObtF4DxEenvARsa+nCFTwAKpz70Ltj5+Z86LVs7JwRgV1dgIYSQ7MFm7PrkzoNOx/aXKgLQc+jkLdWXB0o3Dkh/D9jQ0NU56pf6Dp8pexc82PW6M+vBDVOFwPnLAoshhGTI7HZnRmdhIi3fsNON0qcE4J0/qb5cLJXXSH+vauqXDvWfva7mFPcsnMo3EHoEFkQIyQy1ANi6dKW7SXu+2lt4d1z15cGnxpdIX69qA8PjJ7wvHR64dFEVgBUPDbmhhhtybHs8sCBCSHbMXL9jQgA6C87CJbsqfgoO9b93xRcBFMdnSV+vasXS2DemvnjjdFfvm3e8i+7Y9V1n5uqOKdW57/7Aoggh6dM2d2El/Edtbt36L/sEoH/o2llFAF6Rfh5qxaHyXlU5egunP/Au+mT3r5275y2buvGOJwILI4SkD1rx3kaMacC9+48p+f/Jm77wP0oL0LOjR+98cqBUHvW+XCheuKwqy8qH/8bXemhdtjqwOEJIerS1L53ahDfvdRYs7BDh/9nrPgGImv97Vhwpv+R9uVi6/q6aBjx+8BfOp+9Z7MzY0zMhAnt63HBELpIQkg4zO/ZPbcDzl/mq/6A4dPUPU/479qr075qGnqGqIH39Z2+oN1i99hmn9YF1lUW4BcHZ7YGFEkLMoob+aP3dv7zL5/yY3VF9d2C4/Iz075rmpgFKNwDFQHUsGLWAefeunqpCcjqQkNTxbbo7nnAjcTX3R6ReHLp2RhGA0cjVf2myGFgonn9fVRrcGAvA7l9RJJ4RICQV3Jn/ybwfZ3La5i12Nm15wbf79x0+M+bf/ceek36tZQPDY8fUC6pnA8C2z33bzf8xGlxRpq2dTtucBYEHIITEQw37IQKo+j+85mmf83f1jn5sbPf3TB4OQm9RTQUADiBAjbyDQq4I7DzIUWFCEgK/Ugt+7s6/aIWzdNkB4fxv3jk8+軽減';

const getAppIcon = () => {
  const ico = path.join(__dirname, '../electron/assets/icon.ico');
  const png = path.join(__dirname, '../electron/assets/icon.png');
  const distPng = path.join(__dirname, '../dist/icon.png');
  if (fs.existsSync(ico)) return ico;
  if (fs.existsSync(png)) return png;
  if (fs.existsSync(distPng)) return distPng;
  return undefined;
};

const getAppIconBase64 = (): string => {
  const candidates = [
    path.join(__dirname, '../electron/assets/icon.png'),
    path.join(__dirname, 'assets/icon.png'),
    path.join(__dirname, '../dist/icon.png'),
    path.join(process.resourcesPath || '', 'app.asar/electron/assets/icon.png'),
    path.join(process.resourcesPath || '', 'app.asar/dist/icon.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        return `data:image/png;base64,${fs.readFileSync(c).toString('base64')}`;
      } catch {}
    }
  }
  return `data:image/png;base64,${APP_ICON_PNG_B64}`;
};

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private powerWindow: BrowserWindow | null = null;
  private gitCloneWindow: BrowserWindow | null = null;
  private cmsDownloadWindow: BrowserWindow | null = null;
  private tuneColorWindow: BrowserWindow | null = null;
  private snipperWindow: BrowserWindow | null = null;
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

    // Hide window when it loses focus (unless devtools is active or during initial reveal / reactivation)
    this.mainWindow.on('blur', () => {
      if (Date.now() - this.lastShowTime < 800) {
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
    this.mainWindow?.webContents.send('window-hide-request');
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

  public getPowerWindow(): BrowserWindow | null {
    return this.powerWindow;
  }

  public closePowerWindow(): void {
    if (this.powerWindow && !this.powerWindow.isDestroyed()) {
      this.powerWindow.close();
    }
  }

  public openPowerWindow(): BrowserWindow {
    if (this.powerWindow && !this.powerWindow.isDestroyed()) {
      if (this.powerWindow.isMinimized()) this.powerWindow.restore();
      this.powerWindow.show();
      this.powerWindow.focus();
      return this.powerWindow;
    }

    const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
      ? path.join(__dirname, 'preload.cjs')
      : fs.existsSync(path.join(__dirname, 'preload.mjs'))
      ? path.join(__dirname, 'preload.mjs')
      : path.join(__dirname, 'preload.js');

    this.powerWindow = new BrowserWindow({
      width: 440,
      height: 250,
      minWidth: 400,
      minHeight: 230,
      maxWidth: 480,
      maxHeight: 280,
      resizable: false,
      title: 'IADonkey – Správa aplikace',
      icon: getAppIcon(),
      autoHideMenuBar: true,
      backgroundColor: '#181920',
      show: false,
      skipTaskbar: false,
      webPreferences: {
        preload: preloadPath,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      this.powerWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#power`);
    } else {
      this.powerWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'power' });
    }

    this.powerWindow.once('ready-to-show', () => {
      if (this.powerWindow && !this.powerWindow.isDestroyed()) {
        this.powerWindow.show();
        this.powerWindow.focus();
      }
    });

    this.powerWindow.on('closed', () => {
      this.powerWindow = null;
    });

    return this.powerWindow;
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

  public getCmsDownloadWindow(): BrowserWindow | null {
    return this.cmsDownloadWindow;
  }

  public closeCmsDownloadWindow(): void {
    if (this.cmsDownloadWindow && !this.cmsDownloadWindow.isDestroyed()) {
      this.cmsDownloadWindow.close();
    }
  }

  public openCmsDownloadWindow(params: {
    instanceName: string;
    adminUrl: string;
    targetDir: string;
  }): BrowserWindow {
    const query = new URLSearchParams({
      instanceName: params.instanceName,
      adminUrl: params.adminUrl,
      targetDir: params.targetDir,
    }).toString();

    const payload = {
      instanceName: params.instanceName,
      adminUrl: params.adminUrl,
      targetDir: params.targetDir,
    };

    if (this.cmsDownloadWindow && !this.cmsDownloadWindow.isDestroyed()) {
      if (this.cmsDownloadWindow.isMinimized()) this.cmsDownloadWindow.restore();
      this.cmsDownloadWindow.show();
      this.cmsDownloadWindow.focus();
      this.cmsDownloadWindow.webContents.send('cms-download-params', payload);
      return this.cmsDownloadWindow;
    }

    const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
      ? path.join(__dirname, 'preload.cjs')
      : fs.existsSync(path.join(__dirname, 'preload.mjs'))
      ? path.join(__dirname, 'preload.mjs')
      : path.join(__dirname, 'preload.js');

    this.cmsDownloadWindow = new BrowserWindow({
      width: 640,
      height: 620,
      minWidth: 540,
      minHeight: 520,
      title: `IADonkey – Stažení CMSinFS zdrojáků (${params.instanceName})`,
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
      this.cmsDownloadWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#cms-download?${query}`);
    } else {
      this.cmsDownloadWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: `cms-download?${query}` });
    }

    this.cmsDownloadWindow.once('ready-to-show', () => {
      if (this.cmsDownloadWindow && !this.cmsDownloadWindow.isDestroyed()) {
        this.cmsDownloadWindow.show();
        this.cmsDownloadWindow.focus();
        this.cmsDownloadWindow.webContents.send('cms-download-params', payload);
      }
    });

    this.cmsDownloadWindow.on('closed', () => {
      this.cmsDownloadWindow = null;
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.showSpotlight();
        this.mainWindow.webContents.send('focus-input');
      }
    });

    return this.cmsDownloadWindow;
  }

  public getTuneColorWindow(): BrowserWindow | null {
    return this.tuneColorWindow;
  }

  public closeTuneColorWindow(): void {
    if (this.tuneColorWindow && !this.tuneColorWindow.isDestroyed()) {
      this.tuneColorWindow.close();
    }
  }

  public openTuneColorWindow(params: { initialColor: string }): BrowserWindow {
    const initialColor = params.initialColor || '#6366f1';
    const query = new URLSearchParams({ color: initialColor }).toString();

    if (this.tuneColorWindow && !this.tuneColorWindow.isDestroyed()) {
      if (this.tuneColorWindow.isMinimized()) this.tuneColorWindow.restore();
      this.tuneColorWindow.show();
      this.tuneColorWindow.focus();
      this.tuneColorWindow.webContents.send('tune-color-init', { color: initialColor });
      return this.tuneColorWindow;
    }

    const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
      ? path.join(__dirname, 'preload.cjs')
      : fs.existsSync(path.join(__dirname, 'preload.mjs'))
      ? path.join(__dirname, 'preload.mjs')
      : path.join(__dirname, 'preload.js');

    this.tuneColorWindow = new BrowserWindow({
      width: 520,
      height: 480,
      minWidth: 460,
      minHeight: 420,
      maxWidth: 640,
      maxHeight: 600,
      resizable: true,
      title: 'IADonkey – Doladění barvy',
      icon: getAppIcon(),
      autoHideMenuBar: true,
      backgroundColor: '#181920',
      show: false,
      skipTaskbar: false,
      webPreferences: {
        preload: preloadPath,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      this.tuneColorWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?${query}#tune-color`);
    } else {
      this.tuneColorWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
        hash: 'tune-color',
        search: query,
      });
    }

    this.tuneColorWindow.once('ready-to-show', () => {
      if (this.tuneColorWindow && !this.tuneColorWindow.isDestroyed()) {
        this.tuneColorWindow.show();
        this.tuneColorWindow.focus();
      }
    });

    this.tuneColorWindow.on('closed', () => {
      this.tuneColorWindow = null;
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.showSpotlight();
      }
    });

    return this.tuneColorWindow;
  }

  public getSnipperWindow(): BrowserWindow | null {
    return this.snipperWindow;
  }

  public closeSnipperWindow(): void {
    if (this.snipperWindow && !this.snipperWindow.isDestroyed()) {
      this.snipperWindow.webContents.send('quickcap-cleanup');
      this.snipperWindow.webContents.send('fastsnap-cleanup');
      this.snipperWindow.hide();
    }
  }

  public createSnipperWindow(
    displayBounds: { x: number; y: number; width: number; height: number },
    screenshotUrl: string,
    scaleFactor: number
  ): BrowserWindow {
    const applyFullScreenAndShow = (win: BrowserWindow) => {
      win.setBounds(displayBounds);
      win.setAlwaysOnTop(true, 'screen-saver');
      const initPayload = {
        screenshotUrl,
        width: displayBounds.width,
        height: displayBounds.height,
        scaleFactor,
      };
      // Poslat data před zobrazením okna pro plynulé navázání
      win.webContents.send('quickcap-init-data', initPayload);
      win.webContents.send('fastsnap-init-data', initPayload);
      win.show();
      win.focus();
    };

    if (this.snipperWindow && !this.snipperWindow.isDestroyed()) {
      applyFullScreenAndShow(this.snipperWindow);
      return this.snipperWindow;
    }

    const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
      ? path.join(__dirname, 'preload.cjs')
      : fs.existsSync(path.join(__dirname, 'preload.mjs'))
      ? path.join(__dirname, 'preload.mjs')
      : path.join(__dirname, 'preload.js');

    this.snipperWindow = new BrowserWindow({
      x: displayBounds.x,
      y: displayBounds.y,
      width: displayBounds.width,
      height: displayBounds.height,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      show: false,
      fullscreen: true,
      hasShadow: false,
      enableLargerThanScreen: true,
      webPreferences: {
        preload: preloadPath,
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
      },
    });

    this.snipperWindow.setAlwaysOnTop(true, 'screen-saver');

    if (process.env.VITE_DEV_SERVER_URL) {
      this.snipperWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#quickcap`);
    } else {
      this.snipperWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
        hash: 'quickcap',
      });
    }

    this.snipperWindow.once('ready-to-show', () => {
      if (this.snipperWindow && !this.snipperWindow.isDestroyed()) {
        applyFullScreenAndShow(this.snipperWindow);
      }
    });

    this.snipperWindow.on('closed', () => {
      this.snipperWindow = null;
    });

    return this.snipperWindow;
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

  public createSplashWindow(version: string = '1.1.16'): BrowserWindow {
    if (this.splashWindow && !this.splashWindow.isDestroyed()) {
      return this.splashWindow;
    }

    this.splashWindow = new BrowserWindow({
      width: 380,
      height: 400,
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
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const iconDataUrl = getAppIconBase64();
    const splashHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100vw;
    height: 100vh;
    background: transparent;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
  }
  .card {
    width: 100%;
    height: 100%;
    background-color: #141520;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    outline: none;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 39px 39px 35px 39px;
    text-align: left;
  }
  .icon {
    width: 58px;
    height: 58px;
    object-fit: contain;
    border-radius: 14px;
    margin-bottom: 14px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  }
  .title {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.3px;
    line-height: 1.15;
    margin-bottom: 3px;
  }
  .version {
    font-size: 12px;
    font-weight: 600;
    color: #818cf8;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    letter-spacing: 0.6px;
  }
  .spacer {
    flex: 1;
    min-height: 12px;
  }
  .description {
    font-size: 11.5px;
    line-height: 1.5;
    color: #9ca3af;
    margin-bottom: 16px;
  }
  .copyright {
    font-size: 11px;
    color: #6b7280;
    letter-spacing: 0.2px;
  }
</style>
</head>
<body>
  <div class="card">
    ${iconDataUrl ? `<img class="icon" src="${iconDataUrl}" alt="IADonkey" />` : ''}
    <div class="title">IADonkey</div>
    <div class="version">v${version}</div>
    <div class="spacer"></div>
    <div class="description">
      Rychlý a inteligentní spouštěč pro vaše každodenní úkoly a produktivitu. Sjednocuje vyhledávání, pracovní nástroje a automatizaci do jednoho přehledného prostředí.
    </div>
    <div class="copyright">© 2026 Petr Coolhanek</div>
  </div>
</body>
</html>`;

    this.splashWindow.once('ready-to-show', () => {
      if (this.splashWindow && !this.splashWindow.isDestroyed()) {
        this.splashWindow.show();
        this.splashWindow.setAlwaysOnTop(true, 'screen-saver');
        this.splashWindow.focus();
      }
    });

    this.splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);

    return this.splashWindow;
  }

  public whenSplashReady(): Promise<void> {
    if (!this.splashWindow || this.splashWindow.isDestroyed()) {
      return Promise.resolve();
    }
    if (this.splashWindow.isVisible()) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      if (!this.splashWindow || this.splashWindow.isDestroyed()) {
        resolve();
        return;
      }
      let resolved = false;
      const onReady = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      this.splashWindow.once('ready-to-show', onReady);
      // Safety fallback: ensure splash is displayed and resolved within 800ms
      setTimeout(() => {
        if (!resolved) {
          if (this.splashWindow && !this.splashWindow.isDestroyed() && !this.splashWindow.isVisible()) {
            this.splashWindow.show();
            this.splashWindow.setAlwaysOnTop(true, 'screen-saver');
            this.splashWindow.focus();
          }
          onReady();
        }
      }, 800);
    });
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
      if (this.snipperWindow && !this.snipperWindow.isDestroyed()) {
        this.snipperWindow.destroy();
        this.snipperWindow = null;
      }
    } catch {}
    try {
      if (this.tuneColorWindow && !this.tuneColorWindow.isDestroyed()) {
        this.tuneColorWindow.destroy();
        this.tuneColorWindow = null;
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
