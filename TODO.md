# IADonkey – TODO List

Aktuální seznam úkolů projektu rozdělený na otevřené k realizaci s podrobnými technickými analýzami a dokončené čekající na revizi.

---

## 📋 Otevřené úkoly (k realizaci)

- [ ] **1. MagicGate: Přepínač mezi lokálním XML souborem a vzdáleným API GET**
  - **Popis**: Přepínač způsobu získávání instancí MagicGate – buď z lokálního deploy XML souboru, nebo dynamickým stažením přes REST API s autentizací.
  - **Datový model & Konfigurace**:
    - Rozšíření `MagicGateSettings` o `sourceMode: 'xml' | 'api'`, `apiUrl?: string`, `apiUsername?: string`, `apiPassword?: string`, `apiAuthType?: 'basic' | 'bearer' | 'credentials'`.
    - Výchozí hodnota `sourceMode: 'xml'` pro 100% zpětnou kompatibilitu.
  - **Implementace API GET & Mapování**:
    - Podpora přihlášení buď sdílenými přihlašovacími údaji MagicGate (IS Tour credentials), nebo dedikovaným API klíčem.
    - Endpoint vrací strukturu serverů a instancí; mapovač data převede na standardní `LauncherItem[]` s `sourceId: 'magicgate-api'`.
    - Fixní sada Material ikon pro aplikace: Administrace (`admin_panel_settings`), Web (`language`), API (`api`), BackOffice/SIS (`desktop_windows`), Klient (`apartment`).
  - **Uživatelské rozhraní v Nastavení (`SettingsModal.tsx`)**:
    - Přepínač režimu: *„Lokální soubor XML“* vs. *„Vzdálené API GET“*.
    - V režimu XML: výběr cesty k souboru na disku s validací existence.
    - V režimu API: URL endpointu, volba typu autentizace, tlačítko *„Otestovat připojení k API“*.

- [ ] **2. Analýza dodatečné shortcut lišty (rychlého panelu zástupců)**
  - **Popis**: Možnost připnout si vyhledané položky ze Spotlightu i jejich konkrétní akce jako zástupce (zkratky / shortcuts) do rychlého panelu pro okamžité spuštění.
  - **K zamyšlení & UX/UI analýza**:
    - **Umístění a vizuál lišty**: Kompaktní dock panel (např. lišta pod vyhledávacím řádkem, boční panel, nebo konfigurovatelná plovoucí lišta).
    - **Způsob připínání**: Akce v nabídce položky (*„Připnout na rychlý panel“* / klávesová zkratka), drag & drop, nebo správa v Nastavení.
    - **Reprezentace zástupců**: Miniatury ikon s badge indikátorem, tooltip s plným názvem a akcí, rychlé spuštění přes klávesy (např. 1–9 nebo Alt+1–9).
    - **Datový model & Konfigurace**: Ukládání seznamu zástupců v konfiguraci aplikace (`pinnedShortcuts: { id, name, icon, action, location, settings }[]`).

- [ ] **3. Analýza funkce „Odeslat zpětnou vazbu“ (Feedback / Hlášení problémů)**
  - **Popis**: Návrh mechanismu pro jednoduché a rychlé odeslání uživatelské zpětné vazby, nápadů na vylepšení nebo nahlášení chyb přímo z aplikace IADonkey.
  - **K zamyšlení & Technická / UX analýza**:
    - **Uživatelské rozhraní**:
      - Modální okno nebo dedikovaná sekce v Nastavení (záložka Nápověda / Systém) a rychlá volba v tray menu i Spotlightu (`/feedback`, `/zpetnavazba`).
      - Typ zpětné vazby: výběr kategorie (Chyba / Nápad na vylepšení / Dotaz / Jiné).
      - Textové pole pro popis + volitelné zadání kontaktního e-mailu / uživatele.
    - **Přílohy a diagnostická data**:
      - Možnost přiložit snímek obrazovky (přímé napojení na QuickCap snipper).
      - Volitelné automatické připojení systémových diagnostických informací (verze IADonkey, verze Windows, anonymizovaný výpis posledních událostí z Action Logu / Crashlogu).
    - **Backend & Způsob doručení**:
      - Odeslání přes interní API / Helpdesk (např. MLog API jako požadavek Rxxxx), GitHub Issues REST API, nebo centrální webhook (Slack/Teams/e-mail).
      - Ošetření offline stavu (uložení do fronty k odeslání po obnovení připojení).

- [ ] **4. Integrace odpracovaných hodin v daném dni do MagicPlanu (společná analýza)**
  - **Popis**: Společná analýza a návrh integrace reálně odpracovaných a vykázaných hodin za daný den přímo do okna a časové osy MagicPlanu.
  - **Body k řešení**:
    - **Zdroj dat**: Možnosti napojení na helpdesk MLog / výkazy práce (REST API, interní endpoint nebo přímé dotazování) pro zjištění reálně vykázaných hodin uživatele v daném dni.
    - **Zobrazení v UI**: Přehledný indikátor celkového součtu odpracovaných hodin vs. plánovaná kapacita (např. v záhlaví navigace dne vedle data a časového rozmezí).
    - **Vizuální párování**: Porovnání naplánovaných bloků na ose s reálně zapsanými výkazy (indikace splněno / rozpracováno / manko / přesčas).

- [ ] **5. Ikony notifikací: Analýza přímého napojení Material Icons z aplikace vs. úprava vzhledu**
  - **Popis**: Technická analýza možností vykreslování systémových ikon notifikací přímo z lokální sady Material Symbols / Icons integrovaných v aplikaci.
  - **Body k řešení**:
    - **Limity Windows Toast API**: Ověřit možnosti dynamického renderování ikon (Windows toasty vyžadují fyzický soubor na disku – např. dynamický offscreen Canvas / SVG export / Sharp nebo nativní renderer).
    - **Alternativní vzhled ikon**: Pokud přímé napojení z webových fontů/SVG nebude za běhu Electronu dostatečně svižné či spolehlivé, přetvořit vybrané stávající rastrové ikony do nového, ještě čistšího vizuálního stylu.

- [ ] **6. Přebírání dynamických barev přímo v notifikacích z nastavení aplikace**
  - **Popis**: Zajištění, aby systémové notifikace a jejich ikony dynamicky respektovaly uživatelsky zvolené barvy z Nastavení IADonkey (primární barva vývoje, sekundární barva akcí/servisu apod.).
  - **Body k řešení**:
    - **Dynamické přegenerování ikon**: Automatické přegenerování / obarvení ikonek do mezipaměti (`userData` / cache) při uložení změn v konfiguraci témat nebo za běhu při spuštění.
    - **Barevné sladění toastů**: Promítnutí aktuální primární barvy do toastů vývoje a sekundární akční barvy do toastů servisu.

- [ ] **7. Okno „Co je nového“ (Release Notes): Odstranit ztmavující / rozmazávací backdrop**
  - **Popis**: Modální okno s přehledem novinek po aktualizaci aplikace má na pozadí ztmavující overlay (backdrop), který překrývá okolí. Tento backdrop zrušit / odstranit pro čistý styl bez nežádoucího ztmavení.

- [ ] **8. Textace a odladění notifikací: Fiktivní data u testů a textace „kritický požadavek“**
  - **Popis**: Úprava textů notifikací v MagicPlanu i Nastavení. Zajištění, aby u kritických úkolů byla závažnost zřejmá nejen z ikony, ale i přímo z textu notifikace, a nahrazení reálných dat v testovacích tlačítkách za obecná data.
  - **Body k řešení**:
    - **Označení „kritický požadavek“ v textech**: U notifikací přiřazení úkolu z fronty do plánu i přesunutí zpět do fronty nahradit při kritické závažnosti (`isCritical`) obecné slovo „úkol / požadavek“ za explicitní text **„kritický požadavek“** (např. *„Přiřazení kritického požadavku“*, *„Kritický požadavek byl přesunut zpátky do nepřiřazených“*).
    - **Fiktivní data v testovacích notifikacích**: Testovací tlačítka v Nastavení upravit tak, aby ukázkové texty neobsahovaly reálná jména kolegů ani existující tickety a projekty (nahradit za neutrální např. „Kolega (VN)“, „Testovací požadavek: Implementace modulu XYZ“, „Projekt Demo“).

- [ ] **9. Sjednocení systémové ikony aplikace ve Windows (hlavní panel, Start menu, záhlaví oken)**
  - **Popis**: V aplikaci a na splashscreenu je moderní podoba ikony, ale systémová ikona samotné aplikace ve Windows (na hlavním panelu / taskbaru, ve vyhledávání / našeptávači Start menu a v `.exe` binárkách) je starší verze. Je potřeba nahradit a sjednotit systémové `.ico` a zdrojové `.png` ikony.
  - **Body k řešení**:
    - **Zdrojová grafika**: Vytvořit čistý víceresoluční soubor `icon.ico` (16×16 až 256×256 px) a odpovídající `icon.png` z aktuální moderní předlohy.
    - **Sjednocení v projektu**: Nahradit soubory v `electron/assets/icon.ico`, `electron/assets/icon.png`, `public/icon.png` a v konfiguraci `build` v `package.json`.
    - **Ověření v systému**: Zajistit ostré a nerozmazané zobrazení v taskbaru Windows, tray liště, Start menu zástupci i v záhlaví všech oken aplikace.

- [ ] **10. MagicPlan: Automatická detekce nového dne po půlnoci a při aktivaci okna**
  - **Popis**: Okno MagicPlan zůstává v Electronu otevřené na pozadí a při zavření se pouze skrývá (`hide()`). Výpočet pracovního týdne `workWeekDays` a indexu dneška `todayIdx` / `selectedDayIndex` proto po přechodu půlnoci zůstával zakešovaný na předchozím dni.
  - **Body k řešení**:
    - **Detekce přechodu půlnoci**: Pravidelná kontrola změny kalendářního dne (`new Date().toDateString()`) v intervalu. Při přelomu půlnoci automaticky přepočítat `workWeekDays` a aktualizovat příznak `isToday`.
    - **Reakce na aktivaci okna (Focus / Show)**: Při každém opětovném zobrazení / zaměření okna (`focus` nebo IPC signál při `show()`) zkontrolovat aktuální systémový čas a v denním režimu nastavit `selectedDayIndex` na nový aktuální den.

- [ ] **11. Klonování MagicGate repozitářů: Tlačítko klonování nepřebírá dynamickou barvu z nastavení**
  - **Popis**: V modálním okně stahování a klonování repozitářů MagicGate instance (`GitCloneModal.tsx`) má hlavní tlačítko pro stažení/klonování fixně zadrátovanou fialovou barvu (`bg-purple-600`), namísto aby přebíralo dynamickou sekundární akční barvu nastavenou v konfiguraci aplikace.
  - **Body k řešení**:
    - **Napojení konfigurace témat**: Předat nebo načíst aktuální nastavení barev (sekundární akční barva / primární barva) do `GitCloneModal.tsx`.
    - **Dynamický styl tlačítka**: Nahradit pevné fialové třídy (`bg-purple-600`, `hover:bg-purple-500`, `active:bg-purple-700`, `text-purple-400`) za dynamický styl odvozený z nastavené sekundární/akční barvy.

- [ ] **12. MagicGate položky ve Spotlightu: Nezobrazovat možnost přejít do AKCÍ při nevyplněném GitHubu**
  - **Popis**: Pokud uživatel nemá nakonfigurovaný GitHub (není zadaný PAT / uživatelské jméno nebo je rozšíření GitHub vypnuté), u položek instancí MagicGate ve Spotlightu by se neměla nabízet nabídka Akcí (`Shift+Enter`) pro klonování repozitářů.
  - **Body k řešení**:
    - **Podmíněné zobrazení akcí**: V `SearchSpotlight.tsx` (`getItemActions`, `hasItemActions` a `hasItemActionsOrInfo`) odfiltrovat `mgclone` akce, pokud rozšíření GitHub není aktivní nebo nejsou vyplněny potřebné přihlašovací údaje.
    - **Ošetření klávesové zkratky**: Pokud instance nemá žádné další dostupné akce (např. CMSinFS zdrojáky), skrýt nápovědu Akcí a potlačit reakci na stisk <kbd>Shift+Enter</kbd>.

- [ ] **13. Analýza a ošetření stahování repozitářů při vypnutém rozšíření GitHub**
  - **Popis**: Prověřit a ošetřit chování stahování repozitářů při vypnutém rozšíření GitHub. Přihlašovací údaje (PAT / token) v konfiguraci zůstávají zachovány (pro případ nechtěného vypnutí, aby nebylo nutné znovu generovat PAT), ale samotné funkce stahování a klonování repozitářů by měly striktně respektovat stav vypnutého rozšíření.
  - **Body k řešení**:
    - **Mechanismus klonování vs. Windows Credential Manager**: Samotný příkaz `git clone` běží přes systémový `git` a může využívat přihlášení z Windows Git Credential Manageru, zatímco seznam repozitářů sekcí se stahuje přes `CmsFsContentHandler.ashx` z MagicGate serveru.
    - **Respektování stavu rozšíření**: Ošetřit v backendu Electronu i v modálu klonování (`GitCloneModal.tsx`), aby při `config.extensions?.github === false` byly klonovací operace blokovány a uživateli byla zobrazena informace o nutnosti zapnutí rozšíření.
    - **Zachování uložených údajů**: Ponechat uložené PAT a přihlašovací údaje v `config.github` i při vypnutém přepínači pro komfort uživatele, ale všechny související akce podmiňovat aktivním stavem rozšíření.

- [ ] **14. MagicPlan: Responzivní grid pro úkoly přesahující do dalšího týdne (4 a 5 sloupců pro vyšší rozlišení)**
  - **Popis**: V týdenním pohledu MagicPlanu má sekce „Úkoly přesahující do dalšího týdne“ strop na 3 sloupcích (`lg:grid-cols-3`), což na FullHD, QHD i Ultrawide monitorech zbytečně plýtvá vodorovným prostorem.
  - **Body k řešení**:
    - **4 sloupce od šířky 1366 px**: Na běžných notebookových a desktopových obrazovkách (od min-width 1366 px / breakpoint `xl`) rozšířit mřížku na 4 sloupce.
    - **5 sloupců pro Ultrawide / 2560 px+**: Na ultra-širokoúhlých displejích a vysokém rozlišení (od min-width 2560 px) přepnout na 5 sloupců pro maximální přehled bez nutnosti zbytečného vertikálního rolování.
    - **Plynulá responzivita**: 1 sloupec (mobilní/velmi úzké okno) → 2 sloupce (`md`) → 3 sloupce (`lg`) → 4 sloupce (`min-[1366px]` / `xl`) → 5 sloupců (`min-[2560px]`).

---

## ✅ Dokončené úkoly (čekající na kontrolu / revizi)

*(Žádné dokončené úkoly k revizi – vše schváleno)*





