# BACKEND Terminal State

> **Frissítve:** 2026-07-29 délelőtt (Europe/Budapest)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a `done`/`APPROVED`
> kimondása **root-review joga**, ez a fájl a végrehajtó nézete.
> **Aktív task:** [`PLAN-03`](../../docs/tasks/EPIC-PRODUCTION-PLANNING-2026Q3/PLAN-03-SCHEDULING-IMPLEMENTATION.md)

## Hol van a kód

A `spaceos.scheduling` modul **külön repóban**: `Szantoi/spaceos-modules-scheduling`
(lokálisan `C:\Users\szant\Documents\Development\spaceos-modules-scheduling`).
A platform-repóban csak a task-doksik és az ADR-ek vannak — **modul-kód nem kerülhet bele**.
Aktuális `main`: `0efc329`, **CI zöld** (run `30426082492`, Gábor engedélyével pusholva).

## Mérföldkövek

| Mérföldkő | Állapot | Bizonyíték |
|---|---|---|
| M1 — kalkulációs mag | **DONE** (root-review) | EffortCalculator, DependencyBoundResolver, DependencyGraph; hash-pinnelt Doorstar-vektorok |
| M2 — aggregátumok + perzisztencia + RLS | **DONE** (root-review, 2026-07-28) | 9 tábla FORCE RLS, valódi migrációs proof, `CalendarException` (P1 pótolva) |
| M3 — publikált kontraktus | **DONE** (root-review) — **kézbesítve a Doorstarnak** | `docs/openapi.yaml` 3.1, SHA-256 `3fc6c57d…` (saját méréssel igazolva a `main` blobjához) |
| M4 — véges kapacitású ütemező | **fut**, 1–3. szelet kész (2. **APPROVED**, 3. `review_requested`) | port + referencia; CP-SAT adapter + conformance (`0efc329`, CI zöld); utókövetés (`5957459`); **naptár-bekötés** (`b02616b`) |
| M5 | nem indult | — |

## Mérés (2026-07-29 délelőtt)

**CI zöld a `b02616b`-n: 392 teszt** (run `30428183130`) — Domain 245 / Solver.OrTools 26 /
Infrastructure 59 / Host 43 / **Integration 19**. Szótár-őr OK, generált TS-kliens 558 sor.

**Lokálisan a `d63f317`-en: 379 zöld** (Infrastructure 65) — build 0 warning, szótár-őr OK.
**A `d63f317` (lagKind) még nincs pusholva**, a CI azon nem futott.

**Ezzel a linux-x64 natív OR-Tools bináris is mérve** (ubuntu-latest, glibc): a 26 solver-teszt
— a determinizmus-kapuval együtt — ott is zöld. Lokálisan csak win-x64 volt bizonyítható, mert
a **Docker ezen a gépen nem fut** (Testcontainers-hiba, igazolva), így az integrációs sáv
helyben ma sem mérhető.

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
- A **Host egyik stratégiát sem regisztrálja** DI-ből — a run-folyamat bekötése hátravan.
- `Resource` aggregátum **szándékosan nincs** (M2 scope-döntés, root elfogadta): a kapacitás és
  a naptár a `ResourceCalendarRevision`-ön él. Képesség-mátrixnál születik meg.
- A hosting `DevelopmentAuthenticationHandler` **nem ad `enabled_modules` claimet**, így
  `Jwt:Mode=Development` mellett a modul-kapu mindent 403-mal utasít el. Fail-closed, tehát
  helyes — de a lokális futtatást ellehetetleníti. **2026-07-29 10:05: a Codex leszállította
  (ERPSEP-06, `review_requested`, hosting 76/76)** — a claim mostantól konfigurálható, az üres
  alapérték szándékosan fail-closed. Root-approval után ez a korlát törölhető innen.
- **Nexus MCP-tunnel nem él** — a mailbox-kézbesítés a lokális sorban vár.

## Kapuk, amik NEM az enyémek

Élesítés, VPS-művelet, éles DB-migráció, sandbox-kitettség: **Gábor-kapu**. A sandbox terve
végrehajtásra kész (Tailnet-only, dedikált Keycloak-kliens az éles realmben), de a VPS-en
**semmi nem futott**.
