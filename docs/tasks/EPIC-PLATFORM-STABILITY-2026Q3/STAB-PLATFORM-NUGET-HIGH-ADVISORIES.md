# STAB-PLATFORM-NUGET-HIGH-ADVISORIES — platformszintű magas NuGet findingok lezárása

- **Epic:** EPIC-PLATFORM-STABILITY-2026Q3
- **Szerep:** backend/security + federation
- **Prioritás:** P0 security
- **Státusz:** in_progress — auditkapu independent security review APPROVED;
  moduljavítás owner lockokra vár
- **Kapcsolódó taskok:** `STAB-EHS-DEPENDENCY-ADVISORIES`,
  `STAB-PLATFORM-ASPNET22-RCE-REMOVAL`
- **Mutációs határ:** audit script/config/teszt/dokumentáció; az adott dependency
  szeletben felsorolt `.csproj`-ok, lock/assets eredmény ellenőrzésre, célzott
  tesztek
- **Tiltott scope:** package major upgrade előzetes compatibility döntés nélkül,
  domain/API viselkedés, migráció, portál, deploy

## Miért külön platformtask?

Az egyedi direct reference-ek mögött négy eltérő gyökérok van. Egyetlen
globális package-pin elfedné a modulok eltérő kompatibilitási és release-határát.
Ezért a munka csomagcsaládonként atomikus, de azonos biztonsági kapun zárul.

## Audit-baseline

A baseline parancs minden táblában szereplő belépőprojektre:

```powershell
dotnet list <project.csproj> package --vulnerable --include-transitive --no-restore
dotnet nuget why <project.csproj> <vulnerable-package>
```

A megismételhető kapu a `scripts/Invoke-DotNetPackageAudit.ps1`: explicit
projektet, newline-os `-ProjectListPath` bemenetet, tudatos `-Discover`
kapcsolót vagy teljes hostkapuhoz `-ReleaseInventory` módot kér. A 2026-07-22-i
független review findingjai javítva; a stabil változat independent security
reviewja `APPROVED` (2026-07-23).

- Checkout hostok: `config/nuget-release-projects.txt` — 15 forrásból
  auditálható belépőgráf.
- Nem auditálható, de VPS-en élő hostok:
  `config/nuget-unavailable-runtime-hosts.json` — jelenleg 3 blokkoló.

**Root független megerősítés (2026-07-23):** a végleges, javított szkriptet
saját magam is újrafuttattam, nem az önjelentésre hagyatkozva. `Invoke-Pester`:
**22/22 zöld**. `Invoke-DotNetPackageAudit.ps1 -ReleaseInventory`: exit 2 /
`Blocked`, **15 projekt, 0 audit error, 3 unavailable runtime host, 25 blocking
finding (2 critical + 23 high)** — pontosan egyezik a Codex által jelentett
baseline-nal. A `node_modules` proaktív kizárás és a Job Object alapú
process-tree-kill kódban is ellenőrizve. Commitolva: `platform@a0be291`.
- A `-ReleaseInventory` mindkettőt atomikusan betölti, `Program.cs` driftet
  ellenőriz, és nem adhat `Passed` eredményt, amíg a második lista nem üres.
- A teljes checkout library/test gráf kapuja `-Discover`; a hostlista önmagában
  nem bizonyít teljes platform dependency-tisztaságot.

### P0 runtime-forrás lefedettségi blokkoló

A VPS service-leltár szerint további három .NET runtime fut, de forrásuk nem
auditálható ebben a checkoutban: `spaceos-abstractions`,
`spaceos-modules-identity`, `spaceos-modules-sales`. Emiatt a 15 checkout host
eredménye önmagában soha nem lehet teljes platform release approval.

Megoldási sorrend minden hostra:

1. `STAB-RELEASE-REPRO` alatt állítsd helyre a pontos commitot/gitlinket és a
   reprodukálható buildet, vagy dokumentáltan vond ki a runtime-ból;
2. felépített forrás esetén vedd fel a checkout hostlistába, a machine-readable
   unavailable bejegyzést ugyanabban az atomikus változásban töröld;
3. futtasd a host célzott auditját, buildjét, smoke tesztjét és a teljes
   `-ReleaseInventory` kaput;
4. elfogadás: `unavailableRuntimeHosts == 0`, nincs inventory drift és nincs
   critical/high finding. A lista kézi kiürítése forrás/binary bizonyíték nélkül
   release-hamisítás, tilos.

### A. EF Core / Npgsql csomagcsalád

| Célgráf | Direct baseline | Feloldott magas finding |
|---|---|---|
| `src/dms/src/SpaceOS.Modules.DMS.csproj` | EF 8.0.7, Npgsql EF 8.0.0 | Cache 8.0.0, Npgsql 8.0.0, STJ 8.0.4 |
| `src/hr/src/SpaceOS.Modules.HR.csproj` | EF 8.0.7, Npgsql EF 8.0.0 | Cache 8.0.0, Npgsql 8.0.0, STJ 8.0.4 |
| `src/maintenance/src/SpaceOS.Modules.Maintenance.csproj` | EF 8.0.7, Npgsql EF 8.0.0 | Cache 8.0.0, Npgsql 8.0.0, STJ 8.0.4 |
| `src/qa/src/SpaceOS.Modules.QA.csproj` | EF 8.0.7, Npgsql EF 8.0.0 | Cache 8.0.0, Npgsql 8.0.0, STJ 8.0.4 |
| `src/SpaceOS.Modules.CRM/.../SpaceOS.Modules.CRM.Infrastructure.csproj` | EF 8.0.7, Npgsql EF 8.0.0 | Cache 8.0.0, Npgsql 8.0.0, STJ 8.0.4 |
| `src/spaceos-modules/spaceos-modules-hr/src/SpaceOS.Modules.HR.csproj` | EF/Npgsql EF 8.0.0 | Npgsql 8.0.0, STJ 8.0.0 (két advisory) |
| `src/spaceos-modules/spaceos-modules-kontrolling/src/SpaceOS.Modules.Kontrolling.csproj` | EF 8.0.7, Npgsql EF 8.0.0 | Npgsql 8.0.0, STJ 8.0.4 |
| `src/spaceos-modules-production/Production.Infrastructure/Production.Infrastructure.csproj` | EF/Npgsql EF 8.0.0 | Cache 8.0.0, Npgsql 8.0.0 |
| `src/spaceos-modules-ehs/Ehs.Api/Ehs.Api.csproj` | EF/Npgsql EF 8.0.4 | Cache 8.0.0 |

A Production tesztprojekt közvetlen Npgsql EF 8.0.0 referenciája ugyanebbe a
szeletbe tartozik. A modulok tesztgráfját is auditálni kell, mert a projekt-
referenciák révén ugyanazok a findingok továbbterjednek.

Biztonsági minimumok:

- Npgsql: az SQL/protokoll-injection advisory a 8.0.0–8.0.2 verziókat érinti;
  javított minimum 8.0.3.
- `System.Text.Json`: a két ismert DoS miatt a feloldott verzió legalább 8.0.5
  legyen. A 8.0.4 az egyik hibát javítja, de a másikban még érintett.
- `Microsoft.Extensions.Caching.Memory`: .NET 8 javított minimum 8.0.1.

Hivatalos advisoryk:

- https://github.com/advisories/GHSA-x9vc-6hfv-hg8c
- https://github.com/advisories/GHSA-hh2w-p6rv-4g7w
- https://github.com/advisories/GHSA-8g4q-xg66-9fp4
- https://github.com/advisories/GHSA-qj66-m88j-hmgj

### B. JoineryTech IdentityModel → Microsoft.Bcl.Memory

`src/spaceos-modules-joinerytech/SpaceOS.Modules.JoineryTech.Infrastructure`
direct `System.IdentityModel.Tokens.Jwt` és `Microsoft.IdentityModel.Tokens`
8.3.1 csomagjai `Microsoft.Bcl.Memory 9.0.0`-t oldanak fel. Ez a
`CVE-2026-26127` DoS findingban érintett; a 9-es ág javított minimuma 9.0.14.
Ugyanebben a gráfban a kritikus `System.Text.Encodings.Web 4.5.0` külön az
ASPNET22 task felelőssége.

Advisory: https://github.com/advisories/GHSA-73j8-2gch-69rq

### C. SQLitePCLRaw natív SQLite

Az alábbi gráfok `SQLitePCLRaw.lib.e_sqlite3 2.1.6`-ot oldanak fel:

- Kernel `SpaceOS.Infrastructure` — runtime is;
- Kernel API/unit/integration tesztek;
- Cutting tesztprojekt;
- Inventory tesztprojekt.

A finding a SQLite 3.50.2 előtti natív kódot érinti. Az upstream 2.1.12
maintenance release kifejezetten `SQLitePCLRaw.lib.e_sqlite3 3.53.3`-ra irányítja
a 2.1-es bundle-ágat; ez az elsőként vizsgálandó kompatibilis javítási út.
A GitHub advisory jelenlegi metadata-mezője még nem jelöl patched package-
verziót, ezért a verziószám önmagában nem bizonyíték: a restore utáni natív
library-verzió és a vulnerability-scan együtt kötelező.

- Advisory: https://github.com/advisories/GHSA-2m69-gcr7-jv3q
- Upstream maintenance release:
  https://github.com/ericsink/SQLitePCL.raw/releases/tag/v2.1.12

### D. xUnit 2.5.3 → NETStandard.Library 1.6.1

A Cutting, Inventory, Joinery, JoineryTech és Procurement régi tesztprojektjei
xUnit 2.5.3-at kérnek. A bizonyított Cutting/Inventory gráfban ez a lánc
`System.Net.Http 4.3.0` és `System.Text.RegularExpressions 4.3.0` magas
advisorykat hoz. A repo más net8 tesztjeiben az xUnit 2.9.x + runner 2.8.x minta
már működik és ezt a két láncot nem materializálja.

Ez teszt-only finding, de a CI dependency gate része. Nem indok xUnit v3
migrációra; a legkisebb konzisztens 2.9.x frissítés az alapértelmezett.

## Végrehajtási szeletek

### S0 — modulonkénti EF/Npgsql patch alignment

Minden táblában szereplő modul külön fájlzárral készül:

1. Mentsd a direct/transitive baseline-t és a három `nuget why` útvonalat.
2. Az EF Core, Relational, Design és Npgsql EF csomagokat egy kompatibilis
   8.0.x patch-családra igazítsd. A repo jelenlegi 8.0.11 mintája elfogadott
   minimumjelölt, de a kiválasztott verziót friss restore + audit dönti el.
3. Ne adj direct Npgsql/STJ/cache pint, ha a parent package rendezett frissítése
   tiszta gráfot ad. Pin csak dokumentált upstream constraint esetén.
4. Build, modul gyors suite, migrációs snapshot-diff: sémaváltozás nem lehet.
5. Runtime és teszt belépőgráf `--vulnerable` kimenete legyen üres.

### S1 — JoineryTech IdentityModel lockstep update

1. Azonosítsd azt a támogatott IdentityModel 8.x patchpárt, amely legalább
   `Microsoft.Bcl.Memory 9.0.14`-et old fel.
2. A JWT és Tokens csomagot együtt frissítsd; vegyes minor/patch tilos.
3. Ha az upstream továbbra is sérülékeny minimumot kér, explicit
   `Microsoft.Bcl.Memory 9.0.14` security pin csak restore- és auth-teszttel
   elfogadható.
4. JWT signature/issuer/audience/expiry negatív tesztek, tenant-claim teszt,
   API build és vulnerability-scan kötelező.

### S2 — SQLite natív bundle frissítés

1. Kernel owner lock alatt először `SQLitePCLRaw.bundle_e_sqlite3 2.1.12`
   explicit minimumot vizsgálj, amely upstream szerint 3.53.3 natív libraryre
   mutat; major bundle-migráció csak akkor, ha ez nem kompatibilis.
2. Kernel persistence és minden SQLite-teszt fusson Windows és Linux targeten.
3. Ugyanezt a bizonyított mintát külön gitlink-lockkal vidd át Cuttingre és
   Inventoryra.
4. Ellenőrizd a publish output natív `e_sqlite3` verzióját; ne csak a managed
   bundle package számát.

### S3 — tesztcsomag-higiénia

1. Repo-owner lockon belül xUnit 2.5.3 → a repo bevált 2.9.x ága,
   runner → kompatibilis 2.8.x, pontosan e nyolc projektben:
   - `src/spaceos-modules-cutting/tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj`;
   - `src/spaceos-modules-cutting/tests/SpaceOS.Modules.Cutting.Infrastructure.Tests/SpaceOS.Modules.Cutting.Infrastructure.Tests.csproj`;
   - `src/spaceos-modules-cutting/tests/SpaceOS.Modules.Cutting.Contracts.Tests/SpaceOS.Modules.Cutting.Contracts.Tests.csproj`;
   - `src/spaceos-modules-cutting/src/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj`;
   - `src/spaceos-modules-inventory/tests/SpaceOS.Modules.Inventory.Tests/SpaceOS.Modules.Inventory.Tests.csproj`;
   - `src/spaceos-modules-joinery/SpaceOS.Modules.Joinery.Tests/SpaceOS.Modules.Joinery.Tests.csproj`;
   - `src/spaceos-modules-joinerytech/SpaceOS.Modules.JoineryTech.Tests/SpaceOS.Modules.JoineryTech.Tests.csproj`;
   - `src/spaceos-modules-procurement/tests/SpaceOS.Modules.Procurement.Tests/SpaceOS.Modules.Procurement.Tests.csproj`.
2. Ne keverd xUnit v3 migrációval és ne írd át a teszt API-kat, ha a
   patch/minor frissítés elegendő.
3. Minden frissített suite teljesen zöld; `System.Net.Http 4.3.0` és
   `System.Text.RegularExpressions 4.3.0` tűnjön el a NuGet auditból.

### S4 — Cutting WireMock tesztgráf

Az S3 nem rendezi a
`SpaceOS.Modules.Cutting.Infrastructure.Tests.csproj` közvetlen
`WireMock.Net 1.5.70` kérését, amely jelenleg 1.6.0-ra oldódik és
`Scriban.Signed 5.5.0` (1 critical + 8 high) valamint
`System.Linq.Dynamic.Core 1.3.12` (high) láncot hoz.

1. Külön Cutting owner lock; előtte `nuget why` mindkét sérülékeny csomagra.
2. A legkisebb kompatibilis WireMock-frissítést válaszd, amelynek restore-olt
   gráfjában egyik lánc sem marad; direct security pin csak dokumentált
   upstream constraint mellett.
3. Futtasd a teljes Infrastructure.Tests suite-ot, különösen HTTP matching,
   body/template és proxy viselkedést; majd célzott és teljes audit.
4. Major WireMock API-törésnél állj meg compatibility döntésre; ne alakítsd át
   opportunista módon a tesztarchitektúrát.

### S5 — test-host és Testcontainers patch alignment

A hostgráf tisztítása nem fedi le az alábbi direct tesztcsomagokat:

- `Mvc.Testing 8.0.0`:
  `src/spaceos-modules/spaceos-modules-crm/tests/SpaceOS.Modules.CRM.Tests.csproj`,
  `src/spaceos-modules/spaceos-modules-hr/tests/SpaceOS.Modules.HR.Tests.csproj`,
  `src/spaceos-modules/spaceos-modules-kontrolling/tests/SpaceOS.Modules.Kontrolling.Tests.csproj`,
  `src/spaceos-modules-ehs/Ehs.Tests/Ehs.Tests.csproj`;
- `Mvc.Testing 8.0.7`:
  `src/dms/tests/SpaceOS.Modules.DMS.Tests.csproj`,
  `src/hr/tests/SpaceOS.Modules.HR.Tests.csproj`;
- `Testcontainers.PostgreSql 3.7.0`:
  `src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.RlsFixtures/SpaceOS.Modules.Hosting.RlsFixtures.csproj`
  és `src/dms/tests/SpaceOS.Modules.DMS.Tests.csproj`; a DMS projekt közvetlen
  `Testcontainers 3.7.0` referenciája ugyanebbe a fájlzárba tartozik;
- `Testcontainers` + `Testcontainers.PostgreSql 3.5.0`:
  `src/spaceos-modules-ehs/Ehs.Tests/Ehs.Tests.csproj`; mindkét direct gyökér
  STJ 8.0.0 findinghoz vezet, ezért együtt frissítendő.

Agentenként egy repo/fájlzár használható. Kötelező lépések:

1. direct + transitive baseline és `nuget why System.Text.Json`;
2. a modul runtime EF/ASP.NET patch-családjával azonos, támogatott 8.0.x
   `Mvc.Testing` verzió, illetve kompatibilis Testcontainers patch/minor;
3. teljes érintett suite, valódi Testcontainers cleanup-kapuval;
4. restore után STJ legalább 8.0.5 a net8 ágban; nincs schema/domain változás;
5. a célzott projektek és a teljes `-Discover` audit is újrafut.

## Végrehajtási napló

### 2026-07-22 — auditkapu jelölt, security review után reopened

- Elkészült a `scripts/Invoke-DotNetPackageAudit.ps1`: explicit projektlista
  vagy `-Discover` opt-in, soros feldolgozás, projektenkénti timeout, alapból
  `--no-restore`, stabil JSON séma és severity-küszöb szerinti exit code.
- A script csak a megadott `RootPath` alatti létező `.csproj`-ot fogad; natív
  processzt shell nélkül indít, és sikeres futásnál nem őriz nyers logot.
- Pester első stabil kör: **7/7 zöld** (első futás 5/7, majd PS 5.1
  generikus-lista kompatibilitási javítás után 7/7). A többprojektes
  `powershell -File` array-binding rés után külön `-ProjectListPath` bemenet
  és stabil release-host config került a kapuba; a kibővített suite **8/8
  zöld**.
- Valós failing minta: EHS API → exit 1 / `Failed`; a direct csomagoknál később
  bizonyított parser-rés miatt a findingdarabszám nem tekinthető teljesnek.
- Valós clean minta: Contracts → exit 0 / `Passed`, 0 finding.
- Script/task/README diff-check tiszta volt, de ez nem helyettesíti a következő
  adversarial findingok javítását: top-level `requested + resolved` sorok,
  több target-framework continuation owner, audit-source hiba fail-closed
  felismerése, gyermekfolyamatot is lezáró kemény timeout, pontosan egy stdout
  JSON SummaryPath-hibánál, valamint RootPath alá rejtett junction/reparse-point
  fail-closed tiltása.

### 2026-07-22 — előzetes release-host alsó becslés

A 15 configban rögzített release-host sorosan, restore nélkül lefutott. A
direct-package parser hiba miatt az eredmény csak **alsó becslés**:

- 15/15 auditálható, **0 audit error**;
- **25 critical/high finding**;
- clean: Cutting, Inventory, Procurement;
- critical: Joinery és JoineryTech `System.Text.Encodings.Web 4.5.0`;
- high: modern DMS/EHS/HR/Maintenance/QA/CRM, Kernel, legacy
  Kontrolling/EHS és Production.

A `powershell -File ... -ProjectListPath config/nuget-release-projects.txt`
CLI visszaellenőrzés exit 1 / `Failed`, 15 projekt, 0 audit error és legalább
25 blocking finding eredményt adott. A teljes baseline-t a parserjavítás után
újra kell mérni; a 25 nem végleges release-szám.

A baseline miatt a legacy EHS cache-gráf bekerült az S0-ba. A hosteredmény
elsődleges release-kapu; a library/test audit továbbra is külön kötelező.

## Root + Codex konvergáló review az auditkapun — 2026-07-22

Két, egymástól független adversarial review (root saját agentje + Codex
fresh-context reviewere) konvergált a két legsúlyosabb hibamódra, és további
eltérő P1/P2 findingokat is adott az `Invoke-DotNetPackageAudit.ps1`-hez:

1. **Timeout/process-tree:** a timeout `Process.Kill()`-je csak a szülő
   `dotnet` processzt öli (nem a teljes fát, pl. egy leragadt MSBuild/VBCSCompiler
   node-ot), és a `Kill()` utáni `WaitForExit()` korlátlan — elakadt processz
   esetén a teljes auditkapu lefagyhat.
2. **Parser/audit-source fail-open rés:** a közvetlen NuGet-sor `requested +
   resolved` alakját a parser kihagyja. Emellett nem véd a `dotnet` saját "nem sikerült
   ellenőrizni a sérülékenységeket" (NU1900-osztályú) figyelmeztetése ellen —
   degradált/offline audit-forrás esetén a script csendben "Clean/0 finding"-et
   jelentene, megkülönböztethetetlenül egy valóban tiszta projekttől. Ez pont
   az a hibamód, ami egy biztonsági release-kapunál a legveszélyesebb (hamis
   negatív).

A natív argument-quoting és az exit-code szerződés biztonságos. A lexikális
`..` path-traversal tiltott, de egy RootPath alatti, repón kívülre mutató
junction/reparse-point még megkerüli a containmentet; ezt külön fail-closed
kell tiltani. További P2 finding a több-frameworkes continuation owner és a
SummaryPath-hibánál kibocsátott két stdout JSON. A jelenlegi **15 projekt / 25
finding baseline emiatt csak alsó
becslés** — a valódi szám a parser-fix után változhat. A javított verzióig a
scriptes review szünetel mindkét oldalon; Codex jelez, amint kész.

### 2026-07-22 — fail-closed javítás kész, review requested

- A parser külön kezeli a direct `requested + resolved` és transitive sorokat;
  strukturális határon nullázza a continuation ownert. Egy független
  severity+advisory sorszámláló formátumváltozásnál is `AuditError`-t kényszerít.
- `NU1900` exit 0 mellett is `AuditError`; hiányos stdout/stderr capture sem
  válhat `Clean` eredménnyé.
- A `dotnet` folyamat induláskor Windows Job Objectbe kerül
  `KILL_ON_JOB_CLOSE` limittel. Így a parent exit 0 után örökölt stdoutot tartó
  child is takarítható; timeoutkor Job termination, majd shell nélküli
  `taskkill /T /F` és közvetlen fallback áll rendelkezésre. Minden kill és
  mindkét async stream várása bounded; Faulted/Canceled stream is
  `captureError`, nincs korlátlan `WaitForExit()` vagy `.Result`.
- Root alatti junction/symlink tiltott a project- és listafájl-útvonalban;
  `-Discover` kihagyja a dependency/generated fákat. SummaryPath-hiba előtt
  nincs success stdout, így minden futás pontosan egy JSON dokumentumot ad.
- Új `-ReleaseInventory` mód összeveti a configot minden checkoutolt,
  nem-script `Program.cs` hosttal és gépileg blokkolja a három forráshiányos
  VPS runtime-ot.
- Pester/adversarial suite: **22/22 zöld**. Ebben valódi junction, egyetlen JSON,
  NU1900 classification, inventory drift és unavailable-host blokk is van.
- Friss checkout-host futás: **15 projekt, 0 audit error, 25 blocking finding
  (2 critical + 23 high)**. A direct parser javítása után ez már nem alsó
  becslés a 15 checkout host körében.
- Friss teljes hostkapu: exit 2 / `Blocked`, 15 auditált projekt, 25 finding és
  **3 unavailable runtime host** (`abstractions`, `identity`, `sales`). Ez a
  helyes platform release eredmény, nem hamis `Failed`/`Passed`.
- Független teljes checkout `-Discover`: **97 projekt, 0 audit error, 130
  finding**, ebből **117 blocking = 9 critical + 108 high**. Ez a végrehajtási
  backlog kiinduló baseline-ja; a hoston kívüli S3–S5 szeletek ezért kötelezők.
- A javított script/config/docs diff megújított independent security reviewja
  **APPROVED**, P0–P3 finding nélkül. A reviewer külön fake-dotnet child-
  processt, timeoutot, faulted/canceled streamet és valós projectauditokat futtatott.

## Elfogadási kritériumok

- [ ] A kilenc EF/Npgsql/cache célgráfban nincs critical/high advisory.
- [x] A determinisztikus audit script adversarial parser/timeout/JSON/reparse
  tesztje és valós clean/failing integrációs mintája zöld; independent review
  APPROVED (22/22 Pester + adversarial process/stream próbák).
- [ ] A teljes platform hostkapu `unavailableRuntimeHosts == 0` és inventory
  drift nélkül fut.
- [ ] Minden modul buildje és gyors suite-ja zöld; nincs schema-diff.
- [ ] JoineryTech alatt a Bcl.Memory finding és az ASPNET22 kritikus lánc is
  megszűnt; auth/tenant tesztek zöldek.
- [ ] Kernel runtime outputban nincs sérülékeny natív SQLite.
- [ ] Kernel/Cutting/Inventory SQLite tesztek zöldek Windows és Linux targeten.
- [ ] Az xUnit 2.5.3-ból eredő két régi BCL finding nincs a tesztgráfokban.
- [ ] A Cutting WireMock/Scriban/System.Linq.Dynamic critical/high lánca és az
  S5 teszt-host/Testcontainers STJ findingok megszűntek.
- [ ] A teljes checkout `-Discover` audit 0 critical/high findinggal zár.
- [ ] Minden szelethez független security review `APPROVED`.

## Stop / eszkaláció

- Más owner által kezelt modul vagy gitlink csak explicit ACK után módosítható.
- Package major upgrade, provider-incompatibility vagy migrációs diff esetén
  állj meg és kérj ADR/compatibility döntést.
- Advisory elrejtése `NoWarn`-nal vagy audit-source kikapcsolásával tilos.
- A SQLite advisory metadata és az új upstream release közti eltérést
  függetlenül review-zni kell; puszta verziópin nem zárja le a taskot.
- Deploy csak Root jóváhagyással és tiszta runtime audit után.

## Rollback

Minden modul- és csomagcsalád-szelet atomikus. Rollback után a teljes host
restore/build/audit újrafut; critical/high findinget visszahozó release tilos.
