# BACKEND Terminal State

> **Frissítve:** 2026-07-30 délelőtt (Europe/Budapest)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a `done`/`APPROVED`
> kimondása **root-review joga**, ez a fájl a végrehajtó nézete.
> **Aktív task:** [`B2B-10 F3`](../../docs/tasks/EPIC-B2B-COLLABORATION-2026Q3/B2B-10-F3-COLLABORATION-API-AUTHORIZATION.md)
> — a scheduling M4 mérföldkő APPROVED, a B2B-10 F1/F2 APPROVED; a kritikus út az F3-on megy tovább.

## B2B-10 F3 — Collaboration API + authorization (2026-07-30, fut)

| Szelet | Állapot | Bizonyíték |
|---|---|---|
| F3/1 grant-alapú authorization | **APPROVED** (root, `0b555f0`) | 144/144 zöld, 6/6 saját + 2 root-mutáció megfogva |
| F3/2 API-host + `RequireEnabledModule` | **`review_requested`** | végpont-tesztek valódi pipeline-on |

**Mérés 2026-07-30 este:** **175/175 unit + 34/34 integrációs** (valódi PostgreSQL), 0 warning.
| F3/3a ETag / `If-Match` | **`review_requested`** | 9/9 mutáció megfogva (F3/3a+b együtt) |
| F3/3b `Idempotency-Key` tartós tárral | **`review_requested`** | tábla + unique index + RLS, valódi DB-n mérve |
| F3/4 `AgreementReadModel` + allowedActions-paritás | nem indult | — |
| F3/5 végpont-bizonyíték valódi Postgresen | nem indult | ✅ a Docker 2026-07-30 délelőtt elindult (Gábor), 25/25 zöld |

**Root-döntés MEGVAN (Gábor, 2026-07-30):** a részvétel-alapú modell marad — a vendég grant nélkül is elfogadhatja a
megállapodást, mert a granteket maga a megállapodás adja ki; enélkül körkörös. Amit a megállapodás hordoz, az grant-köteles. Egy helyen él, a megfordítása egysoros.

⚠ **F3/4-re előre jelzett drift:** az `AllowedActionsPolicy` (B2B-07 örökség) eltér a domaintől
(Draft-ban a vendégnek `Offer`-t ad, `Cancel`-t nem — a domain mindkettőt engedi). Ma ártalmatlan,
de a portál gombjai ebből épülnének.

## Hol van a kód

A `spaceos.scheduling` modul **külön repóban**: `Szantoi/spaceos-modules-scheduling`
(lokálisan `C:\Users\szant\Documents\Development\spaceos-modules-scheduling`).
A platform-repóban csak a task-doksik és az ADR-ek vannak — **modul-kód nem kerülhet bele**.
Aktuális `main`: `d63f317`, **CI zöld** (run `30438753129`); lokálisan is 398/398, mert a Docker elindult.

## Mérföldkövek

| Mérföldkő | Állapot | Bizonyíték |
|---|---|---|
| M1 — kalkulációs mag | **DONE** (root-review) | EffortCalculator, DependencyBoundResolver, DependencyGraph; hash-pinnelt Doorstar-vektorok |
| M2 — aggregátumok + perzisztencia + RLS | **DONE** (root-review, 2026-07-28) | 9 tábla FORCE RLS, valódi migrációs proof, `CalendarException` (P1 pótolva) |
| M3 — publikált kontraktus | **DONE** (root-review) — **kézbesítve a Doorstarnak** | `docs/openapi.yaml` 3.1, SHA-256 `3fc6c57d…` (saját méréssel igazolva a `main` blobjához) |
| M4 — véges kapacitású ütemező | **a belső hatókör KIMERÜLT** (6 szelet); a kontraktus-bővítés root-döntésre vár | port + referencia + CP-SAT + conformance; naptár-bekötés; `lagKind`; solver DI-bekötés; **shadow-diff** (`5cf9e7a`) |
| M5 | nem indult | — |

## Mérés (2026-07-29 délután)

**Scheduling `5cf9e7a`: 414/414 zöld lokálisan** (a `d63f317` CI-zöld volt 398-cal) — CI (run `30438753129`) **és lokálisan is**, mert a
Docker 2026-07-29 délutánján elindult. Domain **254** / Solver.OrTools 26 / Infrastructure 65 /
**Host 50** / **Integration 19**. Szótár-őr OK, `--locked-mode` zöld, generált TS-kliens 558 sor.

**DMS (platform-repó) `6554a09`: 99/99 zöld**, köztük **11 integrációs valódi PostgreSQL-en** —
tehát a `DocumentOwnerIdentity` migráció és az RLS-izoláció **bizonyított**.

**A linux-x64 natív OR-Tools bináris is mérve** (CI, ubuntu-latest/glibc): a 26 solver-teszt —
a determinizmus-kapuval együtt — ott is zöld, a fejlesztői win-x64 mellett.

## Ami a helyén van (és negatív kontrollal igazolt)

- ADR-067 **szótár-őr** — a magban nincs iparági szókincs (a saját kommentjeimet is megfogta).
- **Hash-pinnelt** Doorstar input-pack **v1 + v2**, mindkét kapu külön fut.
- EF-modell ↔ **RLS szinkron-őr** mindkét irányban (új tábla policy nélkül = build-bukás).
- OpenAPI **route- és alak-drift őr** mindkét irányban + **CI-ben generált TS-kliens**.
- **Wire-kód őrök**: minden warning-kód szerepel a specben, és a v2-fixture stringjeit a
  projekció állítja elő (a másolat-drift ezzel kizárva).
- **ADR-070 D3 determinizmus**: azonos bemenet → azonos revision-hash, a beadási sorrendtől is
  függetlenül.
- **Audit append-only** DB-szinten **triggerrel** (nem REVOKE — a grantokat újraadja, aki
  provisionál).
- **Közös solver-conformance**: egy absztrakt teszt-osztályt **mindkét** stratégia futtat.
  Nem azonos kimenetet vár (az optimalizálónak szabad jobbat találnia), hanem invariánsokat.
  Ez fogta meg, hogy a referencia az **FF/SF finish-korlátot** csendben eldobta — javítva.
- **A natív bináris előbb bizonyítva, mint a kód**: OrTools 9.15.6755 betöltődik win-x64-en,
  fix seed + 1 worker kétszer ugyanaz.

## Ismert korlátok / adósságok

- A referencia-ütemező **mohó, nem lép vissza** — ezért van port. Mérve a greedy csapdáján:
  **referencia 160 perc → CP-SAT 110 perc**.
- **RID-mátrix:** linux-x64 (CI, glibc) és win-x64 (fejlesztői) mérve. **Alpine/musl NEM** —
  az ADR-070 nyitott pontja marad, deploy előtt a tényleges base image-en mérendő.
- **Nyitott döntés (üzleti):** a **lag mértékegysége** — ma munkaperc, de a száradás/kötés
  típusú lag valós eltelt idő. Javaslat: additív `lagKind` (`working` | `elapsed`).
- **Eltérő naptárú erőforrások között a precedencia valós időben sérülhet** — a kiterítés ezt
  **kimondja** (`PrecedenceBrokenAcrossCalendars`), nem javítja csendben. A kapacitás nem
  érintett (erőforrásonként monoton a leképezés).
- A run-folyamat **endpointja** hátravan (a solver DI-bekötése kész, `7cd7276`); az írás-végpontok
  az ADR-069 szerint amúgy is a 2. fázis.
- `Resource` aggregátum **szándékosan nincs** (M2 scope-döntés, root elfogadta): a kapacitás és
  a naptár a `ResourceCalendarRevision`-ön él. Képesség-mátrixnál születik meg.
- ~~A hosting `DevelopmentAuthenticationHandler` nem ad `enabled_modules` claimet~~ —
  **MEGOLDVA**: a Codex ERPSEP-06 szelete **root-APPROVED** (2026-07-29 délután). A claim
  konfigurálható, az üres alapérték szándékosan fail-closed marad.
- **Nexus MCP-tunnel nem él** — a mailbox-kézbesítés a lokális sorban vár.

## Kapuk, amik NEM az enyémek

Élesítés, VPS-művelet, éles DB-migráció, sandbox-kitettség: **Gábor-kapu**. A sandbox terve
végrehajtásra kész (Tailnet-only, dedikált Keycloak-kliens az éles realmben), de a VPS-en
**semmi nem futott**.
