import type { LauncherItem } from '../types';

/**
 * Detects MLog requirement (R<number>) or task (T<number>)
 * and constructs direct URL if baseUrl is configured.
 *
 * Example matches:
 * - "R234" -> "{baseUrl}/R234"
 * - "r2345" -> "{baseUrl}/R2345"
 * - "T7821" -> "{baseUrl}/T7821"
 * - "t 7821" -> "{baseUrl}/T7821"
 */
export function detectMlogTicket(query: string, baseUrl?: string): LauncherItem | null {
  if (!baseUrl || typeof baseUrl !== 'string') return null;
  const cleanBase = baseUrl.trim().replace(/\/+$/, '');
  if (!cleanBase) return null;

  const trimmed = query.trim();
  const match = trimmed.match(/^[rRtT]\s*(\d+)$/);
  if (!match) return null;

  const prefix = trimmed[0].toUpperCase();
  const id = match[1];
  const ticketCode = `${prefix}${id}`;
  const targetUrl = `${cleanBase}/${ticketCode}`;

  const isTask = prefix === 'T';
  const label = isTask
    ? `Otevřít úkol ${ticketCode} v MLogu`
    : `Otevřít požadavek ${ticketCode} v MLogu`;

  return {
    id: `mlog-${ticketCode}`,
    name: label,
    location: targetUrl,
    action: 'open',
    icon: 'support_agent',
    image: null,
    priority: -2,
    settings: null,
  };
}
