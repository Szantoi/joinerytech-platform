# EPIC-UI-WORLDS-2026Q3 — API-first production és warehouse

**Kontraktus-forrás:**
[`WORLDS_API_CONTRACTS_2026-07-18.md`](../../knowledge/architecture/WORLDS_API_CONTRACTS_2026-07-18.md)

A frontend nem találhat ki DTO-t, enumot, FSM-et vagy endpointot. Az MSW a valós
API tükre; a nem létező funkció disabled/gap állapotot kap.

## Backend előfeltételek

| Task | Modul | Prioritás | Feloldott blokkoló |
|---|---|---:|---|
| [`WORLDS-INV-OFFCUT-ROUTEFIX`](WORLDS-INV-OFFCUT-ROUTEFIX.md) | inventory | P0 | élő `/offcuts` 500 |
| [`WORLDS-PROC-BUILDFIX`](WORLDS-PROC-BUILDFIX.md) | procurement | P0 | hiányzó query + rossz inbound path |
| [`WORLDS-CUTTING-AUTHFIX`](WORLDS-CUTTING-AUTHFIX.md) | cutting | P0 | tenant query-param/policy gap |
| [`WORLDS-INV-READ-API`](WORLDS-INV-READ-API.md) | inventory | P1 | stock/movements/KPI read model |
| [`WORLDS-PROC-PO-FSM`](WORLDS-PROC-PO-FSM.md) | procurement | P1 | hiányzó PO átmenet-végpontok |

Az első három külön submodule-agenttel párhuzamosítható. A két P1 task csak saját
submodule-jában futhat; közös kontraktusdoksit csak a root frissít.

## Production lánc

1. [`WORLDS-PRODUCTION-FE`](WORLDS-PRODUCTION-FE.md)
2. [`WORLDS-PRODUCTION-API-GATE`](WORLDS-PRODUCTION-API-GATE.md)
3. [`WORLDS-PRODUCTION-REVIEW`](WORLDS-PRODUCTION-REVIEW.md)

## Warehouse lánc

1. backend P0+P1 előfeltételek
2. [`WORLDS-WAREHOUSE-FE`](WORLDS-WAREHOUSE-FE.md)
3. [`WORLDS-WAREHOUSE-API-GATE`](WORLDS-WAREHOUSE-API-GATE.md)
4. [`WORLDS-WAREHOUSE-REVIEW`](WORLDS-WAREHOUSE-REVIEW.md)

Lots/zones nem implementálható döntés nélkül:
[`WORLDS-LOTS-ZONES-DECISION`](WORLDS-LOTS-ZONES-DECISION.md).

## Portál-lock

`WORLDS-PRODUCTION-FE`, `WORLDS-PRODUCTION-API-GATE`,
`WORLDS-WAREHOUSE-FE` és `WORLDS-WAREHOUSE-API-GATE` ugyanazt a portált érinti,
ezért egymás után, egy frontend agenttel futnak.

