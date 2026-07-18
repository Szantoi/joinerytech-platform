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

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._
