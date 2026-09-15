# Seznam změn (Changelog) - IADonkey

Všechny důležité změny v této aplikaci jsou dokumentovány v tomto souboru. Formát vychází z uživatelsky srozumitelného přehledu novinek.

---

## [1.1.2] - 15. 9. 2026
### Rozšíření Android Studio, vylepšení MLog číselných dotazů, editor statických dat a vyladění UI
- **Rozšíření Android Studio**: Vyhrazená integrace pro prostředí Android Studio s růžovou identitou (`pink`), možností automatické detekce standardních cest / JetBrains Toolboxu nebo ručního nastavení cesty ke `studio64.exe`.
- **Inteligentní volba editoru (Android Studio vs VS Code)**: Aplikace nabízí buď VS Code, nebo Android Studio – nikdy oboje současně. Pokud GitHub repozitář používá programovací jazyk Kotlin nebo Java, zobrazí se tlačítko *Otevřít v Android Studiu*. Pro webové repozitáře a instance MagicGate se vždy nabízí VS Code.
- **Tlačítko Android Studia v nabídce Akcí i v okně klonování**: Možnost okamžitého otevření mobilního projektu přímo z akcí položky (<kbd>Shift+Enter</kbd>) nebo po dokončení stahování repozitáře.
- **Číselné dotazy MLogu na 4+ číslic (např. `2111`)**: Pokud je zapnuté rozšíření MLog a dotaz ve Spotlightu obsahuje pouze 4 nebo více číslic, automaticky se nabídne na 1. místě úkol **T2111** (*Otevřít úkol T2111 v MLogu*) a na 2. místě požadavek **R2111** (*Otevřít požadavek R2111 v MLogu*) včetně vizuální aktivace MLog režimu s ikonou `support_agent`.
- **Sjednocení cílové složky MagicGate repozitářů**: Klonované repozitáře sekcí instancí MagicGate se nyní stahují a detekují v přehledné podsložce `{defaultCloneDir}/magicgate/{instanceName}`.
- **Plynulý reset vyhledávače při otevření v editoru**: Po kliknutí na otevření repozitáře ve VS Code nebo Android Studiu z okna klonování se Spotlight kompletně skryje a zresetuje do výchozího stavu.
- **Zachování fokusu při návratu ze subpoložek (Alt+Enter)**: Při zavření subpoložek zpět do vyhledávače zůstane vybraná původní položka namísto přeskočení na začátek seznamu.
- **Zpřehlednění nabídky akcí repozitářů**: Odstraněna redundantní položka rekurzivního klonování (obslouženo přepínačem v dialogu stahování) a akce *Otevřít na GitHubu* je umístěna na konec nabídky.
- **Editor položek statických dat**: Pole *Název* i pole *Cesta / URL / Obsah* (`location`) roztaženo na 100 % šířky; pole `location` změněno na víceřádkový editor (`textarea`) akceptující a zachovávající odřádkování.
- **Resetování posuvníku v průvodci "Jak na zdroje dat"**: Při přepínání mezi záložkami v modálním okně průvodce se posuvník automaticky vrátí na začátek obsahu.
- **Vyladění barevného design systému**: Důsledné dodržení sekundární barvy v okně klonování repozitářů i v informačním boxu vyhledávače.

---

## [1.1.1] - 14. 9. 2026
### Rozšíření (GitHub, VS Code), systém akcí a informací, klonování repozitářů a barevný design systém
- **Záložka Rozšíření**: Nová vyhrazená sekce v Nastavení pro zapínání/vypínání modulů MagicGate, MLog, GitHub a VS Code bez ztráty existující konfigurace.
- **Integrace GitHubu**: Automatické načtení osobních i organizačních repozitářů přes GitHub Personal Access Token s podporou vlastní GitHub API URL.
- **Systém Akcí položek (Shift+Enter)**: Nové rozšířené menu pro položky nabízející přímé akce (otevření repozitáře na webu, klonování i rekurzivní stažení repozitáře).
- **Samostatné okno pro klonování repozitářů**: Klonování repozitářů (GitHub i MagicGate) se otevírá v samostatném systémovém okně s možností minimalizace a zavření křížkem, výběrem cílové složky a živým streamováním průběhu.
- **Potvrzení stažení klávesou Enter**: V okně klonování repozitářů lze stahování okamžitě spustit stiskem klávesy <kbd>Enter</kbd>.
- **Sjednocené barvy dialogu klonování**: Stavový box průběhu, spinner, tlačítko výběru složky i tlačítko pro otevření složky v Průzkumníku jsou sladěny do sekundární barvy motivu bez rušivých glow efektů.
- **Klonování repozitářů instance MagicGate**: Nové akce na <kbd>Shift+Enter</kbd> u MagicGate instancí (*Klonovat repozitáře instance...* a *Klonovat repozitáře rekurzivně...*). Aplikace se dotáže Administrace instance přes `CmsFsContentHandler.ashx`, zjistí repozitáře sekcí, automaticky odvodí názvy podsložek a nabídne hromadné stažení s vytvořením `repos.json`.
- **Rozšíření Visual Studio Code (VS Code)**: Nová vyhrazená integrace v Nastavení s možností zadání cesty a automatické detekce spustitelného souboru `Code.exe` / `code.cmd`.
- **Blesková tichá detekce existujících repozitářů**: Okamžitá kontrola stažených projektů ve výchozí cílové složce bez blokování uživatelského rozhraní (< 1 ms).
- **Akce Otevřít ve VS Code**: Pokud již repozitář ve výchozí cílové složce existuje a rozšíření VS Code je aktivní, nabídne se v akcích položky (<kbd>Shift+Enter</kbd>) možnost okamžitého otevření ve VS Code se specifickým petrolejovým zvýrazněním.
- **Chytré otevření ve VS Code při chybě klonování**: Pokud se uživatel pokusí stáhnout repozitář do již existující neprázdné složky, zobrazí se v chybovém hlášení i v patičce tlačítko pro okamžité otevření ve VS Code.
- **Rychlá zkratka Ctrl+Backspace**: Ve Spotlight vyhledávači stisk <kbd>Ctrl+Backspace</kbd> okamžitě kompletně vymaže vyhledávací pole.
- **Systém Informací (info) u položek**: Zobrazení podrobných parametrů (databáze, server, mlog požadavek, cesty k souborům, zálohy apod.) v kompaktním panelu přímo nad akcemi na <kbd>Shift+Enter</kbd> s možností okamžitého zkopírování hodnoty do schránky.
- **Oprava posuvníku a plynulé scrollování akcí**: Při navigaci šipkami na klávesnici v nabídce akcí se okno automaticky plynule posouvá i při zobrazených informacích o položce.
- **Přesun subpoložek na Alt+Enter**: Původní zobrazení subpoložek (options) přesunuto na klávesovou zkratku <kbd>Alt+Enter</kbd>; u Git repozitářů byla odstraněna stará logika klonování z voleb ve prospěch nového menu Akcí.
- **Rychlé prefixy `git:` a `magicgate:` (`mg:`)**: Zadáním prefixu okamžitě filtrujete výhradně v repozitářích nebo instancích s dynamickou změnou ikony a nápovědy.
- **Vizuální aktivace MLog režimu**: Při zadání kódu požadavku či úkolu (např. `T1`, `T12`, `R123`) nebo prefixu `mlog:` se vyhledávací pole okamžitě vizuálně přepne do indigo režimu s ikonou `support_agent`.
- **Závazná pravidla barevného systému (`docs/COLOR_RULES.md`)**: Striktní pravidla: semafor pro stavy (zelená, červená, žlutá), stálé vyhrazené barvy rozšíření (Git = fialová, MLog = indigo, MagicGate = zlatá/jantarová, VS Code = petrolejová) a přepracovaná paleta 10 vybraných moderních designových odstínů pro uživatelský výběr motivu.
- **Banování položek a správa Banlistu**: V Kompletním seznamu lze libovolnou položku jedním kliknutím zabanovat a v nové záložce *Banlist* spravovat zabanované položky s možností jejich obnovení.
- **Nový interaktivní průvodce "Jak na zdroje dat"**: V Nápovědě dostupné modální okno s kompletní specifikací JSON/TypeScript schématu položek, podporovaných akcí a ukázek.
- **Plynulý návrat do vyhledávače (Spotlight)**: Po zavření okna klonování se automaticky znovu aktivuje a zaměří vyhledávač se zachovaným dotazem i pozicí.



---

## [1.0.1] - 11. 9. 2026
### Kompletní seznam položek, vyhledávání bez diakritiky a MagicGate XML
- **Kompletní seznam položek**: Nové přehledné modální okno v Nastavení zobrazující všechny indexované položky seřazené prioritně (shodně se Spotlightem) s filtry a počítadly.
- **Vyhledávání bez diakritiky**: Plná podpora psaní s diakritikou i bez (např. `prik` okamžitě vyhledá `Příkazový řádek`) s inteligentním řazením podle začátků slov.
- **Import MagicGate z deploy XML**: Možnost nahrát XML konfiguraci ze serveru a automaticky vygenerovat instance a dílčí aplikace (Administrace, Web, API, BO) pro tichý login.
- **Globální zástupný symbol {favicon}**: Možnost použít `{favicon}` v poli pro ikonu s automatickým stahováním a ukládáním do mezipaměti.
- **Vyhledávač Centrum.cz**: Integrace vyhledávače Centrum.cz s prefixy `c:` a `centrum:`.
- **Vylepšené systémové snippety**: Snippety s prefixem `:` (čas, datum, rok, guid, podpis) s prioritou 0 a tyrkysovými čipy klíčových slov.
- **Sjednocení a vycentrování ikon**: Zmenšení a perfektní vycentrování Material ikon v přehledech tak, aby přesně odpovídaly rozměrům favicon a obrázků.
- **Plynulejší UX**: Automatické vrácení fokusu do vyhledávacího pole po zavření okna nastavení.

---

## [0.1.7] - 11. 9. 2026
### Samostatné aktualizace, detekce a mapování JSON zdrojů
- **Samostatná záložka Aktualizace**: Vyhrazená záložka v nastavení s ruční kontrolou nových verzí a zobrazením historie změn.
- **Detekce a mapování struktury JSON**: Inteligentní průzkumník struktury JSON s mapováním vlastních polí (název, odkaz, ikona, priorita apod.) na libovolné klíče JSONu.
- **Fixní hodnoty pro zdroje**: Možnost zadat fixní hodnotu pro položky zdroje (např. jednotnou ikonu) s živým náhledem prvního záznamu.
- **Rychlé kopírování URL API**: Tlačítko pro okamžité zkopírování adresy API endpointu do schránky v seznamu zdrojů.
- **Český formát času synchronizace**: Přehledné formátování v genitivu (např. *5. května 11:24:24*) v levém menu.
- **Automatické ukládání**: Všechny změny v nastavení se ukládají ihned v reálném čase.

---

## [0.1.6] - 11. 9. 2026
### Nativní programy Windows, Google Search a vylepšení UI
- **Prohledávání nainstalovaných aplikací**: Automatický scanner nabídek Start vyhledá klasické i moderní UWP/MSIX Store aplikace (Adobe XD, Kalkulačka, Windows Terminal apod.) s prioritou 99.
- **Nativní ikony**: Přímá extrakce originálních plnobarevných ikon programů ze spustitelných souborů i balíčků UWP.
- **Word boundary řazení**: Hledání podle začátků slov – např. zadáním `XD` se na 1. pozici okamžitě zobrazí `Adobe XD`.
- **Integrace Google Search**: Možnost okamžitého vyhledání dotazu na Google (priorita 100) i přímý prefix `google:`.
- **Předvolby v Nastavení**: Přepínače pro zapnutí/vypnutí vyhledávání programů a Google Search v záložce Obecné.
- **Oprava barev motivu**: Ikona API zdroje v seznamu zdrojů nyní správně přebírá zvolený barevný motiv.
- **Podpora podpoložek v MagicGate**: Záložka MagicGate se v Nastavení korektně zobrazí i tehdy, pokud je přihlášení nastaveno pouze u vnořených podvoleb.

---

## [0.1.5] - 10. 9. 2026
### Integrace MLog, Gmail, nová ikona a vylepšení UI
- **Automatické zobrazení při startu**: Vyhledávací pole (spotlight) okamžitě po spuštění aplikace vyskočí na obrazovku a zaměří textový kurzor.
- **Vlastní ikona aplikace**: Oficiální ikona IADonkey v hlavním panelu Windows (taskbaru), systémovém panelu (tray) i záhlaví všech oken.
- **Integrace helpdesku MLog**: Rychlé vyhledávání a otevírání požadavků (např. `R1234`) i úkolů (např. `T5678`) přímo z vyhledávače podle nastavené adresy v nové záložce MLog.
- **Integrace Gmailu**: Zadáním libovolné e-mailové adresy bez okolního textu (např. `alzbeta.radova@magicware.cz`) se okamžitě vygeneruje odkaz pro otevření nového konceptu zprávy v Gmailu s předvyplněným příjemcem.
- **Zpřehlednění ovládání**: Odstraněna redundantní tlačítka; kliknutím na chip s číslem verze se kdekoliv v aplikaci otevře historie změn.
- **Sjednocení šířky**: Záložka MLog nyní využívá plnou 100% šířku okna nastavení.
- **In-App aktualizace**: Přímé stahování nových verzí přímo v okně aplikace s ukazatelem průběhu v MB a možností okamžitého restartu do stažené verze.

---

## [0.1.2] - 10. 9. 2026
### Automatické aktualizace a distribuce
- **Automatická kontrola aktualizací**: Integrovaná kontrola nových verzí aplikace přes GitHub s automatickým stažením instalátoru a upozorněním v okně.
- **Okno novinek po aktualizaci**: Po prvním spuštění po aktualizaci se uživateli zobrazí srozumitelný přehled novinek.
- **Automatizace releasů**: Přidán skript pro jednokrokové sestavení, verzování, tagování a publikaci na GitHub.

## [0.1.1] - 10. 9. 2026
### Vlastní barvy, bezpečné zkratky a správa zdrojů
- **Vlastní barva aplikace**: Přidána možnost volby vlastní barvy aplikace v nastavení (včetně hex kódu i rychlých paletek) s okamžitým živým náhledem bez nutnosti restartu.
- **Bezpečné nastavení zkratky**: Při nahrávání klávesové zkratky je vyžadována minimálně dvojkombinace kláves. Stisk a puštění jediné klávesy vrátí původní zkratku a zobrazí upozornění.
- **Nerušivé zadávání**: Dočasné pozastavení původní zkratky během editace pole v nastavení (nedochází k nechtěnému vyvolání launcheru).
- **Přehlednější ikony**: Nové ikony pro lokální JSON soubory a tlačítko přidání souboru v nastavení.
- **Bleskový start okna**: Optimalizace startu okna nastavení bez problikávání výchozích barev.
- **Uživatelský changelog**: Přehledná historie verzí a zobrazení novinek po aktualizaci.

---

## [0.1.0] - 8. 9. 2026
### První verze launcheru IADonkey
- Rychlé vyhledávání a spouštění aplikací, webových adres a záložek.
- Globální vyvolání launcheru pomocí konfigurovatelné klávesové zkratky.
- Import dat z lokálních JSON souborů na disku a externích API endpointů.
- Podpora pro tichý a bezpečný login do MagicGate (systémy IS Tour).
- Podpora pro vnořené podpoložky (Shift+Enter pro rozbalení, Ctrl+Enter pro rychlé spuštění první volby).
- Integrovaná chytrá kalkulačka a přímé otevírání URL adres.
- Automatická synchronizace dat na pozadí s přehledným ukazatelem průběhu.
