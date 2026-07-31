# BACKEND Terminal State

> **Frissítve:** 2026-07-31 délután (Europe/Budapest)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a `done`/`APPROVED`
> kimondása **root-review joga**, ez a fájl a végrehajtó nézete.
> **Aktív task:** [`B2B-10 F5`](../../docs/tasks/EPIC-B2B-COLLABORATION-2026Q3/B2B-10-F5-PROJECT-ANCHOR-RESOLUTION.md)
> (**KIADVA** — root, 2026-07-31; F5/0 APPROVED, F5/1 `review_requested`)

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
| **F5/3** negatív kontroll | **`review_requested`** | élő Kernellel mérve; jegyzőkönyv: [`KERNEL_ANCHOR_NEGATIVE_CONTROL_2026-07-31.md`](../../docs/knowledge/architecture/KERNEL_ANCHOR_NEGATIVE_CONTROL_2026-07-31.md); outbox `2026-07-31-b2b10-f5-3-…` |

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

## 3. Scheduling (PLAN-03) — M4 APPROVED, M5 nem indult

`5cf9e7a..e22687a`, CI-mérés a pusholt állapoton (run `30482853132`): **430 zöld, 0 bukás**
(Domain 263 / Infrastructure 52 / Host 70 / Solver.OrTools 26 / Integration 19).
A kontraktus-kör lezárva, `1.0.0-preview.2` kézbesítve. **Következik az M5** (írási irány).

---

## 4. Új a platformon, ami az én munkafolyamatomat érinti

**Van .NET CI-kapu** (`.github/workflows/dotnet-build-gate.yml`, root, 2026-07-30) — a platform
**első** automatikus .NET-kapuja. Amit tudni kell róla:

- **build-kapu, nem teszt-kapu**: a 15 platform-saját teszt-projektből **14 igényel Dockert**.
- **6/15 projektet mér**; a többi 9 tranzitívan a privát `spaceos-kernel` submodule-ra hivatkozik
  → PAT kellene, az **Gábor-döntés**. A kihagyottakat a script **nevesítve** kiírja.
- Pont azt fogja meg, ami 2026-07-30-án átcsúszott a root-review-n: egy **hamis „0 warning"**.

---

## 5. Ismert korlátok és adósságok (backend-sáv)

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

## 6. Kapuk, amik NEM az enyémek

Élesítés, VPS-művelet, éles DB-migráció, éles Keycloak-realm, sandbox-kitettség, **Kernel-módosítás**:
**Gábor-kapu**. A `done`/`APPROVED` kimondása **root-review joga**.
