# PLAN-03 — `spaceos.scheduling` modul implementáció (M1-M5)

- **Szerep:** backend (backend terminál sávja)
- **Prioritás:** P0 (a Doorstar a kontraktus-publikációra vár)
- **Státusz:** **M1 DONE · M2 DONE** (root-review, 2026-07-28, ef497b6 — 238/238, 9 tábla FORCE RLS, CalendarException + v1/v2 pin-korrekció) · **M3 FUT** (Doorstar-kapu) · M4-M5 pending
- **Függőség:** `PLAN-02 = done` (ADR-069 ACCEPTED — minden döntés ott)
- **Kimenet:** futó `spaceos.scheduling` modul-host, publikált OpenAPI 3.1,
  RLS-proof gate-artefakt, sandbox-kiajánlás

## Normatív alapok (kötelező olvasmány, EBBEN A SORRENDBEN)

1. `docs/knowledge/adr/ADR-069-planning-domain-and-product-package.md` — MINDEN
   architektúra-döntés itt van (aggregátumok, FSM, API, biztonság, nevek).
2. `docs/knowledge/architecture/PLANNING_CAPABILITY_AUDIT_2026-07-27.md` —
   fájl:sor bizonyítékok + a követendő minták (hosting §5.1, RlsFixtures §5.2).
3. `docs/knowledge/patterns/DATABASE_PATTERNS.md` + ADR_CATALOGUE.md + Nexus RAG.
4. Doorstar input-pack v1 (13 vektor) — a kompatibilitási CI-kapu fixture-e.

## Kemény szabályok

- ModuleId: `spaceos.scheduling`; repo: **`Szantoi/spaceos-modules-scheduling`
  (LÉTREHOZVA 2026-07-28, public, üres)** — ide dolgozol; a platform-repo fájába
  NEM kerül a modul-kód (nem source-submodule, ADR-067/ERPSEP-04 minta); séma:
  `scheduling`; API-bázis: `/api/scheduling/v1`.
- A magban EGYETLEN faipari szó sem lehet (ADR-067 regex-őr) — a faipari
  taxonómia a `joinerytech.scheduling-standards` rétegé (KÉSŐBBI task).
- Kernel-kapcsolat KIZÁRÓLAG `ProjectRef` opak referencián át; Kernel-kód tilos.
- Hosting-minta kötelező (AddSpaceOsModuleAuth/Tenancy + GUC-interceptor +
  RlsMigrationSql FORCE RLS + EF query filter); Maintenance-host a másolandó váz.
- Worker: NOBYPASSRLS; keresztbérlős részművelet csak szűk SECURITY DEFINER-ben.
- Éles/VPS művelet és sandbox-kiajánlás: Gábor-kapu.

## Mérföldkövek (ADR-069 §11) — mindegyik végén review_requested

- **M1 — kalkulációs mag + kompatibilitási kapu:** elapsed/labour/days képletek
  + FS/SS/FF/SF+lag+partial-release+fixed-override bound-feloldás (precedencia
  az ADR §4 szerint); a 13 Doorstar-vektor hash-pinnelt C# CI-teszt zölden.
  TIPP: tiszta, IO-mentes számítási könyvtárként kezdd (Domain + unit-tesztek),
  host nélkül — ez gyorsan bizonyítható.
- **M2 — domain + perzisztencia + RLS-proof:** aggregátumok (ScheduleRun/
  ScheduleRevision, OperationPlan, DependencyEdge, Resource/ResourceCalendar/
  CalendarException, CapacityReservation, OperationStandard/StandardRevision,
  SchedulingAuditLog + outbox), migrációk, NonSuperuserRlsFixture proof-suite
  (4 fact minden táblára), host-váz + /health.
- **M3 — read-only OpenAPI + generált-kliens kapu:** ADR §6 read-endpointok,
  OpenAPI 3.1 spec-generálás, CI-ben TS-kliens generálás (generálási hiba =
  build-bukás), ProblemDetails + correlationId. Sandbox-kiajánlás terve
  (scheduling-sandbox.joinerytech.hu — élesítés Gábor-kapu).
  **Ez a Doorstar-kapu: itt nyílik a fogyasztás.**
- **M4 — naptár-tudatos scheduler + overload:** finite-capacity allokáció,
  slot-generálás, shadow-számítás + diff read-model, overload-endpoint.
- **M5 — 2. fázis írási irány:** standard-import (idempotency-key +
  karantén-workflow), naptár-revízió + jóváhagyás FSM, CapacityReservation
  írás, publish külső jóváhagyással.

---

## M1 végrehajtási napló (2026-07-28, backend terminál) — review_requested

**Hely:** `Szantoi/spaceos-modules-scheduling`, `main`, 3 commit
(`94db806` mag+kapu, `a216d6a` .gitattributes, `ea5a231` review-P2-k). A platform-repóba
**modul-kód nem került** — a fenti a teljes szállítás. **Pusholva** (Gábor jóváhagyása után);
a CI Linuxon 69/69-cel zöld, ami egyben a `.gitattributes`-javítást is igazolja: a hash-pin
túlélte a Linux-checkoutot.

### Amit tartalmaz

| Terület | Típus | Szabály |
|---|---|---|
| Erőfeszítés | `EffortCalculator` | `elapsed = volume × unitMinutes`, `labour = elapsed × workforce`, `days = ceil(elapsed / workingMinutesPerDay) + extraDays` |
| Függőségek | `DependencyBoundResolver` | start-ág: fixed > partial release > FS/SS; finish-ág: fixed > FF/SF; minden korlát `BoundSource`-attribúcióval |
| Hálózat | `DependencyGraph` | 10 issue-kód + **determinisztikus** topológiai rendezés (a stabil sorrend a későbbi revision-hash reprodukálhatóságának feltétele) |

Két szándékos, teherhordó tulajdonság: a **létszám nem rövidíti az átfutást** (csak a
munkaigényt szorozza), és a **hiányos standard jelzés, nem elutasítás**
(`MissingFields` + `EligibleForAutomaticPlanning=false`).

### A nyitott kontraktus-kérdés kezelése (Doorstar-root + root előírása)

A partial-release szemantika két kérdése nyitott, ezért **nincs hallgatólagos default**:

- `DependencyBoundResolver.Resolve` **kötelező** `PartialReleasePolicy` paramétert kér —
  nincs alapértelmezett érték és nincs `Default` enum-tag; `Unspecified` + jelen lévő
  release → dobás. Az „egyszerű" edge-ek viszont policy nélkül is feloldhatók
  (a tiltás a bizonytalan szabályra szűkített, nem globális adó).
- A mai viselkedés címkéje: `PartialReleaseContract.BaselineLabel` =
  **„doorstar-baseline-v1 (not final)"** (a root által kért jelölés).
- A küszöb→perc átszámítás `IPartialReleaseCalculator` mögött; az egyetlen
  implementáció (`PendingContractReleaseCalculator`) **szándékosan dob** — egy
  hihetőnek látszó lineáris képlet csendben rossz ütemterveket adna.

**Korlátozás a készrejelentésben:** a dependency-resolver `done`-ja a két kérdés
lezárásáig **nem jelenthető ki** (ezt a Doorstar-root és a root is előírta).
Egy teszt külön kimondja, hogy a két olvasat **csak** a „későbbi release" esetben tér
el — vagyis a pinelt fixture önmagában nem tudja eldönteni a kontraktust.

### Kapuk és bizonyíték

- **69/69 teszt zöld** Release-ben: **12 kapu-teszt + 57 mag-teszt** (a 13 pack-elem
  mind fedett, de a 3 művelet-minta egyetlen `Fact`-en belül fut — a korábbi
  „13 kapu + 56 mag" bontásom pontatlan volt, a root mérése az irányadó).
- **A 13 pack-elem** (3 erőfeszítés-vektor + 6 függőségi vektor + 3 művelet-minta +
  1 naptár-draft) a fixture-ből **olvasódik**, nem C#-ba átírva — így nem tud csendben
  elcsúszni a forrástól. A naptár-draft ellenőrzése kiadja a dokumentált **480 nettó
  percet**.
- **A hash-pin bizonyítottan fog:** módosított fixture-rel a suite `hash mismatch`-csel
  elhasal (pinelt `d7d84a3e…` vs. mért érték kiírva).
- **ADR-067 szótár-őr** (`build/check-core-vocabulary.sh`) zöld, **negatív kontrollal**
  ellenőrizve (szándékos szennyezésre exit 1). Az őr csak `src/`-t nézi: a fixture
  külső, hash-pinnelt provenance-adat, átírása a pint törné.
- **Friss klón próba:** klón → `dotnet test` 69/69 + szótár-őr zöld, és a fixture
  hash-e egyezik a pinnel.

### Menet közben javított saját hibák

1. **Valódi NUL karakter** került a forrásba (`string.Join`) — láthatatlan, a grep is
   binárisnak nézte a fájlt; szabályos `'\0'` escape-re cserélve.
2. **CRLF-akna:** a git a fixture sorvégeit konvertálta volna → a hash-pin friss
   kloneban/Linux CI-ban elhasalt volna. `.gitattributes` (`Fixtures/** -text`), friss
   klónnal igazolva.
3. Holt `IsFinite` ág (decimal nem lehet NaN) és ütközésre hajlamos szóköz-elválasztójú
   él-kulcs → NUL-elválasztó + célzott teszt („a b"→"c" vs. „a"→"b c").
4. `Directory.Build.props`: az `IsTestProject` a props betöltésekor még üres, ezért a
   dokumentáció-kényszer projektnév-feltételre váltott.

### Root-review utókövetés (verdikt: APPROVED, P0/P1 nulla)

A 4 push előtti P2 elvégezve (`ea5a231`):

1. **Holt kód törölve:** a `IsFinite(decimal) => true` helper bent maradt, pedig a
   jelentésem a törlését állította — a root szúrópróbája fogta meg. Törölve.
2. **Jelentés-pontosítás:** a helyes bontás **12 kapu + 57 mag** (fent javítva).
3. **Szótár-őr M2-előkészítés:** a `-w` valóban átengedte az összetett szavakat, de a
   puszta elhagyása visszahozta volna a `Doorstar` → „door" fals találatot. Megoldás
   **két lista**: whole-word (`door`, `tok`, `mdf`, `vasalat`…) és substring
   (`ajtó`, `élzár`, `furnér`, `forgács`…, csak egyértelmű tövek — a `pres` pl. nincs
   benne, mert a „present"-re ütne). Fájlkör bővítve: `*.sql`, `*.json`, `*.csproj`,
   `*.yaml`. Bizonyíték: `AjtólapMinutes`/`tokmag` → exit 1; `doorstar-baseline-v1`
   → exit 0; tiszta fa → exit 0.
4. **Kozmetika:** a `?? string.Empty` helyett a paraméter `string?` lett (a null így
   „nem ismert kód", nem kivétel az import-határon); a resolver konzervatív
   throw-sorrendjéhez indokló komment került.

69/69 zöld a javítások után is.

### Nem cél / nem került bele

Host, DB, migráció, HTTP-felület, naptár-tudatos ütemezés (M2-M4). A `Resource`/
`CapacityReservation` aggregátumok M2-ben jönnek.

---

---

## M2 végrehajtási napló (2026-07-28, backend terminál) — review_requested

**Hely:** `Szantoi/spaceos-modules-scheduling`, `main`. **CI zöld: 98 unit + 6 integrációs**
(valódi PostgreSQL, Testcontainers, ubuntu-latest).

### Előfeltétel, amit menet közben fel kellett oldani (ERPSEP-05)

Az M2 hosting-függő fele **nem volt megépíthető**: a hosting-csomagot mind a 7 modul
relatív `ProjectReference`-szel fogyasztja a platform-repón belülről, `nuget.config` és
publikált csomag nélkül — külön repóból járhatatlan. Gábor jóváhagyásával publikálva
GitHub Packages-re: `SpaceOS.Modules.Hosting` **és** `SpaceOS.Modules.Hosting.RlsFixtures`
`0.1.0-preview.1`. Az `RlsFixtures` `IsPackable=false` volt — enélkül egy külön repóban élő
modul **egyáltalán nem tudná lefuttatni a kötelező RLS-proofot**; publikálhatóvá tétele a
platform-repóban 1 fájl (`RlsFixtures.csproj`), **root-felterjesztésre vár**.

Fogyasztói oldal: `nuget.config` + `packageSourceMapping`, ami a privát feedet a `SpaceOS.*`
névtérre korlátozza (dependency-confusion védelem); a token env-változóból jön, sosem a
repóból. **Új őr** (`PackagedHostingContractTests`): egyetlen `.csproj` sem hivatkozhat a
platform-repóba, és a hosting-szerződésnek `PackageReference`-ként kell érkeznie.

### Domain

`ScheduleRun` aggregátum-gyökér + immutábilis `ScheduleRevision`-lánc, FSM
`Proposal → Shadow → Published → Superseded` (+`Discarded`), védett invariáns: **egyszerre
legfeljebb egy publikált revízió**. A `Publish` **előbb validál, utána mutál** — bukó
publikációnál az addigi terv aktív marad (külön teszt méri; a fordított sorrend terv nélkül
hagyná a műhelyt). `RevisionHasher`: ordinal rendezés, invariáns szám-formátum,
**hossz-prefixes mezők** (egy `"a|r1"` alakú id különben meghamisíthatná a mezőhatárokat),
normalizált decimal skála. `ProjectRef`: opak Kernel-referencia.

### Perzisztencia + RLS

- `SchedulingDbContext`: `scheduling` séma, owned revízió/művelet gyűjtemények. **Két
  független izolációs réteg** — Postgres RLS (a tekintély) és EF query filter (mélységi
  védelem); egyik sem bízik a másikban. Az állapot **szövegként** tárolódik: incidens közben
  psql-ből emberi szem olvassa, és egy enum-átrendezés csendben jelentést változtatna.
- `SchedulingRlsSql`: a megosztott `RlsMigrationSql` sablonból ENABLE + **FORCE** mindhárom
  táblán. A `plan_operations` **két szinttel mélyebb** (a revízión át éri el a bérlőjét),
  amire a megosztott egy-ugrásos helper nem jó — saját policy, ugyanabban az alakban.
- A proof DDL-je **szándékosan kézzel írt**, nem `EnsureCreated`: a policy-k pontosan
  ezekre a tábla- és oszlopnevekre hivatkoznak, és egy csendes EF-átnevezés után a policy
  semmire sem vonatkozna.

### RLS-proof (6 fact, `NonSuperuserRlsFixture`, nyers SQL-lel)

| # | Amit bizonyít |
|---|---|
| a | az app-szerep **nem** superuser és **nem** BYPASSRLS |
| b | ENABLE + **FORCE** mind a 3 táblán |
| c | A/B bérlő izoláció **és üres GUC → NULLA sor** (fail-closed, nem „minden sor") |
| d | pool-újrahasználat nem szivárogtat bérlőt (a legrosszabb hibamód: semmi nem hibázik) |
| e | gyerek-sorok a szülő run bérlőjét követik **két ugráson át** |
| f | `WITH CHECK`: másik bérlő nevében írás `42501`-gyel bukik (enélkül csendes kereszt-bérlő injektálás lenne) |

A proof **nyers SQL-lel** mér: EF-en át nagyrészt az EF-szűrőt mérné, itt viszont az a
kérdés, mit kényszerít ki maga a Postgres, ha az app-réteg megkerülhető vagy hibás.

### Menet közben javított saját hibák

1. `Directory.Build.props`: a doc-kényszer `.Tests` végződést nézett → az `IntegrationTests`
   projekt átcsúszott rajta. `Tests`-re javítva.
2. `nuget.config`: XML-kommentben `--` volt (érvénytelen XML) → a restore elhasalt.
3. A `PackagedHostingContractTests` első változata futásidőben a `.nuget` útvonalra assertált
   — **hibás**, mert a csomagból jövő assembly is a `bin`-be másolódik; a szabály a
   build-gráfban érvényesül.
4. A `hu-HU` kultúra-teszt elhasalt a saját `InvariantGlobalization` beállításom miatt; a
   teszt-projektben feloldva (a hash olyan hostnál is kultúrafüggetlen kell legyen, amelyik
   nem invariant módban fut) — nem a tesztet gyengítettem.

### Nem került bele (M2-maradék)

`Resource`/`ResourceCalendar`/`CalendarException`, `CapacityReservation`,
`OperationStandard`/`StandardRevision`, `SchedulingAuditLog` + outbox, EF-migrációk
(ma kézzel írt DDL a proofban), host-váz + `/health`. A naptár-réteghez **NodaTime**
javasolt (ADR-069 §5 IANA-zóna + DST a mag felelőssége; a `DateTimeOffset` csak eltolást
ismer, zónaszabályokat nem) — ez ADR-döntést érdemel az M4 előtt, ahogy az OR-Tools CP-SAT
(`AddNoOverlap` + `AddCumulative`) is a véges kapacitású ütemezőhöz.

---

## Done-kritérium (taskonként a review dönt)

M1-M3 után: publikálható kontraktus-csomag (OpenAPI + manifest-vázlat +
RLS-proof kimenet + verzió/hash) — a Doorstar-átadás root-review után indul.
M4-M5 külön review-körök. A teljes task done-ját root-review mondja ki.

---

## M3 KONTRAKTUS-BEMENET a Doorstartól (federation, 2026-07-28)

A Doorstar forráslánc-preflightja kész (5 kötelező provenance-elem, hiánynál
karantén; 35/35 teszt). Az M3 import/proposal szerződésben kérik — és a root
elfogadja mint kontraktus-követelményt:

1. **Project–Epic–Task hivatkozások publikus mezőként** (a KernelWorkScope
   wire-alakja) — a Doorstar opak értékként adja át, a platform validál;
2. **standardRevision** mező (a jóváhagyott, minősítőkkel azonosított
   standard revíziója);
3. **sourceRevisions** provenance-blokk (megrendelés-kulcs+revízió,
   kalkulációs revízió, folyamat-sor revízió) — opak, platform által
   tárolt-visszaadott értékek, feloldás nélkül.

Az M3 OpenAPI DTO-tervezésekor ezek kötelező mezők; a proposal-válasz a
beadott provenance-t változatlanul tükrözi vissza (lineage-igazolás).

---

## M4 KONTRAKTUS-BEMENETEK (az M3-verdikt P2-i, 2026-07-28)

Mind a négy **additív** — a kézbesített `1.0.0-preview.1` kontraktust nem töri.

1. **Proposal kapacitás-ütközés mező.** Az ígéretlistára most kerül fel, a
   tartalma M4-ben lesz számított. A `resources/{key}/overload` már ma megadja
   ugyanezt az információt erőforrás-nézetben; a proposal-beli mező a *terv*
   nézetből mutatja majd — a kettő ugyanabból a detektorból jöjjön, különben két
   igazság lesz ugyanarról az ütközésről.
2. **DependencyEdge partial-release küszöb a wire-on.** Ma a küszöb hatása
   látszik (`earliestStartMinute` + `startSource` + warning), maga a küszöb nem.
   A Doorstar így nem tudja megkülönböztetni a „0.5-nél engedtük el" és a
   „0.8-nál engedtük el" esetet — M4-ben `releaseThresholdFraction` néven megy ki.
3. **„Erőforrásprofil-revízió" fogalom tisztázása.** Jelen állás: a
   naptár-revízió (`ResourceCalendarRevision`) hordozza a zónát, a kapacitást, a
   kapacitás-politikát, a műszakmintát és a kivételeket — vagyis a profilt is.
   **Javaslat: ne vezessünk be külön profil-fogalmat**, hanem az ADR-069 §6
   szövegében nevezzük egységesen naptár-revíziónak. Külön aggregátum csak akkor
   indokolt, ha olyan attribútum jelenik meg, ami nem időfüggő (pl. képesség-mátrix
   az M4 solverhez) — akkor viszont az a `Resource` aggregátum megszületése is
   egyben (lásd az M2 scope-döntést).
4. **Művelet-„név" a wire-on — DÖNTÉS: marad a stabil kulcs, név nem megy ki.**
   A wire `operationId`-t hordoz, ami stabil és a revízión belül egyedi. Emberi
   nevet szándékosan nem küldünk: a név gazdája a **forráskatalógus** (Doorstar
   oldalán), és ha itt is tárolnánk, két igazság lenne ugyanarról a megnevezésről,
   ami az első átnevezésnél szétcsúszik. Ha a Doorstar mégis kér megjelenítendő
   nevet, az M4-ben **additív `displayName`** lehet, kifejezetten a standardból
   származtatva és „csak megjelenítésre" jelöléssel — nem azonosítóként.
