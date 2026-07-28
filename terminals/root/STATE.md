# ROOT Terminal State

> **Frissítve:** 2026-07-28 este Europe/Budapest
> **Állapotforrás:** [`EPICS.yaml`](../../EPICS.yaml) + [`AGENT-CHANNEL.md`](../../AGENT-CHANNEL.md)
> **Koordinációs mód:** eseményvezérelt (két persistent Monitor — ld. memória
> `mailbox-monitor-orseg`; session-váltáskor újraélesítendő).

## Aktív terminál-hálózat (2026-07-28)

| Sáv | Ki | Mit csinál |
|-----|-----|-----------|
| **root** | Claude (ez) | review-kapuk, kontraktus-határok, koordináció, federation |
| **backend** | Claude | scheduling (`Szantoi/spaceos-modules-scheduling`) — a backend SÁVJA |
| **frontend** | Claude | portál-frontend (`src/joinerytech-portal`), workspace-primitívek |
| **Codex (platform)** | Codex | ERPSEP-FE-WORLD-GATING (portál-fán, in-flight) |
| **Codex (Doorstar)** | Codex + Gábor | `doorstar-instance` — saját C# (doorstar.* réteg) |

## A termékesítés fő vonala — scheduling (spaceos.scheduling)

- **ADR-069 ACCEPTED** (domain + termékcsomag + API), **ADR-070 ACCEPTED**
  (OR-Tools + NodaTime; RID linux-x64+win-x64, Tailnet-only sandbox).
- **PLAN-03: M1 ✅ M2 ✅ M3 ✅** (2026-07-28). A read-only kontraktus
  **KÉZBESÍTVE a Doorstarnak** (federation, openapi.yaml 3.1, SHA-256
  `3fc6c57d…`, 8 endpoint, KernelWorkScope/standardRevision/sourceRevisions,
  `partial_release_delays_fs_start`). Utolsó mérés: 324 zöld.
- **M4 FUT** — az első szelet kész (ISchedulingSolver port + determinisztikus
  referencia-ütemező + determinizmus-kapu, `83e403c`); jön a CP-SAT adapter.
  M4 bemenetlista: 4 M3-P2 (proposal-ütközés mező, DependencyEdge küszöb,
  erőforrásprofil-revízió tisztázás, művelet-név döntés) + ADR-070 determinizmus.
- **M5 pending** (írási irány: import/foglalás/publikálás).
- **Partial-release szemantika VÉGLEGES** (Gábor): feltétel nélküli felülírás
  + warning ha későbbi; munkaidő-arányos küszöb az előd naptárán.
- **Horgonyzás VÉGLEGES:** projekt → epic → task (KernelWorkScope), a teljes
  scope a revision-hash része, egy-run-egy-projekt invariáns.
- **Sandbox:** terv kész, döntések megvannak (Tailnet-only, dedikált KC-kliens
  az éles realmben) — provisioning a VPS-en Gábor-kapuval, M3 után esedékes.

## PLAN-05 — Doorstar-vizualizációk általánosítása: **DONE** (2026-07-28)

GanttChart + DependencyGraph + CapacityHeatmap primitívek a `@spaceos/portal-ui`-ban
+ scheduling nézet-modellek + ConfirmDialog/usePrintScope/useTimeCursor.
F1-F3 + F3+ mini-szelet mind root-review APPROVED. EditableDataTable az
M4-döntésig parkolva. (portal commitok: 0b0dbce, 794b2c4, ed0a786, b6f81e4, 83b6f4b)

## B2B kézfogás — Doorstar-integráció (B2B-10)

- **Gábor-döntés:** a Doorstar a kézfogásokon át integrálódik az
  epic/task/projekt-rendszerbe. A B2B-fagyasztás feloldva.
- **RE-AUDIT KÉSZ** (`B2B_COLLABORATION_REAUDIT_2026-07-28.md`): a 7 archivált
  done-ból **1 igaz / 3 részben / 3 hamis**; jól megírt domain-mag, de
  application-réteg/API/host/valós integráció NÉLKÜL. B2B-02 (RLS) HAMIS volt
  (EF InMemory „proof"), B2B-06/07 HAMIS. Done-ok visszavonva, doksik
  visszahozva az archívból.
- **F0 KÉSZ** (4 döntés: /api/collaboration/v1; dispute ki az MVP-ből;
  host/guest mátrix javítva; work-package horgony = KernelWorkScope).
  **F1-F8 sorban** (B2B-10 doksi); F1 (application-réteg, L) a backend jelölt
  az M4/M5 után. B2B-08 (portál-UI) az F3-F4 valódi OpenAPI-ja után épül újra.

## Egyéb lezárt/élő tételek (2026-07-28)

- **WORLDS-WAREHOUSE-API-GATE: DONE** — élő VPS-hoszt ellen teljes PASS (a
  0004-0006 inventory-migráció + kernel-api audience-mapper élesítve).
- **WORLDS-WAREHOUSE-FIX / -FE / WORLDS-SHELL-H1: DONE.**
- **MODULE-PACKAGES:** a workspace-átalakítás commitolva (root-audit + 3 P0
  javítva); eslint boundary-őr + subpath-aliasok élnek.
- **ERPSEP-06 hosting security-szelet: APPROVED + commitolva** (snake_case
  TenantResolver + RequireEnabledModule fail-closed gate; a kritikus
  claim-parse bug zárva); a P2-követők is. Hosting csomag: `0.1.0-preview.2`.
- **STAB-TENANT-ONBOARDING-RUNBOOK: DONE** (42/42 Pester).

## Nyitott koordinációs pontok

1. **Codex world-gating STÁTUSZ** — in-flight a portál-fán, BUKTATJA a közös
   kapukat (browser-smoke /w/production/cutting, App.test 5 route). Státuszt
   kértem; ha nem jelentkezik, sáv-átadás a frontendnek (a draft kimentve:
   `docs/tasks/EPIC-ERP-SEPARATION-2026Q3/worldgating-draft/`).
2. **Doorstar kontraktus-reviewer** kijelölése (emberi döntés — Gábor).
3. **Doorstar 3 bemenet** még: standard-verzióváltás-példa (v2 fedi?),
   overload-példa, naptár-jóváhagyás.
4. **Gábor-kapuk:** sandbox VPS-provisioning; Keycloak Postgres-migráció
   (STAB-KEYCLOAK-POSTGRES-MIGRATION — az éles KC ma H2-n fut).

## Újraindítási védelem

1. Először `AGENT-CHANNEL.md`, `EPICS.yaml`, ez a state és a `todo.md`.
2. **A két Monitort újra kell élesíteni** (session-váltáskor halnak).
3. Friss `git status` nélkül nincs mutáció; más ágens fájlhatárát tiszteld
   (a scheduling-repo a backendé, a gating-fájlok a Codexé).
4. Vegyes working tree-n nincs `git add -A`; csak taskonkénti fájllista.
5. Done-t/APPROVED-ot KIZÁRÓLAG root-review állít.
6. VPS-művelet, éles migráció, credential csak Gábor-jóváhagyással.
