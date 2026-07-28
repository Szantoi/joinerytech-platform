# PLAN-05 — Doorstar megjelenítő-eszközök általánosítása a platformba

- **Szerep:** frontend
- **Prioritás:** P1 (az M3 read-only scheduling-nézet UI-alapja)
- **Státusz:** **F1 DONE** (root-review APPROVED, portal 0b0dbce, 2026-07-28) — F2 kiadva, F3 pending. F1 P2-követők az F2-vel: doksi-mondat pontosítás (1 assert igazítva), DependencyGraph él-kulcs index-védelem, formatTick UTC-jegyzet a barrel-doksiban.
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
| `src/components/scheduling/__tests__/ExecutionTimeline.test.tsx` | **TÖRÖLVE** → `ExecutionGantt.test.tsx` (mind a 7 eredeti assert megőrizve) |
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
