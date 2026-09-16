# IADonkey – TODO List

Aktuální seznam otevřených úkolů a vylepšení k realizaci.

---

- [x] **1. Odstranit chip label „Aktuální sestavení“ v menu Aktualizace v Nastavení**
  - V záložce *Aktualizace* (`SettingsModal.tsx`) odstranit badge / chip label „Aktuální sestavení“.

- [x] **2. Úprava textu v okně „K dispozici je nová verze“**
  - V modálu dostupné aktualizace upravit textaci odrážky: změnit `Přehled všech změn naleznete...` na `Přehled všech změn po aktualizaci naleznete...`.

- [x] **3. Analýza a oprava restartu aplikace při instalaci nové verze**
  - Při kliknutí na tlačítko „Restartovat a spustit novou verzi“ se program úplně nezavře (restartuje se a ještě před samotnou instalací se znovu spustí stará verze) – analyzovat a zajistit korektní ukončení procesu Electronu před spuštěním instalačního balíčku.

- [x] **4. Vlastní design instalačního okna (NSIS grafické podklady a konfigurace)**
  - Vygenerovány bitmapové podklady pro hlavičku (150x57) a uvítací/dokončovací panel (164x314) v tmavém motivu IADonkey.
  - V `package.json` nakonfigurován NSIS instalátor s custom assety a vlastním průvodcem instalací.

- [ ] **5. Změna ikony aplikace (manuální design)**
  - Nasazení nové finální ikony aplikace do assetů a sestavení (`build/icon.ico` atd.).

- [x] **6. Oprava deformace ikony hvězdiček v modálu „Co je nového“**
  - V modálu po aktualizaci opravit zkreslení / deformaci ikony hvězdiček u titulku okna (přidat `shrink-0` a zkontrolovat zarovnání).

- [x] **7. Tlačítko „Znovu načíst pole“ ve zdrojích dat na jeden řádek**
  - V nastavení zdrojů dat u tlačítka pro znovunačtení polí nastavit `whitespace-nowrap`, aby se text nezalamoval.

- [x] **8. Věrná simulace Spotlight náhledu pro 1. položku JSON souboru**
  - V detailu JSON zdroje dat upravit vizuál náhledu 1. položky tak, aby přesně simuloval řádek výsledku ve Spotlight vyhledávači.

- [x] **9. Komponenta výběru ikonky s náhledem a vyhledáváním**
  - Vytvořen výběr Material ikon s živým vyhledáváním, podporou dotazů bez diakritiky a vizuálním náhledem.
  - Rozsáhlý katalog výchozích Material Symbols s možností stažení kompletního online katalogu z Google Fonts (3 900+ unikátních ikon bez duplicit).
  - Opraveno odsazení vstupního pole (text nezačíná pod ikonou lupy), odstraněno zadávání vlastního názvu.
  - Výběr ikon plně integrován do 1. části (společné parametry) i 2. části editoru statických dat; výška všech formulářových polí sjednocena na 38 px.
  - V záložce *Aktualizace* přidána možnost ručního stažení kompletního katalogu Material Symbols přímo z Google Fonts (kategorie, štítky, datum a čas posledního stažení a počet uložených ikon).
  - Zvětšen font vyhledávání (14px), zvětšeny ikony na 32px (`text-3xl`), zvětšen font názvů na 11px a mřížka upravena na 6 ikon na řádek.

- [x] **10. Průvodce „Jak na zdroje dat“ – 3. ukázka Git v barvě GitHub extension**
  - V záložce *Kopírovatelné ukázky* upravit 3. položku (Git) po vzoru ukázky č. 4 (MagicGate), ale v zelené barvě GitHub rozšíření.

- [x] **11. Průvodce „Jak na zdroje dat“ – aktualizace textu u MagicGate XML**
  - V záložce *MagicGate XML Model* upravit text bodu 3: z XML již nevytahujeme pouze předem definované atributy, ale automaticky všechna dostupná metadata (info).

- [ ] **12. Analýza API pro získání projektů v instanci MagicGate (m2g)**
  - Prověřit možnosti API endpointů pro načtení projektů v dané instanci MagicGate.

- [x] **13. Vertikální vycentrování křížku zavření v modálu „Jak na zdroje dat“**
  - V hlavičce modálu `DataSourcesGuideModal` vycentrovat zavírací křížek v ose Y.

- [x] **14. Úprava textace snippetů v záložce Obecné**
  - U popisu spouštění dvojtečkou změnit formulaci: uvést, že hodnota se nenabídne k vložení do vyhledávače, ale přímo se zkopíruje do schránky.

- [x] **15. Přejmenování pole „Adresa / Sídlo“ na „Adresa“**
  - V záložce *Obecné* v nastavení snippetů zjednodušit popisek na *Adresa*.

- [ ] **16. Analýza možnosti definice snippetů ve zdrojích dat**
  - Analyzovat, zda lze snippety definovat a načítat v rámci zdrojů dat, určit jejich JSON strukturu a případně ji doplnit do ukázek v průvodci.

- [x] **17. Osobní snippety: přidání jména a sjednocení na „Moje ...“**
  - Do obecných snippetů přidána pole pro jméno (*Moje Jméno*), *Moje DIČ* (`:dic`, `:dič`, `:vat`) a *Můj E-mail* (`:email`, `:mail`, `:e-mail`).
  - Sjednoceny nadpisy a prezentace ve vyhledávači i v Nastavení na: *Moje IČO*, *Moje DIČ*, *Moje Jméno*, *Můj E-mail*, *Můj Telefon*, *Můj Podpis*, *Moje Adresa*.

- [x] **18. Changelog modal – přesun stručného textu verze na vlastní řádek**
  - V modálu historie verzí přesunout stručný popis verze (v primární barvě) na samostatný řádek přímo nad seznam bodů změn.

- [x] **19. Redesign karty výsledku testu GitHub připojení v Nastavení**
  - Karta výsledku testu i čárkovaný placeholder přesunuty přímo nad tlačítko *Otestovat připojení*.
  - Zrušen samostatný řádek *Nalezené organizace* a chipy organizací přesunuty na řádek *Přihlášený profil* hned za jméno profilu.
  - Informace o celkovém počtu repozitářů umístěna vpravo s velkou číslicí a textem *„repozitářů“*.
  - Profilový obrázek svisle vycentrován s celou kartou.

- [x] **20. Aktivace MLog rozšíření u čistě číselných dotazů již od 3 číslic**
  - Při psaní číslic bez prefixu T nebo R aktivovat MLog režim a generování úkolu T / požadavku R již od 3 číslic namísto 4 číslic (např. `123` -> T123 a R123).

- [x] **21. Zdroje dat v Nastavení: ikona u nadpisu „Mapování polí JSONu“ v primární barvě**
  - V záložce *Zdroje dat* (`SettingsModal.tsx`) obarvit ikonu u nadpisu sekce *Mapování polí JSONu* vybranou primární barvou motivu (primary accent).

- [x] **22. Zamezení rezervovaným klávesovým zkratkám pro globální zkratku**
  - V záložce *Obecné* v nastavení zamezit nastavení rezervovaných zkratek uvedených v nápovědě. V případě kolize novou zkratku nezapsat, ponechat původní funkční a zobrazit uživateli chybovou hlášku s vysvětlením kolize.
