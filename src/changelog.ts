export interface VersionEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const CURRENT_APP_VERSION = '0.1.2';

/**
 * Uživatelsky přívětivá historie verzí (ne technický žargon, ale přehled reálných funkcí pro uživatele).
 */
export const CHANGELOG_HISTORY: VersionEntry[] = [
  {
    version: '0.1.2',
    date: '10. 9. 2026',
    title: 'Automatické aktualizace a distribuce',
    highlights: [
      'Integrovaná kontrola nových verzí aplikace přes GitHub s automatickým stažením aktualizace.',
      'Přehledné okno s novinkami zobrazené po prvním spuštění po aktualizaci.',
      'Plně automatizovaný systém přípravy a vydávání nových verzí.',
    ],
  },
  {
    version: '0.1.1',
    date: '10. 9. 2026',
    title: 'Vlastní barvy, bezpečné zkratky a správa zdrojů',
    highlights: [
      'Možnost volby vlastní barvy aplikace v nastavení (včetně hex kódu i rychlých paletek) s živým náhledem bez nutnosti restartu.',
      'Bezpečné nahrávání klávesové zkratky – vyžadována minimálně dvojkombinace kláves, ochrana proti nechtěnému stisku jediné klávesy.',
      'Dočasné pozastavení původní zkratky během editace pole v nastavení (nedochází k nechtěnému otevření launcheru).',
      'Nové přehledné ikony pro lokální JSON soubory a tlačítko přidání souboru v nastavení.',
      'Bleskový start okna nastavení bez problikávání výchozích barev (okamžitá aplikace uživatelského motivu).',
      'Přehledná historie verzí a zobrazení novinek po aktualizaci.',
    ],
  },
  {
    version: '0.1.0',
    date: '8. 9. 2026',
    title: 'První verze launcheru IADonkey',
    highlights: [
      'Rychlé vyhledávání a spouštění aplikací, webových adres a záložek.',
      'Globální vyvolání launcheru pomocí konfigurovatelné klávesové zkratky.',
      'Import dat z lokálních JSON souborů na disku a externích API endpointů.',
      'Podpora pro tichý a bezpečný login do MagicGate (systémy IS Tour).',
      'Podpora pro vnořené podpoložky (Shift+Enter pro rozbalení, Ctrl+Enter pro rychlé spuštění první volby).',
      'Integrovaná chytrá kalkulačka a přímé otevírání URL adres.',
      'Automatická synchronizace dat na pozadí s přehledným ukazatelem průběhu.',
    ],
  },
];

/**
 * Zde se průběžně zapisují novinky pro budoucí verzi (připravuje se pro 0.1.2).
 * Po dokončení denní práce se tato sekce překlopí do nové verze a navýší se číslo.
 */
export const UPCOMING_CHANGELOG: string[] = [
  'Nová oficiální ikona aplikace v hlavním panelu Windows i záhlaví oken (nahrazena výchozí ikona Electronu).',
  'Integrace helpdesku MLog: rychlé otevírání požadavků (R123) i úkolů (T456) přímo z vyhledávače podle nastavené Base URL v nové záložce MLog.',
  'Integrace Gmailu: zadáním libovolné e-mailové adresy se okamžitě nabídne otevření nového konceptu zprávy v Gmailu.',
  'Pohodlné stahování aktualizací přímo uvnitř aplikace (In-App updater) s ukazatelem průběhu stahování a automatickým restartem do nové verze.',
];

export function getLatestRelease(): VersionEntry {
  return CHANGELOG_HISTORY[0];
}
