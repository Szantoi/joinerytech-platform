# ERPSEP-03 — ERP cross-module kontraktus és semleges referencia ADR

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** architect/backend
- **Prioritás:** P0
- **Státusz:** blocked
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

_Az agent tölti ki._

## Átadási bizonyíték

_ADR, dependency-mátrix és reviewer verdict._

