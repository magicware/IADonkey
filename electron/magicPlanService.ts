import fs from 'node:fs';
import path from 'node:path';
import { net, BrowserWindow, app } from 'electron';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { AppStore } from './store';
import type { MagicPlanData, PlanTaskItem, MagicPlanSettings, PlanDayInfo } from '../src/types';
import { notificationService } from './notificationService';
import { diagnosticsService } from './diagnosticsService';

const execAsync = promisify(exec);

const USER_DATA_PATH = app?.getPath
  ? app.getPath('userData')
  : path.join(process.cwd(), '.user_data');

const CACHE_FILE = path.join(USER_DATA_PATH, 'magicplan_cache.json');

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizeStr(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export interface MagicPlanQueryLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'offline';
  url: string;
  durationMs: number;
  htmlLength: number;
  myTasksCount: number;
  unassignedTasksCount: number;
  totalHours: number;
  newTasks: string[];
  completedTasks: string[];
  changedTasks: string[];
  error?: string;
  myTasks: PlanTaskItem[];
  unassignedTasks: PlanTaskItem[];
}

/**
 * Returns a stable unique business fingerprint for a plan task, independent of transient DOM IDs
 */
export function getTaskFingerprint(task: PlanTaskItem): string {
  if (task.isNotAvailable) {
    return `NOTAVAILABLE::${task.dates?.[0] || task.taskId}`;
  }
  const codes: string[] = [];
  if (task.requirementId) codes.push(task.requirementId.toUpperCase().trim());
  if (task.taskIdentifier) codes.push(task.taskIdentifier.toUpperCase().trim());
  if (codes.length > 0) {
    return codes.sort().join('::');
  }
  const normTitle = normalizeStr(task.customName || task.title || '');
  const normProject = normalizeStr(task.project || '');
  if (normTitle) {
    return `TITLE::${normProject}::${normTitle}`;
  }
  return `RAW::${task.taskId}`;
}

export class MagicPlanService {
  private store: AppStore;
  private timer: NodeJS.Timeout | null = null;
  private cachedData: MagicPlanData | null = null;
  private previousMyTasks: Map<string, PlanTaskItem> = new Map();
  private queryHistory: MagicPlanQueryLog[] = [];
  private isFetching = false;
  private currentUserColumn: string = '';

  constructor(store: AppStore) {
    this.store = store;
    this.currentUserColumn = this.store.getConfig().magicplan?.userColumn?.trim() || '';
    this.previousMyTasks = this.loadDiskCache();
    if (this.previousMyTasks.size > 0) {
      const myTasks = Array.from(this.previousMyTasks.values());
      const totalMyHours = myTasks.reduce((sum, t) => sum + (t.totalHours || 0), 0);
      this.cachedData = {
        myTasks,
        unassignedTasks: [],
        totalMyHours,
      };
    }
  }

  private recordQueryLog(entry: MagicPlanQueryLog): void {
    this.queryHistory.unshift(entry);
    if (this.queryHistory.length > 10) {
      this.queryHistory.pop();
    }
  }

  public getDevLogs(): {
    cachedData: MagicPlanData | null;
    diskCache: { lastUpdated: string; tasks: Record<string, any> };
    history: MagicPlanQueryLog[];
  } {
    let diskCacheData: any = { lastUpdated: '', tasks: {} };
    try {
      if (fs.existsSync(CACHE_FILE)) {
        diskCacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      }
    } catch (err) {
      console.warn('[MagicPlan] Chyba čtení souboru diskové mezipaměti:', err);
    }

    return {
      cachedData: this.cachedData,
      diskCache: diskCacheData,
      history: [...this.queryHistory],
    };
  }

  private loadDiskCache(): Map<string, PlanTaskItem> {
    const map = new Map<string, PlanTaskItem>();
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed?.tasks && typeof parsed.tasks === 'object') {
          for (const [key, t] of Object.entries(parsed.tasks)) {
            const task = t as PlanTaskItem;
            const fp = getTaskFingerprint(task) || key;
            map.set(fp, task);
          }
        }
      }
    } catch (err) {
      console.warn('[MagicPlan] Chyba načítání diskové mezipaměti:', err);
    }
    return map;
  }

  private saveDiskCache(tasks: PlanTaskItem[]): void {
    try {
      const obj: Record<string, any> = {};
      for (const t of tasks) {
        const fp = getTaskFingerprint(t);
        obj[fp] = {
          taskId: t.taskId,
          requirementId: t.requirementId,
          taskIdentifier: t.taskIdentifier,
          title: t.title,
          customName: t.customName,
          totalHours: t.totalHours,
          project: t.project,
          taskType: t.taskType,
          dates: t.dates,
          author: t.author,
          isCompleted: t.isCompleted,
          isNotAvailable: t.isNotAvailable,
          isCritical: t.isCritical,
        };
      }
      fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify({ lastUpdated: new Date().toISOString(), tasks: obj }, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.warn('[MagicPlan] Chyba ukládání diskové mezipaměti:', err);
    }
  }

  public clearData(): void {
    this.cachedData = null;
    this.previousMyTasks.clear();
    try {
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
      }
    } catch (err) {
      console.warn('[MagicPlan] Chyba při mazání souboru mezipaměti:', err);
    }
    const emptyData: MagicPlanData = {
      lastChecked: new Date().toLocaleTimeString('cs-CZ'),
      myTasks: [],
      unassignedTasks: [],
      totalMyHours: 0,
      days: [],
    };
    this.cachedData = emptyData;
    this.broadcastData(emptyData);
  }

  public onUserColumnChanged(newUserColumn?: string): void {
    const trimmed = (newUserColumn || '').trim();
    if (this.currentUserColumn !== trimmed) {
      this.clearData();
      this.currentUserColumn = trimmed;
      this.restart();
    }
  }

  public start(): void {
    this.stop();
    const config = this.store.getConfig();
    const isExtensionEnabled = config.extensions?.magicplan === true;
    const isPlanEnabled = config.magicplan?.enabled === true;
    const url = config.magicplan?.url?.trim();
    const userColumn = config.magicplan?.userColumn?.trim() || '';

    // If user column changed from what was previously stored, clear old user data
    if (this.currentUserColumn && this.currentUserColumn !== userColumn) {
      this.clearData();
    }
    this.currentUserColumn = userColumn;

    if (!isExtensionEnabled || !isPlanEnabled || !url || !userColumn) {
      return;
    }

    const intervalMinutes = Math.max(1, config.magicplan?.pollIntervalMinutes || 2);
    const intervalMs = intervalMinutes * 60 * 1000;

    // Run first check shortly after app startup
    setTimeout(() => {
      this.fetchAndDiff().catch((err) => {
        console.error('[MagicPlan] Initial fetch error:', err);
      });
    }, 2000);

    this.timer = setInterval(() => {
      this.fetchAndDiff().catch((err) => {
        console.error('[MagicPlan] Polling fetch error:', err);
      });
    }, intervalMs);

    console.log(`[MagicPlan] Služba aktivována (interval: ${intervalMinutes} min).`);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public restart(): void {
    this.stop();
    this.start();
  }

  public getCachedData(): MagicPlanData | null {
    return this.cachedData;
  }

  public async manualRefresh(): Promise<MagicPlanData> {
    return this.fetchAndDiff();
  }

  /**
  /**
   * Builds direct link to task or requirement respecting TaskManager extension settings
   */
  private buildTaskUrl(
    requirementId?: string,
    taskIdentifier?: string,
    linkWithTaskManager: boolean = true,
    mlogBaseUrl?: string,
    mlogTaskPrefix: string = 'T',
    mlogRequestPrefix: string = 'R'
  ): string | undefined {
    if (!linkWithTaskManager) {
      return undefined;
    }
    const cleanBase = mlogBaseUrl?.trim().replace(/\/+$/, '');
    if (!cleanBase) {
      return undefined;
    }

    const tPref = (mlogTaskPrefix || 'T').trim();
    const rPref = (mlogRequestPrefix || 'R').trim();

    if (taskIdentifier) {
      const numOnly = taskIdentifier.replace(/\D/g, '');
      if (numOnly) {
        return `${cleanBase}/${tPref}${numOnly}`;
      }
    }
    if (requirementId) {
      const numOnly = requirementId.replace(/\D/g, '');
      if (numOnly) {
        return `${cleanBase}/${rPref}${numOnly}`;
      }
    }
    return undefined;
  }

  /**
   * Fetches plan HTML from server, parses tasks, checks differences and broadcasts updates
   */
  public async fetchAndDiff(): Promise<MagicPlanData> {
    if (this.isFetching) {
      return this.cachedData || {
        lastChecked: new Date().toLocaleTimeString('cs-CZ'),
        myTasks: [],
        unassignedTasks: [],
        totalMyHours: 0,
      };
    }

    this.isFetching = true;
    const startTime = Date.now();
    const config = this.store.getConfig();
    const planConfig: MagicPlanSettings = config.magicplan || {};
    const url = planConfig.url?.trim();
    const myColumnIdentifier = planConfig.userColumn?.trim();
    const queueColumnIdentifier = planConfig.unassignedColumn?.trim() || '';
    const linkWithTaskManager = planConfig.linkWithTaskManager !== false;
    const mlogBaseUrl = config.mlog?.baseUrl;
    const mlogTaskPrefix = config.mlog?.taskPrefix || 'T';
    const mlogRequestPrefix = config.mlog?.requestPrefix || 'R';

    if (!url || !myColumnIdentifier) {
      this.isFetching = false;
      const emptyData: MagicPlanData = {
        lastChecked: new Date().toLocaleTimeString('cs-CZ'),
        myTasks: [],
        unassignedTasks: [],
        totalMyHours: 0,
        error: 'Nastavte URL adresu plánu a identifikátor sloupce v nastavení MagicPlan.',
        isOffline: true,
      };
      this.cachedData = emptyData;
      return emptyData;
    }

    try {
      const html = await this.fetchHtmlWithCredentials(url);
      const parsed = this.parsePlanHtml(
        html,
        myColumnIdentifier,
        queueColumnIdentifier,
        linkWithTaskManager,
        mlogBaseUrl,
        mlogTaskPrefix,
        mlogRequestPrefix
      );

      const nowIso = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newData: MagicPlanData = {
        planNumber: parsed.planNumber,
        planRange: parsed.planRange,
        days: parsed.days,
        lastChecked: nowIso,
        myTasks: parsed.myTasks,
        unassignedTasks: parsed.unassignedTasks,
        totalMyHours: parsed.totalMyHours,
        isOffline: false,
      };

      // Check diffs and show notifications
      const diffResult = this.checkDiffsAndNotify(parsed.myTasks, planConfig);

      this.cachedData = newData;
      this.broadcastData(newData);

      // Record query log for developer inspection
      this.recordQueryLog({
        id: `query-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        status: 'success',
        url,
        durationMs: Date.now() - startTime,
        htmlLength: html.length,
        myTasksCount: parsed.myTasks.length,
        unassignedTasksCount: parsed.unassignedTasks.length,
        totalHours: parsed.totalMyHours,
        newTasks: diffResult.newTasks,
        completedTasks: diffResult.completedTasks,
        changedTasks: diffResult.changedTasks,
        myTasks: parsed.myTasks,
        unassignedTasks: parsed.unassignedTasks,
      });

      diagnosticsService.logAction({
        type: 'sync',
        title: 'MagicPlan: synchronizace plánu',
        details: `Načteno ${parsed.myTasks.length} mých úkolů (${parsed.totalMyHours}h), ${parsed.unassignedTasks.length} ve frontě (${parsed.planRange || 'akt. období'})`,
        status: 'success',
      });

      return newData;
    } catch (err: any) {
      console.warn('[MagicPlan] Chyba načtení plánu (možná offline / mimo VPN):', err?.message || err);

      const nowIso = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const offlineData: MagicPlanData = {
        ...(this.cachedData || {
          myTasks: [],
          unassignedTasks: [],
          totalMyHours: 0,
        }),
        lastChecked: nowIso,
        error: err?.message || 'Nelze se připojit k internímu serveru plánu',
        isOffline: true,
      };

      this.recordQueryLog({
        id: `query-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        status: 'error',
        url: url || '',
        durationMs: Date.now() - startTime,
        htmlLength: 0,
        myTasksCount: 0,
        unassignedTasksCount: 0,
        totalHours: 0,
        newTasks: [],
        completedTasks: [],
        changedTasks: [],
        error: err?.message || String(err),
        myTasks: [],
        unassignedTasks: [],
      });

      this.cachedData = offlineData;
      this.broadcastData(offlineData);
      return offlineData;
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Fetches HTML from internal URL using Chromium net.fetch with NTLM credentials,
   * falling back to Windows PowerShell Invoke-WebRequest if needed.
   */
  private async fetchHtmlWithCredentials(url: string): Promise<string> {
    // 1. Try Chromium net.fetch (handles Windows Integrated Authentication natively)
    try {
      const response = await net.fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IADonkey/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (response.ok) {
        const text = await response.text();
        if (text && text.includes('class="plan"')) {
          return text;
        }
      }
    } catch (err) {
      // Net.fetch failed or intranet zone requires explicit default credentials, proceed to fallback
    }

    // 2. Robust fallback: PowerShell Invoke-WebRequest with current Windows user credentials
    const psCommand = `powershell -NoProfile -NonInteractive -Command "$res = Invoke-WebRequest -Uri '${url}' -UseDefaultCredentials -UseBasicParsing -TimeoutSec 15; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $res.Content"`;
    const { stdout, stderr } = await execAsync(psCommand, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 20000,
    });

    if (stderr && !stdout) {
      throw new Error(`PowerShell fetch failed: ${stderr}`);
    }

    if (!stdout || !stdout.includes('class="plan"')) {
      throw new Error('Server vrátil neúplná nebo prázdná data plánu');
    }

    return stdout;
  }

  /**
   * Parses the HTML structure of plan page
   */
  private parsePlanHtml(
    html: string,
    myColumnIdentifier: string,
    queueColumnIdentifier: string,
    linkWithTaskManager: boolean,
    mlogBaseUrl?: string,
    mlogTaskPrefix: string = 'T',
    mlogRequestPrefix: string = 'R'
  ): {
    planNumber?: string;
    planRange?: string;
    days: PlanDayInfo[];
    myTasks: PlanTaskItem[];
    unassignedTasks: PlanTaskItem[];
    totalMyHours: number;
  } {
    // 1. Extract plan number and date range from dropdown
    let planNumber: string | undefined;
    let planRange: string | undefined;

    const planOptionMatch = html.match(
      /<select[^>]*class="[^"]*plan-selection[^"]*"[^>]*>[\s\S]*?<option[^>]*value="(\d+)"[^>]*selected[^>]*>\s*([^<]+)\s*<\/option>/i
    );
    if (planOptionMatch) {
      planNumber = planOptionMatch[1];
      planRange = decodeHtmlEntities(planOptionMatch[2]);
    }

    // 2. Extract day blocks with top positions to map task slices to dates
    const dayBlocks: { date: string; top: number; dayLabel: string; isWeekend: boolean; isToday: boolean }[] = [];
    const dayRegex =
      /<div class="block[^"]*"[^>]*style="[^"]*top:\s*(\d+)px[^"]*"[^>]*data-date="([^"]*)"[^>]*>[\s\S]*?<div class="date-label\s*([^"]*)">([\s\S]*?)<\/div>/gi;
    let dm: RegExpExecArray | null;
    const seenDates = new Set<string>();

    while ((dm = dayRegex.exec(html)) !== null) {
      const top = parseInt(dm[1], 10);
      const fullDate = dm[2].split(' ')[0]; // '2026-09-28'
      const isToday = dm[3].includes('today');
      const rawLabel = decodeHtmlEntities(dm[4]);
      const cleanLabel = rawLabel.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
      const isWeekend = cleanLabel.startsWith('so') || cleanLabel.startsWith('ne');

      if (!seenDates.has(fullDate)) {
        seenDates.add(fullDate);
        dayBlocks.push({
          date: fullDate,
          top,
          dayLabel: cleanLabel,
          isWeekend,
          isToday,
        });
      }
    }
    dayBlocks.sort((a, b) => a.top - b.top);

    const getDateForTop = (topPx: number): string => {
      for (let i = dayBlocks.length - 1; i >= 0; i--) {
        if (topPx >= dayBlocks[i].top) {
          return dayBlocks[i].date;
        }
      }
      return dayBlocks[0]?.date || '';
    };

    // 3. Extract user columns
    const normMyId = normalizeStr(myColumnIdentifier);
    const normQueueId = normalizeStr(queueColumnIdentifier);

    const userRegex =
      /<div class="user"[^>]*>[\s\S]*?<div class="header">([^<]+)<\/div>([\s\S]*?)(?=(?:<div class="user"|$))/gi;
    let match: RegExpExecArray | null;

    let myTasksRaw: PlanTaskItem[] = [];
    let unassignedTasksRaw: PlanTaskItem[] = [];

    while ((match = userRegex.exec(html)) !== null) {
      const headerRaw = match[1];
      const headerText = decodeHtmlEntities(headerRaw);
      const normHeader = normalizeStr(headerText);
      const columnBody = match[2];

      const isMyColumn = Boolean(
        normMyId &&
        (normHeader.includes(normMyId) || columnBody.includes(`data-user-id="${normMyId}"`))
      );

      const isQueueColumn = Boolean(
        normQueueId &&
        (normHeader.includes(normQueueId) || columnBody.includes(`data-user-id="${normQueueId}"`))
      );

      if (isMyColumn) {
        myTasksRaw = this.extractTasksFromColumn(
          columnBody,
          headerText,
          getDateForTop,
          linkWithTaskManager,
          mlogBaseUrl,
          mlogTaskPrefix,
          mlogRequestPrefix
        );
      } else if (isQueueColumn) {
        unassignedTasksRaw = this.extractTasksFromColumn(
          columnBody,
          headerText,
          getDateForTop,
          linkWithTaskManager,
          mlogBaseUrl,
          mlogTaskPrefix,
          mlogRequestPrefix
        );
      }
    }

    // Deduplicate and group tasks by taskId
    const myTasks = this.deduplicateTasks(myTasksRaw);
    const unassignedTasks = this.deduplicateTasks(unassignedTasksRaw);
    const totalMyHours = myTasks.reduce((sum, t) => sum + (t.totalHours || 0), 0);

    const days: PlanDayInfo[] = dayBlocks.map((d) => ({
      date: d.date,
      dayLabel: d.dayLabel,
      isWeekend: d.isWeekend,
      isToday: d.isToday,
    }));

    return {
      planNumber,
      planRange,
      days,
      myTasks,
      unassignedTasks,
      totalMyHours,
    };
  }

  /**
   * Extracts individual task DOM elements from a column
   */
  private extractTasksFromColumn(
    columnHtml: string,
    userName: string,
    getDateForTop: (topPx: number) => string,
    linkWithTaskManager: boolean,
    mlogBaseUrl?: string,
    mlogTaskPrefix: string = 'T',
    mlogRequestPrefix: string = 'R'
  ): PlanTaskItem[] {
    const tasks: PlanTaskItem[] = [];

    // Regex matching each task DIV block until the next task or column end
    const taskBlockRegex =
      /<div\s+class="task\s+([^"]*)"([^>]*)>([\s\S]*?)(?=<div\s+class="task\s+|$)/gi;

    let m: RegExpExecArray | null;
    while ((m = taskBlockRegex.exec(columnHtml)) !== null) {
      const classNames = m[1] || '';
      const attrs = m[2] || '';
      const innerContent = m[3] || '';
      const fullTaskHtml = m[0] || '';

      const styleMatch = attrs.match(/style="([^"]*)"/i);
      const style = styleMatch ? styleMatch[1] : '';

      const titleMatch = attrs.match(/title="([^"]*)"/i);
      const rawTitle = decodeHtmlEntities(titleMatch ? titleMatch[1] : '');

      const userIdMatch = attrs.match(/data-user-id="([^"]*)"/i);
      const userId = userIdMatch ? userIdMatch[1] : '';

      const taskIdMatch = attrs.match(/data-task-id="([^"]*)"/i);
      const guidMatch = classNames.match(/([a-f0-9\-]{36})/i);
      const taskId = (taskIdMatch ? taskIdMatch[1] : (guidMatch ? guidMatch[1] : '')) || `task-${Math.random()}`;

      const identMatch = attrs.match(/data-task-identifier="([^"]*)"/i);
      const taskIdentifier = identMatch ? identMatch[1] : '';

      const hoursMatch = attrs.match(/data-task-total-hours="([^"]*)"/i);
      let totalHours = parseFloat(hoursMatch ? hoursMatch[1] : '0') || 0;
      if (totalHours <= 0) {
        const innerHoursMatch = innerContent.match(/<span[^>]*class="hours"[^>]*>\s*([\d,\.]+)\s*h?<\/span>/i);
        if (innerHoursMatch) {
          totalHours = parseFloat(innerHoursMatch[1].replace(',', '.')) || 0;
        }
      }

      const customNameMatch = attrs.match(/data-task-custom-name="([^"]*)"/i);
      const customName = decodeHtmlEntities(customNameMatch ? customNameMatch[1] : '');

      const pinMatch = attrs.match(/data-task-pin-state="([^"]*)"/i);
      const pinState = pinMatch ? pinMatch[1] : 'unpinned';

      // Parse requirement ID (e.g. R134695)
      const reqMatch = rawTitle.match(/\b(R\d+)\b/i) || innerContent.match(/href="[^"]*(?:R|req-link[^"]*)(\d+)"/i) || innerContent.match(/\b(R\d+)\b/i);
      const requirementId = reqMatch ? (reqMatch[1].startsWith('R') ? reqMatch[1] : `R${reqMatch[1]}`) : undefined;

      // Parse project name from parentheses at end or from project-name span
      let project: string | undefined;
      const projMatch = rawTitle.match(/\(([^)]+)\)\s*$/);
      if (projMatch) {
        project = projMatch[1].trim();
      } else {
        const projSpan = innerContent.match(/<span[^>]*class="project-name"[^>]*>\s*([^<]+)\s*<\/span>/i);
        if (projSpan) {
          project = decodeHtmlEntities(projSpan[1]).trim();
        }
      }

      // Extract author initials (e.g. "KR", "VM", "PK", "JB")
      let author: string | undefined;
      const authorSpan = innerContent.match(/<span[^>]*class="[^"]*(?:author|user|zadavatel|creator|creator-user|owner|initials)[^"]*"[^>]*>\s*([^<]+)\s*<\/span>/i);
      if (authorSpan) {
        author = decodeHtmlEntities(authorSpan[1]).trim();
      } else {
        const acronymMatch = innerContent.match(/<span[^>]*>\s*([A-Z]{2,4})\s*<\/span>/);
        if (acronymMatch) {
          author = acronymMatch[1].trim();
        }
      }
      if (!author) {
        const titleAcronym = rawTitle.match(/\[([A-Z]{2,4})\]/) || rawTitle.match(/\(([A-Z]{2,4})\)/) || rawTitle.match(/\b([A-Z]{2,3})\b(?:\s*:\s*|\s*-\s*|\s*$)/);
        if (titleAcronym) {
          author = titleAcronym[1].trim();
        }
      }

      // Check if task is completed / solved
      const isCompleted =
        classNames.includes('solved') ||
        classNames.includes('completed') ||
        classNames.includes('done') ||
        classNames.includes('finished') ||
        classNames.includes('closed') ||
        pinState === 'completed' ||
        pinState === 'solved' ||
        rawTitle.toLowerCase().includes('splněno') ||
        rawTitle.toLowerCase().includes('dokončeno') ||
        rawTitle.toLowerCase().includes('hotovo');

      // Check priority (priority-1 is critical)
      const isCritical =
        classNames.includes('priority-1') ||
        attrs.includes('priority-1') ||
        innerContent.includes('priority-1') ||
        fullTaskHtml.includes('priority-1') ||
        innerContent.includes("class='priority-1'") ||
        innerContent.includes('class="priority-1"') ||
        innerContent.toLowerCase().includes("title='kritická'") ||
        innerContent.toLowerCase().includes('title="kritická"') ||
        rawTitle.toLowerCase().includes('priority-1') ||
        customName.toLowerCase().includes('priority-1');

      // Determine task type (dev vs service)
      let taskType: 'dev' | 'service' | 'other' = 'other';
      if (classNames.includes('dev-')) taskType = 'dev';
      else if (classNames.includes('service-')) taskType = 'service';

      // Clean display title
      let cleanTitle = customName;
      if (!cleanTitle) {
        const reqNameSpan = innerContent.match(/<span[^>]*class="requirement-name"[^>]*>\s*([^<]+)\s*<\/span>/i);
        if (reqNameSpan) {
          cleanTitle = decodeHtmlEntities(reqNameSpan[1]).trim();
        }
      }
      if (!cleanTitle && rawTitle) {
        cleanTitle = rawTitle.replace(/\b[RT]\d+\b/g, '').replace(/\(([^)]+)\)\s*$/, '').trim();
      }

      // Determine scheduled date from top style coordinate
      const topMatch = style.match(/top:\s*(\d+)px/i);
      const topPx = topMatch ? parseInt(topMatch[1], 10) : 0;
      const scheduledDate = getDateForTop(topPx);

      const taskUrl = this.buildTaskUrl(
        requirementId,
        taskIdentifier || undefined,
        linkWithTaskManager,
        mlogBaseUrl,
        mlogTaskPrefix,
        mlogRequestPrefix
      );

      tasks.push({
        taskId,
        requirementId,
        taskIdentifier: taskIdentifier || undefined,
        title: cleanTitle || rawTitle || 'Bez názvu',
        customName: customName || undefined,
        project,
        userId,
        userName,
        totalHours,
        isPinned: pinState === 'pinned',
        isSolved: classNames.includes('solved') || pinState === 'solved',
        taskType,
        dates: scheduledDate ? [scheduledDate] : [],
        url: taskUrl,
        author,
        isCompleted,
        isCritical,
      });
    }

    // Also extract not-available blocks (e.g. holidays, vacations, sick leaves)
    const naBlockRegex =
      /<div\s+class="[^"]*block[^"]*not-available[^"]*"[^>]*style="([^"]*)"[^>]*title="([^"]*)"[^>]*data-user-id="([^"]*)"[^>]*data-date="([^"]*)"/gi;
    let naMatch: RegExpExecArray | null;
    const naByDate = new Map<string, { count: number; userId: string }>();

    while ((naMatch = naBlockRegex.exec(columnHtml)) !== null) {
      const naStyle = naMatch[1] || '';
      const naUserId = naMatch[3] || '';
      const naDateRaw = naMatch[4] || ''; // e.g. "2026-09-28 00:00"
      const datePart = naDateRaw.split(' ')[0];
      const scheduledDate =
        datePart ||
        getDateForTop(
          parseInt((naStyle.match(/top:\s*(\d+)px/i) || [])[1] || '0', 10)
        );

      if (scheduledDate) {
        const prev = naByDate.get(scheduledDate) || { count: 0, userId: naUserId };
        prev.count += 1;
        if (!prev.userId && naUserId) prev.userId = naUserId;
        naByDate.set(scheduledDate, prev);
      }
    }

    for (const [naDate, info] of naByDate.entries()) {
      tasks.push({
        taskId: `notavailable-${naDate}`,
        title: 'Nedostupný / Volno',
        customName: 'Nedostupný / Volno',
        project: 'Absence / Svátek',
        userId: info.userId || '',
        userName,
        totalHours: info.count,
        isPinned: false,
        taskType: 'other',
        dates: [naDate],
        isCompleted: false,
        isNotAvailable: true,
      });
    }

    return tasks;
  }

  /**
   * Deduplicates tasks sharing the same taskId across multiple day slices
   */
  private deduplicateTasks(tasks: PlanTaskItem[]): PlanTaskItem[] {
    const map = new Map<string, PlanTaskItem>();

    for (const t of tasks) {
      const existing = map.get(t.taskId);
      if (!existing) {
        map.set(t.taskId, { ...t, dates: [...t.dates] });
      } else {
        // Keep highest totalHours if slice had partial
        if (t.totalHours > existing.totalHours) {
          existing.totalHours = t.totalHours;
        }
        if (!existing.requirementId && t.requirementId) {
          existing.requirementId = t.requirementId;
        }
        if (!existing.taskIdentifier && t.taskIdentifier) {
          existing.taskIdentifier = t.taskIdentifier;
        }
        if (!existing.project && t.project) {
          existing.project = t.project;
        }
        if (!existing.author && t.author) {
          existing.author = t.author;
        }
        if (t.isCompleted) {
          existing.isCompleted = true;
        }
        if (t.isNotAvailable) {
          existing.isNotAvailable = true;
        }
        if (t.isCritical) {
          existing.isCritical = true;
        }
        if (!existing.url && t.url) {
          existing.url = t.url;
        }
        for (const d of t.dates) {
          if (!existing.dates.includes(d)) {
            existing.dates.push(d);
          }
        }
      }
    }

    return Array.from(map.values());
  }

  /**
   * Compares current tasks with previous snapshot using stable fingerprints and fires Windows toast notifications
   */
  private checkDiffsAndNotify(currentTasks: PlanTaskItem[], planConfig: MagicPlanSettings): {
    newTasks: string[];
    completedTasks: string[];
    changedTasks: string[];
  } {
    const config = this.store.getConfig();
    const notificationsEnabled = config.notifications?.enabled !== false && config.notifications?.magicplan !== false;

    const diffResult = {
      newTasks: [] as string[],
      completedTasks: [] as string[],
      changedTasks: [] as string[],
    };

    // Safety guard: if server returned 0 tasks (parsing issue or error), never wipe out known baseline
    if (currentTasks.length === 0) {
      return diffResult;
    }

    const currentMap = new Map<string, PlanTaskItem>();
    for (const t of currentTasks) {
      const fp = getTaskFingerprint(t);
      currentMap.set(fp, t);
    }

    // On the very first run (no cache exists on disk), record baseline without spamming notifications
    if (this.previousMyTasks.size === 0) {
      this.previousMyTasks = currentMap;
      this.saveDiskCache(currentTasks);
      return diffResult;
    }

    // 1. New tasks added to plan
    for (const [fp, task] of currentMap) {
      if (!this.previousMyTasks.has(fp)) {
        const codePrefix = [task.requirementId, task.taskIdentifier].filter(Boolean).join(' / ');
        const label = codePrefix ? `[${codePrefix}] ` : '';
        const hoursLabel = task.totalHours ? ` (${task.totalHours}h)` : '';
        const taskDesc = `${label}${task.customName || task.title}${hoursLabel}`;
        diffResult.newTasks.push(taskDesc);

        if (notificationsEnabled && planConfig.notifyNewTasks !== false) {
          notificationService.show({
            type: 'magicPlan',
            title: 'Nový požadavek v plánu',
            body: taskDesc,
          });
        }
      }
    }

    // 2. Tasks completed / removed from plan
    for (const [fp, prevTask] of this.previousMyTasks) {
      if (!currentMap.has(fp)) {
        const codePrefix = [prevTask.requirementId, prevTask.taskIdentifier].filter(Boolean).join(' / ');
        const label = codePrefix ? `[${codePrefix}] ` : '';
        const taskDesc = `${label}${prevTask.customName || prevTask.title}`;
        diffResult.completedTasks.push(taskDesc);

        if (notificationsEnabled && planConfig.notifyCompletedTasks !== false) {
          notificationService.show({
            type: 'magicPlan',
            title: 'Úkol v plánu úspěšně zpracován',
            body: taskDesc,
          });
        }
      }
    }

    // 3. Changed tasks (hours altered)
    for (const [fp, task] of currentMap) {
      const prev = this.previousMyTasks.get(fp);
      if (prev && prev.totalHours !== task.totalHours) {
        const codePrefix = [task.requirementId, task.taskIdentifier].filter(Boolean).join(' / ');
        const label = codePrefix ? `[${codePrefix}] ` : '';
        const taskDesc = `${label}${task.customName || task.title} (${prev.totalHours}h → ${task.totalHours}h)`;
        diffResult.changedTasks.push(taskDesc);

        if (notificationsEnabled && planConfig.notifyTaskChanges !== false) {
          notificationService.show({
            type: 'magicPlan',
            title: 'Změna v plánu',
            body: `${label}${task.customName || task.title} (hodiny: ${prev.totalHours}h → ${task.totalHours}h)`,
          });
        }
      }
    }

    this.previousMyTasks = currentMap;
    this.saveDiskCache(currentTasks);
    return diffResult;
  }

  /**
   * Sends updated plan data to all open BrowserWindow instances
   */
  private broadcastData(data: MagicPlanData): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('magicplan:data-updated', data);
      }
    }
  }
}
