import { Notification, app, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { diagnosticsService } from './diagnosticsService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getNotificationIcon = (): string | undefined => {
  const candidates = [
    path.join(__dirname, '../electron/assets/icon.png'),
    path.join(__dirname, 'assets/icon.png'),
    path.join(__dirname, '../dist/icon.png'),
    path.join(__dirname, '../electron/assets/icon.ico'),
    path.join(process.resourcesPath || '', 'app.asar/electron/assets/icon.png'),
    path.join(process.resourcesPath || '', 'app.asar/dist/icon.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return undefined;
};

const getNotificationIco = (): string | undefined => {
  const candidates = [
    path.join(__dirname, '../electron/assets/icon.ico'),
    path.join(__dirname, 'assets/icon.ico'),
    path.join(__dirname, '../build/icon.ico'),
    path.join(process.resourcesPath || '', 'app.asar/electron/assets/icon.ico'),
    path.join(process.resourcesPath || '', 'electron/assets/icon.ico'),
    path.join(process.resourcesPath || '', 'assets/icon.ico'),
    path.join(process.cwd(), 'electron/assets/icon.ico'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return undefined;
};

export type NotificationType = 'quickCap' | 'colorMaster' | 'syncComplete' | 'update' | 'error' | 'test';

export interface ShowNotificationOptions {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  onClick?: () => void;
}

export class NotificationService {
  private config: any = null;

  public init(config: any): void {
    this.config = config;
    if (process.platform === 'win32') {
      const appId = 'com.iadonkey.launcher';
      try {
        app.setAppUserModelId(appId);
      } catch (err) {
        console.error('[NotificationService] Failed to set AppUserModelId:', err);
      }

      // Windows Toast header attribution:
      // Windows 10 a Windows 11 zobrazují v záhlaví toast notifikace (u křížku pro zavření) název
      // a ikonu zástupce v nabídce Start, jehož System.AppUserModel.ID odpovídá nastavenému AUMID
      // a jehož target odpovídá běžícímu spustitelnému souboru (process.execPath).
      try {
        const startMenuDir = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
        const shortcutPath = path.join(startMenuDir, 'IADonkey.lnk');
        const electronShortcut = path.join(startMenuDir, 'Electron.lnk');
        const icoPath = getNotificationIco();

        // Pokud ve Start Menu existuje zástupce 'Electron.lnk' z vývojového prostředí, odstraníme ho,
        // aby Windows nepřiřazoval hlavičku notifikace generickému zástupci Electron.
        if (fs.existsSync(electronShortcut)) {
          try {
            fs.unlinkSync(electronShortcut);
          } catch {
            // Ignorujeme případnou chybu při mazání
          }
        }

        const shortcutOptions: Electron.ShortcutDetails = {
          target: process.execPath,
          description: 'IADonkey Launcher',
          appUserModelId: appId,
          icon: icoPath,
          iconIndex: 0,
        };

        if (fs.existsSync(startMenuDir)) {
          const operation = fs.existsSync(shortcutPath) ? 'replace' : 'create';
          shell.writeShortcutLink(shortcutPath, operation, shortcutOptions);
          console.log('[NotificationService] Registered Start Menu shortcut with AUMID:', appId, 'target:', process.execPath);
        }
      } catch (err) {
        console.warn('[NotificationService] Failed to register/update Start Menu shortcut for AUMID:', err);
      }
    }
  }

  public updateConfig(config: any): void {
    this.config = config;
  }

  public isSupported(): boolean {
    return Notification.isSupported();
  }

  public show(options: ShowNotificationOptions): boolean {
    if (!Notification.isSupported()) {
      console.warn('[NotificationService] Notifications not supported on this platform.');
      return false;
    }

    const notifConfig = this.config?.notifications;

    // Pokud jsou notifikace globálně vypnuté (výchozí stav je povoleno)
    if (notifConfig && notifConfig.enabled === false && options.type !== 'test') {
      return false;
    }

    // Specifické filtry dle typu události
    if (notifConfig && options.type !== 'test') {
      if (options.type === 'quickCap' && notifConfig.quickCap === false) return false;
      if (options.type === 'colorMaster' && notifConfig.colorMaster === false) return false;
      if (options.type === 'syncComplete' && notifConfig.syncComplete === false) return false;
      if (options.type === 'update' && notifConfig.updates === false) return false;
    }

    // Tichý režim (z konfigurace nebo parametru)
    const isSilent = options.silent !== undefined
      ? options.silent
      : (notifConfig?.silent ?? false);

    try {
      const iconPath = options.icon || getNotificationIcon();
      const notification = new Notification({
        title: options.title,
        body: options.body,
        icon: iconPath,
        silent: isSilent,
        groupId: 'iadonkey',
        groupTitle: 'IADonkey',
      });

      if (options.onClick) {
        notification.on('click', () => {
          try {
            options.onClick!();
          } catch (err) {
            console.error('[NotificationService] Error executing notification onClick:', err);
          }
        });
      }

      notification.show();

      diagnosticsService.logAction({
        type: 'action',
        title: `Systémová notifikace: ${options.title}`,
        details: `${options.body} (tichý: ${isSilent ? 'ano' : 'ne'})`,
        status: 'info',
      });

      return true;
    } catch (err: any) {
      console.error('[NotificationService] Error showing notification:', err);
      diagnosticsService.logAction({
        type: 'error',
        title: 'Chyba zobrazení notifikace',
        details: err?.message || String(err),
        status: 'error',
      });
      return false;
    }
  }
}

export const notificationService = new NotificationService();
