# BACKEND Terminal TODO

> **Frissítve:** 2026-07-31 este (Europe/Budapest)
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
      `docker ps -aq --filter "label=org.testcontainers=true"` — a **`-a`** nem elhagyható:
      2026-07-31-én egy leszakadt Testcontainer **három órán át futott**, mert a sima `docker ps`-en
      nem tűnt fel. ⚠ A `doorstar-production-db` **nem az enyém**.
- [ ] Ha egy bukás futásideje ~**1 ms**, előbb a **fixture** épségét nézd, ne a kódot.

## P1 — B2B-10 F5: a projekt-horgony feloldása (FUT — **KIADVA**, root 2026-07-31)

Kiírás: [`B2B-10-F5-PROJECT-ANCHOR-RESOLUTION.md`](../../docs/tasks/EPIC-B2B-COLLABORATION-2026Q3/B2B-10-F5-PROJECT-ANCHOR-RESOLUTION.md)
· a három root-döntés az inbox `2026-07-31_001`-ben (on-behalf-of kérés-hatókörű korláttal ·
`ProjectOwnerTenantId` törölve · hatókör elfogadva)

- [x] **F5/0 — mérési szelet**: **APPROVED** (root, 2026-07-31, saját méréssel). A platform-hiba
      javítása (`spaceos_tenants` 3. alak → csendes 403) is átment, `e0b922d` origin/main-en.
- [x] **F5/1 — a create-út**: **APPROVED** (root, 2026-07-31, saját mérés + saját mutáció; inbox
      `2026-07-31_002`). A létrehozó-user-nem-perzisztálódik korlát elfogadva, MOST nem kell.
- [x] **F5/2 — `HttpProjectAdapter`**: **APPROVED** (root, 2026-07-31, saját mutációval).
      ⚠ DEPLOY-BLOKKOLÓ a Gábor-listán: az éles hostnak kell a `Collaboration:Kernel:BaseUrl`.
- [x] **F5/3 — negatív kontroll**: **`review_requested`**. Élő Kernellel: idegen epicre **422 +
      0 sor** (fantom-esettel megkülönböztethetetlenül), saját epicre **201** (pozitív kontroll);
      a kernel A/B mátrix mindkét irányban zár. **Kimondva: a vonalat a Kernel tartja, EGYEDÜL** —
      nem védelem mélységben, és a mi suite-unk (stub) nem tudná elkapni a kernel-regressziót.
      Jegyzőkönyv: `KERNEL_ANCHOR_NEGATIVE_CONTROL_2026-07-31.md`. Takarítás kimondva.
- [ ] **Az F5 négy szelete lefutott** → a kritikus úton az **F7** következik (root-kiírásra vár).

## P1b — `spaceos.projects` ÚJ MODUL (FUT) — Gábor termékdöntése + kivitelezési kérése

Terv: [`ADR-072`](../../docs/knowledge/adr/ADR-072-projects-module-ownership.md) (**javaslat,
Gábor elé megy** — az elfogadás az ő joga) · ✅ **KIADVA**: `EPIC-PROJECTS-MODULE-2026Q3` /
**`PROJ-01` `in_progress`** (inbox `2026-07-31_005`).

**Root kötelező kapu-sora a PROJ-01-hez — ezek nélkül nem jelenthetek review-t:**

- [ ] **Hosting-csomag a kezdetektől** (ADR-061/062): közös `TenantResolver` +
      `SpaceOsTenantSessionInterceptor` **DI-ből** + RLS-baseline **`FORCE`**-szal.
- [ ] **Interceptor-E2E a CRM-pilot mintájára** (`6f1ef5f`), **nem kézi tükör** — és ha a
      no-tenant fail-closed mögött **nincs második réteg**, azt ki kell mondani.
- [ ] **Valódi Testcontainers-PostgreSQL** + **modell↔séma konformancia-teszt** (InMemory elvileg
      sem lát hiányzó oszlopot — az F1 három defektusának tanulsága).
- [ ] **Mutáció-bizonyíték minden új kapura**, alkalmazva-bizonyítással, tiszta build-cache-sel.
      ⚠ Közös fában mutációt **csak akkor**, ha semmilyen build nincs röptében.
- [ ] **NE égessem be:** a `ProjectCode` formátumát (konfigurálható vagy halasztott — és a
      jelentés mondja ki, melyiket választottam és miért) és a **wire-enum alakját**.

- [x] **PROJ-01 mérés** — négy fogyasztó, nulla forrás; a portál `/w/projects` **élő route**, de
      mockból él; a Kontrollingnak **két** párhuzamos, stubolt projekt-portja van.
- [x] **PROJ-02 ADR-072** (`9cb6736`) — önálló `spaceos.projects`; v1 = az azonosság és semmi több;
      névadás-szétválasztás `EpicRef`/`ProjectRef`.
- [x] **PROJ-04 domain-mag** (`eb11735`) — `Project` + `ProjectCode` + `ProjectEpicAssignment` +
      `EnsureEpicUnassigned`. **16/16 zöld, 0 warning; mutáció 2/2 harapott**, visszaállítva.
- [ ] **PROJ-05 — Application + Infrastructure**: repository-port; create/rename/status/epic-assign
      parancsok; **opcionális `OriginRef`** a §7.2-döntés miatt (opak, nullable — a create-parancs
      **nem** teheti kötelezővé); EF-konfiguráció (`ProjectCode` konverter, **bérlőnként egyedi**
      kód-index);
      tenant query filter + **RLS-migráció a hosting-baseline `NULLIF(...)` alakjával** (a csupasz
      `current_setting(...)::uuid` a pool-reset üres értékén 22P02-t dobna); **modell↔séma
      konformancia-teszt valódi Postgresen** (InMemory elvileg sem lát hiányzó oszlopot).
- [ ] **PROJ-06 — Api + host**: `/api/projects/v1`, ETag/`If-Match`, `Idempotency-Key` a create-en,
      ADR-067 `RequireEnabledModule` kapu, ProblemDetails + correlation id. Az **epic-hozzárendelés
      az F5/2 `HttpProjectAdapter` mintájával** ellenőrizze a FlowEpic létét on-behalf-of.
- [x] ✅ **§7.2 ELDÖNTVE (Gábor, 2026-08-03):** *„Igen a CRM-ből **is** születhet."* → **mindkét**
      származás jogos; a create-út **rendelést nem követelhet**. A `Project` opcionális, **opak**
      `OriginRef`-et kap (a `CustomerId` mintájával) — a rendelés tételei/ára/száma a CRM-nél
      marad. **Az irány: CRM → projects, soha visszafelé** (`D1`, ADR-072 §7.2).
      ⚠ A **számosságot** (egy rendelés ↔ egy projekt?) **nem** döntöttem el (`D4`) — a v1 egyetlen
      hivatkozást visz, az N:M-re váltás az opak hivatkozás miatt additív marad.
- [ ] ⛔ **Gábor-döntésre vár, amikor blokkolóvá válik** (ADR-072 §7.3): a **`ProjectCode`
      FORMÁTUMA** és egyediségi köre, a create-végpontnál (PROJ-06). Erre **nem tettem
      javaslatot**, tehát nincs hallgatólagos válasza. A „ki generálja" felét viszont a §7.2
      válasza leszűkíti: **két független hívó ⇒ szerver-oldali kiadás** (`D3`) — ezt a PROJ-06
      jelentése mondja ki, nem hallgatólagosan valósítja meg.
- [ ] A **§7.1 eldöntve** (függőségek = Collaboration-projekciók), de nyitva maradt benne: a
      **házon belüli** szakma-függőség nem fér a Collaboration kétoldalú modelljébe → ha előjön,
      **új döntés**, nem csendes `Dependency` tábla.
- [ ] ⛔ **F4-blokkoló — root által megerősítve, de HELYESBÍTVE:** a wire-alak ma **nem**
      kétértelmű (a `WorkScopeDto` külön `ProjectId`/`EpicId`-t hord, a `ProjectReference`
      `FlowEpicId`-t az F5/2 óta) — a baj az, hogy **nincs mögötte semmi ellenőrizhető**. Az F4
      szerződése mondja ki: a `projectId` **opak korrelációs azonosító**, és a PLAN-03 *„a platform
      validál"* ígéretét a Project-mezőre ma **nem tartjuk be**.
- [ ] Az ADR-072 elfogadásakor Gábornak ki kell mondania, hogy az **ADR-066 §9.1 felülírt**
      (07-21: „a `ProjectRef` tulajdonosa a Kernel `FlowEpic`") — különben két ADR két
      tulajdonost nevez meg ugyanarra a fogalomra.

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
