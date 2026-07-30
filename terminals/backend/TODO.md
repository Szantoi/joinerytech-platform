# BACKEND Terminal TODO

> **Frissítve:** 2026-07-30 este (Europe/Budapest)
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

## P1 — B2B-10 F5: a projekt-horgony feloldása (FUT)

Kiírás (**tervezet, root-kiadásra vár**):
[`B2B-10-F5-PROJECT-ANCHOR-RESOLUTION.md`](../../docs/tasks/EPIC-B2B-COLLABORATION-2026Q3/B2B-10-F5-PROJECT-ANCHOR-RESOLUTION.md)

- [x] **F5/0 — mérési szelet**: a Kernel elérhető és hitelesíthető; **egy token két API-t** szolgál
      ki (on-behalf-of); a bérlő-szűkítést a token `tid`-je hajtja (A **200** / B **404**); a
      gép-gép identitás **nem** tud bérlőt hordozni. **Kernel-módosítás nem kell.** `review_requested`.
- [x] **Platform-hiba javítva** (az F5/0 mellékterméke): a `spaceos_tenants` claim harmadik alakja
      → csendes **403** mind a 7 modulon. A/B bizonyíték, 89/89 zöld, mutáció 2 bukással.
- [ ] **F5/1 — a create-út** (Gábor döntése: a hiány **kimaradás** volt): munkacsomag-létrehozás
      parancs + végpont, ami **feltölti a horgonyt**. Ez teszi élővé a ma halott tárolt mezőt, és ez
      adja a feloldó adapter valós hívási pontját. **Egyetlen nyitott kérdéstől sem függ.**
- [ ] ⛔ **Root-jóváhagyást kér (a mérés után):** a hitelesítési út legyen **on-behalf-of**, és ezzel
      a `ProjectOwnerTenantId` mező **essen ki** — így a kernel-DTO bővítés, azaz a **Kernel-kapu
      elkerülhető**.
- [ ] **F5/2** — `HttpProjectAdapter`: typed `HttpClient`, **fail-fast** base-URL options
      (`ValidateOnStart`, üres alapérték — **nem** néma `?? "http://127.0.0.1:500x"` fallback),
      explicit hibatérkép (404 / 401-403 fail-closed / timeout külön), per-hívás timeout.
      Teszt: kézzel írt `HttpMessageHandler`-dublőr, **új NuGet nélkül**.
- [ ] **F5/3** — negatív kontroll mérve, és **kimondva, melyik réteg tartja** (a kernel 404-je vagy
      az adapter ellenőrzése).

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
