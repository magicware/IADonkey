import type { LauncherItem } from '../types';

/**
 * Detects Taskmanager requirement or task based on configured prefixes (default: R<number> and T<number>)
 * and constructs direct URL if baseUrl is configured.
 *
 * Example matches:
 * - "R234" -> "{baseUrl}/R234"
 * - "r2345" -> "{baseUrl}/R2345"
 * - "T7821" -> "{baseUrl}/T7821"
 * - "t 7821" -> "{baseUrl}/T7821"
 */
export function detectMlogTicket(
  query: string,
  baseUrl?: string,
  taskPrefix: string = 'T',
  reqPrefix: string = 'R'
): LauncherItem | null {
  if (!baseUrl || typeof baseUrl !== 'string') return null;
  const cleanBase = baseUrl.trim().replace(/\/+$/, '');
  if (!cleanBase) return null;

  const tPref = (taskPrefix || 'T').trim();
  const rPref = (reqPrefix || 'R').trim();

  // Escape special regex characters in prefixes
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tEsc = escapeRegex(tPref);
  const rEsc = escapeRegex(rPref);

  const trimmed = query.trim();
  const regex = new RegExp(`^(${tEsc}|${rEsc})\\s*(\\d+)$`, 'i');
  const match = trimmed.match(regex);
  if (!match) return null;

  const matchedPrefix = match[1];
  const id = match[2];
  const isTask = matchedPrefix.toUpperCase() === tPref.toUpperCase();
  const canonicalPrefix = isTask ? tPref.toUpperCase() : rPref.toUpperCase();
  const ticketCode = `${canonicalPrefix}${id}`;
  const targetUrl = `${cleanBase}/${ticketCode}`;

  const label = isTask
    ? `Otevřít úkol ${ticketCode} v Taskmanageru`
    : `Otevřít požadavek ${ticketCode} v Taskmanageru`;

  return {
    id: `taskmanager-${ticketCode}`,
    name: label,
    location: targetUrl,
    action: 'open',
    icon: 'support_agent',
    image: null,
    priority: -2,
    settings: null,
  };
}
