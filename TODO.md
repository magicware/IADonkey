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

- [ ] **3. Stažení zdrojových kódů CMSinFS (dle předlohy z Woxu)**
  - **Analýza z Wox.MagicGate (`WebContentDownloader`)**:
    - Ve Woxu existovala akce *„Stáhnout zdrojáky webu (pro PRG)“* se subtitle *„Stáhne CMSinFS zdrojáky webu do c:\inetpub\wwwroot\MW-M2G-02\FileSystem\CmsContent\“*.
    - Volá POST na endpoint administrace instance `{adminUrl}/CmsFsContentHandler.ashx` s hlavičkami `X-UserName`, `X-Password` a `X-Method: GetContent`.
    - Server vrací binární ZIP archiv (`application/zip`) obsahující kompletní souborovou strukturu CMSinFS dané instance.
  - **Navržené řešení k implementaci v IADonkey**:
    - Implementovat backend službu v Electronu (např. `downloadInstanceCmsContent(adminUrl, options)` v `magicGateService.ts`).
    - Stáhnout ZIP stream, vyčistit cílovou složku a bezpečně extrahovat soubory.
    - Cílovou složku umožnit konfigurovat v Nastavení -> Rozšíření -> MagicGate (s výchozí hodnotou `c:\inetpub\wwwroot\MW-M2G-02\FileSystem\CmsContent\`).
    - Přidat novou akci do nabídky akcí instance ve Spotlightu (Shift+Enter / klik na akce): *„Stáhnout CMSinFS zdrojáky (pro PRG)“*.
    - Zobrazit průběh stahování/rozbalování a po dokončení zobrazit notifikaci s tlačítkem na otevření složky v Průzkumníku.

---

## ✅ Dokončené úkoly (čekající na kontrolu / revizi)

*(Všechny dokončené úkoly byly zkontrolovány a schváleny v CheckListu)*
