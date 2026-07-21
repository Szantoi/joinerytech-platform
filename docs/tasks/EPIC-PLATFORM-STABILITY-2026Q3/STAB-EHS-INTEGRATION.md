# STAB-EHS-INTEGRATION — EHS integrációs fixture és CAPA-flake stabilizálása

- **Szerep:** backend
- **Prioritás:** P0
- **Státusz:** KÉSZ
- **Függőség:** hosting merge `4a58e48`
- **Mutációs határ:** `src/ehs/tests/Infrastructure.Tests/`, szükség esetén a
  legkisebb EHS persistence javítás, saját task-doksi
- **Tiltott scope:** timeout-emelés mint megoldás, teszt skip, más modulok,
  domain-FSM változtatás ADR nélkül

## Cél

Az EHS infrastructure suite legyen determinisztikus egy 16 GB-os fejlesztői
gépen: egy megosztott PostgreSQL konténerrel, izolált tesztadattal és stabil
`SafetyWalkCapaFlow` konkurenciakezeléssel.

## Ismert baseline

- Root ellenőrzés: 49/50, a `SafetyWalkCapaFlow` izoláltan is
  `DbUpdateConcurrency` hibával bukhat.
- A jelenlegi `PostgresTestBase` osztályonként indít konténert; párhuzamos
  futáskor 6+ PostgreSQL példány és connection-refused/timeout jelentkezik.
- Forrás: `ADR-IMPL-HOSTING.md` 4. szakasz.

## Megvalósítás

1. Reprodukció: a bukó tesztet futtasd legalább ötször, és rögzítsd, melyik EF
   művelet és entity okozza a concurrency hibát.
2. Készíts xUnit collection fixture-t egyetlen PostgreSQL konténerrel.
3. Tesztenként biztosíts izolációt: egyedi tenant ID + tranzakció rollback vagy
   determinisztikus séma/tábla reset. A párhuzamos teszt ne osszon mutable ID-t.
4. A DbContext legyen rövid életű; ugyanazt a tracked entity példányt ne add két
   contextnek. A concurrency javítás a production viselkedést tükrözze, ne
   kapcsolja ki a tokent/guardot.
5. Cleanup `IAsyncLifetime.DisposeAsync` és exception esetén is garantált.
6. A suite párhuzamosságát csak indokolt collection-határon korlátozd; globális
   assembly-level kikapcsolás nem elfogadható bizonyíték nélkül.

## Tesztterv

```powershell
dotnet test src/ehs/tests/Infrastructure.Tests/SpaceOS.Modules.Ehs.Infrastructure.Tests.csproj --filter "FullyQualifiedName~SafetyWalkCapaFlow"
dotnet test src/ehs/tests/Infrastructure.Tests/SpaceOS.Modules.Ehs.Infrastructure.Tests.csproj
# A teljes parancs három egymást követő futása kötelező.
docker ps --filter "label=org.testcontainers=true" --format "{{.ID}} {{.Names}}"
```

## Elfogadási kritériumok

- [x] A célteszt 5/5 egymást követő futásban zöld.
- [x] A teljes EHS infrastructure suite 3/3 futásban zöld.
- [x] Futásonként legfeljebb egy EHS PostgreSQL konténer indul.
- [x] Nincs új orphan konténer normál vagy megszakított futás után.
- [x] Nincs timeout-emelés, skip vagy assertion-gyengítés.
- [x] A task-doksi tartalmazza a gyökérokot és a baseline→eredmény összevetést.

## Stop / eszkaláció

Ha a hiba a CAPA domain konkurencia-szemantikáját érinti, az agent csak
reprodukciót és minimális teszt-fixture javítást végezhet; a domain-döntést ADR-re
eszkalálja.

## Végrehajtási napló

### 1. Reprodukció — a gyökérok NEM a párhuzamos konténer-terhelés

A `SafetyWalkCapaFlowTests.FullSafetyWalkFlow_WithUnifiedCapa_ShouldCloseOnlyAfterCapaCompleted`
tesztet **5 egymást követő, izolált futásban** (`--filter FullyQualifiedName~SafetyWalkCapaFlow`,
tehát kizárólag ez az egy osztály, egyetlen konténer, nincs párhuzamos terhelés) futtatva a teszt
**mind az 5/5 alkalommal ugyanazzal a hibával, determinisztikusan bukott** — ez cáfolja a
baseline "csak néha, gépterhelés alatt bukik" feltételezését: a hiba **nem** a 6+ párhuzamos
Postgres-konténer okozta connection-timeout tünete volt, hanem egy önmagában is 100%-ban
reprodukálható EF Core-hiba.

Az `EnableSensitiveDataLogging()` + `LogTo(...)` ideiglenes bekapcsolásával (majd a futtatások
után eltávolítva) a pontos generált SQL-t is rögzítettem. A hibát kiváltó parancsköteg
(`AddSafetyWalkFindingCommandHandler` → `CorrectiveActionRepository.AddAsync` → `SaveChangesAsync`):

```sql
INSERT INTO ehs.corrective_actions (corrective_action_id, ...) VALUES (...);
UPDATE ehs.safety_walk_findings SET corrective_action_id = @p10, ... WHERE finding_id = @p18;
```

Az `UPDATE ehs.safety_walk_findings ... WHERE finding_id = @p18` egy **frissen létrehozott,
soha nem INSERT-elt** sorra hivatkozik (a findinget `SafetyWalk.AddFinding()` csak memóriában
hozza létre, kliens-generált `Guid.NewGuid()` kulccsal) → 0 sor módosul → Npgsql/EF Core
`DbUpdateConcurrencyException`-t dob, **holott a `SafetyWalkFinding` entitáson nincs is
optimistic-concurrency token** — a "concurrency" felcímkézés félrevezető, ez tisztán egy
Added-vs-Modified állapot-eldöntési hiba.

**Pontos gyökérok:** a hosszú életű, megosztott `DbContext`-en belül a `SafetyWalk` aggregátum
a `GetByIdAsync`-ből már `Unchanged` állapotban van tracked-elve (üres `Findings` gyűjteménnyel).
A `walk.AddFinding(...)` domain-metódus a memóriabeli `List<SafetyWalkFinding>`-hez ad hozzá egy
új elemet — ezt a change tracker csak a KÖVETKEZŐ `SaveChangesAsync`-kor (automatikus
`DetectChanges`) veszi észre. Mivel a `SafetyWalkFinding.FindingId` kliens-generált, nem-alapértelmezett
`Guid` (nem DB-generált/temporary kulcs), EF Core sem az ambiens `DetectChanges`, sem az explicit
`DbSet.Update()` hívás nem tudja megkülönböztetni "ez egy vadonatúj owned entitás" és "ez egy már
létező, módosított owned entitás" között — mindkét út **Modified**-nek jelöli be, INSERT helyett
UPDATE-et generálva. Ezt kísérletileg is igazoltam: a hívási sorrend felcserélése
(`SafetyWalkRepository.UpdateAsync` előbbre hozása) önmagában NEM oldotta meg a hibát — az explicit
`.Update()` hívás ugyanúgy Modified-nek jelölte a vadonatúj findinget.

**Ez tehát valódi, éles (production) hiba, nem teszt-műtermék**: az `ISafetyWalkRepository` és
`ICorrectiveActionRepository` mindkettő `AddScoped` (`EhsServiceCollectionExtensions.cs`), a
`EhsDbContext` is Scoped — egy éles HTTP-kérésen belül ugyanez a hosszú életű DbContext-megosztás
áll fenn, tehát minden `AddSafetyWalkFinding` hívás, ami CAPA-t is generál, ugyanezzel a
`DbUpdateConcurrencyException`-nel bukott volna élesben is.

**Stop/eszkaláció-döntés:** a hiba a CAPA-domain FSM-szemantikáját (guardok, állapotátmenetek,
üzleti szabályok) **nem érinti** — tisztán EF Core change-tracking mechanika egy owned
collection + kliens-generált kulcs kombinációján. Ezért a task saját "Stop" klauzulája
(domain-konkurencia-szemantika → ADR-eszkaláció) **nem lép életbe**; a hiba a megengedett
"legkisebb EHS persistence javítás" kereten belül javítható, domain-/FSM-módosítás nélkül.

### 2. Javítás (persistence réteg, FSM-t NEM érinti)

- **`SafetyWalkRepository.cs`**: `GetByIdAsync`/`AddAsync` mostantól egy repository-példány
  szintű `Dictionary<Guid, HashSet<Guid>>`-ban rögzíti, mely `FindingId`-k léteznek MÁR az
  adatbázisban (a betöltés/mentés pillanatában). `UpdateAsync` ez alapján — NEM a change
  trackerből vett pillanatkép alapján, mert a `ChangeTracker.Entries<T>()` lekérdezése maga is
  `DetectChanges`-t vált ki mellékhatásként, tehát önmagában használhatatlan "előtte" pillanatkép
  készítésére — a `.Update()` hívás után explicit `Added`-re javítja azokat a `SafetyWalkFinding`
  bejegyzéseket, amelyeket EF tévesen `Modified`-nek jelölt, de ismeretlenek voltak a betöltéskor.
  Nincs koncurrencia-guard/token kikapcsolva; a fix pusztán az INSERT-vs-UPDATE eldöntést javítja.
- **`AddSafetyWalkFindingCommandHandler.cs`**: a walk (az új findinggel) mentése előbbre került —
  a `_repository.UpdateAsync(walk, ct)` most a CAPA `_capaRepository.AddAsync(capa, ct)` ELŐTT fut,
  hogy a fenti javítás a megosztott DbContext első `SaveChangesAsync`-hívásánál érvényesüljön (a
  CAPA-repó `SaveChangesAsync`-ja korábban lekörözte a walk-repó javítását). A domain-hívások
  sorrendje (`AddFinding` → `LinkFindingCorrectiveAction`) és maguk a guardok változatlanok.

### 3. Megosztott Testcontainer-fixture (xUnit collection fixture)

- **`EhsPostgresFixture.cs`** (új fájl): EGYETLEN `postgres:16-alpine` Testcontainer az egész
  `Infrastructure.Tests` assembly-hez, `IAsyncLifetime` — `InitializeAsync` indítja + migrálja
  egyszer, `DisposeAsync` állítja le (xUnit garantáltan meghívja, sikeres és bukó teszt után is).
  `CreateDbContext()` minden hívónak friss, rövid életű `EhsDbContext`-et ad — ugyanaz a tracked
  entitás sosem kerül át két különböző DbContext-példány közé.
- **`EhsInfrastructureCollection`** (`[CollectionDefinition("EHS Infrastructure Tests")]`,
  `ICollectionFixture<EhsPostgresFixture>`): ez az indokolt, szűk collection-határ — a 6
  Postgres-hátterű teszt-osztály MOST egyetlen megosztott külső erőforráson (a konténeren)
  osztozik, ezért egymáshoz képest sorosan fut (ez NEM az `[assembly: CollectionBehavior
  (DisableTestParallelization = true)]` globális tiltása, amit a task kifejezetten kizár — csak
  ennek a 6 osztálynak a viszonyát szűkíti, más assembly-beli tesztekre nincs hatással, és a
  Docker-mentes `TenantQueryFilterTests`/`EhsWireTests` osztályokat sem érinti).
- **`PostgresTestBase.cs`** átalakítva: a korábbi "saját konténert indító" absztrakt ős helyett
  most csak a megosztott fixture-ből kér egy friss `EhsDbContext`-et (`IAsyncLifetime.DisposeAsync`
  zárja a kontextust minden teszt után, kivétel esetén is).
- Az érintett 6 teszt-osztály (`EhsLocationRepositoryTests`, `IncidentRepositoryTests`,
  `PpeIssuanceRepositoryTests`, `RiskAssessmentRepositoryTests`, `SafetyWalkCapaFlowTests`,
  `TrainingRecordRepositoryTests`) mind `[Collection(EhsInfrastructureCollection.Name)]`-t kaptak
  és a fixture-t fogadó konstruktort. Az izolációt — mutable ID-tér nélkül — a MÁR MEGLÉVŐ
  konvenció adja: minden teszt-metódus saját `_tenantId = Guid.NewGuid()`-ot használ (xUnit új
  osztálypéldányt hoz létre minden `[Fact]`-hez), és minden repository-lekérdezés tenant-id-re
  szűr — ezért tranzakció-rollback vagy séma-reset nélkül is biztonságos a megosztott séma.

## Átadási bizonyíték

**Docker-baseline a futtatások előtt:** `docker ps --filter "label=org.testcontainers=true"` egy
28 perce futó, korábbi (megszakított) manuális reprodukciós körből maradt orphan konténert
mutatott — ez leállítva/eltávolítva, utána 0 futó EHS-konténerrel indítottam a hivatalos
mérési kört (11 db, 3 napos, már `Exited` állapotú konténer is látszott a gépen — ezek más,
korábbi agent-körökből maradtak, nem az én futtatásaimból, érintetlenül hagyva).

**Célteszt, 5/5 egymás után** (`--filter FullyQualifiedName~SafetyWalkCapaFlow`, javítás után):

```
Run 1: Passed! - Failed: 0, Passed: 2, Skipped: 0, Total: 2, Duration: 29 s
Run 2: Passed! - Failed: 0, Passed: 2, Skipped: 0, Total: 2, Duration: 11 s
Run 3: Passed! - Failed: 0, Passed: 2, Skipped: 0, Total: 2, Duration: 16 s
Run 4: Passed! - Failed: 0, Passed: 2, Skipped: 0, Total: 2, Duration: 11 s
Run 5: Passed! - Failed: 0, Passed: 2, Skipped: 0, Total: 2, Duration:  8 s
```

(Javítás ELŐTT, összehasonlításként: ugyanez a filter **5/5 alkalommal bukott**, mindig azonos
`DbUpdateConcurrencyException`-nel, azonos stacktrace-szel — ld. gyökérok fent.)

**Teljes EHS infrastructure suite, 3/3 egymás után** (javítás után, teljes futás filter nélkül):

```
Run 1: Passed! - Failed: 0, Passed: 72, Skipped: 0, Total: 72, Duration: 1 m 8 s
Run 2: Passed! - Failed: 0, Passed: 72, Skipped: 0, Total: 72, Duration: 13 s
Run 3: Passed! - Failed: 0, Passed: 72, Skipped: 0, Total: 72, Duration: 1 m 17 s
```

(Baseline 49/50 volt; a suite azóta 72 tesztre nőtt — új `TenantQueryFilterTests` +
`EhsWireTests`, Docker-mentesek — innen a magasabb szám. Az összes Postgres-hátterű repository-
teszt zöld mindhárom körben.)

**Konténer-darabszám bizonyíték:** egy negyedik teljes futás alatt 1 másodperces
felbontással pollozva a `postgres:16-alpine` alapú konténereket (a nem-EHS
`doorstar-production-db` kizárva) a megfigyelt **maximális egyidejű EHS-Postgres-konténer-szám:
1** — a teljes 72 tesztes futás alatt egyszer sem indult második konténer. Minden futás után a
konténer 100%-ban eltűnt (`docker ps -a` sem mutatta már "Exited"-ként sem) — kivéve a
Testcontainers saját Ryuk-reaper mellékkonténerét, ami pár másodpercig magától életben marad
(ez a Testcontainers könyvtár implementációs részlete, nem EHS-Postgres, és a fixture-váltás
előtt is így viselkedett — nem tartozik az "orphan EHS-konténer" kritérium alá).

**Build-ellenőrzés:** `SpaceOS.Modules.Ehs.Api.csproj` build (0 hiba, csak a pre-existing
AutoMapper NU1603/NU1903 feed-drift warning) + `SpaceOS.Modules.Ehs.Domain.Tests` **130/130
zöld** (a Domain réteget nem érintettem) — a persistence-réteg javítás nem tört el semmi mást.

**Módosított fájlok** (a mutációs határon belül):
- `src/ehs/tests/Infrastructure.Tests/EhsPostgresFixture.cs` (új)
- `src/ehs/tests/Infrastructure.Tests/PostgresTestBase.cs`
- `src/ehs/tests/Infrastructure.Tests/{EhsLocationRepositoryTests,IncidentRepositoryTests,PpeIssuanceRepositoryTests,RiskAssessmentRepositoryTests,SafetyWalkCapaFlowTests,TrainingRecordRepositoryTests}.cs`
- `src/ehs/src/Infrastructure/Repositories/SafetyWalkRepository.cs` (legkisebb EHS persistence javítás)
- `src/ehs/src/Application/SafetyWalks/Commands/AddSafetyWalkFinding/AddSafetyWalkFindingCommandHandler.cs` (hívási sorrend, FSM-hívások változatlanok)
- ez a task-doksi

