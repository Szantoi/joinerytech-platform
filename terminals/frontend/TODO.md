# FRONTEND Terminal TODO

> **Frissítve:** 2026-07-28 este, Europe/Budapest
> **Részletes állapot:** [`STATE.md`](STATE.md)
> **Kanonikus task-státusz:** `EPICS.yaml` + `docs/tasks/<EPIC>/<TASK>.md`

## P0 — minden munkakezdés előtt

- [ ] Friss `AGENT-CHANNEL.md` és `git status` a portálon; a Codex gating-sávja
      (`src/auth`, `src/config`, `HomeScreen`, `RequireAuth`, `portal-core/auth`)
      **tiltott zóna**, amíg le nem zárul.
- [ ] Fájlhatár-deklaráció a csatornára, MIELŐTT portál-szintű közös fájlhoz
      nyúlok (`App.tsx`, `src/index.css`, barrel-ek).
- [ ] Mailbox-figyelés élesítése (persistent Monitor: `terminals/frontend/inbox`
      + `AGENT-CHANNEL.md` `@frontend`/`@all`) — **session-váltáskor újra kell**.

## Kész (2026-07-28) — PLAN-05, mind a négy szelet APPROVED

- [x] **F1** — `GanttChart` + `DependencyGraph` primitív, planning nézet-model,
      a `TimelineRow`/`ExecutionTimeline` beolvasztása és törlése (`0b0dbce`).
- [x] **F2** — `CapacityHeatmap` + `capacityLoadModel` + `CapacityConflictPanel`
      (`794b2c4`), + 3 P2 az F1-ből.
- [x] **F3** — `ConfirmDialog`/`useConfirm`, `usePrintScope`,
      `useTimeCursor` + `dates.ts` (`ed0a786`), + 4 P2 az F2-ből.
- [x] **F3+** — `ConfirmProvider` az App-ban (`b6f81e4`), `CatalogPanel` az első
      `useConfirm`-fogyasztó 3 új teszttel (`83b6f4b`), + 3 P2.

## Nyitott — kiosztásra vár (nem kezdem el magamtól)

- [ ] **PLAN-05 F3 maradék:** `SheetTable` → `EditableDataTable` — a task-doksi
      szerint CSAK az M4 revízió-szerkesztés döntése után.
- [ ] **M3-bekötés (a scheduling-kontraktus megérkezett a backendtől):** a
      `CapacityConflictPanel` és az `ExecutionGantt` ma KÉSZ adatot vár.
      Átvételi feltétel a fogyasztó oldalon: **pending → `QueryGate`/skeleton**
      (ne üres rács villanjon), **error → hibaüzenet ÉS a rács elrejtése**
      (a részlegesen betöltött terhelés félrevezető). A primitívek
      `emptyLabel`-je NEM hibaállapot-jelzés.
- [ ] **`CatalogPanel` lint-adósság** (`handleDuplicate` deklaráció előtt,
      + `exhaustive-deps`) — a root külön szeletet ígért rá.

## Figyelt, más sávban lévő blokkolók

- [ ] **Közös böngésző-kapu piros:** `npm run test:smoke:keyboard` bukik a
      `/w/production/cutting`-on (világ-gating sáv). Amíg így áll, minden
      layout-állításomat eldobható `dev-harness/` oldalon mérem — és a mappát
      **minden futás után törlöm**.
- [ ] `src/__tests__/App.test.tsx` 5 világ-route timeout — ugyanaz a gyökér.

## Munkarend-emlékeztető

- Done-t és APPROVED-ot **kizárólag a root-review** állít; én
  `review_requested`-et jelentek bizonyítékokkal (teszt-számok, file:line,
  futtatott kapuk). **Nem commitolok** — a commit a root lépése.
- Kapuk minden szállításnál: célzott vitest + érintett-fájl lint 0 + `tsc`/build
  + (UI-változásnál) böngésző-mérés.
- Ha egy közös kapu piros: **stash-elt baseline-nal bizonyítsd**, hogy nem a te
  diffed okozza, mielőtt jelented.
