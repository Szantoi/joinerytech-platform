# EPIC-PROJECT-CORE-2026Q3 — Projects / FlowEpic / B2BHandshake döntési kapu

Ez az epic a JoineryTech stratégiai termékmagját készíti elő. Implementáció addig
nem indulhat, amíg az ownership és tenantközi biztonsági modell nincs elfogadott
ADR-ben.

## Kiosztható feladatok

| Task | Szerep | Státusz | Eredmény |
|---|---|---|---|
| [`PROJECT-BOUNDARY-AUDIT`](archive/PROJECT-BOUNDARY-AUDIT.md) | architect/backend | done | [`PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md`](../../knowledge/architecture/PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md) |
| [`PROJECT-CORE-ADR`](PROJECT-CORE-ADR.md) | architect/root | pending, kiadható | döntés a Projects ownershipról és a Collaboration bounded contextről |

## Nem implementálható még

- új `projects` adatbázis vagy host;
- FlowEpic/kernel módosítás;
- B2B tenantközi API;
- új Projects frontend a statikus oldal helyett.

Ezek implementációja csak az elfogadott ADR után indulhat. A részletes
kézfogás-megvalósítás feladatai már elő vannak készítve az
[`EPIC-B2B-COLLABORATION-2026Q3`](../EPIC-B2B-COLLABORATION-2026Q3/README.md)
alatt; a `B2B-01` elsőként az ADR pontos ownership-döntését fordítja normatív
domain contracttá.
