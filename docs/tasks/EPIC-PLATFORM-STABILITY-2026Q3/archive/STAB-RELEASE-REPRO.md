# STAB-RELEASE-REPRO — tiszta clone, health és deploy bizonyíték

- **Szerep:** infra/monitor
- **Prioritás:** P1
- **Státusz:** done — root önállóan újraellenőrizte (MediatR-hiány, sales 500-as
  hiba, smoke-script biztonságossága); élő VPS-lelet Gábornak jelentve
- **Függőség:** `STAB-RLS-PROOF`, `STAB-EHS-INTEGRATION`,
  `STAB-TESTCONTAINERS-HYGIENE`, `STAB-FE-TEST-GATE`
- **Mutációs határ:** `.gitmodules`, dokumentáció, read-only/safe smoke script,
  health endpointok külön jóváhagyott kis diffben
- **Tiltott scope:** secret commit, automatikus production deploy, hiányzó repo
  URL kitalálása, service restart bizonyíték nélkül

## Cél

Egy új checkoutból reprodukálható legyen a build/test, és a deploy utáni smoke
egységesen ellenőrizze a health contractot és a service MainPID↔listener egyezést.

## Megvalósítás

1. Leltározd a három mapping nélküli gitlinket:
   `joinerytech-keycloak-theme`, `spaceos-modules-identity`,
   `spaceos-modules-sales`. URL-t csak meglévő remote/VPS bizonyítékból vegyél.
2. Készíts tiszta ideiglenes clone-smoke eljárást; a felhasználó munkafáját ne
   töröld vagy reseteld.
3. Egységesítsd és dokumentáld a szolgáltatás health contractot:
   `/health/live` process-liveness, `/health/ready` függőségek; legacy `/health`
   vagy `/healthz` kompatibilitás dokumentált maradhat.
4. Készíts safe PowerShell/bash smoke scriptet, amely nem deployol: service
   státusz, várt port, health HTTP kód, systemd MainPID és listener PID.
5. Ellenőrizd a Keycloak audience/redirect előfeltételeket, de secretet és tokent
   ne írj ki.
6. Kimenetként adj reprodukálhatósági jelentést és külön, jóváhagyásra váró
   deploy-parancslistát.

## Tesztterv

```powershell
git submodule status
git submodule foreach --recursive 'git status --short'
# a task által létrehozott clone-smoke és VPS read-only smoke pontos parancsa
```

## Elfogadási kritériumok

- [x] `git submodule status` mapping-hibája leltározva, okkal (3 GitHubon nem
      létező gitlink; 2 visszaállítható VPS-forrásból, 1 -- `sales` -- teljesen
      elveszett git-történettel).
- [x] Tiszta clone-ból dokumentált build/test parancs elindul (2 modul + portal
      ténylegesen lefuttatva; `spaceos-modules-contracts` build valódi hibája
      root által is megerősítve, lásd napló).
- [x] Minden HTTP service-hez van live/ready mapping vagy explicit, dokumentált
      kivétel (3 host + orchestrator hiánya nyíltan rés, nem eltussolva).
- [x] Smoke riportban service, MainPID, port/PID és HTTP kód szerepel -- root
      önállóan újrafuttatta, azonos eredménnyel.
- [x] Nincs secret, token, automatikus deploy vagy restart -- script forráskódja
      root által átolvasva, kizárólag read-only parancsok.

## Root független ellenőrzés (2026-07-22)

Nem az önjelentésre hagyatkozva, saját magam újrafuttattam a legkritikusabb
állításokat:

- **`spaceos-modules-sales` VPS-incidens:** megerősítve, és **rosszabb, mint
  amit az agent talált** -- az agent még "teljesen kiürült" publish/ könyvtárat
  látott, mostanra (root ellenőrzésekor) a könyvtár **teljesen eltűnt**
  (`ls: cannot access ... No such file or directory`). A service továbbra is
  fut (MainPID=1733274, listener egyezik), `/health` = 500. **Restart tilos
  jóváhagyás nélkül** -- nincs miből újraindulnia.
- **`spaceos-modules-contracts` MediatR-hiány:** megerősítve forráskód-szinten
  (`git fetch` a pinnelt `59a9d4c` commitra HTTPS-en át, mert az SSH itt sem
  működik) -- `AssetDowntimeEvent.cs` ténylegesen `using MediatR; ... :
  ModuleEvent, INotification`, a `.csproj` egyetlen `PackageReference`-e
  `Ardalis.Result` -- a build garantáltan `CS0246`-t dob.
- **`Invoke-VpsHealthSmoke.ps1` biztonságossága:** teljes forráskód átolvasva --
  valóban csak `systemctl show`, `sudo ss -tlnp`, `curl -s -o /dev/null` GET
  szerepel benne, nincs mutáló parancs. Önállóan lefuttatva, pontosan
  megegyező eredménnyel (11/11 szolgáltatás, azonos PID-egyezés, azonos 2
  ATTENTION-lelet).

**Gábornak jelentve** (AGENT-CHANNEL.md-n kívül, mailboxban): a `sales`
incidens súlyosbodása és a `spaceos-modules-contracts` MediatR-hiány mint
azonnali, egyszerű, jóváhagyásra váró javítás-jelölt.

## Stop / eszkaláció

- Nem létező GitHub repo esetén ne inventálj URL-t; dokumentáld a döntést.
- Health endpoint mutáció több submodule-t érint: külön file-lock és review kell.
- VPS deploy/restart csak root jóváhagyással.

## Végrehajtási napló

**2026-07-22, agent-végrehajtás.**

### Preflight

1. Platform HEAD a munka kezdetén: `cb08dfe78ed48f0422a529063e3a6d896085e9b3` (docs:
   AGENT-CHANNEL.md). `git status --short` a gyökérben: sok, ehhez a taskhoz **nem tartozó**,
   párhuzamosan futó módosítás (`EPICS.yaml`, `AGENT-CHANNEL.md`, cutting-doksik,
   `src/joinerytech-nexus/knowledge-service/**`, 4 gitlink-pointer-mozgás
   `src/joinerytech-portal`, `src/spaceos-modules-contracts`, `src/spaceos-modules-cutting`,
   `src/spaceos-nesting-algorithms`) — egyiket sem érintettem, egyiket sem soroltam saját
   eredménynek. `src/spaceos-modules-cutting`-hoz **nem nyúltam** (fájlt nem olvastam belőle
   szerkesztés céljából, nem írtam bele — a live smoke-listában szerepel a deploy-olt
   `spaceos-cutting-svc` VPS-service, de ez a futó szolgáltatás read-only HTTP/systemd
   ellenőrzése, nem a submodule forrásának módosítása).
2. Csak `scripts/README.md`-t módosítottam, `scripts/Invoke-VpsHealthSmoke.ps1`-t hoztam létre,
   és ezt a task-dokumentumot töltöttem ki. `.gitmodules`-t **nem módosítottam** (nincs
   megerősített URL egyik gitlinkhez sem — lásd 1. pont).

### 1. Gitlink-leltár (3 mapping nélküli gitlink)

Módszer: `.gitmodules` + `.git/config` tartalma, `git ls-files -s | grep 160000` (gitlink-SHA-k),
`git log --diff-filter=A --all -- <path>` (mikor és hogyan kerültek be), `gh repo view` +
`gh repo list Szantoi --limit 100` (a teljes, 44 repós GitHub-fiók-leltár), végül a VPS-en a
tényleges forráskönyvtárak (`git -C /opt/joinerytech/src/<modul> remote -v` / `log -1`) —
mindez **csak olvasás**, URL-t sehol nem találtam ki.

| Gitlink | Platform-pin SHA | GitHub-repó (Szantoi/\<név\>) | VPS-forrás (`/opt/joinerytech/src/<modul>`) |
|---|---|---|---|
| `joinerytech-keycloak-theme` | `28be672c3a1e29f8b4ba6315c9fb67d13f1f6b94` | **nem létezik** (`gh repo view` 404; nincs a 44 repós listában sem) | **van, saját git-történettel**, HEAD `28be672` — **pontosan egyezik a platform-pinnel** — de `git remote -v` üres (soha nem lett pusholva sehova) |
| `spaceos-modules-identity` | `c1324ec65f5eac595fd5a0c6f4b1a82157915d68` | **nem létezik** (ugyanúgy 404) | **van, saját git-történettel**, HEAD `c1324ec` — **pontosan egyezik a platform-pinnel** — `remote -v` szintén üres |
| `spaceos-modules-sales` | `07e76a1396ec4fcf0a6d72cb84c88a4406119cd1` | **nem létezik** | **NINCS git-előzmény egyáltalán** — a VPS-en a `/opt/joinerytech/src/spaceos-modules-sales` könyvtár **teljesen üres** (`drwxrwx--- gabor gabor`, módosítási idő **2026-07-22 08:26 — ma**), tehát a platform-pin SHA-ja jelenleg **sehol nem visszakereshető** |

**Az eredeti feltételezés (a `sales` repo "GitHubon nem létezik") megerősítve, de bővebben: mindhárom gitlink GitHubon nem létezik, viszont kettő (`keycloak-theme`, `identity`) forrása élő, verziózott állapotban megvan a VPS-en, pontos SHA-egyezéssel** — ezeknél a hiányzó GitHub-remote pótlása (egy új, üres GitHub-repó létrehozása + a meglévő VPS-lokális history pusholása + `.gitmodules`-bejegyzés) **elvi akadály nélkül elvégezhető**, csak nincs hozzá jóváhagyásom/hozzáférésem ezt a session-t végrehajtani (lásd a jóváhagyásra váró parancslistát lent). A `sales`-nél **nincs mit pusholni** — ott vagy a jelenlegi (üres) állapotból kell egy friss `git init`-tel indulni, vagy elő kell keríteni egy másik gépen/backupban megmaradt korábbi másolatot, mielőtt bármilyen `.gitmodules`-fix értelmezhető volna.

**⚠️ Külön, sürgős élő lelet (nem ennek a tasknak a hatóköre, de a smoke-ellenőrzés közben, kizárólag olvasással bukkant fel rá — lásd 4. pont):** a `spaceos-modules-sales` **futó** VPS-service (`spaceos-modules-sales.service`, port 5009) jelenleg egy **mára (2026-07-22 08:26) teljesen kiürült** könyvtárból (`.../publish/SpaceOS.Modules.Sales.Api.dll`) fut tovább — ez a Linux-os "nyitva tartott, de törölt fájl" jelenség, amit a 2026-07-16-i incidens is dokumentál. A folyamat egyelőre válaszol (bár hibásan, lásd 4. pont), de **egy esetleges restart/reboot után nem tudna újraindulni**, mert nincs miből. Ezt **nem én okoztam** (kizárólag `ls`/`sudo ls`/`systemctl show`/`git status`/`find -maxdepth 1` futott, mind olvasás), valószínűleg egy másik, ma párhuzamosan futó folyamat/terminál törölte vagy mozgatta el a könyvtárat. **Gábor figyelmét igényli, mielőtt bárki restart-ot próbálna.**

### 2. Tiszta clone build/test reprodukció

**Ténylegesen futtatva** (nem csak dokumentálva), teljesen elkülönített scratch-könyvtárban
(`%TEMP%\jt-repro-smoke`, a felhasználó valódi munkafáján kívül, azt nem érintve/resetelve):

1. `git clone https://github.com/Szantoi/joinerytech-platform.git` — **sikeres**, ~13-15s
   (repó: 78 MB pack, 77 commit). Egy Windows-specifikus lelet: az alap `%TEMP%`-alatti
   session-scratchpad útvonal **túl mély/hosszú** volt ehhez (`Filename too long` /
   `cannot write keep file`) — `git -c core.longpaths=true` + rövidebb ideiglenes útvonal
   (`%TEMP%\jt-repro-smoke`) oldotta meg; ez környezeti (Windows path-length) korlát, nem
   repó-hiba, de dokumentálásra érdemes egy jövőbeli CI/Windows-runner miatt.
2. `git submodule status` a friss clone-ban **ugyanazzal a mapping-hibával áll le**, mint a
   valódi munkafán — megerősíti, hogy az 1. pont ténylegesen a repó állapota, nem
   gép-specifikus műveltség.
3. **Fontos, korábban nem dokumentált lelet:** a valódi munkafa `.git/config`-jában van egy
   `[url "https://github.com/"] insteadOf = git@github.com:` átírási szabály — ez **repó-lokális**
   (nincs a globális `~/.gitconfig`-ban), tehát egy friss clone **nem hozza magával**. Emellett
   ezen a gépen az SSH-kulcs önmagában **nem működik** GitHub ellen (`ssh -T git@github.com` →
   `Permission denied (publickey)`), tehát a `git@github.com:`-formátumú submodule-URL-ek
   (a legtöbb) **kizárólag** ennek az átírásnak köszönhetően érhetők el egyáltalán. Egy friss
   clone-on ezt manuálisan pótolni kell (`git config url."https://github.com/".insteadOf
   "git@github.com:"`, vagy a submodule-parancsra `-c`-ként), különben minden
   `submodule update --init` `Permission denied (publickey)`-vel bukik — **ez önmagában egy
   reprodukálhatósági rés**, amit érdemes lenne egy README/CONTRIBUTING-lépésként rögzíteni
   (jóváhagyásra váró tétel, lásd lent).
4. Reprezentatív részhalmaz inicializálva (`git submodule update --init --
   src/joinerytech-portal src/spaceos-modules-contracts src/spaceos-modules-abstractions`,
   a fenti insteadOf-fixszel) — **sikeres**, ~18s.

| Modul | Build | Teszt | Megjegyzés |
|---|---|---|---|
| `spaceos-modules-abstractions` | ✅ `dotnet build -c Release` — 0 hiba | ✅ **81/81 zöld** (`dotnet test`, 1s) | tiszta |
| `spaceos-modules-contracts` | ❌ **`dotnet build` HIBÁVAL BUKIK** | (nem futott, a build előfeltétel) | **valódi, előre nem ismert lelet**: a pinnelt commit (`59a9d4c`, „feat(events): add cross-module integration events") `AssetDowntimeEvent.cs`-e `MediatR.INotification`-t használ, de a `.csproj` nem tartalmaz `PackageReference`-t a `MediatR`-hez (`CS0246`, 2 hiba). Nem környezeti/gépspecifikus — a pontosan pinnelt commit ténylegesen nem fordul önmagában. |
| `joinerytech-portal` | ✅ `npm run build` (`tsc -b && vite build`) — sikeres | ✅ **634/634 zöld** (`npm run test:pr`, 245s; a `test:full`/nightly réteget időkorlát miatt nem futtattam újra) | `npm ci` **alapból elbukik** (`ERESOLVE`: `react-slider@2.0.6` peer `react ^16‖17‖18` vs. gyökér `react@^19.2.5`) — nincs commitolt `.npmrc`/`packageManager`-mező. `npm ci --legacy-peer-deps` szükséges (**ez is reprodukálhatósági rés**, jóváhagyásra váró tétel). |

**Összefoglalva, pontosan elhatárolva mi verifikált és mi csak dokumentált ajánlás:**
- **Ténylegesen lefuttatva és bizonyítva:** friss clone + longpaths-fix + insteadOf-fix +
  `--legacy-peer-deps` mellett `spaceos-modules-abstractions` és `joinerytech-portal`
  build+teszt zöld; `spaceos-modules-contracts` build **ténylegesen elbukik** a pinnelt
  commit-on (nem feltételezés).
- **Nem futtatva, csak dokumentált ajánlás:** a teljes 11 submodule + a portál `test:full`/
  `test:nightly` rétegének tiszta clone-os lefuttatása (időkeret miatt nem fért bele ebbe a
  körbe); a `cutting`, `inventory`, `procurement`, `joinery`, `identity`, `sales` modulok
  saját `NuGet.Config`-jainak tiszta clone-os viselkedése (ismert, korábban dokumentált
  VPS-only-fix probléma, ezt a kört nem ismételtem meg).

### 3. Health endpoint contract — teljes felmérés

Minden `Program.cs` bejárva a repóban (`find src -iname Program.cs`) + a Node.js
knowledge-service (Nexus MCP) route-fájljai:

| Szolgáltatás | Végpont(ok) | Stílus |
|---|---|---|
| `spaceos-kernel` (Kernel API) | `/healthz` (mindig 200, DB-független liveness) + `/health/ready` (valódi `AddHealthChecks`+JWKS-dependencia) | **egyetlen tényleges live/ready-szétválasztás a .NET hostok között** |
| `spaceos-modules-procurement` | `/healthz` (liveness) + `/health/ready` (egyedi DB-check) | hasonló hibrid, más névkonvencióval |
| `spaceos-modules-cutting` | `/healthz` (`MapHealthChecks`) | legacy, egyetlen végpont |
| CRM, Kontrolling, HR, Maintenance, QA, EHS (`src/ehs`), `spaceos-modules-inventory` | `/health` (`AddHealthChecks`+`MapHealthChecks`) | legacy, egyetlen végpont, de valódi HealthCheck middleware |
| `dms` | `/health` (statikus `MapGet`, mindig `{status:"ok"}`) | legacy, nem valódi dependency-check |
| `spaceos-modules-joinery` | `/health` (statikus `MapGet`) | legacy, nem valódi dependency-check |
| `spaceos-modules-ehs` (ADR-061 hosting-mintás EHS-újraírás) | **nincs health endpoint egyáltalán** | **rés** |
| `spaceos-modules-joinerytech` (`SpaceOS.Modules.JoineryTech.Api`) | **nincs health endpoint egyáltalán** | **rés** |
| `spaceos-modules-production` (`Production.Api`) | **nincs health endpoint egyáltalán** | **rés** |
| `spaceos-orchestrator` (Node.js BFF) | élőben lekérdezve: `/health`, `/healthz`, `/api/health` mind **404** | **rés** (élő VPS-bizonyíték, nem csak forráskód-hiány — a forrás maga nincs lokálisan checkoutolva, a submodule üres) |
| `joinerytech-nexus/knowledge-service` (Nexus MCP, Node.js) | `/health` (legacy státusz), `/ready` (valódi vectorBackend/isReady-check), `/live` (uptime/memory) | **live/ready-szétválasztás megvan**, csak nem a `/health/live`+`/health/ready` prefix-konvenció szerint (gyökér-szinten `/live` és `/ready`, nem `/health/live`) |

**Elfogadási kritérium („minden HTTP service-hez van live/ready mapping vagy explicit kivétel")
státusza:** a 14 ismert host közül **2 hostnak van tényleges live/ready-szétválasztása**
(kernel, procurement), **9-nek van legacy egyetlen végpontja** (dokumentált kompatibilis
kivétel a task megfogalmazása szerint), **3-nak nincs semmije** (`spaceos-modules-ehs`,
`spaceos-modules-joinerytech`, `spaceos-modules-production`) — ez utóbbi 3 + az orchestrator
(élőben 404) a valódi rés. A task Stop-klózával összhangban (health endpoint mutáció több
submodule-t érint → külön file-lock/review) **nem nyúltam ezekhez a fájlokhoz** — csak
felmértem és dokumentáltam.

### 4. Safe smoke script

`scripts/Invoke-VpsHealthSmoke.ps1` — új, kizárólag olvasó PowerShell-script (5.1-kompatibilis,
`#requires -Version 5.1`; a gépen nem volt elérhető `pwsh`, ezért Windows PowerShell 5.1 alatt
írva és futtatva). Kizárólag `systemctl show`, `sudo ss -tlnp`, `curl -s -o /dev/null` GET-eket
futtat SSH-n át — sem `systemctl start/stop/restart`, sem `git pull`, sem mutáló HTTP-verb,
sem fájlírás a távoli gépen. Secretet/env-értéket sosem ír ki.

**Három valódi, futtatás közben felfedezett hiba, amit menet közben javítottam** (nem
elméleti/elvi hibák, hanem a szkript első futtatásakor ténylegesen elszálltak):
1. `$x = if (...) {...} else {...}` kifejezés-mintát használtam — ez **PowerShell 7+-only**
   szintaxis, Windows PowerShell 5.1 alatt parse-hibát dob (két helyen javítva sima
   if/elseif/else-re).
2. A fájl nem-ASCII díszítő karaktereket tartalmazott (em-dash, doboz-rajzoló vonalak) BOM
   nélkül — PowerShell 5.1 a script-fájlt ilyenkor a rendszer ANSI-kódlapján olvassa, ami a
   többbájtos UTF-8-szekvenciákat félreértelmezve **string-terminátor hibákat** okozott
   (mind eltávolítva, sima ASCII-re cserélve).
3. Az SSH-nak stdinen átadott generált bash-szkript PowerShell 5.1 alatt pipeline-on keresztül
   **UTF-8 BOM-mal** kezdődött (`$OutputEncoding` beállítása nem segített), amit a bash
   `set: -`/`command not found` hibával utasított el; illetve a `.NET StringBuilder.AppendLine()`
   CRLF sortöréseket generált, ami a `set -u`-t törte el bash oldalon. Megoldás: a generált
   szkriptet BOM nélküli ideiglenes fájlba írva, LF-re normalizálva, `cmd /c "ssh ... < fájl"`
   átirányítással küldve (nem PowerShell-pipeline-on).

**Valódi, élő futtatás eredménye a VPS ellen (2026-07-22, ismételve, konzisztens eredménnyel):**

| Szolgáltatás | ActiveState | MainPID | Listener PID (`ss`) | PID-egyezés | Port | Health |
|---|---|---|---|---|---|---|
| kernel | active | 1733272 | 1733272 | ✅ Match | 5000 | `/healthz`=200, `/health/ready`=200 |
| orchestrator | active | 1733275 | 1733275 | ✅ Match | 3000 | `/health`=404, `/healthz`=404 |
| knowledge (Nexus MCP) | active | 3583761 | 3583761 | ✅ Match | 3458 | `/health`=200, `/ready`=200, `/live`=200 |
| joinery | active | 1733283 | 1733283 | ✅ Match | 5002 | `/health`=200 |
| abstractions | active | 1733282 | 1733282 | ✅ Match | 5003 | `/health`=200 |
| inventory | active | 1733271 | 1733271 | ✅ Match | 5004 | `/health`=200 |
| cutting-svc | active | 4013435 | 4013435 | ✅ Match | 5005 | `/healthz`=200 |
| procurement | active | 1733247 | 1733247 | ✅ Match | 5006 | `/healthz`=200, `/health/ready`=200 |
| identity | active | 1733273 | 1733273 | ✅ Match | 5008 | `/health`=200 |
| **sales** | active | 1733274 | 1733274 | ✅ Match | 5009 | **`/health`=500, `/healthz`=500** |
| minio | active | 804 | 804 | ✅ Match | 9001 | (nem HTTP-health-ellenőrzött, csak lét) |

**Mind a 11 szolgáltatás MainPID↔listener-PID egyezéssel igazolt — jelenleg nincs a
2026-07-16/21-i mintájú "árva processz" a portszámokon.** A script exit code-ja `1`
(`OverallStatus=Attention`), mert 2 valódi health-találat van:
- **orchestrator**: nincs health-végpont (lásd 3. pont) — 404 minden próbált útvonalon.
- **sales**: `journalctl -u spaceos-modules-sales --no-pager -n 40` (csak olvasás) szerint
  `System.IO.FileNotFoundException: Could not load file or assembly
  'System.IdentityModel.Tokens.Jwt, Version=7.1.2.0, ...'` — hiányzó/verzió-eltérő assembly a
  JWT-bearer-middleware inicializálásakor, minden kérésen elszáll (nem csak a health-en). Ez
  egybevág az 1. pontban dokumentált, ma (2026-07-22 08:26) kiürült `publish/` könyvtárral —
  a folyamat egy korábbi, hiányos/inkonzisztens publish-állapotból fut tovább.

JSON summary minta (`-SummaryPath`-szal írva, `%TEMP%\jt-smoke-final.json`, 277 sor) —
géppel olvasható, `Services[]` + `KeycloakConfig[]` + `OverallStatus` mezőkkel.

### 5. Keycloak audience/redirect előfeltételek

Csak olvasás — `appsettings.json` `Jwt`-szekciók (Authority/Audience, egyik sem secret) +
a VPS-en **kulcsnevek** ellenőrzése env-fájlokban (érték soha nem olvasva/kiírva) +
a portál `authConfig.ts`/`.env.local` tartalma (nem secret, csak `VITE_AUTH_MODE=mock`).

| Modul-kör | Authority (tracked fájlban) | Audience | Megjegyzés |
|---|---|---|---|
| kernel, ehs (mindkét változat), qa, hr, maintenance, dms, kontrolling, crm (8 host) | `https://joinerytech.hu/auth/realms/spaceos` | modulonként egyedi (`kernel-api`, `ehs-api`, `qa-api`, `hr-api`, `maintenance-api`, `dms-api`, `kontrolling-api`, `crm-api`) | **konzisztens** — az ADR-061 közös Keycloak-huzalozás szerint |
| cutting, inventory, procurement, joinery (4 modul) | **üres** a trackelt fájlban, `Audience` mindegyiknél a placeholder `kernel-api` | — | VPS-en (`/etc/spaceos/cutting.env`, `/etc/spaceos/joinery.env`) **megerősítve, hogy létezik** `Jwt__Authority` + `Jwt__Audience` (és redundánsan `JWT_AUTHORITY`/`JWT_AUDIENCE`, `Authentication__Schemes__Bearer__Authority` is) kulcs — **csak a kulcsnév ellenőrizve, érték nem olvasva**. Tehát ez **szándékos env-override, nem hiba** — de a trackelt placeholder-audience (`kernel-api` 4 különböző modulon) dokumentációs zaj, érdemes lenne tisztázni. |
| `spaceos-modules-joinerytech` | **nincs `Authority`/`Issuer`-alapú Keycloak-integráció** | `Audience="joinerytech-client"`, saját `Issuer="joinerytech-api"` | **eltérő auth-séma**: saját, önaláírt ECDSA-JWT (`TokenService`), nem Keycloak — inkonzisztens a többi hosttal, külön figyelmet igényel (lásd `Get-KeycloakConfigConsistency` funkció jegyzete a szkriptben) |
| Portál (`joinerytech-portal`) | `authConfig.ts`: `authority: https://joinerytech.hu/auth/realms/spaceos`, `client_id: portal-app`, `redirect_uri: {origin}/callback` | — | A korábban dokumentált „`portal-app` Keycloak-kliens localhost redirect URI hiányzik" adósság **továbbra is fennáll** (Keycloak-szerver-oldali beállítás, admin-hozzáférés nélkül nem ellenőrizhető innen) — a dev-bypass (`.env.local`: `VITE_AUTH_MODE=mock`, csak `import.meta.env.DEV`-ben aktív a kódban is) **jelen van és konzisztens a dokumentációval**. |

### 6. Jóváhagyásra váró parancslista (EGYIKET SEM FUTTATTAM)

- **Gitlink-helyreállítás (`keycloak-theme`, `identity`) — csak ha Gábor jóváhagyja, és csak
  a VPS-ről pusholva** (a VPS-lokális git-history a hiteles forrás, SHA-egyezéssel
  igazolva — lásd 1. pont):
  ```
  # VPS-en, az adott könyvtárban:
  gh repo create Szantoi/<repo-nev> --private --source=. --remote=origin
  git push origin HEAD:main
  # Utána a platformban:
  git config -f .gitmodules submodule.src/<path>.url git@github.com:Szantoi/<repo-nev>.git
  git submodule sync
  ```
- **`sales` gitlink**: nincs javasolható parancs — nincs git-history, amit pusholni lehetne
  (lásd 1. pont); ez Gábor döntése (friss `git init` a jelenlegi VPS-állapotból, vagy
  a gitlink formális törlése/orphan-jelölése `git rm --cached src/spaceos-modules-sales`-sel).
- **Portál `npm ci` reprodukálhatóság**: `.npmrc` felvétele `legacy-peer-deps=true` sorral a
  `joinerytech-portal` repóba (vagy a `react-slider` lecserélése egy React 19-kompatibilis
  csomagra) — külön repó, külön jóváhagyás kell.
- **`spaceos-modules-contracts` MediatR-hiány**: `<PackageReference Include="MediatR"
  Version="12.4.1" />` felvétele a `.csproj`-ba — külön repó/pin, külön jóváhagyás kell.
- **Health-endpoint rések zárása** (`spaceos-modules-ehs`, `spaceos-modules-joinerytech`,
  `spaceos-modules-production`, `spaceos-orchestrator`): a task Stop-klózával összhangban
  **nem** javasolok azonnali diffet — ez 4 különböző submodule-t érint, külön file-lock/review
  kell modulonként.
- **`sales`-service VPS-incidens** (1./4. pont): **restart/redeploy TILOS jóváhagyás nélkül**
  — ezt kifejezetten emberi döntésnek hagyom (a publish-könyvtár ma ürült ki, az ok
  tisztázatlan; egy vaktában futtatott `systemctl restart` a jelenlegi állapotban garantáltan
  el is bukna, mert nincs miből elindulnia).

## Átadási bizonyíték

- **Gitlink-leltár**: `gh repo view Szantoi/{joinerytech-keycloak-theme,spaceos-modules-identity,
  spaceos-modules-sales}` mindhárom esetben `GraphQL: Could not resolve to a Repository` — és
  `gh repo list Szantoi --limit 100` (44 repó, teljes lista bekérve) egyikük nevét sem
  tartalmazza. VPS-en (`ssh joinerytech-vps 'git -C /opt/joinerytech/src/<modul> remote -v;
  git -C ... log --oneline -1'`) **ténylegesen lefuttatva**: `keycloak-theme` HEAD `28be672`,
  `identity` HEAD `c1324ec` — mindkettő **byte-pontosan egyezik** a platform gitlink-SHA-jával
  (`git ls-files -s | grep 160000`); `sales`-nél a könyvtár üres, nincs `.git`.
- **Tiszta clone**: valódi `git clone` + reprezentatív `submodule update --init` + build/teszt
  **ténylegesen lefuttatva** elkülönített `%TEMP%`-scratch-ben (a valódi munkafa érintetlen
  maradt, git státusza a futtatás előtt/után azonos). `spaceos-modules-abstractions`:
  `dotnet build` 0 hiba, `dotnet test` **81/81 zöld**. `joinerytech-portal`: `npm run build`
  sikeres, `npm run test:pr` **634/634 zöld** (245s). `spaceos-modules-contracts`: `dotnet
  build` **ténylegesen elbukik** 2 `CS0246` hibával (MediatR hiányzó referencia a pinnelt
  commit-on) — ez nem feltételezés, hanem futtatott, megfigyelt eredmény.
- **Health-contract felmérés**: mind a 14 ismert host `Program.cs`-e (illetve a Node
  knowledge-service route-fájljai) elolvasva; 3 host + az orchestrator hiánya élő
  `curl`-lekérdezéssel (VPS) is megerősítve (404 mindenhol, ahol nincs végpont).
- **Safe smoke script**: `scripts/Invoke-VpsHealthSmoke.ps1` — szintaktikailag ellenőrizve
  (`[System.Management.Automation.Language.Parser]::ParseInput`, 0 hiba) és **ténylegesen
  lefuttatva a valódi VPS ellen**, többször, konzisztens eredménnyel (lásd 4. pont táblázata).
  Kizárólag olvasó parancsokat tartalmaz (`systemctl show`, `sudo ss -tlnp`,
  `curl -s -o /dev/null -w '%{http_code}'`); nincs benne `restart`/`stop`/`start`/`git pull`/
  mutáló HTTP-hívás. Nem írt ki secretet — csak PID-eket, portokat, HTTP-státuszkódokat és a
  már amúgy is trackelt, nem-secret Authority/Audience URL-eket.
- **Keycloak-előfeltételek**: 9 host Authority/Audience-konfigurációja kiolvasva és táblázatba
  rendezve; a 4 „üres Authority" modulnál a VPS env-fájlokban **csak a kulcsnév** ellenőrizve
  (`sudo grep -oE '^[A-Za-z0-9_]+=' /etc/spaceos/{cutting,joinery}.env` — **egyetlen érték sem
  lett kiolvasva vagy kiírva**).
- **Nincs secret/token a kimenetben**: sem a task-dokumentumban, sem a szkriptben, sem a
  konzol-logban nem szerepel jelszó, connection string, JWT-secret vagy `.env`-érték —
  kizárólag kulcsnevek, PID-ek, portok, HTTP-kódok és már amúgy is publikus/trackelt URL-ek.
- **Nincs VPS-mutáció**: minden VPS-parancs `ls`/`sudo ls`/`systemctl show`/`sudo ss -tlnp`/
  `curl -s -o /dev/null`/`journalctl --no-pager`/`git remote -v`/`git log -1`/`git status
  --short`/`find -maxdepth 1` volt — egyik sem ír, indít, állít le vagy deployol bármit.
- **Érintett/létrehozott fájlok**: új — `scripts/Invoke-VpsHealthSmoke.ps1`; módosítva —
  `scripts/README.md` (új szakasz a szkripthez),
  `docs/tasks/EPIC-PLATFORM-STABILITY-2026Q3/STAB-RELEASE-REPRO.md` (ez a napló). `.gitmodules`
  és `EPICS.yaml` érintetlen.

