# FRONTEND Terminal TODO

> **Frissítve:** 2026-07-29 délelőtt, Europe/Budapest
> **Részletes állapot:** [`STATE.md`](STATE.md)
> **Kanonikus task-státusz:** `EPICS.yaml` + `docs/tasks/<EPIC>/<TASK>.md`

## P0 — minden munkakezdés előtt

- [ ] Friss `AGENT-CHANNEL.md` és `git status` a portálon; a Codex gating-sávja
      (`src/auth`, `src/config`, `HomeScreen`, `RequireAuth`, `portal-core/auth`)
      **tiltott zóna**, amíg le nem zárul. **A csatorna 2026-07-29-én tömörítve
      lett (4155 → 560 sor); a 07-22…07-28 közti rész itt van:**
      `docs/knowledge/archive/agent-channel/AGENT-CHANNEL-2026-07-22--2026-07-28.md`
- [ ] **Közös fájlhoz nyúlás előtt nézd meg az időbélyeget is**, ne csak a
      `git status`-t — 07-29-en a gating-fájlok a felmérésem közben változtak
      meg, mert a másik író nem jelentett be a csatornán. A sáv-deklaráció
      önmagában nem véd az ütközéstől.
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
- [x] **M3-bekötés — `ExecutionGantt` ág: ROOT-REVIEW APPROVED (2026-07-29).**
      Utókövetés nélkül. A commit a rootra vár (pathspec a csatornán).
      `useApi.isPending` (additív) + lekérésenként külön `QueryGate` a
      `SchedulingPage`-en. 26/26 célzott, 727/727 + 544/544 chunk, tsc/build
      PASS, lint baseline 7 → 6.
- [ ] **M3-bekötés — `CapacityConflictPanel` ág BLOKKOLT:** a panelnek ma
      **nincs fogyasztója** a portálon, tehát nincs mit bekötni. Kell hozzá egy
      terhelés-képernyő scope-döntés. (A scheduling `openapi.yaml` sincs a
      platform-repóban — a federation-kézbesítés a Doorstarnak ment, generált
      kliensre ma nem tudok építeni.)
- [x] **`SchedulingPage` route-bekötés — KÉSZ (2026-07-29), review_requested.**
      Gábor döntése: kapjon route-ot. `/w/production/scheduling` („Ütemezés"),
      + magyarítás és design-system tokenek 7 komponensen. 112/112 célzott,
      727/727 + 546/546 chunk, tsc/build PASS, lint baseline 9 → 7,
      SHELL-H1 39/39 route, dark/light mérés 8/8.
- [x] **PLAN-05 F6 — szerep-szótár bővítés: KÉSZ (review_requested).**
      `PORTAL_ROLES` egyetlen forrásként, seedek, tesztek a valódi claim-úton,
      Keycloak-profil. Az Admin felvéve a kiosztási jogba a mátrix szerint.
- [x] **PLAN-05 F4 — strukturált ConfirmDialog: KÉSZ (review_requested).**
      `ConfirmDetail`/`details` a primitíven, a kézzel írt overlay törölve,
      MSW-handlerek, prioritás-sávozás egy modulba vonva.
      **Böngésző-kapu 5/5** (fókuszcsapda + Escape + nincs kiosztás).
- [x] **PLAN-05 F5 — dátumválasztó: KÉSZ (review_requested).**
      `isoDate`/`addDays` a portal-ui-ból, a UTC-s kezdőérték cserélve,
      napváltás-teszt (a régi nap adata nem marad kint).
- [x] **F6/2 — az üzemi szerepek rácsa: KÉSZ (review_requested).** Gábor: „ne
      kapjanak üreset"; a root ugyanezt döntötte. `production_manager` és
      `machine_operator` → `['production', 'settings']`, `ROLE_PRIORITY` a
      Designer mögé / Joiner elé. 3 teszt (nem üres · az entitlement felülír ·
      a dev-seed az Admin rácsát kapja). 1298/1298, SHELL-H1 39 route, F4 5/5.
- [x] **`WorkflowPage` dark mode: KÉSZ (review_requested).** 53 hardcode szín →
      tokenek; dark módban 7 → 1 világos felület, és a maradék 1 a szándékos
      inverzió (aktív chip, mért kontraszt 17.49:1 / 13.89:1 — AA mindkettőn).
      **Audit: a 24 elérhető világ-route közül egy sem törik dark módban.**
- [x] ~~a smoke `ROUTES` kézzel felsorolt~~ — a gatelt lista már a
      `worldAccess.ts` forrásából olvasódik (drift-őr).
- [ ] **`CatalogPanel` lint-adósság** (`handleDuplicate` deklaráció előtt,
      + `exhaustive-deps`) — a root külön szeletet ígért rá.

## COMMITOLVA (2026-07-29 este) — Gábor felhatalmazásával

Portál `55eedbc` → `47ecd29`, négy szelet, **fájl-diszjunkt pathspec-ekkel**:

```
66c8995  sr-only tablazat -> a class a burkolo divre (a11y, ket modul)
258320f  WorkflowPage eszkoztar tordelese (375px tulcsordulas mobilon)
24224eb  TOUCH-44: 44px erintesi zona pointer:coarse alatt + smoke-kapu
47ecd29  PORTALUI-PUBLISH: a csomag fogyaszthatova tetele
```

A szivárgás-kaput a root commitolta (`0b1743d`).

⚠ **Szándékosan KIMARADT:** `packages/module-collaboration/` — a B2B-08
`changes_requested` munkája. Az én `private: true` javításom benne marad a fában,
amíg azt a szeletet nem commitolják.

**Commit után ellenőrizve:** `tsc` PASS · portál-build PASS · csomag-build PASS ·
szivárgás-kapu önteszt 17/17.

**Nyitva, Gábor döntésére vár:** licenc (irányt adott: nyílt; a konkrét választás
— MIT vs Apache-2.0 — még nyitva, a nesting-algoritmusok miatt Apache-2.0-t
javasoltam) és a hat meg nem mért submodule.

## Figyelt, más sávban lévő blokkolók

- [x] ~~`/w/production/cutting` smoke-bukás~~ — **FELOLDVA** (Codex, 07-29 09:20),
      saját méréssel igazolva. A `dev-harness/` kerülőút megszűnt.
- [x] ~~`aria-current` 15 legacy világon~~ — **NEM hiba volt, hanem rossz
      ellenőrzés** (review_requested). A 15 route `HIDDEN_LEGACY_WORLDS`-tag: a
      `RequireAuth` a tiltó oldalt adja, tehát nincs navjuk. A kapu azt kérte
      számon a gatingen, hogy ne működjön — ráadásul a h1-ük **üresen zöld**
      volt (a tiltó oldal címét számolta). Átírva: **24 valódi világ-route** +
      **17 gatelt route fail-closed bizonyítással** (köztük `/w/shopfloor` és
      `/w/trade`, amik eddig sehol nem szerepeltek). A lista a `worldAccess.ts`
      forrásából olvasódik → drift-őr. **A közös smoke ezzel teljesen ZÖLD.**
- [x] ~~`SchedulingPage` nyelvi keveredése~~ — magyarítva (route-bekötés).
- [x] ~~A terv dátuma be van fagyva~~ — dátumválasztó kész (F5).

## Munkarend-emlékeztető

- Done-t és APPROVED-ot **kizárólag a root-review** állít; én
  `review_requested`-et jelentek bizonyítékokkal (teszt-számok, file:line,
  futtatott kapuk). **Nem commitolok** — a commit a root lépése.
- Kapuk minden szállításnál: célzott vitest + érintett-fájl lint 0 + `tsc`/build
  + (UI-változásnál) böngésző-mérés.
- Ha egy közös kapu piros: **stash-elt baseline-nal bizonyítsd**, hogy nem a te
  diffed okozza, mielőtt jelented.
