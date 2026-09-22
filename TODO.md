# IADonkey – TODO List

Aktuální seznam úkolů projektu rozdělený na otevřené k realizaci a dokončené čekající na revizi.

---

## 📋 Otevřené úkoly (k realizaci)

- [ ] **1. Analýza měřítka a integrace do spotlightu a nastavení**
  - Prověřit možnosti pravítka / měření vzdáleností a rozměrů na obrazovce (pixel ruler / screen scale) s možností vyvolání z launcheru a nastavení parametrů.

- [ ] **2. Integrace multi-schránky na styl Ditto (EasyClip)**
  - Vytvoření subrozšíření EasyClip v rámci DonkeyTools.
  - Sledování schránky, historie 100 záznamů, deduplikace a posun na vrchol.
  - Plovoucí kompaktní okno s klávesovou navigací, vyhledáváním a vícenásobným výběrem pomocí Shift.
  - Zachování fokusu a automatické vložení (auto-paste): uložení aktivního okna, skrytí EasyClip, návrat fokusu a syntéza `Ctrl+V`.

- [ ] **2. Integrace multi-schránky na styl Ditto (EasyClip)**
  - Vytvoření subrozšíření EasyClip v rámci DonkeyTools.
  - Sledování schránky, historie 100 záznamů, deduplikace a posun na vrchol.
  - Plovoucí kompaktní okno s klávesovou navigací, vyhledáváním a vícenásobným výběrem pomocí Shift.
  - Zachování fokusu a automatické vložení (auto-paste): uložení aktivního okna, skrytí EasyClip, návrat fokusu a syntéza `Ctrl+V`.

---

## ✅ Dokončené úkoly (čekající na kontrolu / revizi)

- [x] **Stažení zdrojových kódů CMSinFS (dle předlohy z Woxu)**
  - V Nastavení -> Rozšíření -> MagicGate přidán konfigurační box „Cesta ke zdrojovým kódům instance“ s výběrem složky a popisem (výchozí stav: nevybráno).
  - Pokud cesta není vyplněna, akce se v možnostech instance nenabízí; pokud je vyplněna, zobrazuje se akce „Stáhnout CMSinFS zdrojáky (pro PRG)“ s ikonou ZIP a odkazem na cílovou složku.
  - Implementováno volání `{adminUrl}/CmsFsContentHandler.ashx` s hlavičkami `X-Method: GetContent` a přihlašovacími údaji MagicGate.
  - Bezpečné pročištění cílové složky, dekomprese ZIP archivu přes AdmZip, zápis do diagnostiky, systémová notifikace a otevření cílové složky v Průzkumníku Windows.
