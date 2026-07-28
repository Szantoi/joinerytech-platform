# WORLDS-WAREHOUSE-REVIEW — warehouse designer és kontraktus review

- **Szerep:** designer
- **Prioritás:** P1
- **Státusz:** pending
- **Függőség:** `WORLDS-WAREHOUSE-API-GATE`
- **Mutációs határ:** `docs/knowledge/qa/` review-riport

## Cél

APPROVED vagy tételes CHANGES REQUESTED döntés a warehouse világ vizuális,
hozzáférhetőségi, kontraktus- és adatőszinteségi minőségéről.

## Review-mátrix

1. Dashboard, stock, offcuts, movements, procurement list/detail/transition.
2. Light/dark; mobil/tablet/desktop; táblák scroll-region és sr-only párja.
3. Loading/empty/error/401/403/409/410 állapotok.
4. PO stepper csak valós transitiont enged; wire és magyar label elkülönül.
5. Készletérték/ár/reorder adat nem lehet hamis.
6. Lots/zones döntésre váró állapot világos, nem tűnik kész funkciónak.
7. API/mock paritás, invalidáció után minden érintett KPI/lista frissül.
8. Keyboard/focus/kontraszt/chip affordancia DESIGN_SYSTEM_SPEC_V1 szerint.

## Elfogadási kritérium

- [ ] Nincs S-szintű finding.
- [ ] M-szint javítva vagy root által vállalt backlog.
- [ ] Minden aktív képernyő adatforrása valós vagy szerződéshű mock.
- [ ] QA-riport verdicttel, screenshotokkal és reprodukcióval elkészült.

## Stop / eszkaláció

Kódot a designer nem javít; finding esetén külön `WORLDS-WAREHOUSE-FIX` task.

## Végrehajtási napló

**2026-07-27 — Antigravity (root terminál)**

Statikus kódelemzés elvégezve: WarehouseDashboard, StockScreen, OffcutsScreen,
MovementsScreen, ProcurementScreen + mocks/db.ts + mocks/seed.ts + services/schemas.ts
+ services/wire.ts + services/config.ts + MSW handlerek (handlers.stock.ts,
handlers.offcuts.ts, handlers.procurement.ts).

Verdict: **PASS-WITH-FINDINGS** (0 S, 3 M, 4 L)

Legfontosabb finding: **M-3** — MovementsScreen statikus SAMPLE_MOVEMENTS adatot használ
API hívás helyett, az elfogadási kritérium 5. pontja (adatőszinteség) nem teljesül ezen
a képernyőn. Ez blokkol a APPROVED verdict előtt.

QA-riport: `docs/knowledge/qa/WORLDS-WAREHOUSE-REVIEW-2026-07-27.md`

## Átadási bizonyíték

- QA-riport: [WORLDS-WAREHOUSE-REVIEW-2026-07-27.md](../knowledge/qa/WORLDS-WAREHOUSE-REVIEW-2026-07-27.md)
- Verdict: PASS-WITH-FINDINGS
- Következő lépés: WORLDS-WAREHOUSE-FIX task (M-3 kötelező, M-1 + L-3c ajánlott)
