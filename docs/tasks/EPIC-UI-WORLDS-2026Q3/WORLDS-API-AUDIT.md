# WORLDS-API-AUDIT — Production+Warehouse backend kontraktus-audit (API-first alap)

**Epic:** EPIC-UI-WORLDS-2026Q3 · **Szerep:** backend · **Kiadva:** 2026-07-18 (root)
**Output:** `docs/knowledge/architecture/WORLDS_API_CONTRACTS_2026-07-18.md`

## Cél

Gábor döntése (2026-07-18): a világ-modernizálás **API-first** — a portál-adatréteg a
valós spaceos-kontraktusból indul, nem MSW-előképből. Ehhez kell a hiteles kontraktus-doksi
a 4 érintett backendről, a **lokálisan kicheckoutolt submodule-forrásból** (a pinek a
VPS-en futó develop-csúcsok):

| Világ | Backend | Submodule | VPS-port |
|---|---|---|---|
| production | cutting | `src/spaceos-modules-cutting` | 5005 |
| production | joinery | `src/spaceos-modules-joinery` | 5002 |
| warehouse | inventory | `src/spaceos-modules-inventory` | 5004 |
| warehouse | procurement | `src/spaceos-modules-procurement` | 5006 |

## Feladat

Modulonként, a forrásból (Program.cs, MapGroup-ok, endpoint-fájlok, DTO-k, domain-enumok):

1. **Route-térkép**: teljes URL (MapGroup-prefixszel!), verb, request/response DTO-alak,
   státuszkódok. A `/internal/*` és integrációs (service-to-service) végpontokat KÜLÖN
   szekcióba — azok nem portál-felület.
2. **DTO-k + enumok**: mezőnevek, típusok, nullability; enum wire-alak (string? szám?
   naming policy?). ⚠ ADR-059 (elfogadva): a wire-nyelv MAGYAR kulcs lesz EnumWireMap-pel —
   jelezd, hol angol ma az enum-wire (ez a wave 2 EnumWireMap-scope-jába kerül).
3. **FSM-ek**: állapotgépek a domainben (pl. purchase order approve/dispute/convert lánc,
   offcut reserve/approve/use), átmenet-táblák — a portál fsmGuards-tükréhez.
4. **Auth/tenant**: mit vár ma a service (header? token?) — ⚠ az ADR-061/062 hosting-kör
   ezekre a modulokra MÉG NEM terjed ki, a mai állapotot rögzítsd + jelöld gap-nek.
5. **Hiány-lista**: mi kell a portál-képernyőkhöz, ami nincs a backendben (pl. lista-szűrők,
   összesítő endpointok) — follow-up task-jelöltek.
6. **Élő ellenőrzés** (szúrópróba): `ssh joinerytech-vps 'curl -s http://localhost:<port>/<route>'`
   1-2 GET végpontra modulonként — a doksi a FUTÓ állapotot írja le, ne csak a forrást.

## Korlátok

- **READ-ONLY a submodulokban és a portálban** — semmit nem írsz át, csak a doksit írod.
- A `terminals/`, `src/ehs`, `src/qa`, `src/hr`, `src/maintenance`, `src/dms`,
  `src/SpaceOS.Modules.CRM`, `src/kontrolling`, `src/spaceos-modules-hosting` fák TILTOTTAK
  (ott a hosting-agent dolgozik).
- GIT COMMIT TILOS — a root commitol.
- Kötelező forrás-minták: docs/knowledge/patterns/DATABASE_PATTERNS.md,
  docs/knowledge/architecture/ADR_CATALOGUE.md, docs/knowledge/adr/ (059..064).

## Kész-kritérium

A doksiból egy frontend-agent KÉRDÉS NÉLKÜL meg tudja írni a `src/modules/production`
és `src/modules/warehouse` zod-sémáit + fetchereit + FSM-tükreit.
