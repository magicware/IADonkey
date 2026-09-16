import { LauncherItem, SnippetsConfig } from '../types';
import { removeDiacritics } from './text';

export type SnippetMathType = 'time' | 'date' | 'datetime' | 'iso';

interface DynamicSnippetDef {
  keys: string[];
  name: string;
  description: string;
  getValue: (d?: Date) => string;
  icon?: string;
  mathType?: SnippetMathType;
  getBaseDate?: () => Date;
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
    getValue: (d) => formatTime(d || new Date()),
    icon: 'schedule',
    mathType: 'time',
  },
  {
    keys: [':today', ':dnes'],
    name: 'Dnešní datum',
    description: 'Dnešní datum (DD. MM. YYYY)',
    getValue: (d) => formatDateCz(d || new Date()),
    icon: 'calendar_today',
    mathType: 'date',
  },
  {
    keys: [':tomorrow', ':zitra', ':zítra'],
    name: 'Zítřejší datum',
    description: 'Zítřejší datum (DD. MM. YYYY)',
    getBaseDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d;
    },
    getValue: (d) => {
      if (d) return formatDateCz(d);
      const now = new Date();
      now.setDate(now.getDate() + 1);
      return formatDateCz(now);
    },
    icon: 'event',
    mathType: 'date',
  },
  {
    keys: [':yesterday', ':vcera', ':včera'],
    name: 'Včerejší datum',
    description: 'Včerejší datum (DD. MM. YYYY)',
    getBaseDate: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d;
    },
    getValue: (d) => {
      if (d) return formatDateCz(d);
      const now = new Date();
      now.setDate(now.getDate() - 1);
      return formatDateCz(now);
    },
    icon: 'history',
    mathType: 'date',
  },
  {
    keys: [':datetime', ':now-full'],
    name: 'Aktuální datum a čas',
    description: 'Kompletní datum a čas',
    getValue: (d) => {
      const target = d || new Date();
      return `${formatDateCz(target)} ${formatTime(target)}`;
    },
    icon: 'timer',
    mathType: 'datetime',
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
    getValue: (d) => (d || new Date()).toISOString().slice(0, 10),
    icon: 'date_range',
    mathType: 'iso',
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

interface MathResult {
  date: Date;
  appliedModifiers: string[];
  isValid: boolean;
}

/**
 * Parses and applies arithmetic operations like +3H, +30s, +1d, +1M, +2y to a base Date.
 */
function applyDateMath(baseDate: Date, modifierStr: string, mathType: SnippetMathType): MathResult {
  const targetDate = new Date(baseDate.getTime());
  const regex = /([+-])\s*(\d+)\s*([a-zA-Z]+)/g;
  let match: RegExpExecArray | null;
  const applied: string[] = [];
  let foundAny = false;

  while ((match = regex.exec(modifierStr)) !== null) {
    foundAny = true;
    const sign = match[1] === '-' ? -1 : 1;
    const num = parseInt(match[2], 10) * sign;
    const unitRaw = match[3];

    let unit = unitRaw;
    // In date or iso snippets, treat 'm' or 'M' as months
    if ((mathType === 'date' || mathType === 'iso') && (unitRaw === 'm' || unitRaw === 'M')) {
      unit = 'M';
    } else if (mathType === 'time' && (unitRaw === 'm' || unitRaw === 'M')) {
      // In time snippets, treat 'm' or 'M' as minutes
      unit = 'm';
    }

    if (unit === 'h' || unit === 'H') {
      if (mathType === 'date' || mathType === 'iso') {
        return { date: targetDate, appliedModifiers: applied, isValid: false };
      }
      targetDate.setHours(targetDate.getHours() + num);
      applied.push(`${sign > 0 ? '+' : ''}${num}H`);
    } else if (unit === 'm') {
      if (mathType === 'date' || mathType === 'iso') {
        return { date: targetDate, appliedModifiers: applied, isValid: false };
      }
      targetDate.setMinutes(targetDate.getMinutes() + num);
      applied.push(`${sign > 0 ? '+' : ''}${num}m`);
    } else if (unit === 's') {
      if (mathType === 'date' || mathType === 'iso') {
        return { date: targetDate, appliedModifiers: applied, isValid: false };
      }
      targetDate.setSeconds(targetDate.getSeconds() + num);
      applied.push(`${sign > 0 ? '+' : ''}${num}s`);
    } else if (unit === 'd' || unit === 'D') {
      if (mathType === 'time') {
        return { date: targetDate, appliedModifiers: applied, isValid: false };
      }
      targetDate.setDate(targetDate.getDate() + num);
      applied.push(`${sign > 0 ? '+' : ''}${num}d`);
    } else if (unit === 'M') {
      if (mathType === 'time') {
        return { date: targetDate, appliedModifiers: applied, isValid: false };
      }
      targetDate.setMonth(targetDate.getMonth() + num);
      applied.push(`${sign > 0 ? '+' : ''}${num}M`);
    } else if (unit === 'y' || unit === 'Y') {
      if (mathType === 'time') {
        return { date: targetDate, appliedModifiers: applied, isValid: false };
      }
      targetDate.setFullYear(targetDate.getFullYear() + num);
      applied.push(`${sign > 0 ? '+' : ''}${num}y`);
    } else {
      return { date: targetDate, appliedModifiers: applied, isValid: false };
    }
  }

  return { date: targetDate, appliedModifiers: applied, isValid: foundAny };
}

export function getDynamicSnippets(query: string, customSnippets?: SnippetsConfig): LauncherItem[] {
  const trimmed = query.trim();
  if (!trimmed.startsWith(':')) {
    return [];
  }

  const allDefs: DynamicSnippetDef[] = [...SNIPPET_DEFS];

  // Corporate & variable snippets from settings
  const sigText = customSnippets?.signature?.trim();
  allDefs.unshift({
    keys: [':podpis', ':sign', ':signature'],
    name: 'Můj Podpis',
    description: sigText ? 'Váš podpis z nastavení' : 'Zatím není nastaven v Nastavení (Snippety)',
    getValue: () => customSnippets?.signature || '',
    icon: 'draw',
  });

  const nameText = customSnippets?.name?.trim();
  allDefs.unshift({
    keys: [':jmeno', ':jméno', ':name'],
    name: 'Moje Jméno',
    description: nameText ? nameText : 'Zatím není nastaveno v Nastavení (Snippety)',
    getValue: () => customSnippets?.name || '',
    icon: 'person',
  });

  const icoText = customSnippets?.ico?.trim();
  allDefs.unshift({
    keys: [':ico', ':ičo'],
    name: 'Moje IČO',
    description: icoText ? `IČO: ${icoText}` : 'Zatím není nastaveno v Nastavení (Snippety)',
    getValue: () => customSnippets?.ico || '',
    icon: 'badge',
  });

  const dicText = customSnippets?.dic?.trim();
  allDefs.unshift({
    keys: [':dic', ':dič', ':vat'],
    name: 'Moje DIČ',
    description: dicText ? `DIČ: ${dicText}` : 'Zatím není nastaveno v Nastavení (Snippety)',
    getValue: () => customSnippets?.dic || '',
    icon: 'receipt_long',
  });

  const addressText = customSnippets?.address?.trim();
  allDefs.unshift({
    keys: [':adresa', ':address'],
    name: 'Moje Adresa',
    description: addressText ? addressText : 'Zatím není nastaveno v Nastavení (Snippety)',
    getValue: () => customSnippets?.address || '',
    icon: 'home_pin',
  });

  const phoneText = customSnippets?.phone?.trim();
  allDefs.unshift({
    keys: [':telefon', ':tel', ':phone'],
    name: 'Můj Telefon',
    description: phoneText ? phoneText : 'Zatím není nastaveno v Nastavení (Snippety)',
    getValue: () => customSnippets?.phone || '',
    icon: 'call',
  });

  const emailText = customSnippets?.email?.trim();
  allDefs.unshift({
    keys: [':email', ':mail', ':e-mail'],
    name: 'Můj E-mail',
    description: emailText ? emailText : 'Zatím není nastaveno v Nastavení (Snippety)',
    getValue: () => customSnippets?.email || '',
    icon: 'mail',
  });

  // User custom snippets from settings
  if (customSnippets?.custom && Array.isArray(customSnippets.custom)) {
    for (const cs of customSnippets.custom) {
      if (!cs) continue;
      const rawName = (cs.name || '').trim();
      const rawLoc = cs.location || '';
      if (!rawName && !rawLoc) continue;

      const keys = (cs.shortcuts || [])
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => (s.startsWith(':') ? s : `:${s}`));

      const effectiveKeys = keys.length > 0
        ? keys
        : [rawName ? (rawName.startsWith(':') ? rawName : `:${rawName}`) : ':snippet'];

      allDefs.unshift({
        keys: effectiveKeys,
        name: rawName || effectiveKeys[0],
        description: rawLoc ? (rawLoc.length > 60 ? `${rawLoc.slice(0, 60)}...` : rawLoc) : '',
        getValue: () => rawLoc,
        icon: cs.icon || 'draw',
      });
    }
  }

  // Check if query contains math operators (+ or - after snippet key)
  const mathMatch = /^(:[a-zA-Zá-žÁ-Ž0-9_-]+)([\s+\-].*)$/.exec(trimmed);
  if (mathMatch) {
    const baseKey = mathMatch[1].toLowerCase();
    const modifierStr = mathMatch[2].trim();

    // Find snippet definition matching baseKey
    const matchingDef = allDefs.find((def) =>
      def.keys.some((k) => k.toLowerCase() === baseKey)
    );

    if (matchingDef && matchingDef.mathType) {
      const baseDate = matchingDef.getBaseDate ? matchingDef.getBaseDate() : new Date();
      const mathResult = applyDateMath(baseDate, modifierStr, matchingDef.mathType);

      if (mathResult.isValid) {
        const calculatedVal = matchingDef.getValue(mathResult.date);
        const modSummary = mathResult.appliedModifiers.join(' ');
        return [
          {
            id: `snippet-math-${baseKey.replace(':', '')}`,
            name: `${matchingDef.name} (${modSummary})`,
            location: calculatedVal,
            action: 'copy',
            icon: matchingDef.icon || 'calculate',
            priority: 0,
            sourceId: 'snippet',
            shortcuts: [`${baseKey}${modSummary.replace(/\s+/g, '')}`],
          },
        ];
      } else if (modifierStr.endsWith('+') || modifierStr.endsWith('-')) {
        // Helpful typing hint
        const currentVal = matchingDef.getValue(baseDate);
        return [
          {
            id: `snippet-math-hint-${baseKey.replace(':', '')}`,
            name: `${matchingDef.name} (${modifierStr}...)`,
            location: currentVal,
            action: 'copy',
            icon: matchingDef.icon || 'calculate',
            priority: 0,
            sourceId: 'snippet',
            shortcuts: [baseKey],
          },
        ];
      }
    }
  }

  // Standard filtering without math
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
