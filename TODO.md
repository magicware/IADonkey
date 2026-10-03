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

## ✅ Dokončené úkoly (čekající na kontrolu / revizi)

- [x] **5. & 6. Ikony notifikací (Material Symbols) a MagicPlan v Tray liště**
  - **Popis**: Provedena technická analýza vykreslování systémových notifikací. Z důvodu maximální svižnosti a nulové zátěže na RAM a CPU bylo zvoleno řešení bez dynamického přebarvování za běhu. Všech 13 systémových notifikačních ikon bylo vygenerováno jako čisté 128x128 PNG s tmavým kruhovým podkladem (`#14151c`, border `#262834`) a oficiálními vektorovými glyfy Google Material Symbols:
    - **Indigo (`#6366f1`)**: standardní nástroje a akce (`plan-dev`, `plan-service`, `plan-queue`, `quickCap`, `colorMaster`, `screenRuler`, `syncComplete`, `update`, `clipboard`).
    - **Zelená (`#22c55e`)**: úspěch pro `plan-completed` (použit symbol `check` bez vnitřního kruhu).
    - **Červená (`#ef4444`)**: kritické a chybové notifikace (`plan-critical`, `error`).
    - **Žlutá (`#eab308`)**: testovací notifikace (`test`).
  - **MagicPlan v Tray**: Pokud je v konfiguraci aktivní rozšíření MagicPlan (`config.extensions.magicplan`), zobrazí se v kontextové nabídce systémového Traye položka `MagicPlan – Plánování a úkoly` ve vlastní oddělené sekci (mimo DonkeyTools).

- [x] **9. Sjednocení systémové ikony aplikace ve Windows (hlavní panel, Start menu, záhlaví oken a Tray lišta)**
  - **Popis**: Nahrazen starý 4-bitový (16 barev VGA) `icon.ico` novým plně 32-bitovým víceresolučním souborem (16, 24, 32, 48, 64, 128 a 256 px) s hladkým fialovým rámečkem `#585BD4` a bílým oslíkem přímo z kanonického `src/assets/icon.png`. Sjednoceny soubory `electron/assets/icon.ico`, `build/icon.ico`, `electron/assets/tray-icon.png` i `tray-icon.svg`. V `electron/windowManager.ts` opraven poškozený base64 fallback a napojeno dynamické načítání plnobarevné miniatury ikony pro Tray. Všechna místa (taskbar, Alt+Tab, Start menu, záhlaví oken i oznamovací oblast Tray) mají nyní identickou ikonu.


