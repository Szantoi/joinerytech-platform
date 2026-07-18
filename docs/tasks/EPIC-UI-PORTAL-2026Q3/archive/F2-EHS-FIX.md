# F2-EHS-FIX — F2-EHS review-javítások (S1, S2, M1, N1–N3)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F2
- **Kontraktus:** `docs/knowledge/qa/F2_EHS_DESIGN_REVIEW_2026-07-14.md` + `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md` §3.2

## Feladat
Az F2-EHS-REVIEW két blokkoló (S1, S2) és a kért, nem blokkoló (M1) findingjának
javítása, plus az N1–N3 apróságok az S1/S2 körrel egyben.

## Kivitelezés / Eredmény

1. **S1** — `src/pages/ehs/EhsDashboard.tsx`: a két Card-fejléc és a listasorok nyers
   stone/rose osztályai token-osztályokra cserélve — `text-stone-800` → `text-ink`,
   `border-stone-100` → `border-line`, `divide-stone-50` → `divide-line`,
   `hover:bg-stone-50/60` → `hover:bg-surface-2`; az `Összes →` / `Mátrix →` linkek
   rose dark-párt kaptak (`dark:text-rose-300 dark:hover:text-rose-200`). Dark módban
   a fejlécek olvashatók, a linkek AA fölött.
2. **S2** — `src/components/EHS/IncidentReportFAB.tsx`: a FAB a spec 3.2 szerint
   mobilon a bottom nav FÖLÉ került (`bottom-[calc(58px+env(safe-area-inset-bottom)+16px)] right-4`,
   a ChatBubble F1-es nav-offset mintája), desktopon nem renderel (`md:hidden` — ott a
   lista-fejléc primary buttonja a helye), színe `bg-world hover:bg-world-hover text-world-fg`
   (EHS világ-akcent) a danger-tónusú `bg-rose-600` helyett. Az accessible name
   (`aria-label="Baleset bejelentése"`) változatlan.
3. **M1** — unified-CAPA invalidálás-keresztkötések:
   - `src/services/ehs/capa.ts` (`useCompleteCapa.onSettled`): a `capas` + `walk` mellett
     az `incidents` (lista) és `incident` (detail) prefixet is invalidálja — a CapaBoardról
     teljesített esemény-CAPA után a nyitott esemény-SlideOver is frissül;
   - `src/services/ehs/incidents.ts` (`useIncidentTransition.onSettled`): az `incidents`
     mellett az `incident` (egyes számú detail — 409-rollback után is újraszinkronizál
     a szerverrel) és a `capas` prefixet is invalidálja (`addCorrectiveAction` új CAPA-t szül);
   - `src/services/ehs/README.md`: új szabály rögzítve („FSM-mutáció minden érintett
     domain-kulcsot invalidál", a detail kulcs nem a lista-prefix alatt él).
4. **N1** — EhsDashboard „Nyitott CAPA" KPI: `onScreen('walks')` → `onScreen('actions')`
   (a legacy `actions` út pont az egységes CAPA-fület nyitja a WalksScreenben).
5. **N2** — betöltés-jelző: nem-interaktív span `aria-label` helyett
   `role="status"` + sr-only „betöltés" szöveg (SR-megbízható).
6. **N3** — `IncidentsScreen.tsx`: `hover:border-rose-200` dark párt kapott
   (`dark:hover:border-rose-900`).

## Nem érintett
CRM-fájlok (párhuzamos fejlesztés alatt), teljes build/teszt-suite — csak célzott
futtatás. A review 8. pontjának tracked backlog tételei (wizard EN szövegek,
RisksScreen statikus mock, HR-névtár) külön taskok.

## Tesztek
Célzott vitest: `src/services/ehs` + `src/pages/ehs` + `EhsPage.test.tsx` +
`src/components/EHS` — **8 fájl / 64 teszt zöld**; `statusTones.test.ts` 26/26 zöld.
`npx tsc -b --noEmit` tiszta, eslint az 5 módosított fájlra tiszta.

## Re-review
Designer mailboxba jelzendő: az S1/S2 fix vizuális ellenőrzése (dark mód + mobil nézet)
után az EHS sor a repo-gyökér `CLAUDE.md`-ben ✅ APPROVED-ra váltható.
