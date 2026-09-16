# Seznam změn (Changelog) - IADonkey

Všechny důležité změny v této aplikaci jsou dokumentovány v tomto souboru. Formát vychází z uživatelsky srozumitelného přehledu novinek.

---

## [1.1.11] - 16. 9. 2026
### Photoshop-style čtvercový Splash Screen a automatická aktivace Spotlightu
- **Čistý čtvercový Splash Screen ve stylu Photoshopu**: Minimalistické tmavé čtvercové okno (260 × 260 px) se zaoblenými rohy, dominantní 48px ikonou maskota IADonkey uprostřed, názvem aplikace a štítkem verze.
- **Garantovaný 5sekundový čas zobrazení**: Splash screen běží minimálně 5 sekund, takže si uživatel stihne všimnout spuštění aplikace. Pokud načítání trvá déle, splash počká na skutečné dokončení.
- **Automatická aktivace Spotlightu po startu**: Jakmile uplyne 5s a aplikace je plně načtena v paměti, splash plynule zmizí a Spotlight se automaticky zobrazí, vycentruje na monitoru s myší a získá okamžitý fokus pro psaní dotazu.
- **Tichý start se systémem Windows**: Při spuštění na pozadí s Windows (`--background`, `--silent`, `--hidden`) se splash nezobrazuje a Spotlight zůstává skrytý v oznamovací oblasti.

## [1.1.10] - 16. 9. 2026
### 100% tichý restart po aktualizaci a nový Startup Splash Screen
- **100% tichý In-App restart bez probliknutí okna příkazové řádky**: Spuštění výměnného skriptu nově obstarává Windows Script Host (`wscript.exe` / `.vbs`) v GUI subsystému s příznakem `SW_HIDE`. Při restartu po aktualizaci již nikdy nedojde k alokaci ani probliknutí černé konzole cmd.exe.
- **Nový Startup Splash Screen**: Při spuštění aplikace (i po dokončení aktualizace) se zobrazí kompaktní elegantní mini-okno ve stylu IADonkey s oficiální ikonou maskota, verzí programu a indikátorem průběhu startu.
- **Živá indikace fází spouštění**: Plynulý indigovo-fialový progress bar a stavový text informují o fázích inicializace (načítání konfigurace, registrace klávesové zkratky `Ctrl+Alt+Space`, start služeb na pozadí a připravenost v oznamovací oblasti).
- **Plynulé skrytí do oznamovací oblasti**: Po dokončení inicializace mini-okno automaticky a plynule zmizí, přičemž aplikace běží připravena v tray liště pro okamžité vyvolání.
- **Chytré potlačení na pozadí**: Při automatickém startu se systémem Windows v tichém režimu (`--background`, `--silent`, `--hidden`) se splash okno nezobrazuje a uživatele neruší.

## [1.1.9] - 16. 9. 2026
### Full-Width layout instalačního průvodce a spolehlivá instalace
- **Full-Width moderní layout instalátoru**: Hlavička i patička nového instalátoru jsou roztaženy přes celou šířku okna pro čistý, prémiový a vzdušný vzhled.
- **Miniatura loga IADonkey v záhlaví**: Do horní lišty instalátoru byla doplněna miniatura oficiálního maskota IADonkey vedle názvu průvodce.
- **Přesun odznaku instalace bez UAC**: Odznak „Instalace bez UAC práv“ byl přesunut z bočního panelu do levé části globální patičky okna.
- **Bezpečné zamykání asar archivu**: Vyřešeno zamykání souboru `resources/app.asar` při instalaci náhradou monkey-patched `fs` za `original-fs`.
- **Atomický rename-swap a bezpečné ukončení instancí**: Pokročilé filtrování běžících instancí zabraňuje nechtěnému pádu instalátoru.

## [1.1.8] - 16. 9. 2026
### Vyladěný design instalátoru a oprava stability instalace
- **Větší a prostornější okno instalátoru**: Šířka zvětšena na 860 px a výška na 580 px pro optimální čitelnost a vzdušnost.
- **Oficiální ikona IADonkey**: V záhlaví instalátoru je umístěno oficiální logo aplikace IADonkey namísto obecné ikony rakety.
- **Čistý design kroků bez rušivých prvků**: Odstraněna vertikální spojovací čára a záře (glow) kolem aktivního kroku. Zvýšeno vertikální odsazení mezi jednotlivými kroky.
- **Větší a lépe čitelná typografie**: Zvětšeny fonty názvů a popisů kroků v postranním panelu, texty informačních bublin i popisky možností instalace.
- **Oprava pádu v kroku 3 (Instalace)**: Vyřešeno ukončování procesů v systému Windows, které v předchozí verzi nechtěně zasáhlo renderer instalátoru. Instalace nyní probíhá zcela plynule a spolehlivě od 0 do 100 %.

## [1.1.7] - 16. 9. 2026
### Moderní 4-krokový instalátor a blesková In-App aktualizace bez prodlevy
- **Samostatný moderní instalátor (React + Tailwind)**: Kompletní opuštění zastaralého Win32 NSIS. Nový instalátor je plnohodnotné tmavé frameless okno ve vizuálním stylu aplikace s vlastním záhlavím, ikonou s fialovou září a 4 přehlednými kroky (Vítejte → Nastavení cílové složky a zástupců → Průběh instalace s živým progress barem → Dokončeno se zaškrtávacím polem pro spuštění).
- **Plná systémová integrace do Windows**: Instalátor vytváří zástupce na Ploše a v nabídce Start pomocí Windows Script Host a registruje aplikaci do systémového Nastavení Windows (Přidat nebo odebrat programy) včetně korektní možnosti odinstalace.
- **Blesková In-App aktualizace (0.5s swap)**: Stažení i rozbalení aktualizace probíhá přímo v běžícím okně aplikace s živým tmavým progress barem a zobrazením fází rozbalování. Samotná výměna souborů při restartu trvá pouze 0,5 sekundy díky bleskovému swapu – uživatel již nikdy nečeká do prázdna ani nevidí žádná bílá okna.
- **Moderní odinstalátor**: Při odinstalaci přes systémové Nastavení se otevře moderní potvrzovací okno s čistým odebráním všech součástí programu a zástupců.

## [1.1.6] - 16. 9. 2026
### 100% tichý instalátor bez systémových oken a okamžitý start aplikace
- **Úplné potlačení systémového dialogu instalátoru**: Do jádra NSIS instalátoru byla přímo začleněna direktiva `SilentInstall silent`. Ani při ručním spuštění poklepáním v Průzkumníku Windows se již nezobrazuje žádné malé bílé systémové okénko s nápisem „Instaluje se, prosím vyčkejte...“ ani zelený proužek.
- **Okamžitý a plynulý start aplikace**: Po tichém rozbalení souborů na pozadí (cca 1–2 sekundy) instalátor rovnou spustí novou verzi aplikace IADonkey.
- **Bezpečné spuštění ze starších verzí**: Zajištěna plná zpětná kompatibilita při aktualizaci ze starších sestavení, která nepředávají tichý parametr – instalátor sám vynucuje tichý režim.

## [1.1.5] - 16. 9. 2026
### Tichá aktualizace na pozadí a moderní 1-Click instalátor
- **Tichá aktualizace na pozadí (Silent Background Update)**: Při kliknutí na „Restartovat a spustit novou verzi“ se již nezobrazuje zastaralý vícekrokový Win32 průvodce instalací. Aplikace se ukončí, instalátor během 1–2 sekund zcela tiše a neviditelně přepíše soubory (`/S --force-run --updated`) a novou verzi automaticky spustí.
- **Přechod na moderní 1-Click instalátor (`oneClick: true`)**: Při ručním spuštění nově staženého instalátoru (`.exe`) z GitHubu se aplikace nainstaluje na jediné kliknutí přímo do profilu uživatele bez zdržujících dialogů, bílých rámů a systémových tlačítek. Pro vlastní umístění je k dispozici Portable verze.
- **Čistý a nerušený zážitek**: Veškerá vizuální prezentace, novinky a seznam změn verze jsou zobrazovány přímo v nativním a plně přizpůsobeném tmavém prostředí aplikace (okno „Co je nového“ s barevnými akcenty a animacemi).

## [1.1.4] - 16. 9. 2026
### Kompletní vizuální redesign instalátoru Windows (NSIS) do tmavého motivu
- **Vizuální redesign instalačního průvodce Windows (NSIS)**: Instalační okno (`.exe`), které se spouští při ruční instalaci i po automatickém stažení aktualizace, bylo kompletně přestylováno do tmavého motivu odpovídajícího oknu Nastavení aplikace (`#1E1E28`).
- **Bezešvé bitmapové podklady**: Podkladové grafické prvky levého panelu (`installerSidebar.bmp`) i záhlaví (`installerHeader.bmp`) mají přesnou barvu `#1E1E28` a plynule navazují na podklad dialogu, čímž vzniká jednolitý a vizuálně čistý celek bez bílých okrajů.
- **Zaoblená karta s ikonou a ambientní záře**: Ikona IADonkey je na bočním panelu i v záhlaví prezentována v elegantní zaoblené kartě s jemnou indigo září (`#6366F1`) a vertikálním akcentním žebrem.
- **Tmavé ladění dialogů a ovládacích prvků**: Klientská plocha, výběr cílové složky i instalační ukazatel průběhu jsou sladěny do tmavých odstínů s indigo ukazatelem instalace.
- **Odstranění rušivých prvků**: Skryty ostré šedé Win32 horizontální linky a upraven brandingový text.

## [1.1.3] - 16. 9. 2026
### Vlastní snippety, import/export, katalog Material Symbols, plynulá synchronizace a vyladění UI
- **MLog číselné dotazy již od 3 číslic**: Zadání např. `123` do Spotlightu při aktivním MLogu automaticky nabídne úkol `T123` na 1. místě a požadavek `R123` na 2. místě.
- **Odstranění štítku „Aktuální sestavení“**: V záložce *Aktualizace* odstraněn nadbytečný badge pod nainstalovanou verzí.
- **Zpřesnění textu v okně aktualizace**: Úprava textu na *„Přehled všech změn po aktualizaci naleznete v aplikaci v záložce Nastavení -> Kompletní changelog.“*.
- **Oprava ikony v okně „Co je nového“**: Ikona hvězdiček se již při dlouhém titulku verze nezmenšuje ani nedeformuje.
- **Zdroje dat – tlačítko „Znovu načíst pole“**: Přidána ochrana proti nechtěnému zalomení textu tlačítka (`whitespace-nowrap`).
- **Průvodce „Jak na zdroje dat“**:
  - Ukázka č. 3 (Git) přestylována do zelené barvy rozšíření GitHub.
  - Bod 3 u MagicGate XML modelu upraven tak, že popisuje načítání všech dostupných atributů a metadat z XML.
  - Svislé vycentrování zavíracího křížku v záhlaví okna.
- **MagicGate XML model – podpora elementů `<Alias>`**: Při načítání podpoložek instancí MagicGate jsou nově kromě elementů `<App>` a `<Check>` načítány i elementy `<Alias Name="..." Url="..." />` se stejným mapováním a funkcionalitou (otevření URL, načítání favicony atd.).
- **Nastavení – záložka Obecné**:
  - Popisek formulářového pole zkrácen na *Adresa*.
  - Nápověda snippetů zpřesněna o informaci, že hodnota se přímo zkopíruje do schránky.
- **Historie verzí (Changelog)**: Stručný popis verze přesunut na samostatný řádek nad seznam odrážek pro vyšší čitelnost.
- **Zdroje dat – barva ikony v mapování**: Ikona u nadpisu sekce *Mapování polí JSONu* sladěna do vybrané primární barvy motivu.
- **Osobní snippety**: Přidáno nové pole *Moje Jméno* (zkratky `:jmeno`, `:jméno`, `:name`), *Moje DIČ* (`:dic`, `:dič`, `:vat`) a *Můj E-mail* (`:email`, `:mail`, `:e-mail`). Všechny osobní snippety jsou sjednoceny v Nastavení i Spotlightu na *Moje IČO*, *Moje DIČ*, *Moje Jméno*, *Můj E-mail*, *Můj Telefon*, *Můj Podpis* a *Moje Adresa*.
- **Karta výsledku testu GitHubu nad tlačítkem**: Výsledek testu i čárkovaný placeholder přesunuty přímo nad tlačítko *Otestovat připojení*. Zrušen samostatný řádek organizací a štítky přesunuty přímo za jméno profilu; vpravo přidán svisle vycentrovaný přehled počtu repozitářů s velkou číslicí; profilová fotka svisle vycentrována s celou kartou.
- **Věrná simulace Spotlight náhledu ve zdrojích dat**: Náhled 1. položky s aktuálním mapováním v JSON zdrojích nyní přesně simuluje vzhled skutečného řádku Spotlightu včetně ikony položky, štítku akce a klávesy provést.
- **Ochrana před kolizí globální zkratky**: V záložce *Obecné* je zamezeno nastavení rezervovaných klávesových zkratek uvedených v nápovědě (`Shift+Enter`, `Alt+Enter`, `Ctrl+Enter`, `Ctrl/Alt+Backspace`, šipky, `Escape`). V případě kolize se nová zkratka nezapíše, zůstane zachována původní funkční a uživateli se zobrazí červená chybová hláška s důvodem kolize.
- **Komponenta výběru ikon a vylepšení vyhledávání Material Symbols**:
  - Všechna vstupní pole pro zadání ikony vybavena komponentou `IconPickerInput`.
  - V modálu výběru ikon zrušeno zbytečné filtrování kategorií pro čisté a rychlé vyhledávání.
  - Implementováno inteligentní relevanční vyhledávání ikon (přesná shoda na 1. místě, prefix názvu, slova v názvu, tagy) – hledání např. výrazu „book“ již netlačí nesouvisející ikony dopředu a prioritně vrací `book`, `bookmark`, `bookmarks` atd.
  - Odstraněny veškeré duplicity ikon v katalogu i mezipaměti (vyloučeny nekompatibilní staré rodiny fontů a zavedena striktní deduplikace dle názvu).
  - Tlačítko pro ruční stažení kompletního online katalogu Material Symbols z Google Fonts s evidencí data, času a počtu ikon přesunuto na konec záložky *Nastavení -> Zdroje dat* do nové sekce *Externí nástroje* a jeho vizuální styl (velikosti písma, štítky, tlačítko) sjednocen s kartami v záložce *Rozšíření*.
  - Vyladěn layout modálu výběru ikon: zvětšen font vyhledávacího pole (14px), zvětšena velikost ikon na 32px (`text-3xl`), zvětšen font popisků ikon (`text-[11px]`) a mřížka nastavena na 6 ikon na řádek.
- **Primární barva ikon pro podpoložky (Alt+Enter)**: Ve Spotlightu se ikony podpoložek vždy vykreslují ve vybrané primární barvě motivu z Nastavení. Z rozšíření (např. MagicGate nebo Git) se přebírá pouze příslušný štítek (chip); výchozí či převzaté ikony (např. při nenačtené faviconě) se již nezbarvují do žluté ani zelené barvy rozšíření.
- **Vertikální vycentrování křížku zavření v okně Kompletního seznamu**: Zavírací tlačítko v hlavičce modálu `SearchItemsViewerModal` je nyní přesně vertikálně vycentrováno (`self-center`, fixní rozměr 36x36 px, vycentrovaná ikona `close`).
- **Zpřesnění výpočtu a zobrazení součtu položek (Kompletní seznam a Nastavení)**:
  - Odstraněna optická chyba součtu způsobená tím, že položky z Gitu byly dříve započítány dvakrát (v hlavních položkách i v samostatném čipu z Gitu).
  - Všechny kategorie jsou nyní striktně disjunktní a jejich součet přesně odpovídá celku: `[hlavních] + [z Gitu] + [snippetů] + [subpoložek] = [celkem]` (např. 405 hlavních + 87 z Gitu + 16 snippetů + 175 subpoložek = 683 celkem).
  - V záložce *Nastavení -> Zdroje dat* zobrazen čistý celkový počet načtených položek bez nadbytečných závorek.
- **Plynulý stav synchronizace a progress bar ve Zdrojích dat**:
  - Při spuštění synchronizace dat se v banneru skryje bublina s časem poslední aktualizace a na jejím místě se zobrazí živý stav (název synchronizovaného zdroje, procenta a plynulý barevný progress bar).
  - Průběh je plynule animován s minimální dobou trvání 2 sekundy (stejně jako u synchronizace přes ikonu ve Spotlightu), po dokončení krátce potvrdí úspěch a následně znovu zobrazí bublinu s čerstvě aktualizovaným časem.
- **Resetování posuvníku při přepínání záložek v Nastavení**: Při přechodu na jakoukoliv záložku v levém menu se posuvník obsahu automaticky vrátí na začátek (`scrollTop = 0`).
- **Kompaktní tlačítko automatické detekce (VS Code a Android Studio)**: U konfigurace cesty k VS Code i Android Studiu byl text tlačítka *Automaticky detekovat* nahrazen kompaktní čtvercovou ikonkou hvězdiček (`auto_awesome`) s vysvětlujícím tooltipem.
- **Samostatná záložka „Snippety“ v Nastavení**:
  - Původní sekce osobních snippetů přejmenována na **Předdefinované osobní údaje** (vlastní podpis, IČO, DIČ, jméno, e-mail, telefon, adresa).
  - Přidána zcela nová sekce **Vlastní snippety** umožňující vytvářet libovolné textové zkratky a šablony s rozhraním: výběr ikony z Material Symbols, název snippetu, víceřádkový text k rychlému zkopírování do schránky a dynamické štítky zkratek (`shortcuts[]`) s fixní dvojtečkou `:` a tlačítkem pro přidání/odebrání.
  - Vlastní snippety plně sdílejí jednotný model systémových snippetů (`action: 'copy'`, `sourceId: 'snippet'`), okamžitě reagují ve Spotlightu pod dvojtečkou a automaticky se započítávají do celkových indexovaných položek.
  - Tlačítko *Přidat snippet* nyní vkládá nový záznam vždy na začátek seznamu (prepend) pro okamžitou editaci bez nutnosti scrollovat dolů.
  - Přidána tlačítka pro **Exportovat** a **Importovat** vlastní snippety ve formátu JSON: export ukládá čistou strukturu s názvy, obsahem, ikonami a zkratkami, zatímco import načte data ze souboru, přiřadí nová ID, zvaliduje zkratky a bezpečně snippety přidá do konfigurace bez nutnosti vytvářet databázovou či souborovou vazbu zdroje. Akční tlačítka (Importovat, Exportovat, Přidat snippet) jsou umístěna na samostatném řádku pod popiskem a zarovnána doleva.
  - Vyladěn řádek zkratek u snippetů: zvětšena ikona štítku (`17px`), zvětšen font popisků, štítků zkratek i vstupního pole na čitelnější velikost (`text-xs`) a všechny prvky sjednoceny na jednotnou výšku (`h-7`) s nulovým offsetem linky (`leading-none`) pro dokonalé vertikální vycentrování v ose Y.
- **Odstranění zápatí v menu Nastavení**: Z levého navigačního sloupce Nastavení bylo odstraněno duplicitní zápatí s informací o poslední aktualizaci dat (tato informace je přehledně zobrazena přímo v záložce *Zdroje dat*).
- **Tlačítka „Procházet...“ otevírají průzkumník v aktuální cestě**: Všechna tlačítka pro výběr souborů i složek (JSON datové zdroje, MagicGate XML konfigurace, výchozí složka repozitářů GitHubu, dialog klonování repozitářů, spustitelné soubory VS Code a Android Studio) nyní berou v potaz již vyplněnou cestu (`defaultPath`). Nativní dialog souborového průzkumníka se otevře přímo ve vybrané složce či u daného souboru (případně v nadřazené existující složce) a je vždy korektně modálně navázán na aktivní okno.
- **Příprava grafického designu instalátoru**: Vytvořeny bitmapy pro hlavičku a uvítací panel Windows NSIS instalátoru v tmavém motivu IADonkey.
- **Oprava ukončení aplikace při instalaci aktualizace**: Při instalaci nové verze se nyní korektně uvolní zámek instance Electronu, zničí okna i ikona v oznamovací oblasti (Tray) a starý proces se čistě ukončí před spuštěním instalátoru, což spolehlivě zabrání nežádoucímu opětovnému otevření staré verze.

---

## [1.1.2] - 15. 9. 2026
### Rozšíření Android Studio, vylepšení MLog číselných dotazů, editor statických dat a vyladění UI
- **Rozšíření Android Studio**: Vyhrazená integrace pro prostředí Android Studio s růžovou identitou (`pink`), možností automatické detekce standardních cest / JetBrains Toolboxu nebo ručního nastavení cesty ke `studio64.exe`.
- **Inteligentní volba editoru (Android Studio vs VS Code)**: Aplikace nabízí buď VS Code, nebo Android Studio – nikdy oboje současně. Pokud GitHub repozitář používá programovací jazyk Kotlin nebo Java, zobrazí se tlačítko *Otevřít v Android Studiu*. Pro webové repozitáře a instance MagicGate se vždy nabízí VS Code.
- **Tlačítko Android Studia v nabídce Akcí i v okně klonování**: Možnost okamžitého otevření mobilního projektu přímo z akcí položky (<kbd>Shift+Enter</kbd>) nebo po dokončení stahování repozitáře.
- **Číselné dotazy MLogu na 4+ číslic (např. `2111`)**: Pokud je zapnuté rozšíření MLog a dotaz ve Spotlightu obsahuje pouze 4 nebo více číslic, automaticky se nabídne na 1. místě úkol **T2111** (*Otevřít úkol T2111 v MLogu*) a na 2. místě požadavek **R2111** (*Otevřít požadavek R2111 v MLogu*) včetně vizuální aktivace MLog režimu s ikonou `support_agent`.
- **Sjednocení cílové složky MagicGate repozitářů**: Klonované repozitáře sekcí instancí MagicGate se nyní stahují a detekují v přehledné podsložce `{defaultCloneDir}/magicgate/{instanceName}`.
- **Plynulý reset vyhledávače při otevření v editoru**: Po kliknutí na otevření repozitáře ve VS Code nebo Android Studiu z okna klonování se Spotlight kompletně skryje a zresetuje do výchozího stavu.
- **Zachování fokusu při návratu ze subpoložek (Alt+Enter)**: Při zavření subpoložek zpět do vyhledávače zůstane vybraná původní položka namísto přeskočení na začátek seznamu.
- **Zpřehlednění nabídky akcí repozitářů**: Odstraněna redundantní položka rekurzivního klonování (obslouženo přepínačem v dialogu stahování) a akce *Otevřít na GitHubu* je umístěna na konec nabídky.
- **Editor položek statických dat**: Pole *Název* i pole *Cesta / URL / Obsah* (`location`) roztaženo na 100 % šířky; pole `location` změněno na víceřádkový editor (`textarea`) akceptující a zachovávající odřádkování.
- **Resetování posuvníku v průvodci "Jak na zdroje dat"**: Při přepínání mezi záložkami v modálním okně průvodce se posuvník automaticky vrátí na začátek obsahu.
- **Vyladění barevného design systému**: Důsledné dodržení sekundární barvy v okně klonování repozitářů i v informačním boxu vyhledávače.

---

## [1.1.1] - 14. 9. 2026
### Rozšíření (GitHub, VS Code), systém akcí a informací, klonování repozitářů a barevný design systém
- **Záložka Rozšíření**: Nová vyhrazená sekce v Nastavení pro zapínání/vypínání modulů MagicGate, MLog, GitHub a VS Code bez ztráty existující konfigurace.
- **Integrace GitHubu**: Automatické načtení osobních i organizačních repozitářů přes GitHub Personal Access Token s podporou vlastní GitHub API URL.
- **Systém Akcí položek (Shift+Enter)**: Nové rozšířené menu pro položky nabízející přímé akce (otevření repozitáře na webu, klonování i rekurzivní stažení repozitáře).
- **Samostatné okno pro klonování repozitářů**: Klonování repozitářů (GitHub i MagicGate) se otevírá v samostatném systémovém okně s možností minimalizace a zavření křížkem, výběrem cílové složky a živým streamováním průběhu.
- **Potvrzení stažení klávesou Enter**: V okně klonování repozitářů lze stahování okamžitě spustit stiskem klávesy <kbd>Enter</kbd>.
- **Sjednocené barvy dialogu klonování**: Stavový box průběhu, spinner, tlačítko výběru složky i tlačítko pro otevření složky v Průzkumníku jsou sladěny do sekundární barvy motivu bez rušivých glow efektů.
- **Klonování repozitářů instance MagicGate**: Nové akce na <kbd>Shift+Enter</kbd> u MagicGate instancí (*Klonovat repozitáře instance...* a *Klonovat repozitáře rekurzivně...*). Aplikace se dotáže Administrace instance přes `CmsFsContentHandler.ashx`, zjistí repozitáře sekcí, automaticky odvodí názvy podsložek a nabídne hromadné stažení s vytvořením `repos.json`.
- **Rozšíření Visual Studio Code (VS Code)**: Nová vyhrazená integrace v Nastavení s možností zadání cesty a automatické detekce spustitelného souboru `Code.exe` / `code.cmd`.
- **Blesková tichá detekce existujících repozitářů**: Okamžitá kontrola stažených projektů ve výchozí cílové složce bez blokování uživatelského rozhraní (< 1 ms).
- **Akce Otevřít ve VS Code**: Pokud již repozitář ve výchozí cílové složce existuje a rozšíření VS Code je aktivní, nabídne se v akcích položky (<kbd>Shift+Enter</kbd>) možnost okamžitého otevření ve VS Code se specifickým petrolejovým zvýrazněním.
- **Chytré otevření ve VS Code při chybě klonování**: Pokud se uživatel pokusí stáhnout repozitář do již existující neprázdné složky, zobrazí se v chybovém hlášení i v patičce tlačítko pro okamžité otevření ve VS Code.
- **Rychlá zkratka Ctrl+Backspace**: Ve Spotlight vyhledávači stisk <kbd>Ctrl+Backspace</kbd> okamžitě kompletně vymaže vyhledávací pole.
- **Systém Informací (info) u položek**: Zobrazení podrobných parametrů (databáze, server, mlog požadavek, cesty k souborům, zálohy apod.) v kompaktním panelu přímo nad akcemi na <kbd>Shift+Enter</kbd> s možností okamžitého zkopírování hodnoty do schránky.
- **Oprava posuvníku a plynulé scrollování akcí**: Při navigaci šipkami na klávesnici v nabídce akcí se okno automaticky plynule posouvá i při zobrazených informacích o položce.
- **Přesun subpoložek na Alt+Enter**: Původní zobrazení subpoložek (options) přesunuto na klávesovou zkratku <kbd>Alt+Enter</kbd>; u Git repozitářů byla odstraněna stará logika klonování z voleb ve prospěch nového menu Akcí.
- **Rychlé prefixy `git:` a `magicgate:` (`mg:`)**: Zadáním prefixu okamžitě filtrujete výhradně v repozitářích nebo instancích s dynamickou změnou ikony a nápovědy.
- **Vizuální aktivace MLog režimu**: Při zadání kódu požadavku či úkolu (např. `T1`, `T12`, `R123`) nebo prefixu `mlog:` se vyhledávací pole okamžitě vizuálně přepne do indigo režimu s ikonou `support_agent`.
- **Závazná pravidla barevného systému (`docs/COLOR_RULES.md`)**: Striktní pravidla: semafor pro stavy (zelená, červená, žlutá), stálé vyhrazené barvy rozšíření (Git = fialová, MLog = indigo, MagicGate = zlatá/jantarová, VS Code = petrolejová) a přepracovaná paleta 10 vybraných moderních designových odstínů pro uživatelský výběr motivu.
- **Banování položek a správa Banlistu**: V Kompletním seznamu lze libovolnou položku jedním kliknutím zabanovat a v nové záložce *Banlist* spravovat zabanované položky s možností jejich obnovení.
- **Nový interaktivní průvodce "Jak na zdroje dat"**: V Nápovědě dostupné modální okno s kompletní specifikací JSON/TypeScript schématu položek, podporovaných akcí a ukázek.
- **Plynulý návrat do vyhledávače (Spotlight)**: Po zavření okna klonování se automaticky znovu aktivuje a zaměří vyhledávač se zachovaným dotazem i pozicí.



---

## [1.0.1] - 11. 9. 2026
### Kompletní seznam položek, vyhledávání bez diakritiky a MagicGate XML
- **Kompletní seznam položek**: Nové přehledné modální okno v Nastavení zobrazující všechny indexované položky seřazené prioritně (shodně se Spotlightem) s filtry a počítadly.
- **Vyhledávání bez diakritiky**: Plná podpora psaní s diakritikou i bez (např. `prik` okamžitě vyhledá `Příkazový řádek`) s inteligentním řazením podle začátků slov.
- **Import MagicGate z deploy XML**: Možnost nahrát XML konfiguraci ze serveru a automaticky vygenerovat instance a dílčí aplikace (Administrace, Web, API, BO) pro tichý login.
- **Globální zástupný symbol {favicon}**: Možnost použít `{favicon}` v poli pro ikonu s automatickým stahováním a ukládáním do mezipaměti.
- **Vyhledávač Centrum.cz**: Integrace vyhledávače Centrum.cz s prefixy `c:` a `centrum:`.
- **Vylepšené systémové snippety**: Snippety s prefixem `:` (čas, datum, rok, guid, podpis) s prioritou 0 a tyrkysovými čipy klíčových slov.
- **Sjednocení a vycentrování ikon**: Zmenšení a perfektní vycentrování Material ikon v přehledech tak, aby přesně odpovídaly rozměrům favicon a obrázků.
- **Plynulejší UX**: Automatické vrácení fokusu do vyhledávacího pole po zavření okna nastavení.

---

## [0.1.7] - 11. 9. 2026
### Samostatné aktualizace, detekce a mapování JSON zdrojů
- **Samostatná záložka Aktualizace**: Vyhrazená záložka v nastavení s ruční kontrolou nových verzí a zobrazením historie změn.
- **Detekce a mapování struktury JSON**: Inteligentní průzkumník struktury JSON s mapováním vlastních polí (název, odkaz, ikona, priorita apod.) na libovolné klíče JSONu.
- **Fixní hodnoty pro zdroje**: Možnost zadat fixní hodnotu pro položky zdroje (např. jednotnou ikonu) s živým náhledem prvního záznamu.
- **Rychlé kopírování URL API**: Tlačítko pro okamžité zkopírování adresy API endpointu do schránky v seznamu zdrojů.
- **Český formát času synchronizace**: Přehledné formátování v genitivu (např. *5. května 11:24:24*) v levém menu.
- **Automatické ukládání**: Všechny změny v nastavení se ukládají ihned v reálném čase.

---

## [0.1.6] - 11. 9. 2026
### Nativní programy Windows, Google Search a vylepšení UI
- **Prohledávání nainstalovaných aplikací**: Automatický scanner nabídek Start vyhledá klasické i moderní UWP/MSIX Store aplikace (Adobe XD, Kalkulačka, Windows Terminal apod.) s prioritou 99.
- **Nativní ikony**: Přímá extrakce originálních plnobarevných ikon programů ze spustitelných souborů i balíčků UWP.
- **Word boundary řazení**: Hledání podle začátků slov – např. zadáním `XD` se na 1. pozici okamžitě zobrazí `Adobe XD`.
- **Integrace Google Search**: Možnost okamžitého vyhledání dotazu na Google (priorita 100) i přímý prefix `google:`.
- **Předvolby v Nastavení**: Přepínače pro zapnutí/vypnutí vyhledávání programů a Google Search v záložce Obecné.
- **Oprava barev motivu**: Ikona API zdroje v seznamu zdrojů nyní správně přebírá zvolený barevný motiv.
- **Podpora podpoložek v MagicGate**: Záložka MagicGate se v Nastavení korektně zobrazí i tehdy, pokud je přihlášení nastaveno pouze u vnořených podvoleb.

---

## [0.1.5] - 10. 9. 2026
### Integrace MLog, Gmail, nová ikona a vylepšení UI
- **Automatické zobrazení při startu**: Vyhledávací pole (spotlight) okamžitě po spuštění aplikace vyskočí na obrazovku a zaměří textový kurzor.
- **Vlastní ikona aplikace**: Oficiální ikona IADonkey v hlavním panelu Windows (taskbaru), systémovém panelu (tray) i záhlaví všech oken.
- **Integrace helpdesku MLog**: Rychlé vyhledávání a otevírání požadavků (např. `R1234`) i úkolů (např. `T5678`) přímo z vyhledávače podle nastavené adresy v nové záložce MLog.
- **Integrace Gmailu**: Zadáním libovolné e-mailové adresy bez okolního textu (např. `alzbeta.radova@magicware.cz`) se okamžitě vygeneruje odkaz pro otevření nového konceptu zprávy v Gmailu s předvyplněným příjemcem.
- **Zpřehlednění ovládání**: Odstraněna redundantní tlačítka; kliknutím na chip s číslem verze se kdekoliv v aplikaci otevře historie změn.
- **Sjednocení šířky**: Záložka MLog nyní využívá plnou 100% šířku okna nastavení.
- **In-App aktualizace**: Přímé stahování nových verzí přímo v okně aplikace s ukazatelem průběhu v MB a možností okamžitého restartu do stažené verze.

---

## [0.1.2] - 10. 9. 2026
### Automatické aktualizace a distribuce
- **Automatická kontrola aktualizací**: Integrovaná kontrola nových verzí aplikace přes GitHub s automatickým stažením instalátoru a upozorněním v okně.
- **Okno novinek po aktualizaci**: Po prvním spuštění po aktualizaci se uživateli zobrazí srozumitelný přehled novinek.
- **Automatizace releasů**: Přidán skript pro jednokrokové sestavení, verzování, tagování a publikaci na GitHub.

## [0.1.1] - 10. 9. 2026
### Vlastní barvy, bezpečné zkratky a správa zdrojů
- **Vlastní barva aplikace**: Přidána možnost volby vlastní barvy aplikace v nastavení (včetně hex kódu i rychlých paletek) s okamžitým živým náhledem bez nutnosti restartu.
- **Bezpečné nastavení zkratky**: Při nahrávání klávesové zkratky je vyžadována minimálně dvojkombinace kláves. Stisk a puštění jediné klávesy vrátí původní zkratku a zobrazí upozornění.
- **Nerušivé zadávání**: Dočasné pozastavení původní zkratky během editace pole v nastavení (nedochází k nechtěnému vyvolání launcheru).
- **Přehlednější ikony**: Nové ikony pro lokální JSON soubory a tlačítko přidání souboru v nastavení.
- **Bleskový start okna**: Optimalizace startu okna nastavení bez problikávání výchozích barev.
- **Uživatelský changelog**: Přehledná historie verzí a zobrazení novinek po aktualizaci.

---

## [0.1.0] - 8. 9. 2026
### První verze launcheru IADonkey
- Rychlé vyhledávání a spouštění aplikací, webových adres a záložek.
- Globální vyvolání launcheru pomocí konfigurovatelné klávesové zkratky.
- Import dat z lokálních JSON souborů na disku a externích API endpointů.
- Podpora pro tichý a bezpečný login do MagicGate (systémy IS Tour).
- Podpora pro vnořené podpoložky (Shift+Enter pro rozbalení, Ctrl+Enter pro rychlé spuštění první volby).
- Integrovaná chytrá kalkulačka a přímé otevírání URL adres.
- Automatická synchronizace dat na pozadí s přehledným ukazatelem průběhu.
