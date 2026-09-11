import fs from 'node:fs';
import type { LauncherItem } from '../src/types';

function getAttribute(attrsString: string, attrName: string): string {
  const match = new RegExp(`${attrName}=["']([^"']*)["']`, 'i').exec(attrsString);
  return match ? match[1] : '';
}

/**
 * Parses MagicGate deploy XML content into LauncherItem objects.
 * - Strips XML comments
 * - Ignores servers matching "bench"
 * - Extracts instances (ignoring instances matching "bench")
 * - Extracts valid apps (ignoring empty or "#" URLs)
 * - First app becomes main item
 * - Remaining apps become options (subitems) with mapped names and image: '{favicon}'
 */
export function parseMagicGateXml(xmlContent: string): LauncherItem[] {
  // 1. Strip XML comments to avoid parsing disabled/commented-out blocks
  const cleanXml = xmlContent.replace(/<!--[\s\S]*?-->/g, '');

  const items: LauncherItem[] = [];

  // 2. Find all <Server ...>...</Server> blocks
  const serverRegex = /<Server\s+([^>]*?)>([\s\S]*?)<\/Server>/gi;
  let serverMatch: RegExpExecArray | null;

  while ((serverMatch = serverRegex.exec(cleanXml)) !== null) {
    const serverAttrs = serverMatch[1];
    const serverBody = serverMatch[2];

    const serverName = getAttribute(serverAttrs, 'Name');
    // Rule: exclude BenchServer / BenchMarking
    if (serverName.toLowerCase().includes('bench')) {
      continue;
    }

    // 3. Find all <Instance ...>...</Instance> or <Instance ... /> blocks
    const instanceRegex = /<Instance\s+([^>]*?)(?:>([\s\S]*?)<\/Instance>|\/>)/gi;
    let instanceMatch: RegExpExecArray | null;

    while ((instanceMatch = instanceRegex.exec(serverBody)) !== null) {
      const instanceAttrs = instanceMatch[1];
      const instanceBody = instanceMatch[2] || '';

      const instanceName = getAttribute(instanceAttrs, 'Name');
      if (!instanceName || instanceName.toLowerCase().includes('bench')) {
        continue;
      }

      // 4. Find all <App ... /> or <Check ... /> inside the instance
      const appRegex = /<(?:App|Check)\s+([^>]*?)(?:\/>|>[\s\S]*?<\/(?:App|Check)>)/gi;
      let appMatch: RegExpExecArray | null;
      const validApps: { name: string; url: string }[] = [];

      while ((appMatch = appRegex.exec(instanceBody)) !== null) {
        const appAttrs = appMatch[1];
        const rawName = getAttribute(appAttrs, 'Name') || '';
        const rawUrl = (getAttribute(appAttrs, 'Url') || '').trim();

        if (
          !rawUrl ||
          rawUrl === '#' ||
          rawUrl.toLowerCase() === 'http://' ||
          rawUrl.toLowerCase() === 'https://'
        ) {
          continue;
        }

        validApps.push({
          name: rawName,
          url: rawUrl,
        });
      }

      if (validApps.length === 0) {
        continue;
      }

      // First app becomes main item
      const mainApp = validApps[0];
      const otherApps = validApps.slice(1);

      const options: LauncherItem[] = otherApps.map((app) => {
        let displayName = app.name;
        const upper = app.name.trim().toUpperCase();
        if (upper === 'A') {
          displayName = 'Administrace';
        } else if (upper === 'W' || upper === 'WEB') {
          displayName = 'Web';
        } else if (upper === 'API') {
          displayName = 'API';
        } else if (upper === 'BO') {
          displayName = 'BO';
        }

        return {
          id: `mg-xml-${instanceName.toLowerCase()}-${app.name.toLowerCase()}`,
          name: displayName,
          location: app.url,
          action: 'open',
          icon: 'public',
          image: '{favicon}',
        };
      });

      items.push({
        id: `mg-xml-${instanceName.toLowerCase()}`,
        name: instanceName,
        location: mainApp.url,
        action: 'open',
        settings: 'magicgate',
        priority: 1,
        icon: 'public',
        image: 'https://magicware.istour.cz/Images/M2G/Desktop/Icon.png',
        sourceId: 'magicgate-xml',
        options: options.length > 0 ? options : undefined,
      });
    }
  }

  return items;
}

/**
 * Safely loads and parses MagicGate XML file from disk.
 */
export function loadMagicGateXml(filePath: string): LauncherItem[] {
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return parseMagicGateXml(raw);
  } catch (err) {
    console.error(`[MagicGateXml] Error loading or parsing XML from "${filePath}":`, err);
    return [];
  }
}
