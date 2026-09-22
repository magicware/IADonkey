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

- [ ] **3. Chování stisku Enter po dokončení stahování (otevřít v průzkumníku + reset spotlightu)**
  - V modálních oknech Git, MagicGate a CMSinFS zdrojové kódy změnit chování stisku klávesy Enter po úspěšném stažení na otevření v Průzkumníku Windows.
  - Výhradně při tomto Enteru okno zavřít a resetovat Spotlight.

- [ ] **4. Zmenšení výšky SplashScreenu**
  - Zmenšit výšku okna úvodní obrazovky (SplashScreen) přibližně o 50 px.

- [ ] **5. Rozšíření kontextového menu ikony v oznamovací oblasti (Tray icon)**
  - Do nabídky po kliknutí pravým tlačítkem myši na ikonu v liště Windows (tray) přidat přímé akce pro spuštění nástrojů QuickCap (výstřižek) a ColorMaster (kapátko / eyedropper).

- [ ] **6. Oprava zobrazení synchronizační notifikace z Tray ikony**
  - Pokud uživatel vyvolá synchronizaci kliknutím v kontextovém menu tray ikony, opravit chybějící zobrazení systémové synchronizační notifikace.

- [ ] **7. Stavový indikátor DonkeyTools v záložce Rozšíření**
  - V hlavní záložce Rozšíření u karty DonkeyTools upravit čip:
    - Pokud je aktivní 1 a více nástrojů: zelená barva s textem „x nástrojů aktivní“.
    - Pokud je aktivních 0 nástrojů: červená barva s textem „Nenakonfigurováno“.

- [ ] **8. Analýza GitHub přepínače mezi OAuth a Personal Credentials**
  - Navrhnout a implementovat přepínač mezi přihlášením přes GitHub OAuth a osobním tokenem/údaji.
  - Stav přepínače perzistovat v konfiguraci a podle něj dynamicky řídit způsob autentizace a volání GitHub API.

- [ ] **9. Analýza MagicGate: přepínač mezi XML souborem a API GET**
  - Navrhnout přepínač mezi načítáním ze souboru XML a online API GET požadavkem s autentizací (pravděpodobně MagicGate credentials).
  - Připravit následné dynamické mapování příchozích dat s fixním nastavením ikon MagicGate (jakmile bude API k dispozici).

- [ ] **10. Oprava zdvojené synchronizace dat v záložce Zdroje dat**
  - Odstranit zdvojenou informaci / tlačítko synchronizace v Nastavení -> Zdroje dat.
  - Zachovat pouze správné zobrazení v bublině „Poslední synchronizace ...“.

- [ ] **11. Číselný indikátor chybových protokolů na záložce Nápověda**
  - Na záložku Nápověda v Nastavení přidat červený číselný indikátor (odznak/badge, analogicky k počtu zdrojů na záložce Zdroje dat), který se zobrazí při výskytu 1 a více chyb v protokolu.

- [ ] **12. Analýza vývojářského režimu (isDevelop) s odemykáním 10× kliknutím**
  - Zavést parametr `isDevelop` do lokálního úložiště (ve výchozím stavu `false`).
  - Při 10násobném kliknutí na číslo verze v záložce Aktualizace přepnout na `true`.
  - Po aktivaci zobrazit novou záložku pod Nápovědou určenou pro ladicí nástroje (debug).
  - V této záložce nabídnout možnost vypnutí `isDevelop` (`false`), čímž se záložka opět skryje (opětovné odemknutí opět přes 10× klik na verzi).

- [ ] **13. Přejmenování záložky Aktualizace na „Systém“ a přesun chybových protokolů**
  - Přejmenovat záložku „Aktualizace“ v Nastavení na „Systém“.
  - Přesunout sekci Chybové protokoly ze záložky Nápověda na konec záložky Systém.
  - Vyřešit a navrhnout chování dvou souběžných indikátorů na jedné záložce: „Chyba“ vs. „Nová verze“.

---

## ✅ Dokončené úkoly (čekající na kontrolu / revizi)

*(Žádné dokončené úkoly nečekají na kontrolu)*
