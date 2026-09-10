import type { LauncherItem } from '../types';

/**
 * Checks if query looks like a valid URL or web domain.
 * Examples: 'brenna.istour.cz', 'www.brenna.cz', 'https://google.com', 'localhost:8080'
 */
export function detectUrl(query: string): LauncherItem | null {
  const trimmed = query.trim();
  if (trimmed.length < 3) return null;

  // Explicit URL with protocol
  if (/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed)) {
    return {
      id: 'url-match',
      name: trimmed,
      location: trimmed,
      action: 'open',
      icon: 'public',
      image: null,
      priority: 999,
      settings: null,
    };
  }

  // Domain with TLD like brenna.istour.cz, www.brenna.cz, sez.nam.cz, etc.
  const domainPattern = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d+)?(?:\/[^\s]*)?$/;
  if (domainPattern.test(trimmed)) {
    const fullUrl = `https://${trimmed}`;
    return {
      id: 'url-match',
      name: `Otevřít ${trimmed}`,
      location: fullUrl,
      action: 'open',
      icon: 'public',
      image: null,
      priority: 999,
      settings: null,
    };
  }

  // Localhost or IP address with port
  if (/^(localhost|127\.0\.0\.1)(?::\d+)(?:\/[^\s]*)?$/i.test(trimmed)) {
    const fullUrl = `http://${trimmed}`;
    return {
      id: 'url-match',
      name: `Otevřít ${trimmed}`,
      location: fullUrl,
      action: 'open',
      icon: 'public',
      image: null,
      priority: 999,
      settings: null,
    };
  }

  return null;
}
