# Pravidla barevného systému IADonkey

Tento dokument definuje závazná pravidla pro používání barev napříč celou aplikací IADonkey.

---

## 1. Semafor (informační a stavové barvy)
Vyhrazeno výhradně pro zpětnou vazbu systému, stavové informace a systémové dialogy:

| Účel | Barva | Odstíny / Třídy | Příklad použití |
| :--- | :--- | :--- | :--- |
| **Úspěch (Success)** | Smaragdová / Zelená | `#10b981` (`emerald-400` / `emerald-500`) | Úspěšná synchronizace, uložení konfigurace, potvrzení akce, status Nakonfigurováno |
| **Chyba / Neúspěch (Error)** | Červená / Růžová | `#f43f5e` (`rose-400` / `rose-500`) | Chyba spojení, neplatný token, selhání stažení repozitáře |
| **Varování / Otázka (Warning / Prompt)** | Jantarová / Žlutá | `#f59e0b` (`amber-400` / `amber-500`) | Dotaz na přepsání složky, dialog „Kam chcete soubor uložit?“, varování před ztrátou dat |

> **Důležité**: Barvy semaforu se nesmí používat pro rozšíření ani pro uživatelskou volbu motivu.

---

## 2. Rozšíření (vyhrazené nesemaforové barvy)
Každé systémové rozšíření má přidělenou stálou, specifickou a nesemaforovou barvu:

| Rozšíření | Barva | Odstíny / Třídy | Ikona | Prefix |
| :--- | :--- | :--- | :--- | :--- |
| **GitHub / Git** | Fialová (Purple) | `#a855f7` (`purple-400` / `purple-500`) | `folder_code` | `git:` |
| **MLog Helpdesk** | Indigová (Indigo) | `#6366f1` (`indigo-400` / `indigo-500`) | `support_agent` | `mlog:`, `T...`, `R...` |
| **MagicGate (IS Tour)** | Azurová (Cyan) | `#06b6d4` (`cyan-400` / `cyan-500`) | `security` | `mg:`, `magicgate:` |
| **VS Code** | Hluboká petrolejová (Teal / Petrol) | `#0e7490` (`cyan-700` / `teal-700` / `#0e7490`) | `code` | akce položky |

---

## 3. Uživatelská volba barvy (Hlavní barva & Barva akcí)
Pro volbu hlavní barvy (Primary accent) i sekundární barvy (Actions accent) platí:

### Banlist zakázaných barev:
- **Barvy semaforu**: Zelená/Smaragdová, Červená/Růžová, Žlutá/Jantarová.
- **Barvy rozšíření**: Fialová (Git), Indigo (MLog), Azurová (MagicGate), Hluboká petrolejová (VS Code).
- **Volný výběr (Free picker)**: Zákaz volby libovolného RGB/HEX odstínu pomocí nativního kapátka `<input type="color">`.

### Povolené schéma: přesně 10 designových barev mimo banlist
1. **Královská modrá** (`#2563eb`) – sytá, čistá reprezentativní modř
2. **Safírová modrá** (`#1d4ed8`) – hluboká tmavě modrá
3. **Nebeská modrá (Sky)** (`#0284c7`) – svěží blankytný odstín
4. **Ocelově modrá** (`#334155`) – vyvážená tmavá modrošedá
5. **Pomerančová / Oranžová** (`#ea580c`) – zářivá a energická oranžová
6. **Cihlově měděná** (`#c2410c`) – zemitý teplý měděný odstín
7. **Sytě růžová (Pink)** (`#db2777`) – moderní magenta-růžová
8. **Fuchsiová** (`#c026d3`) – zářivá fuchsiová barva
9. **Břidlicová (Slate)** (`#475569`) – chladná ocelově šedá
10. **Grafitová (Zinc)** (`#52525b`) – neutrální antracitová šedá

---

## 4. Ostatní systémové prvky
- **Vyhledávače (Search Engines)**: Všechny vyhledávače (Google, Seznam, Wikipedie, Centrum) mají štítek v jednotné barvě odvozené od primární barvy zvolené uživatelem.
- **Subpoložky (Subitems)**: Používají modrý odstín (`sky-500`), aby nekolidovaly s fialovým Gitem ani s akcemi.
