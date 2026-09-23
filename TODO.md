# IADonkey – TODO List

Aktuální seznam úkolů projektu rozdělený na otevřené k realizaci s podrobnými technickými analýzami a dokončené čekající na revizi.

---

## 📋 Otevřené úkoly (k realizaci)

- [ ] **1. Integrace multi-schránky na styl Ditto (EasyClip)**
  - **Popis**: Pokročilý správce historie schránky jako subrozšíření DonkeyTools s rychlým vkládáním a historií.
  - **Architektura & Procesy**:
    - Služba na pozadí (`electron/clipboardService.ts`): Periodické sledování změn systémové schránky (`clipboard.readText()`, `readImage()`), deduplikace záznamů, posun existujícího záznamu na vrchol.
    - Úložiště: Ukládání až 100 posledních položek v `userData/easyclip.json` s možností mazání a expirace.
    - Plovoucí kompaktní okno (`hash: 'easyclip'`): Velikost ~380×480 px, frameless, otevření u kurzoru nebo v centru obrazovky.
  - **Interakce & Klávesnice**:
    - Okamžité filtrování fulltextem, procházení šipkami nahoru/dolů.
    - Podpora vícenásobného výběru pomocí `Shift + šipky` / kliknutí: vložení více položek spojených oddělovačem (nový řádek / mezera).
    - `Enter`: vložení vybrané položky, `Shift+Enter`: vložení jako čistý neformátovaný text, `Del`: smazání ze schránky, `Esc`: skrytí okna.
  - **Mechanismus automatického vložení (Auto-Paste)**:
    - Před otevřením EasyClip uložit HWND/identifikátor aktivního okna.
    - Po stisku `Enter`: zkopírovat zvolený text do schránky, skrýt EasyClip, obnovit fokus do původního okna a syntetizovat stisk `Ctrl+V` (prostřednictvím nativního volání / Windows API).

- [ ] **2. MagicGate: Přepínač mezi lokálním XML souborem a vzdáleným API GET**
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

---

## ✅ Dokončené úkoly (čekající na kontrolu / revizi)

- [x] **Měřítko a pravítko obrazovky (Screen Ruler / Scale) v DonkeyTools**
  - **Realizováno**:
    - Průhledné fullscreen overlay okno (`#ruler`) nad aktivním monitorem bez rámu a bez taskbaru (`alwaysOnTop: 'screen-saver'`).
    - Dva měřicí režimy: Obdélníkový výběr (Bounding Box s rozměry $W \times H$, poměrem stran, plochou $px^2$, kótami se šipkami) a Celoobrazovkový kříž (Crosshair se vzdálenostmi ke 4 okrajům monitoru).
    - Klávesové zkratky v overlay: `Esc` (zavřít), `Space` (zmrazit/odemknout výběr), `C` (kopírovat rozměry do schránky s audio odezvou), `M` (přepnout režim Box ↔ Kříž), `U` (přepnout jednotky `px`, `%`, `dp`), Šipky (jemný posun o 1 px / 10 px se Shiftem).
    - Plovoucí horní toolbar (přepínání režimů, jednotek, kopírování, zámek, zkratky, zavřít).
    - Příkazy ve Spotlightu: `/ruler`, `/pravitko`, `/meritko`, `/scale` a ikona pravítka (`straighten`) v nabídce rychlých nástrojů DonkeyTools.
    - Kontextové menu Tray lišty: položka `ScreenRuler – Měřítko a pravítko` s dynamickou filtrací zapnutí/vypnutí.
    - Nastavení v DonkeyTools: přepínač zapnuto/vypnuto, záznamník globální klávesové zkratky s detekcí kolizí, volba výchozí jednotky (`px`, `%`, `dp`), volba barvy vodítek s paletami presetů i hex náhledem, tlačítko testovacího spuštění.
    - Sjednocení vizuálu se Spotlightem: grafitový skleněný podklad `#1c1d24`, zaoblení `rounded-2xl`, pevná šířka čísel pro 4 cifry bez poskakování a sjednocená výška všech ovládacích prvků (`h-8`).
    - Nativní Windows notifikace při zkopírování rozměrů do schránky s audio odezvou a záznamem do Protokolu akcí (Action Log).


