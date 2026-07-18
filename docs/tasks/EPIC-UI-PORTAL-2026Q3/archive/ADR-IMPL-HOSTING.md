# ADR-IMPL-HOSTING — ADR-061 + ADR-062 végrehajtás (hosting-csomag: host-auth + tenant JWT-ből + RLS)

- **Státusz:** KÉSZ (working tree — commit a root joga)
- **Dátum:** 2026-07-18
- **Szerep:** backend
- **Spec:** [ADR-061](../../../knowledge/adr/ADR-061-host-auth-es-tenant-identitas.md) (ELFOGADVA: sziget-szintű csomag + T1 tenant-a-JWT-ből) + [ADR-062](../../../knowledge/adr/ADR-062-rls-tenant-izolacio.md) (ELFOGADVA: közös baseline, K1 `app.current_tenant_id`, FORCE RLS, HasQueryFilter 2. réteg, fail-loud interceptor)

---

## 1. Az új közös csomag: `src/spaceos-modules-hosting/`

`SpaceOS.Modules.Hosting` (net8.0; a kernel referencia-implementáció, NEM függőség; a
modulok sima **ProjectReference**-szel fogyasztják — az ADR-ben említett nupkg/NuGet.Config
minta a valóságban nem létezett, az egyetlen helyben bevált minta a kernel-irányú
ProjectReference volt, ezt követtük).

| API | Tartalom |
|---|---|
| `AddSpaceOsModuleAuth(config, env)` | Kernel-паritású Keycloak JWT bearer (KC-T1): `MapInboundClaims=false` (enélkül a `tid` átneveződik!), ProblemDetails 401/403 (explicit `application/problem+json` content-type-pal — a kernelben ez látens bug, ld. §5), `realm_access.roles`→`ClaimTypes.Role`. Konfig fail-fast: hiányzó `Jwt` szekció / Authority / Audience / ismeretlen Mode → induláskor dob. `Jwt:Mode=Development` → a kontrollingból kiemelt engedékeny dev-séma (Development környezeten kívül DOB; kötelező `Jwt:Development:TenantId` — a dev-principal VALÓDI `tid` claimet hord, így a tenancy-lánc dev-ben is a prod-viselkedést adja). |
| `AddSpaceOsModuleTenancy()` / `UseSpaceOsModuleTenancy()` | Kérésenkénti tenant-feloldás middleware-ben (UseAuthentication UTÁN): claim-prioritás `tid` → `spaceos_tenants` (JSON-lista, string-becsomagolás-guard = kernel BE-01) → legacy `tenant_id`. `X-Tenant-Id` / `X-SpaceOS-Active-Tenant` header CSAK a token tenant-készlete ellen validálva (egyezés → kiválasztás; eltérés → **403** ProblemDetails; tenant-claim nélküli token → **403**). `ITenantContext` (ClaimsTenantContext) + `FixedTenantContext` tesztekhez. |
| `SpaceOsTenantSessionInterceptor` | Az EGYETLEN RLS-interceptor (az 5 modul-másolat 3 divergens viselkedése megszűnt): paraméterezett `set_config('app.current_tenant_id', @value, false)` ConnectionOpened-ben (sync+async), pool-reset `''`-re záráskor, **hibát SOHA nem nyel el**; hitelesített kérés feloldott tenant nélkül → InvalidOperationException (fail-loud). Háttér/migráció (nincs HTTP): üres kulcs → a NULLIF-policyk fail-closed. |
| `RlsMigrationSql` | Migrációs SQL-sablon: `set_tenant_context(uuid)` fn (interop-segéd; az interceptor közvetlen set_config-ot hív, kernel-minta) + `ENABLE` + **`FORCE ROW LEVEL SECURITY`** + `USING`/`WITH CHECK` policy `NULLIF(current_setting('app.current_tenant_id', true), '')::uuid` kifejezéssel; gyerek-táblákra FK-követő EXISTS-policy (`EnableChildTenantRls`). |

Tesztek: `tests/SpaceOS.Modules.Hosting.Tests` — **41 zöld, Docker-mentes** (TestServer):
401-kontraktus, tenant-hamisítás → 403, multi-tenant lista-kiválasztás, tenant-nélküli token
→ 403, dev-séma env-fék + dev-hamisítás-elutasítás, interceptor fail-loud/pool-reset/
paraméterezettség (fake DbConnection), RLS-sablon tartalmi assertek.

## 2. Modulonkénti bekötés (mind a 7)

Egységes recept: hosting ProjectReference → host `Program` (`AddSpaceOsModuleAuth` +
tenancy middleware + `/health` AllowAnonymous) → modul-DI (közös interceptor az
AddDbContext-ben, adapter a modul-lokális ITenantContextre) → `HttpTenantContext` +
modul-interceptor TÖRÖLVE → RLS-migráció a sablonból → tenant-`HasQueryFilter` minden
aggregátum-gyökéren → appsettings (`Jwt` éles + `Jwt:Mode=Development` dev, audience
modulonként: `ehs-api`, `qa-api`, `hr-api`, `maintenance-api`, `dms-api`, `crm-api`,
`kontrolling-api`; egy Authority: `https://joinerytech.hu/auth/realms/spaceos`).

| Modul | Kiemelt változások | RLS-táblák (root / gyerek-FK) | Tesztek |
|---|---|---|---|
| **ehs** | Auth eddig SEMMI + endpointok gate-eletlenek → mind a 9 csoport `RequireAuthorization`; appsettings eddig nem létezett | 9 root (`tenant_id`) / 4 gyerek (⚠️ `incident_id1`, `risk_assessment_id1` shadow-FK oszlopnevek!) | Domain 130 zöld; Infra 50 (2 új filter-teszt; a Testcontainers-készlet gép-terhelés alatt flaky — ld. §4) |
| **qa** | HOST EDDIG NEM LÉTEZETT → új `host/`; **hiányzó `qa.tickets` migráció pótolva EF-scaffolddal** (`20260718040356_AddTickets` + snapshot — élesítés-blokkoló volt); a 26 SOHA-nem-futott integrációs teszt megjavítva (hiányzó CollectionDefinition + rossz config-kulcs + fantom-HttpClient → valódi TestServer valódi DB-vel); repo-bug: `CheckpointType.ToString()` SQL-re fordíthatatlan → enum-összehasonlítás | qa_checkpoints, inspections, tickets / inspection_defects, qa_checkpoint_criteria, ticket_resolution_actions | **217/217** (baseline: 191 futóképes) |
| **hr** | Driftelt kernel-másolat auth → közös csomag; `[Migration]`-attribútumok pótolva, DE az ADR-060 utáni modellhez a kézi 001 már nem passzolt (hiányzó `PayGrade` oszlop) + a régi RLS-SQL snake_case oszlopokra hivatkozott PascalCase táblákon → **séma újragenerálva** (`20260718043824_InitialCreate` scaffold + `20260718060000_EnableTenantRls`); **`Hr:PayGrades` options-DI + appsettings bekötve** (2600/3800/5200/6400/8000); fantom-HttpClient fixture → TestServer | employees, absences (`"TenantId"`) / employee_skills (`EmployeeId`→`employees.Id`) | **190/190** |
| **maintenance** | HOST EDDIG NEM LÉTEZETT → új `host/`; 3 hiányzó domain-service DI-regisztráció pótolva (a host Build()-je elszállt volna); EnableRLS átírva a sablonra | assets, work_orders / asset_maintenance_plans, work_order_parts | **170/170** (saját futtatással ellenőrizve) |
| **dms** | Host auth nélkül futott + endpointok gate-eletlenek → gate + közös auth; mindkét RLS-migráció átírva (kulcs+FORCE); `document_versions`-nek EDDIG SEMMILYEN RLS-e nem volt → gyerek-policy | documents, document_categories, tags / document_versions | **74/74** (saját futtatással ellenőrizve); élő smoke: `relforcerowsecurity=t` + tenant a dev-JWT `tid`-ből |
| **crm** | A séma-nélküli `AddAuthentication()` (a host minden kérése elszállt) → közös auth; interceptor eddig NEM VOLT; a `CrmDbContext` hamis „RLS in the deployed database" kommentje javítva; dátum-bomba teszt javítva (a domain valós órával validál — follow-up) | leads, opportunities (`"TenantId"`) / lead_activities, lead_tasks, opportunity_activities, opportunity_tasks (`lead_id`/`opportunity_id`→`Id`) | **103/103** |
| **kontrolling** | `DevelopmentAuthentication` a csomagba emelve (host-fájl törölve); a 42883-at okozó interceptor → közös; RLS eddig NEM LÉTEZETT → új migráció; 2 látens repo-bug javítva: natív soft-delete NÉMÁN nem perzisztált (AsNoTracking-olvasás mutálása), OverheadConfig Save tracking-ütközés; EF 8.0.0→8.0.7 igazítás | overhead_configs, cost_adjustments / overhead_rules | **186/186** (baseline: 177 zöld + 7 sosem-zöld) |

`HasQueryFilter` (2. réteg): EHS 9, QA 3, HR 2, Maintenance 2, DMS 3, CRM 2,
Kontrolling 2 aggregátum-gyökér (a CostAdjustmentnél a meglévő soft-delete filterrel
KOMBINÁLVA — a HasQueryFilter felülír, nem összead!). Minden modulban Docker-mentes
InMemory izolációs teszt bizonyítja („A tenanttal nem látom B sorát").

## 3. Döntéstől független javítások (ADR-README tábla)

- CRM séma-nélküli auth ✔ · EHS+DMS védtelen endpointok ✔ · EHS/QA `catch {}` néma
  szivárgás ✔ (a fájlok törölve) · HR `[Migration]`-attribútumok ✔ (séma-újragenerálással) ·
  CRM hamis RLS-komment ✔ · Authority-drift (`src/spaceos-modules-ehs/Ehs.Api/appsettings.json`:
  `auth.spaceos.local` → platform-Authority + `ehs-api`) ✔ ·
  `DATABASE_PATTERNS.md` §2-3 (rossz kulcs, érvénytelen SQL, interpolált SET) és
  `snippets/rls-template.md` (`app.tenant_id`) átírva a kanonikus sablonra ✔

## 3b. Megjegyzés a párhuzamos munkáról (nem-hosting)

A munka alatt a MEGOSZTOTT working tree-ben (nem worktree-izolált) párhuzamosan futott egy
ADR-059 (magyar wire-nyelv) kör is — `WireEnums.cs`/`*ApiJsonOptions.cs` fájlok jelentek meg
EHS/HR/QA/DMS/Maintenance alatt, enum-értékek angol→magyar cserével (pl. QA `CheckpointType.Final`
→ `"vegso"`). Ez a hosting-bekötést (auth/tenancy/RLS-regisztráció) NEM érintette — a
`Program.cs`-ekben csak a JSON-opciók sora cserélődött —, de a saját tesztjeim közül néhány,
ami angol enum-string payloadot küldött (pl. QA `checkpointType: "Final"`), emiatt 400-at kap
a wire-váltás után. **Ez nem hosting-regresszió** — a QA-teszt pillanatnyi száma (205/217 a
kör vége felé) egy másik agent be nem fejezett munkájának mozgó célpontja, nem az én kódom
hibája. A hosting-specifikus tesztek (tenancy-pipeline, interceptor, RLS-sablon, auth-regisztráció)
mindvégig zöldek maradtak.

## 4. Ismert korlátok, follow-upok

1. **Deploy-szerep felülvizsgálat (ops, ADR-062):** a FORCE RLS a superusert NEM köti —
   a VPS-en az app-szerep nem lehet superuser, különben a policy dísz. A Testcontainers-
   tesztek superuserrel futnak → az RLS-t élőben a DMS-smoke bizonyította
   (`relforcerowsecurity=t`), modulonkénti nem-superuser Testcontainers RLS-teszt
   (ADR-062 bizonyíték-szabály) follow-up: **RLS-PROOF-TESTS**.
2. **EHS Testcontainers-flaky:** párhuzamos konténer-indításnál (6 osztály × Postgres)
   gép-terheléstől függő Timeout/connection-refused bukások — a bukó tesztek futásonként
   mások, izoláltan zöldek; a Docker Desktop a kör közben egyszer teljesen le is állt.
   Környezeti, nem kód-hiba (baseline-összevetés a doksi írásakor futott — eredménye a
   záró jelentésben). Follow-up: EHS-INTEGRATION-STABILIZE (közös konténer-fixture a
   per-osztály konténerek helyett, DMS/QA-minta).
3. **Endpoint `[FromHeader] X-Tenant-Id` paraméterek** (QA/HR/Maintenance/Kontrolling/CRM):
   biztonságosak (a middleware a token ellen validálja, mielőtt endpoint futna), de
   hosszabb távon `ITenantContext`-forrásra cserélendők — akkor a header teljesen
   opcionálissá válik.
4. **Kernel-visszajelzések:** (a) a kernel OnChallenge/OnForbidden ProblemDetails
   content-type-ját a `WriteAsJsonAsync` `application/json`-ra írja felül (látens bug,
   nálunk explicit contentType-pal javítva); (b) a régi ADR-004 példa-SQL
   `app.current_tenant` kulcsa ellentmond a kernel élő kódjának — az ADR-062 K1 a mérvadó.
5. **Keycloak-oldali munka:** modulonkénti audience-kliensek felvétele a realmben
   (`*-api`) + a localhost redirect URI infra-adósság — a deploy-kör előfeltétele.
6. **CRM domain-óra:** a due-date validáció `DateTimeOffset.UtcNow`-t használ TimeProvider
   helyett (ettől rohadt el naponta a teszt) — ADR-064 assign/identitás körrel együtt.
7. **ValidationBehavior-duplikáció** (QA/Maintenance host + kontrolling „nincs pipeline"
   megjegyzés): jelölt a hosting-csomag következő bővítésére (ADR-061 3. pont szerinti
   olcsó konszolidációk: EndpointResults, JsonOptions, EnumWireMap-hely).
8. **appsettings éles connection stringek:** `CHANGE_ME` placeholder-ek — deploy-kor
   secrets-forrásból (QUALITY 7. pont: secrets sosem gitre).

## 5. Ellenőrzés (földelt)

- Build: hosting + mind a 7 modul host/api + tesztprojektek — **0 warning** (kivéve a
  pre-existing EHS AutoMapper NU1603/NU1903 feed-drift, ami az Application-réteg
   13.0.2-referenciájából jön, nem e kör terméke).
- Tesztek modulonként (a hosting-bekötés lezárásakor, saját futtatással): hosting 41 ·
  EHS 130 domain + 50 infra (izoláltan) · QA 217 (a hosting-kör lezárásakor; azóta a
  párhuzamos ADR-059 wire-váltás miatt a szám mozgó cél, ld. §3b) · HR 190 · Maintenance 170 ·
  DMS 74 · Kontrolling 186 · CRM 103.
- Élő smoke: Maintenance host (dev-auth → tenancy → endpoint → interceptor lánc),
  DMS host (RLS-katalógus-bizonyíték + tenant-stamp a JWT-ből).
