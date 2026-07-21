# B2B-06 — Project, Procurement, CRM, DMS és QA adapterek

- **Szerep:** backend/architect
- **Prioritás:** P0
- **Státusz:** blocked
- **Függőség:** `B2B-01 = done`, `B2B-03 = done`, `B2B-04 = done`,
  `ERPSEP-03 = done` és ADR-066 `Accepted`
- **Kimenet:** adapter ownership map és tesztelt minimum adapterek

## Cél

A kézfogást a meglévő üzleti modulokhoz úgy kapcsolni, hogy a Collaboration
maradjon a megállapodás és cross-company work protocol tulajdonosa, miközben
egyik modul üzleti truth source-a sem duplikálódik.

## Kötelező adapterdöntések

| Modul | Kötelező döntés |
|---|---|
| Project/FlowEpic | melyik ref/event indít work package-et és hogyan projektálódik vissza a státusz |
| Procurement | `SubcontractOrder` commercial/source szerepe; átfedő state-ek adapt/retire mappingje |
| CRM | Opportunity/partner kapcsolatból indítás; jelenlegi holt delegáció integrálása vagy törlése |
| DMS | terms/deliverable/proof document ref és participant hozzáférés |
| QA | inspection/acceptance evidence ref, completiontől külön QA truth source |
| Kontrolling | csak projection/ref; költség nem kerül a Collaboration aggregate-be |

## Végrehajtási sorrend

1. Read-only impact audit és ownership tábla.
2. Port/event contractok a semleges reference package-ben.
3. Első vertical slice: Project/FlowEpic + DMS/proof.
4. Procurement adapter és legacy state mapping.
5. CRM/QA/Kontrolling adapterek vagy explicit későbbi taskok.
6. Contract/integration teszt, majd dead code kivezetési terv.

## Mutációs határ

Csak a B2B-01 contractban felsorolt publikus adapter/port fái és az érintett modul
saját application/infrastructure adaptere. Másik modul táblája, belső namespace-e
vagy közvetlen EF navigation tiltott. Portal a B2B-08.

## Elfogadási kritériumok

- [ ] Ownership mátrix minden megosztott mezőhöz egy source of truthot nevez.
- [ ] Nincs cross-module DB FK vagy közvetlen táblaírás.
- [ ] Semleges reference feloldása tenant/participant authz-vel történik.
- [ ] Project/FlowEpic és DMS/proof end-to-end adapterteszt zöld.
- [ ] `SubcontractOrder` átfedő lifecycle-jára explicit migrációs verdict van.
- [ ] CRM holt delegációja integrálva vagy deprecation taskkal lefedve.
- [ ] Adapterhiba retry/idempotency és megfigyelhetőség szerint viselkedik.
- [ ] Contract package/event verzió és compatibility range dokumentált.

## Validáció

- module architecture/dependency test;
- consumer-driven contract teszt minden megvalósított adapterhez;
- tenant mismatch, missing target és revoked grant negatív teszt;
- legacy mapping dry-run reprezentatív fixture-rel;
- érintett modulok regressziója.

## Stop / eszkaláció

Ha a `ProjectRef`, `PartyRef` vagy `OrderRef` ownership nincs Accepted ADR-ben,
az érintett adapter nem implementálható feltételezett DTO-val. Ha a Procurement
adatvesztés nélkül nem migrálható, külön dual-read/backfill terv szükséges.

## Végrehajtási napló

_Kitöltendő: ownership map, adapterek, legacy mapping, tesztek._

## Átadási bizonyíték

_Kitöltendő: contract version/hash, module test verdict, deprecation taskok._

