# KONTROLLING-BE-HOST — Kontrolling futtatható host + endpoint-réteg

> **Státusz:** ✅ kész (2026-07-16, backend)
> **Előzmény:** F2-KONTROLLING-FE — „EAC/variance kész backend, csak host nincs" (audit G0.1/G3.2)
> **Kontraktus-forrás:** `src/joinerytech-portal/src/modules/controlling/{services,mocks}` (MSW-first, fagyasztott)
> **Precedens:** `src/ehs` (Program), `src/qa` (QaEndpointResults, 032d4d5), `src/maintenance` (4d937f1)

---

## 1. Kiindulási állapot — mit találtam

A „kész backend, csak host nincs" leírás **részben pontatlannak** bizonyult:

| Terület | Dokumentált | Valóság |
|---|---|---|
| Domain (EAC, variance, ProjectCostCalculation) | kész | ✅ kész, `src/` 0 warning-gal fordul |
| Host | nincs | ✅ tényleg nincs |
| Endpoint-réteg | — | **volt** (`Api/Endpoints/KontrollingEndpoints.cs`), de soha nem volt hostba kötve, és a kontraktustól **teljesen eltérő alakú** |
| Tesztprojekt | — | **nem fordult** (27 error, elavult API-ra írt tesztek) |
| Migráció | van | **inert** — nincs `[Migration]` attribútum → `dotnet ef migrations list` = „No migrations were found" |
| EF modell | — | **törött** — a DbContext model-build kivétellel elszállt |

A meglévő endpoint-réteg Guid-alapú, `MoneyDto {amount, currency}`-s, `Dictionary<CostCategory,...>`-ös
volt — a portal-kontraktus ezzel szemben üzleti kulcsos (`PRJ-2026-014`), lapos számos, magyar
kategória-kulcsos. Mivel a réteg **soha nem volt elérhető** (nem volt host), és a mandátum szerint
a portal MSW-kontraktus a mérce, a réteget a kontraktusra **átírtam** (az overhead-config
végpontok — amikre a portalnak nincs megfelelője — natív alakban megmaradtak).

---

## 2. Ami elkészült

### Futtatható host — `host/` (új projekt)

`SpaceOS.Modules.Kontrolling.Host.csproj` (Sdk.Web) — a modul egyetlen csprojában él a Domain +
Application + Infrastructure + endpointok, a host csak összeköti és futtatja (EHS-precedens).

- `Program.cs` — Swagger, auth, `AddKontrollingModule`, `MapKontrollingEndpoints`
- `KontrollingServiceCollectionExtensions.AddKontrollingModule` — JSON wire-formátum, tenant-kontextus,
  config-vezérelt küszöbök, projekt-forrás, MediatR, persistence. **Hibás konfiguráció induláskor dob.**
- `appsettings.Development.json` — a portal seed **pontos** tükre (6 projekt, azonos üzleti kulcsok,
  sorok, számok) → a host drop-in csere az MSW-re. Production: üres lista.

**Host-smoke (élő futtatás, `dotnet run`):**

```
GET /api/kontrolling/projects/PRJ-2026-014 → 200
{"id":"PRJ-2026-014","name":"Petőfi u. 12. — Konyha","customer":"Nagy Anna",
 "status":"install","contractValue":2700000,"invoiced":1890000,
 "lines":[{"category":"anyag","label":"Lapanyag + vasalat","plan":620000,"actual":684000}, …,
          {"category":"beszallito", …,"note":"Blum számla projektre osztott része."}]}
GET /api/kontrolling/projects/PRJ-NOPE → 404
log: "Controlling project source bound from configuration: 6 project(s) across 1 tenant(s)"
```

### Endpointok (8 route a kontraktusra + 5 overhead-config)

| Metódus | Útvonal | Válasz | Hibák |
|---|---|---|---|
| GET | `/api/kontrolling/projects?status=` | `ProjectListItemDto[]` (számított roll-up, üzleti kulcs szerint csökkenő) | 400 ismeretlen státusz |
| GET | `/api/kontrolling/projects/{id}` | `ProjectDetailDto` (törzs + sorok) | 404 |
| GET | `/api/kontrolling/projects/{id}/cost-calculation` | `ProjectCalculationDto` (EAC/variance/fedezet) | 404 |
| GET | `/api/kontrolling/portfolio/cost-calculation` | `PortfolioSummaryViewDto` | — |
| GET | `/api/kontrolling/variance` | `VarianceRowDto[]` (kategória + projekt drill-down) | — |
| GET | `/api/kontrolling/cost-adjustments?projectId=` | `CostAdjustmentViewDto[]` | 404 ismeretlen projekt |
| POST | `/api/kontrolling/cost-adjustments` | **201 + friss DTO** | 400 payload, 404 projekt |
| DELETE | `/api/kontrolling/cost-adjustments/{id}` | 204 (soft-delete) | 404, **409 már törölve** |

**Nincs FSM.** A projekt-státusz életciklus-**címke** (`ProjectLifecycleStatus`), a projekt-törzsből
jön, nincs átmenet-endpoint és nincs guard. A 409-nek egyetlen oka van: dupla törlés.

### Wire-nyelv

A kontraktus magyar kategória-kulcsokat vár (`anyag`/`munka`/`bermunka`/`szallitas`/`beszallito`/`rezsi`),
a backend enumja angol (`Material`/`Labor`/…) — ez **fordítás**, nem konvenció, semmilyen naming policy
nem vezeti le. Ezért `EnumWireMap<T>` + `WireEnumConverter<T>` (`Api/WireEnums.cs`): a szótár EGY helyen
definiálja a wire-szókincset, a JSON-konverter és a query-string kötés is ezt olvassa. A map konstruktora
**dob, ha egy enum-tagnak nincs wire-neve** (különben némán olyat szerializálnánk, amit a kliens nem ért).
`JsonStringEnumConverter` fallbackként regisztrálva marad (EHS-konvenció).

### Config-vezérelt küszöbök (M2 review finding)

`Kontrolling:Portfolio` szekció, EHS `RiskBandConfiguration`-precedens (fail-fast a konstruktorban):

- `AtRiskMarginThreshold` (alap **0.15** = portal `AT_RISK_MARGIN_THRESHOLD`) — **törtszám**;
  ≥ 1 érték dob (százalék-vs-tört elgépelés ellen)
- `AtRiskStatuses` (alap Active/Install/OnHold) — üres halmaz dob (némán kikapcsolná a KPI-t)

> A weak/medium/good **fedezet-sávok tudatosan a kliensen maradtak** (portal `config.ts`): az API a nyers
> fedezet-törtet adja, a sávozás megjelenítési döntés. Csak az at-risk küszöb változtatja a payloadot,
> ezért csak az szerver-oldali konfiguráció.

### Számítás — a backend az igazságforrás

`ProjectCostView` + `PortfolioCostView` (Application/Portfolio). A kategória-matek a **domainé**
(`CategoryCost.Calculate`: projected = MAX(terv, tény), variance = tény − terv, EAC = Σ projected).
A read model csak azt teszi hozzá, amiről az aggregátumnak nincs véleménye: mely kategóriák jelennek meg,
hogyan hajtódnak be a korrekciók, és a tört/null konvenciók.

- **Százalékok törtek** (0.15 = 15%), nem 0..100.
- **Nulla nevező → `null`**, nem 0 („nincs értelmezve" ≠ „nulla fedezet").
- **Korrekció csak a TÉNYT tolja**, a tervet soha.

---

## 3. Javított hibák (mind pre-existing, mind blokkoló volt)

| # | Hiba | Következmény | Javítás |
|---|---|---|---|
| 1 | `OverheadConfigEntityTypeConfiguration`: `HasIndex("overhead_config_id", "cost_category")` — **oszlop**név **property**név helyett | EF shadow-property kivétel model-buildkor → **a DbContext használhatatlan volt** | `nameof(OverheadRule.CostCategory)` |
| 2 | `TenantDbConnectionInterceptor`: RLS-parancs `ConnectionOpening`-ban | „Connection is not open" az első lekérdezésen | `ConnectionOpened`/`ConnectionOpenedAsync` (Maintenance-precedens) |
| 3 | `20260707_InitialCreate` — nincs `[DbContext]`/`[Migration]` attribútum | „No migrations were found" → a séma **soha nem volt felhúzható** | attribútumok pótolva; `dotnet ef migrations list` → `20260707000000_InitialCreate` |
| 4 | `CostAdjustmentRepository.GetByIdAsync`: `AsNoTracking()` + `!IsDeleted` szűrő a törlési úton | a soft-delete **nem perzisztált**, és a már törölt sor 404-et adott 409 helyett | új `GetForUpdateAsync` (követett, törölteket is látja) |
| 5 | `DependencyInjection`: `services.BuildServiceProvider()` az `AddDbContext` lambdában + singleton interceptor scoped tenant-kontextusra | captive dependency; az interceptor nem a kérés tenantját látta volna | serviceProvider-overload (EHS-precedens) |
| 6 | Tesztprojekt: 27 fordítási hiba (elavult API: `UpsertAsync`, `new OverheadConfig(...5 arg)`, `.Method`/`.Rate`) | **a tesztek nem futottak** | a jelenlegi API-ra igazítva |

---

## 4. Architektúra-döntés: `IProjectPortfolioSource`

**A Kontrolling nem birtokol projekteket.** A kontraktus kér: `name`, `customer`, `status`,
`contractValue`, `invoiced`, `lines[{category,label,plan,actual,note}]`. Ezek egyike sincs a domainben —
más modulokhoz tartoznak (CRM rendelés → projekt, gyártáselőkészítés, időnaplók, raktár, logisztika,
bejövő számlák), és egyik sem létezik még ezen a platformon.

Nem találtam ki projekt-táblát. Helyette **portot** deklaráltam
(`Application/Portfolio/IProjectPortfolioSource.cs`), ami pontosan azt írja le, amire a modulnak
szüksége van. Az átmeneti implementáció **konfigurációból kötött**
(`Infrastructure/Portfolio/ConfiguredProjectPortfolioSource`) — ugyanaz a varrat, amit a meglévő
`IIntegrationDataProvider` stub is elfoglal („TODO: Week 3"). Dev-ben a portal seedjét szolgálja ki,
prodban üres → az endpointok **őszintén** üres portfóliót jelentenek.

---

## 5. Tesztek

**177 zöld** (baseline 115 → **+62**), 0 warning, **Docker nélkül** futtatható:

```
dotnet test tests/SpaceOS.Modules.Kontrolling.Tests.csproj --filter "FullyQualifiedName!~Integration"
→ Passed! Failed: 0, Passed: 177, Skipped: 0
```

- **`tests/Api/` (+34)** — `KontrollingEndpointTestHost` (TestServer + valódi routing + valódi MediatR
  handlerek + valódi domain-entitások + **éles JSON wire-formátum**, in-memory repókkal; Maintenance
  `WorkOrderEndpointTestHost`-precedens). A tesztek a **nyers JSON-t** állítják, nem deszerializált
  DTO-kat: az enum-helyesírást, a tört-százalékokat és a null-vs-hiányzó különbséget egy oda-vissza
  konvertálás pont elrejtené — a kliens viszont zod-dal validál.
- **`tests/Application/Portfolio/` (+28)** — számítási szabályok (kategória-sorrend, MAX-projekció,
  korrekció csak a tényre, plan=0 → `variancePct` null), portfólió-szemantika, küszöb-guardok,
  wire-szótár teljesség.

Kiemelt eset-lefedettség: `status=finished` → 400; `note` **hiányzik** ha nincs (a zod
`.optional()`, nem `.nullable()` — a literál null megbukna); portfólió-korrekció **egyszer** számít;
draft/done projekt **soha** nem at-risk; dupla törlés → 409 + „már törölve".

> A `tests/Integration/` (Testcontainers) továbbra is Docker-függő — ez a repó bevett tagolása
> (qa/maintenance ugyanígy). A fenti filter ezt zárja ki.

---

## 6. Build

```
src/  → Build succeeded. 0 Warning(s), 0 Error(s)
host/ → Build succeeded. 0 Warning(s), 0 Error(s)
tests/→ Build succeeded. 0 Warning(s), 0 Error(s)
```

`openapi.yaml` a modulhoz nem létezik → nincs mit szinkronizálni.

---

## 7. ADR-jelöltek / follow-upok

1. **⚠️ `AppliesTo` szemantika-ütközés.** `CostAdjustment.AppliesTo` szerint egy portfólió-hatályú
   korrekció **MINDEN** projektre vonatkozik; a `ProjectCostCalculationService` ennek megfelelően minden
   projekt költségéhez hozzáadja. A kontraktus szerint viszont a portfólió-korrekció **egyszer**, a
   portfólió szintjén számít, projektre soha. A read model a kontraktust követi (scope szerint
   particionál), a natív szolgáltatás a régi olvasatot — **a kettőnek egy szabályra kell konvergálnia.**
2. **⚠️ Host-auth: platform-szintű döntés hiányzik.** Az endpointok `RequireAuthorization()`-t hívnak
   (EHS/QA/Maintenance-precedens), de **egyetlen modul-host sem regisztrál sémát**, és a kernel sem
   szállít handlert — így az EHS host is ugyanígy elszállna. Átmenetileg `DevelopmentAuthentication`
   (mindenkit beenged, és **Developmenten kívül indításkor dob**). Kell egy közös Keycloak/JWT bearer
   wiring minden modul-hostra.
3. **`createdBy` audit-név.** A kontraktus `createdBy: string` (portal: „Kovács P."), a domain
   `CreatedBy: Guid`. A hitelesített hívó Guidját adom vissza (a kliens által küldött nevet nem
   fogadom el — audit-rekordként úgysem hihető). A UI így Guidot mutat. Kell user-directory lookup
   (Keycloak profil) vagy denormalizált `CreatedByName`. A portal `config.ts` ezt maga is
   `ÁTMENETI`-ként jelöli.
4. **`marginTrend` előzmény nincs.** A modul nem tárol költség-pillanatképet, ezért csak az **aktuális
   hónap** pontját adom vissza (élő adatból számítva) — az MSW 5 hónapnyi statikus előzményt seedel.
   Múltbeli hónapok kitalálása hazugság lett volna. Kell periodikus snapshot (vagy egy trend-tábla).
5. **`customer` és `status` nem levezethető.** A `contractValue ≈ Revenue.Planned`,
   `invoiced ≈ Revenue.Actual` megfeleltetés adódik, de az ügyfél és az életciklus-címke sehonnan nem
   jön — a port deklarálja az igényt, a valós forrás a CRM/projekt-integráció.
6. **Két átfedő port.** `IIntegrationDataProvider` (költségadat) és `IProjectPortfolioSource`
   (törzs + sorok) ugyanarra a hiányzó integrációra vár. A valós bekötéskor konvergáljanak.
7. **Natív cost-DTO-k kikerültek a REST-felületről.** `EACCalculationDto`, `VarianceAnalysisDto`,
   `CostSummaryDto`, `PortfolioSummaryDto` (natív) + a hozzájuk tartozó Guid-alapú query-k
   megmaradtak az Applicationben, de már nincsenek publikálva — a kontraktus a felület. Vagy
   konvergáljanak a read modellel, vagy törlendők.
8. **Validátorok nincsenek bekötve.** A modul FluentValidation-validátorai (`CreateCostAdjustmentCommandValidator`
   stb.) **soha nem futottak** (nincs pipeline behavior). Tudatosan **nem** regisztráltam őket: úgy
   nézne ki, mintha validálnának. A handlerek maguk guardolnak (→ 400). Kell egy `ValidationBehavior`,
   vagy törlendők.
9. **Multi-currency.** A wire-DTO-k lapos számok, a pénznem nincs mezőnként hordozva; a modul HUF-ot
   feltételez (`Money.FromHUF`, a natív szolgáltatásban `var currency = "HUF"; // TODO`).
10. **RLS-függvény hiányzik.** Az interceptor `SELECT kontrolling.set_tenant_context($1)`-et hív, de a
    migráció **nem hozza létre** sem a függvényt, sem az RLS policy-ket — csak a 3 táblát. Élesben ez
    minden DB-hívást megbuktat.

---

## 8. Érintett fájlok

**Új:** `host/{SpaceOS.Modules.Kontrolling.Host.csproj,Program.cs,DevelopmentAuthentication.cs,appsettings.json,appsettings.Development.json}`,
`src/Domain/Enums/ProjectLifecycleStatus.cs`,
`src/Application/Portfolio/{IProjectPortfolioSource,PortfolioThresholds,PortfolioDtos,ProjectCostView,PortfolioCostView,PortfolioQueries,AdjustmentCommands}.cs`,
`src/Infrastructure/Portfolio/ConfiguredProjectPortfolioSource.cs`,
`src/Api/{WireEnums,KontrollingApiJsonOptions,KontrollingServiceCollectionExtensions,HttpTenantContext}.cs`,
`src/Api/Endpoints/KontrollingEndpointResults.cs`,
`tests/Api/{KontrollingEndpointTestHost,KontrollingEndpointsTests}.cs`,
`tests/Application/Portfolio/PortfolioReadModelTests.cs`

**Módosított:** `src/Api/Endpoints/KontrollingEndpoints.cs` (átírva a kontraktusra),
`src/Application/Services/ICostAdjustmentRepository.cs`,
`src/Infrastructure/{DependencyInjection.cs,MultiTenancy/TenantDbConnectionInterceptor.cs}`,
`src/Infrastructure/Persistence/{Repositories/CostAdjustmentRepository.cs,Configurations/OverheadConfigEntityTypeConfiguration.cs,Migrations/20260707_InitialCreate.cs}`,
`tests/{Application/Commands/{Set,Update}OverheadConfigCommandHandlerTests.cs,Application/Queries/GetOverheadConfigQueryHandlerTests.cs,Integration/KontrollingIntegrationTests.cs}`

**A portal fához nem nyúltam** (csak olvastam).
