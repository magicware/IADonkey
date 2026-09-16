export interface VersionEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const CURRENT_APP_VERSION = '1.1.10';

/**
 * Uživatelsky přívětivá historie verzí (ne technický žargon, ale přehled reálných funkcí pro uživatele).
 */
export const CHANGELOG_HISTORY: VersionEntry[] = [
  {
    version: '1.1.10',
    date: '16. 9. 2026',
    title: '100% tichý restart po aktualizaci a nový Startup Splash Screen',
    highlights: [
      '100% tichý In-App restart bez probliknutí okna příkazové řádky: spuštění výměnného skriptu nově obstarává Windows Script Host (wscript.exe / .vbs) v GUI subsystému s příznakem SW_HIDE. Při restartu po aktualizaci již nikdy nedojde k alokaci ani probliknutí černé konzole cmd.exe.',
      'Nový Startup Splash Screen: při spuštění aplikace (i po dokončení aktualizace) se zobrazí kompaktní elegantní mini-okno ve stylu IADonkey s oficiální ikonou maskota, verzí programu a indikátorem průběhu startu.',
      'Živá indikace fází spouštění: plynulý indigovo-fialový progress bar a stavový text informují o fázích inicializace (načítání konfigurace, registrace klávesové zkratky Ctrl+Alt+Space, start služeb a připravenost v oznamovací oblasti).',
      'Plynulé skrytí do oznamovací oblasti: po dokončení inicializace mini-okno automaticky a plynule zmizí, přičemž aplikace běží připravena v tray liště pro okamžité vyvolání.',
      'Chytré potlačení na pozadí: při automatickém startu se systémem Windows v tichém režimu (--background, --silent) se splash okno nezobrazuje.',
    ],
  },
  {
    version: '1.1.9',
    date: '16. 9. 2026',
    title: 'Full-Width layout instalačního průvodce a spolehlivá instalace',
    highlights: [
      'Full-Width moderní layout instalátoru: hlavička i patička nového instalátoru jsou roztaženy přes celou šířku okna pro čistý, prémiový a vzdušný vzhled.',
      'Miniatura loga IADonkey v záhlaví: do horní lišty instalátoru byla doplněna miniatura oficiálního maskota IADonkey.',
      'Přesun odznaku instalace bez UAC: odznak „Instalace bez UAC práv“ byl přesunut z bočního panelu do levé části globální patičky okna.',
      'Bezpečné zamykání asar archivu: vyřešeno zamykání souboru resources/app.asar při instalaci náhradou monkey-patched fs za original-fs.',
      'Atomický rename-swap a bezpečné ukončení instancí: pokročilé filtrování běžících instancí zabraňuje nechtěnému pádu instalátoru.',
    ],
  },
  {
    version: '1.1.8',
    date: '16. 9. 2026',
    title: 'Vyladěný design instalátoru a oprava stability instalace',
    highlights: [
      'Větší a prostornější okno instalátoru: šířka zvětšena na 860 px a výška na 580 px pro optimální čitelnost a vzdušnost.',
      'Oficiální ikona IADonkey: v záhlaví instalátoru je umístěno oficiální logo aplikace IADonkey namísto obecné rakety.',
      'Čistý design kroků bez rušivých prvků: odstraněna vertikální propojovací čára a záře (glow) kolem aktivního kroku. Zvýšeno vertikální odsazení mezi jednotlivými kroky.',
      'Větší a lépe čitelná typografie: zvětšeny fonty názvů a popisů kroků v postranním panelu, texty informačních bublin i popisky možností instalace.',
      'Oprava pádu v kroku 3 (Instalace): vyřešeno ukončování procesů, které v předchozí verzi nechtěně zasáhlo renderer instalátoru. Instalace nyní probíhá zcela plynule od 0 do 100 %.',
    ],
  },
  {
    version: '1.1.7',
    date: '16. 9. 2026',
    title: 'Moderní 4-krokový instalátor a blesková In-App aktualizace bez prodlevy',
    highlights: [
      'Samostatný moderní instalátor (React + Tailwind): kompletní opuštění zastaralého NSIS. Nový instalátor je plnohodnotné tmavé frameless okno ve stylu aplikace s vlastním záhlavím, ikonou s fialovou září a 4 přehlednými kroky (Vítejte → Nastavení složky a zástupců → Průběh instalace → Dokončeno se zaškrtávacím polem Spustit program).',
      'Plná integrace do Windows: instalátor vytváří zástupce na Ploše a v nabídce Start přes Windows Script Host a registruje aplikaci do systémového Nastavení Windows (Přidat nebo odebrat programy) včetně čisté odinstalace.',
      'Blesková In-App aktualizace (0.5s swap): stažení i rozbalení aktualizace probíhá přímo v okně aplikace s živým tmavým progress barem a zobrazením fází. Samotná výměna souborů při restartu trvá pouze 0,5 sekundy díky okamžitému swapu – uživatel již nikdy nečeká do prázdna ani nevidí žádná bílá okna.',
      'Moderní odinstalátor: při odinstalaci přes systémové Nastavení se otevře moderní potvrzovací okno s čistým odebráním všech součástí a zástupců.',
    ],
  },
  {
    version: '1.1.6',
    date: '16. 9. 2026',
    title: '100% tichý instalátor bez systémových oken a okamžitý start aplikace',
    highlights: [
      'Úplné potlačení systémového dialogu instalátoru: instalátor má přímo ve svém jádře natvrdo nastaven tichý režim (SilentInstall silent). Ani při ručním spuštění poklepáním v Průzkumníku Windows se již nikdy nezobrazí žádné bílé systémové okno s nápisem „Instaluje se, prosím vyčkejte...“ ani zelený proužek.',
      'Okamžitý a plynulý start aplikace: po bleskovém rozbalení souborů na pozadí (cca 1 sekunda) je aplikace okamžitě spuštěna v moderním tmavém rozhraní.',
      'Bezpečné volání z aplikace: vyřešena kompatibilita při aktualizaci ze starších verzí – i pokud starší verze nespustí balíček s tichým parametrem, instalátor sám ví, že má běžet tiše a bez zobrazení oken.',
    ],
  },
  {
    version: '1.1.5',
    date: '16. 9. 2026',
    title: 'Tichá aktualizace na pozadí a moderní 1-Click instalátor bez zastaralých Win32 oken',
    highlights: [
      'Tichá aktualizace na pozadí (Silent Background Update): při kliknutí na „Restartovat a spustit novou verzi“ proběhne instalace nového sestavení během 1–2 sekund zcela tiše a neviditelně na pozadí bez jakýchkoliv systémových dialogů.',
      'Automatické spuštění nové verze: instalátor po dokončení tichého přepisu souborů aplikaci okamžitě a automaticky znovu spustí.',
      'Přechod na moderní 1-Click instalátor (oneClick): při ručním spuštění staženého instalátoru se již nezobrazuje zastaralý vícekrokový Win32 průvodce s bílými rámy a systémovými tlačítky; aplikace se nainstaluje na jedno kliknutí a ihned otevře.',
      'Čistý uživatelský zážitek: veškeré novinky a vizuální prezentace verze probíhají přímo v aplikaci IADonkey (WhatsNewModal a Spotlight) v plnohodnotném tmavém motivu.',
    ],
  },
  {
    version: '1.1.4',
    date: '16. 9. 2026',
    title: 'Kompletní vizuální redesign instalátoru Windows (NSIS) do tmavého motivu',
    highlights: [
      'Vizuální redesign instalačního průvodce Windows (NSIS): okno instalátoru nyní plně odpovídá modernímu temnému stylu aplikace IADonkey a okna Nastavení (#1E1E28).',
      'Bezešvé bitmapové podklady: uvítací i dokončovací levý panel (sidebar) a záhlaví (header) mají podklad #1E1E28, díky čemuž dokonale a plynule splývají s plochou okna bez jakýchkoliv rušivých švů.',
      'Zaoblená karta s ikonou a ambientní záře: na bočním panelu i v záhlaví je ikona IADonkey zasazena do elegantní zaoblené karty s měkkou indigo září (#6366F1) a akcentním žebrem.',
      'Tmavé ladění dialogů a ovládacích prvků: výběr cílové složky i ukazatel průběhu instalace jsou stylizovány do tmavého motivu s indigo progress barem.',
      'Odstranění rušivých dělících linek: skryty klasické šedé horizontální linky a sjednocen vzhled klientské plochy i brandingového textu.',
    ],
  },
  {
    version: '1.1.3',
    date: '16. 9. 2026',
    title: 'Vlastní snippety, import/export, katalog Material Symbols, plynulá synchronizace a vyladění UI',
    highlights: [
      'Nová záložka Snippety v Nastavení: přehledná centrální správa textových zkratek s rozdělením na Vlastní snippety a Předdefinované osobní údaje.',
      'Vlastní snippety: možnost vytvářet libovolné textové šablony s výběrem ikony z Material Symbols, víceřádkovým textem pro rychlé zkopírování do schránky a flexibilními zkratkami (:zkratka) přes štítky.',
      'Export a import vlastních snippetů: možnost zálohovat i nahrát snippety v přenosném formátu JSON přímo z nového panelu akcí bez závislosti na externích souborech.',
      'Nové předdefinované osobní údaje: přidána pole Moje Jméno (:jmeno), Moje DIČ (:dic) a Můj E-mail (:email) se sjednoceným názvoslovím v Nastavení i Spotlightu.',
      'Vylepšený katalog Material Symbols: nová komponenta IconPickerInput pro pohodlný výběr ikon ve všech formulářích s inteligentním relevančním vyhledáváním a deduplikací.',
      'Správa online katalogu ikon přesunuta na konec záložky Zdroje dat do nové sekce Externí nástroje se sjednoceným vizuálním stylem.',
      'Plynulý stav synchronizace ve Zdrojích dat s minimální dobou trvání 2 sekundy a živým progress barem namísto náhlého probliknutí.',
      'Podpora číselných dotazů MLogu již od 3 číslic (např. 123 nabídne T123 a R123).',
      'Podpora elementů <Alias> v konfiguraci MagicGate XML se stejnými možnostmi a funkcemi jako <App>.',
      'Tlačítka „Procházet...“ nyní otevírají souborový průzkumník přímo ve stávající zadané cestě nebo její nadřazené složce.',
      'Podpoložky (Alt+Enter) ve Spotlightu se nyní vždy vykreslují ve vybrané primární barvě motivu z Nastavení, z rozšíření se přebírá pouze štítek.',
      'Ochrana před kolizí globální zkratky s rezervovanými klávesovými zkratkami aplikace.',
      'Automatické resetování posuvníku na začátek při přepínání záložek v Nastavení.',
      'Kompaktní tlačítka automatické detekce cest (VS Code a Android Studio) s ikonou hvězdiček.',
      'Odstranění duplicitního zápatí v menu Nastavení pro čistší rozvržení okna.',
      'Zpřesnění výpočtu a zobrazení součtu disjunktních položek v Kompletním seznamu a ve Zdrojích dat.',
    ],
  },
  {
    version: '1.1.2',
    date: '15. 9. 2026',
    title: 'Rozšíření Android Studio, vylepšení MLog číselných dotazů, editor statických dat a vyladění UI',
    highlights: [
      'Nové rozšíření Android Studio: podpora pro vývojové prostředí Android Studio s vyhrazenou růžovou identitou a možností automatické detekce nebo ruční volby cesty ke studio64.exe.',
      'Inteligentní volba vývojového editoru: aplikace nabízí buď VS Code, nebo Android Studio – nikdy ne obojí současně. Pro repozitáře s jazykem Kotlin nebo Java se automaticky nabízí Android Studio, pro webové projekty a MagicGate se vždy nabízí VS Code.',
      'Přímé otevření v Android Studiu z nabídky akcí (Shift+Enter) i z okna klonování repozitářů.',
      'Číselné dotazy pro MLog na 4 a více číslic (např. 2111): automatické zobrazení úkolu T (T2111) na 1. místě a požadavku R (R2111) na 2. místě včetně přepnutí do MLog režimu a dohledání odkazů v informacích položek.',
      'Sjednocení cílové složky MagicGate repozitářů do podsložky magicgate/ v rámci výchozí složky pro stahování.',
      'Okamžitý reset a zavření Spotlight vyhledávače při otevření repozitáře ve VS Code nebo v Android Studiu z okna klonování.',
      'Zachování označené položky ve Spotlight vyhledávači při návratu ze subpoložek (Alt+Enter).',
      'Zpřehlednění nabídky akcí: odstranění duplicitního tlačítka rekurzivního stahování a umístění akce Otevřít na GitHubu na konec seznamu.',
      'Vylepšený editor položek statických dat: pole Název i pole Umístění roztaženo na 100 % šířky formuláře; pole Umístění převedeno na víceřádkový editor s podporou odřádkování.',
      'Resetování posuvníku na začátek při přepínání záložek v okně Jak na zdroje dat.',
      'Sjednocení a zpřesnění nápovědy a barevného stylu dle design pravidel (dodržení sekundární barvy v modálech klonování a informačním okně).',
    ],
  },
  {
    version: '1.1.1',
    date: '14. 9. 2026',
    title: 'Rozšíření (GitHub, VS Code), systém akcí a informací, klonování repozitářů a barevný design systém',
    highlights: [
      'Nová záložka Rozšíření v Nastavení: možnost zapínat a vypínat samostatné moduly MagicGate, MLog, GitHub a VS Code (s automatickým zachováním stávající konfigurace).',
      'Integrace GitHubu: přímé načítání osobních repozitářů i organizací s vyhledáváním a výchozí ikonou GitHubu.',
      'Nový systém Akcí položek (Shift+Enter): otevření webu repozitáře, stažení/naklonování repozitáře i rekurzivní klonování včetně submodulů.',
      'Přehledné samostatné systémové okno pro klonování repozitářů s výběrem cílové složky a živým zobrazením průběhu.',
      'Výchozí složka pro klonování v nastavení GitHubu a plynulý návrat fokusu do vyhledávače po dokončení.',
      'Rozšíření Visual Studio Code (VS Code): vyhrazená integrace v Nastavení s možností nastavení cesty a automatické detekce instalace Code.exe.',
      'Blesková tichá detekce existujících repozitářů v cílové složce bez blokování uživatelského rozhraní.',
      'Nová akce Otevřít ve VS Code: pokud repozitář v cílové složce existuje, nabídne se v akcích položky (Shift+Enter) s přímým otevřením ve VS Code.',
      'Vyhrazená identita VS Code: specifická hluboká petrolejová barva rozšíření, zobrazení v Chytrých funkcích a výrazné zvýraznění v nabídce akcí.',
      'Potvrzení stažení klávesou Enter v okně klonování repozitářů (jak z GitHubu, tak z MagicGate instancí).',
      'Klonování repozitářů instance MagicGate: možnost stáhnout všechny repozitáře sekcí instance přes novou akci na Shift+Enter se živým průběhem, automatickým pojmenováním podsložek a uložením repos.json.',
      'Sjednocení barev oken klonování: stavový box, spinner, tlačítko výběru složky i tlačítko pro otevření v Průzkumníku sladěny do sekundární barvy motivu.',
      'Původní podvolby položek přejmenovány na subpoložky a přesunuty pod klávesovou zkratku Alt+Enter.',
      'Nový systém Informací (info) položek na Shift+Enter: zobrazení detailních parametrů (databáze, server, mlog požadavek, cesty, zálohy apod.) v kompaktní liště nad akcemi s možností okamžitého zkopírování hodnoty.',
      'Oprava automatického posouvání (scroll) v okně Akcí a informací při klávesové navigaci šipkami.',
      'Rychlá zkratka Ctrl+Backspace ve Spotlightu pro okamžité kompletní smazání hledaného výrazu.',
      'Rychlé prefixy git: a magicgate: (mg:) a vizuální aktivace MLog režimu ve vyhledávači.',
      'Závazná pravidla barevného systému (docs/COLOR_RULES.md): vyhrazené barvy pro rozšíření, semafor pro stavy a nová paleta 10 designových odstínů pro hlavní i sekundární barvu motivu.',
      'Zlatý/jantarový akcent pro MagicGate v detailech a čipech a samostatná barevná identita pro internetové vyhledávače.',
      'Banování položek a správa Banlistu: možnost vyřadit libovolnou položku ze synchronizace i vyhledávače a nová záložka Banlist s možností obnovení.',
      'Nový interaktivní průvodce "Jak na zdroje dat" v Nápovědě s kompletní specifikací JSON/TypeScript modelu.',
    ],
  },
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
 * Zde se průběžně zapisují novinky pro budoucí verzi (1.1.7).
 * Po dokončení releasu se tyto položky přesunou přímo pod vydávanou verzi a toto pole se vyprázdní.
 */
export const UPCOMING_CHANGELOG: string[] = [];

export function getLatestRelease(): VersionEntry {
  return CHANGELOG_HISTORY[0];
}
