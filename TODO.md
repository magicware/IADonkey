# IADonkey – TODO List

Aktuální seznam otevřených úkolů a vylepšení k realizaci.

---

- [ ] **1. Analýza měřítka a integrace do spotlightu a nastavení**
  - Prověřit možnosti pravítka / měření vzdáleností a rozměrů na obrazovce (pixel ruler / screen scale) s možností vyvolání z launcheru a nastavení parametrů.

- [x] **2. Integrace výstřižků obrazovky (QuickCap)**
  - Vytvoření subrozšíření QuickCap v rámci DonkeyTools.
  - Globální nastavitelná klávesová zkratka a příkazy ve Spotlightu (`/quickcap`, `/cap`, `/vystrizek`, `/snip`, `/fastsnap`, `/snap`).
  - Celoobrazovkový výběr obdélníkové oblasti s live rozměry v px a ztmaveným pozadím.
  - Automatické uložení PNG do uživatelské složky a vložení do schránky (`clipboard.writeImage`).
  - Správce výstřižků v Nastavení: nastavení cílové složky, tlačítko pro otevření v Průzkumníku, galerie posledních 10 výstřižků (znovu zkopírovat, smazat, zobrazit ve složce).

- [ ] **3. Integrace multi-schránky na styl Ditto (EasyClip)**
  - Vytvoření subrozšíření EasyClip v rámci DonkeyTools.
  - Sledování schránky, historie 100 záznamů, deduplikace a posun na vrchol.
  - Plovoucí kompaktní okno s klávesovou navigací, vyhledáváním a vícenásobným výběrem pomocí Shift.
  - Zachování fokusu a automatické vložení (auto-paste): uložení aktivního okna, skrytí EasyClip, návrat fokusu a syntéza `Ctrl+V`.

- [ ] **4. Analýza systémových notifikací**
  - Prověřit možnosti a chování systémových notifikací v OS Windows (Electron Notification API / native toast notifikace).
  - Navrhnout integraci do IADonkey (upozornění na dokončení synchronizace, pořízení výstřižku QuickCap, aktualizace, chyby).
  - Zvážit možnosti uživatelského nastavení a chování při tichém režimu.

- [ ] **5. Vyřešit problém s backdropem u okna Release Notes**
  - Opravit černé pozadí pod oknem Release Notes, které je uřízlé / neodpovídá zaoblení okna či hranicím obsahu.
  - Prověřit nastavení Electron okna (backgroundColor, transparent), stíny a backdrop v CSS.
