# ERPSEP-06 — hitelesített Instance Context API és portálkompozíció

- **Epic:** EPIC-ERP-SEPARATION-2026Q3

> **2026-07-29 — DevelopmentIdentityOptions.EnabledModules (Codex, review_requested):**
> The shared development identity now accepts `Jwt:Development:EnabledModules` with
> an empty default. Non-empty values are emitted as the JSON `enabled_modules` claim;
> empty values remain fail-closed (module policy returns 403). Keycloak mode rejects
> the setting at startup. The Maintenance development configuration explicitly grants
> `spaceos.maintenance`. Evidence: hosting **78/78** tests pass; Maintenance host build
> has **0 warnings / 0 errors**. Instance Context endpoint work remains a separate slice.
- **Szerep:** backend/frontend/security
- **Prioritás:** P1
- **Státusz:** in_progress
- **Függőség:** ERPSEP-02, MODULE-PACKAGES
- **Mutációs határ:** Kernel/platform API, auth/context contract és portal shell
- **Tiltott scope:** ERP-domain, Doorstar brand vagy station konfiguráció,
  tetszőleges runtime scriptbetöltés

## Cél és üzleti eredmény

A portál hitelesített runtime kontextusból kapja az aktív tenantot, platform- és
modulverziókat, entitlement/enabled állapotot, permissiont, brandet,
terminológiát és feature flageket. A JWT csak stabil identity/auth claimet visz.

## Kötelező kimenet

- OpenAPI 3.1 `GET /api/platform/instance-context`;
- backend query/endpoint és fail-closed authz;
- Orval kliens és shell registry;
- cache, ETag/invalidation és brand fallback szabály;
- negative-path security tesztek.

## Megvalósítási lépések

1. Írd meg a specifikációt és security threat boundaryt.
2. A kontextust szerveroldali tenantból és aláírt katalógusból állítsd össze.
3. Kösd össze a known/installed/entitled/enabled/permission kapukat.
4. A portal route, navigation és world registry ebből épüljön.
5. Direkt URL és direkt API esetén is legyen backend tiltás.
6. Token/entitlement változásra definiálj invalidációt.

## Teszt- és bizonyítékterv

```powershell
dotnet test <instance-context-test-project>
cd src/joinerytech-portal
npm test
npm run build
```

## Elfogadási kritériumok

- [ ] Disabled, unentitled és permission nélküli modul nem használható.
- [ ] Kliens által küldött tenant/module/role header nem source of truth.
- [ ] Ismeretlen manifest vagy brand fail-closed/fallback viselkedése tesztelt.
- [ ] A portal hardcoded role–world lista nélkül kompozícióképes.
- [ ] OpenAPI és generált kliens drift-checkje CI-ben futtatható.

## Stop / eszkaláció

Az ADR-065 elfogadása vagy a brand/entitlement tulajdonos nélkül csak OpenAPI
draft készülhet, implementáció nem.

## Végrehajtási napló

- 2026-07-28 — ERPSEP-06 biztonsági alapszelet: a `SpaceOS.Modules.Hosting`
  `TenantResolver` már a valós Keycloak `snake_case` (`tenant_id`,
  `enabled_modules`) tenant-entryt is olvassa, a korábbi camelCase teszt-/dev-claim
  kompatibilitás megtartása mellett. Az `IModuleEntitlementContext` és
  `AddRequiredEnabledModulePolicy` / `RequireEnabledModule` közös, canonical ModuleId
  szerveroldali gate-et ad: hiányos, hibás, legacy rövid vagy más tenant entryjében levő
  modul-claim fail-closed, 403. A JWT-gate átmeneti; Kernel `EntitledModules` és az
  Instance Context aktuális állapota továbbra is szükséges a stale-entitlement végleges
  zárásához. A 401/403 ProblemDetails kimenet `correlationId` mezőt kapott.
- 2026-07-28 — OpenAPI-first Instance Context draft elkészült:
  `docs/knowledge/contracts/spaceos-instance-context-v1.openapi.yaml`
  (OpenAPI 3.1, `1.0.0-draft.1`). Rögzíti az egyetlen GET végpontot,
  a JWT-alapú tenant-feloldást, ETages kötelező revalidációt, a
  `known → installed → entitled → enabled → usable` állapotokat, a
  brand-fallbackot, a kanonikus ModuleId-ket és a `correlationId`-s
  ProblemDetails szerződést. Az ismeretlen/nem verifikálható katalógus,
  entitlement vagy brand 503-mal fail-closed; tenant/modul/role/station/brand
  header nem bemenet. Ez szándékosan draft: futó endpoint csak a Kernel
  `EntitledModules` igazságforrása után építhető rá.
- 2026-07-28 — Root-review P2 utókövetés javítva: a teljes stringbe csomagolt,
  `snake_case` Keycloak tenant-entry és az `enabled_modules` lista regressziós
  tesztet kapott; hiányzó/üres modulclaim, hamisított tenant header és duplikált
  tenant-entry mind fail-closed. A canonical ModuleId nem végződhet vagy
  tartalmazhat ismételt kötőjelet. Az `AddRequiredEnabledModulePolicy` önállóan
  regisztrál `IHttpContextAccessor`-t. A ProblemDetails `correlationId` az
  OpenAPI-val egyezően `HttpContext.TraceIdentifier`, nem `Activity.Id`.

## Átadási bizonyíték

- 2026-07-29 — A development identity wire-szerződéséhez két regressziós teszt
  került: több konfigurált modul egyetlen JSON-tömb `enabled_modules` claim,
  üres konfiguráció pedig claim-hiány. A teszt-only host probe kizárólag a
  synthetic principal nyers claimjét olvassa; futó modulhost nem kap új
  endpointot. Hosting teszt: **78/78** zöld; Maintenance host build: 0 warning,
  0 error.

- Hosting teszt: `dotnet test tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj --no-restore`
  — 71/71 zöld (snake_case tenant-claim, tenantonkénti modul-szűrés, hiányos/malformed
  claim, kanonikus policy allow és legacy deny).
- Alias-szerződés: `docs/knowledge/contracts/module-id-legacy-aliases.json` v1.0.0.
- OpenAPI-draft SHA-256: `5dc2ff57cbd11f853a12c28996d86cb930e6a88bbe2adf7e306d6ccd80b1c30a`.
  YAML parse + kötelező útvonal/operationId assert zöld.
- Nyitott következő szelet: Kernel `EntitledModules` igazságforrás + a draftból
  generált, futó `GET /api/platform/instance-context`; ennek hiányában teljes
  entitlement-freshness, ETag/invalidation és Orval drift-check nem zárható le.
