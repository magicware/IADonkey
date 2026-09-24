import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { app } from 'electron';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PasteService {
  private getHelperPath(): string | null {
    const isDev = !app.isPackaged;
    const candidates = [
      isDev
        ? path.join(app.getAppPath(), 'electron', 'assets', 'paste-helper.exe')
        : path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'assets', 'paste-helper.exe'),
      path.join(app.getAppPath(), 'dist-electron', 'assets', 'paste-helper.exe'),
      path.join(__dirname, 'assets', 'paste-helper.exe'),
      path.join(process.resourcesPath, 'electron', 'assets', 'paste-helper.exe'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  public async simulatePaste(delayMs: number = 80, iadonkeyHwnd: number = 0): Promise<void> {
    const helperPath = this.getHelperPath();

    if (helperPath) {
      try {
        const child = spawn(helperPath, [String(delayMs), String(process.pid), String(iadonkeyHwnd)], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        });
        child.unref();
        return;
      } catch (err) {
        console.warn('[PasteService] Failed to spawn paste-helper.exe, falling back to VBS:', err);
      }
    }

    // Fallback: VBScript via wscript
    try {
      const vbsPath = path.join(app.getPath('temp'), 'iadonkey_paste.vbs');
      const vbsContent = `WScript.Sleep ${delayMs}\nSet w = CreateObject("WScript.Shell")\nw.SendKeys "^v"\n`;
      fs.writeFileSync(vbsPath, vbsContent, 'utf-8');
      const child = spawn('wscript.exe', ['//nologo', vbsPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
    } catch (err) {
      console.error('[PasteService] All paste simulation methods failed:', err);
    }
  }
}

export const pasteService = new PasteService();
