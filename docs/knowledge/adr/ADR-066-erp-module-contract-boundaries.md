# ADR-066: ERP-modulok közötti kontraktus- és semleges-referencia határok

- **Státusz:** PROPOSED — döntésre vár (Gábor). Nem önelfogadva: (a) egy pontja
  (`ProjectRef`) explicit blokkolva van a még le nem zárt `PROJECT-CORE-ADR`-re
  (lásd Stop/eszkaláció, ez a task saját szabálya), (b) két másik pontja
  (`OrderRef`, `PartyRef` külső-actor ága) olyan hiányzó aggregate-ekre mutat,
  amiket ez a task (read-only ADR-munka) nem építhet meg — ezekhez Gábornak
  termék-döntést kell hoznia, nem csak architektúra-jóváhagyást.
- **Dátum:** 2026-07-21
- **Szerep:** architect/backend · **Epic:** EPIC-ERP-SEPARATION-2026Q3 · **Task:** ERPSEP-03
- **Függőség:** ERPSEP-01 (`ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md`, elfogadva bemenetként)
- **Kapcsolódó, még nyitott munka:** `PROJECT-BOUNDARY-AUDIT` →
  `PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md` (a Project/FlowEpic ownership
  kérdése — ez az ADR **nem** dönt helyette, lásd 6. és 9. fejezet)
- **Kapcsolódó, már elfogadott ADR:** ADR-065 (Kernel core domain-mentessége —
  a Kernel „csak saját kódja van" és „nincs benne domain tudás" elve közvetlenül
  meghatározza, hova **nem** kerülhetnek az itt döntött referenciatípusok — lásd
  4. fejezet)
- **Mutációs határ ebben a taskban:** ez az ADR + a benne található
  provider/consumer/event/API mátrix és dependency-test terv. **Alkalmazáskód
  nem módosult** — minden alábbi fájlhivatkozás olvasott, nem írt bizonyíték.

---

## 1. Cél és üzleti eredmény

A hét ERP-modul (CRM, Kontrolling, HR, Maintenance, QA, EHS, DMS) úgy legyen
használható más iparágban, hogy nem importál JoineryTech-entitást és nem ír
más modul adatbázisába. Ehhez egységes port-, referencia- és
integration-event szabály kell — ez az ADR ezt a szabályt mondja ki, a
`SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md` §5 (Bounded context és
integrációs szabályok) normatív váz-javaslatát a jelenlegi kódbázis
bizonyítékaival szembesítve és lezárva, ahol a bizonyíték elég.

---

## 2. Módszer és bemenetek

- Kötelező bemenet: `ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md` (ERPSEP-01)
  és `PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md` (PROJECT-BOUNDARY-AUDIT) —
  mindkettő elolvasva, idézve, nem duplikálva.
- Célarchitektúra: `SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md` §4–5
  (rétegmodell, source-of-truth szabály, semleges referenciák, tiltott
  modulkapcsolat-minták).
- Kiegészítő kódvizsgálat ebben a taskban (mind olvasott, egyetlen fájl sem
  módosult):
  - `IProjectPortfolioSource` port és `ConfiguredProjectPortfolioSource`
    adapter (`src/spaceos-modules/spaceos-modules-kontrolling/src/Application
    |Infrastructure/Portfolio/`) — a meglévő jó portminta, ahogy a task kérte.
  - DMS `EntityLink`/`EntityType`/`DocLinkType`
    (`src/dms/src/Domain/{ValueObjects,Enums}/`) — a legközelebbi, ma is
    létező `SubjectRef`-szerű minta.
  - QA `Inspection` aggregate (`src/qa/src/Domain/Aggregates/Inspection.cs`) —
    ad-hoc `Guid? OrderId`/`Guid? ProductId`/`Guid InspectorId` mezők.
  - CRM `Opportunity` aggregate
    (`src/SpaceOS.Modules.CRM/src/Lead.Domain/Aggregates/Opportunity.cs`) —
    ad-hoc `Guid? OrderId`/`Guid? QuoteId`/`Guid CustomerId` mezők; **nincs
    Order/Quote/Customer aggregate a kanonikus CRM-ben** (megerősítve: `rg
    "class Order|class Quote|class Customer"` a `Lead.Domain/Aggregates`
    mappában nulla találat).
  - Maintenance `Asset` aggregate + `AssetId` strong id
    (`src/maintenance/src/Domain/{Aggregates/Asset.cs,StrongIds/AssetId.cs}`) —
    valódi, tesztelt source of truth.
  - HR `Employee` aggregate + `EmployeeId` strong id
    (`src/hr/src/Domain/{Aggregates/Employee.cs,StrongIds/EmployeeId.cs}`) —
    a belső „actor" (dolgozó) egyetlen valódi tulajdonosa.
  - Kernel Outbox/cross-module dispatch (`src/spaceos-kernel/SpaceOS.Kernel.
    Domain/Outbox/`, `SpaceOS.Kernel.Domain/Entities/ModuleSubscription.cs`,
    `SpaceOS.Infrastructure/Outbox/CrossModuleOutboxDispatcher.cs`) — egy
    valódi, hostolt, HMAC-aláírt, retry-s outbox→HTTP-inbox minta.
  - `spaceos-modules-contracts` fogyasztása (`Production.Application.csproj`,
    `Production.Application/EventHandlers/AssetDowntimeEventHandler.cs`,
    `Production.Tests/Integration/CrossModule/
    Maintenance_AssetDowntime_ImpactsProduction.cs`) — élő, de félig vezetékelt
    cross-module esemény-kontraktus.
  - Inventory `consumerModule` allowlist
    (`src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Domain/
    Aggregates/Reservation.cs`) — a legjobb meglévő minta erőforrás-szintű
    cross-module hozzáférés-ellenőrzésre.
  - Portál mélyimport-ellenőrzés (`src/joinerytech-portal/src/modules/*`) —
    megismételve, nulla találat (megerősítve az ERPSEP-01 eredményét).

---

## 3. Bizonyíték-összefoglaló — mi van ma a kódban

### 3.1 Jó minta: `IProjectPortfolioSource`

A Kontrolling port (`src/spaceos-modules/spaceos-modules-kontrolling/src/
Application/Portfolio/IProjectPortfolioSource.cs`) pontosan a célarchitektúra
5.3 „explicit application port és adapter" mintáját követi: a modul **nem**
birtokolja a projektet, csak egy read-modellt (`ControllingProjectData`) vár
egy portól, és a fejlesztői/demo host egy **tudatosan config-seedelt, üres
production-adapterrel** (`ConfiguredProjectPortfolioSource`) tölti ki — a
hiányzó valós integráció nyíltan dokumentált a kódkommentben
(„ARCHITECTURAL SEAM"), nem egy hazug placeholderrel elfedve. **Ez az ADR ezt
a mintát ajánlja követendőnek minden hasonló cross-module olvasáshoz.**

### 3.2 Már létező, de hiányos `SubjectRef`-szerű minta: DMS `EntityLink`

`src/dms/src/Domain/ValueObjects/EntityLink.cs`:

```csharp
public record EntityLink
{
    public EntityLinkId Id { get; init; }
    public EntityType EntityType { get; init; }
    public Guid EntityId { get; init; }
    public UserId LinkedByUserId { get; init; }
    public DateTime LinkedAt { get; init; }
}
```

Ez **strukturálisan** majdnem a `SubjectRef(moduleId, aggregateType,
aggregateId)` alak — de két ponton eltér:

1. `EntityType` egy **zárt C# enum** a DMS domain rétegben
   (`src/dms/src/Domain/Enums/EntityType.cs`):
   `Order, Project, Asset, Employee, WorkOrder, Ticket, Lead, Opportunity,
   Supplier, PurchaseOrder` — azaz a **DMS domainje ma explicit ismeri más
   modulok aggregate-neveit** egy zárt felsorolásban. Ez nem namespace-szintű
   csatolás (nincs `using SpaceOS.Modules.CRM...`), de pontosan az a
   probléma, amit ADR-065 a `FlowEpicScope`-ban orvosolt: egy zárt enum,
   aminek bővítéséhez (pl. egy nyolcadik ERP-modul bevezetésekor) a DMS
   domain kódját kellene módosítani.
2. `EntityLink` a doc-comment szerint „Phase-2 linking model — kept on the
   aggregate, not yet persisted" (`Document.cs:27-29`,
   `DocumentEntityTypeConfiguration.cs:85`: `builder.Ignore(d =>
   d.EntityLinks)`) — tehát ma **nincs éles adat mögötte**.

Emellett a DMS-nek van egy **másik, éles és perzisztált** kapcsolódó mezője:
`DocLinkType`/`LinkId`/`LinkLabel` a `Document` aggregate-en
(`Document.cs:46-48`) — ez egy **denormalizált, portál-kijelzési célú**
egyetlen link (`Project/Order/Catalog/Template/Customer/None`), külön
szándékkal a fenti `EntityLink`-listától (lásd `DocLinkType.cs`
doc-comment: „this is the portal-facing single display link; the rich
EntityLink list on the aggregate remains the Phase-2 linking model").

**Következtetés:** a DMS már ma bizonyítja, hogy egy generikus,
típus-diszkriminátoros cross-module pointer igénye valós — csak a jelenlegi
megvalósítás (zárt enum, nem perzisztált) nem a végleges alak.

### 3.3 Ad-hoc, típusjelző nélküli Guid-referenciák (a probléma, amit az ADR orvosol)

- **QA `Inspection`** (`src/qa/src/Domain/Aggregates/Inspection.cs:28-32`):
  `Guid? OrderId`, `Guid? ProductId`, `Guid InspectorId` — nincs
  típusdiszkriminátor, nincs modul-jelzés, csak nyers Guid. `InspectorId`
  feltehetően egy HR `Employee`-re mutat, de ezt semmi nem rögzíti kódban.
- **CRM `Opportunity`** (`Opportunity.cs:34-38`): `Guid? OrderId` („If won,
  references the resulting Order"), `Guid? QuoteId` („If converted to Quote,
  references it"), `Guid CustomerId`. **Sem `Order`, sem `Quote`, sem
  `Customer` aggregate nem létezik a kanonikus CRM-ben** — ezek ma
  **forward-referenciák egy meg nem épített fogalomra**. Ez konkrét
  bizonyíték arra, hogy a JoineryTech Sziget CLAUDE.md-jében dokumentált CRM
  felelősség („Lead → Opportunity → Quote → Order pipeline") csak a
  Lead/Opportunity szakaszig van kódolva.
- **Kontrolling `ControllingProjectData.Customer`**
  (`IProjectPortfolioSource.cs:66`): a `Customer` egy **string**, nem is
  Guid — tehát a Kontrolling oldalán a „ki az ügyfél" kérdésnek **még
  típus-szintű azonosítója sincs**.

**Következtetés:** a `PartyRef` (külső szereplő: ügyfél/beszállító/partner)
és az `OrderRef` referenciatípusoknak **ma nincs kódolt tulajdonos-modulja** —
ez nem csak egy hiányzó kontraktus, hanem egy hiányzó aggregate. Lásd 6.5 és
6.6.

### 3.4 Kernel-szintű, hostolt outbox/inbox — de csak Kernel-belső

`src/spaceos-kernel/SpaceOS.Kernel.Domain/Outbox/OutboxMessage.cs` +
`SpaceOS.Kernel.Domain/Entities/ModuleSubscription.cs` +
`SpaceOS.Infrastructure/Outbox/CrossModuleOutboxDispatcher.cs`: egy **valódi,
migrált, tesztelt** (`OutboxMessageTests`, `CrossModuleOutboxDispatcherTests`,
`ModuleSubscriptionTests`, `OutboxBackgroundWorkerTests`) push-alapú
mechanizmus — `OutboxMessage` (típus + JSON payload + batch/aggregate
metaadat) → `ModuleSubscription` (előfizető modul neve + eseménytípus + HTTP
inbox-endpoint) → `CrossModuleOutboxDispatcher` HMAC-SHA256-aláírt HTTP POST,
3 próbálkozás exponenciális backoff-fal.

**Ez pontosan a célarchitektúra 5.3 „integration event + outbox/inbox"
mintája, éles kóddal.** De: teljes szövegkeresés (`OutboxMessage.Create` és
`internal/inbox` mintákra) a `src/` teljes fáján **nulla találatot ad bármely
ERP-modulban** — a mechanizmust ma **senki nem használja a 7 ERP-modul
közül**. Egyetlen fogyasztási bizonyíték a Kernel saját tesztjeiben van.

### 3.5 Félig vezetékelt cross-module esemény: `AssetDowntimeEvent`

`SpaceOS.Modules.Contracts.Maintenance.Events.AssetDowntimeEvent` (a
`spaceos-modules-contracts` submodule-ban, ami ebben a munkafában **nincs
checkoutolva** — csak a fogyasztó oldali `ProjectReference`-en és a
tesztfájlon keresztül rekonstruálható):

- **Fogyasztó, éles:** `Production.Application/EventHandlers/
  AssetDowntimeEventHandler.cs` — `INotificationHandler<AssetDowntimeEvent>`
  (MediatR, **in-process**), szünetelteti/újraütemezi az érintett
  `ProductionJob`-okat. Tesztelve:
  `Production.Tests/Integration/CrossModule/
  Maintenance_AssetDowntime_ImpactsProduction.cs` (3 teszteset).
- **Termelő oldal, hiányzó:** `src/maintenance/src` teljes szövegkeresése
  `AssetDowntime`-ra **nulla találatot ad**. A Maintenance modul **sehol nem
  publikál** `AssetDowntimeEvent`-et — sem a Kernel Outboxon, sem MediatR
  `Publish`-on, sem HTTP-n keresztül. A teszt a handlert **kézzel
  konstruált** eseménnyel hívja, nem egy valós Maintenance-workflow-n
  keresztül.

**Következtetés:** ez egy **élő, de csak félig megépített** cross-module
kontraktus — a fogyasztó és a DTO megvan, a termelő oldal nincs. Ez
pontosan az a helyzet, amit a `SubjectRef`/`AssetRef`-minta hivatott
megelőzni jövőre nézve (lásd 8.4).

### 3.6 `spaceos-modules-contracts` csomagolási anti-minta

`Production.Application.csproj:13`:
```xml
<ProjectReference Include="../../spaceos-modules-contracts/SpaceOS.Modules.Contracts/SpaceOS.Modules.Contracts.csproj" />
```
Ez **relatív, repo-szintű `ProjectReference`**, nem NuGet-csomag — pontosan
az, amit a célarchitektúra MODARCH-05 elfogadási kritériuma tilt („egy modul
nem igényel repo-szintű relatív `ProjectReference`-et a fogyasztó
instance-ban"). Ma ezt csak a Production és két **orphan** modul
(spaceos-modules-crm, spaceos-modules-dms — retire-jelöltek az ERPSEP-01
audit szerint) használja; egyik kanonikus ERP-modul sem. **Ez nem ennek a
tasknak a hatásköre kijavítani** (ERPSEP-05/csomagolás), de az ADR itt rögzíti
a jövőbeli ERP-fogyasztás elvárt formáját (lásd 8. fejezet).

### 3.7 Jó auth-minta cross-module hozzáférésre: Inventory `consumerModule`

`src/spaceos-modules-inventory/.../Aggregates/Reservation.cs:50`: a
`consumerModule` paramétert a hívó `IModuleRegistry`-n keresztül validálja
(„Allowed consumer module name (caller validates via IModuleRegistry —
I-12)"). Ez egy **explicit allowlist**-minta erőforrás-szintű cross-module
hozzáférésre — bár az iparági rétegben él, ugyanez a minta alkalmazható
lenne az ERP-oldali `AssetRef`/`DocumentRef` feloldás jogosultság-
ellenőrzésére is (lásd 8.5).

### 3.8 Tenant/B2B határ — cross-tenant feloldás ma szerkezetileg lehetetlen

A `PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md` 6. fejezete bizonyítja: a
Kernel `B2BHandshake` ma **csak egyirányú delegáció-jelzés** — nincs
accept/reject/revoke, nincs allowlist, és a guest tenant **technikailag nem
tudja lekérdezni** a neki delegált `FlowEpic`-et, mert mind az EF
`HasQueryFilter`, mind a Postgres RLS policy kizárólag a tulajdonos
`TenantId`-ra szűr (`AppDbContext.cs:159-160`, `init-query-rls.sql:9-14`).
**Ez közvetlen bizonyíték arra, hogy ma semmilyen ERP-modul nem építhetne
biztonságos cross-tenant referencia-feloldást** — a Kernel-szintű
előfeltétel (működő B2B-lifecycle) hiányzik. Lásd 7. fejezet.

---

## 4. Hova kerülnek a semleges referenciatípusok? (csomaghely-döntés)

A célarchitektúra 5.2 hét „javasolt alapformát" sorol fel; ez az ADR nem
csak a döntést mondja ki (platform vs. modulcontract), hanem azt is, **hol
él a típusdefiníció**.

**Döntés:** egy új, kicsi, **kizárólag DTO-szerű, viselkedés nélküli**
megosztott csomag jön létre (munkanév: `SpaceOS.Modules.Erp.References`),
amit a 7 ERP-modul mindegyike **NuGet-csomagként** (nem relatív
`ProjectReference`-ként, lásd 3.6) fogyaszthat. Ez a csomag **nem a Kernelben
él**, és **nem egyetlen ERP-modulban**.

**Indoklás, miért nem a Kernel:**

Gábor ADR-065-ös döntése explicit és szűk: „nem lehet függőség a kernel core
részében, csak saját kód" — ez nem stílus-preferencia, hanem a
FSM-mag/projektkezelés érinthetetlenségének védelme. Egy minden ERP-modul
által importált shared csomag bevezetése a Kernelbe **új, minden
ERP-modulra kiterjedő függőségi élt** hozna létre pont abba a rétegbe, amit
Gábor eddig szándékosan függőség-mentesen tartott. A célarchitektúra 4.1 is
csak feltételesen enged Kernelbe emelendő „általános projekt- és
B2B-delegációs primitíveket" — **„ha az ownership-audit ezt igazolja"**. A
`PROJECT_CORE_BOUNDARY_AUDIT` (6-7. fejezet) ezt kifejezetten **nem**
igazolja a `ProjectRef`-re (nyitott ownership), így ez a feltétel ma nem
teljesül egyik itt tárgyalt típusra sem. **A kernel-core érinthetetlenségét
ez az ADR sem javasolja megbontani** — ez összhangban van a MEMORY.md
rögzített szabályával is (kernel-módosítás csak Gábor explicit
jóváhagyásával, ADR-065-höz hasonlóan).

**Indoklás, miért nem egyetlen ERP-modul:** a típusok
(`SubjectRef`/`WorkItemRef`/`AssetRef`/`DocumentRef`/`PartyRef`) definíció
szerint **több modul által egyszerre használt** pointer-alakok — egyiket sem
lehet egy adott modul tulajdonaként kezelni anélkül, hogy a többi modul arra
a modulra ne kapjon implicit függőséget.

**Mi NEM kerül ebbe a csomagba:** üzleti entitás, FSM, validációs szabály,
bármilyen viselkedés. Az elfogadási kritérium („Nincs közös „Common.Domain"
üzleti entitásjavaslat") itt explicit teljesül: a csomag tartalma kizárólag
`readonly record struct`/`sealed record` pointer-alakok, publikus mezőkkel,
metódus nélkül — strukturálisan ugyanaz a minta, mint az ADR-065-ben már
elfogadott `FlowEpicScope` value object (nem enum, nem entitás, csak egy
becsomagolt azonosító-készlet).

---

## 5. Döntés — a hét semleges referenciatípus

| # | Típus | Forma | Döntés | Resolver-modul(ok) | Jelenlegi állapot |
|---|---|---|---|---|---|
| 1 | `SubjectRef` | `(moduleId: string, aggregateType: string, aggregateId: Guid)` | **platform abstraction** | generikus — mindig a `moduleId` szerinti modul publikus kontraktusa oldja fel | DMS `EntityLink`/`EntityType` a legközelebbi, de zárt enumos, nem perzisztált előd (3.2) |
| 2 | `WorkItemRef` | `(moduleId: string, workItemType: string, workItemId: Guid)` | **platform abstraction** | generikus — QA Ticket, Maintenance WorkOrder, Production Job stb. | nincs ma kódolt megfelelője; a legközelebbi rokon a Kernel `FlowTask.EpicKernelId` (UUID-only ref minta, de más szinten — lásd PROJECT_CORE audit 8. fejezet) |
| 3 | `AssetRef` | `(assetId: Guid)` | **platform abstraction**, egyetlen resolver | **Maintenance** (`Asset`/`AssetId`, éles, migrált, tesztelt) | Production már fogyaszt hasonló nyers `Guid assetId`-t (`AssetDowntimeEvent.AssetId`), de a Maintenance-oldali termelő hiányzik (3.5) — migrációs irány: 8.4 |
| 4 | `DocumentRef` | `(documentId: Guid)` | **platform abstraction**, egyetlen resolver | **DMS** (`Document`/`DocumentId`, éles) | ma más modul nem tart `DocumentRef`-et; a DMS saját `EntityLink` a fordított irányt (Document → más entitás) modellezi, ez nem ütközik |
| 5 | `OrderRef` | `(orderId: Guid)` | **platform abstraction (alak)**, de a resolver-modul **még nem létezik kódban** | **CRM lenne a kijelölt tulajdonos** (a platform CLAUDE.md szerint a CRM felelőssége „Lead → Opportunity → Quote → Order"), **de Order/Quote aggregate ma nincs megépítve** a kanonikus CRM-ben | QA `Inspection.OrderId`, CRM `Opportunity.OrderId`/`QuoteId` ma nyers, típusjelző nélküli Guid, forward-referencia egy meg nem épített fogalomra (3.3) — **decision_required Gábornak, termék-döntés, nem építhető meg ebben a taskban** |
| 6 | `PartyRef` | `(partyId: Guid, partyKind: "Internal" \| "External")` | **kettéválik** — belső actor: **platform abstraction**, egyetlen resolver = **HR**; külső actor (ügyfél/beszállító/partner): **decision_required**, nincs owner | belső: HR (`Employee`/`EmployeeId`, éles); külső: **nincs kódolt tulajdonos** — CRM `CustomerId` és Kontrolling `Customer` (string!) csak ad-hoc, nem aggregate-alapú mezők | QA `Inspection.InspectorId` (feltehetően HR Employee, de nincs rögzítve), CRM `CustomerId`, Kontrolling `ControllingProjectData.Customer` (string) mind ad-hoc |
| 7 | `ProjectRef` | `(projectId: Guid)` | **decision_required — blokkolva**, nem hozunk létre owner-t | **nyitott** — Kernel `FlowEpic` vs `FlowManagement.FlowProject` vs Production `ProductionJob` vs Doorstar `Project` — négy párhuzamos modell (PROJECT_CORE audit 0., 3., 4. fejezet) | Kontrolling `IProjectPortfolioSource` már ma **feltételezi** egy jövőbeli `ProjectRef`-et (`ControllingProjectData.ProjectId`), de a mögötte lévő tulajdonos nincs lezárva |

### 5.1 Miért `platform abstraction` az 1–4. típus

`SubjectRef` és `WorkItemRef` definíció szerint generikusak — nincs egyetlen
modul, ami „a" subjectet vagy „a" work itemet birtokolná, a `moduleId` mező
pont ezt a nyitottságot kódolja. `AssetRef` és `DocumentRef` egy-egy
**egyértelműen bizonyított, egyetlen tulajdonos modult** kapnak (Maintenance,
illetve DMS) — a típus maga mégis platform-szintű, mert több modul (QA
inspection, Kontrolling cost line, DMS link) egyszerre hivatkozhat rájuk, és
egyiküknek sem szabad a Maintenance/DMS domain-modelljét importálnia ehhez.

### 5.2 Miért `decision_required` az 5–6. típus (részben) és a 7. típus (teljesen)

- **`OrderRef` és `PartyRef` (külső actor):** ez az ADR **nem dönt** arról,
  hogy a CRM építsen-e Order/Quote/Customer aggregate-et — ez domainrefaktor
  és üzleti/termék-döntés, a task „Tiltott scope"-ja (domainrefaktor, DB-
  migráció, új endpoint) kifejezetten kizárja. Amit ez az ADR **kimond**: ha
  és amikor ezek az aggregate-ek megépülnek, a tulajdonos **CRM** legyen (nem
  QA, nem Kontrolling, nem egy új „Common" modul), és a referenciák formája
  a fenti `OrderRef`/`PartyRef` alak legyen, nem egy újabb nyers Guid-mező.
  Ezt Gábornak kell jóváhagynia, mert termék-irányt (épüljön-e Order/Quote a
  CRM-ben) érint, nem csak architektúrát.
- **`ProjectRef`:** ez a task saját „Stop / eszkaláció" szabálya szerint
  explicit tilos itt eldönteni — a `PROJECT-CORE-ADR` eredményére várunk.
  Ez az ADR csak azt rögzíti, hogy **amikor** a `PROJECT-CORE-ADR` lezárja az
  ownershipet, a `ProjectRef` alak (és feltehetően platform-abstraction
  minősítése) illeszkedni fog ehhez a döntéshez — de **nem hoz létre új
  `ProjectRef`-tulajdonost saját hatáskörben**.

---

## 6. Provider/Consumer/Event/API mátrix modulonként

> Az alábbi mátrix a ténylegesen ellenőrzött kódra épül. Ahol a bizonyíték
> ebben a körben nem volt teljes (EHS esemény-leltár, DMS esemény-leltár), az
> explicit jelölve van — ezek nem blokkolják az ADR-döntést, de follow-up
> auditot igényelnek (javasolt: ERPSEP-05/06 vagy egy célzott
> esemény-leltár task).

| Modul | Source of truth (aggregate) | Kiadott referencia | Elfogyasztott referencia (ma, ad-hoc) | Publikált domain event (in-process, MediatR) | Cross-module event (outbox/kontraktus) | API-mechanizmus |
|---|---|---|---|---|---|---|
| **CRM** | `Lead`, `Opportunity` | `SubjectRef`(crm, Opportunity, id) — jövőbeli; `OrderRef`/`PartyRef` **csak ha megépül** Order/Quote/Customer | — | 13 esemény (`OpportunityEvents.cs`: Created, NeedsAssessment, SolutionAssembly, ProposalSent, Negotiation, Won, Lost, Abandoned, EstimateUpdated, Reassigned, ActivityLogged, TaskCreated, TaskCompleted) | nincs (a `SpaceOS.Modules.Contracts`-ot csak az orphan CRM használja, a kanonikus nem) | OpenAPI (`Lead.Api`) |
| **Kontrolling** | `CostAdjustment`, `ProjectCostCalculation` | — (tiszta olvasó modul) | `ProjectRef` a `IProjectPortfolioSource` porton át (config-adapter, production-ben szándékosan üres) | nem ellenőrzött ebben a körben (nem tartozott a kötelező vizsgálathoz) | nincs | REST (Kontrolling host) + belső port/adapter |
| **HR** | `Employee`, `Absence` | `PartyRef`(Internal, EmployeeId) — a belső actor **egyetlen** valódi tulajdonosa | — | 13 esemény (Employee: Created/Deactivated/Reactivated/PersonalDataUpdated/SkillAdded/SkillUpdated/SkillRemoved; Absence: Requested/Approved/Rejected/Started/Completed/Reopened) | nincs | OpenAPI (`HR.Api`) |
| **Maintenance** | `Asset`, `WorkOrder` | `AssetRef`(assetId) — **egyetlen** valódi tulajdonos | — | Asset: Created/Retired/Reactivated/LinkedToMachine/LinkedToVehicle/OperatingHoursRecorded; WorkOrder: Started/Reported; **`AssetDowntimeEvent` a Contracts-csomagban deklarálva, de a Maintenance oldalán NINCS publisher** (3.5 — gap) | tervezett, de nem vezetékelt (`AssetDowntimeEvent` → Production) | OpenAPI (`AssetEndpoints`, `WorkOrderEndpoints`) |
| **QA** | `Inspection`, `Ticket`, `QACheckpoint` | `WorkItemRef`(qa, Ticket, id) — jövőbeli | ad-hoc nyers `OrderId`/`ProductId`/`InspectorId` (3.3 — migrálandó `OrderRef`/`SubjectRef`/`PartyRef`-re) | Inspection: Planned/Started/Completed/Failed/CompletedConditionally (ADR-063 rework-hurok in-process) | nincs | OpenAPI (QA host) |
| **EHS** | incident/hazard/risk/PPE (ERPSEP-01 capability-mátrix 10. sor) | nem ellenőrzött ebben a körben | nem ellenőrzött ebben a körben | nem ellenőrzött ebben a körben — friss Hosting-migráció (`HostingTenantContextAdapter.cs`) | nincs ismert | OpenAPI (EHS host) |
| **DMS** | `Document` (verziólánc), `Folder`, `Tag`, `DocumentCategory` | `DocumentRef`(documentId) — **egyetlen** valódi tulajdonos | `EntityLink`(EntityType, EntityId) — Phase-2, nem perzisztált (3.2); `DocLinkType`/`LinkId` — éles, denormalizált, portál-célú | nem azonosított ebben a körben (a `Document` aggregate domain eventjei nem kerültek célzott átvizsgálásra — follow-up) | nincs | OpenAPI (DMS host) |

---

## 7. Cross-tenant / B2B referencia-feloldás

**Elv (a célarchitektúra 5.2-ből átvéve és megerősítve):** *„A referencia nem
ad felhatalmazást. Minden feloldásnál az aktív tenantot és a felhasználó
permissionjeit a célmodul ellenőrzi."*

**Jelenlegi állapot (3.8 alapján, a `PROJECT_CORE_BOUNDARY_AUDIT` bizonyítja):**
a Kernel `B2BHandshake` ma kizárólag delegáció-jelzés, nincs accept/reject/
revoke, nincs allowlist, és a guest tenant **szerkezetileg nem tudja
lekérdezni** a neki delegált aggregate-et (RLS + EF query filter egyaránt a
tulajdonos tenantra szűkít).

**Következmény erre az ADR-re nézve:** amíg a Kernel B2B-lifecycle nincs
lezárva (ez a `PROJECT-CORE-ADR`/egy jövőbeli Kernel-munkakör hatásköre, nem
ezé a taské), **egyetlen ERP-modul sem építhet saját, ad-hoc cross-tenant
referencia-feloldást** a fent döntött típusokra (`SubjectRef` stb.). A
`SubjectRef`/`AssetRef`/`DocumentRef` **tenant-scope-olt** — a resolver-modul
mindig a hívó tenantjára szűkíti a saját `HasQueryFilter`/RLS-ét, és
cross-tenant esetben explicit 403/404-et ad, amíg nincs valódi B2B-
jogosultsági réteg. Az Inventory `consumerModule` allowlist-mintája
(3.7) alkalmazható analógiaként arra, hogyan validálható majd egy jövőbeli
cross-tenant `AssetRef`/`DocumentRef` feloldás — de ez a bővítés **azután**
jön, hogy a Kernel B2BHandshake lifecycle-je elkészül.

---

## 8. Boundary violation → migrációs irány (minden jelenlegi eset kap irányt)

| # | Violation | Bizonyíték | Migrációs irány |
|---|---|---|---|
| 8.1 | QA `Inspection.OrderId`/`ProductId` nyers Guid | `Inspection.cs:28-29` | Amint az `SpaceOS.Modules.Erp.References` csomag létrejön (4. fejezet), cserélje `OrderRef`/`SubjectRef`-re; addig marad dokumentált ad-hoc mező, de **nem bővíthető** hasonló új nyers Guid mezővel |
| 8.2 | CRM `Opportunity.OrderId`/`QuoteId`/`CustomerId`, nincs mögöttük aggregate | `Opportunity.cs:34-38`, nulla találat `class Order\|Quote\|Customer`-re | **Termék-döntés Gábornak**: épüljön-e Order/Quote/Customer a CRM-ben; ha igen, a mezők `OrderRef`/`PartyRef`-re cserélődnek az aggregate-tel együtt (külön, jövőbeli, nem read-only task) |
| 8.3 | DMS `EntityType` zárt enum + nem perzisztált `EntityLink` | `EntityType.cs`, `Document.cs:27-29` | Ha a Phase-2 linking model perzisztálásra kerül, cserélje nyílt string `aggregateType`-ra (`SubjectRef` alak) — ne bővítse tovább a zárt enumot |
| 8.4 | `AssetDowntimeEvent`: Production fogyaszt, Maintenance nem publikál | 3.5 | Vagy Maintenance megépíti a valódi publisher-t (Kernel Outbox vagy a Contracts-csomag eseményén át), vagy — amíg nincs producer — a handler/teszt jelölve marad „aspirational, not wired" státusszal a kódban, hogy ne tűnjön kész integrációnak |
| 8.5 | `spaceos-modules-contracts` relatív `ProjectReference` (Production) | `Production.Application.csproj:13` | NuGet-csomagosítás — **ERPSEP-05 hatásköre**, itt csak jegyzett, hogy az ERP-modulok jövőbeli `SpaceOS.Modules.Erp.References` fogyasztása **ne** ismételje meg ezt a relatív-ProjectReference mintát |
| 8.6 | Kernel Outbox/CrossModuleOutboxDispatcher ma egyetlen ERP-modul által sem használt | 3.4 | **decision_required** (nem ez az ADR dönti el): legyen-e ez a szabvány csatorna a 7 ERP-modul közötti eseményekhez, vagy maradjon Kernel-belső/iparági minta; javasolt következő lépés: egy kis proof-of-concept egyetlen eseménnyel (pl. az `AssetDowntimeEvent` tényleges vezetékelése ezen a csatornán) mielőtt szabvánnyá nyilvánítanánk |
| 8.7 | 4 orphan modul-duplikátum ugyanazzal a DB-schema-névvel | ERPSEP-01 7.1–7.4, 7.9 | Már jegyzett, nem ismétlem — retire-jelölt, külön, tisztán mutáló taskban |

---

## 9. Nyitott kérdések / függőségek Gábornak (nem eldöntve itt)

1. **`ProjectRef` tulajdonosa** — blokkolva a `PROJECT-CORE-ADR`-re, ahogy a
   task saját Stop-szabálya előírja. Amint az lezárul, ez az ADR egy rövid
   kiegészítést kap, ami a `ProjectRef` platform/modulcontract minősítését a
   döntéshez igazítja.
2. **Épüljön-e Order/Quote/Customer aggregate a CRM-ben?** Ha igen, a CRM
   lesz az `OrderRef` és a külső `PartyRef` kizárólagos tulajdonosa — ez
   termék-döntés, nem architektúra-döntés, ezért nem hozható meg ebben a
   read-only ADR-taskban.
3. **A Kernel Outbox legyen-e a szabvány ERP cross-module csatorna?** (8.6)
   — jelenleg egyetlen ERP-modul sem fogyasztja; érdemes lenne egy kis
   bizonyító lépés (pl. az `AssetDowntimeEvent` valós vezetékelése) előtte.
4. **`AssetDowntimeEvent` producer-hiánya (8.4)** — jegyzett, javításra vár;
   nem blokkolja ezt az ADR-t, de félrevezető, hogy egy tesztelt handler és
   integrációs teszt létezik anélkül, hogy bárhol valódi esemény
   keletkezne.

---

## 10. Elfogadási kritériumok — önellenőrzés

- [x] **Nincs közös „Common.Domain" üzleti entitásjavaslat.** A javasolt
  `SpaceOS.Modules.Erp.References` csomag kizárólag viselkedés nélküli
  pointer-alakokat tartalmaz (4. fejezet) — nincs benne FSM, validáció vagy
  üzleti szabály.
- [x] **Modulonként ismert a source of truth és az engedélyezett consumer
  projection.** Lásd 6. fejezet mátrixa; ahol nem volt teljes a bizonyíték
  (EHS, DMS esemény-leltár), explicit jelölve, nem kitalálva.
- [x] **Cross-tenant feloldás explicit B2B authorizationt követel.** Lásd 7.
  fejezet — a jelenlegi állapot (nincs B2B lifecycle) miatt ma **semmilyen**
  cross-tenant feloldás nem engedélyezett egyik típusra sem, amíg a Kernel
  B2B-réteg el nem készül.
- [x] **OpenAPI, integration event és in-process port szerepe egyértelmű.**
  Lásd 6. fejezet (API-mechanizmus oszlop) és 3.1/3.4 (port- és
  outbox-minta).
- [x] **Minden jelenlegi boundary violation kap migrációs irányt.** Lásd 8.
  fejezet, 7 tétel.

---

## 11. Végrehajtási napló

_Az agent tölti ki._

Az ADR-t egy önálló agent készítette (2026-07-21), read-only kódvizsgálattal:

1. Elolvasta a kötelező bemeneteket: `ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md`
   (ERPSEP-01), `PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md`
   (PROJECT-BOUNDARY-AUDIT), `SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`
   §4–5, és a már elfogadott `ADR-065-kernel-scope-absztrakcio.md` (mert a
   Kernel domain-mentesség elve közvetlenül meghatározza, hova NEM kerülhet
   a javasolt referencia-csomag).
2. Ellenőrizte az ADR-számozást (`docs/knowledge/adr/*.md` listázva) —
   ADR-065 foglalt (Kernel scope), ADR-066 szabad és pontosan a task saját
   kötelező kimenete, ADR-067 (ERPSEP-02, párhuzamos agent) érintetlenül
   hagyva.
3. Elvégezte a kötelező vizsgálatot: `IProjectPortfolioSource` (jó portminta),
   DMS `EntityLink`/`EntityType`/`DocLinkType` (SubjectRef-előd), QA
   `Inspection` és CRM `Opportunity` ad-hoc Guid-referenciái, Maintenance
   `Asset`/HR `Employee` mint valódi tulajdonos-aggregate-ek, Kernel
   Outbox/ModuleSubscription/CrossModuleOutboxDispatcher (valódi, de nem
   ERP-fogyasztott outbox/inbox-minta), a Production→Maintenance
   `AssetDowntimeEvent` félig vezetékelt kontraktusa (fogyasztó van,
   termelő nincs), a `spaceos-modules-contracts` relatív ProjectReference
   anti-mintája, és az Inventory `consumerModule` allowlist-mintája.
   Megerősítette (ismételt grep) az ERPSEP-01 két fő pozitív állítását:
   nincs cross-ERP `ProjectReference` a `.csproj`-gráfban, nincs portál
   mélyimport a `modules/*` mappák között.
4. A hét „Döntendő szerződés" mindegyikére meghozta a platform-abstraction
   vs. modulcontract döntést (5. fejezet), és ahol a döntés valódi
   előfeltétel hiányában (hiányzó aggregate, nyitott Project-ownership)
   nem hozható meg felelősen, **explicit `decision_required`-ként jelölte**,
   nem talált ki tulajdonost — a task Stop/eszkaláció szabályát követve a
   `ProjectRef`-re, és a task Tiltott scope-ját (nincs domainrefaktor)
   követve az `OrderRef`/külső `PartyRef`-re.
5. Elkészítette a modulonkénti provider/consumer/event/API mátrixot (6.),
   a boundary-violation → migrációs irány listát (8., mind a 7 talált eset
   kap irányt), és a dependency-test tervet (lásd külön, alább).
6. A Státuszt **PROPOSED**-on hagyta: a task konvenciója szerint Gábor
   fogadja el az ADR-eket saját maga; ez az ADR emellett két, ebben a
   taskban nem eldönthető nyitott kérdést is tartalmaz (9. fejezet), ezért
   önelfogadás módszertanilag is helytelen lenne.
7. Alkalmazáskód nem módosult ebben a taskban — kizárólag ez az ADR-fájl és
   a saját task-fájl (`ERPSEP-03-CROSS-MODULE-CONTRACT-ADR.md`) „Végrehajtási
   napló"/„Átadási bizonyíték" szakasza íródott.

### Forbidden-dependency szabályok (összegyűjtve) és automatizálható teszt-terv

| # | Szabály | Bizonyíték/precedens | Automatizálási javaslat |
|---|---|---|---|
| FD-1 | Egyik ERP-modul `.csproj`-ja sem hivatkozhat egy másik ERP-modul `.csproj`-jára (`ProjectReference`) | ERPSEP-01: ma 0 találat | CI-lépés: minden `src/**/*.csproj` `ProjectReference`-gráf felépítése (script: XML-parse + edge-lista), assert hogy a 7 ERP-modul halmaza között (`CRM, Kontrolling, HR, Maintenance, QA, EHS, DMS`) nincs él egyik irányban sem; a Kernel/Hosting/az új `Erp.References` csomag felé mutató él engedélyezett |
| FD-2 | Egyik ERP-modul sem hivatkozhat relatív `ProjectReference`-szel egy megosztott kontraktus-csomagra — csak NuGet `PackageReference`-szel | `Production.Application.csproj:13` anti-minta (3.6/8.5) | CI-lépés: minden ERP-modul `.csproj` `ItemGroup`-jában tiltott a `../` mintájú `ProjectReference` a saját modulmappán kívülre (kivéve Kernel/Hosting explicit allowlist) |
| FD-3 | Portál modulmappák (`src/joinerytech-portal/src/modules/<m>`) nem importálhatnak egymásból | ERPSEP-01 + ez az ADR: 0 találat mindkét körben | ESLint szabály bevezetése (`no-restricted-imports`/`import/no-relative-packages` mintával `modules/<m>` mappánként) — ma csak manuális `rg`-audit van, nincs kikényszerítő lint-szabály |
| FD-4 | Minden ERP-modul EF Core `DbContext`-je pontosan a saját `HasDefaultSchema`-ját használja, más modul táblájába nem ír | ERPSEP-01 3.3 (schema-lista) | CI-lépés: design-time `dotnet ef migrations script` kimenetének grep-elése, hogy egy modul migrációja csak a saját schema-előtaggal rendelkező táblákat érinti |
| FD-5 | Cross-module aggregate-referencia csak a döntött típusokon (`SubjectRef` stb.) keresztül, nyers `Guid <MásikModul>Id` mezőként nem | 3.3 (QA/CRM ad-hoc mezők) | Kódstílus-szintű: egyelőre csak code-review checklist item, mert egy általános Roslyn-analyzer túl sok álpozitívot adna (a modulon belüli, legitim Guid-mezőket is megjelölné); célzott follow-up: egy `NetArchTest`-alapú architektúra-teszt a `Erp.References` csomag bevezetése után, ami a Domain-projektek publikus property-it az ismert idegen-modul-nevekre (Order, Customer, Asset stb.) mintaillesztéssel szűri és csak `SubjectRef`/`AssetRef`/stb. típusú property-t enged át |
| FD-6 | Cross-tenant referencia-feloldás mindig explicit B2B-jogosultságot követel, sosem csak tenant-vak Guid-lookupot | PROJECT_CORE audit 6. fejezet (guest tenant ma 404-et kap) | Integrációs teszt-terv (a B2B-lifecycle elkészülte után): minden `SubjectRef`/`AssetRef`/`DocumentRef` resolver endpointra kötelező egy „guest tenant idegen erőforrást kér" negatív teszteset, ami explicit 403-at vár (nem 404-et — a különbség jelzi, hogy a jogosultsági réteg, nem a lekérdezés hiánya tiltja) |

### Contract versioning és breaking-change policy

- **OpenAPI (HTTP-kontraktus):** a célarchitektúra 5.4 szerint OpenAPI 3.1 a
  source of truth. Semver: additív mező/endpoint-bővítés **minor**,
  eltávolítás/átnevezés/típusváltozás **major** + kötelező deprecation-
  window (min. 1 platform-release, dokumentált a `module.yaml`-hoz hasonló
  manifestben, amint az ERPSEP-05/MODARCH-05 bevezeti). A contract/
  compatibility teszt (a `CONTRACT_FIRST_DEVELOPMENT.md` mintája szerint) CI-
  kapu: a generált klienskód (Orval) build-je piros, ha a spec
  visszafelé-inkompatibilisen változott bump nélkül.
- **Integration event (`SubjectRef` alapú, outbox/inbox csatorna):**
  eseménytípus-névbe kódolt vagy külön `schemaVersion` mezős verziózás (a
  meglévő `OutboxMessage.EventType`/`Type` mezők már ma is támogatják ezt).
  Fogyasztó oldalon **nyílt világ feltételezés**: ismeretlen, additív mező
  nem okozhat hibát (a JSON-deszerializálás legyen elnéző ismeretlen
  kulcsokkal). Mező eltávolítása/átnevezése/szemantika-változása **mindig**
  új típusnév vagy explicit major verzió — nem in-place módosítás a régi
  típuson.
- **A referenciatípusok maguk (`SubjectRef` stb.):** mivel ezek pusztán
  azonosító-hordozók (nincs bennük üzleti mező), a bővítésük is csak additív
  lehet (pl. egy opcionális `correlationId` hozzáadása) — a három kötelező
  mező (`moduleId`/`aggregateType`/`aggregateId` és megfelelőik) **soha nem
  változik**, ez a stabil mag, amit minden 7 modul + jövőbeli industry pack
  ismerhet Kernel-módosítás nélkül.
- **Deprecation-ablak:** minimum egy teljes platform-release-ciklus
  (jelenleg ~kéthetes-havi kadenciájú release-ek alapján becsülve a
  CLAUDE.md release-történetéből) — a régi és új kontraktus párhuzamosan
  publikált ez alatt, dupla teszt-lefedettséggel.

## 12. Átadási bizonyíték

_ADR, dependency-mátrix és reviewer verdict._

- **ADR:** `docs/knowledge/adr/ADR-066-erp-module-contract-boundaries.md`
  (ez a fájl), **Státusz: PROPOSED** — Gábor jóváhagyására vár; 2 nyitott
  függőség explicit jelölve (9. fejezet: `ProjectRef` ↔ `PROJECT-CORE-ADR`,
  `OrderRef`/külső `PartyRef` ↔ CRM Order/Quote/Customer termék-döntés).
- **Modulonkénti provider/consumer/event/API mátrix:** 6. fejezet, 7 sor (a
  7 ERP-modulra), forrás-fájlhivatkozásokkal minden sorban.
- **Forbidden-dependency szabályok + automatizálható teszt-terv:** 11.
  fejezet táblázata, 6 szabály (FD-1..FD-6), mindegyikhez konkrét
  CI/lint/teszt-javaslat.
- **Contract versioning / breaking-change policy:** 11. fejezet záró
  szakasza.
- **Boundary violation → migrációs irány:** 8. fejezet, 7 tétel, egyik sem
  maradt irány nélkül (az elfogadási kritérium szerint).
- **Reviewer verdict:** _Gábor tölti ki elfogadáskor._ Amíg nincs kitöltve,
  a Státusz PROPOSED marad, és az EPICS.yaml-beli ERPSEP-03 sor státuszát a
  root terminál frissíti a felülvizsgálat után (ezt az agent explicit nem
  módosította, a feladat-instrukció szerint).
