# BACKEND Terminal State

> **Frissítve:** 2026-08-03 este (Europe/Budapest)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a `done`/`APPROVED`
> kimondása **root-review joga**, ez a fájl a végrehajtó nézete.
> **Aktív task:** [`PROJ-01`](../../docs/knowledge/adr/ADR-072-projects-module-ownership.md) —
> `spaceos.projects` v1 (`in_progress`); a domain-mag kész, a **PROJ-05** következik.
> A **B2B-10 F5 LEZÁRVA** (mind a 4 szelet APPROVED); az F7 root-kiírásra vár.

## Hol van a kód

| Sáv | Hely |
|---|---|
| **Collaboration** (B2B-10) | a platform-repóban: `src/spaceos-modules-collaboration` |
| **Scheduling** (PLAN-03) | **külön repó**: `Szantoi/spaceos-modules-scheduling` — a platform-fába modul-kód nem kerülhet |
| **Hosting** (ADR-061/062) | `src/spaceos-modules-hosting` — közös csomag, **mind a 7 modul** függ tőle |

---

## 1. B2B-10 F3 + F3X — **LEZÁRVA, mind APPROVED**

Öt szelet + a root által nevesített XS-task. A task-doksi archiválva
(`docs/tasks/EPIC-B2B-COLLABORATION-2026Q3/archive/`).

| Szelet | Verdikt | Mit hozott |
|---|---|---|
| F3/1 grant-alapú authorization | **APPROVED** | képesség-szótár; egy döntési hely; spoofing-kapu a betöltés ELŐTT; 404 a nem-részesnek / 403 a részes-de-tiltottnak |
| F3/2 API-host | **APPROVED** | `/api/collaboration/v1`, csoport-szintű `RequireAuthorization` + `RequireEnabledModule`, ProblemDetails + correlation ID |
| F3/3a ETag / `If-Match` | **APPROVED** | 412 ≠ 409 ≠ 428 ≠ 400 elkülönítve; az előfeltétel a jogosultság UTÁN (verzió-orákulum kizárva) |
| F3/3b `Idempotency-Key` | **APPROVED** | tartós tár: tábla + unique index + RLS; az ujjlenyomat tartalmazza a törzset |
| F3/4 projekció + paritás | **APPROVED** | `allowedActions` a **domainből** (a B2B-07-es táblázat törölve); `AgreementReadModel` valódi projekciója; `GET /agreements/{id}` |
| F3/5 E2E valódi Postgresen | **APPROVED** | a teljes verem NOSUPERUSER/NOBYPASSRLS szerepen |
| **F3X** sorrend-bizonyíték | **APPROVED** | a root háromszor átvitt tétele lezárva |

**Mérés (2026-07-30 este):** **227/227 unit + 47/47 integrációs** (valódi PostgreSQL), **0 warning**.

### Amit az F3 mérései kimondtak (átvihető)

- **ME1:** interceptor nélkül **6/7 E2E bukik** → az ADR-062 interceptor bizonyítottan lefut a
  kérés útján. A platform-lelet **erre a modulra** lezárva.
- **ME3/ME4:** ahol rétegek fedezik egymást, egy kieső réteg **viselkedésben láthatatlan** —
  ezért kell szerkezeti teszt (`TenantQueryFilterPresenceTests`, `EndpointDataSource`-kapu).
- **F3X:** valódi adaton nem az alkalmazás-sorrend tart, hanem a DB-réteg; a **sorrendet** az
  in-memory teszt szögezi le. A teszt a **szerződést** rögzíti, nem aktív rést zár.

---

## 2. B2B-10 F5 — projekt-horgony feloldása (FUT, kiadva 2026-07-31)

**A három root-döntés (inbox 2026-07-31_001):** (1) hitelesítési út = **on-behalf-of**,
kimondott korláttal: KIZÁRÓLAG kérés-hatókörű — háttérfeldolgozásból Kernel-hívás ezen az
úton elvileg sem lehet, ha kell, ÚJ root-döntés; (2) **`ProjectOwnerTenantId` törölve** (a
bérlő-bizonyíték a kernel 404-je, kernel-kapu elkerülve); (3) hatókör elfogadva, a
visszavetítés a B2B-06-é.

| Szelet | Állapot | Bizonyíték / megjegyzés |
|---|---|---|
| **F5/0** mérési szelet | **APPROVED** (2026-07-31, root saját méréssel) | 89/89 + mutáció sha1-bizonyítással |
| **F5/1** create-út | **APPROVED** (2026-07-31, root saját méréssel + saját mutációval) | inbox `2026-07-31_002` |
| **F5/2** `HttpProjectAdapter` | **APPROVED** (2026-07-31, root saját mutációval) | inbox `2026-07-31_003` |
| **F5/3** negatív kontroll | **APPROVED** (2026-07-31, root saját méréssel: 277/277) | élő Kernellel mérve; jegyzőkönyv: [`KERNEL_ANCHOR_NEGATIVE_CONTROL_2026-07-31.md`](../../docs/knowledge/architecture/KERNEL_ANCHOR_NEGATIVE_CONTROL_2026-07-31.md); inbox `2026-07-31_004` |

✅ **Az F5 LEZÁRVA** — mind a 4 szelet APPROVED, az `EPICS.yaml`-ban `done`. A root tény-korrekciója
(a kernelben **kód szinten** létezik `FlowProject`/`FlowMilestone`, migráció nélkül, ADR-068
retire-jelöltként — tehát nem igaz, hogy „a Kernel nem ismeri a projektet") átvezetve a
jegyzőkönyv 4. pontjába.

### Az F5/3 két átvihető tétele

- **A vonalat a Kernel tartja, EGYEDÜL.** Mátrix élő Kernellel: epicA+A **200** / epicA+B **404**
  / epicB+B **200** / epicB+A **404**; a teljes vermen a create idegen epicre **422 + 0 sor**
  (fantom-esettel megkülönböztethetetlenül), saját epicre **201** (pozitív kontroll).
  ⚠ Ez **nem védelem mélységben**: az adapter szignatúrájában nincs tenant-paraméter, tehát
  elvileg sem szűrhet. Ha a kernel query filter elromlik, a mi 422-nk **csendben 201** lesz, és a
  Collaboration-suite zöld marad (stubbal mér). A negatív kontroll **kernel-tulajdonság** — beírva
  a `KernelStubHandler` doc-kommentjébe is.
- **A Kernelben nincs `Project` entitás/tábla — de ez SZÁNDÉKOS** (ADR-066: a `ProjectRef`
  tulajdonosa a Kernel `FlowEpic`; ADR-068 §5: a fölötte lévő projekt-buroknak nincs tulajdonosa).
  ⚠ Az első jelentésemben ezt „felfedezett hiányként" adtam be — félrevezető volt, javítva; a
  mérés ELŐTT kellett volna elolvasnom a témába vágó ADR-eket.
- ⭐ **Gábor termékdöntése (2026-07-31):** *„A projekt az epikek felett egy összefogó egység."* →
  [[projekt-az-epikek-felett]]. Ez lezárja az ADR-068 §5 `decision_required` tételét: a
  `WorkScope.ProjectId` **helyes és nem redundáns**, és az `EnsureSameProject` így nyer értelmet
  (egy megállapodás egy projekt, de **több epic**). Marad: a projekt-szintnek nincs tulajdonosa/
  táblája → a `ProjectId` ellenőrizhetetlen; az ADR-066 `ProjectRef`-je ma **FlowEpic-id-t hordoz
  `projectId` néven** (név-adósság); és a PLAN-03 *„a platform validál"* ígérete a Project-mezőre
  ma **nem tartható** — az F4-nek ezt ki kell mondania. Root-kihirdetésre továbbadva.

### Az F5/2 tartalma (amit a review-nak látnia kell)

- **Hívási pont kimondva: a create-út scope-validálása** — a horgony epicje a születés előtt
  feloldódik; a read-model dúsítás elvetve (minden olvasás Kernel-függővé vált volna).
- Port: `ResolveFlowEpicAsync(epicId)`; `ProjectOwnerTenantId` ÉS `requestingTenantId` törölve —
  a bérlőt a továbbadott token hordozza, a kikényszerítő fél a Kernel (404 = bérlő-bizonyíték).
- On-behalf-of kérés-hatókörű dekrétum kódban (`IOnBehalfOfTokenSource.RequireToken` hangosan
  bukik háttérből); hibatérkép: 404→null · 401/403→502 · timeout/5xx→503, semmi nem olvad null-ba.
- Fail-fast options (`ValidateOnStart`, üres alapérték — a tiltott `?? localhost` minta helyett).
- E2E: primary-handler kernel-stub, bearer-továbbítás a stub oldalán állítva. Az első E2E-futáson
  minden create 500 volt — a szintetikus identitáson nem volt Authorization header, a dekrétum
  pont úgy harapott, ahogy kell; az `As()` most bearer-t is ad.
- ⚠ **DEPLOY:** az éles hostnak mostantól kell a `Collaboration:Kernel:BaseUrl` (fail-fast,
  különben el sem indul) — VPS-config Gábor-kapu.
- Korlát kimondva: a Kernel-válasz nem hordoz projekt-azonosítót → csak az EPIC léte ellenőrzött,
  a ProjectId hívó-állította marad (F4/F5-3 anyag).

### Az F5/1 tartalma (amit a review-nak látnia kell)

- **Domain:** `CollaborationAgreement.DelegateWork` — host-only; lezárt megállapodás
  (Rejected/Cancelled/Superseded) nem vesz fel új munkát; horgony kötelező a születésnél;
  `EnsureSameProject` a domainben (a handler csak a sibling-projekt TÉNYT adja be).
- **API:** `POST /agreements/{id}/work-packages` → 201 + Location + ETag; **Idempotency-Key
  kötelező** (create-nél nincs If-Match — a „no blind writes" másik hangszere).
- **Grant-kapu:** először részvétel-alapúra építettem, a kiírás korrigálta →
  `WorkPackageExecute`; az M4-mutáció bizonyítja, hogy a különbséget teszt fogja.
- **Read model:** `workScope` a dróton (GUID-ok); enum-alak továbbra is F4-döntés.
- Menet közbeni tanulság: a retry-E2E első változatát a **fingerprint-védelem fogta meg**
  (422 különböző törzsre) — a teszt hibája volt, a middleware helyesen tagadott.
- A root jelezte `TenancyTestHost.cs` +7 sor **nem az enyém** — egy commitolatlan dev-auth
  change-set része a hosting-fában (a `DevelopmentSchemeTests` +78 sora használja); nem nyúltam hozzá.

### Az F5/0 négy mért válasza

Jegyzőkönyv: [`KERNEL_TOKEN_PATH_MEASUREMENT_2026-07-30.md`](../../docs/knowledge/architecture/KERNEL_TOKEN_PATH_MEASUREMENT_2026-07-30.md)

1. **A Kernel elérhető és hitelesíthető** — token nélkül 401, friss felhasználói tokennel 404/200.
2. **EGY token, KÉT API**: `aud=['kernel-api','collaboration-api']` → Kernel **200** +
   Collaboration **404** ugyanazzal a tokennel. **Kernel-módosítás nem kell** — most már
   **működésre** is mérve, nem csak kódra.
3. **A Kernel bérlő-szűkítését a token `tid` claimje hajtja**: A bérlő **200**, B bérlő **404**
   ugyanarra a sorra. A fail-closed tulajdonságot tehát **a Kernel tartja**, nem az adapter.
4. **A gép-gép identitás nem tud bérlőt hordozni** — a `client_credentials` tokenben nincs `tid`.

**Következmény:** a `ProjectOwnerTenantId` mező elhagyható (a bérlő-bizonyíték a kernel 404-je),
és ezzel a **kernel-kaput nyitó ág elkerülhető**.

### ⛔ Menet közben talált és javított platform-hiba

A `TenantResolver.ParseTenantListClaim` **két** claim-alakot ismert; a **harmadikon** elhasalt
(a .NET a tömb-claimet **elemenként** bontja, így a claim egy objektum). A tenant-feloldás közben
végig működik, ezért **csak az entitlement tűnt el** → **csendes 403**, megkülönböztethetetlen
attól, hogy a modul tényleg nincs engedélyezve. **Mind a 7 modult érintette.**
Javítva; A/B bizonyíték ugyanazzal a tokennel: javítás nélkül **403**, javítással **404**.
Hosting: **89/89 zöld**, mutáció 2 bukással.

⚠ Azt **nem** állítom, hogy az **éles** realm ilyen alakot ad — abba nem néztem bele (Gábor-kapu).

---

## 3. `spaceos.projects` — ÚJ MODUL (FUT, 2026-07-31)

**Kiváltó ok:** Gábor termékdöntése — *„A projekt az epikek felett egy összefogó egység."*
Ez lezárta az **ADR-068 §5** `decision_required` tételét, és Gábor a megvalósítást is kérte
(*„Tervezéssel, kivitelezéssel"*).

✅ **A root kiadta** (inbox `2026-07-31_005`): új epic **`EPIC-PROJECTS-MODULE-2026Q3`**,
**`PROJ-01` `in_progress`** — *„spaceos.projects v1: azonosság-mag (domain + migráció + API-host)
a hosting-minta szerint"*. Az **ADR-072 = javaslat, Gábor elé megy** (az ADR elfogadása az ő joga,
a root csak a teherhordó állításokat mérte meg).

**Kötelező kapu-sor a PROJ-01-hez (root):** ① hosting-csomag a kezdetektől (ADR-061/062: közös
`TenantResolver` + `SpaceOsTenantSessionInterceptor` **DI-ből** + RLS-baseline `FORCE`-szal);
② **interceptor-E2E a CRM-pilot mintájára**, nem kézi tükör — és mondjam ki, ha a no-tenant
fail-closed mögött nincs második réteg; ③ valódi Testcontainers-PostgreSQL + **modell↔séma
konformancia**; ④ **mutáció-bizonyíték minden új kapura**, tiszta build-cache-sel.
**Ne égessem be:** a `ProjectCode` formátumát és a wire-enum alakját.

### Terv: [`ADR-072`](../../docs/knowledge/adr/ADR-072-projects-module-ownership.md) (`9cb6736`)

A tervezést **méréssel** kezdtem, és az cáfolta a saját előzetes állításomat (azt mondtam, a
projekt-burok „vékony fogalom" — nem az). Mit mértem:

| Fogyasztó | Állapot |
|---|---|
| Portál **`/w/projects` ÉLŐ route** | **mockból él** (`src/mocks/projects.ts`) |
| Kontrolling `IProjectPortfolioSource` | stub; doc-komment: *„it does NOT own projects"* |
| Kontrolling `IIntegrationDataProvider` | **második, párhuzamos** projekt-port, szintén stub |
| Collaboration + scheduling `WorkScope` | kötelező `projectId`, ma **opak** |

**Két erős jel:** a portál öt életciklus-címkéje és a Kontrolling `ProjectLifecycleStatus` enumja
**egymástól függetlenül ugyanaz**; és **kettős azonosság** kell (belső `Guid` + `PRJ-…` üzleti kulcs).

**Három döntés:** (1) önálló, iparág-semleges `spaceos.projects` modul (ADR-068 O1–O4 átvíve:
Kernel-bővítés, JoineryTech-tulajdon és meglévő-modulba-rejtés mind elutasítva); (2) a **v1 az
azonosság és semmi több** (tételek a CRM-nél, árrés a Kontrollingnál); (3) ⛔ **F4-blokkoló**.

⚠ **Root-helyesbítés a (3)-hoz:** a **wire-alak ma NEM kétértelmű** — a `WorkScopeDto` már külön
`ProjectId`/`EpicId` mezőt hord, a `ProjectReference` pedig `FlowEpicId`-t (az F5/2 óta). **A baj
nem az, hogy a `projectId` epicet jelent, hanem hogy nincs mögötte semmi ellenőrizhető.** Amit
viszont az ADR-072 elfogadásakor ki kell mondani: az **ADR-066 §9.1 felülírt** (07-21 → 07-31),
különben két ADR két tulajdonost nevez meg. Az F4 kötelező eleme marad: mondja ki, hogy a
`projectId` **opak korrelációs azonosító**, és hogy a PLAN-03 *„a platform validál"* ígéretét a
Project-mezőre ma nem tartjuk be.

### Kivitelezés

| Szelet | Állapot | Bizonyíték |
|---|---|---|
| **PROJ-04** domain-mag | **kész** (`eb11735`) | **16/16 zöld, 0 warning**; mutáció **2/2 harapott** (cross-aggregátum epic-őr; `ProjectCode` nagybetűsítés), visszaállítva |
| **PROJ-05** Application + Infrastructure (EF, RLS, migráció) | **kész, `review_requested`** | **58/58 zöld, 0 warning** tiszta build-cache-sel (36 unit + 22 integrációs, valódi Testcontainers-PostgreSQL NOSUPERUSER/NOBYPASSRLS szerepen); **mutáció 3/3 harapott**, sha1-alkalmazva-bizonyítással |
| **PROJ-06** Api + host | ⛔ **blokkolva a §7.3-on** | `/api/projects/v1`, ETag/Idempotency-Key, ADR-067 modul-kapu; az epic-hozzárendelés az F5/2 adapter-mintájával ellenőrizze a FlowEpic létét |

### A PROJ-05 tartalma (amit a review-nak látnia kell)

- **Application:** `IProjectRepository` port · öt MediatR-parancs (create/rename/status/
  epic-assign/release) · `ICurrentTenant` port (az Application nem függ az ASP.NET Core-tól) ·
  `IProjectCodeAllocator` port.
- **Infrastructure:** `ProjectsDbContext` tenant query filterrel · EF-konfigurációk
  (`ProjectCode` konverter + explicit `ValueComparer`) · `ProjectRepository` · **0001 migráció**
  a hosting-baseline `NULLIF(...)` alakjával és `ENABLE`+`FORCE` RLS-sel **mindkét táblán, a modul
  ELSŐ migrációjában** (a Collaboration és a CRM is utólagos javító-migrációt fizetett ezért).
- **A §7.2-döntés kódban:** opcionális, opak `ProjectOrigin` (system + externalId), **két sima
  oszlopként**, nem opcionális owned type-ként — az utóbbi az EF egyik legrosszabb csapdája.
  A create-út **nem követel** származást; erre külön teszt van, névvel.
- **`ProjectCode`: a modul adja ki** (`IProjectCodeAllocator`), mert két független szülő-út mellett
  a hívó által adott kód garantáltan szétcsúszik — ez **mérve** van (portál `PRJ-2426-001` vs
  Kontrolling `PRJ-2026-014`). A portnak **szándékosan nincs implementációja**: a §7.3 formátum-
  kérdés Gáboré, és egy alapértelmezett formátum csendben eldöntené. ⛔ **Következmény: a
  create-végpont (PROJ-06) a §7.3 nélkül nem szállítható.**
- **Megerősített invariáns:** a `ProjectEpicAssignment` saját `TenantId`-t kapott, mert az „egy
  epic egy projekthez" szabályt eddig **csak egy check-then-act** őrizte, amit két párhuzamos hívás
  átlép. A `(TenantId, EpicId)` **egyedi index** zárja — **bérlőnként, nem globálisan**: a globális
  index egy másik bérlő soráról adna választ.

### A mutációs kör három tétele (sha1-alkalmazva-bizonyítással)

| Mutáció | Eredmény |
|---|---|
| **M1** interceptor kivétele a DI-ből | pontosan a **3 kulcs-állító** E2E bukott — a **6 kézzel tükrözött RLS-teszt VÉGIG ZÖLD**. A CRM-pilot leletének pontos megismétlődése |
| **M2** egyedi index → sima index | a **2 uniqueness-teszt** bukott |
| **M3** query filter invertálása | a **2 szűrő-teszt** bukott, **mind az 5 interceptor-E2E zöld maradt** — a két réteg bizonyítottan független |

⭐ **Az M2 a saját mérőeszközöm hibáját buktatta ki:** a szerkezeti index-teszt csak az index
**NEVÉT** nézte, ezért a mutáció alatt **zöld maradt**. Átírva `pg_index.indisunique`-ra és
**újramérve** — most már harap. A kapu csak azon fog, amit ténylegesen megnéz.

⭐ **Mérés közben talált rés, betömve:** az E2E `IgnoreQueryFilters`-t használ, az RLS-suite pedig
nem-superuserként megy — **a kettő között az EF query filter fedezetlen volt**. Egy kieső réteg
viselkedésben láthatatlan, ezért új osztály (`QueryFilterTests`) méri **egyedül**, admin
(superuser) kapcsolaton, ahol az RLS elvileg sem harap; pozitív kontrollal, hogy az üres eredmény
ne lehessen elrontott seed. Kimondva benne: **tenant nélkül a szűrő megengedő**, tehát azon az
úton a fail-closed viselkedést **kizárólag** az interceptor üres kulcsa + az RLS tartja.

**Amit a domain-mag hoz:** `Project` (Id + TenantId + `ProjectCode` + Name + Status + opcionális
`CustomerId` + RowVersion), `ProjectEpicAssignment` (ez teszi valódivá az epikek feletti
összefogást — entitás, mert a riportnak tudnia kell, MIKORTÓL tartozott ide), és az
`EnsureEpicUnassigned` szabály: **egy epic legfeljebb egy projekthez tartozhat** (a Collaboration
`EnsureSameProject` mintájával — a tényt a hívó adja be, a szabály a domainben marad).
Az öt életciklus-címkét **conformance-teszt védi** a „továbbfejlesztés" ellen.

### Hatókör-kérdések

- **§7.1 — ELDÖNTVE (Gábor, 2026-07-31):** a szakma-függőségek a Collaboration munkacsomagjainak
  **olvasó oldali projekciói**; a modul **nem** kap saját `Dependency` entitást.
  ⚠ Nyitva marad benne: a **házon belüli** szakma-függőség nem fér a Collaboration kétoldalú
  (két bérlő) modelljébe — ha ez előjön, **új döntés**, nem csendes tábla-felvétel.
- **§7.2 — ELDÖNTVE (Gábor, 2026-08-03):** *„Igen a CRM-ből **is** születhet."* A kérdést
  vagylagosnak tettem fel, a válasz **mindkettő**: a CRM-rendelés egy **lehetséges** származás,
  nem kötelező → a create-út **nem követelhet** rendelést. Négy levezetés (ADR-072 §7.2,
  `D1`–`D4`, **az én következtetéseim**): **D1** az irány CRM → projects, soha visszafelé (különben
  a modul iparág-kötötté válik, ADR-068 O2); **D2** a származás **opak és opcionális**, a
  `Project.CustomerId` mintájával; **D3** ez a §7.3 „ki generálja" felét leszűkíti — két
  független hívó **garantáltan** két formátumot termel (megmérve: portál `PRJ-2426-001` vs
  Kontrolling `PRJ-2026-014`), tehát a kiadás **szerver-oldali**; **D4** a **számosságot nem
  döntöm el**, a v1 egyetlen opcionális hivatkozást visz (az opak hivatkozás miatt az N:M-re
  váltás additív).
- **§7.3 (`ProjectCode` FORMÁTUMA és egyediségi köre) NYITVA** — erre **nem tettem javaslatot**.
  A create-végpontnál (PROJ-06) válik blokkolóvá; a v1 a formátumot nem égeti be.

---

## 4. Scheduling (PLAN-03) — M4 APPROVED, M5 nem indult

`5cf9e7a..e22687a`, CI-mérés a pusholt állapoton (run `30482853132`): **430 zöld, 0 bukás**
(Domain 263 / Infrastructure 52 / Host 70 / Solver.OrTools 26 / Integration 19).
A kontraktus-kör lezárva, `1.0.0-preview.2` kézbesítve. **Következik az M5** (írási irány).

---

## 5. Új a platformon, ami az én munkafolyamatomat érinti

**Van .NET CI-kapu** (`.github/workflows/dotnet-build-gate.yml`, root, 2026-07-30) — a platform
**első** automatikus .NET-kapuja. Amit tudni kell róla:

- **build-kapu, nem teszt-kapu**: a 15 platform-saját teszt-projektből **14 igényel Dockert**.
- **6/15 projektet mér**; a többi 9 tranzitívan a privát `spaceos-kernel` submodule-ra hivatkozik
  → PAT kellene, az **Gábor-döntés**. A kihagyottakat a script **nevesítve** kiírja.
- Pont azt fogja meg, ami 2026-07-30-án átcsúszott a root-review-n: egy **hamis „0 warning"**.

---

## 6. Ismert korlátok és adósságok (backend-sáv)

- **Idempotencia-rekordok takarítása nincs telepítve** — üzemeltetési feladat, a pilot előtt kell.
- **A wire-enumok alakja** (`"Proposed"`) **F4-döntés** — szándékosan nem találtam ki előre.
- **`WorkPackageStatus.Disputed`**: root döntött — **marad**; az „elérhetetlen" őr-teszt
  root-döntés nélkül **nem törölhető**, és a komment megnevezi az F0-döntést.
- **Scheduling RID-mátrix**: linux-x64 + win-x64 mérve; **Alpine/musl nem** — ma nem blokkoló
  (nincs Dockerfile, a VPS Debian/glibc), konténeresítéskor mérendő.
- **Jelzés a Kernel csapatának** (nem javítottam — Kernel-kapu): friss klónon a kernel **nem
  fordul**, amíg a `SpaceOS.Kernel.Api/keys/dev-private-key.pem` nem létezik — a csproj
  build-időben másolja azt, amit a `DevRsaKeyManager` csak futásidőben hozna létre, és amit a
  `.gitignore` kizár.
- **A kernel working tree-jében más sávjának commitolatlan munkája van** (`TenantHandshakeAllowlist`
  + migráció + tesztek) — hozzá nem nyúltam.

## 7. Kapuk, amik NEM az enyémek

Élesítés, VPS-művelet, éles DB-migráció, éles Keycloak-realm, sandbox-kitettség, **Kernel-módosítás**:
**Gábor-kapu**. A `done`/`APPROVED` kimondása **root-review joga**.
