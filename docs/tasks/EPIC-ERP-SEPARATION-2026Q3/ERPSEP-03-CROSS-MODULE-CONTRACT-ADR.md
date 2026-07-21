# ERPSEP-03 — ERP cross-module kontraktus és semleges referencia ADR

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** architect/backend
- **Prioritás:** P0
- **Státusz:** ✅ done (2026-07-21, agent) — az ADR-066 elkészült, **Státusz:
  PROPOSED** (Gábor jóváhagyására vár; 2 nyitott függőség jelölve, lásd lent)
- **Függőség:** ERPSEP-01
- **Mutációs határ:** ADR és contract-katalógus; alkalmazáskód read-only
- **Tiltott scope:** domainrefaktor, DB-migráció, új endpoint

## Cél és üzleti eredmény

A hét ERP-modul úgy használható más iparágban, hogy nem importál JoineryTech
entitást és nem ír más modul adatbázisába. Ehhez egységes port-, reference- és
integration-event szabály készül.

## Kötelező vizsgálat

- `IProjectPortfolioSource` mint meglévő jó portminta;
- ERP-modulok közötti `ProjectReference`, namespace és frontend deep importok;
- DMS link, QA inspection subject, Maintenance asset, Kontrolling project,
  CRM order/quote és HR actor referenciák;
- outbox/inbox és contract package precedensek;
- tenant/B2B referencia-feloldás jogosultsága.

## Döntendő szerződések

```text
SubjectRef(moduleId, aggregateType, aggregateId)
ProjectRef(projectId)
OrderRef(orderId)
WorkItemRef(moduleId, workItemType, workItemId)
AssetRef(assetId)
DocumentRef(documentId)
PartyRef(partyId)
```

Az ADR mondja ki, melyik referencia kerül platform abstractionbe, melyik marad
modulcontractban, és mikor használható snapshot/projection.

## Kötelező kimenet

- `docs/knowledge/adr/ADR-066-erp-module-contract-boundaries.md`
- modulonként provider/consumer/event/API mátrix
- tiltott függőségi szabályok és automatizálható dependency-test terve
- contract versioning és breaking-change policy

## Elfogadási kritériumok

- [ ] Nincs közös „Common.Domain” üzleti entitásjavaslat.
- [ ] Modulonként ismert a source of truth és az engedélyezett consumer projection.
- [ ] Cross-tenant feloldás explicit B2B authorizationt követel.
- [ ] OpenAPI, integration event és in-process port szerepe egyértelmű.
- [ ] Minden jelenlegi boundary violation kap migrációs irányt.

## Stop / eszkaláció

Ha a Project/FlowEpic source of truth szükséges egy döntéshez, várd meg a
`PROJECT-CORE-ADR` eredményét; ne hozz létre új ProjectRef-tulajdonost.

## Végrehajtási napló

- Elolvasva a kötelező bemenetek: `ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md`
  (ERPSEP-01), `PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md`
  (PROJECT-BOUNDARY-AUDIT), `SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`
  (§4–5, rétegmodell + bounded context/integrációs szabályok), és a már
  elfogadott `ADR-065-kernel-scope-absztrakcio.md` (a Kernel
  domain-mentességi elve közvetlenül meghatározza, hova NEM kerülhet a
  javasolt referencia-csomag).
- Ellenőrizve az ADR-számozás (`docs/knowledge/adr/*.md` listázva, 8 fájl):
  ADR-059..065 foglalt, ADR-066 szabad — a task saját kötelező kimenete
  helyesen ADR-066-ra mutatott, nem kellett módosítani. ADR-067 (ERPSEP-02,
  párhuzamos agent) érintetlenül hagyva.
- Kötelező vizsgálat elvégezve, kizárólag olvasással:
  - `IProjectPortfolioSource` port + `ConfiguredProjectPortfolioSource`
    adapter (`src/spaceos-modules/spaceos-modules-kontrolling/src/
    Application|Infrastructure/Portfolio/`) — jó portminta, referenciaként
    rögzítve.
  - DMS `EntityLink`/`EntityType`/`DocLinkType`
    (`src/dms/src/Domain/{ValueObjects,Enums}/`) — a legközelebbi, de zárt
    enumos és nem perzisztált `SubjectRef`-előd.
  - QA `Inspection` (`src/qa/src/Domain/Aggregates/Inspection.cs`) és CRM
    `Opportunity` (`src/SpaceOS.Modules.CRM/src/Lead.Domain/Aggregates/
    Opportunity.cs`) ad-hoc, típusjelző nélküli `Guid`/`Guid?`
    referenciamezői (`OrderId`, `ProductId`, `QuoteId`, `CustomerId`,
    `InspectorId`) — megerősítve, hogy sem Order, sem Quote, sem Customer
    aggregate nem létezik a kanonikus CRM-ben.
  - Maintenance `Asset`/`AssetId` és HR `Employee`/`EmployeeId` mint valódi,
    tesztelt tulajdonos-aggregate-ek.
  - Kernel `OutboxMessage`/`ModuleSubscription`/`CrossModuleOutboxDispatcher`
    (`src/spaceos-kernel/SpaceOS.Kernel.Domain/Outbox/`,
    `SpaceOS.Infrastructure/Outbox/`) — valódi, hostolt, HMAC-aláírt
    outbox→HTTP-inbox minta, de repo-wide grep (`OutboxMessage.Create`,
    `internal/inbox`) 0 találatot ad bármely ERP-modulban — ma senki nem
    fogyasztja.
  - `SpaceOS.Modules.Contracts.Maintenance.Events.AssetDowntimeEvent` —
    Production oldali fogyasztó (`AssetDowntimeEventHandler.cs` +
    `Maintenance_AssetDowntime_ImpactsProduction.cs` teszt) létezik, de a
    Maintenance modul forráskódjában (`src/maintenance/src`) 0 találat
    `AssetDowntime`-ra — a termelő oldal hiányzik, félig vezetékelt
    kontraktus.
  - `Production.Application.csproj:13` relatív `ProjectReference` a
    `spaceos-modules-contracts`-ra — anti-minta a célarchitektúra MODARCH-05
    elvárásával szemben, jegyzett, nem javítva (nem e task hatásköre).
  - Inventory `consumerModule` allowlist
    (`Reservation.cs:50`, `IModuleRegistry`-validáció) — jó auth-minta
    cross-module hozzáférésre, referenciaként rögzítve.
  - Megismételve az ERPSEP-01 két fő pozitív állítása: nincs cross-ERP
    `ProjectReference` a `.csproj`-gráfban, nincs portál mélyimport a
    `modules/*` mappák között — mindkettő megerősítve.
- A hét „Döntendő szerződés" mindegyikére meghozva a platform-abstraction
  vs. modulcontract döntés (ADR-066 5. fejezet):
  - `SubjectRef`, `WorkItemRef`, `AssetRef`, `DocumentRef` → platform
    abstraction (utóbbi kettő egyetlen resolverrel: Maintenance, ill. DMS).
  - `OrderRef` és a külső actor `PartyRef` → az alak platform-szintű, de a
    resolver-modul (CRM) csak akkor válik ténylegessé, ha a CRM megépíti az
    Order/Quote/Customer aggregate-et — ez termék-döntés, amit a task
    Tiltott scope-ja (nincs domainrefaktor) miatt nem lehetett itt
    meghozni; **decision_required Gábornak**.
  - `ProjectRef` → a task saját Stop/eszkaláció szabálya szerint explicit
    **nem eldöntve**, nincs új tulajdonos kitalálva; a `PROJECT-CORE-ADR`
    eredményére várva.
- Elkészült a modulonkénti provider/consumer/event/API mátrix (ADR-066 6.
  fejezet, mind a 7 ERP-modulra, forrás-fájlhivatkozásokkal; ahol a
  bizonyíték nem volt teljes ebben a körben — EHS és DMS esemény-leltár —
  ez explicit jelölve, nem kitalálva).
- Elkészült a boundary-violation → migrációs irány lista (ADR-066 8.
  fejezet, 7 tétel, mindegyikhez konkrét irány).
- Elkészült a forbidden-dependency szabálylista automatizálható
  teszt-tervvel (ADR-066 11. fejezet, FD-1..FD-6) és a contract
  versioning/breaking-change policy (ugyanott).
- Az ADR Státusza **PROPOSED** maradt — a repó konvenciója szerint Gábor
  fogadja el saját maga az ADR-eket, és két pontban (`ProjectRef`,
  `OrderRef`/külső `PartyRef`) valódi, ebben a taskban nem eldönthető
  függőség/termék-döntés maradt nyitva — önelfogadás ezért módszertanilag
  helytelen lett volna.
- Alkalmazáskód, `EPICS.yaml`, `.codex/`, `AGENTS.md` és az ERPSEP-02
  task-fájl/ADR-067 nem módosult — kizárólag `ADR-066-erp-module-contract-
  boundaries.md` és ez a task-fájl (saját szakaszai) keletkezett/módosult.

## Átadási bizonyíték

- **ADR:** [`ADR-066-erp-module-contract-boundaries.md`](../../knowledge/adr/ADR-066-erp-module-contract-boundaries.md)
  — **Státusz: PROPOSED**.
- **Modulonkénti provider/consumer/event/API mátrix:** ADR-066 6. fejezet,
  7 sor (CRM, Kontrolling, HR, Maintenance, QA, EHS, DMS), mindegyik
  forrás-fájlhivatkozással.
- **Forbidden-dependency szabályok + automatizálható teszt-terv:** ADR-066
  11. fejezet, FD-1..FD-6 táblázat.
- **Contract versioning / breaking-change policy:** ADR-066 11. fejezet
  záró szakasza (OpenAPI semver + deprecation-window, event
  schemaVersion/nyílt-világ-fogyasztás, referenciatípusok additív-only
  bővítése).
- **Boundary violation → migrációs irány:** ADR-066 8. fejezet, 7 tétel,
  egyik sem maradt irány nélkül.
- **Kulcs-bizonyítékparancsok (lefuttatva):**
  - `rg "IProjectPortfolioSource"` — 13 fájl, a Kontrolling port + adapter
    azonosítva.
  - `rg "SubjectRef|OrderRef|WorkItemRef|AssetRef|DocumentRef|PartyRef|
    ProjectRef" src` — 0 találat (megerősíti, hogy egyik döntendő típus sem
    létezik még kódban, tisztán tervezési döntés).
  - `rg "AssetDowntimeEvent" src` — csak Production-oldali fájlok, 0 találat
    `src/maintenance/src`-ben (a 8.4 gap bizonyítéka).
  - `rg "OutboxMessage.Create|internal/inbox" src` — csak Kernel-teszt és
    -infrastruktúra fájlok, 0 ERP-modul-fogyasztó.
- **Reviewer verdict:** _Gábor tölti ki elfogadáskor._ Az ADR Státusza
  PROPOSED marad, amíg ez meg nem történik; az `EPICS.yaml` ERPSEP-03
  sorát a root terminál frissíti a felülvizsgálat után.
- **Nyitott függőségek/kérdések Gábornak (részletesen ADR-066 9. fejezet):**
  1. `ProjectRef` tulajdonosa — blokkolva a `PROJECT-CORE-ADR`-re.
  2. Épüljön-e Order/Quote/Customer aggregate a CRM-ben (ettől függ az
     `OrderRef` és a külső `PartyRef` tényleges resolver-modulja) — termék-
     döntés, nem architektúra-döntés.
  3. Legyen-e a Kernel Outbox a szabvány ERP cross-module csatorna, vagy
     maradjon Kernel-belső/iparági minta.
  4. `AssetDowntimeEvent` producer-hiánya (Maintenance oldalon) — jegyzett,
     javításra vár, nem blokkolja ezt az ADR-t.

