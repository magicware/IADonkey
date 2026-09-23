# IADonkey – TODO List

Aktuální seznam úkolů projektu rozdělený na otevřené k realizaci s podrobnými technickými analýzami a dokončené čekající na revizi.

---

## 📋 Otevřené úkoly (k realizaci)

- [ ] **1. Měřítko a pravítko obrazovky (Screen Ruler / Scale) v DonkeyTools**
  - **Popis**: Přidání nového systémového nástroje pro měření vzdáleností a rozměrů na obrazovce (pixel ruler / screen scale) pro vývojáře a grafiky.
  - **Architektura & Electron**:
    - Využití dedikovaného transparentního fullscreen okna (`hash: 'ruler'` v `windowManager.ts`) s vlastnostmi `transparent: true`, `frame: false`, `alwaysOnTop: true`, `skipTaskbar: true`.
    - Dva základní měřicí režimy:
      1. *Obdélníkový výběr (Bounding Box)*: Tažení myší zobrazující šířku, výšku v px, poměr stran a plochu.
      2. *Vzdálenost a kříž (Crosshair & Edge Distance)*: Měření vzdálenosti od kurzoru k hranám oken nebo zadanému bodu.
    - Klávesové zkratky v režimu měření: `Esc` (zavřít/zrušit), `Mezerník` (zamknout/odemknout naměřenou oblast), `C` (kopírovat rozměry např. `480 × 320 px` do schránky), šipky (jemný posun o 1 px, `Shift+šipky` o 10 px).
  - **Integrace do Spotlightu & Tray**:
    - Nový příkaz ve Spotlightu: `/ruler`, `/pravitko`, `/meritko`, `/scale`.
    - Karta akce v DonkeyTools sekci Spotlightu i v kontextové nabídce systémové lišty (Tray icon).
  - **Konfigurace & Nastavení**:
    - Rozšíření `DonkeyToolsSettings` o `screenRuler?: { enabled: boolean; hotkey?: string; defaultUnit?: 'px' | '%' | 'dp'; overlayColor?: string }`.
    - Sekce pro záznam globální klávesové zkratky a nastavení barvy v záložce DonkeyTools v `SettingsModal.tsx`.

- [ ] **2. Integrace multi-schránky na styl Ditto (EasyClip)**
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

- [ ] **3. GitHub: Přepínač mezi Personal Credentials (PAT) a OAuth 2.0**
  - **Popis**: Umožnit uživateli volbu způsobu autorizace k GitHub API – buď manuálním tokenem (PAT), nebo komfortním přihlášením jedním kliknutím přes OAuth Device Flow.
  - **Datový model**:
    - Rozšíření `GithubSettings` o `authMode: 'pat' | 'oauth'`, `oauthToken?: string`, `oauthUser?: { login: string; name?: string; avatar_url?: string }`.
    - Stav `authMode` je trvale perzistován v `config.json`.
  - **Autorizační tok (GitHub Device Authorization Flow - RFC 8628)**:
    - Bez nutnosti vystavovat Client Secret na klientovi:
      1. Vyžádání kódu zařízení (`POST https://github.com/login/device/code` s `client_id` a scope `repo, read:org, user`).
      2. Zobrazení ověřovacího kódu (`user_code`) s tlačítkem „Kopírovat a otevřít GitHub“.
      3. Polling na pozadí na endpointu `https://github.com/login/oauth/access_token`.
      4. Po schválení uložení tokenu, načtení uživatelského profilu a zobrazení avatara a jména v nastavení.
  - **Uživatelské rozhraní v Nastavení (`SettingsModal.tsx`)**:
    - Segmentový přepínač: *„Osobní přístupový token (PAT)“* vs. *„Přihlášení přes GitHub (OAuth)“*.
    - Režim PAT: pole pro vložení tokenu, odkaz na generování na GitHubu, testovací tlačítko.
    - Režim OAuth: tlačítko *„Připojit účet GitHub“* / *„Odpojit účet“*, stavový čip s avatarem přihlášeného vývojáře.
  - **Sjednocená synchronizace**:
    - `githubService.ts` i `dataSync.ts` načítají aktivní token transparentně podle `authMode`.

- [ ] **4. MagicGate: Přepínač mezi lokálním XML souborem a vzdáleným API GET**
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

- [x] **Vývojářský režim (isDevelop) s odemykáním 10× kliknutím, přesun protokolu prováděných akcí (Action Log) a ladicí nástroje**

