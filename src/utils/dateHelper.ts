const MONTHS_GENITIVE = [
  'ledna',
  'února',
  'března',
  'dubna',
  'května',
  'června',
  'července',
  'srpna',
  'září',
  'října',
  'listopadu',
  'prosince',
];

export function parseSyncDate(val?: string | null): Date | null {
  if (!val) return null;
  if (typeof val !== 'string') return new Date(val);

  // 1. ISO string with hyphen YYYY-MM-DD
  if (val.includes('-')) {
    const p = new Date(val);
    if (!isNaN(p.getTime())) return p;
  }

  // 2. Czech format: '11. 09. 2026 11:30:54' or '11.09.2026, 11:30:54'
  const czNumeric = val.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (czNumeric) {
    const [, d, m, y, h, min, s] = czNumeric;
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s || 0));
    if (!isNaN(date.getTime())) return date;
  }

  // 3. Czech format with month word: '5. května 2025 11:24:24' or '5. května 11:24:24'
  const czWord = val.match(/^(\d{1,2})\.\s*([a-záčďéěíňóřšťúůýž]+)(?:\s+(\d{4}))?[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/i);
  if (czWord) {
    const [, d, mName, y, h, min, s] = czWord;
    const monthIdx = MONTHS_GENITIVE.findIndex(m => m.toLowerCase() === mName.toLowerCase());
    if (monthIdx !== -1) {
      const year = y ? Number(y) : new Date().getFullYear();
      const date = new Date(year, monthIdx, Number(d), Number(h), Number(min), Number(s || 0));
      if (!isNaN(date.getTime())) return date;
    }
  }

  const fallback = new Date(val);
  if (!isNaN(fallback.getTime())) return fallback;
  return null;
}

/**
 * Formats last synchronization date and time:
 * - If current year == sync year: "5. května 11:24:24"
 * - If different year: "5. května 2025 11:24:24"
 */
export function formatLastSyncDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = parseSyncDate(dateStr);
  if (!date) return dateStr;

  const currentYear = new Date().getFullYear();
  const syncYear = date.getFullYear();
  const day = date.getDate();
  const monthName = MONTHS_GENITIVE[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}:${seconds}`;

  if (syncYear === currentYear) {
    return `${day}. ${monthName} ${timeStr}`;
  } else {
    return `${day}. ${monthName} ${syncYear} ${timeStr}`;
  }
}
