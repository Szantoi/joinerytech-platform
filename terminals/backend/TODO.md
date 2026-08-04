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
- [x] **PROJ-05 — Application + Infrastructure**: **KÉSZ, `review_requested`** (`dc3dc28`,
      30 fájl / 2301 sor). **58/58 zöld, 0 warning** tiszta build-cache-sel; **mutáció 3/3
      harapott** sha1-alkalmazva-bizonyítással. Részletek és a két menet közbeni lelet: `STATE.md`.
- [ ] **PROJ-06 — Api + host** (a §7.3-döntés óta **nem blokkolt**). `/api/projects/v1`, ETag/`If-Match`,
      `Idempotency-Key` a create-en, ADR-067 `RequireEnabledModule` kapu, ProblemDetails +
      correlation id; az **epic-hozzárendelés az F5/2 `HttpProjectAdapter` mintájával** ellenőrizze
      a FlowEpic létét on-behalf-of.

## P1c — Codex-munkatest átvétele (KIADVA, root 2026-08-03, inbox `2026-08-03_001`)

Gábor feloldotta (*„Bárki átveheti a codex munkát meg javítani is kell."*). **A gazda én vagyok.**
Öt szelet, **kitettség szerinti** sorrendben, **szeletenként külön `review_requested`**:

- [x] **S1 — hibaüzenet-redakció: KÉSZ, `review_requested`** (`6919666`, 20 fájl / +497 −114).
      **580/580 zöld** (EHS 124 / HR 213 / QA 243), 0 kód-warning; **mutáció 2/2** harapott.
      ⚠ **A hatóköre kisebb volt, mint a kiírásé:** a CRM és a Kontrolling mapperje **már
      07-16/07-18 óta javított** — a task-doksi tévesen sorolja ide őket.
      ⛔ **Külön hiba ugyanezekben a fájlokban:** a HR approve/reject a jóváhagyó személyét a
      **kliens törzséből** vette → a főágon **hamisítható** volt az audit-nyom. Javítva.
      ⭐ Ez helyesbíti a root S5-mérését: a hívó-identitás javítás **létezik**, csak az S1
      fájljain belül — ezért esett ki a „0 hozzáadott sor" mérésből.
      ⭐ **Amit hozzátettem:** negatív kontroll mind a 3 modulra. Mérve, hogy a meglévő
      validációs tesztek **csak státuszkódot** néznek, tehát egy túl agresszív redakció
      teljesen zölden ment volna ki (az M2-mutáció ezt igazolta).
- [x] **S2 — health-anonimizálás: KÉSZ, `review_requested`** (`89da08e`, 3 fájl / +121 −10).
      A `MapModuleHealth` válasza már csak `{ status }`; az unhealthy marad **503**.
      **82/82 → 85/85 zöld**, 0 warning, izolált `HEAD`-másolatból mérve (hogy az S3
      Auth-változásai ne szennyezzék); **mutáció 3/3 harapott** sha1-alkalmazva-bizonyítással.
      ⚠ **A ⛔ indok NEM állt:** a főágon a `MapModuleHealth`-nek **nulla hívója** van
      (`git grep HEAD`) — futó host ma nem ad ki `migrationsAssembly`-t. A téves súlyosságot
      az **ERPSEP-05 doksi** 07-28-i bejegyzése okozta, ami késznek írta a sosem commitolt
      javítást. Mérve a tényleges felület: 7 host sima `Healthy`-t ad, 3 host (dms,
      collaboration, joinery) a **modul nevét** — verzió/assembly **sehol**.
      ⭐ **Amit hozzátettem:** az `.AllowAnonymous()` réteg őrizetlen volt — fallback-policy
      alatt a probe 401-et adna, és a 82 meglévő teszt közül egy sem venné észre (M2 bizonyítja).
      ⚠ **Mérés-érvényesség:** az első alapállapot 4 bukást adott, mert **nem futott a Docker**
      (mind 1 ms); a Docker a mérés közben indult el → **újramértem**. Ezek a tesztek Docker
      nélkül **buknak, nem kimaradnak** → a suite „zöldje" csak futó Dockerrel jelent valamit.
- [x] **S3 — `EnabledModules`: KÉSZ, `review_requested`** (`4e880f6`, 7 fájl / +121 −5).
      Dev-identitás modul-entitlementje a Keycloak-úttal azonos JSON-tömb claim-alakban;
      üres lista → nincs claim → a kapu tilt; Keycloak-módban a `Development:EnabledModules`
      jelenléte **indulási hiba**. **85/85 → 90/90 zöld**, 0 warning; **mutáció 4/4 harapott**.
      ⭐ M3-lelet: a flat-claim fallback **megengedő** — sérült wire-alakkal is átengedett
      volna a kapu; egyedül az egzakt claim-alak teszt fogta. A maintenance `Program.cs`/`csproj`
      (bootstrap + NuGet) **nem került be** — ERPSEP-05, külön szelet.
- [x] **S4 — Kontrolling portfolio-index: KÉSZ, `review_requested`** (`46e3fdc`).
      O(P×A) → O(P+A); **190/190 → 192/192 zöld**; mutáció 3/3 — de az M3 (törölt-szűrő)
      a Codex tesztjeivel **túlélt volna**: a meglévő deleted-teszt csak a régi utat járta →
      saját tanú-teszt. Izolált mérés: platform HEAD + **kernel-submodule HEAD** Domain
      (a kernel munkafájában idegen commitolatlan módosítás ül, a csproj-t is érinti).
- [x] **S1-kiegészítés — Kontrolling fallback-ág: KÉSZ, `review_requested`** (`21c603b`).
      A `_` ág a `result.Errors`-t 400-ként kiöntötte → generikus 500. **Helyesbíti a saját
      S1-jelentésem** („a Kontrolling már javított" — csak a nevesített ágakra igaz).
      Súlyosság mérve: élő handler nem ad `Error`-t — az egyetlen ilyen handler
      (`DeleteCostAdjustmentCommand`) **halott fa** (két párhuzamos delete-parancs a modulon
      belül; az élő a 409-es `DeleteAdjustmentCommand`). 194/194 zöld; mutáció 2/2
      (M2: túl agresszív redakció — 4 endpoint-teszt is fogja). Root-döntésre: a halott
      delete-fa törlése; S5-kiíráskor kapu legyen, hogy a rögzített identitás a claimből jön.
- [ ] **S5 — audit-identity**: a root **mérte**, hogy a nevesített hatóköre **nincs meg**
      (0 CRM-fájl, 0 audit-mező; csak a segéd van a főágon) → `review`-ből **`pending`**-re
      minősítve. **Külön kiírást kér, nem átvételt.**

- [ ] ⛔ **S1b (JAVASLAT, root-döntésre) — ugyanez az osztály HAT másik modulban**, amit a
      kiírás **nem nevez meg**. Mérve az S1 után: `.Errors` kiöntése HTTP-válaszban — **cutting 20 ·
      joinery 16 · inventory 9 · procurement 8 · maintenance 8 = 61 hely**; `ex.Message` a
      válaszban — dms 2 · procurement 1 · cutting 1 = **4 hely**. A maintenance és a dms a hét élő
      modul közül való, az inventory/procurement pedig **futó VPS-service**. Nem tágítottam rá az
      S1-et (61 hely egy blokkban pont az, amit a szeletelés elkerülni akart).
      ⚠ **Triázs kell előtte:** a `spaceos-modules-*` fák között bizonyítottan van halott
      (a két EHS-fa) — a halottat **törölni** kell, nem javítani.
- [ ] **Külön lelet, nem S1:** `AutoMapper` **14.0.0 — ismert MAGAS súlyosságú sebezhetőség**
      (`GHSA-rvv3-g6hj-g44x`); a 13.0.2-es pin nem oldható fel, ezért a 14.0.0 kerül be az EHS-be.
      A repó publikus, a modul fut.

⚠ **Két csapda a kiírásból:** (1) a munkafa **nem** tiszta Codex-munkatest — **fájl-szintű
pathspec kötelező, `git add -A` szigorúan tilos**; (2) a mentett patch **átvilágítatlan**
(53 titok-szerű minta) és a repó **publikus** — a patch `.gitignore`-olt, **ne** kerüljön be.

⚠ **Helyesbítés a kiíráshoz:** a root a `SequentialProjectCodeAllocator` + `ProjectCodeCounter` +
`20260803210000` fájlokat „félkész PROJ-06 munkaként" látta a fán. Ezek **PROJ-05 (Infrastructure)**
tételek, **készek, mérve és commitolva** (`a4d255c`) — a fa azóta tiszta.
- [x] ✅ **§7.2 ELDÖNTVE (Gábor, 2026-08-03):** *„Igen a CRM-ből **is** születhet."* → **mindkét**
      származás jogos; a create-út **rendelést nem követelhet**. A `Project` opcionális, **opak**
      `OriginRef`-et kap (a `CustomerId` mintájával) — a rendelés tételei/ára/száma a CRM-nél
      marad. **Az irány: CRM → projects, soha visszafelé** (`D1`, ADR-072 §7.2).
      ⚠ A **számosságot** (egy rendelés ↔ egy projekt?) **nem** döntöttem el (`D4`) — a v1 egyetlen
      hivatkozást visz, az N:M-re váltás az opak hivatkozás miatt additív marad.
- [x] ✅ **§7.3 ELDÖNTVE (Gábor, 2026-08-03):** `PRJ-<négyjegyű év>-<sorszám>` (a Kontrolling
      alakja; a portál `2426`-os kódolása elvetve), **bérlőnként külön, évente újrainduló**
      számláló, **a modul adja ki**. Leszállítva (`a4d255c`): `SequentialProjectCodeAllocator` +
      `project_code_counters` tábla RLS-sel; a kiadás **egyetlen** `INSERT … ON CONFLICT DO
      UPDATE … RETURNING`. **Ezzel az ADR-072 §7 mind a három kérdése eldőlt.**
      ⚠ Két kimondott korlát: az **év UTC** szerint dől el (bérlőnkénti időzóna nélkül — ha
      számít, **új döntés**), és a sorszám **hézagos** lehet.
      ⛔ **A PROJ-06 ezzel nem blokkolt többé.**
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
