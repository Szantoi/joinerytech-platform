# Cutting fejlesztési és tesztelési runbook

- **Célközönség:** backend agent, reviewer, conductor
- **Utolsó ellenőrzés:** 2026-07-21, Windows 11 / PowerShell / .NET 8 target
- **Kapcsolódó kontraktus:** [Cutting auth- és tenant-kontraktus](../architecture/CUTTING_AUTH_TENANCY_CONTRACT_2026-07-21.md)

## 1. Munkaterület és tulajdonosi határ

Platform root:

```text
C:\Users\szant\Documents\Development\joinerytech-platform
```

Cutting submodule:

```text
src\spaceos-modules-cutting
```

Minden munka előtt:

```powershell
git status --short
git -C src/spaceos-modules-cutting status --short
git -C src/spaceos-modules-cutting rev-parse HEAD
```

Ha más agent módosításai láthatók, azokat meg kell őrizni. A task fájlban legyen
egyértelmű mutációs határ; fájlütközés esetén a conductor/root dönt.

## 2. Függőségek előkészítése

A Cutting build jelenleg három lokális forrást használ:

- `spaceos-modules-contracts/artifacts` — `SpaceOS.Modules.Contracts` 1.3.0;
- `spaceos-modules-cutting/nupkg` — Inventory.Contracts 1.1.0 és
  Procurement.Contracts 1.0.0;
- `spaceos-nesting-algorithms` — közvetlen project reference.

### 2.1 Submodule-ok

```powershell
git submodule update --init `
  src/spaceos-modules-contracts `
  src/spaceos-modules-inventory `
  src/spaceos-modules-procurement `
  src/spaceos-nesting-algorithms `
  src/spaceos-modules-cutting
```

Ha az SSH-agent nincs konfigurálva, használható egyszeri HTTPS URL-átírás. Az
SSH host-ellenőrzést nem szabad kikapcsolni:

```powershell
git -c 'url.https://github.com/.insteadOf=git@github.com:' submodule update --init `
  src/spaceos-modules-contracts `
  src/spaceos-modules-inventory `
  src/spaceos-modules-procurement `
  src/spaceos-nesting-algorithms `
  src/spaceos-modules-cutting
```

### 2.2 Lokális contract package-ek

Csak akkor kell packelni, ha a várt `.nupkg` hiányzik:

```powershell
dotnet pack `
  src/spaceos-modules-contracts/SpaceOS.Modules.Contracts/SpaceOS.Modules.Contracts.csproj `
  -c Release -o src/spaceos-modules-contracts/artifacts

dotnet pack `
  src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Contracts/SpaceOS.Modules.Inventory.Contracts.csproj `
  -c Release -o src/spaceos-modules-cutting/nupkg

dotnet pack `
  src/spaceos-modules-procurement/src/SpaceOS.Modules.Procurement.Contracts/SpaceOS.Modules.Procurement.Contracts.csproj `
  -c Release -o src/spaceos-modules-cutting/nupkg
```

Ellenőrzés:

```powershell
Get-ChildItem src/spaceos-modules-contracts/artifacts -Filter *.nupkg
Get-ChildItem src/spaceos-modules-cutting/nupkg -Filter *.nupkg
```

Elvárt minimum:

```text
SpaceOS.Modules.Contracts.1.3.0.nupkg
SpaceOS.Modules.Inventory.Contracts.1.1.0.nupkg
SpaceOS.Modules.Procurement.Contracts.1.0.0.nupkg
```

A package-ek build-inputok, nem kézzel szerkesztendők. Verzióeltérés esetén a
consumer `.csproj` az irányadó; verziót nem szabad csendben átírni csak azért,
hogy a restore lefusson.

## 3. Restore és build

A Cutting submodule gyökeréből:

```powershell
Set-Location src/spaceos-modules-cutting
dotnet restore SpaceOS.Modules.Cutting.sln --configfile NuGet.Config
dotnet build SpaceOS.Modules.Cutting.sln --no-restore
```

Aktuális ismert warning:

```text
NU1902 — MailKit 4.9.0 moderate severity vulnerability
```

Ez külön dependency-frissítési feladat. Nem szabad elhallgatni, de az authfix
scope-jában nem indokol széles csomagfrissítést.

## 4. Auth/tenant célzott tesztkapu

Gyors fejlesztői kapu:

```powershell
dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build `
  --filter "FullyQualifiedName~AnalyticsEndpointsTests|FullyQualifiedName~PricingRuleAuthorizationTests|FullyQualifiedName~HttpContextCuttingTenantAccessorTests"
```

2026-07-21-i elvárt eredmény:

```text
Passed: 41, Failed: 0, Skipped: 0
```

A kapu által bizonyított esetek:

- analytics query tenant nélkül a token tenantját használja;
- idegen `tenantId` query nem írja felül a claimet;
- hiányzó/hibás tenant claim 401-et ad és nem hívja a MediatR handlert;
- `tid` elsődleges, `tenant_id` csak legacy fallback;
- anonim pricing kérés 401;
- hiteles, nem-Manufacturer kérés 403;
- Manufacturer kérés eléri az endpointot.

Szélesebb regressziós kapu:

```powershell
dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build `
  --filter "FullyQualifiedName~Analytics|FullyQualifiedName~Pricing|FullyQualifiedName~Auth"
```

## 5. Teljes tesztkapu

```powershell
dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build
```

2026-07-21-i Windows baseline a tenant-resolver javítása után:

```text
Total: 1047
Passed: 1028
Failed: 19
Skipped: 0
```

A célzott 41 auth/tenant security teszt és a 10 TenantResolver teszt mind zöld.
Az authfix utáni baseline hét resolver-hibája a
`STAB-CUTTING-TENANT-RESOLVER` feladatban megszűnt. A fennmaradó hibák:

| Csoport | Darab | Jellemző ok | Javasolt task |
|---|---:|---|---|
| `BoundedSubprocessRunnerTests` | 5 | `/bin/bash`, `/bin/echo`, `/bin/sleep`, `/tmp` Windows alatt | `CUTTING-TEST-WIN32-PORTABILITY` |
| `PricingRuleTests` | 4 | `.` és `,` decimális formátum keverése | `CUTTING-TEST-CULTURE-INVARIANCE` |
| `OptiCutFormatConverterTests` | 1 | vendor XML számformátum kultúrafüggése | `CUTTING-TEST-CULTURE-INVARIANCE` |
| `EmailServiceTests` | 2 | MailKit email-validációs kontraktus drift | `CUTTING-EMAIL-VALIDATION-CONTRACT` |
| `QuoteRequestEndpointTests` | 7 | legacy integration host/auth/fixture elvárás drift | `CUTTING-QUOTE-INTEGRATION-HARNESS` |

Ezeket nem szabad automatikusan regressziónak vagy automatikusan „ismert
hibának” minősíteni. A helyes triázs:

1. ellenőrizd, érint-e a diff az adott végrehajtási útvonalat;
2. futtasd a hibás osztályt külön;
3. hasonlítsd össze a feladat előtti baseline-nal;
4. csak bizonyítékkal sorold taskon kívüli adóssághoz;
5. minden új hibát javíts vagy eszkalálj a taskban.

## 6. Egyedi hibacsoport futtatása

```powershell
dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build --filter "FullyQualifiedName~TenantResolverTests"

dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build --filter "FullyQualifiedName~QuoteRequestEndpointTests"

dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build --filter "FullyQualifiedName~BoundedSubprocessRunnerTests"
```

Tesztjavításnál a production kód kulturális beállítását ne változtasd meg csak
azért, hogy egy lokális teszt zöld legyen. A wire-formátum legyen explicit és
invariáns; az UI megjelenítési kultúrája külön réteg.

## 7. Repository-higiénia

Ellenőrzések:

```powershell
git diff --check
git status --short
git -C ../spaceos-nesting-algorithms status --short
```

Ismert gotcha: a `spaceos-nesting-algorithms` repository jelenleg
verziókezelt `bin/obj` fájlokat tartalmaz, ezért egy Cutting build tiszta
forrásmódosítás nélkül is piszkosnak mutathatja a submodule-t.

Biztonságos eljárás:

1. build előtt rögzítsd, hogy a nesting submodule tiszta volt;
2. build után nézd meg a `git diff --name-only` kimenetét;
3. ha és csak ha kizárólag a build által generált `bin/obj` fájlok változtak,
   célzottan állítsd vissza ezeket;
4. forrásfájlt vagy korábban meglévő módosítást ne állíts vissza.

```powershell
git -C ../spaceos-nesting-algorithms diff --name-only
git -C ../spaceos-nesting-algorithms restore --worktree -- `
  SpaceOS.Nesting.Algorithms/bin `
  SpaceOS.Nesting.Algorithms/obj
```

Hosszú távú javítás: a nesting repositoryból el kell távolítani a verziókezelt
build outputot, és megfelelő `.gitignore` szabályokat kell rögzíteni.

## 8. Review és átadás

Implementáló agent nem jelölheti saját maga végleg `done` állapotúra a
QUALITY.md szerinti kritikus security taskot.

Átadási csomag:

- [ ] task és mutációs határ;
- [ ] baseline HEAD-ek és kezdeti dirty state;
- [ ] red teszt bizonyíték;
- [ ] célzott tesztek eredménye;
- [ ] build eredménye és warningok;
- [ ] teljes suite eredménye, hibák kategorizálva;
- [ ] `git diff --check`;
- [ ] kompatibilitási döntés;
- [ ] security review checklist;
- [ ] commit/pin/deploy következő lépése.

Jelenlegi átadás:
[WORLDS-CUTTING-AUTHFIX task](../../tasks/EPIC-UI-WORLDS-2026Q3/WORLDS-CUTTING-AUTHFIX.md).

## 9. Release kapu

A sorrend kötelező:

1. független backend/security review;
2. Cutting submodule commit normál ágon — detached HEAD-ről közvetlenül ne
   vesszen el a változás;
3. platformban a Cutting submodule-pin frissítése;
4. platform regressziós kapuk;
5. csak ezután API-mode production portal gate;
6. deploy után port/PID/service MainPID ellenőrzés.

Review, commit és platform-pin nélkül a `WORLDS-PRODUCTION-API-GATE` nem
oldható fel.
