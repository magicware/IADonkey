# IADonkey – TODO List

Aktuální seznam otevřených úkolů a vylepšení k realizaci.

---

- [x] **1. Analýza kapátka a integrace barev do spotlightu a nastavení**
  - Prozkoumat možnosti systémového kapátka pro výběr barvy odkudkoliv z obrazovky, integraci palety a barevných kódů (HEX, RGB, HSL) do Spotlight vyhledávače a nastavení aplikace.

- [x] **2. Oprava kapátka v produkčním buildu (Release)**
  - V produkčním buildu kapátko nefunguje a dochází pouze k probliknutí Spotlightu (pravděpodobně nesprávná cesta k `color-picker.exe` v zabalené aplikaci / asar archivu / resourcesPath).

- [x] **3. Diagnostický crashlog systém pro selhání akcí**
  - Ukládání detailních pádových a chybových logů (crashlogů) těchto akcí do vyhrazené složky `crashlog/` (datum, čas, chyba, stack trace, parametry).
  - Vytvořit zobrazení/prohlížeč crashlogů v sekci Nápověda (Help) pro okamžité zjištění příčiny problémů bez nutnosti spouštění aplikace z konzole.

- [x] **4. Logování prováděných akcí (Action Log) a jejich zobrazení**
  - Implementovat průběžný log všech vykonávaných akcí (spuštění nástrojů, klávesové zkratky, výběr barvy, přepínání oken, systémové příkazy).
  - Zobrazovat historii a stav proběhlých akcí v uživatelském rozhraní (např. v Help / diagnostice).

- [ ] **5. Analýza měřítka a integrace do spotlightu a nastavení**
  - Prověřit možnosti pravítka / měření vzdáleností a rozměrů na obrazovce (pixel ruler / screen scale) s možností vyvolání z launcheru a nastavení parametrů.
