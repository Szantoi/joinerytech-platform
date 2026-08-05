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
   migration, permissions és anonim liveness szerződés.
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
- [x] Az anonim health válasz nem tartalmaz module ID-, verzió- vagy migration
      fingerprintet.
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
- A közös `MapModuleHealth` kezdetben a liveness státusz mellett module ID-t,
  verziót és migrations assembly-t adott vissza — a főágon **hívó nélkül** (a
  maintenance-host bekötése nem került commitba, a főági host sima
  `MapHealthChecks`-et használ).
- Ellenőrzés: `dotnet build src/maintenance/host/SpaceOS.Modules.Maintenance.Host.csproj`
  0 warning/0 error; Hosting tesztkészlet 57/57 zöld.
- A tiszta consumer restore/build smoke még hátra van. A host-csomag kiadását
  GitHub Packages-re, token- vagy feed-konfigurációt ez a szelet nem végzett.

### 2026-08-05 — helyesbítés: a 07-28-i „anonimizált health — kész" bejegyzés nem volt igaz

Ebben a naplóban 07-28-i dátummal az állt, hogy a `MapModuleHealth` „már kizárólag
`{ status }` liveness-választ ad", TestServer-regresszióval, „Hosting teszt 73/73
PASS" bizonyítékkal. **A hivatkozott javítás soha nem került commitba** — csak a
gazdátlan munkafán ült.

- **Mit mért a `HEAD` (2026-08-04-ig):** a `MapModuleHealth` a descriptor-alapú,
  `moduleId`/`version`/`migrationsAssembly` mezőket hordozó választ adta; a
  hivatkozott regressziós tesztek nem léteztek; a Hosting suite **82** tesztből
  állt (a „73/73" semmilyen commitolt állapottal nem egyezik). Ugyanakkor a
  főágon a függvénynek **nulla hívója** volt (`git grep MapModuleHealth HEAD`),
  tehát élő szivárgás nem volt — a bejegyzés viszont az S2-kiírás ⛔ („MA kiadja")
  súlyosságát hamisan alapozta meg.
- **Mikor lett igazzá:** 2026-08-04, **`89da08e`** (S2-szelet, root APPROVED):
  `{ status }`-only válasz mindkét ágon, unhealthy → 503, `.AllowAnonymous()`
  fallback-policy-őrrel; Hosting suite 85/85 zöld, mutáció 3/3.
- A 07-27-i bejegyzés Maintenance-nupkg / consumer-smoke / Kernel-readme tételei
  szintén commitolatlan munkára hivatkoztak → kivéve a naplóból; a csomagolási
  szelet a saját review-jával, mért bizonyítékkal kerülhet vissza.

## Átadási bizonyíték

_Pack/restore/build log, tesztek és dependency-lista._
