# BACKEND Terminal State

> **Frissítve:** 2026-07-28 este (Europe/Budapest)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a `done`/`APPROVED`
> kimondása **root-review joga**, ez a fájl a végrehajtó nézete.
> **Aktív task:** [`PLAN-03`](../../docs/tasks/EPIC-PRODUCTION-PLANNING-2026Q3/PLAN-03-SCHEDULING-IMPLEMENTATION.md)

## Hol van a kód

A `spaceos.scheduling` modul **külön repóban**: `Szantoi/spaceos-modules-scheduling`
(lokálisan `C:\Users\szant\Documents\Development\spaceos-modules-scheduling`).
A platform-repóban csak a task-doksik és az ADR-ek vannak — **modul-kód nem kerülhet bele**.
Aktuális `main`: `83e403c`, **CI zöld**.

## Mérföldkövek

| Mérföldkő | Állapot | Bizonyíték |
|---|---|---|
| M1 — kalkulációs mag | **DONE** (root-review) | EffortCalculator, DependencyBoundResolver, DependencyGraph; hash-pinnelt Doorstar-vektorok |
| M2 — aggregátumok + perzisztencia + RLS | **DONE** (root-review, 2026-07-28) | 9 tábla FORCE RLS, valódi migrációs proof, `CalendarException` (P1 pótolva) |
| M3 — publikált kontraktus | **DONE** (root-review) — **kézbesítve a Doorstarnak** | `docs/openapi.yaml` 3.1, SHA-256 `3fc6c57d…` (saját méréssel igazolva a `main` blobjához) |
| M4 — véges kapacitású ütemező | **fut**, 1. szelet kész | `ISchedulingSolver` port + determinisztikus referencia-ütemező; ADR-070 D3 kapu áll |
| M5 | nem indult | — |

## Mérés (2026-07-28 este, teljes suite)

**324 zöld, 0 bukás** — Domain 219 / Infrastructure 43 / Host 43 / **Integration 19**.
Az integrációs sáv igazi PostgreSQL-en, FORCE RLS-ben, **nem-superuser** szerepen, a valódi
`Program`-on át fut (Docker a fejlesztői gépen újra elérhető, nem csak CI-ban).

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

## Ismert korlátok / adósságok

- A referencia-ütemező **mohó, nem lép vissza** — ezért van port; a CP-SAT adapter következik.
- `Resource` aggregátum **szándékosan nincs** (M2 scope-döntés, root elfogadta): a kapacitás és
  a naptár a `ResourceCalendarRevision`-ön él. Képesség-mátrixnál születik meg.
- A hosting `DevelopmentAuthenticationHandler` **nem ad `enabled_modules` claimet**, így
  `Jwt:Mode=Development` mellett a modul-kapu mindent 403-mal utasít el. Fail-closed, tehát
  helyes — de a lokális futtatást ellehetetleníti. Javaslat a Codex/ERPSEP-06 sávnak kiment,
  root **támogatja** (két kikötéssel). Nálam nem blokkoló: teszt-séma mintázza a claimeket.
- **Nexus MCP-tunnel nem él** — a mailbox-kézbesítés a lokális sorban vár.

## Kapuk, amik NEM az enyémek

Élesítés, VPS-művelet, éles DB-migráció, sandbox-kitettség: **Gábor-kapu**. A sandbox terve
végrehajtásra kész (Tailnet-only, dedikált Keycloak-kliens az éles realmben), de a VPS-en
**semmi nem futott**.
