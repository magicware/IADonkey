export interface VersionEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const CURRENT_APP_VERSION = '1.0.1';

/**
 * Uživatelsky přívětivá historie verzí (ne technický žargon, ale přehled reálných funkcí pro uživatele).
 */
export const CHANGELOG_HISTORY: VersionEntry[] = [
  {
    version: '1.0.1',
    date: '11. 9. 2026',
    title: 'Kompletní seznam položek, vyhledávání bez diakritiky a MagicGate XML',
    highlights: [
      'Nový Kompletní seznam v nastavení: přehledné modální okno zobrazující všechny indexované položky seřazené prioritně (shodně se Spotlightem) s filtry a počítadly.',
      'Plná podpora vyhledávání bez diakritiky: psaní s háčky i bez nich (např. "prik" spolehlivě najde "Příkazový řádek") s prioritním řazením podle začátků slov.',
      'Import serverové konfigurace MagicGate z deploy XML souboru (včetně instancí a dílčích aplikací Administrace, Web, API, BO).',
      'Globální podpora zástupného symbolu {favicon} pro položky i podpoložky s automatickým stahováním a mezipamětí.',
      'Integrace vyhledávače Centrum.cz s rychlými prefixy c: a centrum:.',
      'Systémové textové snippety s prefixem : (datum, čas, guid, rok, podpis), prioritou 0 a tyrkysovými čipy zkratek.',
      'Vizuální sjednocení velikosti a perfektní vycentrování ikon v seznamu položek.',
      'Automatické obnovení fokusu vyhledávacího pole po zavření okna nastavení.',
    ],
  },
  {
    version: '0.1.7',
    date: '11. 9. 2026',
    title: 'Samostatné aktualizace, detekce a mapování JSON zdrojů',
    highlights: [
      'Samostatná záložka Aktualizace v nastavení s možností ruční kontroly nových verzí a zobrazením historie změn.',
      'Inteligentní detekce struktury JSON: automatické načtení struktury a mapování vlastních polí (název, odkaz, ikona, priorita apod.) na libovolné klíče JSONu.',
      'Možnost zadání fixní hodnoty pro všechny položky zdroje (např. jednotná ikona pro celý importovaný zdroj) s živým náhledem prvního záznamu.',
      'Rychlé kopírování URL adresy API endpointů do schránky jedním kliknutím v seznamu zdrojů.',
      'Nové přehledné zobrazení a formátování času poslední synchronizace v českém genitivu (např. 5. května 11:24:24) se zarovnáním v levém menu.',
      'Okamžité automatické ukládání všech změn v nastavení bez nutnosti potvrzovacího tlačítka v patičce.',
      'Vizuální zjemnění přepínačů, odstranění duplicitních nadpisů a optimalizace rozložení okna nastavení.',
    ],
  },
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
