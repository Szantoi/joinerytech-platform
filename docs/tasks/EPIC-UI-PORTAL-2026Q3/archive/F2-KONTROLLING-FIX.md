# F2-KONTROLLING-FIX — F2-KONTROLLING review-javítások (S1–S2, M1–M3)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-15) · **Fázis:** F2
- **Kontraktus:** `docs/knowledge/qa/F2_KONTROLLING_DESIGN_REVIEW_2026-07-15.md` + `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md` §2.4, §3.3

## Feladat

Az F2-KONTROLLING-REVIEW két blokkoló (S1, S2) és a három kért, nem blokkoló
(M1–M3) findingjának javítása egy körben, + az N2 kozmetikai tétel.

## Kivitelezés / Eredmény

1. **S1** — `src/pages/controlling/ProjectDetailSlideOver.tsx`: a kategória-bontás
   tábla SAJÁT görgethető konténerbe került (spec 2.4; a `DataTable.tsx:114-119`
   recept): `role="region"` + `aria-label="Kategória-bontás"` + `tabIndex={0}` +
   `overflow-x-auto` + fókusz-ring. Mobil bottom sheeten így csak a tábla görög,
   a SlideOver többi tartalma (kulcsszámok, fedezet-sáv, korrekció-lista) nem
   csúszik el; desktopon (600 px panel) változatlan. Teszt: a
   `ControllingPage.test.tsx` SlideOver-esete mostantól a régiót asszertálja
   (role+name, `overflow-x-auto` osztály, `tabindex="0"`).
2. **S2** — `src/pages/controlling/PortfolioScreen.tsx` státusz-szűrő chipek a
   CRM-fix mintájára (`LeadsScreen.tsx:79-95`, spec §3.3): az aktív chip pipa-ikont
   (`aria-hidden`) + `font-semibold`-ot kap (nem csak szín-inverzió), és a 28 px-es
   pill `before:inset-x-0 before:-inset-y-2` pszeudóval 44 px-es függőleges
   touch-célfelületet — a vizuális méret változatlan. Teszt: a portfólió
   smoke-teszt az aktív chipen svg-ikont + `font-semibold`-ot, az inaktívon
   ikon-hiányt asszertál (`aria-pressed`-del címezve).
3. **M1** — `src/pages/controlling/AdjustmentsScreen.tsx`: a lista-szintű közös
   `useDeleteAdjustment` példány helyett soronkénti mutation-példány
   (`AdjustmentDeleteButton` komponens, az EHS `PpeScreen` / CRM `TaskRow`
   minta) — törlés közben már csak a kattintott sor kap „Törlés folyamatban…"
   disabledReason-t, nem az egész lista.
4. **M2** — `src/pages/controlling/DashboardScreen.tsx`: a kockázati KPI tónusa
   és felirata a configból számított (`AT_RISK_MARGIN_THRESHOLD`,
   `services/controlling/config.ts`) a hardcode-olt `< 0.15` + „a 15%-os küszöb
   alatt" fix szöveg helyett — küszöb-módosításnál a KPI nem szakad el az
   MSW-oldali besorolástól (QUALITY.md 3., config-vezéreltség). Teszt: a
   dashboard smoke-teszt a feliratot a configból képzett szöveggel asszertálja.
5. **M3** — `src/pages/controlling/MarginTrendChart.tsx`: a vékony sr-only
   összefoglaló (csak pontszám + utolsó hónap) helyett TELJES hozzáférhető
   adat-alternatíva a CRM `ForecastScreen` mintájára: sr-only `<table>`
   caption + `th scope="col"/"row"` szerkezettel, mind a 6 havi terv/tény
   fedezet-%-kal. Teszt: a smoke-teszt a caption-t asszertálja (bő timeouttal —
   a recharts lazy chunk importja jsdom alatt lassú).
6. **N2** — `src/mocks/worlds.ts:304`: a kontrolling világ-kártya badge
   „4 projekt" → „6 projekt" (a seed 6 projektet ad).

### Menet közbeni helyreállítás

A fix-kör közben a Claude Code folyamat újraindult; a félbemaradt M1-refaktor
(`AdjustmentDeleteButton` kiemelve, de az oszlop-render még a régi, definiálatlan
`deleteAdjustment`-re hivatkozott → 5 teszt bukott futásidejű ReferenceError-ral)
befejezve: az akció-oszlop a soronkénti komponenst rendereli. Emellett a
`ControllingPage.test.tsx` route-tesztjei a smoke-tesztekével azonos okból bő
(20 mp) timeoutot kaptak — teljes-suite párhuzamos terhelés alatt az 5 mp-es
alap-keret flaky volt (a 2026-07-15-i teljes futásban 1 timeout-bukást adott).

## Nem érintett

CRM-fájlok (`src/pages/crm`, `src/services/crm`, `src/mocks/crmApi` — párhuzamos
designer-review alatt zároltak), EHS-fájlok, HR-fájlok (párhuzamos F2-HR-FE),
adatréteg/calc/MSW mag (a review APPROVED — újra nem nyitottuk). Az N1
(trend-diagram dark-mód — tokenszintű dark-epic tétel a CRM N1-gyel közösen),
N3–N6 megjegyzések tracked backlog / opcionális UX-megfontolások, ebben a
körben nem készültek.

## Tesztek

- Célzott vitest: `src/services/controlling` + `src/pages/controlling` +
  `ControllingPage.test.tsx` — **5 fájl / 35 teszt zöld** (a review-kori 35
  megtartva, benne az S1/S2/M2/M3 új asszertjeivel bővített esetek).
- Teljes suite a fixek után: `npx vitest run` → **1231 passed / 20 failed
  (1251)** — **Kontrolling-bukás nulla**; a 20 a dokumentált pre-existing
  családok (BOMPreviewCard, configurator/wizard, catalogFilterPersistence,
  ProcurementPage + App-procurement, WorkOrderSummary): a 19-es baseline + az
  F2-CRM-FE-ben már jegyzett flaky configurator-eset.
- `npm run build` (tsc -b + vite) ✅ — Kontrolling chunk 27,03 kB raw / 7,05 kB
  gzip, `MarginTrendChart` külön chunk 2,12 kB (az M3-táblázattal együtt sem
  nőtt érdemben) · eslint a módosított fájlokra tiszta.

## Re-review

Designer mailboxba jelzendő: S1+S2 célzott re-review (mobil bottom sheet
görgetés + chip-affordanciák) — az adatréteg/calc/MSW mag újranyitása nélkül.
