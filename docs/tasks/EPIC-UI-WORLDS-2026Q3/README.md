# EPIC-UI-WORLDS-2026Q3 — API-first production és warehouse

**Kontraktus-forrás:**
[`WORLDS_API_CONTRACTS_2026-07-18.md`](../../knowledge/architecture/WORLDS_API_CONTRACTS_2026-07-18.md)

A frontend nem találhat ki DTO-t, enumot, FSM-et vagy endpointot. Az MSW a valós
API tükre; a nem létező funkció disabled/gap állapotot kap.

## Backend előfeltételek

| Task | Modul | Prioritás | Feloldott blokkoló |
|---|---|---:|---|
| [`WORLDS-INV-OFFCUT-ROUTEFIX`](archive/WORLDS-INV-OFFCUT-ROUTEFIX.md) | inventory | P0 | ✅ done — élő `/offcuts` 500 |
| [`WORLDS-PROC-BUILDFIX`](archive/WORLDS-PROC-BUILDFIX.md) | procurement | P0 | ✅ done — hiányzó query + rossz inbound path |
| [`WORLDS-CUTTING-AUTHFIX`](archive/WORLDS-CUTTING-AUTHFIX.md) | cutting | P0 | ✅ done — tenant query-param/policy gap |
| [`WORLDS-INV-READ-API`](archive/WORLDS-INV-READ-API.md) | inventory | P1 | ✅ done — stock/movements/KPI read model |
| [`WORLDS-PROC-PO-FSM`](archive/WORLDS-PROC-PO-FSM.md) | procurement | P1 | ✅ done — hiányzó PO átmenet-végpontok |

Az első három külön submodule-agenttel párhuzamosítható. A két P1 task csak saját
submodule-jában futhat; közös kontraktusdoksit csak a root frissít.

## Production lánc

1. [`WORLDS-PRODUCTION-FE`](archive/WORLDS-PRODUCTION-FE.md) — ✅ done
2. [`WORLDS-PRODUCTION-API-GATE`](archive/WORLDS-PRODUCTION-API-GATE.md) — ✅ done
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

