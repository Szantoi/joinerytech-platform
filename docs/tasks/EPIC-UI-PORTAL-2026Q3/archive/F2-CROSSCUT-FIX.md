# F2-CROSSCUT-FIX — Három nyitott review-tétel zárása a DMS-review előtt

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-16) · **Fázis:** F2 (mini-task)
- **Alap:** main@f135f69 · **Forrás:** QA-review M1, HR-review M1, Maintenance-review M1

## 1. QUERYGATE-PROMOTE (QA-review M1)

- `src/pages/ehs/QueryGate.tsx` → **`src/components/ui/QueryGate.tsx`** (git mv, viselkedés változatlan; a belső `Button` import `./Button`-ra igazítva), export a `components/ui/index.ts` barrelből.
- **35 importáló fájl átírva** (7 modul: controlling 6, crm 6, dms 3, ehs 5, hr 6, maintenance 5, qa 4): mind a közös `'../../components/ui'`-ból importál; 33 fájlban a meglévő barrel-importba fésülve (ábécérend), 2 többsoros importba kézzel. A `pages/ehs/QueryGate` útvonal **megszűnt**, re-export sem maradt (0 találat a `ehs/QueryGate` mintára).

## 2. HR-M1-THRESHOLD (HR-review M1)

- `src/pages/hr/HrDashboard.tsx:212`: a terhelés-sáv tónusa a `pct > 85` literál helyett a config-vezérelt **`loadBand(r.assigned, r.capacity)`**-ból dől el (`services/hr/calc.ts` — `UTILIZATION_WARN_THRESHOLD` a `config.ts`-ből), ahogy a Dolgozók/Kapacitás képernyő pilljei is. A nap-szintű `over` (rose) ág változatlan; `band === 'over'` szintén rose, `high` → amber, egyébként emerald.

## 3. MAINTENANCE-M1 + közös dateUtils-kiemelés (Maintenance-review M1, FE-task 6./8. follow-up)

- **Új közös modul: `src/services/dateUtils.ts`** — HELYI idejű nap-helperek (`DAY_MS`, `parseDay`, `formatDay`, `addDays`, `todayIso`, `diffDays`), a DMS-féle `parseDay` (slice(0,10)) változattal. A négy duplikátum (`services/{hr,qa,maintenance,dms}/calc.ts`) törölve, a modul-calc-ok **re-exportálnak** — a modul-API-k (és tesztjeik) változatlanok (`daysBetween` a DMS-ben a közös `diffDays` aliasa).
- **`src/pages/maintenance/labels.ts`** (a review M1-e): `formatDate`, `formatGridDay`, `isWeekend` a `new Date(iso)` UTC-parse helyett `parseDay`-jel — a rács-fejléc/hétvége-satírozás TZ-elcsúszása megszűnt.
- **További nap-szintű `new Date(iso)` cserék** (date-only ISO-kulcsokon): `pages/hr/labels.ts` (`formatDate`, `formatGridDay`), `pages/crm/labels.ts` (`formatDate`), `pages/controlling/labels.ts` (`formatDate`, `formatMonth`), `services/crm/sla.ts` (`daysUntilDue`).
- **NEM cserélve (szándékosan):** datetime-formázók (`pages/ehs/labels.ts` — az EHS időbélyegei `toISOString()` Z-datetime-ok, ott a `new Date` a helyes; `pages/qa/labels.ts` — YYYY-MM-DDTHH:mm lokál-datetime; `services/ehs/validity.ts`, qa `hoursBetween`), valamint az F2-scope-on kívüli legacy prototípus-oldalak (SupplierPortalPage, WorkflowPage, CuttingAnalyticsPage).

## Ellenőrzés

- **Teljes suite:** `npx vitest run` → **1414 passed / 19 failed** — a 19 a dokumentált pre-existing készlet (BOMPreviewCard, configurator×3, catalogFilterPersistence, ProcurementPage, WorkOrderSummary), **új bukás nincs**; teszt-asszert igazítás nem kellett (a HR/Maintenance tesztek már a config-forrásra épültek).
- `npx tsc -b` tiszta · `npm run build` zöld · célzott eslint a 47 érintett fájlra: 0 hiba.

_Frontend terminál — JoineryTech sziget. NEM commitolva: merge/commit root-döntés._
