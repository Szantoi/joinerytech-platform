# FRONTEND Terminal State

> **Frissítve:** 2026-07-28 este, Europe/Budapest
> **Állapotforrás:** `EPICS.yaml` + `docs/tasks/<EPIC>/<TASK>.md`
> **Munkarend:** [`CLAUDE.md`](CLAUDE.md) — done-t KIZÁRÓLAG a root-review állít

## Jelenlegi állapot

- **Terminál megnyitva 2026-07-28-án**, első nap: a PLAN-05 mind a négy szelete
  leszállítva és root-review APPROVED.
- **Portal:** `main@83b6f4b`. Az én szeleteim (alulról felfelé):
  `0b0dbce` F1 → `794b2c4` F2 → `ed0a786` F3 → `b6f81e4` + `83b6f4b` F3+.
  A commitokat a root készíti — én `review_requested`-et jelentek bizonyítékokkal.
- **A portál working tree nem tiszta, de nem tőlem:** `packages/portal-core/
  src/auth/AuthContext.tsx`, `src/auth/**`, `src/components/layout/HomeScreen*`
  a Codex világ-gating sávja (ERPSEP-FE-WORLD-GATING), commitolatlan.
- **PLAN-05 (Doorstar-vizualizációk általánosítása): DONE** — F1+F2+F3+F3+.
  Az `EditableDataTable` a task-doksi szerint az M4 revízió-szerkesztés
  döntéséig várakozik (nem az én nyitott tételem).

## Amit a PLAN-05-ben a portal-ui kapott (közös felület, mindenkinek)

| Primitív / hook | Fájl | Lényeg |
|---|---|---|
| `GanttChart` | `components/ui/GanttChart.tsx` | **az EGYETLEN idősáv-implementáció** (a `TimelineRow`/`ExecutionTimeline` beolvasztva és törölve); lanes/items, `domain`, `ticks` (szám VAGY explicit lista, üres felirat = csak rácsvonal), reszponzív viewBox |
| `DependencyGraph` | `components/ui/DependencyGraph.tsx` | FS/SS/FF/SF-képes háló; hiányzó végpontra NINCS kitalált él |
| `CapacityHeatmap` | `components/ui/CapacityHeatmap.tsx` (+ `.types.ts`) | valódi táblázat-szemantika (`th scope`), küszöb→tónus, hiányzó cella üresen marad |
| `ConfirmDialog` + `useConfirm` | `components/ui/ConfirmDialog.tsx` + `confirmContext.ts` | promise-alapú `ask()`; a fókusz a **Mégsén** landol |
| `usePrintScope` | `components/ui/hooks/usePrintScope.ts` | ref-fel kijelölt nyomtatási régió + `src/index.css` `@media print` blokk |
| `useTimeCursor` + `dates.ts` | `components/ui/hooks/` + `src/dates.ts` | csúszó idő-ablak; **naptári** (DST-biztos) léptetés, Intl nap-nevek |
| `SVG_TONES` / `SVG_AXIS` | `theme/svgTones.ts` | a STATUS_TONES SVG-párja — a `bg-*`/`text-*` utility SVG-alakzatra NEM hat |

App-oldali rétegek: `src/lib/scheduling/{planningVisualizationModel,capacityLoadModel}.ts`
(nézet-modellek, magyar szöveg formatter-propban), `src/components/scheduling/
{ExecutionGantt,CapacityConflictPanel}.tsx` (kompozíciók).

## Ismert leletek (NEM az én sávom, bizonyítottan előzetesek)

1. **`npm run test:smoke:keyboard` piros** — `/w/production/cutting`, a `CPL-`
   gomb 15 s alatt nem jelenik meg. Stash-elt baseline-nal többször igazolva,
   hogy a saját változásaim nélkül is ugyanez. A világ-gating sáv állapota.
   → **Amíg így áll, a saját felületeimet eldobható `dev-harness/` oldalon
   mérem valós böngészőben, és minden futás után törlöm a mappát.**
2. **`src/__tests__/App.test.tsx`** — 5 világ-route teszt timeout (baseline:
   `5 failed | 3 passed`), szintén a gating-sávból.
3. **Legacy lint-adósság az érintett fájlokban, amihez nem nyúltam:**
   `CatalogPanel.tsx` (`handleDuplicate` deklaráció előtt használva: 1 error +
   1 warning — root külön szeletet ígért rá), `SchedulingPage.tsx` (3),
   `MachineDropZone.tsx` (2), `OperatorAutocomplete.tsx` (1).

## Kapu-számok a nap végén

- `vitest run packages`: **810/810 PASS** (87 fájl)
- `packages/portal-ui` + `src/lib/scheduling` + `src/components/scheduling`: **237/237**
- lint: 0 az általam írt/módosított fájlokon · `npm run build`: PASS
- böngésző-mérés (eldobható harness): F1 39/39, F2 21/21, F3 22/22
