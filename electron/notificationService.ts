import { Notification, app } from 'electron';
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
      try {
        app.setAppUserModelId(app.isPackaged ? 'com.iadonkey.launcher' : process.execPath);
      } catch (err) {
        console.error('[NotificationService] Failed to set AppUserModelId:', err);
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
