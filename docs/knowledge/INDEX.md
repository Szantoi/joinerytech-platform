# JoineryTech Knowledge Base — Faipar SaaS Platform

**Sziget:** JoineryTech (`/opt/joinerytech/`)
**Fókusz:** Faipar SaaS Platform
**Port:** 3458-3459
**Frissítve:** 2026-07-18

---

## Aktuális belépési pontok — 2026-07-18

> Az alábbi dokumentumok az aktuális állapot elsődleges tudástári forrásai. A
> `docs/joinerytech/` történeti design- és prototípus-korpusz; az élő cél- és
> státuszforrás az `EPICS.yaml`.

- [`architecture/PROJECT_STATE_ASSESSMENT_2026-07-18.md`](architecture/PROJECT_STATE_ASSESSMENT_2026-07-18.md)
  — teljes programállapot, QUALITY-megfelelés, kockázatok, lehetőségek és kapuk
- [`architecture/SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`](architecture/SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md)
  — ERP/domain szétválasztás, modul-bundle, instance pack és agent-végrehajtási terv
- [`../../EPICS.yaml`](../../EPICS.yaml) — élő program/epic goal-config
- [`../tasks/README.md`](../tasks/README.md) — agent-végrehajtási backlog,
  függőségek, fájlhatárok és Definition of Done
- [`architecture/WORLDS_API_CONTRACTS_2026-07-18.md`](architecture/WORLDS_API_CONTRACTS_2026-07-18.md)
  — production + warehouse API-first kontraktusaudit
- [`architecture/PORTAL_WORLDS_INVENTORY_2026-07-16.md`](architecture/PORTAL_WORLDS_INVENTORY_2026-07-16.md)
  — modernizált és legacy világok leltára
- [`adr/README.md`](adr/README.md) — ADR-059..064 döntések és végrehajtási kapuk
- [`architecture/VPS_SERVICE_STATE_2026-07-16.md`](architecture/VPS_SERVICE_STATE_2026-07-16.md)
  — VPS service-történet és ellenőrzési minta

---

## Áttekintés

A JoineryTech sziget a **faipari SaaS platform fejlesztési központja**. 7 modult tartalmaz:
- **CRM** — Customer Relationship Management
- **HR** — Human Resources
- **EHS** — Environment, Health & Safety
- **Kontrolling** — Cost tracking, EAC
- **Maintenance** — Eszköz karbantartás
- **QA** — Quality Assurance
- **DMS** — Document Management System

---

## Dokumentum Kategóriák

### patterns/ (16 dokumentum)

**Backend Patterns:**
- `DATABASE_PATTERNS.md` — EF Core, RLS, Testcontainers
- `EVENT_SOURCING_PATTERNS.md` — Domain events
- `CONTRACT_FIRST_DEVELOPMENT.md` — OpenAPI → code generation
- `SECURITY_PATTERNS.md` — JWT, RBAC, RLS

**Frontend Patterns:**
- `DATAHAVEN_UI_PATTERNS.md` — Dashboard komponensek
- `FRONTEND_DRAG_DROP_PATTERNS.md` — Drag & drop patterns
- `FRONTEND_VERIFICATION_WORKFLOW.md` — Frontend review workflow
- `REACT_18_TYPESCRIPT_MODERNIZATION.md` — React 18 best practices
- `LOCALSTORAGE_KPI_DASHBOARD_PATTERN.md` — LocalStorage KPI cache
- `OFFLINE_FIRST_WIZARD_PATTERN.md` — Offline-first forms
- `UX_DESIGN_PRINCIPLES.md` — UX guidelines

**Code Generation:**
- `CODE_GENERATOR_CATALOGUE.md` — Roslyn, Orval, Plop.js
- `CODEGEN_TOOLCHAIN_PATTERN.md` — Orval + NSwag workflow

**Migration & Testing:**
- `JOINERYTECH_MIGRATION_PATTERNS.md` — Migration patterns
- `TESTING_STRATEGIES.md` — E2E, Integration, Unit testing
- `ENTERPRISE_GOVERNANCE_PATTERNS.md` — Governance

### architecture/ (folyamatosan bővülő, dátumozott állapotokkal)

- `DOTNET_8_CLEAN_ARCHITECTURE_2026.md` — .NET 8 Clean Architecture
- `MULTI_TENANT_RLS_ARCHITECTURE_2026.md` — PostgreSQL RLS multi-tenancy
- `GRAPH_BASED_WORKFLOW.md` — Graph workflow engine
- `ECOSYSTEM_MODULE_ARCHITECTURE.md` — 7 modul architektúra
- `ARCHITECTURAL_PATTERNS_CATALOGUE.md` — Összefoglaló
- `ADR_CATALOGUE.md` — Architekturális döntések
- `ADR-048-Datahaven-UI-Planning-Components.md` — Planning UI
- `PROJECT_STATE_ASSESSMENT_2026-07-18.md` — aktuális program- és projektállapot
- `SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md` — moduláris termékcsalád-célarchitektúra
- `PORTAL_WORLDS_INVENTORY_2026-07-16.md` — portál világ-leltár
- `WORLDS_API_CONTRACTS_2026-07-18.md` — API-first production/warehouse kontraktusok
- `VPS_SERVICE_STATE_2026-07-16.md` — VPS service-állapot és helyreállítás

### engineering/ (8 dokumentum)

- `backend_dotnet.knowledge.md`
- `database_efcore.knowledge.md`
- `efcore_installation.knowledge.md`
- `frontend_react.knowledge.md`
- `testing_backend_dotnet.knowledge.md`
- `testing_frontend_react.knowledge.md`
- `testing_strategy.knowledge.md`
- `BACKEND_PATTERNS.md`

### domain/ (6+ dokumentum)

**7 Modul Domain Modellek:**
- `CRM_DOMAIN_MODEL.md`
- `HR_DOMAIN_MODEL.md`
- `QA_DOMAIN_MODEL.md`
- `MAINTENANCE_DOMAIN_MODEL.md`
- `DMS_DOMAIN_MODEL.md`
- `code/` mappa (implementation templates)

**Project Docs:**
- `BACKEND_ARCHITECTURE_PLAN.md`
- `ZUSTAND_INTEGRATION_STRATEGY.md`
- `PROJECT_STATUS.md`

### snippets/ (6 dokumentum)

- `react-hook.md`
- `testcontainers-setup.md`
- `jwt-pattern.md`
- `efcore-migration.md`
- `rls-template.md`
- `zustand-store.md`

### datahaven/ (3 dokumentum)

- `FILE_UPLOAD_GUIDE.md`
- `KANBAN_API_GUIDE.md`
- `PLANNING_UI_USER_GUIDE.md`

### graph/ (1 dokumentum)

- `GRAPH_WORKFLOW_USAGE.md`

### context/ (5 dokumentum)

- `CUTTING_CONTEXT.md` — Vágólap modul kontextus
- `JOINERY_CONTEXT.md` — Asztalos modul kontextus
- `KERNEL_CONTEXT.md` — Kernel modul kontextus
- `PORTAL_CONTEXT.md` — Portal kontextus
- `VISION.md` — JoineryTech vízió

### deployment/ (1 dokumentum)

- `KNOWN_GOTCHAS.md` — Telepítési csapdák

---

## Technológiák

**Backend:**
- .NET 8 (Minimal API + Clean Architecture)
- PostgreSQL (RLS multi-tenancy)
- EF Core 8
- MediatR (CQRS)

**Frontend:**
- React 19.2 (TypeScript 6.0)
- Vite 8
- TanStack Query (React Query v5)
- Zustand (state management)
- Orval (OpenAPI → hooks)

**DevOps:**
- Testcontainers
- Vitest
- Playwright (E2E)

---

## Kapcsolódó Dokumentumok

- `/opt/joinerytech/CLAUDE.md` — Terminál konfigurációk
- `/opt/spaceos/docs/architecture/4-ISLAND-ARCHITECTURE.md` — 4-sziget áttekintés
- `/opt/joinerytech/docs/joinerytech/` — Legacy domain docs (migráció alatt)

---

## Következő Lépések

1. **Hosting/Auth/RLS kapu** — ADR-061/062 közös csomag, tenant-izolációs bizonyíték
2. **API-first világmodernizálás** — production, majd warehouse
3. **Valós API vertical slice** — MSW/API feature flag + contract drift + E2E
4. **Projekt-platform ADR** — hierarchy + FlowEpic + actor-nézet + B2BHandshake ownership
5. **Reprodukálhatóság** — determinisztikus tesztkapu, gitlink-javítás, README-k

---

_JoineryTech Knowledge Base — aktuális index: 2026-07-18_
