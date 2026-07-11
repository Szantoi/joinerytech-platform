# Joinery Module Context

**Project:** `spaceos/joinery`
**Epic:** EPIC-JOINERY-V2
**Status:** DONE ✅ (completed: 2026-05-15)
**Last Updated:** 2026-06-24

---

## Aktuális állapot (HOT)

**Epic Status:** DONE ✅

Joinery Module v2 DONE státuszban van. Nincs aktív fejlesztés vagy sprint.

### Utolsó mérföldkövek (2026-05-15)
- ✅ Gyártólap PDF generálás
- ✅ Batch anyaglista aggregáció
- ✅ Order conversion workflow

---

## Közelmúlt (WARM — utolsó 2 hét)

### Portal v2 integráció (2026-06-21 consensus)
A Portal v2 (EPIC-PORTAL-V2) **Joinery API-t használja** a backend adatokhoz:

**Joinery API endpoints használatban:**
```
GET  /joinery/api/designs           # Termék lista
POST /joinery/api/doors             # Ajtó létrehozás
GET  /joinery/api/doors/{id}/bom    # Anyaglista lekérés
POST /joinery/api/products/configure # Konfigurátor
POST /joinery/api/work-orders        # Munkalap generálás
```

**Vertical slice workflow:**
1. Konfigurátor → BOM → Munkalap (teljes értéklánc)
2. Offline capability + mobil UX
3. Doorstar Q2 soft launch előkészítés

---

## Architekturális alapok (COLD — stabil)

### Module Scope
**Joinery Module** = Asztalos modul — ajtó/szekrény paraméterezés, anyaglista, gyártólap.

**Funkcionális scope:**
- Termék konfiguráció (ajtó, szekrény, egyedi bútor)
- BOM (Bill of Materials) generálás
- Gyártólap PDF export
- Order batch anyaglista aggregáció

**Boundaries:**
- ✅ Joinery OWNS: design paraméterek, BOM kalkuláció, munkalap template
- ❌ Joinery NOT OWNS: nesting (Cutting), készlet menedzsment (Inventory), megrendelés workflow (Kernel)

### Dependencies (EPICS.yaml)
```yaml
depends_on:
  - EPIC-KERNEL-STABLE
parallel_with:
  - EPIC-CUTTING-Q3
status: done
target_date: '2026-05-15'
```

**Backend dependencies:**
- `SpaceOS.Kernel` — Auth, Audit, FSM base
- PostgreSQL 15 — RLS policies
- .NET 8 Clean Architecture

**Frontend dependencies:**
- `spaceos-orchestrator` — BFF API gateway
- React 18 portal

### Domain Model (Asztalos specifikus)

**Aggregate Roots:**
- `JoineryProduct` — ajtó/szekrény konfiguráció
- `WorkOrder` — gyártási munkalap
- `BOM` — anyaglista (value object)

**Key Entities:**
- `DoorProfile` — ajtó profil (pl. síklap, fényezett, stb.)
- `HingeType` — zsanér típus
- `EdgeBanding` — élzárás

**FSM states:** (ha van)
- `Draft` → `Configured` → `BOMGenerated` → `WorkOrderCreated` → `Approved`

---

## Kapcsolódó tudás

### Patterns & Best Practices
Joinery-specifikus pattern doc **nincs még** a knowledge base-ben.

**Általános backend patterns relevánsak:**
- [DATABASE_PATTERNS.md](../patterns/DATABASE_PATTERNS.md) — EF Core, RLS
- [DOTNET_8_CLEAN_ARCHITECTURE_2026.md](../architecture/DOTNET_8_CLEAN_ARCHITECTURE_2026.md)
- [TEST_COVERAGE_PATTERNS.md](../patterns/TEST_COVERAGE_PATTERNS.md)

### API Endpoints (Joinery Module)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/joinery/api/designs` | GET | Termék lista (ajtó/szekrény template-ek) |
| `/joinery/api/doors` | POST | Ajtó létrehozás konfigurációval |
| `/joinery/api/doors/{id}/bom` | GET | Anyaglista lekérés |
| `/joinery/api/products/configure` | POST | Konfigurátor (paraméterek → validation) |
| `/joinery/api/work-orders` | POST | Munkalap generálás |

### Known Gotchas
1. **BOM kalkuláció precision** — floating point hibák → decimal típus használata
2. **Edge banding length calculation** — kerekítés 5mm-re felfelé (gyártási szabvány)
3. **Multi-material BOM** — egy ajtóhoz 5-10 különböző anyag → aggregálás batch szinten

---

## Következő fázis (jövőbeli roadmap)

### Joinery v3 elképzelések (nincs tervezve még)
- **CAD export** — DXF/DWG formátum support
- **Custom hinge placement** — non-standard zsanér pozíció
- **Material substitution** — alternatív anyagok javaslata készlethiány esetén

### Dependencies jövőbeli fejlesztéshez
- **Cutting Module v2** — nesting algoritmus finomítása asztalos lapokhoz
- **Inventory Module v2** — real-time material availability check

---

## Kapcsolódó terminálok

| Terminál | Szerepkör | Interakció |
|----------|-----------|------------|
| **Backend** | Joinery module backend (.NET) | DONE státusz, maintenance only |
| **Frontend** | Joinery konfigurátor UI | Portal v2 integráció használja |
| **Architect** | Domain design konzultáció | Ha v3 terv készül |
| **Explorer** | Asztalos CAD pattern kutatás | Ha CAD export feature készül |

---

## Referenciák

- **Epic definition:** `docs/projects/EPICS.yaml` (EPIC-JOINERY-V2)
- **Portal integráció:** `docs/planning/consensus/2026-06-21_consensus.md`
- **Doorstar onboarding:** `docs/knowledge/architecture/SpaceOS_Doorstar_Onboarding_v4.md`
- **Vision doc:** `docs/knowledge/context/VISION.md`

---

## Státusz összefoglaló

**Joinery Module v2 = STABLE, PRODUCTION-READY, DONE ✅**

Nincs aktív fejlesztési igény. A modul használatban van a Portal v2-ben.
Jövőbeli feature kérések (CAD export, custom hinge) még tervezési fázisban sincsenek.

Ha új Joinery feature készül → új CONTEXT frissítés kell (HOT section).
