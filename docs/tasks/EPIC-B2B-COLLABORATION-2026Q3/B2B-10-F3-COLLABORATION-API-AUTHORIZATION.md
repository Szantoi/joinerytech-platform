# B2B-10 F3 — Collaboration API-host + grant-alapú authorization

> **Epic:** EPIC-B2B-COLLABORATION-2026Q3 · **Szülő:** B2B-10 (Doorstar-kézfogás)
> **Szerep:** backend · **Méret:** M–L (szeletelve) · **Előfeltétel:** B2B-10 F1 + F2 (mindkettő APPROVED)
> **Státusz:** in_progress (2026-07-30) — **F3/1 APPROVED** (root-review 2026-07-30, saját mérés: 144/144 + 2 mutáció)
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
| **F3/2** | `SpaceOS.Collaboration.Api` + host: hosting-minta, `RequireEnabledModule`, `/api/collaboration/v1`, ProblemDetails + correlation ID | **`review_requested`** — 158/158 unit + 25/25 integrációs |
| **F3/3** | ETag / `If-Match` az állapotátmeneteken (a `RowVersion` concurrency-tokenre), `Idempotency-Key` a létrehozáson | pending |
| **F3/4** | `AgreementReadModel` valódi projekciója (F1 ide utalta) + lista-végpontok + **allowedActions↔domain paritás-teszt** | pending |
| **F3/5** | Végpont-szintű bizonyíték **valódi PostgreSQL-en** (Testcontainers): cross-tenant, spoofing, revoked/expired, 404/403 | pending |

Mindegyik szelet külön `review_requested`-tel megy fel.

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
- [ ] Mező-szintű projekció: a vendég csak a neki kiadott mezőket látja.

**F3 saját kritériumai:**

- [x] Minden üzleti route `RequireAuthorization()` + `RequireEnabledModule("spaceos.collaboration")`.
      *(F3/2 — viselkedés-teszt + **szerkezeti** teszt az `EndpointDataSource`-ból; az MA2 mutáció
      túlélte, mert a modul-kapu maga is hitelesítést követel — a szerkezeti teszt ezért kellett.)*
- [x] Hibaformátum: ProblemDetails + correlation ID (a Doorstar biztonsági szerződésének tétele).
      *(F3/2 — a 403 semmit nem mond az indokról; mutációval igazolva.)*
- [ ] Az `allowedActions` a **domainből** származik, nem külön táblázatból — paritás-teszttel.
- [ ] A bizonyíték **valódi PostgreSQL-en** fut, nem InMemory-n (az F2 tanulsága).

## Amit ez a task NEM csinál

- Nem publikál OpenAPI-kontraktust a Doorstarnak — az az **F4**.
- Nem nyúl a portál-UI-hoz (B2B-08) — az az F4 generált kliensére vár.
- Nem old fel `changes_requested`-et B2B-02/04/05/06/07-en: azt a root mondja ki.
