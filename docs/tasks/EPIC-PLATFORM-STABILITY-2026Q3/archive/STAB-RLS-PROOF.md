# STAB-RLS-PROOF — nem-superuser tenant-izoláció bizonyítása

- **Szerep:** backend/security
- **Prioritás:** P0
- **Státusz:** kész (agent-végrehajtás, 2026-07-21 — root felülvizsgálatra vár)
- **Függőség:** `ADR-IMPL-HOSTING = done`, commit `4a58e48`
- **Mutációs határ:** `src/spaceos-modules-hosting/tests/`, a hét modul
  persistence/integration test fái, saját task-doksi
- **Tiltott scope:** domain-FSM, portál, produktív migráció átírása bizonyíték
  nélkül, VPS deploy

## Cél

Bizonyítani, hogy a FORCE RLS nem csak katalógusbeállítás: egy `NOSUPERUSER` és
`NOBYPASSRLS` alkalmazásszerep tenant A adatait nem látja tenant B contextben,
context nélkül pedig fail-closed módon nulla sort kap vagy kontrollált hibát ad.

## Kötelező források

- [`ADR-061`](../../knowledge/adr/ADR-061-host-auth-es-tenant-identitas.md)
- [`ADR-062`](../../knowledge/adr/ADR-062-rls-tenant-izolacio.md)
- [`ADR-IMPL-HOSTING`](../EPIC-UI-PORTAL-2026Q3/archive/ADR-IMPL-HOSTING.md)
- `src/spaceos-modules-hosting/README.md`
- `docs/knowledge/patterns/DATABASE_PATTERNS.md`

## Preflight

1. Rögzítsd a platform HEAD-et és a hét modul érintett HEAD/diff állapotát.
2. Futtasd a hosting 41 tesztjét változtatás nélkül.
3. Ellenőrizd, hogy Docker elérhető, és mentsd a futó
   `org.testcontainers=true` konténer-ID-ket baseline-ként.
4. Ne indulj el, ha más agent ugyanazon modul migrációját vagy DbContextjét írja.

## Megvalósítás

1. Készíts megosztott Testcontainers fixture/helper réteget a hosting tesztekhez.
   A konténer indulásakor hozzon létre külön migrator/admin és application role-t;
   az assertionök kizárólag az application role-lal fussanak.
2. A role tulajdonságait SQL-ből assertáld:
   `rolsuper=false`, `rolbypassrls=false`.
3. Modulonként legalább egy aggregátum-gyökéren hajtsd végre:
   tenant A insert → A read; tenant B read → 0; context nélkül read → 0/explicit
   fail-closed; visszaváltás A-ra poololt kapcsolaton → nincs B-szivárgás.
4. Legalább egy gyerek-táblás EXISTS-policyt bizonyíts modulonként, ahol van
   gyerek-tábla.
5. A `pg_class` katalógusból assertáld az `relrowsecurity` és
   `relforcerowsecurity` értékét minden dokumentált táblán.
6. HTTP-pipeline kontroll: token nélküli kérés 401; más tenant header 403; egyező
   aktív tenant header nem módosítja a token tenant-készletét.
7. A fixture minden ágon `DisposeAsync`/`finally` cleanupot használjon.

## Tesztterv

```powershell
dotnet test src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj
# Ezután modulonként a taskban rögzített integration projectek, sorban, nem párhuzamosan.
docker ps --filter "label=org.testcontainers=true" --format "{{.ID}} {{.Names}}"
```

## Elfogadási kritériumok

- [x] A tesztek nem postgres superuserrel bizonyítják az RLS-t.
- [x] Mind a 7 modul gyökér-policyja és releváns gyerek-policyja zöld.
- [x] Tenantváltás és connection-pool reuse mellett nincs adatszivárgás.
- [x] Header nem írhatja felül a JWT-ben engedélyezett tenant-készletet.
- [x] Minden FORCE RLS tábla katalógus-asserttel fedett.
- [x] A futás után nincs új elárvult Testcontainers-konténer.
- [x] Tesztszám és modulonkénti bizonyíték a task végén szerepel.

## Stop / eszkaláció

- Ha egy tábla tenant ownershipje nem dönthető el, ne írj permissive policyt;
  rögzíts ADR-jelöltet.
- Ha az app deploy-role superuser/BYPASSRLS, a task blokkolt ops döntésig.
- Produktív migrációt csak bizonyított policy-hiba esetén, külön diff-szekcióval
  szabad módosítani.

## Végrehajtási napló

**2026-07-21, agent-végrehajtás.**

### Preflight

1. Platform HEAD a munka kezdetén: `66e747a58310600899abafbb8704b79b2b909bcd` (fix(ehs):
   SafetyWalk finding EF change-tracking hiba javítva — a briefingben jelzett, már lezárt kör).
   `git status --short` a 7 modul-könyvtárra (`src/ehs`, `src/dms`, `src/hr`,
   `src/maintenance`, `src/qa`, `src/SpaceOS.Modules.CRM`,
   `src/spaceos-modules/spaceos-modules-kontrolling`) és `src/spaceos-modules-hosting`-ra:
   **tiszta** — a repóban futó nem-kapcsolódó módosítások (`EPICS.yaml`,
   `docs/knowledge/INDEX.md`, CUTTING-doksik, 3 gitlink-pointer) egyike sem érinti ezt a hét
   könyvtárat. Nincs párhuzamosan futó migráció/DbContext-módosítás — biztonságos indulás.
2. Hosting-csomag baseline: `dotnet test
   src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.Tests` → **57/57 zöld** (a task
   „41 teszt" említése a 2026-07-18-i ADR-IMPL-HOSTING pillanatképéből való; azóta bővült a
   Wire-teszttel — a jelenlegi 57 a valódi, futtatott baseline).
3. Docker elérhető (`29.1.5`). Futó `org.testcontainers=true` konténer a munka kezdetén: **0**
   (11 db régről Exited, `docker ps -a` — nem futnak, korábbi megszakadt körök maradványai,
   érintetlenül hagyva).
4. Kontrolling pontos útvonala megerősítve: `src/spaceos-modules/spaceos-modules-kontrolling`
   (NEM `src/spaceos-modules-kontrolling` — ez az útvonal nem létezik).

### Megvalósítás

Megosztott fixture-réteg: **`src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.RlsFixtures/`**
(új class library, `IsTestProject=false`, kizárólag a hosting `tests/` fa alatt — a
mutációs határon belül). Ezt mind a 7 modul integrációs teszt-projektje `ProjectReference`-szel
fogyasztja (a modulok saját `persistence/integration test fájljai` közé véve egy új
`RlsNonSuperuserIsolationTests.cs`-t; egyetlen meglévő teszt-fájl sem módosult, csak a
csproj-okban egy új `ProjectReference` [+ CRM-nél egy hiányzó `Testcontainers.PostgreSql`
csomag] került fel).

- **Role-modell:** minden modul **saját, elkülönített Testcontainers Postgres-konténert** kap
  (`NonSuperuserRlsFixture`, `postgres:16-alpine`). A Testcontainers-adta induló felhasználó
  (`rls_migrator`) a migrátor/admin szerep — SOHA nem használt asserthez, kizárólag EF
  `Database.MigrateAsync()`-hoz és a szerep-provisioninghoz. Utána `CreateApplicationRoleAsync`
  létrehozza a **`spaceos_rls_proof_app`** alkalmazás-szerepet, és **csak ezen keresztül fut
  minden assertion** (Megvalósítás 1-2. pont).
- **Nyers SQL, nem EF LINQ:** minden tenant-izolációs teszt közvetlen `Npgsql`
  INSERT/SELECT-et futtat a valódi táblák ellen — tudatosan MEGKERÜLVE a modul EF
  `HasQueryFilter` második rétegét, mert a feladat kifejezetten a PostgreSQL-oldali
  RLS-t bizonyítja, nem az alkalmazás-oldali szűrőt.
- **Pool-reuse:** `MaxPoolSize=1` connection-stringgel determinisztikusan ugyanazt a fizikai
  kapcsolatot kapja vissza az Npgsql pool nyitás/zárás között (Megvalósítás 3. pont utolsó
  tagmondata).
- **HTTP-pipeline (Megvalósítás 6. pont):** ezt a hosting-csomag már meglévő 57 tesztje
  (`TenancyPipelineTests.cs`) lefedi — token nélkül 401, hamisított tenant-header 403,
  tenant-claim nélküli token 403, **egyező aktív tenant header elfogadva ÉS nem módosítja a
  token tenant-készletét** (`Header_matching_the_token_tenant_is_accepted`,
  `Multi_tenant_token_may_select_any_member_tenant`). Nem kellett új tesztet írni hozzá —
  csak újra lefuttatni (lásd lent), ami megerősítette, hogy változatlanul zöld.
- **`DisposeAsync`/`finally` minden ágon (Megvalósítás 7. pont):** `InitializeAsync`
  `try/catch`-sel — ha a migráció vagy a role-provisioning elszáll, a `catch` ág is
  eldobja a konténert (xUnit `IAsyncLifetime` NEM hívja meg a `DisposeAsync`-et, ha az
  `InitializeAsync` dobott), így hibás induláskor sincs elárvult konténer.

### Tesztfuttatás (saját futtatással, nem önjelentésből)

Minden modul teljes tesztkészletét lefuttattam (nem csak az új RLS-teszteket), **sorban,
egyesével** (Tesztterv szerint). Két modulnál (QA, HR) az első futás Docker-daemon
túlterhelés miatt (több párhuzamos Testcontainers-indítás egy 16 GB gépen — ugyanaz a
jelenség, amit az ADR-IMPL-HOSTING §4/2 az EHS-nél dokumentál) named-pipe timeouttal
elszállt; a konkrét hibázó tesztek **eltérők voltak a két futás között** (nem determinisztikus
kódhiba jele), és a köztes elárvult/félbeszakadt konténert manuálisan eltávolítva a
megismételt futás **hibamentesen lezárult**. Ez környezeti flakiness, nem az itt írt kód
hibája — ugyanez a mintázat, amit a repo már ismer és dokumentál.

| Modul | Előtte (a diffből levezetve) | Utána (saját futtatás) | Új RLS-proof teszt |
|---|---|---|---|
| Hosting (érintetlen) | 57 | **57/57 zöld** | 0 |
| EHS (Infrastructure.Tests) | 72 | **76/76 zöld** | 4 |
| QA | 236 | **240/240 zöld** (1. kör Docker-túlterhelés, 2. kör tiszta) | 4 |
| DMS | 74 | **78/78 zöld** | 4 |
| HR | 206 | **210/210 zöld** (1. kör Docker-túlterhelés, 2. kör tiszta) | 4 |
| Maintenance | 170 | **174/174 zöld** | 4 |
| CRM | 116 | **120/120 zöld** | 4 |
| Kontrolling | 186 | **190/190 zöld** | 4 |
| **Összesen (7 modul)** | **1060** | **1088/1088 zöld** | **28** |

(„Előtte" oszlop: mivel egyetlen meglévő teszt-fájl sem módosult — csak egy új fájl került
be modulonként pontosan 4 `[Fact]`-tel —, az „utána" − 4 mindig az „előtte" eredeti száma;
ezt nem külön mértem minden modulban a diff előtt, hanem magából a hozzáadott fájlok
tartalmából vezetem le. A hosting csomag 57 teszte változatlan, mert azt a kört egyáltalán
nem módosítottam.)

### Konténer-delta

Baseline (munka előtt): **0 futó** `org.testcontainers=true` konténer, 11 régi Exited
maradvány (érintetlenül hagyva). Munka közben (a saját 7 RLS-proof futtatás + a 7 modul teljes
tesztkészletének újrafuttatása) új konténerek keletkeztek és minden esetben leálltak/eltűntek;
a két Docker-túlterheléses újrafuttatás előtt keletkezett néhány elakadt (fél-inicializált vagy
timeoutolt stop miatt „Up"/„Created" állapotban ragadt) konténert manuálisan eltávolítottam
(`docker rm -f`), majd az újrafuttatás után **ismét 0 futó** konténer volt. Záró állapot:
**pontosan a preflight-baseline** — 0 futó, 11 régi Exited (érintetlen), plusz az
irreleváns `doorstar-production-db` (nem testcontainers-címkés, más munkából). **Nettó új
elárvult (futó vagy a futás lezárta után is megmaradt) konténer: 0.**

## Átadási bizonyíték

### Role SQL és ellenőrzött tulajdonságok

Létrehozás (`NonSuperuserRlsFixture.CreateApplicationRoleAsync`, a migrátor/admin
kapcsolaton, minden modul saját konténerében egyszer):

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'spaceos_rls_proof_app') THEN
        CREATE ROLE spaceos_rls_proof_app LOGIN PASSWORD '<test-only pwd>'
            NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE "<module_db>" TO spaceos_rls_proof_app;
GRANT USAGE ON SCHEMA <schema> TO spaceos_rls_proof_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA <schema> TO spaceos_rls_proof_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA <schema> TO spaceos_rls_proof_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA <schema> TO spaceos_rls_proof_app;
```

Ellenőrzés (`ReadApplicationRolePropertiesAsync`, mind a 7 modulban külön futtatva, mind a
7-ben `Application_role_is_not_superuser_and_does_not_bypass_rls` teszt zöld):

```sql
SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'spaceos_rls_proof_app';
-- Eredmény mind a 7 modulban: rolsuper = false, rolbypassrls = false
```

### Modul × tábla mátrix (gyökér-policy / gyerek-policy / katalógus-assert)

| Modul (séma) | Gyökér-táblák (tesztelt aggregátum **félkövér**) | Gyerek-tábla (tesztelt **félkövér**) | Gyökér-policy | Gyerek EXISTS-policy | Pool-reuse (nincs szivárgás) | Katalógus (`pg_class`, mind) |
|---|---|---|---|---|---|---|
| EHS (`ehs`) | incidents, risk_assessments, training_records, locations, hazardous_materials, ppe_items, ppe_issuances, **safety_walks**, corrective_actions | incident_investigations, incident_witnesses, risk_controls, **safety_walk_findings** | PASS | PASS | PASS | PASS (13/13 tábla) |
| QA (`qa`) | **qa_checkpoints**, inspections, tickets | inspection_defects, **qa_checkpoint_criteria**, ticket_resolution_actions | PASS | PASS | PASS | PASS (6/6 tábla) |
| DMS (`dms`) | document_categories, tags, **documents** | **document_versions** | PASS | PASS | PASS | PASS (4/4 tábla) |
| HR (`hr`) | **employees**, absences | **employee_skills** | PASS | PASS | PASS | PASS (3/3 tábla) |
| Maintenance (`maintenance`) | **assets**, work_orders | **asset_maintenance_plans**, work_order_parts | PASS | PASS | PASS | PASS (4/4 tábla) |
| CRM (`crm`) | **leads**, opportunities | **lead_activities**, lead_tasks, opportunity_activities, opportunity_tasks | PASS | PASS | PASS | PASS (6/6 tábla) |
| Kontrolling (`kontrolling`) | **overhead_configs**, cost_adjustments | **overhead_rules** | PASS | PASS | PASS | PASS (3/3 tábla) |

Minden „PASS" saját, valós Postgres Testcontainers-futtatásból származik a
`spaceos_rls_proof_app` non-superuser szereppel — superuser kapcsolat egyetlen assertben sem
szerepel (a migrátor/admin kapcsolatot kizárólag DDL-re és a role-provisioningra használtuk,
lásd fent).

### Connection-pool-reuse eredmény

Mind a 7 modulban: `MaxPoolSize=1` kapcsolat-stringgel A tenant beszúrás → A olvasás (1 sor) →
B olvasás (0 sor) → context nélküli olvasás (0 sor, fail-closed) → **B contextre váltás,
kapcsolat zárása/pool-visszaadása → A contextre visszaváltás UGYANAZON a poololt kapcsolaton**
→ csak A saját sora látszik, **nulla B-szivárgás**. 7/7 PASS.

### HTTP-pipeline kontroll eredmény

A hosting-csomag meglévő 57 tesztjéből (nem új teszt, újra lefuttatva ennek a feladatnak a
részeként):

- `Unauthenticated_request_is_401` → **401**.
- `Forged_tenant_header_is_rejected_with_403_problem_details` → **403**,
  `application/problem+json`.
- `Authenticated_token_without_tenant_identity_is_403` → **403**.
- `Header_matching_the_token_tenant_is_accepted` → **200**, a válasz tenant-je a token
  tenantja marad (a header **nem módosítja** a token tenant-készletét, csak választ belőle).
- `Multi_tenant_token_may_select_any_member_tenant` / `..._may_not_select_a_foreign_tenant` →
  a header csak a token saját tenant-listájából választhat, azon kívülről **403**.

Mind az 5 releváns teszt zöld (57/57 összesen).

### Tesztszám összesítő és konténer-delta

Lásd a Végrehajtási napló táblázatát: **28 új RLS-proof teszt** (4×7 modul), **1088/1088
zöld** a 7 modul teljes, saját futtatású tesztkészletében, **57/57 zöld** a hosting
csomagban (változatlan). **Konténer-delta: 0** — a preflight-baseline (0 futó
`org.testcontainers=true` konténer) és a záró állapot (0 futó) megegyezik; a munka közben
keletkezett konténerek mind leálltak/eltávolításra kerültek.

### Érintett fájlok

Új:
- `src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.RlsFixtures/SpaceOS.Modules.Hosting.RlsFixtures.csproj`
- `src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.RlsFixtures/NonSuperuserRlsFixture.cs`
- `src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.RlsFixtures/RlsSql.cs`
- `src/ehs/tests/Infrastructure.Tests/RlsNonSuperuserIsolationTests.cs`
- `src/qa/tests/Integration/RlsNonSuperuserIsolationTests.cs`
- `src/dms/tests/Integration/RlsNonSuperuserIsolationTests.cs`
- `src/hr/tests/Integration/RlsNonSuperuserIsolationTests.cs`
- `src/maintenance/tests/Integration/RlsNonSuperuserIsolationTests.cs`
- `src/SpaceOS.Modules.CRM/tests/Lead.Tests/Integration/RlsNonSuperuserIsolationTests.cs`
- `src/spaceos-modules/spaceos-modules-kontrolling/tests/Integration/RlsNonSuperuserIsolationTests.cs`

Módosítva (kizárólag `ProjectReference`/csomag-hozzáadás, tesztlogika nem változott egyetlen
meglévő fájlban sem):
- `src/ehs/tests/Infrastructure.Tests/SpaceOS.Modules.Ehs.Infrastructure.Tests.csproj`
- `src/qa/tests/SpaceOS.Modules.QA.Tests.csproj`
- `src/dms/tests/SpaceOS.Modules.DMS.Tests.csproj`
- `src/hr/tests/SpaceOS.Modules.HR.Tests.csproj`
- `src/maintenance/tests/SpaceOS.Modules.Maintenance.Tests.csproj`
- `src/SpaceOS.Modules.CRM/tests/Lead.Tests/SpaceOS.Modules.CRM.Tests.csproj` (+ hiányzó
  `Testcontainers.PostgreSql` csomag felvéve — ez a projekt eddig csak InMemory tesztet
  futtatott)
- `src/spaceos-modules/spaceos-modules-kontrolling/tests/SpaceOS.Modules.Kontrolling.Tests.csproj`

Nem módosult: egyetlen production migráció, DbContext vagy domain-FSM fájl sem (a
Mutációs határ szerint tiltott scope érintetlen maradt).

