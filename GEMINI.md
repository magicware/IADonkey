# IADonkey - Pravidla vývoje pro asistenta

## 1. ZÁKAZ AUTOMATICKÉHO BUILDOVÁNÍ (STRIKTNÍ)
- **NIKDY nespouštět `npm run build`, `npm run compile`, `npm test` ani `npx tsc` automaticky.**
- Ani po drobných změnách, ani po velkých změnách, ani jako "ověření".
- Build nebo kontrolu typů spouštět **POUZE A VÝHRADNĚ**, pokud o to uživatel v daném dotazu **výslovně požádá** (např. "sestav build", "zkontroluj typy", "pusť tsc").

## 2. EFEKTIVNÍ PROCHÁZENÍ A ČTENÍ SOUBORŮ
- **NIKDY neprocházet velké soubory po malých 50-100 řádkových blocích naslepo.**
- Pokud potřebuješ najít část kódu v souboru:
  1. Použij `Select-String` / grep v PowerShellu pro zjištění přesných čísel řádků.
  2. Zobraz cíleně pouze daný blok pomocí `view_file` s přesnými čísly `StartLine` a `EndLine` (případně až 800 řádků najednou, pokud je třeba širší kontext).
  3. Ihned proveď editaci. Nezdržuj postupným listováním po kouskách.

## 3. DESIGN A PRAVIDLA PROJEKTU
- Dodržovat pravidla v `.gemini/rules.md`.
- Vizuální standardy: borderless styl, Material 3 design, jednotné přepínače, zachování barev a struktury.
