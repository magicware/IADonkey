export interface VersionEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const CURRENT_APP_VERSION = '0.1.6';

/**
 * Uživatelsky přívětivá historie verzí (ne technický žargon, ale přehled reálných funkcí pro uživatele).
 */
export const CHANGELOG_HISTORY: VersionEntry[] = [
  {
    version: '0.1.6',
    date: '11. 9. 2026',
    title: 'Nativní programy Windows, Google Search a vylepšení UI',
    highlights: [
      'Vyhledávání a spouštění nainstalovaných programů Windows přímo ze Start menu (klasické i UWP/Store aplikace jako Adobe XD, Kalkulačka, Windows Terminal).',
      'Extrakce originálních plnobarevných ikon aplikací v nativním rozlišení (včetně UWP aplikací).',
      'Inteligentní řazení aplikací podle začátku jednotlivých slov (zadáním "XD" se ihned nabídne "Adobe XD").',
      'Integrace Google Search: možnost okamžitého vyhledání dotazu na Google (priorita 100 na konci seznamu) i rychlý prefix google:.',
      'Možnost zapnutí a vypnutí prohledávání programů i Google Search v záložce Obecné.',
      'Sjednocení barvy ikony API zdroje v Nastavení s aktivním motivem aplikace.',
      'Spolehlivá detekce a zobrazení záložky MagicGate i v případě, že se parametr nachází pouze ve vnořených podpoložkách.',
    ],
  },
  {
    version: '0.1.5',
    date: '10. 9. 2026',
    title: 'Integrace MLog, Gmail, nová ikona a vylepšení UI',
    highlights: [
      'Automatické zobrazení vyhledávacího pole (Spotlight) ihned při spuštění aplikace s aktivním textovým kurzorem.',
      'Nová oficiální ikona IADonkey v hlavním panelu Windows (taskbaru), systémovém panelu (tray) i v záhlaví oken.',
      'Integrace helpdesku MLog: rychlé otevírání požadavků (R123) i úkolů (T456) z vyhledávače podle nastavené Base URL v nové záložce MLog.',
      'Integrace Gmailu: zadáním libovolné e-mailové adresy se okamžitě nabídne otevření nového konceptu zprávy v Gmailu s předvyplněným příjemcem.',
      'Čistější rozhraní – odstraněna přebytečná tlačítka, kliknutím na chip s číslem verze se otevře historie změn (Changelog).',
      'Sjednocení šířky záložky MLog na 100 % plochy okna Nastavení.',
    ],
  },
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
 * Zde se průběžně zapisují novinky pro budoucí verzi.
 * Po dokončení denní práce se tato sekce překlopí do nové verze a navýší se číslo.
 */
export const UPCOMING_CHANGELOG: string[] = [];

export function getLatestRelease(): VersionEntry {
  return CHANGELOG_HISTORY[0];
}
