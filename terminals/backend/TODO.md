# BACKEND Terminal TODO

> **Frissítve:** 2026-07-28 este (Europe/Budapest)
> **Részletes állapot:** [`STATE.md`](STATE.md)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a `done` kimondása root-review joga

## P0 — minden folytatás előtt

- [ ] Friss `AGENT-CHANNEL.md` + inbox olvasása; másik terminál fájlzárainak tiszteletben tartása.
- [ ] **Soha `git add -A` a platform-repóban** — a working tree más terminálok félkész munkáját
      is tartalmazza; egyszer már bevontam egy commitba (még push előtt visszavontam).
      Csak taskonkénti, felsorolt fájllista.
- [ ] Mérés előtt Docker-állapot ellenőrzése, ha integrációs sáv is kell.

## P1 — M4: véges kapacitású ütemező (fut)

- [x] `ISchedulingSolver` port + kérés/megoldás modell (`83e403c`).
- [x] Determinisztikus referencia-ütemező (list scheduler: precedencia + partial release +
      véges kapacitás), 17 teszt.
- [x] **ADR-070 D3 determinizmus-kapu**: azonos bemenet → azonos revision-hash; a beadási
      sorrend megfordítása sem mozdítja.
- [ ] **CP-SAT adapter a porton** (infrastruktúra-réteg): `Google.OrTools` **9.15.6755** pin,
      `random_seed` konfigból + `num_search_workers = 1`; a párhuzamos keresés **opt-in**, és
      az eredménye `IsReproducible = false` — nem tehet úgy, mintha a hash stabil identitás lenne.
- [ ] Az adapter és a referencia **ugyanazokon az eseteken** mérve (ez a port értelme).
- [ ] Naptár-bekötés az ütemezésbe: a perc-idővonal ↔ `WorkingCalendar` (DST, kivételek) — ma a
      solver tiszta perc-idővonalon dolgozik.
- [ ] Lockfile-ok frissítése + `--locked-mode` zöld (ADR-070 D4), natív runtime-binárisokkal.

## P1 — a 4 additív kontraktus-bővítés (M3-verdikt P2-i)

Rögzítve a [PLAN-03 doksi végén](../../docs/tasks/EPIC-PRODUCTION-PLANNING-2026Q3/PLAN-03-SCHEDULING-IMPLEMENTATION.md);
mind additív, a kézbesített `1.0.0-preview.1` nem törik.

- [ ] Proposal **kapacitás-ütközés mező** (tartalma M4-ből; ugyanabból a detektorból, mint az
      `overload` végpont — különben két igazság lesz ugyanarról).
- [ ] `DependencyEdge` **partial-release küszöb** a wire-on (`releaseThresholdFraction`).
- [ ] „Erőforrásprofil-revízió" fogalom tisztázása az ADR-069 §6 szövegében (javaslat: a
      naptár-revízió fedi, külön fogalom ne legyen).
- [x] Művelet-„név" döntés kimondva: **marad a stabil kulcs**, emberi név nem megy ki; ha kell,
      additív `displayName` „csak megjelenítésre".

## P2 — sandbox (a VPS-lépések Gábor-kapusak)

Terv: [`SCHEDULING_SANDBOX_PLAN.md`](../../docs/knowledge/deployment/SCHEDULING_SANDBOX_PLAN.md) —
Gábor döntéseivel már a törzsben (Tailnet-only, dedikált Keycloak-kliens az éles realmben).

- [ ] Seed-script (idempotens): v1/v2 fixture-ből terv + naptár-kivétel + **karanténba tett**
      standard (a Doorstar kliensének a hiányzó normát is kezelnie kell).
- [ ] A helyszíni RLS-ellenőrzés futtatható alakja (a proof `(a)`–`(h)` tényei a sandbox DB-n).
- [ ] Füst-próba a **generált TS-klienssel**, nem curl-lel.
- [ ] ⚠ **Gábor jóváhagyása nélkül semmilyen VPS-parancs.**

## P3 — sorban, blokkolva

- [ ] **B2B-10 F1** (inbox `010`) — root sorrend-döntése szerint az M4 mögött; addig nem indul.
- [ ] Nexus MCP-tunnel visszaállása után a lokális sorban várt levelek **újrakézbesítése**.

## Nem az én sávom (jelzés szintjén követem)

- Hosting/`DevelopmentIdentityOptions.EnabledModules` — Codex, ERPSEP-06 (root támogatja).
- Kontraktus-reviewer kijelölése a Doorstar oldaláról — az M4-bővítések review-jához kell.
