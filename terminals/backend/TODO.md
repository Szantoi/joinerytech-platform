# BACKEND Terminal TODO

> **Frissítve:** 2026-07-31 délután (Europe/Budapest)
> **Részletes állapot:** [`STATE.md`](STATE.md)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a `done` kimondása root-review joga
>
> A lezárt körök (B2B-10 F1–F3X, scheduling M1–M4) részletes checklistái **kikerültek** ebből a
> fájlból — a bizonyítékuk a `STATE.md`-ben, az outbox-jelentésekben és a commit-üzenetekben van.

## P0 — minden folytatás előtt

- [ ] Friss `AGENT-CHANNEL.md` + **inbox** olvasása; másik terminál fájlzárainak tiszteletben tartása.
- [ ] **A commit legyen pathspec-es, ne csak az `add`**: `git commit -- <fájlok>` (vagy `--only`).
      Az **index KÖZÖS** a párhuzamosan futó terminálokkal, ezért a szűkített `git add` önmagában
      nem véd. Ez kétszer megtörtént velem egy napon.
- [ ] **Soha `git add -A` a platform-repóban** — a working tree más terminálok félkész munkáját is
      tartalmazza. **Idegen fájlt akkor sem javítok**, ha piros: a másik sáv gazdája fejezze be.
- [ ] Commit után `git show --stat` a **teljes** fájllistára — a `git status | grep` szűrt kimenete
      pont azt rejti el, amit ellenőrizni akarok.
- [ ] **Exit-kódot soha ne csővezetéken át olvass.** `dotnet build … | tail` → a shell a `tail`
      kódját adja vissza; 2026-07-30-án így jelentettem „build rendben"-t egy **bukott** buildre.
      Kimenetet **fájlba** (`> log 2>&1; echo "EXIT=$?"`), a verdiktet külön nézd meg.
- [ ] **Mutációs kör után `git diff`** — a visszaállító hibás lehet: ha ugyanazt a fájlt kétszer
      mentetted el, a restore a **mutált** állapotot hozza vissza (2026-07-30-án be is commitolódott).
- [ ] **Mérés előtt Docker-állapot**, utána **takarítás**:
      `docker ps -aq --filter "label=org.testcontainers=true"`. ⚠ A `doorstar-production-db` **nem az enyém**.
- [ ] Ha egy bukás futásideje ~**1 ms**, előbb a **fixture** épségét nézd, ne a kódot.

## P1 — B2B-10 F5: a projekt-horgony feloldása (FUT — **KIADVA**, root 2026-07-31)

Kiírás: [`B2B-10-F5-PROJECT-ANCHOR-RESOLUTION.md`](../../docs/tasks/EPIC-B2B-COLLABORATION-2026Q3/B2B-10-F5-PROJECT-ANCHOR-RESOLUTION.md)
· a három root-döntés az inbox `2026-07-31_001`-ben (on-behalf-of kérés-hatókörű korláttal ·
`ProjectOwnerTenantId` törölve · hatókör elfogadva)

- [x] **F5/0 — mérési szelet**: **APPROVED** (root, 2026-07-31, saját méréssel). A platform-hiba
      javítása (`spaceos_tenants` 3. alak → csendes 403) is átment, `e0b922d` origin/main-en.
- [x] **F5/1 — a create-út**: **APPROVED** (root, 2026-07-31, saját mérés + saját mutáció; inbox
      `2026-07-31_002`). A létrehozó-user-nem-perzisztálódik korlát elfogadva, MOST nem kell.
- [x] **F5/2 — `HttpProjectAdapter`**: **`review_requested`** (`d2b9689`, origin/main-en). Hívási
      pont kimondva: a **create-út scope-validálása**. On-behalf-of kérés-hatókörű dekrétum kódban;
      hibatérkép 404→null · 401/403→502 · timeout/5xx→503; fail-fast options; E2E primary-handler
      kernel-stubbal, bearer-továbbítás állítva. **277/277 unit + 53/53 integrációs, 0 warning;
      mutáció 4/4.** Outbox: `2026-07-31-b2b10-f5-2-http-project-adapter-review-requested.md`.
      ⚠ DEPLOY: az éles hostnak kell a `Collaboration:Kernel:BaseUrl` (fail-fast) — Gábor-kapu.
- [ ] **F5/3** — negatív kontroll (**kiadásra vár**): idegen bérlő tokenjével a feloldás semmit ne
      adjon, valódi Kernellel mérve, és **kimondva, melyik réteg tartja** (a kernel 404-je vagy az
      adapter). A mérőeszköztár az F5/0-ból megvan (eldobható KC24 + kernel + collaboration host).
      + ide tartozik: az epic↔projekt viszony NEM ellenőrizhető a mai kernel-válaszból (nincs benne
      projekt-id) — kimondandó, F4-kontraktus-anyag.

## P2 — Scheduling: M5 (írási irány) + két nyitott kontraktus-döntés

Az M4 mérföldkő **APPROVED** (CI: 430 zöld). A kód a **külön** `spaceos-modules-scheduling` repóban.

- [ ] **M5 — írási irány**: a run-folyamat endpointjai az ADR-069 2. fázisa szerint.
- [ ] ⛔ **DÖNTÉSRE VÁR** — Proposal **kapacitás-ütközés mező**: ugyanabból a detektorból kell
      jönnie, mint az `overload`, az viszont **valós időben** dolgozik, a proposal meg
      munkaperceket közöl. Javaslat: additív `startUtc`/`finishUtc` az `OperationPlan`-en.
      **Enélkül nem kezdhető el.**
- [ ] ⛔ **DÖNTÉSRE VÁR** — `releaseThresholdFraction` a wire-on: ha kimegy és **kimarad a
      hash-ből**, két különböző tartalom azonos hash-t kap; ha bekerül, a partial-release-es tervek
      hash-e **egyszer mozdul**. Javaslat: kerüljön be **alapérték-kihagyással**, és a mozdulást
      **mondjuk ki** a Doorstarnak.

## P3 — sandbox (a VPS-lépések Gábor-kapusak)

Terv: [`SCHEDULING_SANDBOX_PLAN.md`](../../docs/knowledge/deployment/SCHEDULING_SANDBOX_PLAN.md)

- [ ] Seed-script (idempotens): v1/v2 fixture-ből terv + naptár-kivétel + **karanténba tett** standard.
- [ ] A helyszíni RLS-ellenőrzés futtatható alakja (a proof `(a)`–`(h)` tényei a sandbox DB-n).
- [ ] Füst-próba a **generált TS-klienssel**, nem curl-lel.
- [ ] ⚠ **Gábor jóváhagyása nélkül semmilyen VPS-parancs.**

## P4 — nyitott tételek, amiket követek

- [ ] **Idempotencia-rekordok takarítása** — üzemeltetési feladat, a pilot előtt ütemezni kell.
- [ ] **F4** (nem az én kiírásom): publikált OpenAPI a Doorstarnak + generált kliens. **A
      wire-enumok alakja ott dől el** — szándékosan nem találtam ki előre.
- [ ] **Alpine/musl RID-mérés** a schedulingben — ma nem blokkoló, konténeresítéskor kötelező.
- [ ] **Jelzés a Kernel csapatának**: friss klónon a kernel nem fordul a `keys/dev-private-key.pem`
      nélkül. **Nem javítom** — Kernel-kapu.
- [ ] A .NET CI-kapu **6/15 projektet** mér; a többi a privát kernel-submodule miatt PAT-ot
      igényelne → **Gábor-döntés**. Amíg nincs, a saját suite-jaimat kézzel futtatom.
- [ ] Nexus MCP-tunnel visszaállása után a lokális sorban várt levelek **újrakézbesítése**.

## Nem az én sávom (jelzés szintjén követem)

- Kontraktus-reviewer a Doorstar oldaláról · portál-oldali B2B-08 újraépítés az F4 kliensére.
- CRM RLS (Codex P1) — **kiosztatlan**.
