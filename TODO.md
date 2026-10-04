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

- [ ] **5. MagicPlan: Integrace zobrazení víkendů**
  - **Popis**: Zobrazení víkendových dnů v plánu, defaultně indikovaných jako 8h volno.
  - **Požadavky**: Údaje o volnu/kapacitě přebírat dynamicky z dat plánu (ne hardcoded).

## ✅ Dokončené úkoly (čekající na kontrolu / revizi)

- [x] **6. MagicPlan: Inline správa osob a filtru JÁ přímo v časové ose (Timeline)**
  - **Popis**: Možnost přidat/odebrat osobu a označit/odoznačit přepínač „JÁ“ přímo v rozhraní Timeline (denní i týdenní přehled).
  - **Stav**: Dokončeno. Placeholder „+ Přidat osobu“ s výběrem nepřidaných osob, kontextové menu tří teček u avatarů (posun nahoru/dolů, To jsem já / To nejsem já, vymazat) propojené s ukládáním do konfigurace.

- [x] **7. MagicPlan: Kompaktní zobrazení denního plánu**
  - **Popis**: Přepínač v Nastavení pro aktivaci kompaktního zobrazení denního plánu pro úsporu vertikálního i horizontálního prostoru.
  - **Stav**: Dokončeno. Kompaktní výška karet 72px s dvouřádkovou typografií a zmenšenými mezerami.

- [x] **8. MagicPlan: Zmenšení výšky úkolů v týdenním plánu**
  - **Popis**: Zmenšení výšky jednotlivých bloků/úkolů v týdenním zobrazení cca o polovinu pro přehlednější zobrazení bez nutnosti scrollování.
  - **Stav**: Dokončeno. Výška řádku zmenšena na 38px (karty 30px).

- [x] **9. MagicPlan: Trvalé zapamatování přepínače „Všechny úkoly“**
  - **Popis**: Uložení stavu přepínače „Všechny úkoly“ v okně MagicPlanu do konfigurace rozšíření (`config.magicplan.showAllTasks`).
  - **Stav**: Dokončeno. Stav se automaticky ukládá při kliknutí na přepínač.

- [x] **10. Nastavení: Zrušení barvy pozadí postranního panelu menu**
  - **Popis**: Odstranění šedého podbarvení bočního panelu navigace (`bg-transparent`) v okně Nastavení pro sjednocený čistý borderless UI zážitek.

- [x] **11. Nastavení: Zmenšení ikon a položek v sekci Rozšíření v menu**
  - **Popis**: Úprava vizuální hierarchie – zmenšení velikosti ikon a položek podsekce Rozšíření v postranním panelu Nastavení.
  - **Stav**: Dokončeno. Písmo 12px, ikony 16px, kompaktní padding py-1.5 s odsazením pl-6.





