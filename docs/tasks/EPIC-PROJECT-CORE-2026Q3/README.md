# EPIC-PROJECT-CORE-2026Q3 — Projects / FlowEpic / B2BHandshake döntési kapu

Ez az epic a JoineryTech stratégiai termékmagját készíti elő. Implementáció addig
nem indulhat, amíg az ownership és tenantközi biztonsági modell nincs elfogadott
ADR-ben.

## Kiosztható feladatok

| Task | Szerep | Státusz | Eredmény |
|---|---|---|---|
| [`PROJECT-BOUNDARY-AUDIT`](PROJECT-BOUNDARY-AUDIT.md) | architect/backend | pending | ownership-, esemény- és adatforrás-térkép |
| [`PROJECT-CORE-ADR`](PROJECT-CORE-ADR.md) | architect/root | blocked az auditig | döntés a bounded contextről és B2B MVP-ről |

## Nem implementálható még

- új `projects` adatbázis vagy host;
- FlowEpic/kernel módosítás;
- B2B tenantközi API;
- új Projects frontend a statikus oldal helyett.

Ezekhez az elfogadott ADR után külön domain/API/FE taskok készülnek.

