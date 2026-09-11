import { LauncherItem } from '../types';
import { removeDiacritics } from './text';

interface DynamicSnippetDef {
  keys: string[];
  name: string;
  description: string;
  getValue: () => string;
  icon?: string;
}

function formatDateCz(d: Date): string {
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SNIPPET_DEFS: DynamicSnippetDef[] = [
  {
    keys: [':now', ':cas', ':čas', ':time'],
    name: 'Aktuální čas',
    description: 'Aktuální systémový čas (HH:mm:ss)',
    getValue: () => formatTime(new Date()),
    icon: 'schedule',
  },
  {
    keys: [':today', ':dnes'],
    name: 'Dnešní datum',
    description: 'Dnešní datum (DD. MM. YYYY)',
    getValue: () => formatDateCz(new Date()),
    icon: 'calendar_today',
  },
  {
    keys: [':tomorrow', ':zitra', ':zítra'],
    name: 'Zítřejší datum',
    description: 'Zítřejší datum (DD. MM. YYYY)',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return formatDateCz(d);
    },
    icon: 'event',
  },
  {
    keys: [':yesterday', ':vcera', ':včera'],
    name: 'Včerejší datum',
    description: 'Včerejší datum (DD. MM. YYYY)',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return formatDateCz(d);
    },
    icon: 'history',
  },
  {
    keys: [':datetime', ':now-full'],
    name: 'Aktuální datum a čas',
    description: 'Kompletní datum a čas',
    getValue: () => {
      const d = new Date();
      return `${formatDateCz(d)} ${formatTime(d)}`;
    },
    icon: 'timer',
  },
  {
    keys: [':guid', ':uuid'],
    name: 'Náhodné GUID / UUID',
    description: 'Nový náhodný identifikátor v4',
    getValue: () => generateUUID(),
    icon: 'fingerprint',
  },
  {
    keys: [':iso', ':date-iso'],
    name: 'Datum ISO',
    description: 'Datum ve formátu ISO (YYYY-MM-DD)',
    getValue: () => new Date().toISOString().slice(0, 10),
    icon: 'date_range',
  },
  {
    keys: [':year', ':rok'],
    name: 'Aktuální rok',
    description: 'Aktuální kalendářní rok',
    getValue: () => String(new Date().getFullYear()),
    icon: 'calendar_month',
  },
  {
    keys: [':timestamp'],
    name: 'Unix Timestamp',
    description: 'Unix timestamp v milisekundách',
    getValue: () => String(Date.now()),
    icon: 'tag',
  },
];

export function getDynamicSnippets(query: string, customSnippets?: { signature?: string }): LauncherItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed.startsWith(':')) {
    return [];
  }

  const allDefs: DynamicSnippetDef[] = [...SNIPPET_DEFS];

  // Signature snippet from user settings
  const sigText = customSnippets?.signature?.trim();
  allDefs.unshift({
    keys: [':podpis', ':sign', ':signature'],
    name: 'Osobní podpis',
    description: sigText ? 'Váš podpis z nastavení' : 'Podpis zatím není nastaven v Nastavení (Obecné)',
    getValue: () => customSnippets?.signature || '',
    icon: 'draw',
  });

  // If query is just ":", show all available snippets
  const filterKey = trimmed.slice(1).trim(); // text after colon

  const normFilter = removeDiacritics(filterKey.toLowerCase());

  const matched = filterKey.length === 0
    ? allDefs
    : allDefs.filter((def) => {
        const matchesKey = def.keys.some((k) => {
          const normKey = removeDiacritics(k.toLowerCase().replace(/^:/, ''));
          return normKey.includes(normFilter);
        });
        const matchesName = removeDiacritics(def.name.toLowerCase()).includes(normFilter);
        const matchesDesc = removeDiacritics(def.description.toLowerCase()).includes(normFilter);
        return matchesKey || matchesName || matchesDesc;
      });

  return matched.map((def) => {
    const val = def.getValue();
    return {
      id: `snippet-${def.keys[0].replace(':', '')}`,
      name: def.name,
      location: val,
      action: 'copy',
      icon: def.icon || 'content_copy',
      priority: 0,
      sourceId: 'snippet',
      shortcuts: def.keys,
    };
  });
}
