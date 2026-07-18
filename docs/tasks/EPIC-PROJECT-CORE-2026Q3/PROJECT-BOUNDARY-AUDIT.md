# PROJECT-BOUNDARY-AUDIT — meglévő projekt/FlowEpic/B2B képességek ownership-auditja

- **Szerep:** architect/backend
- **Prioritás:** P0
- **Státusz:** pending
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

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő: vizsgált HEAD-ek, build/test állapot, output link._

