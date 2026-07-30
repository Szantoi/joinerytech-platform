# BACKEND Terminal State

> **Frissítve:** 2026-07-30 este (Europe/Budapest)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a `done`/`APPROVED`
> kimondása **root-review joga**, ez a fájl a végrehajtó nézete.
> **Aktív task:** [`B2B-10 F5`](../../docs/tasks/EPIC-B2B-COLLABORATION-2026Q3/B2B-10-F5-PROJECT-ANCHOR-RESOLUTION.md)
> (a doksi **tervezet**, root-kiadásra vár; az F5/0 mérési szelet viszont már lefutott)

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

## 2. B2B-10 F5 — projekt-horgony feloldása (FUT)

| Szelet | Állapot | Bizonyíték / megjegyzés |
|---|---|---|
| **F5/0** mérési szelet | **`review_requested`** | eldobható KC24 + kernel + collaboration host |
| **F5/1** create-út | **következik** | Gábor döntése: a hiány **kimaradás** volt, az F5 hozza |
| **F5/2** `HttpProjectAdapter` | pending | a hitelesítési útra **on-behalf-of** a javaslatom |
| **F5/3** negatív kontroll | pending | idegen bérlő tokenjével a feloldás semmit ne adjon |

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
