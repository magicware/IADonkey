# IADonkey – TODO List

Aktuální seznam otevřených úkolů a vylepšení k realizaci.

---

- [ ] **1. Ověření a zobrazení záložky MagicGate i pro podpoložky**
  - Upravit podmínku hasMagicGateItem v src/components/SettingsModal.tsx, aby kontrolovala nejen kořenové položky, ale i vnořené prvky v options:
    `	s
    const hasMagicGateItem = items.some((i) =>
      i.settings === 'magicgate' || i.options?.some((opt) => opt.settings === 'magicgate')
    );
    `
  - Ověřit zobrazení záložky *MagicGate účet* po načtení API endpointu se skupinami klientů.

- [ ] **2. Našeptávání nainstalovaných programů Windows (priorita 99)**
  - Implementovat prohledávání zástupců (.lnk) ze Start Menu:
    - %ProgramData%\Microsoft\Windows\Start Menu\Programs
    - %AppData%\Microsoft\Windows\Start Menu\Programs
  - Extrakce reálných systémových ikon programů přes pp.getFileIcon().
  - Spouštění přes shell.openPath().
  - Nastavit prioritu na 99 (decentně pod firemními záložkami).
  - Přidat volitelný přepínač do Nastavení (*Obecné*): „Našeptávat nainstalované programy Windows“ (zapnuto/vypnuto v config.json).

- [ ] **3. Získání seznamu osob v Google Workspace (analýza a integrace)**
  - Zjistit možnosti načtení kontaktů / adresáře uživatelů z Google Workspace (Google People API / Directory API / export).
  - Návrh konfigurace přihlášení / tokenu v nastavení aplikace.
  - Využití pro našeptávání osob, e-mailů a rychlé akce (Gmail, Chat).

- [ ] **4. Přepracování zobrazení Nastavení (levé vertikální menu)**
  - Vymyslet nový layout okna Nastavení s levým vertikálním sidebarem namísto horních záložek.
  - Příprava na přibývající sekce (Zdroje dat, MagicGate, MLog, Google Workspace, Programy, Obecné, Nápověda).

- [ ] **5. Analýza desktopové aplikace Google Chat (přenos vyhledávacího querystringu)**
  - Zanalyzovat desktopového klienta Google Chatu (PWA / Electron / systémové URL schéma).
  - Zjistit možnosti deep linku s předvyplněným vyhledáváním nebo otevřením konverzace (např. googlechat://, specifické URL parametry).

- [ ] **6. Integrace a napojení na data Woxu**
  - Zjistit, kde přesně má původní Wox uložena data a konfiguraci (JSON soubory v %APPDATA%\Wox).
  - Prozkoumat strukturu a navrhnout možnost přímého čtení / automatické synchronizace dat z Woxu do IADonkey.

- [ ] **7. Google Search integrace (priorita 100 a prefix google:)**
  - Nastavení zapnutí / vypnutí Google Search v Nastavení.
  - Priorita 100 – při psaní libovolného dotazu vždy na konci seznamu nabídne „Hledat na Google: <dotaz>“.
  - Speciální prefix google: (např. google: vyhledavany text) okamžitě vyfiltruje seznam na jediný záznam pro přímé vyhledání na Google.
  - Spuštění: otevření výchozího prohlížeče s https://www.google.com/search?q=....

- [ ] **8. Systém textových snippetů a nová akce "paste" (prefix :)**
  - Zobrazování snippetů **výhradně** při zadání prefixu : (např. :iban, :ico, :podpis, :regards) – bez dvojtečky jsou skryté.
  - Načítání definic snippetů z API endpointů nebo lokálních JSON souborů (`action: "paste"`).
  - Realizace akce `paste`:
    - Uložení textu snippetu do schránky (clipboard.writeText).
    - Skrytí okna IADonkey -> Windows automaticky vrátí fokus do předchozí aplikace (Word, Slack, browser).
    - Vyvolání syntetického vložení (<kbd>Ctrl+V</kbd>) pomocí Windows API / PowerShell SendKeys.

- [ ] **9. Dynamické systémové snippety (:today, :time, :tomorrow, :guid)**
  - Přímo vestavěné generátory dynamických hodnot bez nutnosti konfigurace v JSONu:
    - :today / :dnes -> aktuální datum (DD. MM. YYYY / ISO)
    - :time / :cas -> aktuální čas (HH:mm:ss)
    - :tomorrow / :zitra -> zítřejší datum
    - :guid / :uuid -> nově vygenerovaný náhodný UUID v4
  - Živý náhled generované hodnoty v popisku položky s akcí "paste" na Enter.
