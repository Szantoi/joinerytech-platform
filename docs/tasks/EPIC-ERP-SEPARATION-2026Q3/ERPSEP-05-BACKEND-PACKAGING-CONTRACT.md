# ERPSEP-05 — backend modulcsomagolási és shared-host szerződés

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** backend
- **Prioritás:** P1
- **Státusz:** in_progress
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

### 2026-07-27 — Codex: shared-host packaging előszlet

- Az `STAB-RLS-PROOF` Testcontainers-bizonyíték elkészült, ezért az ADR-067 által
  feloldott ERPSEP-05 packaging-sáv elkezdődött.
- A `SpaceOS.Modules.Hosting` kapott explicit NuGet-metaadatot:
  `PackageId=SpaceOS.Modules.Hosting`, preview verzió, leírás, repository és a
  csomagba kerülő README. Ez a közös auth/tenant/RLS baseline; üzleti domainkód
  nem került a hostingba.
- Helyi, publikálás nélküli release-pack zöld:
  `artifacts/packages/erpsep-05/SpaceOS.Modules.Hosting.0.1.0-preview.1.nupkg`.
- Elkészült a shared-host bootstrap szerződés (`ISpaceOsModuleBootstrap` +
  `ModuleDescriptor`), amely rögzíti a module ID-t, verziót és a migrations
  assembly-t. A `MaintenanceModuleBootstrap` ezt ténylegesen fogyasztja:
  modul-szolgáltatások és endpointok a modulból, auth és middleware-sorrend a
  hostból jönnek.
- A Maintenance `/health` válasza a közös szerződésen át a liveness státusz mellett
  visszaadja a module ID-t, verziót és migrations assembly-t.
- Ellenőrzés: `dotnet build src/maintenance/host/SpaceOS.Modules.Maintenance.Host.csproj`
  0 warning/0 error; Hosting tesztkészlet 57/57 zöld.
- A tiszta consumer restore/build smoke még hátra van. A host-csomag kiadását
  GitHub Packages-re, token- vagy feed-konfigurációt ez a szelet nem végzett.

## Átadási bizonyíték

_Pack/restore/build log, tesztek és dependency-lista._
