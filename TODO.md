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

---

## ✅ Dokončené úkoly (čekající na kontrolu / revizi)

- [x] **3. Vyřešit problém s backdropem u okna Release Notes**
  - Implementována Varianta 1: Odstraněn ostrý černý obdélníkový backdrop (`fixed inset-0 bg-black/80`), nahrazen transparentním kontejnerem a při zobrazení dialogu je skryt podkladový Spotlight. Okno plave čistě se zaoblenými rohy (`rounded-2xl`), vlastním stínem a podporou zavření klávesou `Escape`.
  - *Poznámka (Varianta 2 k předělání v případě nespokojenosti)*: Pokud by plovoucí zobrazení v rámci Spotlightu (740×540 px) nestačilo nebo nevyhovovalo, vytvořit pro Release Notes samostatné dedikované Electron okno (např. 720×560 px) s vlastním záhlavím a rámečkem nezávislým na launcheru.

- [x] **4. Redesign SplashScreenu (Photoshop-style layout na výšku)**
  - Úprava okna na vertikální formát (360×520 px), zarovnání vlevo, zvětšená ikona (68 px), velký bílý název IADonkey, barevná verze v mono písmu, obecný 2-větný popis a spodní copyright `© 2026 Petr Coolhanek`. Rámeček a zaoblení sladěno se Spotlightem (`border-white/10`, `rounded-2xl`).
