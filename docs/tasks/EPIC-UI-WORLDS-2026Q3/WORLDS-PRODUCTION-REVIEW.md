# WORLDS-PRODUCTION-REVIEW — production világ designer és őszinteségi kapu

- **Szerep:** designer
- **Prioritás:** P1
- **Státusz:** done — verdikt: **CHANGES REQUESTED** (2026-07-24, root)
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

**2026-07-24 (root, designer szerep, ultracode workflow):** A task-mátrix teljes
lefedése három rétegben. (1) **Vizuális bizonyíték:** portál dev-szerver mock
módban (5199-es port, futás után leállítva), headless rendszer-Chrome
(playwright-core, repo-érintés nélkül scratchpadből): 36 screenshot (6 route ×
light/dark × 1440/768/360) + konzol/pageerror-, overflow-, tab-walk-probe-ok;
két célzott élő próba a lencsék által: fókuszcsapda-probe (SlideOver desktop vs
mobil) és toast-inert-probe. (2) **5 párhuzamos review-lencse** (design system,
a11y/billentyűzet, adatőszinteség, FSM-átmenetek, state-lefedettség) többagentes
workflow-ban, mindegyik kötelező PASS-összefoglalóval; **minden S/M finding
független adversarial verify-menetet kapott — 17/17 CONFIRMED**, három esetben
mechanika-korrekcióval (pl. M-3: az Indítás élesben már model-bindingnél 400,
a Lezárás viszont ÁTMENNE és hamis proofot rögzítene — a Null-policy stub miatt).
(3) **Root kód-szintű szúrópróbák** a kulcs-findingokra (S-1 useFocusTrap-
mechanizmus, M-1 halott linkek, M-2 backend MapResult 422 + 0 db Result.Conflict
producer, M-9 nyers m.kind) — mind megerősítve. Adatőszinteség-mag: a backend
submodule-forrás ellen is verifikálva (DoorOrderRepository `default` createdAt,
CalculateDoorOrderCommandHandler totalItemCount-szemantika).

**Eredmény:** 1 S (közös shell fókuszcsapda-holtpont — pre-existing, mind a 7
APPROVED világot érinti) + 15 egyedi M (12 production-modul, 3 közös
shell/kliens; két lencse-duplikátum összevonva) + 17 N follow-up. Verdikt:
**CHANGES REQUESTED**; a stop-klauzula szerint a javítás külön taskokban:
[`WORLDS-SHELL-FIX`](WORLDS-SHELL-FIX.md) (P0, S+3M, közös kód) és
[`WORLDS-PRODUCTION-FIX`](WORLDS-PRODUCTION-FIX.md) (P1, 12 M). Re-review
feltétel a riport zárszakaszában.

## Átadási bizonyíték

- **Riport:** [`docs/knowledge/qa/WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md`](../../knowledge/qa/WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md)
  — findingok S/M/N prioritással, fájl:sor + reprodukció + verify-indoklás;
  PASS-területek tételesen; billentyűzet-jegyzőkönyv; re-review feltétel.
- **Screenshotok:** `docs/knowledge/qa/assets/worlds-production-review-2026-07-24/`
  (16 kép: 6 route light+dark desktop, quotes mobil pár light+dark, dash mobil,
  tablet-túlcsordulás bizonyíték).
- **Tesztek:** production-scope vitest 80/80 zöld (modul + ProductionPage +
  dataMode); konzol-hiba a 36 probe-futásban: 0.
- **API-gate hivatkozás:** [`WORLDS-PRODUCTION-API-GATE`](archive/WORLDS-PRODUCTION-API-GATE.md)
  (élő 401-bizonyíték, api-módban MSW sosem indul — dataMode.test.ts 8/8).
- Portal-fájl nem módosult (read-only review; a working tree a review után is
  tiszta maradt).

