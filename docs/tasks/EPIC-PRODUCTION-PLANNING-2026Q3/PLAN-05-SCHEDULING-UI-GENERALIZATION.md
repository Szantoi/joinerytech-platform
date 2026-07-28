# PLAN-05 — Doorstar megjelenítő-eszközök általánosítása a platformba

- **Szerep:** frontend
- **Prioritás:** P1 (az M3 read-only scheduling-nézet UI-alapja)
- **Státusz:** pending (kiosztás a world-gating zárása után)
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
