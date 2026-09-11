# IADonkey – TODO List

Aktuální seznam otevřených úkolů a vylepšení k realizaci.

---

- [ ] **1. Získání seznamu osob v Google Workspace (analýza a integrace)**
  - Zjistit možnosti načtení kontaktů / adresáře uživatelů z Google Workspace (Google People API / Directory API / export).
  - Návrh konfigurace přihlášení / tokenu v nastavení aplikace.
  - Využití pro našeptávání osob, e-mailů a rychlé akce (Gmail, Chat).

- [ ] **2. Analýza desktopové aplikace Google Chat (přenos vyhledávacího querystringu)**
  - Zanalyzovat desktopového klienta Google Chatu (PWA / Electron / systémové URL schéma).
  - Zjistit možnosti deep linku s předvyplněným vyhledáváním nebo otevřením konverzace (např. googlechat://, specifické URL parametry).

- [ ] **3. Integrace a napojení na data Woxu**
  - Zjistit, kde přesně má původní Wox uložena data a konfiguraci (JSON soubory v %APPDATA%\Wox).
  - Prozkoumat strukturu a navrhnout možnost přímého čtení / automatické synchronizace dat z Woxu do IADonkey.

- [ ] **4. Uživatelské textové snippety z JSON/API dat (prefix :)**
  - Možnost definovat v datových zdrojích vlastní položky se snippetem a akcí `action: "copy"` (např. `:iban`, `:ico`, `:podpis`, `:regards`).
  - Zobrazování snippetů **výhradně** při zadání prefixu `:` (bez dvojtečky zůstávají skryté).

- [ ] **5. Integrace s Magicware GitHub pro repozitáře (analýza a návrh řešení)**
  - Zjistit možnosti integrace s Magicware GitHub organizací pro načtení seznamu repozitářů.
  - Prověřit autentizaci (GitHub Personal Access Token / fine-grained token, potřeba konfigurace v Nastavení).
  - Návrh struktury položky v launcheru:
    - Hlavní akce: `open` – otevření stránky repozitáře v prohlížeči.
    - Subpoložka 1 (Ctrl+Enter): `git clone <url>` (zkopírování klonovacího příkazu do schránky).
    - Subpoložka 2 (Alt+Enter): `git clone --recursive <url>` (zkopírování rekurzivního klonování do schránky).

---

### Dokončeno

- [x] **Vyhledávání nezávislé na diakritice ve Spotlightu i prohlížeči (např. "Příkazový řádek" přes "prik")**
  - Vytvořena sdílená utilita `removeDiacritics` (`normalize('NFD')` s odstraněním diakritických značek).
  - Normalizace hledaného dotazu i názvů a lokací položek a podpoložek ve Spotlightu.
  - Podpora vyhledávání a řazení podle začátku slov bez ohledu na háčky a čárky (např. zadání `prik` i `přík` najde a upřednostní `Příkazový řádek`, `radek` i `řádek` najde shodu ve slově).
- [x] **Prohlížeč všech indexovaných položek vyhledávání v Nastavení**
  - Tlačítko přejmenováno na *Kompletní seznam*, umístěno v patičce zdrojů se zarovnáním doprava.
  - Zjednodušené počítadlo: `Celkem načteno: X položek`.
  - Modální okno se strohým, přehledným seznamem položek prioritně seřazených (stejně jako ve Spotlightu).
  - Samostatný tyrkysový chip pro snippety v záhlaví modálu (*X hlavních*, *Y snippetů*, *Z podpoložek*, *W celkem*).
  - Živá data: favicony/ikony, barevně odlišená priorita, název, cíl/URL (s možností zkopírování či otevření), akce a zdroj dat.
  - Sjednocena velikost Material ikon v seznamu s reálnými faviconami (odstraněna původní fixní 26px velikost, ikony se nyní perfektně vejdou do rámečků bez přetékání).
  - Podpoložky (subitems) vizuálně odsazené zleva stromovou strukturou (`└─`), s vlastními faviconami a prioritami.
  - Okamžitý vyhledávací filtr (včetně hledání ve zkratkách snippetů s podporou bez diakritiky) a možnost hromadného sbalení/rozbalení podpoložek.



- [x] **Přepracování zobrazení Nastavení (levé vertikální menu)**
  - Nový čistý dvousloupcový layout s levým vertikálním sidebarem (`w-60`) namísto horních záložek.
  - Sjednocené ikony záložek, čipy stavů (aktivní MLog/MagicGate, počet zdrojů, verze s proklikem do changelogu).
  - Přehledné pravé okno s hlavičkou, scrollovatelným obsahem a patičkou.
- [x] **Dynamické systémové snippety s akcí paste (:today, :time, :tomorrow, :guid, :uuid, :cas, :dnes, :zitra)**
  - Vyvolání výhradně po zadání `:` (bez `:` se snippety nenabízí).
  - Živý náhled generované hodnoty v podnadpisu výsledku.
  - Akce `paste`: uložení do schránky, okamžité skrytí launcheru a automatické vložení (<kbd>Ctrl+V</kbd>) do předchozí aktivní aplikace.
- [x] **Vizuální sjednocení akčních a záložkových ikon**
  - Vyřešena rozdílná výška a pozicování ikonek v záhlaví vyhledávání (sjednoceno na `w-8 h-8 rounded-lg flex items-center justify-center`).
  - Sjednocení barev ikon záložek a nadpisů na primární barvu motivu (`text-indigo-400`).
- [x] **Oprava vyhledávání Google prefixem g: (a google:)**
  - Podpora prefixu `g:` i `google:`.
  - Spolehlivé odříznutí prefixu a úvodních i koncových mezer, do Google Search i do textu položky jde čistý hledaný výraz.
- [x] **Samostatná záložka Aktualizace a vylepšení UI nastavení**
  - Samostatná položka Aktualizace v levém menu, ruční kontrola nových verzí.
  - Úprava rozložení: štítek aktuálního sestavení na novém řádku, zjednodušené tlačítko Historie změn.
  - Vizuální zjemnění přepínačů a odstranění duplicitních nadpisů.
  - Okamžité ukládání nastavení bez nutnosti potvrzovacího tlačítka.
- [x] **Detekce JSON zdrojů a mapování polí**
  - Automatická detekce struktury JSON dat a mapování cílových polí.
  - Možnost zadání fixní hodnoty (např. jednotná ikona) s živým náhledem.
  - Kopírování URL API zdrojů jedním kliknutím.
- [x] **Lokalizované formátování a zarovnání času synchronizace**
  - Formátování data v českém genitivu (např. 5. května 11:24:24) s rokem při starším datu.
  - Dvousloupcové vertikální zarovnání textu a data přímo pod sebou v levém menu.
- [x] **Aktivace a fokus vstupního pole Spotlightu po zavření nastavení**
  - Při zavření okna nastavení (nebo in-page modálu) se okno Spotlightu znovu aktivuje a kurzor se automaticky zaměří na vyhledávací pole.
- [x] **Rozšíření MagicGate o XML konfigurační soubor**
  - Výběr deploy XML souboru v záložce MagicGate s automatickou synchronizací.
  - Vyfiltrování serverů i instancí typu Bench (`BenchServer`, `BenchMarking`, `BenchCanaria`).
  - Hlavní položky z první aplikace s MagicGate ikonou a subpoložky s namapovanými názvy (`Administrace`, `Web`, `API`, `BO`).
- [x] **Globální podpora zástupného symbolu {favicon} s asynchronním stahováním**
  - Ochrana proti rozbitým obrázkům s okamžitou fallback ikonou `public`.
  - Asynchronní extrakce a stažení reálné favicony na pozadí při odentrování / spuštění položky.
  - Ukládání do paměťové i diskové mezipaměti (`localStorage` a JSON cache).


