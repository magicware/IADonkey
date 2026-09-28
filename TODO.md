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

---

## ✅ Dokončené úkoly (čekající na kontrolu / revizi)

*(Žádné dokončené úkoly momentálně nečekají na kontrolu)*


