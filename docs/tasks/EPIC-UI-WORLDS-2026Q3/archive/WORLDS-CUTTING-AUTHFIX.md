# WORLDS-CUTTING-AUTHFIX — analytics tenant és pricing policy javítása

- **Szerep:** backend/security
- **Prioritás:** P0
- **Státusz:** done — implementáció + független review (root/Claude) PASS, mergelve
  (`spaceos-modules-cutting@a889109`), platform-pin frissítve
- **Függőség:** `WORLDS-API-AUDIT = done`; ADR-061/062 minták olvasása
- **Mutációs határ:** `src/spaceos-modules-cutting/` és ez a task-fájl
- **Tiltott scope:** analytics DTO redesign, production portal, deploy

## Cél

A cutting portál-végpontokon a tenant kizárólag hitelesített claimből származzon,
és a pricing-rules endpointok ne hivatkozzanak nem regisztrált policyra.

## Ismert gap

- `/analytics/oee` kötelező `tenantId` query-paramot vár; a portál nem küldi,
  idegen tenant pedig elvileg megadható.
- `PricingRuleEndpoints` policy-kontraktusa nincs teljesen bekötve.
- A modul saját auth/tenant mintát használ; a hosting-csomag átvétele csak akkor
  megengedett, ha a submodule függőségi iránya tiszta.

## Megvalósítás

1. Készíts endpoint tesztet: token tenant A + query tenant B nem adhat B-adatot.
2. A portál analytics queryk tenantját a request-scoped, hitelesített tenant
   accessor adja. Publikus query tenant-param szűnjön meg vagy legyen explicit
   kompatibilitási input, amely nem írhatja felül a claimet.
3. A MediatR query továbbra is explicit tenant ID-t kapjon az application
   boundaryn; ne olvasson HTTP contextet a handler.
4. Regisztráld és teszteld a pricing policy/role mappinget. Token nélkül 401,
   jogosultság nélkül 403, megfelelő role-lal 200.
5. Ne logolj JWT-t vagy tenantlistát; csak correlation ID és eredménykód.
6. Dokumentáld a wire-breaking vagy kompatibilitási döntést.

## Érintett források

- `src/SpaceOS.Modules.Cutting.Api/Endpoints/AnalyticsEndpoints.cs`
- `src/SpaceOS.Modules.Cutting.Api/Endpoints/PricingRuleEndpoints.cs`
- auth/tenant DI és endpoint test host
- `src/SpaceOS.Modules.Cutting.Analytics.Application/Queries/GetMachineOEEQuery.cs`

## Tesztterv

```powershell
dotnet test src/spaceos-modules-cutting/tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj --filter "FullyQualifiedName~Analytics|FullyQualifiedName~Pricing|FullyQualifiedName~Auth"
dotnet test src/spaceos-modules-cutting/tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj
dotnet build src/spaceos-modules-cutting/SpaceOS.Modules.Cutting.sln
```

## Elfogadási kritériumok

- [x] Analytics tenant hitelesített claimből származik.
- [x] Idegen query/header tenant nem írja felül a claimet.
- [x] 401/403/200 pricing policy mátrix tesztelt.
- [x] Handler HTTP-független marad.
- [ ] Teljes cutting suite és build zöld.

## Stop / eszkaláció

Ha a modul hosting-csomag függősége submodule-ciklust hozna létre, ne másold be a
kódot. Készíts dependency-javaslatot és használd a meglévő accessor legkisebb
biztonságos javítását.

## Végrehajtási napló

- **Feladatfoglalás:** 2026-07-21, Codex; Claude párhuzamos
  `MODULE-PACKAGES.md` sávjától fájlszinten diszjunkt.
- **Platform HEAD:** `8e67650`
- **Cutting HEAD:** `bf9bd4ee9161d451adb5bc861ae1555e39c5d4c1`
  (detached submodule HEAD)
- **Preflight munkafa:** platformon idegen `MODULE-PACKAGES.md` módosítás és
  untracked Codex/terminal fájlok; Cutting submodule clean. Ezekhez a task nem
  nyúl.
- **Függőség-bootstrap:** a pinned `spaceos-modules-contracts` és
  `spaceos-nesting-algorithms` submodule-ok inicializálva; az Inventory és
  Procurement contract csomagok lokálisan packelve a Cutting által várt,
  gitignore-olt `nupkg/` forrásba. Függőség-forrás nem változott.
- **Baseline:** a széles `Analytics|Pricing|Auth` szűrés 269 tesztből 265 zöld,
  4 meglévő, magyar decimális formátumhoz kötődő pricing hibával indult. A build
  már a javítás előtt 0 hibával és ismert warningokkal fordult.
- **TDD red:** a 10 új/célzott security tesztből 7 a várt okból bukott:
  query tenant kötelező volt és felülírta a claimet, a pricing route anonim és
  nem-Manufacturer kérésre is 200-at adott, az accessor nem ismerte a `tid`
  claimet.
- **Implementáció:**
  - az analytics HTTP boundary mind a hét művelete a request-scoped
    `ICuttingTenantAccessor` értékét adja át az explicit tenantos MediatR
    querynek/repositorynak; a publikus `tenantId` binding megszűnt;
  - a kompatibilitás megmarad: régi kliens küldhet `tenantId` queryt, de az
    ismeretlen inputként figyelmen kívül marad, ezért claimet nem írhat felül;
  - canonical claim: `tid`; a `tenant_id` csak akkor használható átmeneti
    fallbackként, ha `tid` nincs jelen. Hibás `tid` esetén fail-closed
    `Guid.Empty`, majd 401 következik;
  - a `ManufacturerOnly` policy a `tenant_type=Manufacturer` claimet követeli,
    és a teljes pricing-rules route-csoporton kötelező;
  - application handler nem kapott HTTP-függőséget, token vagy tenantlista nem
    került logba.
- **Érintett tesztek:** analytics claim/override/hiányzó tenant, accessor
  canonical/legacy/precedencia/fail-closed, pricing 401/403/200.

## Átadási bizonyíték

- `dotnet build SpaceOS.Modules.Cutting.sln --no-restore` → **sikeres, 0 hiba,
  1 ismert NU1902 warning** (`MailKit` 4.9.0).
- Célzott végleges futás → **41/41 zöld**:
  `AnalyticsEndpointsTests`, `PricingRuleAuthorizationTests`,
  `HttpContextCuttingTenantAccessorTests`.
- Teljes suite → **1021/1047 zöld, 26 hiba**. Egyik hiba sem az érintett
  analytics/pricing-auth/accessor tesztekben van. A blokkolók külön is
  reprodukálhatók: 5 Unix-only subprocess teszt Windows alatt; 4 kultúrafüggő
  pricing teszt; 1 OptiCut XML/kultúra teszt; 7 TenantResolver teszt; 2 email
  validációs teszt; 7 meglévő QuoteRequest integration teszt.
- `git diff --check` → tiszta; csak a repository CRLF-konverziós
  tájékoztatásai jelentek meg.
- **Független review (root/Claude, 2026-07-21) — PASS.** Nem az önjelentést
  fogadtam el: friss subagent végigolvasta a teljes diffet, újra lefuttatta a
  buildet és a teszteket, és adversarial módon ellenőrizte a biztonsági
  tulajdonságokat kódszinten (nem a task-doksi állításai alapján). Megerősítve:
  mind a 7 analytics handler kizárólag `ICuttingTenantAccessor`-t használ (a
  `tenantId` query-kötés ténylegesen megszűnt, nincs override-út); hibás `tid`
  esetén nincs `tenant_id`-fallback (fail-closed, nem csendes downgrade); a
  `ManufacturerOnly` policy route-csoport-szinten mind a 4 pricing-route-ra
  kötelező; a MediatR handlerek `grep`-pel ellenőrizve HTTP-függőség nélküliek;
  az új tesztek ténylegesen a biztonsági tulajdonságot assertálják (elfogott
  MediatR-query tenantId-je), nem felületes dolgot; nincs token/tenantlista a
  logban. A 26 teljes-suite hiba pre-existing jellegét stash+baseline
  összevetéssel megerősítette (azonos hibák a diff nélküli munkafán is). Build
  és célzott futás számai valósak, újra futtatva egyeznek az állítással.
  **Döntés: biztonságos a merge.** Mergelve `spaceos-modules-cutting@a889109`-be
  (HTTPS push, mert az SSH `github_key` erre a repóra nincs regisztrálva —
  külön follow-up Gábornak), platform-pin frissítve.

## Kapcsolódó dokumentáció

- [Cutting auth- és tenant-kontraktus](../../knowledge/architecture/CUTTING_AUTH_TENANCY_CONTRACT_2026-07-21.md)
- [Cutting fejlesztési és tesztelési runbook](../../knowledge/engineering/CUTTING_DEVELOPMENT_TEST_RUNBOOK.md)
