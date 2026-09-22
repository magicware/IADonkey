import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import AdmZip from 'adm-zip';

export interface MagicGateSectionRepo {
  sectionId: number;
  manifestPath: string;
  repoUrl: string;
  version?: string;
  targetSubdir: string;
}

/**
 * Extracts the top-level directory name from a manifest path.
 * Mirrors Wox: GetTopDirectoryName
 * e.g.:
 *  "Templates\\Web\\manifest.json" -> "Templates"
 *  "modules/eshop/manifest.json"   -> "modules"
 *  "global/manifest.xml"           -> "global"
 */
export function getTopDirectoryName(manifestPath: string): string {
  if (!manifestPath) return 'repo';
  const normalized = manifestPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  return parts.length > 1 ? parts[0] : (parts[0] || 'repo');
}

/**
 * Fetches section repositories from an instance's Administration endpoint.
 * URL: {adminUrl}/CmsFsContentHandler.ashx
 * Headers:
 *  X-UserName: <username>
 *  X-Password: <password>
 *  X-Method: GetContentRepos
 */
export async function fetchInstanceSectionRepos(
  adminUrl: string,
  userName?: string,
  password?: string
): Promise<{ ok: boolean; repos: MagicGateSectionRepo[]; rawJson?: string; error?: string }> {
  if (!adminUrl || !adminUrl.trim()) {
    return { ok: false, repos: [], error: 'Instance nemá zadanou URL adresu administrace.' };
  }

  const cleanBase = adminUrl.trim().replace(/\/+$/, '');
  const endpoint = `${cleanBase}/CmsFsContentHandler.ashx`;

  const headers: Record<string, string> = {
    'X-Method': 'GetContentRepos',
  };

  if (userName) {
    headers['X-UserName'] = userName.trim();
  }
  if (password) {
    headers['X-Password'] = password;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          repos: [],
          error: `Ověření MagicGate selhalo (HTTP ${res.status}). Zkontrolujte uživatelské jméno a heslo v Nastavení -> Rozšíření -> MagicGate.`,
        };
      }
      return {
        ok: false,
        repos: [],
        error: `Server vrátil chybu HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

    let parsed: any[] = [];
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return {
        ok: false,
        repos: [],
        rawJson: rawText,
        error: `Odpověď serveru nebyla ve formátu JSON (Content-Type: ${contentType}).`,
      };
    }

    if (!Array.isArray(parsed)) {
      return {
        ok: false,
        repos: [],
        rawJson: rawText,
        error: 'Neplatný formát odpovědi: očekáváno pole repozitářů sekcí.',
      };
    }

    const repos: MagicGateSectionRepo[] = parsed.map((item) => {
      const sectionId = Number(item.SectionID || item.sectionId || 0);
      const manifestPath = String(item.ManifestPath || item.manifestPath || '');
      const repoUrl = String(item.RepoUrl || item.repoUrl || '');
      const version = item.Version || item.version ? String(item.Version || item.version) : undefined;
      const targetSubdir = getTopDirectoryName(manifestPath);

      return {
        sectionId,
        manifestPath,
        repoUrl,
        version,
        targetSubdir,
      };
    });

    return {
      ok: true,
      repos,
      rawJson: rawText,
    };
  } catch (err: any) {
    return {
      ok: false,
      repos: [],
      error: err?.message || 'Chyba při komunikaci s instancí MagicGate.',
    };
  }
}

/**
 * Clones all section repositories of an instance into targetDir.
 * Also writes repos.json in targetDir for full compatibility with Wox.
 */
export async function runMultiRepoClone(params: {
  repos: MagicGateSectionRepo[];
  targetDir: string;
  recursive?: boolean;
  rawJson?: string;
  forceReclone?: boolean;
  onProgress?: (data: { current: number; total: number; repoName: string; log: string }) => void;
}): Promise<{ success: boolean; targetPath: string; error?: string; alreadyExists?: boolean; allSkipped?: boolean }> {
  const { repos, targetDir, recursive = false, rawJson, forceReclone = false, onProgress } = params;

  if (!targetDir || !targetDir.trim()) {
    return { success: false, targetPath: '', error: 'Nebyla zadána cílová složka.' };
  }

  const cleanTarget = path.resolve(targetDir.trim());

  // 1. Create main target directory if not exists
  try {
    if (!fs.existsSync(cleanTarget)) {
      fs.mkdirSync(cleanTarget, { recursive: true });
    }
  } catch (err: any) {
    return { success: false, targetPath: cleanTarget, error: `Nelze vytvořit cílovou složku: ${err?.message}` };
  }

  // 2. Save repos.json in the target directory (identical to Wox behavior)
  try {
    const reposJsonPath = path.join(cleanTarget, 'repos.json');
    const content = rawJson || JSON.stringify(repos, null, 2);
    fs.writeFileSync(reposJsonPath, content, 'utf-8');
  } catch (err) {
    console.error('[MagicGateService] Failed to write repos.json:', err);
  }

  // 3. Filter valid repos with a URL
  const validRepos = repos.filter((r) => r.repoUrl && r.repoUrl.trim());
  if (validRepos.length === 0) {
    return {
      success: true,
      targetPath: cleanTarget,
      error: 'Instance neobsahuje žádné sekce s aktivním Git repozitářem.',
    };
  }

  let skippedCount = 0;

  // 4. Clone each repo sequentially
  for (let i = 0; i < validRepos.length; i++) {
    const repo = validRepos[i];
    const subPath = path.join(cleanTarget, repo.targetSubdir);

    onProgress?.({
      current: i + 1,
      total: validRepos.length,
      repoName: repo.targetSubdir,
      log: `\n[${i + 1}/${validRepos.length}] Příprava sekce ${repo.targetSubdir} (${repo.repoUrl})...\n`,
    });

    // Check if subPath already exists and contains files
    if (fs.existsSync(subPath)) {
      const files = fs.readdirSync(subPath);
      if (files.length > 0) {
        skippedCount++;
        onProgress?.({
          current: i + 1,
          total: validRepos.length,
          repoName: repo.targetSubdir,
          log: `[${i + 1}/${validRepos.length}] Složka ${repo.targetSubdir} již existuje a není prázdná, přeskakuji.\n`,
        });
        continue;
      }
    }

    const args = ['clone'];
    if (recursive) {
      args.push('--recursive');
    }

    // Version handling (e.g. branch name if specified)
    if (repo.version) {
      const parts = repo.version.split('/');
      if (parts[0]) {
        args.push('--branch', parts[0]);
      }
    }

    args.push(repo.repoUrl, subPath);

    onProgress?.({
      current: i + 1,
      total: validRepos.length,
      repoName: repo.targetSubdir,
      log: `> git ${args.join(' ')}\n`,
    });

    const cloneResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      let child: any;
      try {
        child = spawn('git', args, {
          shell: true,
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        });
      } catch (err: any) {
        resolve({ success: false, error: err?.message || 'Nepodařilo se spustit git.' });
        return;
      }

      child.stdout?.on('data', (data: Buffer) => {
        onProgress?.({
          current: i + 1,
          total: validRepos.length,
          repoName: repo.targetSubdir,
          log: data.toString(),
        });
      });

      child.stderr?.on('data', (data: Buffer) => {
        onProgress?.({
          current: i + 1,
          total: validRepos.length,
          repoName: repo.targetSubdir,
          log: data.toString(),
        });
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `Git skončil s kódem ${code}` });
        }
      });

      child.on('error', (err: any) => {
        resolve({ success: false, error: err?.message || 'Nepodařilo se spustit git.' });
      });
    });

    if (!cloneResult.success) {
      onProgress?.({
        current: i + 1,
        total: validRepos.length,
        repoName: repo.targetSubdir,
        log: `Chyba při klonování sekce ${repo.targetSubdir}: ${cloneResult.error}\n`,
      });
    }
  }

  return {
    success: true,
    targetPath: cleanTarget,
    alreadyExists: skippedCount > 0,
  };
}

/**
 * Downloads and extracts CMSinFS web content ZIP from an instance's Administration endpoint.
 * URL: {adminUrl}/CmsFsContentHandler.ashx
 * Headers:
 *  X-UserName: <username>
 *  X-Password: <password>
 *  X-Method: GetContent
 */
export async function downloadInstanceCmsContent(params: {
  adminUrl: string;
  targetDir: string;
  userName?: string;
  password?: string;
  instanceName?: string;
}): Promise<{ success: boolean; targetPath?: string; error?: string; fileCount?: number }> {
  const { adminUrl, targetDir, userName, password, instanceName } = params;

  if (!adminUrl || !adminUrl.trim()) {
    return { success: false, error: 'Instance nemá zadanou URL adresu administrace.' };
  }

  if (!targetDir || !targetDir.trim()) {
    return {
      success: false,
      error: 'Není nastavena cílová složka. Zkontrolujte v Nastavení -> Rozšíření -> MagicGate položku "Cesta ke zdrojovým kódům instance".',
    };
  }

  const cleanTarget = path.resolve(targetDir.trim());
  const cleanBase = adminUrl.trim().replace(/\/+$/, '');
  const endpoint = `${cleanBase}/CmsFsContentHandler.ashx`;

  const headers: Record<string, string> = {
    'X-Method': 'GetContent',
  };

  if (userName) {
    headers['X-UserName'] = userName.trim();
  }
  if (password) {
    headers['X-Password'] = password;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          error: `Ověření MagicGate selhalo (HTTP ${res.status}). Zkontrolujte uživatelské jméno a heslo v Nastavení -> Rozšíření -> MagicGate.`,
        };
      }
      return {
        success: false,
        error: `Server vrátil chybu HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ZIP magic bytes check: PK.. (0x50, 0x4B)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      const rawText = buffer.toString('utf-8').trim();
      return {
        success: false,
        error: rawText ? `Server vrátil chybu: ${rawText.slice(0, 250)}` : 'Server nevrátil platný ZIP archiv.',
      };
    }

    // Prepare target directory: if exists, purge contents; if not, create
    try {
      if (!fs.existsSync(cleanTarget)) {
        fs.mkdirSync(cleanTarget, { recursive: true });
      } else {
        const entries = fs.readdirSync(cleanTarget);
        for (const entry of entries) {
          const entryPath = path.join(cleanTarget, entry);
          fs.rmSync(entryPath, { recursive: true, force: true });
        }
      }
    } catch (fsErr: any) {
      return {
        success: false,
        error: `Nelze připravit cílovou složku "${cleanTarget}": ${fsErr?.message}`,
      };
    }

    // Extract ZIP safely
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch (zipErr: any) {
      return {
        success: false,
        error: `Nepodařilo se otevřít stažený ZIP archiv: ${zipErr?.message}`,
      };
    }

    const zipEntries = zip.getEntries();
    for (const entry of zipEntries) {
      const normalized = path.normalize(entry.entryName);
      if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
        return {
          success: false,
          error: `Detekována nepovolená cesta v archivu: ${entry.entryName}`,
        };
      }
    }

    zip.extractAllTo(cleanTarget, true);

    return {
      success: true,
      targetPath: cleanTarget,
      fileCount: zipEntries.length,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Chyba při stahování zdrojových kódů webu z instance.',
    };
  }
}
