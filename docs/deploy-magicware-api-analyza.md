# Analýza API MagicWare Deploy (`https://deploy.magicware.cz`) a integrace instancí do IADonkey

Tento dokument obsahuje detailní technickou analýzu interního portálu **MagicWare Deploy** a jeho API (zejména endpointu `/api/ui/agents`) pro dynamické získávání a správu instancí IS Magic přímo v launcheru IADonkey.

---

## 1. Co je MagicWare Deploy a k čemu slouží

* **Popis:** MagicWare Deploy je centrální interní platforma pro správu flotily aplikačních a databázových serverů, distribuci balíčků a nasazování instancí systému IS Magic u zákazníků i v interním vývojovém/testovacím prostředí.
* **Produkční adresa:** [https://deploy.magicware.cz](https://deploy.magicware.cz)
* **Technologický stack:**
  * **Backend:** ASP.NET Core (.NET 8/9).
  * **Reverzní proxy & TLS:** OpenResty (Nginx + Lua) s hlavičkami `Server: openresty`, `X-Served-By: deploy.magicware.cz`.
  * **Frontend:** Moderní SPA (Single Page Application) postavená na Reactu s Vite bundlerem.

---

## 2. Autentizace a bezpečnostní model

Při přímém volání jakéhokoliv endpointu pod `/api/ui/*` bez přihlášení server vrací:
```http
HTTP/1.1 401 Unauthorized
Server: openresty
Content-Length: 0
```

### Způsob ověřování
1. **Google Workspace SSO (Single Sign-On):**
   * Webové rozhraní používá výhradně firemní Google účet `@magicware.cz`.
   * Vstupní přihlašovací bod: `/auth/login?returnUrl=...`.
   * Přesměrování na Google OAuth 2.0 s parametrem `hd=magicware.cz` (omezeno striktně na zaměstnance MagicWare):
     ```
     https://accounts.google.com/o/oauth2/v2/auth?client_id=125615825758-66a1n4gfmbll3pfjv2fo1r1ic7pdkapa.apps.googleusercontent.com&scope=openid%20email%20profile&response_type=code&redirect_uri=https%3A%2F%2Fdeploy.magicware.cz%2Fsignin-google&hd=magicware.cz
     ```
2. **Session Cookie:**
   * Po úspěšném přihlášení přes Google vydá ASP.NET Core zabezpečenou cookie `.AspNetCore.Cookies` (`HttpOnly`, `Secure`, `SameSite=Lax`).
   * Webové UI odesílá všechny dotazy s `credentials: "same-origin"` a hlavičkou `X-MW-Deploy: ui`.
3. **Podpora pro desktopové nástroje (Paleta MagicGate):**
   * V kódu frontend bundlu je přímo implementována správa desktopových přihlášení (`/api/ui/desktop-tokens`):
     > *„Desktopové nástroje přihlášené k deployi — dnes paleta MagicGate. Přihlašuje se z nich, ne odsud; tady se přihlášení jen odvolává.“*
   * Umožňuje evidovat autorizované stroje (`machineName`, `machineGuid`, `userEmail`) pro čtení instancí v desktopových launcherech.

---

## 3. Analýza endpointu `/api/ui/agents`

Endpoint `/api/ui/agents` je hlavní datový zdroj pro obrazovku **Flotila (*Fleet*)**.

### Datová struktura:
Vrací pole objektů reprezentujících servery/agenty:
```typescript
interface DeployAgent {
  id: string;
  name: string;                   // Např. název serveru / stroje
  nameIsCustom?: boolean;
  dnsHostName?: string;          // FQDN název serveru
  machineGuid?: string;
  smbiosUuid?: string;
  agentVersion?: string;         // Verze instalovaného deploy agenta
  ring?: string;                 // Prstenec nasazení (např. canary, internal, production)
  lastSeenAt?: string;           // ISO timestamp poslední komunikace
  revoked?: boolean;             // Zda byl agent odvolán
  properties: Record<string, any>; // Vlastnosti serveru (prostředí, zákazník, CPU, RAM)
  
  // KLÍČOVÉ PRO IADONKEY: Seznam instancí Magicu na stroji
  instances: DeployInstance[];
}

interface DeployInstance {
  id: string;
  name: string;                  // Kód instance (např. "57test", "ckalex")
  path: string;                  // Cesta k instalaci na serveru
  agentId: string;
  missingSince?: string | null;  // Indikace, zda instance nezmizela ze serveru
  archivedAt?: string | null;    // Archivovaná instance
  version?: string;              // Verze IS Magic (např. 57test.14157)
  product?: string;              // Magic, Web, API, SIS
  properties?: Record<string, any>;
}
```

---

## 4. Přehled dalších relevantních endpointů v API

| Endpoint | Význam pro IADonkey |
|---|---|
| `/api/ui/agents` | Kompletní seznam serverů flotily a všech jejich instancí Magicu. |
| `/api/ui/instances/` | Detailní informace a akce nad konkrétní instancí. |
| `/api/ui/desktop-tokens` | Správa a ověření tokenů pro desktopové nástroje / palety. |
| `/api/ui/me` | Profil přihlášeného uživatele (e-mail, role `admin`, oprávnění). |
| `/api/ui/db-servers` | Seznam připojených databázových serverů (SQL). |
| `/api/ui/import/applications-xml/preview` | Náhled importu staršího `applications.xml` do Deploye. |
| `/api/ui/import/applications-xml/apply` | Aplikace importu instancí z XML formátu. |

---

## 5. Možnosti integrace a získání přístupu do IADonkey

Pro získání dat z API do IADonkey máme 3 proveditelné cesty:

### Možnost A: Přihlašovací okno Google SSO přímo v IADonkey (Doporučeno)
* **Jak funguje:**
  1. V Nastavení IADonkey (záložka MagicGate) přibude volba *„Přihlásit k MagicWare Deploy“*.
  2. Electron otevře dedikované `BrowserWindow` na `https://deploy.magicware.cz/auth/login`.
  3. Uživatel provede standardní přihlášení firemním Google účtem (`@magicware.cz`).
  4. Electron odchytí přesměrování a bezpečně uloží cookie `.AspNetCore.Cookies` do systémového store IADonkey.
  5. Následně IADonkey provádí dotazy na `/api/ui/agents` na pozadí s touto cookie.

### Možnost B: Desktop token z palety MagicGate
* **Jak funguje:**
  * Využít mechanismus, který používá stávající paleta MagicGate (autorizace stroje přes `/api/ui/desktop-tokens`).
  * Pokud má uživatel již stroj autorizován, token lze převzít ze stávající konfigurace palety.

### Možnost C: Manuální vložení Session Cookie (pro vývoj a testování)
* **Jak funguje:**
  * Zkopírování hodnoty cookie `.AspNetCore.Cookies` z DevTools prohlížeče (`F12` $\rightarrow$ *Application* $\rightarrow$ *Cookies* na `deploy.magicware.cz`).
  * Vložení do konfigurace pro okamžité otestování stažení instancí.

---

## 6. Přínos pro IADonkey
* **Konec nutnosti ručního XML souboru:** Nahrazení statického souboru `applications.xml` živým API, které zná všechny servery, jejich aktuální IP adresy, běžící verze a instance v reálném čase.
* **Automatická aktualizace instancí:** Okamžitá dostupnost nových zákaznických a testovacích instancí bez ručního zásahu uživatele.
