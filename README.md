# IADonkey – Windows Launcher & Quick Access

IADonkey je lehký, vysoce výkonný launcher pro systém Windows inspirovaný nástrojem **Wox** a **Spotlight**. Běží na pozadí v oznamovací oblasti (system tray), otevírá se pomocí globální klávesové zkratky a umožňuje okamžité vyhledávání v lokálních i vzdálených datech.

---

## Hlavní funkce

1. **Spotlight vyhledávací okno uprostřed aktivního monitoru**:
   - Spouští se výchozí klávesovou zkratkou **`Alt+Space`** (nebo jakoukoliv jinou nastavenou v konfiguraci).
   - Automaticky se vycentruje na monitor, na kterém se v okamžiku stisku nachází kurzor myši.
   - Plynulá navigace šipkami nahoru/dolů, klávesou `Enter` pro spuštění a `Esc` pro skrytí okna.

2. **Našeptávání od 2 znaků a řazení dle priority**:
   - Po napsání 2 znaků okamžitě filtruje položky ze všech připojených zdrojů.
   - Řazení probíhá dle atributu `priority` vzestupně (menší číslo = vyšší priorita).
   - Dvou-sloupcové rozvržení (Wox styl):
     - **Levý sloupec**: Ikona (Google Material Symbol) nebo vlastní obrázek (`image` přebíjí ikonu).
     - **Pravý sloupec**: Název (`name`) a umístění / cesta (`location`).

3. **Integrovaná kalkulačka (priorita -1)**:
   - Pokud dotaz obsahuje matematický nebo logický výraz (např. `12 * 8`, `(100 - 20) / 4`, `sqrt(144)`, `2 ^ 8`, `10 > 5`), kalkulačka se okamžitě zobrazí na **první pozici (priorita -1)**.
   - Stiskem `Enter` zkopírujete výsledek do schránky.

4. **Přímé otevírání webových stránek (priorita 999)**:
   - Pokud dotaz odpovídá URL adrese nebo doméně (např. `brenna.istour.cz`, `www.brenna.cz`, `localhost:3000`), nabídne se otevření v prohlížeči s prioritou 999.

5. **Více zdrojů dat (lokální JSON soubory & vzdálená GET API)**:
   - Podpora neomezeného množství lokálních JSON souborů na disku.
   - Podpora vzdálených GET API endpointů s možností autentizace:
     - **Bez přihlášení**: Standardní GET request.
     - **S přihlášením (`getToken` metoda)**: Před stažením dat pošle POST request na konfigurovanou Token URL a získaný Bearer token automaticky použije v hlavičce `Authorization: Bearer <token>`.

6. **Automatická detekce MagicGate**:
   - Pokud importovaná data obsahují alespoň jeden záznam s `settings: "magicgate"`, v Nastavení se automaticky aktivuje sekce **MagicGate účet** pro zadání a bezpečné lokální uložení přihlašovacích údajů (`username` a `password`).

7. **Systém aktualizací s 24hodinovým připomínáním**:
   - Aplikace kontroluje zadanou URL s JSON manifestem (při startu a každých 24 hodin).
   - Dialog s volbami: **Aktualizovat nyní** (přechod na instalátor) nebo **Připomenout za 24h** (odloží upozornění na 24 hodin).

---

## Datová struktura položek (JSON)

Všechny JSON soubory a výstupy z API musí obsahovat pole objektů s touto strukturou:

```json
[
  {
    "name": "MagicGate Administrace",
    "location": "https://magicgate.internal.corp/admin",
    "action": "open",
    "icon": "shield",
    "image": null,
    "priority": 1,
    "settings": "magicgate"
  },
  {
    "name": "Poznámkový blok",
    "location": "C:\\Windows\\notepad.exe",
    "action": "open",
    "icon": "edit_note",
    "priority": 10,
    "settings": null
  }
]
```

### Specifikace polí:
- `name` *(string, povinné)*: Zobrazovaný název položky.
- `location` *(string | null)*: URL adresa nebo cesta k souboru/aplikaci na disku.
- `action` *(string | null, default "open")*: Provede otevření v prohlížeči nebo spuštění programu.
- `icon` *(string | null, default "code")*: Identifikátor ikony ze sady [Google Material Symbols](https://fonts.google.com/icons).
- `image` *(string | null)*: URL adresa obrázku / loga. Pokud je vyplněna, má přednost před ikonou.
- `priority` *(integer | null, default 0)*: Číslo priority. Menší číslo = vyšší pozice ve výsledcích.
- `settings` *(string | null)*: Identifikátor nastavení (např. `"magicgate"`).

---

## Spuštění a vývoj

### Požadavky:
- Node.js (v18+) a npm

### Příkazy:
```bash
# Instalace závislostí
npm install

# Spuštění ve vývojovém režimu (s horkým znovunačtením)
npm run dev

# Sestavení produkční verze
npm run build
```

---

## Struktura projektu

- `electron/`
  - `main.ts` – Životní cyklus Electronu, Tray ikona, registrace globální zkratky, časovače na pozadí.
  - `windowManager.ts` – Správa Spotlight okna, vycentrování na monitor s kurzorem, skrytí při ztrátě fokusu.
  - `dataSync.ts` – Tichá synchronizace lokálních JSON souborů a API (s getToken autentizací).
  - `store.ts` – Lokální úložiště konfigurace a mezipaměti položek v `app.getPath('userData')`.
  - `updater.ts` – Kontrola nových verzí z URL s 24h odkladem.
  - `preload.ts` – Bezpečný IPC bridge mezi procesy.
- `src/`
  - `components/SearchSpotlight.tsx` – Rozhraní vyhledávače ve stylu Woxu.
  - `components/SettingsModal.tsx` – Nastavení zdrojů, klávesové zkratky a MagicGate.
  - `components/UpdateDialog.tsx` – Dialog nové verze.
  - `utils/calculator.ts` – Bezpečná kalkulačka (priorita -1).
  - `utils/urlHelper.ts` – Detekce URL adres (priorita 999).
- `samples/`
  - `demo-items.json` – Ukázkový soubor pro okamžité otestování.
