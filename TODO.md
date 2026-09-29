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

- [ ] **4. ColorMaster: Vylepšení doladění barev, simulace alfa kanálu na podkladu, správa palet a surface barvy**
  - **Popis**: Rozšíření okna doladění barev (`TuneColorModal`) a ColorMasteru o pokročilou práci s průhledností (alpha kanálem), tvorbu a správu vlastních barevných palet a automatické generování povrchových barev (surface colors) pro světlý i tmavý motiv.
  - **Logika alfa kanálu (Alpha Blending vs. Kapátko)**:
    - Při aplikaci alfa kanálu by se barva měla chovat a vizuálně měnit tak, jako by byla nabrána kapátkem z monitoru přes daný podklad.
    - Zásadní rozdíl vzniká při průhlednosti nad bílým podkladem (`#FFFFFF`) vs. černým podkladem (`#000000`), případně nad barvou plochy aplikace (`surface`).
    - *Řešení k domyšlení*: Přepínání referenčního podkladu (šachovnice / bílé / černé / custom barva / aktuální theme surface), výpočet výsledné složené RGB barvy vzorcem standardního alpha compositingu:
      `C_result = round(C_foreground * alpha + C_background * (1 - alpha))`.
    - Možnost zkopírovat jak čistý formát s alfou (`rgba(...)` / `#RRGGBBAA`), tak výslednou smíchanou neprůhlednou barvu (`#RRGGBB`).
  - **Rozšíření o správu barevných palet**:
    - Možnost založit novou pojmenovanou paletu (např. „Projekt X“, „Firemní identita“, „Web design“).
    - Možnost do aktivní palety průběžně doplňovat barvy (z kapátka, z historie, z ručního zadání).
    - Správa barev v paletě (přejmenování, přetahování pořadí, mazání) a uložení do konfigurace aplikace s možností exportu (JSON / CSS variables / Tailwind tokens).
  - **Automatické surface barvy pro světlý i tmavý motiv**:
    - Z vybrané primární / akcentní barvy automaticky dopočítat harmonické povrchové barvy (Material 3 Surface Roles):
      - Tmavý motiv (Dark theme): `surfaceContainerLowest`, `surfaceContainer`, `surfaceContainerHigh`, `surfaceVariant`, `outlineVariant`.
      - Světlý motiv (Light theme): odpovídající světlé ekvivalenty.
    - Ověření kontrastního poměru (WCAG AA/AAA) pro texty a ikony vůči generovaným povrchům.

---

## ✅ Dokončené úkoly (čekající na kontrolu / revizi)

- [x] **ScreenRuler & QuickCap: fixace poměru stran při výběru (Shift: 16:9, Ctrl: 4:3, Alt: 1:1)**
  - Vytvořen samostatný matematický modul `src/utils/aspectRatio.ts` s funkcemi `getActiveAspectLock`, `calculateAspectBox` a `formatAspectRatio`.
  - Zapracováno do `ScreenRulerOverlay.tsx` i `QuickCapSnipper.tsx` včetně živé reakce na stisk/uvolnění modifikátorů během tažení, indikace v plovoucím badge a nápovědných čipů v horní liště.

- [x] **ColorMaster: hlavička subextension s ikonou a označením v boxu lupy**
  - Do horní části okna `LoupeForm` v `NativeColorPicker.cs` přidán kruhový badge s vektorovou ikonou kapátka v barvě `rose-400` a tučným nápisem `ColorMaster` ve stylu ScreenRuleru.
  - Výška okna a odsazení čočky plynule upraveny na 254 px.

- [x] **ColorMaster: odstranění ohraničení (borderu) z plovoucího boxu lupy kapátka a sjednocení zkratek**
  - Z `LoupeForm` v `NativeColorPicker.cs` kompletně odstraněny `WS_THICKFRAME`, `WS_CAPTION`, `WM_NCCALCSIZE` i `DwmExtendFrameIntoClientArea`.
  - Nastaven `DWMWA_BORDER_COLOR = DWMWA_COLOR_NONE` (`0xFFFFFFFE`), `CS_DROPSHADOW` a `DWMWCP_ROUND`.
  - Zkratky v patičce sjednoceny do `<kbd>` pill badge stylu (`[Enter] vybrat`, `[Esc] konec`) bez šipkových symbolů.
  - Skript `compile` v `package.json` rozšířen o automatickou synchronizaci binárek z `electron/assets` do `dist-electron/assets`.


