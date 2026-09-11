import { app, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { SEARCH_ENGINES, SearchEngineDefinition } from '../src/constants/searchEngines';

class FaviconService {
  private cacheFilePath: string;
  private cache: Record<string, string> = {};
  private isRefreshing = false;

  constructor() {
    this.cacheFilePath = path.join(app.getPath('userData'), 'search-engine-favicons.json');
    this.loadCache();
    this.setupIpc();
  }

  private loadCache(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
        this.cache = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[FaviconService] Failed to load cached favicons from disk:', err);
    }

    // Seed any missing engines with their default favicon URL
    for (const engine of SEARCH_ENGINES) {
      if (!this.cache[engine.id]) {
        this.cache[engine.id] = engine.defaultFaviconUrl;
      }
    }
  }

  private saveCache(): void {
    try {
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[FaviconService] Failed to save favicons to disk:', err);
    }
  }

  private setupIpc(): void {
    ipcMain.handle('get-search-engine-favicons', () => {
      return this.getFavicons();
    });

    ipcMain.handle('fetch-favicon-for-url', async (_event, url: string) => {
      return await this.fetchFaviconForUrl(url);
    });
  }

  public getFavicons(): Record<string, string> {
    const result: Record<string, string> = { ...this.cache };
    for (const engine of SEARCH_ENGINES) {
      if (!result[engine.id]) {
        result[engine.id] = engine.defaultFaviconUrl;
      }
    }
    return result;
  }

  /**
   * Starts background extraction of metadata favicons from all registered search engines.
   */
  public async refreshFavicons(notifyWindow?: (favicons: Record<string, string>) => void): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      let hasUpdates = false;

      for (const engine of SEARCH_ENGINES) {
        try {
          const dataUrl = await this.extractAndFetchFavicon(engine);
          if (dataUrl && dataUrl !== this.cache[engine.id]) {
            this.cache[engine.id] = dataUrl;
            hasUpdates = true;
          }
        } catch (err: any) {
          console.warn(`[FaviconService] Error extracting favicon for ${engine.name} (${engine.baseUrl}):`, err?.message || err);
        }
      }

      if (hasUpdates) {
        this.saveCache();
        if (notifyWindow) {
          notifyWindow(this.getFavicons());
        }
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Fetches the baseUrl HTML, extracts the best <link rel="icon"> or fallback,
   * fetches image bytes and returns a data: URL.
   */
  private async extractAndFetchFavicon(engine: SearchEngineDefinition): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    let html = '';
    try {
      const pageRes = await fetch(engine.baseUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (pageRes.ok) {
        html = await pageRes.text();
      }
    } catch {
      // If fetching HTML fails, we will fall back to defaultFaviconUrl
    } finally {
      clearTimeout(timeout);
    }

    let targetIconUrl: string | null = null;

    if (html) {
      // Find all icon-related link tags
      const linkMatches = [...html.matchAll(/<link[^>]+rel=["']([^"']*(?:icon|shortcut)[^"']*)["'][^>]*>/gi)];
      
      // Preferred matches order: apple-touch-icon, large sizes (192, 96, 32), then normal icon
      let bestHref: string | null = null;
      for (const m of linkMatches) {
        const fullTag = m[0];
        const hrefMatch = fullTag.match(/href=["']([^"']+)["']/i);
        if (!hrefMatch) continue;
        const href = hrefMatch[1].trim();
        if (!href) continue;

        if (/apple-touch-icon/i.test(fullTag)) {
          bestHref = href;
          break; // Apple touch icons are usually high resolution PNG
        }
        if (/sizes=["'](?:192x192|96x96|32x32|48x48)["']/i.test(fullTag)) {
          bestHref = href;
        } else if (!bestHref) {
          bestHref = href;
        }
      }

      if (bestHref) {
        try {
          targetIconUrl = new URL(bestHref, engine.baseUrl).toString();
        } catch {
          targetIconUrl = null;
        }
      }
    }

    if (!targetIconUrl) {
      targetIconUrl = engine.defaultFaviconUrl || new URL('/favicon.ico', engine.baseUrl).toString();
    }

    return await this.fetchImageAsDataUrl(targetIconUrl);
  }

  /**
   * Fetches the favicon for any web URL, caches it by origin in memory & on disk,
   * and returns the base64 data URL.
   */
  public async fetchFaviconForUrl(targetUrl: string): Promise<string | null> {
    if (!targetUrl) return null;
    let origin = '';
    let hostname = '';
    try {
      const parsed = new URL(targetUrl.trim());
      origin = parsed.origin;
      hostname = parsed.hostname;
    } catch {
      return null;
    }

    if (!origin || !origin.startsWith('http')) return null;

    if (this.cache[origin]) {
      return this.cache[origin];
    }

    // Try HTML extraction first
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    let html = '';
    try {
      const pageRes = await fetch(origin, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (pageRes.ok) {
        html = await pageRes.text();
      }
    } catch {
      // ignore
    } finally {
      clearTimeout(timeout);
    }

    const candidateUrls: string[] = [];

    if (html) {
      const linkMatches = [...html.matchAll(/<link[^>]+rel=["']([^"']*(?:icon|shortcut)[^"']*)["'][^>]*>/gi)];
      for (const m of linkMatches) {
        const fullTag = m[0];
        const hrefMatch = fullTag.match(/href=["']([^"']+)["']/i);
        if (!hrefMatch) continue;
        const href = hrefMatch[1].trim();
        if (!href) continue;
        try {
          const absUrl = new URL(href, origin).toString();
          if (/apple-touch-icon/i.test(fullTag)) {
            candidateUrls.unshift(absUrl);
          } else {
            candidateUrls.push(absUrl);
          }
        } catch {
          // invalid url
        }
      }
    }

    candidateUrls.push(`${origin}/favicon.ico`);
    if (hostname) {
      candidateUrls.push(`https://www.google.com/s2/favicons?sz=64&domain=${hostname}`);
    }

    for (const cand of candidateUrls) {
      const dataUrl = await this.fetchImageAsDataUrl(cand);
      if (dataUrl) {
        this.cache[origin] = dataUrl;
        this.saveCache();
        return dataUrl;
      }
    }

    return null;
  }

  /**
   * Helper to fetch an image from a URL and convert it to a data URL.
   */
  private async fetchImageAsDataUrl(url: string): Promise<string | null> {
    const imgController = new AbortController();
    const imgTimeout = setTimeout(() => imgController.abort(), 5000);

    try {
      const imgRes = await fetch(url, {
        signal: imgController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!imgRes.ok) return null;

      const rawType = imgRes.headers.get('content-type') || '';
      let mime = rawType.split(';')[0].trim();
      if (!mime || mime.includes('text') || mime.includes('html')) {
        if (url.endsWith('.png')) mime = 'image/png';
        else if (url.endsWith('.svg')) mime = 'image/svg+xml';
        else mime = 'image/x-icon';
      }

      const arrayBuf = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      if (buffer.length === 0) return null;

      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    } finally {
      clearTimeout(imgTimeout);
    }
  }
}

export const faviconService = new FaviconService();
