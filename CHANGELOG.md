# Seznam změn (Changelog) - IADonkey

Všechny důležité změny v této aplikaci jsou dokumentovány v tomto souboru. Formát vychází z uživatelsky srozumitelného přehledu novinek.

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
