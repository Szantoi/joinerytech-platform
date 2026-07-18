# ERPSEP-05 — backend modulcsomagolási és shared-host szerződés

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** backend
- **Prioritás:** P1
- **Státusz:** blocked
- **Függőség:** ERPSEP-02, STAB-RLS-PROOF
- **Mutációs határ:** packaging/hosting contract, build props és egy kijelölt
  referenciamodul; üzleti domain változatlan
- **Tiltott scope:** microservice-bontás, Doorstar backend, új üzleti endpoint

## Cél és üzleti eredmény

Az ERP-backendek fogyasztó instance-ból relatív repo-`ProjectReference` nélkül,
verziózott csomagként regisztrálhatók shared hostba, azonos auth/tenant/RLS,
migration és health szerződéssel.

## Megvalósítási lépések

1. Készíts package/reference leltárt a hét ERP-modulról és a Hosting csomagról.
2. Definiáld a modul bootstrap contractot: service, endpoint, persistence,
   migration, permissions, health/version.
3. Válaszd szét a contract DTO/event package-et az implementációtól.
4. Vezess be központi version/dependency policy-t.
5. Egy kijelölt modulon bizonyítsd a pack/consume buildet.
6. Adj manifest backend szekciót shared-host és későbbi standalone módhoz.

## Teszt- és bizonyítékterv

```powershell
dotnet test src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj
dotnet test src/maintenance/tests/SpaceOS.Modules.Maintenance.Tests.csproj
dotnet pack <kijelölt-packable-project> -c Release
```

Kötelező egy tiszta, ideiglenes consumer projektből végzett restore/build smoke.

## Elfogadási kritériumok

- [ ] A consumer nem hivatkozik a JoineryTech repo relatív forrásútjára.
- [ ] Auth/tenant/RLS setup közös és fail-closed.
- [ ] A modul migrációi determinisztikusan felfedezhetők.
- [ ] Health válasz tartalmaz module ID-t és verziót.
- [ ] Verziókonfliktus build/deploy előtt látható.
- [ ] Üzleti domainkód nem költözött shared hostingba.

## Stop / eszkaláció

Az RLS proof lezárása előtt nem készül release-csomag. NuGet publikálás vagy VPS
deploy csak root jóváhagyással.

## Végrehajtási napló

_Az agent tölti ki._

## Átadási bizonyíték

_Pack/restore/build log, tesztek és dependency-lista._

