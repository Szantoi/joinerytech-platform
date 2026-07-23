# JoineryTech Knowledge Base — Faipar SaaS Platform

**Sziget:** JoineryTech (`/opt/joinerytech/`)
**Fókusz:** Faipar SaaS Platform
**Port:** 3458-3459
**Frissítve:** 2026-07-23

---

## Aktuális belépési pontok — 2026-07-23

> Az alábbi dokumentumok az aktuális állapot elsődleges tudástári forrásai. A
> `docs/joinerytech/` történeti design- és prototípus-korpusz; az élő cél- és
> státuszforrás az `EPICS.yaml`.

- [`architecture/PROJECT_STATE_CHECKPOINT_2026-07-23.md`](architecture/PROJECT_STATE_CHECKPOINT_2026-07-23.md)
  — aktuális working-tree állapot, kész/félkész/blokkolt szeletek, biztonságos
  folytatási sorrend és rollout-kapuk
- [`architecture/PROJECT_STATE_ASSESSMENT_2026-07-18.md`](architecture/PROJECT_STATE_ASSESSMENT_2026-07-18.md)
  — előző teljes programfelmérés, QUALITY-megfelelés, kockázatok és lehetőségek
- [`architecture/SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`](architecture/SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md)
  — ERP/domain szétválasztás, modul-bundle, instance pack és agent-végrehajtási terv
- [`../../EPICS.yaml`](../../EPICS.yaml) — élő program/epic goal-config
- [`../tasks/README.md`](../tasks/README.md) — agent-végrehajtási backlog,
  függőségek, fájlhatárok és Definition of Done
- [`architecture/WORLDS_API_CONTRACTS_2026-07-18.md`](architecture/WORLDS_API_CONTRACTS_2026-07-18.md)
  — production + warehouse API-first kontraktusaudit
- [`architecture/CUTTING_AUTH_TENANCY_CONTRACT_2026-07-21.md`](architecture/CUTTING_AUTH_TENANCY_CONTRACT_2026-07-21.md)
  — Cutting JWT/tenant/policy szerződés és ERP-től független SpaceOS-minta
- [`architecture/CUTTING_SECURITY_AUDIT_2026-07-21.md`](architecture/CUTTING_SECURITY_AUDIT_2026-07-21.md)
  — internal auth, adapterhatár, rate limit, runtime dependency audit és agent-ready hardening kapuk
- [`engineering/CUTTING_DEVELOPMENT_TEST_RUNBOOK.md`](engineering/CUTTING_DEVELOPMENT_TEST_RUNBOOK.md)
  — reprodukálható Cutting build, célzott security gate és teljes-suite triázs
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
- `SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md` — vállalatközi kézfogás, delegált munka, digitális megállapodás és participant-RLS
- `PORTAL_WORLDS_INVENTORY_2026-07-16.md` — portál világ-leltár
- `WORLDS_API_CONTRACTS_2026-07-18.md` — API-first production/warehouse kontraktusok
- `CUTTING_AUTH_TENANCY_CONTRACT_2026-07-21.md` — hitelesített tenant- és
  Manufacturer policy kontraktus
- `CUTTING_SECURITY_AUDIT_2026-07-21.md` — Cutting boundary/supply-chain leletek,
  javítások, maradék kockázatok és review kapu
- `VPS_SERVICE_STATE_2026-07-16.md` — VPS service-állapot és helyreállítás

### engineering/ (9+ dokumentum)

- `backend_dotnet.knowledge.md`
- `database_efcore.knowledge.md`
- `efcore_installation.knowledge.md`
- `frontend_react.knowledge.md`
- `testing_backend_dotnet.knowledge.md`
- `testing_frontend_react.knowledge.md`
- `testing_strategy.knowledge.md`
- `BACKEND_PATTERNS.md`
- `CUTTING_DEVELOPMENT_TEST_RUNBOOK.md` — Cutting bootstrap, build, security
  tesztkapu és ismert tesztadósságok

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

1. **Félkész EHS szeletek atomikus lezárása** — wizard teljes kapu + review,
   majd a risk backend validation/TestServer kapu
2. **Security rollout** — Nexus rotáció/policy, Cutting proxy/capability/ownership
3. **Dependency-remediation** — platform NuGet/RCE szeletek és runtime-források
4. **ERP ADR-k** — ADR-066/067 nyitott tulajdonosi és trust-döntések
5. **Modulcsomagolás és Doorstar kapu** — csak elfogadott ADR-ek után
6. **B2B kézfogás** — agreement/work lifecycle, participant-RLS, evidence és pilot

---

_JoineryTech Knowledge Base — aktuális index: 2026-07-23_
