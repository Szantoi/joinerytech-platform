# PLAN-05 — Doorstar megjelenítő-eszközök általánosítása a platformba

- **Szerep:** frontend
- **Prioritás:** P1 (az M3 read-only scheduling-nézet UI-alapja)
- **Státusz:** **F1 DONE (0b0dbce) · F2 DONE (root-review APPROVED, 2026-07-28)** — F3 kiadva. F2 P2-követők az F3-mal: CapacityHeatmap teszt-szám doksi-javítás (11, nem 12); capacityLoadModel naptári nap-léptetés (DST-él); panel [style]-null teszt-őr; M3-bekötési jegyzet: a fogyasztó oldal pending/error ága átvételi feltétel.
  **F2 review_requested** (2026-07-28, a 3 F1-es P2 rendezve), F3 pending.
- **Eredet:** Gábor kérése (2026-07-28): „a DoorStar megjelenítéséhez kell némi
  egyedi eszköz, amit általánosítani kell, hogy bekerülhessen a JoineryTech-be."
- **Bemenet:** root-felmérés (2026-07-28, teljes leltár a doorstar-instance
  uzemi-tabla-web fájáról) — a lényege alább; ADR-069 §6 (M3 nézet-igény).

## A felmérés fő megállapításai (normatív bemenet)

1. **A `uzemi-tabla-web/src/components/planning/*` réteg PROTOTÍPUS a leendő
   C# Planning proposal-nézethez** — egyetlen route sem használja, saját
   tesztekkel, szerver-autoritatív elvvel („never calculates a schedule").
   Tartalma: `planningVisualizationModel.ts` (94 sor tiszta TS: FS/SS/FF/SF +
   lagMinutes + partialReleasePercent + proposal/warning/published/blocked
   státusz; érvénytelen intervallum kiszűrve, hiányzó operation-re nincs
   kitalált él — tesztelve), `DependencyGanttTimeline.tsx`,
   `WorkflowDependencyGraph.tsx`. **A platformon ma SEMMI nem tud FS/SS/FF/SF
   élt megjeleníteni.** Doorstar-szennyeződés: csak sztring-szintű (magyar
   címkék) — formatter/label-propba emelendő.
2. **LoadPage** = kész kapacitás-ütközés recept (állomás×nap heatmap,
   75%/100% küszöb-sávok, kihasználtság-sáv, bottleneck-panel; szerver-oldali
   számítás, a komponens csak renderel).
3. **SheetTable<T>** = domain-mentes szerkeszthető rács (a portal-ui
   DataTable-je csak olvasható) — M4 revízió-szerkesztéshez.
4. Kis hiánypótlók: promise-alapú `ConfirmDialog`/`useConfirm` (portálon
   nincs), `printOnly` scoped nyomtatás, hét-kurzor date-helperek.
5. **NEM emelendő:** BoardPage/KanbanPage (a generikus mag < kibontási
   költség), TaskCard/tokens.css (a Doorstar-BRAND — kézírás-font, marker-
   színek: instance-identitás), apiClient (X-Role/X-Station ≠ OIDC),
   6-stage types.ts. Real-time és kiosk nézet NEM létezik a Doorstar-oldalon.
6. Tech-stack: futásidőben kompatibilis (React 19, TS, TanStack, zustand);
   az egyetlen valós költség a **stílusréteg** (inline style + --marker-* →
   Tailwind + STATUS_TONES; a planning-komponenseknél ~10 attribútum).

## Végrehajtási fázisok

### F1 — view-model + Gantt + függőség-gráf (a legjobb ár/érték)

1. `planningVisualizationModel.ts` → scheduling nézet-model a platformon
   (magyar sztringek formatter-propokba; a 2 kész teszt átemelve).
2. `DependencyGanttTimeline` → **`GanttChart` primitív a @spaceos/portal-ui-ba**,
   ÉS a meglévő `TimelineRow`/`ExecutionTimeline` beolvasztása — ne legyen két
   versengő idősáv-implementáció. Pótlandó: időtengely-fejléc (ma nincs
   dátum-skála!), reszponzív viewBox, STATUS_TONES tone-map
   (proposal→info, warning→warn, published→success, blocked→danger).
3. `WorkflowDependencyGraph` → `DependencyGraph` primitív (lane/row méret
   prop-okkal).

#### F1 végrehajtási napló (2026-07-28, frontend terminál — review_requested)

**Szállítás (10 fájl):**

| Fájl | Szerep |
|------|--------|
| `packages/portal-ui/src/theme/svgTones.ts` | ÚJ — `SVG_TONES` (a STATUS_TONES `bg/dot/fg` párja `fill/stroke/text`-re) + `SVG_AXIS` szemantikus vázelem-osztályok |
| `packages/portal-ui/src/components/ui/GanttChart.tsx` | ÚJ primitív — lanes/items, `domain`, `ticks` (darabszám VAGY explicit lista), `formatTick`, méret-propok |
| `packages/portal-ui/src/components/ui/DependencyGraph.tsx` | ÚJ primitív — lane/row elrendezés, él-felirat + szaggatás propból, `laneWidth`/`rowHeight`/`nodeWidth`/`nodeHeight` |
| `src/lib/scheduling/planningVisualizationModel.ts` | ÚJ nézet-model — FS/SS/FF/SF + lag + partialRelease, `PLANNING_STATUS_TONES`, `buildPlanningGanttLanes`, `buildPlanningGraph`, formatter-propok |
| `src/components/scheduling/ExecutionGantt.tsx` | ÚJ kompozíció — a beolvasztott gép×végrehajtás idősáv a primitíven |
| `src/components/scheduling/ExecutionTimeline.tsx`, `TimelineRow.tsx` | **TÖRÖLVE** (beolvasztva) |
| `src/components/scheduling/__tests__/ExecutionTimeline.test.tsx` | **TÖRÖLVE** → `ExecutionGantt.test.tsx` (mind a 7 teszteset megőrizve, 1 assert a ritkított feliratozáshoz igazítva: `23:00` → `21:00`) |
| `src/pages/SchedulingPage.tsx` | 2 sor: import + JSX-használat átállítva |

**Az F1 három pontja:**

1. **Nézet-model átemelve** — a magyar szövegek `DependencyLabelFormatters`
   propba kerültek (`DEFAULT_DEPENDENCY_LABELS` a portál alapértelmezése);
   a 2 átemelt tesztfájl mindhárom eredeti invariánsa él (érvénytelen
   intervallum kimarad, a négy típus + audit-részlet látszik, hiányzó
   végpontra nincs kitalált él).
2. **GanttChart + beolvasztás** — pótolva: **időtengely-fejléc**
   (óránkénti rács, 3 óránkénti felirat — 24 felirat a jobb szélen egymásra
   csúszott, ez böngésző-méréssel derült ki), reszponzív viewBox
   (`w-full h-auto` + belső vízszintes görgetés), STATUS_TONES tone-map
   (proposal→info, warning→warn, published→success, blocked→danger),
   prioritás→tónus az execution-oldalon (a 3 hardcode hex kivezetve).
   **Inline style 0** (a geometria SVG-attribútum, nem stílus).
3. **DependencyGraph** — lane/row méret-propokkal, `useId`-alapú egyedi
   marker-azonosítóval (több gráf egy oldalon).

**Kapuk:**

- Célzott vitest: **61/61 PASS** (9 fájl: 2 primitív-teszt, 2 átemelt
  nézet-model-teszt, ExecutionGantt + a teljes `src/components/scheduling`,
  SchedulingPage)
- Csomag-regresszió: `vitest run packages` → **773/773 PASS** (82 fájl)
- Lint: **0 hiba** a 10 érintett fájlon
- `npm run build` (tsc -b + vite build): **PASS**
- Böngésző-mérés (a repo smoke-ja más sáv miatt bukik, ld. lent): eldobható
  harness-oldalon, valós layout-motorral, 1440/768/390 px + light/dark:
  **39/39 PASS** — nincs dokumentum-szintű vízszintes túlcsordulás, a Gantt
  viewBox-szal skálázódik, 0 inline style, a tónus- és token-színek
  világos↔sötét között ténylegesen váltanak

**Nem az én sávom, de a kapuban akadt fenn (root/@codex felé jelezve):**

- `npm run test:smoke:keyboard` **a változásaim NÉLKÜL is ugyanígy bukik**
  (`/w/production/cutting`, `CPL-` gomb 15 s timeout) — stash-elt baseline-nal
  bizonyítva
- `src/__tests__/App.test.tsx` 5 világ-route teszt timeout — szintén
  bizonyítottan előzetes (baseline: 5 failed | 3 passed)
- Legacy lint-adósság az érintett mappában, amihez nem nyúltam:
  `SchedulingPage.tsx` (3), `MachineDropZone.tsx` (2), `OperatorAutocomplete.tsx` (1)

**Ismert korlát (F2-re vihető):** a `DependencyGraph` az eredeti algoritmust
követve az azonos sávba (stage) eső utódot ugyanabba az oszlopba teszi, így az
azonos-sávos él visszafelé ívelő görbét kap, és a felirata a sáv-közbe esik.
A Doorstar-forrás viselkedése ugyanez; valódi javítás = réteg-alapú
gráf-elrendezés, külön lépésben.

### F2 — kapacitás-ütközés

4. `LoadPage` rács → `CapacityHeatmap` primitív (buckets/rows/thresholds/
   formatValue prop-ok, editor és magyar keret nélkül) + `CapacityConflictPanel`
   kompozíció (bottleneck-lista).

#### F2 végrehajtási napló (2026-07-28, frontend terminál — review_requested)

**Szállítás (6 új fájl + 3 P2-javítás):**

| Fájl | Szerep |
|------|--------|
| `packages/portal-ui/src/components/ui/CapacityHeatmap.tsx` | ÚJ primitív — buckets × rows rács, `capacity` + `thresholds`, `formatValue`, összegző oszlop |
| `packages/portal-ui/src/components/ui/capacityHeatmap.types.ts` | ÚJ — típusok + `capacityTone` + `DEFAULT_CAPACITY_THRESHOLDS` (a `dataTable.types.ts` mintájára, react-refresh miatt külön modul) |
| `src/lib/scheduling/capacityLoadModel.ts` | ÚJ nézet-model — `buildCapacityBuckets` / `buildCapacityRows`, Intl nap-nevek, formatter-propok |
| `src/components/scheduling/CapacityConflictPanel.tsx` | ÚJ kompozíció — magyar keret + jelmagyarázat + szűk keresztmetszet-lista |
| + 3 tesztfájl | CapacityHeatmap (12), capacityLoadModel (7), CapacityConflictPanel (6) |

**Döntések:**

- A rács **valódi táblázat-szemantikával** készült (`<th scope="col|row">`),
  nem div-rácsként — így a képernyőolvasó a cellát sor- és oszlopfejléchez köti.
- A tónus **nem az egyetlen jelzés**: a cella szövege az értéket és a
  darabszámot is hordozza (WCAG 1.4.1).
- A **kapacitás-szerkesztő input NEM jött át** (a task szerint ez olvasó nézet);
  teszt őrzi, hogy ne szivárogjon vissza.
- Küszöb→tónus: `ok→success`, `warn→warn`, `over→danger`; a küszöb FELETT vált
  (0.75 még ok), a jelmagyarázat ugyanazt a `capacityTone` függvényt hívja,
  amit a rács fest — nem külön, kézzel párosított színlista.
- Hiányzó vödör-cella **üresen marad** (nincs kitalált nulla) — ugyanaz az elv,
  mint az F1 „nincs kitalált él" invariánsa.
- `capacity = 0` esetén 1-re esik vissza a nevező (nincs NaN/Infinity).
- A kihasználtság-sáv szélessége statikus utility-lépcsőkből (5%) jön, mert a
  Tailwind futásidejű értékből nem generál osztályt — **inline style 0**.

**P2-k az F1-ből (mind rendezve):**

1. Doksi-mondat pontosítva (7 teszteset / 1 igazított assert).
2. `DependencyGraph` él-kulcs: `${index}-${from}-${to}` + regressziós teszt,
   ami két azonos (from, to, label) élt vár külön útvonalként.
3. `formatTick` UTC-jegyzet a prop-doksiban ÉS a barrel export felett.

**Kapuk:**

- Célzott vitest: **68/68 PASS**; `packages/portal-ui` + `src/lib/scheduling` +
  `src/components/scheduling` együtt: **210/210 PASS** (27 fájl)
- Csomag-regresszió: `vitest run packages` → **785/785 PASS** (83 fájl)
- Lint: **0 hiba** az érintett fájlokon
- `npm run build`: **PASS**
- Böngésző-mérés (1440/768/390 px, light+dark): **21/21 PASS** — nincs
  dokumentum-szintű túlcsordulás (a rács belül görget), minden cella **44px**,
  0 inline style, a kihasználtság-sáv arányos (118% → tele, 63% → ~2/3),
  a warn cella háttere ÉS szövege is vált világos↔sötét között
- `npm run test:smoke:keyboard`: **továbbra is a másik sáv miatt piros**
  (`/w/production/cutting`), változatlanul reprodukálható a saját változásaim
  nélkül is

### F3 — opportunista primitívek (egymástól függetlenek)

5. `SheetTable` → `EditableDataTable` (CSAK ha az M4 revízió-szerkesztés
   bekerül — addig várhat).
6. `ConfirmDialog` + `useConfirm()` (portál-fókuszcsapdával); `usePrintScope()`;
   `useTimeCursor()` + locale-os date-helperek (DAY_NAMES → Intl).

## Kemény szabályok

- A portal-ui primitívek DOMAIN-MENTESEK (a boundary-őr + a react-refresh
  konvenciók érvényesek); a scheduling-KOMPOZÍCIÓ külön rétegben él.
- A Doorstar-brand (TaskCard, tokens.css) NEM kerül át — az instance-identitás.
- Skálázhatóság: a Doorstar-vizualizációk fix SVG-méretűek, nem virtualizáltak
  — a GanttChart első verziója már reszponzív viewBox-szal + (react-window /
  zoom-pan-pinch) tervvel készüljön.
- Provenance: a fájl-fejlécekben a doorstar-instance eredet megjelölendő; a
  Doorstar a saját UI-ját változatlanul viszi tovább, később fogyaszthatja
  vissza a publikált csomagot.
- Kapuk: célzott tesztek (az átemelt 2 tesztfájllal), lint 0, build, a
  szokásos review_requested → root-review.
