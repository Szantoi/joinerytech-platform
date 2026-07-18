# WORLDS-PRODUCTION-REVIEW — production világ designer és őszinteségi kapu

- **Szerep:** designer
- **Prioritás:** P1
- **Státusz:** pending
- **Függőség:** `WORLDS-PRODUCTION-API-GATE`
- **Mutációs határ:** `docs/knowledge/qa/` review-riport; kódhoz nem nyúl

## Cél

APPROVED vagy tételes CHANGES REQUESTED döntés a production világra, a design
system, a11y, mobil/dark mód, valós API-kontraktus és gap-őszinteség alapján.

## Review-mátrix

1. Dashboard, plans, execution/machining, analytics, door-order nézet.
2. Light/dark; 360, 768 és desktop szélesség.
3. Loading, empty, error, stale/refetch, 401/403, 409, validation.
4. Keyboard út: tab order, fókuszcsapda, escape, visible focus, sr-only táblák.
5. FSM-gombok: csak valós backend transition; disabled reason érthető.
6. Adatőszinteség: progress/runtime/OEE/customer mező nem lehet kitalált.
7. API és mock mód vizuális/viselkedési paritása.
8. World accent, kontraszt és scroll-region a DESIGN_SYSTEM_SPEC_V1 szerint.

## Bizonyíték

- route-onként light/dark desktop + legalább egy mobil screenshot;
- billentyűzet/a11y rövid jegyzőkönyv;
- API-gate riport hivatkozása;
- findingok S/M/N prioritással, fájl és reprodukció megadásával.

## Elfogadási kritérium

- [ ] Nincs S-szintű finding.
- [ ] M-szintű finding javítva vagy root által elfogadott backlog.
- [ ] Minden képernyő valós/gap adatforrása azonosítható.
- [ ] Verdict és re-review feltétel a QA-riportban szerepel.

## Stop / eszkaláció

A designer nem javít kódot ebben a taskban; CHANGES REQUESTED esetén külön
`WORLDS-PRODUCTION-FIX` task készül.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

