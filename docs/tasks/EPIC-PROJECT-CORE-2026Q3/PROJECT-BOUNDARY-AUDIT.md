# PROJECT-BOUNDARY-AUDIT — meglévő projekt/FlowEpic/B2B képességek ownership-auditja

- **Szerep:** architect/backend
- **Prioritás:** P0
- **Státusz:** done
- **Függőség:** nincs
- **Mutációs határ:** új architecture dokumentum és ez a task; minden kód read-only
- **Tiltott scope:** új project modul, migráció, endpoint, kernel-refaktor, portal

## Cél

Bizonyíték-alapúan meghatározni, mi létezik már a Kernelben és modulokban a
Program→Project→Milestone→FlowEpic→Task, StageChain és B2BHandshake modellből,
hol van duplikáció, és pontosan melyik hiányt kell a JoineryTech rétegnek
birtokolnia.

## Kötelező források

- `docs/joinerytech/uploads/PROJECT_MANAGEMENT_MODEL-frontend-designes-v3.md`
- `src/spaceos-kernel/SpaceOS.Modules.FlowManagement/`
- `src/spaceos-kernel/SpaceOS.Kernel.Domain/Entities/FlowEpic.cs`
- `src/spaceos-kernel/SpaceOS.Kernel.Domain/ValueObjects/B2BHandshake.cs`
- `src/spaceos-kernel/SpaceOS.Kernel.Domain/Entities/StageChainTemplate.cs`
- Kernel FlowEpic/Handshake/StageRegistry endpointok, application handler-ek,
  persistence konfigurációk és tesztek
- `src/spaceos-modules/spaceos-modules-kontrolling/.../IProjectPortfolioSource.cs`
- `ConfiguredProjectPortfolioSource.cs`
- `src/joinerytech-portal/src/pages/ProjectsPage.tsx`
- CRM `OpportunityDelegatedToPartnerEvent`

## Vizsgálati kérdések

1. Mi a különbség a `SpaceOS.Modules.FlowManagement.FlowProject/FlowTask` és a
   Kernel `FlowEpic` modell között? Melyik aktív, hostolt és perzisztált?
2. Hol él a Program/Project/Milestone hierarchy API-ja, és tenant/RLS szempontból
   mennyire production-ready?
3. A `B2BHandshake` csak delegációs value object, vagy teljes invite/accept/
   reject/revoke lifecycle? Hol van allowlist és actor jogosultság?
4. A StageChain tenant-config és a FlowEpic FSM kapcsolata egyértelmű-e?
5. Melyik modul birtokolja a sales/order, cost, document, production és QA
   referenciákat? Hol van jelenlegi UUID/port boundary?
6. A Kontrolling `IProjectPortfolioSource` milyen minimális projekciót vár, és
   kiváltható-e Kernel/FlowManagement adapterrel?
7. A portál statikus Projects oldala mely adatot talál ki, és mely meglévő
   endpointból tölthető valóban?

## Kötelező kimenet

`docs/knowledge/architecture/PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md`, benne:

- capability mátrix: design intent vs meglévő domain/application/API/DB/test;
- aggregate/ownership térkép;
- duplikáció és konfliktuslista;
- tenant/B2B threat boundary;
- event/port térkép a modulkapcsolatokhoz;
- `reuse`, `adapt`, `extend`, `new` döntés minden képességre;
- konkrét gap-lista fájl- és endpoint-hivatkozásokkal;
- 2–3 architekturális opció és ajánlás;
- az ADR eldöntendő kérdései.

## Módszer

1. Route- és persistence-leltár `rg`/forrás alapján; dokumentumállítást önmagában
   ne fogadj el.
2. Tesztleltár: mely invariant bizonyított, mely csak komment.
3. Egy happy path és egy cross-tenant delegation path szekvenciadiagram.
4. Minden „hiányzik” állításhoz ellenőrizd a kernel második projektmodelljét is.
5. Ne minősíts implementációt production-readynak build/test bizonyíték nélkül.

## Elfogadási kritériumok

- [ ] Mindkét meglévő projektmodell és a Kernel FlowEpic/B2B réteg feltérképezett.
- [ ] Nincs új moduljavaslat meglévő képesség vizsgálata nélkül.
- [ ] Ownership és source-of-truth minden fő entitásra egyértelmű.
- [ ] Threat boundary lefedi host/guest tenantot, allowlistet és actor view-t.
- [ ] Az ADR szerzője a dokumentumból további kódaudit nélkül döntést készíthet.

## Stop / eszkaláció

Ha a két kernel projektmodell közül egyik státusza sem bizonyítható, jelöld
`decision_required`; ne válassz név vagy dokumentum alapján.

## Végrehajtási napló

- 2026-07-18, architect (ROOT terminál): teljes read-only ownership-audit elkészült.
  Elolvasva a kötelező forrásokon felül: `SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`
  (célarchitektúra, MODARCH-02 kontextus) és `PROJECT_STATE_ASSESSMENT_2026-07-18.md`
  (P2-ajánlás előzménye).
- Forráskód-leltár: `SpaceOS.Kernel.Domain.Entities.FlowEpic` (teljes CQRS, migrált,
  RLS-védett) vs `SpaceOS.Modules.FlowManagement` (`FlowProgram/FlowProject/FlowMilestone/
  FlowTask`, POCO-k, **nincs Postgres-migráció, nincs API**) — bizonyítva, hogy a
  `ModulesDbContext`-re a production ág (`Program.cs`) soha nem hív `MigrateAsync`-et,
  és nincs `ModulesDbContextModelSnapshot.cs` a repóban.
- B2BHandshake: bizonyítva, hogy csak delegáció-VO (`FlowEpic.DelegateTo`), nincs
  accept/reject/revoke, nincs allowlist, és a guest tenant az EF query filter +
  Postgres RLS policy miatt **nem tudja lekérdezni** a neki delegált epicet — ez a
  design-intent kétirányú láthatósági elvének közvetlen ellentmond.
- Talált, korábban nem dokumentált lelet: `FlowEpicScope` enum (`DoorOrder`,
  `CuttingPlan`, `MicroAssembly`) iparág-specifikus értékeket tartalmaz a Kernel
  Domain rétegben — ez sérti a célarchitektúra tiltott-függőség szabályát.
- Talált, holt kód: CRM `Opportunity.DelegateToPartner` / `OpportunityDelegatedToPartnerEvent`
  — nincs hívó, nincs Kernel-integráció, harmadik párhuzamos "delegáció" fogalom.
- Kontrolling `IProjectPortfolioSource`/`ConfiguredProjectPortfolioSource` mint jó
  semleges port-minta megerősítve; a valós projekt-adatforrás (customer, contract
  value, cost lines) ma egyik vizsgált modellben sem létezik.
- Portál `ProjectsPage.tsx` (`ProjectsWorldPage`) mezőnkénti leltár: 100% mock,
  0% API-ból tölthető ma.
- Build/teszt-bizonyíték futtatva (lásd lent) — a domain/application réteg
  lefordul és a szűrt unit tesztek zöldek, de ez nem bizonyít API-integrációt,
  Postgres-migrációt vagy cross-tenant viselkedést.
- Kimenet: `docs/knowledge/architecture/PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md`
  (capability mátrix, ownership-térkép, duplikáció-lista, threat boundary két
  szekvenciadiagrammal, event/port térkép, reuse/adapt/extend/new döntési tábla,
  11 konkrét gap fájlhivatkozással, 3 architekturális opció + P2 ajánlás, 8 ADR-kérdés).
- Egyik kernel projektmodell státusza sem maradt bizonyíthatatlan — mindkettőt
  forrásból (kód, migráció, DI-regisztráció, teszt) igazoltam, ezért `decision_required`
  jelölést csak részkérdésekre (pl. `FlowTasks` tábla production-létezése,
  `WorkflowPhase` vs design-doc FSM egyeztetése) alkalmaztam, nem a teljes
  modellválasztásra.

## Átadási bizonyíték

- **Vizsgált HEAD-ek:** `src/spaceos-kernel` @ `c1f6dd63f786ed76f8ad07d7fa228cc6f4f37c07`
  (detached HEAD, tiszta munkafa); `src/spaceos-modules/spaceos-modules-kontrolling`,
  `src/spaceos-modules/spaceos-modules-crm`, `src/joinerytech-portal` — a platform
  gitlinkjei szerinti pin, csak olvasva, nem módosítva.
- **Build/teszt-parancs (spaceos-kernel gyökérből):**
  `dotnet test SpaceOS.Kernel.Tests/SpaceOS.Kernel.Tests.csproj --filter
  "FullyQualifiedName~FlowEpic|FullyQualifiedName~FlowProject|FullyQualifiedName~FlowTask|
  FullyQualifiedName~FlowMilestone|FullyQualifiedName~FlowProgram|FullyQualifiedName~DelegateFlowEpic"
  --no-restore`
  → **build zöld, 971/971 PASS, 0 FAIL, ~3,7 s**.
- **Output:** [`docs/knowledge/architecture/PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md`](../../knowledge/architecture/PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md)
- **Mutáció:** kizárólag ez a task-fájl és a fenti kimeneti dokumentum jött létre/módosult;
  alkalmazáskód, migráció, endpoint, `EPICS.yaml` nem változott. Commit nem történt
  (a root commitol).

