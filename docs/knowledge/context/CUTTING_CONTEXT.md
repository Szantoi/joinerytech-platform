# Cutting Module Context

**Project:** `spaceos/cutting`
**Epic:** EPIC-CUTTING-Q3
**Status:** ACTIVE (target: 2026-09-30)
**Last Updated:** 2026-07-21

---

## Aktuális állapot (HOT — utolsó 48 óra)

### 2026-07-21 — auth/tenant hardening és adapter-stabilizálás

- Az analytics endpointok tenantja a `tid` JWT claimből származik; a
  `tenant_id` csak átmeneti fallback.
- A publikus `tenantId` query nem írhatja felül a hitelesített identitást.
- A pricing-rules csoport `ManufacturerOnly` policy alatt áll.
- A publikus quote subdomain resolver EF Core scalar projectionje javítva;
  célzott eredmény 3/10-ről 10/10-re.
- A pricing breakdown és az OptiCut XML számformátuma `hu-HU` hoston is
  invariáns; célzott eredmény 34/34.
- Célzott security kapu: 41/41 zöld; build: 0 hiba.
- Az authfix review PASS után `a889109` Cutting commitban és `ff1ff3e`
  platform-pinben rögzítve. A resolver, kultúrafüggetlenítési és subprocess
  portability, email boundary és quote tenant-harness diff review-ra vár;
  aktuális teljes suite **1053/1053, 0 hiba**. Az EmailService unit kapu
  hálózatmentes; a quote admin út canonical `tid`/legacy fail-closed feloldással
  és tenant + quote repository predikátummal működik.

Elsődleges dokumentumok:

- [Cutting auth- és tenant-kontraktus](../architecture/CUTTING_AUTH_TENANCY_CONTRACT_2026-07-21.md)
- [Cutting fejlesztési és tesztelési runbook](../engineering/CUTTING_DEVELOPMENT_TEST_RUNBOOK.md)
- [WORLDS-CUTTING-AUTHFIX task](../../tasks/EPIC-UI-WORLDS-2026Q3/WORLDS-CUTTING-AUTHFIX.md)

### Sprint eredmények (2026-06-22/23)

**Frontend:**
- ✅ TOP3 Batch Assignment Kanban Board — native HTML5 drag-drop implementálva
  - 4 column layout: Unassigned / Machine A / Machine B / Machine C
  - Visual feedback: cursor-move, hover:shadow-lg
  - Optimistic UI update → API POST → revalidate
  - Pattern doc: `docs/knowledge/patterns/FRONTEND_DRAG_DROP_PATTERNS.md`

**Backend:**
- ✅ Assign Batch endpoint — `POST /cutting/api/execution/assign-batch`
  - FSM transition: `Planned → Scheduled`
  - RLS validation: csak saját tenant batch-ek
  - Testcontainers integration test coverage
- ✅ Quote Request Validation — idempotency + validation rules
- ✅ Infrastructure tests session 2 + 3 complete

### Aktív blockerek
Nincs BLOCKED task jelenleg.

### Teszt számok (legutóbbi)
- Backend test coverage: ~85% (Domain + Application layers)
- E2E coverage: TOP3 workflow tesztelve

---

## Közelmúlt (WARM — utolsó 2 hét)

### 2026-06-16 Consensus — Design→Cutting→Machining vertikum
**Terv:** Hibrid megközelítés (Sonnet-B capacity + Sonnet-A UX)
**3 fázis:**
1. Nesting Visualization (tanulási platform)
2. Scheduling Backend (capacity API)
3. Design→Cutting Workflow + Auto-Assign

**Implementált endpoint-ok:**
- `GET /cutting/api/cutting/sheets/{id}/nesting` — nesting vizualizáció adat
- `POST /cutting/api/execution/assign-batch` — batch machine assignment
- `GET /cutting/api/machines/capacity?date=YYYY-MM-DD` — gép kapacitás query
- `POST /cutting/api/sheets` — cutting plan submission (auto-assign support)

**Frontend komponensek:**
- `NestingViewer.tsx` — SVG-based sheet layout rendering
- `BatchAssignmentBoard.tsx` — Kanban drag-drop (TOP3)
- `CapacityOverview.tsx` — machine capacity timeline
- `ProductionPage.tsx` — cutting plans list + nesting viewer

### Sprint időbecslés
- Backend: 4 nap (nesting API + capacity API + auto-assign)
- Frontend: 7.5 nap (viz + kanban + workflow)
- **Teljes:** 11-12 nap

---

## Architekturális alapok (COLD — stabil döntések)

### Module Ownership & Scope
**Cutting Module** = Lapszabász modul — nesting, optimization, CNC integration.

**Funkcionális scope:**
- Sheet layout planning (nesting algorithms)
- Batch execution scheduling (machine assignment)
- CNC file export (future)
- Offcut tracking integration (ADR-038)

**Boundaries:**
- ✅ Cutting OWNS: nesting logic, machine capacity, batch scheduling
- ❌ Cutting NOT OWNS: product design (Joinery/Portal), inventory stock (Inventory module), order management (Kernel)

### ADR-038: Offcut Creation at Plan Freeze
**Döntés:** Offcut creation nem real-time nesting során, hanem plan freeze-nél (amikor a cutting plan véglegesítve van).

**Indoklás:**
- Nesting optimizer még iterál → offcuts változnak
- Plan freeze = commit point → inventory transaction
- ACID garantált (1 DB tranzakció: cutting plan + offcuts)

**Implementáció:** `CuttingService.FreezePlan()` metódus hívja az `IOffcutRepository.CreateFromNestingResult()`

**Referencia:** `docs/knowledge/architecture/SpaceOS_ADR_038_Offcut_Creation_At_Plan_Freeze.md`

### Dependencies (EPICS.yaml)
```yaml
depends_on:
  - EPIC-KERNEL-STABLE
parallel_with:
  - EPIC-JOINERY-V2
  - EPIC-INVENTORY-V1
```

**Backend dependencies:**
- `SpaceOS.Kernel` — Auth, Audit, FSM base, RLS
- `SpaceOS.Inventory.Contracts` — IOffcutRepository interface
- PostgreSQL 15 — RLS policies, JSONB storage

**Frontend dependencies:**
- `spaceos-orchestrator` — BFF API gateway (port 3000)
- React 18 + TypeScript
- TailwindCSS

---

## Kapcsolódó tudás

### Patterns & Best Practices
| Doc | Relevancia | Tier |
|-----|------------|------|
| [FRONTEND_DRAG_DROP_PATTERNS.md](../patterns/FRONTEND_DRAG_DROP_PATTERNS.md) | ⭐ CRITICAL | hot |
| [DATABASE_PATTERNS.md](../patterns/DATABASE_PATTERNS.md) | High | warm |
| [TESTING_STRATEGIES.md](../patterns/TESTING_STRATEGIES.md) | High | hot |
| [DOTNET_8_CLEAN_ARCHITECTURE_2026.md](../architecture/DOTNET_8_CLEAN_ARCHITECTURE_2026.md) | High | warm |

### API Endpoints (Cutting Module)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/cutting/api/cutting/sheets/{id}/nesting` | GET | Nesting visualization data |
| `/cutting/api/execution/assign-batch` | POST | Assign batch to machine |
| `/cutting/api/machines/capacity` | GET | Machine capacity query |
| `/cutting/api/sheets` | POST | Submit cutting plan (+ auto-assign) |
| `/cutting/api/plans` | GET | List cutting plans (ProductionPage) |

### Known Gotchas
1. **N+1 Query Risk:** `ProductionPage GET /cutting/api/plans` — ha `orderReference`, `templateName`, `customerName` hiányzik → N+1 query join kell
2. **RLS Tenant Isolation:** minden cutting query-ben kötelező `tenant_id` filter (PostgreSQL RLS policy enforce)
3. **FSM State Validation:** `Assign()` transition csak `Planned` state-ből működik → 400 Bad Request egyébként

---

## Következő fázis (Q3 roadmap)

### Q3 fókusz (2026-07 — 2026-09)
1. **Nesting Optimizer v2** — multi-sheet optimization (jelenleg single-sheet)
2. **CNC Integration** — export to .nc file format (Biesse, Homag support)
3. **Material Waste Analytics** — offcut re-use recommendations
4. **Mobile Support** — production floor tablet interface

### Dependencies Q3-ra
- **Inventory Module v1** (DONE ✅) — offcut tracking
- **Portal v2** (DONE ✅) — design→cutting workflow integration

---

## Kapcsolódó terminálok

| Terminál | Szerepkör | Interakció |
|----------|-----------|------------|
| **Backend** | Cutting module backend (.NET) | Implement Cutting domain logic, API, tests |
| **Frontend** | Cutting module UI (React) | Nesting viewer, batch assignment kanban, production page |
| **Architect** | Cross-module design review | ADR-038 offcut decision, module boundaries |
| **Explorer** | Codebase research | Find nesting algorithm patterns, CNC export libs |

---

## Referenciák

- **Epic definition:** `docs/projects/EPICS.yaml` (EPIC-CUTTING-Q3)
- **Consensus terv:** `docs/planning/consensus/2026-06-16_consensus.md`
- **Pattern docs:** `docs/knowledge/patterns/FRONTEND_DRAG_DROP_PATTERNS.md`
- **ADR-038:** `docs/knowledge/architecture/SpaceOS_ADR_038_Offcut_Creation_At_Plan_Freeze.md`
- **Backend outbox:** `terminals/backend/outbox/2026-06-22_021_cutting-assign-batch-done.md`

---

## Memento — security boundary audit (2026-07-21)

Elsődleges forrás:
[Cutting biztonsági audit](../architecture/CUTTING_SECURITY_AUDIT_2026-07-21.md).

- Az internal API többé nem fogadja el az `X-SpaceOS-Internal: true` konvenciót;
  rotált `SpaceOS:InternalSecret` / `SPACEOS_INTERNAL_SECRET` kell, hiányában
  fail-closed `503`.
- Az adapter `adapterName` canonical, tenant alatti útvonalra korlátozott; traversal
  bemenetek tiltottak.
- A SignalR execution hub a canonical `tid` claimet használja; hibás `tid` mellett
  nincs legacy fallback.
- A publikus quote route-ok per-IP limiter alatt állnak; production/staging DB
  connection string és JWT authority nélkül nem indul.
- MailKit 4.16.0; Cutting runtime dependency audit tiszta. A test-only xUnit/SQLite
  advisoryk külön supply-chain taskban maradnak.
- Bizonyíték: célzott 36/36 + 3/3, teljes suite 1069/1069, clean solution build
  0 warning/0 error.
- Stop: commit/pin/deploy csak független review és internal caller secret rollout után.
