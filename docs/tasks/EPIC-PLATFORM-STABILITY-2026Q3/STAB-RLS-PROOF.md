# STAB-RLS-PROOF — nem-superuser tenant-izoláció bizonyítása

- **Szerep:** backend/security
- **Prioritás:** P0
- **Státusz:** pending
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

- [ ] A tesztek nem postgres superuserrel bizonyítják az RLS-t.
- [ ] Mind a 7 modul gyökér-policyja és releváns gyerek-policyja zöld.
- [ ] Tenantváltás és connection-pool reuse mellett nincs adatszivárgás.
- [ ] Header nem írhatja felül a JWT-ben engedélyezett tenant-készletet.
- [ ] Minden FORCE RLS tábla katalógus-asserttel fedett.
- [ ] A futás után nincs új elárvult Testcontainers-konténer.
- [ ] Tesztszám és modulonkénti bizonyíték a task végén szerepel.

## Stop / eszkaláció

- Ha egy tábla tenant ownershipje nem dönthető el, ne írj permissive policyt;
  rögzíts ADR-jelöltet.
- Ha az app deploy-role superuser/BYPASSRLS, a task blokkolt ops döntésig.
- Produktív migrációt csak bizonyított policy-hiba esetén, külön diff-szekcióval
  szabad módosítani.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő: role SQL, modul/tábla mátrix, tesztek, konténer-delta._

