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

- [ ] **3. Analýza GitHub přepínače mezi OAuth a Personal Credentials**
  - Navrhnout a implementovat přepínač mezi přihlášením přes GitHub OAuth a osobním tokenem/údaji.
  - Stav přepínače perzistovat v konfiguraci a podle něj dynamicky řídit způsob autentizace a volání GitHub API.

- [ ] **4. Analýza MagicGate: přepínač mezi XML souborem a API GET**
  - Navrhnout přepínač mezi načítáním ze souboru XML a online API GET požadavkem s autentizací (pravděpodobně MagicGate credentials).
  - Připravit následné dynamické mapování příchozích dat s fixním nastavením ikon MagicGate (jakmile bude API k dispozici).

- [ ] **5. Analýza vývojářského režimu (isDevelop) s odemykáním 10× kliknutím**
  - Zavést parametr `isDevelop` do lokálního úložiště (ve výchozím stavu `false`).
  - Při 10násobném kliknutí na číslo verze v záložce Aktualizace přepnout na `true`.
  - Po aktivaci zobrazit novou záložku pod Nápovědou určenou pro ladicí nástroje (debug).
  - V této záložce nabídnout možnost vypnutí `isDevelop` (`false`), čímž se záložka opět skryje (opětovné odemknutí opět přes 10× klik na verzi).

---

## ✅ Dokončené úkoly (čekající na kontrolu / revizi)

*(Žádné dokončené úkoly nečekají na kontrolu – všechny byly ověřeny a smazány)*
