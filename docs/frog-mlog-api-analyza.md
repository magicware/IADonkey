# Analýza nového MLog API („Frog“) a integrace příkazu `/task` do IADonkey

Tento dokument obsahuje detailní technickou analýzu moderní nadstavby helpdesku MLog s kódovým označením **Frog** a návrh integrace zakládání úkolů přímo ze Spotlightu IADonkey.

---

## 1. Co je „Frog“ a kdo za ním stojí

* **Popis:** Frog je moderní, API-first náhrada a nadstavba stávajícího systému MLog. Zcela nahrazuje starou WPF desktopovou aplikaci, která komunikovala napřímo se SQL serverem bez aplikační vrstvy.
* **Hlavní autor / vývojář:** **Vladimír Tintěra (`VT`)** (`vladimir.tintera@magicware.cz`).
* **Klíčoví testeři / spolupracovníci:** Vojtěch Koudela (`VM`), Lukáš Vácha (`LV`), Marek Chvátal (`MCH`).
* **Interní ticket vývoje:** [R134744 - Úpravy VT froga](http://mlog/R134744) (v projektu `_MLog 2019`).
* **Repozitář kódu:** `magicware/KMPMlog` na GitHubu.

---

## 2. Architektura a produkční prostředí

* **Produkční adresa:** [https://frog.magicware.cz](https://frog.magicware.cz)
* **Technologický stack:**
  * **Backend:** Kotlin / Ktor server (běžící standardně na portu `:8080`, v produkci za reverzní proxy na `https://frog.magicware.cz/api/v1/`).
  * **Frontend / Klienti:** Kotlin Multiplatform (KMP) + Compose:
    * Webová verze (WASM + Skiko canvas na `https://frog.magicware.cz`).
    * Desktopová aplikace (Windows / macOS).
    * Mobilní aplikace (Android s Web Push notifikacemi).
  * **Databáze:** Připojeno na centrální MS SQL instanci MLogu (`mlog / MLog`), avšak veškerá byznys logika, validace, notifikace a správa draftů probíhá přes serverové API.

---

## 3. Autentizace a bezpečnost

Frog podporuje moderní způsoby ověřování:
1. **Firemní Google Workspace OAuth (`@magicware.cz`):**
   * Endpoint: `/api/v1/login/web` přesměrovává na `/api/v1/login/google-auth`.
   * Využívá zabezpečené `HttpOnly`, `SameSite=Lax` cookies.
2. **Bearer Token (`Authorization: Bearer <token>`):**
   * Plná podpora v hlavičkách HTTP požadavků (využívají nativní klienti i skripty pro clipboard/média).
   * Obnova tokenů přes `/api/v1/auth/refresh`.
3. **MCP (Model Context Protocol):**
   * VT v ticketech [R134744](http://mlog/R134744) (bubliny `T792399`, `T792406`) zmiňuje přímou podporu pro AI asistenty a Claude přes MCP server (např. fulltextové vyhledávání úkolů a zápis popisů v Markdownu).

---

## 4. Přehled REST API endpointů (`/api/v1/...`)

Server na `https://frog.magicware.cz/api/v1/` vystavuje kompletní sadu REST endpointů:

| Endpoint | Účel |
|---|---|
| `/api/v1/version` | Informace o verzi serveru (`1.0.38`), min. verzích klientů a odkazech ke stažení. |
| `/api/v1/requirements` | Čtení, vyhledávání a zakládání požadavků (Requirements – R). |
| `/api/v1/sub-requirements` | Čtení, zakládání a úpravy úkolů (SubRequirements / Tasks – T), řešení a drafty. |
| `/api/v1/users` | Seznam uživatelů, jejich zkratky (`MCH`, `VT`, `PKU`), role a avatary. |
| `/api/v1/projects` | Seznam projektů a jejich vazby na zákazníky. |
| `/api/v1/plan` | Stromový pohled na plánování (Zákazník → Projekt → Milník → Složky → Požadavky). |
| `/api/v1/timetracking` | Záznam a přehled vykázané práce (výkazy hodin). |
| `/api/v1/login/...` | Přihlašovací toky (`/web`, `/password`, `/info`, `/redeem`). |
| `/api/v1/auth/refresh` | Obnova přístupových tokenů. |

---

## 5. Návrh integrace do IADonkey: Příkaz `/task`

### Uživatelský scénář (UX ve Spotlightu)
Při stisku klávesy a napsání `/task` do Spotlightu:
1. **Formulářový / interaktivní dialog ve Spotlightu:**
   * **Název tasku:** Textový vstup (např. *„Upravit styly pro Spotlight“*).
   * **Závažnost / Priorita:** Výběr (např. *Nízká*, *Střední*, *Vysoká*).
   * **Přiřazení uživatele:** Zadání nebo našeptávač zkratky řešitele (např. *`MCH`* – data přednačtena z `/api/v1/users`).
   * **Projekt / Požadavek:** Výběr nadřazeného požadavku nebo projektu.
2. **Volání API:**
   * IADonkey odešle `POST` na `https://frog.magicware.cz/api/v1/sub-requirements` s odpovídajícím payloadem.
   * Frog server zajistí validaci, založí úkol, vygeneruje push notifikaci přiřazenému řešiteli a vrátí nově vytvořené ID (např. `T792700`).
3. **Akce po vytvoření:**
   * Zobrazení toast notifikace o úspěšném vytvoření.
   * Automatická nabídka nebo spuštění přes `LinkOpenner` v IADonkey (otevření v MLogu / Frog webu).

---

## 6. Doporučený další postup

1. **Kontaktovat Vladimíra Tintěru (`VT`):**
   * Požádat o přístup do repozitáře `magicware/KMPMlog` na GitHubu pro nahlédnutí do DTO modelů requestů.
   * Domluvit nejvhodnější způsob autorizace pro IADonkey (Personal Access Token / API klíč vs. lokální token).
2. **Implementovat `FrogApiService` v IADonkey:**
   * Klient pro volání `https://frog.magicware.cz/api/v1/`.
   * Registrace spotlight příkazu `/task`.
