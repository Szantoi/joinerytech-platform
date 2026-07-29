# BACKEND Terminal TODO

> **Frissítve:** 2026-07-29 délelőtt (Europe/Budapest)
> **Részletes állapot:** [`STATE.md`](STATE.md)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a `done` kimondása root-review joga

## P0 — minden folytatás előtt

- [ ] Friss `AGENT-CHANNEL.md` + inbox olvasása; másik terminál fájlzárainak tiszteletben tartása.
- [ ] **A commit legyen pathspec-es, ne csak az `add`**: `git commit -- <fájlok>` (vagy
      `--only`). Az **index KÖZÖS** a párhuzamosan futó terminálokkal, ezért a szűkített
      `git add` önmagában nem véd: a pathspec nélküli `git commit` mindent bevisz, amit egy
      másik terminál épp stage-elt. Ez kétszer megtörtént velem egy napon —
      először `git add -A`-val (`962d391`, push előtt visszavontam), másodszor helyesen
      szűkített `add` mellett is (`f0f5cdd` bevitte a root `STATE.md`+`TODO.md`-jét).
- [ ] **Soha `git add -A` a platform-repóban** — a working tree más terminálok félkész munkáját
      is tartalmazza.
- [ ] Commit után `git show --stat` a **teljes** fájllistára — a `git status | grep` szűrt
      kimenete pont azt rejti el, amit ellenőrizni akarok.
- [ ] Mérés előtt Docker-állapot ellenőrzése, ha integrációs sáv is kell.

## P1 — M4: véges kapacitású ütemező (fut)

- [x] `ISchedulingSolver` port + kérés/megoldás modell (`83e403c`).
- [x] Determinisztikus referencia-ütemező (list scheduler: precedencia + partial release +
      véges kapacitás), 17 teszt.
- [x] **ADR-070 D3 determinizmus-kapu**: azonos bemenet → azonos revision-hash; a beadási
      sorrend megfordítása sem mozdítja.
- [x] **CP-SAT adapter a porton** (`0efc329`): `Google.OrTools` **9.15.6755** pin, `random_seed`
      konfigból + `num_search_workers = 1`; párhuzamos keresés **opt-in**, `IsReproducible = false`.
      Külön assembly (`Solver.OrTools`), nem az Infrastructure — a root elé tárva.
- [x] Az adapter és a referencia **ugyanazokon az eseteken** mérve: közös conformance-készlet,
      mindkét oldalon leszármazott. Ez fogta meg a referencia **FF/SF finish-korlát** hibáját.
- [x] Lockfile-ok + `--locked-mode` zöld (ADR-070 D4), minden OrTools runtime-alcsomag
      `contentHash`-sel pinelve.
- [x] **Push + CI** (Gábor engedélyével): run `30426082492` **zöld, 369 teszt** — ezzel a
      **linux-x64** natív bináris is mérve (glibc). ⚠ Alpine/musl továbbra sem mérve.
- [ ] Naptár-bekötés az ütemezésbe: a perc-idővonal ↔ `WorkingCalendar` (DST, kivételek) — ma a
      solver tiszta perc-idővonalon dolgozik. **Ez az M4 következő szelete.**
- [ ] **Root-döntésre vár:** ütköző fix kezdéseknél az adapter dob, a referencia elhelyezi és
      túllépi a kapacitást — a két stratégiának egyet kell mondania.

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

- [ ] **B2B-10 F1** (inbox `011`, a `010`-et váltja, archiválva) — indulás: **az M4 mérföldkő-
      review APPROVED-ja után**; három szeletben, mindegyik külön `review_requested`-tel.
      Kiírás: `docs/tasks/EPIC-B2B-COLLABORATION-2026Q3/B2B-10-F1-COLLABORATION-APPLICATION-LAYER.md`
- [ ] Nexus MCP-tunnel visszaállása után a lokális sorban várt levelek **újrakézbesítése**.

## Nem az én sávom (jelzés szintjén követem)

- Hosting/`DevelopmentIdentityOptions.EnabledModules` — Codex, ERPSEP-06 (root támogatja).
- Kontraktus-reviewer kijelölése a Doorstar oldaláról — az M4-bővítések review-jához kell.
