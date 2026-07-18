# JoineryTech végrehajtási backlog — agent belépési pont

> **Állapotforrás:** [`EPICS.yaml`](../../EPICS.yaml)  
> **Minőségi szerződés:** [`QUALITY.md`](../../QUALITY.md)  
> **Aktuális baseline:**
> [`PROJECT_STATE_ASSESSMENT_2026-07-18.md`](../knowledge/architecture/PROJECT_STATE_ASSESSMENT_2026-07-18.md)

Ez az index azt rögzíti, hogy egy fejlesztő agent **melyik feladatot, milyen
előfeltételekkel és milyen bizonyítékkal** hajthat végre. Az `EPICS.yaml` mondja
meg a státuszt; az egyedi task-fájl a végrehajtási szerződés és később a mementó.

## Kötelező agent-protokoll

1. Olvasd el teljesen: `AGENTS.md`, `QUALITY.md`, az epic `README.md`-je és a
   kiosztott task-fájl.
2. Ellenőrizd a függőségeket az `EPICS.yaml`-ban. `pending` előfeltétel mellett
   ne kezdj mutációba.
3. Rögzítsd a preflightot a saját task-fájlodban: HEAD, érintett submodule HEAD,
   munkafa-státusz, baseline teszt és ismert pre-existing hiba.
4. Csak a task **Mutációs határ** szakaszában felsorolt fákat módosítsd. Idegen
   dirty diffet ne formázz, ne mozgass és ne javíts mellékesen.
5. A legkisebb bukó tesztet írd meg először; utána implementáció, célzott teszt,
   majd az előírt széles regresszió következik.
6. Tilos tesztet törölni/skippelni, globális timeouttal elfedni, wire-mezőt vagy
   endpointot kitalálni, illetve warningot új baseline-ná minősíteni.
7. A task-fájl végén töltsd ki a `Végrehajtási napló` és `Átadási bizonyíték`
   részt. Commitot csak a root készít, ha a task külön nem engedélyezi.
8. Kész task az epic `archive/` mappájába kerül; az `EPICS.yaml` státuszát root
   vagy conductor frissíti.

## Aktív végrehajtási sávok

| Sáv | Epic | Cél | Belépési pont |
|---|---|---|---|
| A | Platform Stability | auth/RLS bizonyíték, stabil tesztkapuk, reprodukálható futás | [`EPIC-PLATFORM-STABILITY-2026Q3/`](EPIC-PLATFORM-STABILITY-2026Q3/README.md) |
| B | UI Worlds | production + warehouse valós API-kontraktussal | [`EPIC-UI-WORLDS-2026Q3/`](EPIC-UI-WORLDS-2026Q3/README.md) |
| C | Project Core | Projects/FlowEpic/B2BHandshake bounded-context döntés | [`EPIC-PROJECT-CORE-2026Q3/`](EPIC-PROJECT-CORE-2026Q3/README.md) |
| D | ERP Separation | horizontális ERP, modulcsomagok, bundle és instance-kontraktus | [`EPIC-ERP-SEPARATION-2026Q3/`](EPIC-ERP-SEPARATION-2026Q3/README.md) |

## Függőségi térkép

```text
STAB-EHS-INTEGRATION -> STAB-TESTCONTAINERS-HYGIENE
STAB-RLS-PROOF ───────────────────────┐
STAB-EHS-INTEGRATION ─────────────────┤
STAB-TESTCONTAINERS-HYGIENE ──────────┼──> STAB-RELEASE-REPRO
STAB-FE-TEST-GATE ────────────────────┘

WORLDS-API-AUDIT (done) ──────────────┐
                                      ├──> WORLDS-PRODUCTION-FE
                                      │             │
WORLDS-CUTTING-AUTHFIX ───────────────┴─────────────┴──> WORLDS-PRODUCTION-API-GATE
                                                                  │
                                                                  v
                                                WORLDS-PRODUCTION-REVIEW
                                                                  │
WORLDS-INV-OFFCUT-ROUTEFIX -> WORLDS-INV-READ-API ────────────────┤
                                                                  ├──> WORLDS-WAREHOUSE-FE
WORLDS-PROC-BUILDFIX -> WORLDS-PROC-PO-FSM ───────────────────────┤             │
                                                                                v
                                                        WORLDS-WAREHOUSE-API-GATE
                                                                                │
                                                                                v
                                                         WORLDS-WAREHOUSE-REVIEW

WORLDS-INV-READ-API -> WORLDS-LOTS-ZONES-DECISION

PROJECT-BOUNDARY-AUDIT -> PROJECT-CORE-ADR
                           -> implementációs taskok csak az ADR elfogadása után

ERPSEP-01 -> ERPSEP-02 -> MODULE-PACKAGES ─┐
          -> ERPSEP-03 -> ERPSEP-07 ───────┼-> ERPSEP-08 -> ERPSEP-09
                         ERPSEP-05 ────────┤
                         ERPSEP-06 ────────┘
```

## Párhuzamossági szabályok

- A portált (`src/joinerytech-portal`) egyszerre **egy** frontend agent mutálhatja.
- Inventory, procurement és cutting külön submodule, ezért külön agent dolgozhat
  rajtuk, ha a gyökér `EPICS.yaml`-hoz és közös dokumentumhoz nem nyúlnak.
- A platform security task több modulon halad át; amíg fut, ugyanazon modul
  persistence/migrációs fáit más agent nem módosíthatja.
- A Project Core audit read-only módon párhuzamosítható; az ADR egyetlen szerzőé.
- Az ERP boundary audit read-only párhuzamosítható a Doorstar mapping audittal;
  egyik agent sem mutálhatja a másik repositoryját.
- `EPICS.yaml`, `docs/tasks/README.md` és epic-README-k root/conductor tulajdonúak.

## Definition of Ready

Egy task akkor adható ki, ha van:

- egyértelmű cél és üzleti ok;
- lezárt vagy felsorolt előfeltétel;
- konkrét forrás- és mutációs határ;
- mérhető elfogadási kritérium;
- futtatható tesztparancs és stop/escalate feltétel.

## Definition of Done

Egy task csak akkor `done`, ha:

- minden acceptance criterion bizonyítva;
- célzott és előírt regressziós teszt zöld;
- nincs új lint/build warning vagy elárvult Testcontainers-konténer;
- a task-fájlban szerepel a változott fájlok, tesztszámok, ismert gapek és a
  következő biztonságos lépés;
- a root diff-review-ja megtörtént.
