# STAB-EHS-INTEGRATION — EHS integrációs fixture és CAPA-flake stabilizálása

- **Szerep:** backend
- **Prioritás:** P0
- **Státusz:** pending
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

- [ ] A célteszt 5/5 egymást követő futásban zöld.
- [ ] A teljes EHS infrastructure suite 3/3 futásban zöld.
- [ ] Futásonként legfeljebb egy EHS PostgreSQL konténer indul.
- [ ] Nincs új orphan konténer normál vagy megszakított futás után.
- [ ] Nincs timeout-emelés, skip vagy assertion-gyengítés.
- [ ] A task-doksi tartalmazza a gyökérokot és a baseline→eredmény összevetést.

## Stop / eszkaláció

Ha a hiba a CAPA domain konkurencia-szemantikáját érinti, az agent csak
reprodukciót és minimális teszt-fixture javítást végezhet; a domain-döntést ADR-re
eszkalálja.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

