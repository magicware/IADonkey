/**
 * Strips diacritical marks (accents) from a string and returns clean ASCII-equivalent representation.
 * e.g. "Příkazový řádek" -> "Prikazovy radek"
 */
export function removeDiacritics(str?: string | null): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
