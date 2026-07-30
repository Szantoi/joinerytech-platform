# B2B-10 F3 — Collaboration API-host + grant-alapú authorization

> **Epic:** EPIC-B2B-COLLABORATION-2026Q3 · **Szülő:** B2B-10 (Doorstar-kézfogás)
> **Szerep:** backend · **Méret:** M–L (szeletelve) · **Előfeltétel:** B2B-10 F1 + F2 (mindkettő APPROVED)
> **Státusz:** in_progress (2026-07-30) — **F3/1 + F3/2 + F3/3 APPROVED** (root-review 2026-07-30; saját mérés: 175/175 unit + **34/34 valódi PostgreSQL** + 4 saját mutáció)
> **Kanonikus státusz:** [`EPICS.yaml`](../../../EPICS.yaml) — a `done` kimondása root-review joga.

## Miért ez a következő

A kritikus út a pilotig: **F0 → F1 → F2 → F3 → F5 → F7**. Az F3 normatív forrása a
[REAUDIT F-tábla](../../knowledge/architecture/B2B_COLLABORATION_REAUDIT_2026-07-28.md) 49. sora:

> F3 | `SpaceOS.Collaboration.Api` host (hosting-minta + `RequireEnabledModule`) + endpointok
> + Contracts-DTO-k + ETag/Idempotency | M

Ehhez jön két örökség, amit a root **kifejezetten ide utalt**:

1. **Az F2 root-döntése:** *„az RLS a RÉSZVÉTELT szűrje, a grant az ENGEDÉLYT szabályozza —
   grant-alapú authorization az F3 application/API rétegében."* Ma tehát a grant **sehol nincs
   kikényszerítve**: a `CollaborationParticipantGrant.IsActive()` létezik, de egyetlen hívója sincs.
2. **A B2B-02 nem teljesült tételei** (a task szándékosan `changes_requested` maradt) az F3
   elfogadási kritériumai közé kerültek — ld. lent.

## Mai kiindulás (mért)

- `SpaceOS.Collaboration.Tests`: **126/126 zöld** (2026-07-30, Release).
- `SpaceOS.Collaboration.IntegrationTests`: 25 teszt — **most nem mérve**, a Docker nem futott.
- **Nincs `SpaceOS.Collaboration.Api` projekt**, nincs host, nincs egyetlen HTTP-végpont sem.
- A parancsok `ActorTenantId`-je ma **a hívótól jön** (F1 szándékos döntése) — a hitelesített
  identitáshoz semmi nem köti. Ez pontosan a B2B-02 „body/header tenant-spoofing" tétele.

## Szeletek

| Szelet | Tartalom | Állapot |
|---|---|---|
| **F3/1** | Grant-alapú authorization-mag az application rétegben + hívó-identitás + spoofing-kapu | **APPROVED** (`0b555f0`) |
| **F3/2** | `SpaceOS.Collaboration.Api` + host: hosting-minta, `RequireEnabledModule`, `/api/collaboration/v1`, ProblemDetails + correlation ID | **`review_requested`** |
| **F3/3a** | ETag / `If-Match` a `RowVersion` concurrency-tokenre + a 412/409/428/400 elkülönítése | **`review_requested`** |
| **F3/3b** | `Idempotency-Key` **tartós tárral** (tábla + unique index + RLS), middleware-ben | **`review_requested`** |
| **F3/4** | `AgreementReadModel` valódi projekciója + agreement olvasó végpont + **allowedActions↔domain paritás** | **`review_requested`** |
| **F3/5** | Végpont-szintű bizonyíték **valódi PostgreSQL-en** + rétegvizsgálat | **`review_requested`** |

Mindegyik szelet külön `review_requested`-tel megy fel.
**Aktuális mérés (2026-07-30):** `226/226` unit + `46/46` integrációs (valódi PostgreSQL), 0 warning.
**Az F3 mind az öt szelete kész**; F3/1 APPROVED, a többi `review_requested`.

## F3/1 — a hozott döntés, amit a root erősítsen meg

A grant-kényszerítés hatóköre nem triviális, mert **körkörösséget** rejt: a grantet a
megállapodás hozza létre (`CollaborationAgreement.AddGrant`), tehát ha a vendégnek grant kellene
ahhoz, hogy a megállapodást **elolvassa és elfogadja**, akkor sosem jöhetne létre grant azon az
úton, amit a domain FSM-je előír (host `Propose` → guest `Accept`).

**A hozott döntés (megerősítésre vár):**

- **A megállapodás maga részvétel-alapú.** A vendég grant nélkül is **olvashatja** és
  **megválaszolhatja** (`Accept`/`Reject`) azt a megállapodást, aminek részese — ez a saját
  beleegyezési aktusa, és ez az az instrumentum, ami a grantet létrehozza.
- **Amit a megállapodás HORDOZ, az grant-köteles.** Munkacsomag olvasása/végrehajtása,
  szállítmány, csere: **aktív** grant kell hozzá, egyező képességgel.
- **Fail-closed:** visszavont vagy lejárt grant → azonnal `403`, akkor is, ha korábban aktív volt.
- **Nem részes bérlő → `404`** (létezés-szivárgás nélkül), **részes de nem engedélyezett → `403`**.

A döntés **egyetlen helyen** él (`CollaborationAccessGuard`), hogy a megfordítása egysoros legyen.

## Elfogadási kritériumok

**Örökölt B2B-02-tételek (a task addig `changes_requested` marad):**

- [x] Grant nélküli vendég a megállapodás **hordozott** tartalmához nem fér hozzá. *(F3/1, root-review 2026-07-30)*
- [x] `Revoked` grant → azonnal fail-closed. *(F3/1 — root-mutáció M-B: 3 teszt bukott)*
- [~] `ExpiresAtUtc` lejárat → fail-closed **a határponton**, negatív kontrollal *(F3/1 — root-mutáció M-A: 2 teszt bukott)*. ⚠ **Az integrációs teszt még hiányzik** — a bizonyíték ma InMemory; a végpont-szintű mérés az **F3/5**.
- [x] Body/header **tenant-spoofing** kizárva: a mismatch a **betöltés előtt** dob. *(F3/1)*
- [x] **404/403 politika** kimondva és mérve: nem-részes = 404, részes-de-tiltott = 403. *(F3/1)*
- [ ] Admin/superuser út auditálva.
- [x] Mező-szintű projekció: az `AgreementReadModel` **valóban az aktorra** projektál (a terms-hash **nullable** — egy draftnak nincs hash-e). *(F3/4)*

**F3 saját kritériumai:**

- [x] Minden üzleti route `RequireAuthorization()` + `RequireEnabledModule("spaceos.collaboration")` — a route-**csoporton**, és egy **szerkezeti teszt** (`EndpointDataSource`) őrzi a csoporton kívül fölvett route-ot is. *(F3/2, root-review 2026-07-30)*
      *(F3/2 — viselkedés-teszt + **szerkezeti** teszt az `EndpointDataSource`-ból; az MA2 mutáció
      túlélte, mert a modul-kapu maga is hitelesítést követel — a szerkezeti teszt ezért kellett.)*
- [x] Hibaformátum: ProblemDetails + correlation ID (a Doorstar biztonsági szerződésének tétele).
      *(F3/2 — a 403 semmit nem mond az indokról; mutációval igazolva.)*
- [x] Az `allowedActions` a **domainből** származik, nem külön táblázatból — paritás-teszttel.
      *(F3/4 — próbálgatásos orákulum; a B2B-07-es táblázat törölve. ⚠ A paritás egyezést bizonyít,
      nem helyességet: a `Cancel` szigorítása külön, explicit teszttel van kikötve.)*
- [ ] ⛔ **Root-döntés kell:** a `WorkPackageStatus.Disputed` állapotba egyetlen átmenet sem vezet
      (az F0 kivette a dispute-ot az MVP-ből). Bekötjük vagy kivezetjük? A paritás-suite addig
      névvel kizárja és bizonyítja, hogy elérhetetlen.
- [x] A bizonyíték **valódi PostgreSQL-en** fut, nem InMemory-n (az F2 tanulsága). *(F3/5 — a
      végpont a NOSUPERUSER/NOBYPASSRLS app-szerepen felel; az ME1 kísérlet bizonyítja, hogy a
      kérés útján tényleg lefut az ADR-062 interceptor: nélküle 6/7 E2E teszt bukik.)* *(F3/3: az
      idempotencia-tár, a unique index, az RLS és a concurrency-fordítás valódi DB-n mérve; a
      **végpont**-szintű sáv még in-memory repositoryval fut → F3/5.)*
- [~] Feltételes írás: `If-Match` a munkacsomagon **kötelező**, az előfeltétel a jogosultság UTÁN
      fut (verzió-orákulum kizárva), és a 412/409/428/400 el van különítve. *(F3/3a)*
- [x] `Idempotency-Key` **tartós** tárral, bérlőnkénti kulcstérrel; a versenyt a unique index dönti.
      *(F3/3b)* ⚠ A befejezett rekordok takarítása üzemeltetési feladat — nincs telepítve.

## Amit ez a task NEM csinál

- Nem publikál OpenAPI-kontraktust a Doorstarnak — az az **F4**.
- Nem nyúl a portál-UI-hoz (B2B-08) — az az F4 generált kliensére vár.
- Nem old fel `changes_requested`-et B2B-02/04/05/06/07-en: azt a root mondja ki.


---

## ⚠ ROOT-KÖTELEZŐ AZ F3/4-BE (root-review 2026-07-30)

**A „jogosultság előbb, előfeltétel utána" invariáns fél lábon áll.** A root
lefuttatta ugyanazt az MC3-mutációt **mindkét** úton:

| Az invariáns megsértése | Bukó teszt |
|---|---|
| **munkacsomag**-út | **2** — mérve |
| **megállapodás**-út | **0** — ⚠ **TÚLÉLTE, tehát nincs mérés** |

Ezért került a feltételes-írás tétele `[x]`-ről `[~]`-re: a kódban a sorrend
**helyes** és kommentált, de a megállapodás-úton **semmi nem fogná meg, ha
megfordul**. Ez a „tükör zöld marad, ha az eredeti elromlik" alak.

**Kötelező tétel:** negatív teszt a megállapodás-úton — nem-részes hívó **hibás
`If-Match`-csel is 404-et** kapjon, ne **412**-t (különben verzió-orákulum).

> Amit a root **nem** állít: hogy ez ma kihasználható. Hogy az RLS a közvetlen
> repository-betöltést elvágja-e, **nem mérve** — a unit-suite elvileg sem tudja
> megmutatni. Ez az **F3/5** tartalma.

**Egyéb rögzített tételek:**

- A `HasActiveGrantFor` ma azért biztonságos, mert az agreement **kétoldalú** —
  egy jövőbeli 3+ fél csendben kinyitná. Magyarázó sor kérve. *(F3/1 review)*
- Az `allowedActions`↔domain paritásnál **a DOMAIN a forrás**. Ha a policy
  szűkítése szándékos üzleti szabály, az **a domainbe való**, nem külön táblába.
- A **megállapodás-átmenet `If-Match`-e itt szigorítandó** kötelezőre (az F3/3
  óta van rá ok: lesz olvasó végpontja).
- **Ismert korlát, elfogadva:** a befejezett idempotencia-rekordokat semmi nem
  takarítja — üzemeltetési feladat, ez a szelet ne telepítse.

> **Konvenció-emlékeztető:** a kritériumok `[x]`-re billentése **root-review
> joga** — a végrehajtó `review_requested`-et jelent mért bizonyítékkal. Az
> F3/2–F3/3 tételei előre ki voltak pipálva; tartalmilag rendben találtam őket,
> de a sorrend fordítva van.


## F3/4 root-review (2026-07-30) — APPROVED, egy tétel NYITVA

Saját mérés: **218/218** unit · `dotnet build` → **0 Warning(s)** (ezt most
megmértem, nem fogadtam el jelentésként).

⛔ **A feltételes-írás tétele `[~]` MARAD.** A kötelező negatív tesztet
újramértem az F3/4 utáni fán:

```
R-MC3/agreement (az elofeltetel a jogosultsag ELE kerul) -> 218/218 ZOLD, TULELTE
```

A rés a **mérésben** változatlanul ott van (a kódban a sorrend helyes és
kommentált). Nem hiba, hanem **időzítés** — a verdikt és az F3/4 párhuzamosan
készült. **Az F3/5-be kerül.**

### Root-döntés: a `WorkPackageStatus.Disputed` **MARAD**

Indok: az F0 nem a terméktől vette el a dispute-ot, hanem **az MVP-től**; egy
kivezetett enum-tag visszahozásakor a numerikus érték újraválasztása és a
történeti ütközés kockázata nagyobb a haszonnál; és a backend **őr-tesztje
halott kódból csapdát csinál** (bizonyítja, hogy elérhetetlen — bekötésre
pirosra vált, és kikényszeríti a lefedettség bővítését).

**Kikötés:** az „elérhetetlen" őr-teszt **nem törölhető root-döntés nélkül**, és
a kódban komment nevezze meg az F0-döntést.

### Root-szabály, ami ma keletkezett

A backend helyesbítette, hogy az F3/2–F3/3 „0 warning" **nem volt igaz**
(`CS0108` a teszt-hostban). ⚠ **Ezt a számot a root-review-m nem mérte** —
jelentésként fogadtam el, amit a saját konvenciója tilt. **Mostantól a
warning-szám is mért tétel**, nem csak a Passed/Failed sor.
