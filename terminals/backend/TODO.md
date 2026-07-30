# BACKEND Terminal TODO

> **Frissítve:** 2026-07-30 délelőtt (Europe/Budapest)
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

## P1 — B2B-10 F3: Collaboration API + grant-alapú authorization (FUT)

Kiírás: [`B2B-10-F3-COLLABORATION-API-AUTHORIZATION.md`](../../docs/tasks/EPIC-B2B-COLLABORATION-2026Q3/B2B-10-F3-COLLABORATION-API-AUTHORIZATION.md)

- [x] **F3/1 — authorization-mag** (`0b555f0`): képesség-szótár, egyetlen döntési hely, spoofing-kapu
      a betöltés ELŐTT, 404 a nem-részesnek / 403 a részes-de-tiltottnak. 144/144 zöld, **6/6 mutáció**.
      **ROOT-REVIEW: APPROVED** (2026-07-30, root-mutációk M-A/M-B is megfogva).
- [x] ⛔→✅ **Gábor döntött (2026-07-30):** a megállapodás **részvétel-alapú marad**; amit hordoz, az grant-köteles.
- [x] **F3/2** — API-projekt + host, csoport-szintű `RequireAuthorization` + `RequireEnabledModule`,
      caller-context a tokenből, ProblemDetails + correlation ID, olvasás külön képességgel.
      **158/158 unit + 25/25 integrációs zöld.** `review_requested`.
- [x] **F3/3a** — `If-Match`/ETag: kötelező a munkacsomagon (428), a jogosultság UTÁN ellenőrizve
      (verzió-orákulum kizárva), 412/409/428/400 elkülönítve, EF-kivétel lefordítva a repositoryban.
- [x] **F3/3b** — `Idempotency-Key` **tartós tárral**: tábla + unique index + RLS + megakadt foglalás
      újrahasznosítása; az ujjlenyomat tartalmazza a törzset. ⚠ A rekord-takarítás nincs telepítve.
      **175/175 unit + 34/34 integrációs zöld, 9/9 mutáció.** `review_requested`.
- [x] **F3/4** — `allowedActions` a **domainből** + paritás-teszt (próbálgatásos orákulum), a
      B2B-07-es táblázat törölve; `AgreementReadModel` valódi projekciója + `GET /agreements/{id}`
      + ETag → az `If-Match` a megállapodáson is kötelező. Gábor döntése: a lezárt állapot lezárt.
      **218/218 unit + 39/39 integrációs zöld, 5/5 mutáció.** `review_requested`.
- [x] ✅ **Root döntött:** a `Disputed` **marad**; az „elérhetetlen" őr-teszt root-döntés nélkül
      **nem törölhető**, és a komment megnevezi az F0-döntést. Kész.
- [x] **F3X — sorrend-bizonyíték** (a root háromszor átvitt tétele): nem-részes írás hibás
      `If-Match`-csel → 404 mindkét úton. **A mérés lényege:** valódi adaton a DB-réteg tart
      (RLS + EF-szűrő elvágja a betöltést, az E2E mutációval is zöld), a **sorrendet** az
      in-memory teszt szögezi le — az fogja a mutációt (1 bukás). `review_requested`.
- [x] **F3/5** — végpont-szintű bizonyíték **valódi PostgreSQL-en**: E2E host a produkciós
      infrastruktúra-regisztrációval, NOSUPERUSER/NOBYPASSRLS szerepen. **ME1: interceptor nélkül
      6/7 E2E bukik** → az ADR-062 interceptor bizonyítottan lefut a kérés útján (a platform-lelet
      ERRE a modulra lezárva). ME4 a negatív kontroll: mind a három réteg nélkül a suite bukik.
      **226/226 unit + 46/46 integrációs zöld.** `review_requested`.
- [x] ⚠ **Saját baleset javítva:** a rétegvizsgálat visszaállítója bent hagyott egy mutációt (a
      munkacsomag query-filtere kikapcsolva) — és a TELJES suite zöld maradt vele, mert a rétegek
      fedezik egymást. Új szerkezeti teszt nézi, hogy a szűrők ott vannak-e.

## P1 — B2B-10 F3 KÉSZ, ami utána jön

- [ ] **F4** (nem az én kiírásom): publikált OpenAPI a Doorstarnak + generált kliens. A wire-enumok
      alakja (`"Proposed"`) itt dől el — szándékosan nem találtam ki előre.
- [ ] Az F3 öt szeletéből négy **root-review-ra vár** (F3/1 már APPROVED).

## P1 — M4: véges kapacitású ütemező (a BELSŐ hatókör kimerült)

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
- [x] **Naptár-bekötés** (`b02616b`): `WorkingTimeline` (munkaperc ↔ abszolút idő, DST-helyes)
      + `ScheduleMaterialiser` (valós dátumok + **valós idejű precedencia-őr**). Gábor döntése:
      minden művelet átnyúlhat a nem-munkaidőn, a duration munkaidőben értendő.
- [x] **Az M4/2 kötelező utókövetése** (`5957459`): az ütköző fix kezdéseket a **validator**
      utasítja vissza, mindkét stratégia előtt (Gábor döntése; 6 validator-teszt + conformance).
- [x] **Push + CI** a `5957459` és `b02616b` commitokra: run `30428183130` **zöld, 392 teszt**.
- [x] **`lagKind`** (`d63f317`) — Gábor döntése: additív mező, alapérték `working`. A valós
      idejű lagot **egyeztetés** oldja meg (solve → dátumozás → naptár-átváltás → újra),
      mert a naptár-mentes solver nem tudja kifejezni; nem konvergálás esetén jelez.
- [x] **Push + CI** a `d63f317`-re: run `30438753129` **zöld, 398 teszt** (lokálisan is, Dockerrel).
- [x] **ADR-070 kiegészítő jegyzet**: a külön solver-assembly indoklása (root kérte az
      APPROVED-ban) — benne a mért RID-lefedettség; ⚠ Alpine/musl továbbra sem mérve.
- [x] A solver **DI-bekötése** (`7cd7276`): a stratégia konfigurációs döntés (`reference` az
      alapérték a natív bináris miatt, `cpsat` opt-in), ismeretlen név = indulási hiba, az
      options configból, + a CalendarAwareScheduler. A run-folyamat ENDPOINTJA külön (2. fázis).

## P1 — a 4 additív kontraktus-bővítés (M3-verdikt P2-i)

Rögzítve a [PLAN-03 doksi végén](../../docs/tasks/EPIC-PRODUCTION-PLANNING-2026Q3/PLAN-03-SCHEDULING-IMPLEMENTATION.md);
mind additív, a kézbesített `1.0.0-preview.1` nem törik.

- [ ] ⛔ **DÖNTÉSRE VÁR** — Proposal **kapacitás-ütközés mező**: ugyanabból a detektorból kell
      jönnie, mint az `overload` (root előírás), az viszont **valós időben** dolgozik, a
      proposal meg munkaperceket közöl. Javaslat: additív `startUtc`/`finishUtc` az
      `OperationPlan`-en, a mező arra épül. **Enélkül nem kezdhető el.**
- [ ] ⛔ **DÖNTÉSRE VÁR** — `releaseThresholdFraction` a wire-on: ha kimegy és **kimarad a
      hash-ből**, két különböző tartalom azonos hash-t kap; ha bekerül, a partial-release-es
      tervek hash-e **egyszer mozdul** (a Doorstar visszaidézi). Javaslat: kerüljön be
      **alapérték-kihagyással**, és a mozdulást **mondjuk ki** a Doorstarnak.
- [x] „Erőforrásprofil-revízió" tisztázva az ADR-069 §6-ban: **nem külön fogalom**, a
      naptár-revízió fedi.
- [x] `lagKind` (`d63f317`) — a **wire-alakja** az 1–2. döntéssel egy körben megy ki.
- [x] Művelet-„név" döntés kimondva: **marad a stabil kulcs**, emberi név nem megy ki; ha kell,
      additív `displayName` „csak megjelenítésre".

## P1 — Codex biztonsági leletek (Gábor osztotta ki, 2026-07-29)

- [x] **Triage**: a CRM RLS-lelet a **legacy** fára vonatkozott; az élő `src/SpaceOS.Modules.CRM/`
      a hosting `RlsMigrationSql`-t használja (ENABLE + FORCE + `app.current_tenant_id`).
- [x] **Legacy CRM + DMS fa törölve** (`71ca8ff`, 192 fájl) — a hibás RLS-t telepítő kockázat
      megszűnt. ⚠ A `src/spaceos-modules/` alatt a Kontrolling **élő**; a **HR nem vizsgált**.
- [x] **DMS ACL 1. szelet** (`d15f6e7`): fail-closed szabály + `OwnerUserId` + migráció, 12 teszt.
- [x] **DMS ACL 2. szelet — A RÉS BEZÁRVA** (`6554a09`): caller-kontextus a claim-ekből, ACL a
      6 FSM-átmenetben (közös bázis), verzió-feltöltésben és az egy-dokumentumos olvasásban;
      404 a nem láthatóra / 403 a látható-de-tiltottra. **A létrehozó a tulajdonos** (saját rés,
      menet közben találva: enélkül minden új dokumentum a legacy-kivétel alá esett volna).
- [x] **DMS ACL 3. szelet — a grantek PERZISZTÁLÁSA** (`ae9883b`): a navigáció Ignore()-olva volt,
      nem volt tábla; fail-closed + nem tárolt grant = „csak a tulajdonos, örökre". Migráció +
      szülőn átívelő RLS + integrációs round-trip bizonyíték.
- [x] **DMS ACL 4. szelet — a LISTA szűrve** (`3039396`): SQL-ben, kötelező caller-paraméterrel,
      + **parity-teszt** (a kifejezés-fa és a memóriabeli ellenőrzés ugyanazt mondja). Ezzel a
      **Codex P1 DMS-ága lezárult**: szabály → bekötés → tárolás → lista. `review_requested`.
- [x] A migráció bizonyítása **valódi Postgresen**: a Docker elindult, **DMS 90/90 zöld** a
      11 integrációs teszttel együtt (migráció + RLS-izoláció nem-superuser szerepen).
- [ ] Nem az én sávom, de követem: **P2-k** (SSE kapcsolat-korlát/backpressure,
      `costMonitoringService` nem takarított Map-jei, CRM/Kontrolling korlátlan listák) —
      **kiosztatlanok**.
- [x] **DMS model-snapshot** bevezetve (`43753b1`): a generált migráció eddig az egész sémát
      újraírta. Bizonyíték: a snapshot után egy újabb `migrations add` ÜRES `Up()`-ot adott.

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
