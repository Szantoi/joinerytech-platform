# F3 Minőségkapu — EPIC-UI-PORTAL-2026Q3 záró technikai kapu

> **Készítette:** monitor terminál — 2026-07-16
> **Epic:** `EPIC-UI-PORTAL-2026Q3` · Fázis 3 (F3-minosegkapu)
> **App:** `src/joinerytech-portal` @ `main@449bf0c` · Vite 8.0.16 (Rolldown) · vitest
> **Megjegyzés:** a portal working tree érintetlen (dev szerver fut az 5173-on); minden kimenet temp/scratchpad logba készült.

## Összesített verdikt: ✅ PASS

| Kapu | Eredmény |
|---|---|
| 1. `npx tsc -b` | ✅ tiszta (0 hiba) |
| 2. `npm run build` | ✅ zöld — 1028 modul, 60 JS chunk, 3.29 s |
| 3. `npx vitest run` (teljes suite) | ✅ **1414 passed / 19 failed (1433)** — a 19 PONTOSAN a dokumentált pre-existing készlet, **új bukás nincs** |
| 4. `npx eslint src --max-warnings 0` | ⚠️ 205 error / 16 warning **94 fájlban — mind legacy prototípus-kód**, a 7 modul-világ fájljai között **0 találat** (nem blokkoló, számszerűsítve lent) |
| 5. Leltár: 7 világ route + 7×APPROVED review | ✅ mind él, mind megvan |

A `stop_condition` technikai fele (build+test zöld, route-alapú code-splitting él, 7×APPROVED,
EHS nyitott scope lezárva) teljesül. **A release-döntés Gáboré (root) — az itt NEM része a kapunak.**

---

## 1. TypeScript — `npx tsc -b`

Tiszta, 0 hiba (a teljes project-references lánc).

## 2. Production build + bundle-riport

`npm run build` (= `tsc -b && vite build`) zöld: ✓ 1028 modul, ✓ built in 3.29 s.
60 JS chunk + 1 CSS — a route-alapú code-splitting él (minden oldal saját lazy chunk,
`recharts` külön vendor-chunk).

### Fő chunkok

| Chunk | raw kB | gzip kB | Megjegyzés |
|---|---:|---:|---|
| `index-DWQ1cY57.js` (shell) | 371.70 | 108.06 | egyedüli eager JS a runtime-okon túl |
| `recharts-BmsLpePG.js` | 372.77 | 109.46 | vendor, csak chart-os oldalak töltik |
| `ProductionPage` | 284.62 | 69.95 | legnagyobb lazy oldal-chunk (legacy) |
| `index-BT5Mh6Sa.css` | 128.48 | 20.25 | egy CSS fájl |

### A 7 modul-világ chunkjai

| Modul | Chunk | raw kB | gzip kB |
|---|---|---:|---:|
| EHS | `EhsPage-B8TWJfSY.js` | 152.64 | 46.71 |
| QA | `QualityPage-KnS3s_1z.js` | 47.80 | 10.42 |
| HR | `HrPage-CCfP75Fp.js` | 43.12 | 10.13 |
| CRM | `CrmPage-C_DwlW3Z.js` | 39.90 | 9.62 |
| Maintenance | `MaintenancePage-CH-7u0W5.js` | 37.61 | 9.00 |
| DMS | `DocsPage-DIQXb19E.js` | 28.16 | 7.23 |
| Kontrolling | `ControllingPage-DUbH2Vw7.js` | 27.06 | 7.06 |

Mind lazy — csak a világba belépéskor töltődik. Az EHS a legnagyobb (6 képernyő + incidens-wizard);
következő optimalizálási jelölt, nem blokkoló.

### Összevetés az F1 baseline-nal (`docs/knowledge/architecture/BUNDLE_REPORT_F1.md`)

| Mérőszám | F1 előtt (monolit) | F1-C után | Most (F3) |
|---|---:|---:|---:|
| Induló JS raw | 1 890.15 kB | ~381.65 kB | **371.70 kB** |
| Induló JS gzip | 462.23 kB | ~110.78 kB | **108.06 kB** |

Az F1-nél dokumentált **~80%-os induló-bundle-javulás megmaradt, sőt kicsit javult**
(shell −9.95 kB raw / −2.72 kB gzip az F1-C-hez képest), miközben azóta **mind a 7 modul-világ megépült** —
az új kód mind saját lazy chunkba került, a shell nem hízott.

## 3. Teszt-suite — `npx vitest run`

Log: scratchpad `f3-tests.log` (a portal fába semmi nem íródott).

**Test Files: 8 failed | 146 passed (154) · Tests: 19 failed | 1414 passed (1433) · Duration 117.74 s**

Az elvárás (1414 passed / 19 failed) **pontosan teljesül**. A bukó fájlok tételes összevetése
a dokumentált pre-existing készlettel (F2-CROSSCUT-FIX.md: BOMPreviewCard, configurator×3,
catalogFilterPersistence, ProcurementPage, WorkOrderSummary):

| Bukó fájl | Bukások | Dokumentált készlet-tag |
|---|---:|---|
| `src/__tests__/catalogFilterPersistence.test.tsx` | 5 | ✅ catalogFilterPersistence |
| `src/pages/__tests__/ProcurementPage.test.tsx` | 5 | ✅ ProcurementPage (Router-hiány) |
| `src/components/__tests__/BOMPreviewCard.test.tsx` | 3 | ✅ BOMPreviewCard |
| `src/__tests__/BOMPreviewCard.test.tsx` | 2 | ✅ BOMPreviewCard |
| `src/__tests__/ProductConfiguratorWizard.test.tsx` | 1 | ✅ configurator |
| `src/pages/__tests__/ProductConfiguratorWizard.test.tsx` | 1 | ✅ configurator |
| `src/__tests__/configurator-integration.test.tsx` | 1 | ✅ configurator |
| `src/__tests__/WorkOrderSummary.test.tsx` | 1 | ✅ WorkOrderSummary |

**ÚJ bukás: 0** — a 7 modul-világ (EHS/CRM/Kontrolling/HR/Maintenance/QA/DMS) tesztfájljai
között bukás nincs. Javítás: `FIX-PREEXISTING-TESTS` backlog-tétel (nem F3-blokkoló).

## 4. Lint — `npx eslint src --max-warnings 0`

Eredmény: **205 error / 16 warning, 94 fájlban** (exit 1 a `--max-warnings 0` kapun).

Eloszlás-elemzés: **a 7 modul-világ egyetlen fájlja sem érintett** — se a belépő oldalak
(`EhsPage/CrmPage/ControllingPage/HrPage/MaintenancePage/QualityPage/DocsPage.tsx`), se a
`pages/{ehs,crm,controlling,hr,maintenance,qa,dms}/`, `services/`, `mocks/*Api/` fák.
Mind a 205 hiba a **legacy prototípus-rétegben** van: `components/catalog|procurement|sales|
shopfloor|scheduling|partners/…`, régi `hooks/` (useCuttingPlanPolling, useEditLock, useFilterState…),
legacy oldalak (ProductionPage, DesignPage, SupplierPortalPage, TasksPage, AttendancePage…) és a
pre-existing tesztfájlok. Tipikus szabályok: `no-explicit-any`, `no-unused-vars`,
`react-hooks/set-state-in-effect`, `react-hooks/purity`.

Ez konzisztens az F2-taskok "célzott eslint tiszta" állításaival (az új kód tiszta; a legacy
sosem volt az). **Nem blokkoló** — láthatóságként javasolt backlog-tétel a legacy lint-adósságra.

## 5. Leltár — 7 világ route + 7×APPROVED review

### Route-ok (App.tsx + mocks/worlds.ts)

Mind a 7 modul-világ szerepel a `WORLDS`/`WORLD_ORDER` konfigban és él a route-ja
(base + `:screen`, mind lazy chunk):

| Modul | World key | Route | Képernyők |
|---|---|---|---|
| CRM | `crm` | `/w/crm` + `/w/crm/:screen` | dash, pipeline, leads, opps, tasks, forecast |
| Kontrolling | `kontrolling` | `/w/kontrolling` + `:screen` | dash, portfolio, projects, variance, adjustments |
| HR | `hr` | `/w/hr` + `:screen` | dash, people, capacity, absences, skills, timelogs |
| Maintenance | `maintenance` | `/w/maintenance` + `:screen` | dash, assets, workorders, schedule |
| QA | `quality` | `/w/quality` + `:screen` | dash, inspections, tickets, trend |
| EHS | `ehs` | `/w/ehs` + `:screen` | dash, incidents, risks, sds, ppe, walks |
| DMS | `docs` | `/w/docs` + `:screen` | dash, library, expiring |

### 7×APPROVED designer-review leltár (docs/knowledge/qa/)

| Modul | Verdikt | Dátum | Review-doksi |
|---|---|---|---|
| EHS | ✅ APPROVED (re-review) | 2026-07-14 | `F2_EHS_DESIGN_REVIEW_2026-07-14.md` |
| CRM | ✅ APPROVED (re-review) | 2026-07-14 | `F2_CRM_DESIGN_REVIEW_2026-07-14.md` |
| Kontrolling | ✅ APPROVED (re-review) | 2026-07-15 | `F2_KONTROLLING_DESIGN_REVIEW_2026-07-15.md` |
| HR | ✅ APPROVED (fix-kör nélkül) | 2026-07-15 | `F2_HR_DESIGN_REVIEW_2026-07-15.md` |
| Maintenance | ✅ APPROVED (fix-kör nélkül) | 2026-07-15 | `F2_MAINTENANCE_DESIGN_REVIEW_2026-07-15.md` |
| QA | ✅ APPROVED (fix-kör nélkül) | 2026-07-15 | `F2_QA_DESIGN_REVIEW_2026-07-15.md` |
| DMS | ✅ APPROVED (fix-kör nélkül) | 2026-07-16 | `F2_DMS_DESIGN_REVIEW_2026-07-16.md` |

Az EHS és Kontrolling doksik fejléce az első kör CHANGES REQUESTED verdiktjét őrzi — a záró
`RE-REVIEW: ✅ APPROVED` szakasz mindkettőben megvan (kódban ellenőrizve).

## Nyitott backlog-tételek (EPICS.yaml — NEM blokkolók, láthatóság)

| Tétel | Szerep | Állapot | Tartalom |
|---|---|---|---|
| `FIX-PREEXISTING-TESTS` | frontend | pending | a fenti 19 pre-existing tesztbukás javítása (HEAD db57ae3-en is bukott, nem epic-regresszió) |
| `DS-RECONCILE` | designer | pending | Gábor design-system styleguide-jának egyeztetése a DESIGN_SYSTEM_SPEC_V1-gyel + portal-tokenekkel (régi prototípus-akcentek cseréje) |
| `EHS-WIZARD-HU` | frontend | pending | IncidentReportWizard angol szövegeinek magyarítása |
| `RISKS-5X5-FE` (follow-up, RISKS-5X5-BE note-ból) | frontend | nem kiadott | portal RisksScreen mock→API migráció, 3×3→5×5 |
| Review N-szintű nitek | frontend/designer | tracked | modulonként N1-N4/N5 a review-doksikban (pl. formFields 4. ismétlődés, Chip-promótálás — F3 crosscut-jelöltek) |
| Legacy lint-adósság | frontend | javasolt új tétel | 205 error / 16 warning 94 legacy fájlban (4. pont) |

---

_Monitor terminál — JoineryTech sziget. F3 minőségkapu: ✅ PASS. GIT COMMIT nélkül — merge/commit root-döntés; a release-döntés sor pending marad._
