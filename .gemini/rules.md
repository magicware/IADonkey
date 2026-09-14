# Pravidla vývoje a standardy IADonkey (Development & UI Guidelines)

Tento dokument definuje závazná pravidla pro vývoj, verzování, changelog a vizuální styl aplikace **IADonkey**.  
**Každý vývojář i AI asistent pracující na tomto repozitáři je povinen se těmito pravidly řídit.**

---

## 1. Verzování a průběžný changelog

### Průběžný zápis do changelogu
- **Žádná úprava nesmí být dokončena bez aktualizace changelogu!**
- Při jakémkoliv přidání funkce, úpravě logiky, refaktoringu či opravě chyby je nutné **ihned průběžně** zaznamenat změny do:
  1. `src/changelog.ts` – pole `CHANGELOG_HISTORY` a proměnná `CURRENT_APP_VERSION`.
  2. `CHANGELOG.md` – markdown dokumentace změn.
  3. `package.json` – pole `"version"`.
  4. `version.json` – verze pro integrovaný updater.

### Pravidlo pro inkrementaci verze
- Pokud uživatel nespecifikuje konkrétní číslo verze, automaticky navyšujeme verzi o **+0.0.1** (patch increment), např. z `1.0.1` na `1.0.2`.
- Changelog se vždy připravuje pro **nadcházející verzi**, která se aktuálně vyvíjí.

### Styl zápisu changelogu
- Changelog je určený **pro koncové uživatele**, nikoliv jako interní git commit log.
- Psát **česky**, srozumitelně, věcně a s důrazem na to, co novinka uživateli přináší a jak ji ovládat.
- Vyvarovat se nicneříkajícího interního žargonu typu „refaktorován useEffect v komponentě X".

### Postup buildu a releasu
1. Ověřit bezchybnou kompilaci projektu: `npm run compile`.
2. Zkontrolovat, že jsou v changelogu zapsány všechny body z aktuální iterace.
3. Připravit podklady pro release (souhrn novinek).
4. Sestavení spustitelného balíčku / spuštění `scripts/release.mjs` nebo předání uživateli k manuálnímu releasu.

---

## 2. Vizuální standardy aplikace (UI & Design System)

Všechny komponenty, nastavení a dialogy musí zachovávat 100% vizuální integritu a jednotný styl:

### A. Přepínače (Switches / Toggles)
- **Vždy** se používá jednotný styl zavedený v záložce *Obecné* (`src/components/SettingsModal.tsx`).
- Nikdy nepoužívat tlusté, hranaté nebo jinak stylizované přepínače!
- **Standardní markup přepínače:**
  ```tsx
  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
    <input
      type="checkbox"
      checked={isChecked}
      onChange={(e) => setIsChecked(e.target.checked)}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
  </label>
  ```

### B. Výběr souborů a složek (File & Folder Pickers)
- Vizuál výběru složky i souboru musí být jednotný podle vzoru z MagicGate:
  - Výška všech navazujících prvků je přesně **`h-[38px]`**.
  - Textové pole pro cestu (input):
    `h-[38px] flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono`
  - Tlačítko pro výběr (*Procházet...*):
    `h-[38px] px-3.5 border border-indigo-500/40 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white rounded-lg text-[13px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0`
    s ikonou `<span className="material-symbols-outlined text-[18px] leading-none">folder_open</span>`.
  - Tlačítko pro vymazání cesty (červený čtverec):
    `w-[38px] h-[38px] flex items-center justify-center text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition cursor-pointer shrink-0`
    s ikonou `<span className="material-symbols-outlined text-[18px] leading-none">delete</span>`.

### C. Struktura karet v Nastavení (Settings Cards)
- Nastavení nesmí být slité do jednoho nepřehledného formuláře. Jednotlivé logické části se dělí do samostatných karet:
  - Třída karty: `p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3`
  - Hlavička karty obsahuje ikonu a název:
    ```tsx
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-indigo-400 text-lg">settings_suggest</span>
      <span className="text-sm font-semibold text-white">Název sekce</span>
    </div>
    <p className="text-xs text-white/50">Stručný a srozumitelný popis.</p>
    ```
- **Akční tlačítka (např. *Otestovat připojení*):**
  - Nikdy neumisťovat dovnitř konfiguračního boxu!
  - Patří vždy **mimo sekce pod ně**, ideálně přes celou šířku nebo jako výrazné akční tlačítko se zpětnou vazbou (spinner, úspěch, chyba).

### D. Klávesové zkratky a chování položek
- <kbd>Enter</kbd>: Spustit primární akci položky (otevřít URL, spustit aplikaci, vložit snippet).
- <kbd>Shift + Enter</kbd>: Zobrazit nabídku **Akcí a informací (`actions` + `info`)** položky (např. git clone, otevření repozitáře, podrobné parametry serveru, databáze apod.). Nepočítají se do vyhledávání ani do počtu položek.
- <kbd>Alt + Enter</kbd>: Zobrazit **Podvolby (`options`)** položky (např. instance MagicGate, podsložky se samostatným vyhledáváním).
- <kbd>Ctrl + Enter</kbd>: Okamžité rychlé spuštění 1. podvolby položky.
- <kbd>Escape</kbd>: Vyčistit hledání / návrat z podvoleb a akcí / zavřít okno.

### E. Závazné pravidlo pro novou zkratku a úpravu zkratek
- **Kdykoliv se mění, přidává nebo upravuje klávesová zkratka či interakce, je povinné převést a zaktualizovat texty na všech těchto místech:**
  1. **Nápověda v Nastavení (`src/components/SettingsModal.tsx` v záložce `help`)** – sekce *Ovládání a klávesové zkratky* musí přesně odpovídat reálnému chování kláves.
  2. **Patička a nápovědné čipy ve vyhledávači (`src/components/SearchSpotlight.tsx`)** – zkratky zobrazené v patičce a v nápovědách na vybrané položce.
  3. **Changelog a dokumentace** – zapsat změnu do `src/changelog.ts`, `CHANGELOG.md` a `DEVELOPMENT.md`.
- V nápovědě ani v UI **nesmí nikdy zůstat staré nebo neplatné zkratky**!

### F. Ikony a centrování
- Vždy používat font Google Material Symbols Outlined (`material-symbols-outlined`).
- V seznamech položek dbát na přesné vycentrování uvnitř obalu (`w-9 h-9 flex items-center justify-center`) a rozměr `text-[20px]`, aby ikony opticky seděly s faviconami a obrázkovými ikonami.

### G. Čipy (tagy) položek a indikace Akcí a Informací
- Každá položka může mít definovány **Akce** (`actions: []`) a/nebo **Informace** (`info: {}`):
  - Kde jsou jen akce: zobrazí se seznam akcí.
  - Kde je jen info: vyvoláním se zobrazí přehledný panel s informacemi (s možností kopírování jednotlivých parametrů).
  - Kde jsou akce + info: nahoře se zobrazí seznam akcí a pod nimi sekce s podrobnými informacemi.
- **Vizuální indikace čipů**:
  - Pokud již položka má svůj primární čip (např. `Git`, `MagicGate`), **nevytváří se samostatný čip**! Ikona akce (`bolt`) nebo infa (`info`) se vloží přímo do stávajícího čipu (např. `[ ⚡ Git ]`, `[ ℹ MagicGate ]`).
  - Pouze v případě, že položka má akce/info a **nemá žádný jiný čip**, zobrazí se samostatný fialový čip `[ ⚡ Akce ]` nebo `[ ℹ Info ]`.
- **Podpora pro vzdálené JSON a API zdroje**:
  - Logika `actions` i `info` je plně začleněna do normalizace v `dataSync.ts` – jakýkoliv JSON soubor či API endpoint může obsahovat pole `actions` a objekt `info` a bude v aplikaci plnohodnotně fungovat.
