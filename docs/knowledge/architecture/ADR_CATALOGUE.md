# SpaceOS — Architekturális döntések katalógusa (ADR)

> Kritikus arch döntések, indoklásuk és alkalmazásuk a SpaceOS fejlesztéshez.

---

## ADR-001: Security Sprint — JWT RS256 + Azure Key Vault

**Döntés:** 2026-04-03 APPROVED

| Item | Decision |
|---|---|
| JWT algoritmus | **RS256** (asymmetric) |
| Private key tár | **Azure Key Vault** (prod); PEM file dev-ben (`.gitignore`-d) |
| Hash chain serializáció | **PostgreSQL advisory lock** (`pg_try_advisory_xact_lock` per TenantId) |
| Audit sink | **Azure Immutable Blob Storage** (WORM, prod); file-based dev |

**Miért:**
- Production Escrow & security audit findings blokkolta a deployment-et
- RS256 aszimmetrikus kulcs → nincs shared secret key management kockázat
- Azure Key Vault → hardware security module + rotation policy
- Advisory lock → distributed transaction-like capability PostgreSQL-ben

**Alkalmazás:**
1. Sprint 0 (P0-3 → P0-1 → P0-4) előfeltétele az 1. deploynak
2. Sprint 1 előfeltétele: `Azure.Security.KeyVault.Keys`, `Azure.Identity` NuGet packages
3. Audit sink: `Azure.Storage.Blobs` (Sprint 1)
4. Dev setup: `.env` fájl PEM key path, dev Azure storage account (vagy local Azurite)

---

## ADR-002: Modular Monolith — Kernel IParametricProduct interface

**Döntés:** APPROVED (alaparch)

Kernel **nem tudja**, hogy mi az asztalos (Joinery), lapszabász (Cutting), stb.
Kernel csak az `IParametricProduct` interface-t ismeri.

**Interfész:**
```csharp
public interface IParametricProduct
{
    Guid ProductId { get; }
    Guid TenantId { get; }
    Dictionary<string, object> Parameters { get; }
    
    // Kernel callback-ek
    Task<GeometryResult> GenerateGeometry(IGeometryEngine engine);
    Task<ValidationResult> ValidateParameters();
}
```

**Miért:**
- Driver modulok (Joinery, Cutting) implementálják
- Kernel: escrow, audit, FSM, auth — nincs business logic
- Domain logic: Driver layer-ben (SpaceOS.Modules.Joinery, stb.)

**Alkalmazás:**
- Új driver hozzáadásakor: `IParametricProduct` implementálás + DI registration
- Kernel-ben: nincs `if (product is Joinery)` — mindig `product.GenerateGeometry()`

---

## ADR-003: Immutability & Audit Trail — SHA-256 hashed events

**Döntés:** APPROVED (L1 Kernel)

Audit table minden DML event-hez:
```sql
CREATE TABLE "AuditEvents" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "EntityType" text NOT NULL,
    "EntityId" uuid NOT NULL,
    "Operation" text NOT NULL, -- INSERT, UPDATE, DELETE
    "ChangedBy" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "ChangedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "BeforeData" jsonb,
    "AfterData" jsonb,
    "DataHash" text NOT NULL, -- SHA256(BeforeData||AfterData)
    CONSTRAINT fk_tenant FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id")
);
```

CAD adat (geometry, parameters) **sosem** UPDATE-elhető — csak INSERT + archive.

**Miért:**
- Regulatory compliance (audit trail)
- Dispute resolution (ki/mikor módosított)
- No UPDATE CAD = no implicit versioning bugs

**Alkalmazás:**
- Kernel interceptor: EVERY DML → AuditEvents
- Driver modules: custom audit fields (pl. Joinery: "material_change_reason")

---

## ADR-004: Role-Based Access Control (RBAC) — Need-to-Know

**Döntés:** APPROVED

Keycloak roles:
```
tenant_admin     → everything
designer         → csak saját Order designs
factory_worker   → assigned Orders + Materials
sales_person     → assigned Quotes + Orders
supplier         → csak saját Inventory items (view)
```

**RLS Policy:** Minden SELECT / UPDATE / DELETE

```sql
CREATE POLICY "tenant_isolation" ON "Orders"
  USING ("TenantId" = current_setting('app.current_tenant')::uuid);

CREATE POLICY "designer_only_own_orders" ON "Orders"
  USING (
    current_setting('app.user_role') = 'tenant_admin'
    OR "DesignedBy" = current_setting('app.user_id')::uuid
  );
```

**Miért:**
- Szállító nem látja a gyártó anyaglistáját
- Tervező nem módosíthat már approved Quote-ot
- GDPR compliance

**Alkalmazás:**
- Login után: Keycloak role → `app.user_role` setting
- Minden query: implicit RLS filter
- Orchestrator BFF: role ellenőrzés (double-defense)

---

## ADR-005: Walking Skeleton First — E2E pipeline előbb, matematika utóbb

**Döntés:** APPROVED (Development strategy)

Prioritás sorrend:
1. **L1 + L3 + L4 (Kernel + Orch + Portal):** Auth, data, UI — **WORKING END-TO-END**
2. **L2 (Joinery driver):** CAD geometry — **SIMPLISTIC first** (rectangle), iterálva komplexebb
3. Cutting, Inventory, stb. — **párhuzamos**, önálló domain

**Miért:**
- Korai feedback: user tesz le Joinery rendelést, amit lát is a Portalon
- Arch bugs hamar látszanak (RLS, audit, workflow FSM)
- Matematika iterálódik (hozza az product owner újabb igényt)

**Alkalmazás:**
- Joinery v1: sima méretes asztalos (width/height/depth) → PDF nyomtatás
- v2: panel layout optimization (ONNX model később)
- v3: edge banding, hardware cost calc
- Test-driven: E2E happy path, majd edge cases

---

## ADR-006: Data → Rules → Geometry

**Döntés:** APPROVED (Design principle)

Responsibility separation:

| Layer | Mi csinál |
|---|---|
| **Frontend (Portal)** | Adatelemek renderelés (sliders, form inputs), UI state |
| **C# Driver** | Adatutalansági szabályok (pl. max width = 2500mm), számítások |
| **LLM (Orch)** | Paraméterek javaslatása (Tool Calling), nem geometry |
| **CAD Engine** | Geometry generálás (3D koordináták, SVG/STEP) |

❌ **Tilos:** Frontend direkt CAD számítást végez, LLM szabályokat írva ad vissza.

**Miért:**
- Konzisztens szerkesztés (backend validáció)
- Kliensünk = más kliensek (nem HTML/JS szab-e meg a physics-t)

**Alkalmazás:**
- Joinery Order POST: `{ Width: 1200, Height: 800 }` → Kernel drivernek
- Driver: `if (Width > MaxWidth) throw ValidationException`
- Frontend: error megjelenítése, retry

---

## ADR-043: Marvin Orchestration Pattern

**Döntés:** 2026-06-17 PROPOSED

| Item | Decision |
|---|---|
| Planning pipeline | **Marvin (Python)** — bash script-ek helyett |
| Thread persistence | **SQLite** — resumable threads |
| Agent definitions | 5 agent: Scanner, Selector, Debater A/B, Synthesizer |
| Provider | **Anthropic** via Pydantic AI backend |

**Miért:**
- Bash pipeline törékeny — crash = teljes adatvesztés
- Marvin Thread: crash után folytatható (SQLite history)
- Multi-agent explicit definícióval, structured output (Pydantic)
- Parallel execution (asyncio.gather)

**Alkalmazás:**
1. Fázis 1: McpServer Knowledge Service (COMPLETE)
2. Fázis 2: Marvin Planning Pipeline (~6-7 nap)
3. Fázis 3: Reviewer + Nightwatch (~8-10 nap, Slice 2 előtt)

**Teljes spec:** `docs/architecture/decisions/ADR-043-marvin-orchestration-pattern.md`

---

## ADR-044: Knowledge Service System Integration

**Döntés:** 2026-06-17 PROPOSED

| Item | Decision |
|---|---|
| Vector store | **ChromaDB** (Docker, port 8001) |
| Embeddings | **Voyage AI** voyage-3-lite (512 dim) |
| MCP interface | `discovery_search` tool |
| Fallback | In-memory search (graceful degradation) |

**Miért:**
- Szemantikus keresés > keyword FTS (növekvő knowledge base)
- Production-tested JoineryTech.McpServer referencia
- In-memory fallback: headless scanner nem blokkolódik

**Alkalmazás:**
1. Fázis 1: Core Implementation (COMPLETE)
2. Fázis 2: System-wide Integration (Architect, terminálok)
3. Fázis 3: Full Datahaven/Resonance (episodic memory)

**Teljes spec:** `docs/architecture/decisions/ADR-044-knowledge-service-system-integration.md`

---

## ADR-045: McpServer Standard Tools & RPC Interface

**Döntés:** 2026-06-17 PROPOSED

| Tool | Leírás | Fázis |
|---|---|---|
| `discovery_search` | Knowledge base keresés | COMPLETE |
| `submitArtifact` | Idea/consensus regisztráció | Fázis 2 |
| `getWorkflowState` | Terminál FSM state lekérdezés | Fázis 3 |
| `updateWorkflowState` | Terminál FSM state frissítés | Fázis 3 |
| **RbacFilter** | Tool visibility per role | Fázis 3 |

**Miért:**
- Gépi enforcement > emberi CLAUDE.md szabályok
- Workflow state tracking: strukturált, query-elhető, audit trail
- RbacFilter: role alapján szűrt tool visibility

**Alkalmazás:**
1. Fázis 2: submitArtifact (~2-3 nap)
2. Fázis 3: Workflow tracking + RBAC (~4-5 nap)

**Teljes spec:** `docs/architecture/decisions/ADR-045-mcpserver-standard-tools.md`

---

## ADR-041: Graph-Based Workflow & Project Management

**Döntés:** 2026-06-22 APPROVED ✅ Phase 1 COMPLETE

| Item | Decision |
|---|---|
| Gráf reprezentáció | **Adjacency List** (blocked_by + triggers_on_done) |
| Tárolás | **YAML fájlok** (EPICS.yaml, TASKS.yaml) |
| Vizualizáció Phase 1 | **Mermaid.js** (STATUS.md auto-gen) |
| Vizualizáció Phase 2+ | **React Flow** (Datahaven Dashboard) |
| Cross-project deps | **EPICS.yaml** a `/docs/projects/` root-ban |
| API | **Express endpoints** `/api/graph/*` |

**Miért:**
- Epic-szintű dependency tracking cross-project koordinációhoz
- Conductor látja a teljes dependency fát → jobb parallelizáció
- Vizualizáció: Root követheti a project progress-t
- Blocker detection automatikus

**Alkalmazás:**
1. ✅ **Phase 1 COMPLETE:** EPICS.yaml + Mermaid MVP (2026-06-22)
   - `epicsValidator.ts` — Schema + DAG validation
   - `epicsLoader.ts` — YAML → WorkflowGraph
   - `graphRoutes.ts` — 5 REST API endpoints
   - `statusUpdater.ts` — Epic status integration
   - E2E tests + documentation
2. Phase 2: Dashboard vizualizáció (React Flow) (~5-6 nap)
3. Phase 3: Workflow Builder (drag & drop) (~8-10 nap)
4. Phase 4: Manufacturing Integration (future)

**Phase 1 Deliverables:**
- Code: `spaceos-nexus/knowledge-service/src/graph/`, `src/api/graphRoutes.ts`
- Data: `docs/projects/EPICS.yaml` (10 epics validated)
- Docs: `docs/knowledge/graph/GRAPH_WORKFLOW_USAGE.md`
- Tests: 37 unit + 19 integration + 6 E2E (all passing)

**Teljes spec:** `docs/architecture/decisions/ADR-041-graph-based-workflow-architecture.md`

---

## ADR-046: Consensus 2026-06-22 — EHS, Assembly Variance, Catalog Diff

**Döntés:** 2026-06-22 PROPOSED

| Item | Decision |
|---|---|
| **EHS Incident Report** | Event sourcing MEGTARTÁSA + `SafetyIncidentProjection` view |
| **Assembly Variance** | Új `VarianceEvent` aggregate (event sourcing) |
| **Catalog Diff View** | Meglévő `Version` mező + `CatalogEntryHistory` tábla |
| Feature Prioritás | EHS → Assembly Variance → Catalog Diff |

**10 Architektúra Döntés:**

| # | Kérdés | Döntés |
|---|---|---|
| Q1 | WebSocket | SignalR Phase 2; 30s polling MVP |
| Q2 | File storage | S3Service kiterjesztés (5MB, content-type validation) |
| Q3 | Offline kvóta | 50MB IndexedDB, priority-based cleanup |
| Q4 | EHS compliance | 72h sync deadline, exponential backoff |
| Q5 | Variance threshold | 10% default, role-based override |
| Q6 | Catalog diff scope | Full semantic diff (price, leadtime, dimensions) |
| Q7 | Polling frekvencia | 30s, SLA 60s; WebSocket >10 users |
| Q8 | Catalog limit | Backend-side diff >500 items |
| Q9 | GPS adatok | Opt-in, 90 nap retention, anonymization |
| Q10 | Variance approval | Role-based + audit trail |

**API Bővítések:**
- EHS: `/api/ehs/incidents`, `/api/ehs/events/batch`
- Variance: `/api/joinery/work-orders/{id}/variances`, `/api/joinery/variances/{id}/approve`
- Catalog: `/api/catalog/items/{id}/versions`, `/api/catalog/items/{id}/diff`

**Teljes spec:** `docs/architecture/decisions/ADR-046-consensus-2026-06-22-ehs-assembly-catalog.md`

---

## ADR-058: JoineryTech Backend-Frontend Integration Architecture

**Döntés:** 2026-07-02 FINAL

| Item | Decision |
|---|---|
| **State Management** | TanStack Query (server-first) — localStorage removed |
| **Authentication** | HttpOnly cookie + SameSite (XSS-proof) |
| **API Contract** | OpenAPI 3.1 spec (Week 0 contract-first) |
| **Code Generation** | Orval (Frontend) + NSwag (Backend) |
| **Real-Time Sync** | HTTP polling Phase 1 → WebSocket Phase 2 |
| **Error Handling** | Global Axios interceptor + TanStack Query onError |
| **Migration Path** | 3 phases (Infrastructure → Transaction → Complete cutover) |
| **Testing Strategy** | Contract tests (OpenAPI), Component (Vitest), E2E (Playwright) |

**8 Critical Integration Gaps Resolved:**

| # | Gap | Solution | Phase |
|---|-----|----------|-------|
| 1 | State Management | localStorage → TanStack Query | 1-3 |
| 2 | Authentication | JWT HttpOnly cookie + refresh token rotation | 1 |
| 3 | Real-Time Sync | HTTP polling (Phase 1) → WebSocket (Phase 2) | 2 |
| 4 | API Contract | OpenAPI spec Week 0 (contract-first) | 0 |
| 5 | Error Handling | Global interceptor + per-query handlers | 1 |
| 6 | Performance | Vite build (4.2 MB → 2.2 MB), code splitting | 1-3 |
| 7 | Data Validation | OpenAPI-based validators (frontend + backend sync) | 1 |
| 8 | Testing Strategy | Contract + Component + E2E (80%/70%/60% coverage) | 1-3 |

**5 Golden Rules Compliance:**

| Rule | Compliance Assessment |
|------|----------------------|
| **1. Data → Rules → Geometry** | ✅ Backend enforces FSM (quote → order → invoice), Frontend renders UI |
| **2. Modular Monolith** | ✅ 8 modules (CRM, Kontrolling, HR, QA, EHS, DMS, Maintenance, AI) with clear boundaries |
| **3. Immutability & Trust** | ✅ PostgreSQL RLS enforces multi-tenant isolation, audit trail SHA-256 hashed |
| **4. Need-to-Know RBAC** | ✅ Role-based RLS policies (sales sees Qualified leads, managers see all) |
| **5. Walking Skeleton First** | ✅ Phase 1 = Auth + Catalog only (E2E working), Phase 2 = Transactions, Phase 3 = All 8 modules |

**3-Phase Migration Path:**

```
Week 0 (Contract-First Design)
  ├─ OpenAPI 3.1 spec writing (Architect + Backend + Frontend)
  ├─ Auth, Catalog, CRM, Sales endpoints documented
  └─ Acceptance: All teams reviewed and approved spec

Phase 1 (Weeks 1-4): Infrastructure
  ├─ Backend: Auth API, Catalog API, RLS, Gateway
  ├─ Frontend: Vite setup, TanStack Query, JWT cookie, Error handling
  ├─ localStorage: Keep transaction state (read-only fallback)
  └─ Exit: Auth + Catalog working E2E, 80% test coverage, <200ms API

Phase 2 (Weeks 5-12): Transaction State Migration
  ├─ Backend: CRM, Sales, Real-time sync (WebSocket/SSE)
  ├─ Frontend: TanStack Query for transactions, Optimistic UI
  ├─ localStorage: Read-only cache for lookups only
  └─ Exit: Quote lifecycle E2E, multi-user tested, 70% coverage

Phase 3 (Weeks 13-20): Complete Cutover
  ├─ Backend: All 8 modules API complete, event sourcing
  ├─ Frontend: localStorage removed, API-only, code splitting
  └─ Exit: All modules E2E, Lighthouse ≥85, 60% coverage, <300ms API
```

**Risk Mitigation:**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| State mismatch data loss | CRITICAL | Early spike (Week 2): Prototype quote approval with TanStack Query |
| API contract undefined | CRITICAL | Write OpenAPI spec Week 0, contract tests in CI/CD |
| JWT token expiration | HIGH | Token refresh early, test rotation edge cases (Week 3) |
| App-store monolith blocks perf | HIGH | Modularize parallel with API (Weeks 1-4) |
| localStorage fallback inconsistency | HIGH | Phase 1 = Auth only, minimize localStorage scope |

**Success Metrics:**

| Phase | Target | Measurement |
|-------|--------|-------------|
| Phase 1 | <200ms API, 2.2 MB build, 80% auth coverage | APM, `npm run build`, Vitest |
| Phase 2 | <250ms API, <500ms sync, <1% conflict, 70% CRM/Sales coverage | WebSocket metrics, Sentry |
| Phase 3 | <300ms API, Lighthouse ≥85, 0 data loss, 60% all modules | Lighthouse CI, Sentry, Vitest/Playwright |

**Contract-First ROI:**
- **Investment:** $4k (3-4 days OpenAPI spec writing Week 0)
- **Savings:** $11k-16k (prevents rework, enables parallel dev, code-gen automation)
- **Total ROI:** 175%-300% return

**Alkalmazás:**
1. **Week 0:** OpenAPI spec írás (3-4 nap) — minden endpoint dokumentálva, példákkal
2. **Week 1-4:** Auth + Catalog API (Backend), Vite + TanStack Query (Frontend)
3. **Week 5-12:** CRM + Sales API migration, WebSocket real-time sync
4. **Week 13-20:** All 8 modules, localStorage removal, code splitting, Lighthouse optimization

**Teljes spec:** `docs/architecture/decisions/ADR-058-joinerytech-integration-architecture.md`

---

## Referencia

- Teljes vision: `docs/vision/SpaceOS_Vision_Master.md`
- Security sprint: `docs/mailbox/kernel/outbox/` 2026-04-03 DONE messages
- Module interfaces: `docs/knowledge/architecture/ECOSYSTEM_MODULE_ARCHITECTURE.md`
- Agent Infrastructure: `docs/agent-infrastructure/ROADMAP.md`
- ADR részletes fájlok: `docs/architecture/decisions/`
