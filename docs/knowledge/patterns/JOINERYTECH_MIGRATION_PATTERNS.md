# JoineryTech Migration Patterns

> **Pattern Category:** Prototype → Production Transformation
> **Domain:** Multi-World ERP Migration (8 Business Domains)
> **Source:** MSG-EXPLORER-013 Gap Analysis (2026-07-01)
> **Applicable:** Backend, Frontend, Architect terminals

---

## Executive Summary

The JoineryTech prototípus migration represents a comprehensive transformation from a **localStorage-based simulation** (27 worlds, functional prototype) to a **production-ready multi-tenant SaaS platform** with PostgreSQL, .NET 8 API, and React 18/19 frontend.

**Migration Scope:**
- **8 Business Worlds:** CRM, Kontrolling, HR, Maintenance, QA, EHS, DMS, AI
- **Total Effort:** 1520 hours (~23 weeks, 7 full-time team)
- **Investment:** ~€150k (€65/h burdened rate)
- **Phasing:** 3 Waves (P0/P1/P2)

**Core Transformation:**

| From | To |
|------|---|
| localStorage JSON | PostgreSQL 15+ (ACID, RLS, audit) |
| React context (window.sim) | Zustand + TanStack Query |
| No API | 40+ .NET 8 RESTful endpoints |
| UI-level FSM | Domain aggregates + events |
| Direct store access | Event-driven + message bus |

---

## 1. TRANSFORMATION PATTERNS

### 1.1 Data Model Transformation

#### Pattern: localStorage → PostgreSQL Normalization

**Before (Prototype):**
```typescript
// localStorage: flat JSON structure
const state = {
  leads: [
    { id: "l1", name: "John Doe", email: "john@...", status: "New", ... },
    { id: "l2", name: "Jane Smith", email: "jane@...", status: "Contacted", ... }
  ],
  opportunities: [
    { id: "o1", leadRef: "l1", value: 100000, status: "Draft", ... }
  ]
};
localStorage.setItem('jt_sim_v63', JSON.stringify(state));
```

**After (Production):**
```sql
-- PostgreSQL: normalized schema with constraints
CREATE TABLE crm.leads (
    lead_id UUID PRIMARY KEY,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    opportunity_ref UUID,  -- FK
    tenant_id UUID NOT NULL,  -- RLS
    CONSTRAINT fk_leads_opportunity FOREIGN KEY (opportunity_ref)
        REFERENCES crm.opportunities(opportunity_id),
    CONSTRAINT chk_lead_status CHECK (status IN ('New', 'Contacted', 'Qualified', ...))
);

-- Multi-tenant isolation
ALTER TABLE crm.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm.leads
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

**Migration Checklist:**
- [ ] Normalize hierarchical JSON → relational tables
- [ ] Add foreign key constraints (orphan prevention)
- [ ] Implement RLS policies (tenant isolation)
- [ ] Add audit columns (created_at, updated_at, tenant_id)
- [ ] Create indexes (tenant_id, status, created_at)
- [ ] Validate data integrity (fuzzy match for duplicates)

**Critical Gotcha:** **CRM lead deduplication** — 500+ prototype leads may contain duplicates (email/phone fuzzy matching required before migration).

---

### 1.2 State Management Transformation

#### Pattern: React Context → Zustand + TanStack Query Dual-Layer

**Before (Prototype):**
```typescript
// Global observable store (window.sim)
const sim = {
  state: { /* 500 KB state */ },
  actions: {
    approveQuote: (quoteId) => {
      const quote = sim.state.quotes.find(q => q.id === quoteId);
      quote.status = "Approved";
      // Side-effect inline: create order + movement
      sim.state.orders.push({ quoteRef: quoteId, ... });
      sim.state.movements.push({ type: "QuoteApproved", ... });
      localStorage.setItem('jt_sim_v63', JSON.stringify(sim.state));
      notify();
    }
  }
};

// Component usage
function QuoteCard({ quoteId }) {
  const quote = useSyncExternalStore(sim.subscribe, () =>
    sim.state.quotes.find(q => q.id === quoteId)
  );
  return <button onClick={() => sim.actions.approveQuote(quoteId)}>Approve</button>;
}
```

**After (Production):**
```typescript
// Zustand: UI-only state (modal visibility, filters, drafts)
const useUIStore = create<UIState>((set) => ({
  modals: { approveQuote: false },
  filters: { world: "crm", statusFilter: [] },
  setModalOpen: (name, open) => set((s) => ({
    modals: { ...s.modals, [name]: open }
  })),
}));

// TanStack Query: server state (quotes from API)
const useQuotes = (filter) =>
  useQuery(['quotes', filter], () => api.get('/api/quotes', { params: filter }));

const useApproveQuote = () =>
  useMutation(
    (quoteId) => api.post(`/api/quotes/${quoteId}/approve`),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('quotes');
        queryClient.setQueryData(['quote', data.quoteId], data.quote);
        showToast('Quote approved');
      },
      onError: (err) => showError(err.message),
    }
  );

// Component usage
function QuoteCard({ quoteId }) {
  const { data: quote, isLoading } = useQuery(['quote', quoteId], () =>
    api.get(`/api/quotes/${quoteId}`)
  );
  const approveMutation = useApproveQuote();

  return (
    <button
      onClick={() => approveMutation.mutate(quoteId)}
      disabled={approveMutation.isLoading}
    >
      {approveMutation.isLoading ? 'Approving...' : 'Approve'}
    </button>
  );
}
```

**Migration Checklist:**
- [ ] Identify UI-only state → Zustand (modals, filters, drafts)
- [ ] Identify server state → TanStack Query (entities, lists)
- [ ] Replace inline actions → API mutations
- [ ] Implement optimistic updates (UI response before API completes)
- [ ] Add error boundaries + retry logic
- [ ] Background refetch strategy (5 min for Kontrolling EAC, real-time for Maintenance)
- [ ] Remove localStorage persistence (server is source of truth)

**Critical Gotcha:** **Kontrolling EAC real-time refresh** — Heavy aggregation (10K+ line items), requires background refetch (5 min) + caching strategy.

---

### 1.3 API Architecture Transformation

#### Pattern: Frontend-Only Logic → RESTful .NET 8 API

**Before (Prototype):**
```typescript
// No API — all logic in frontend
function convertLeadToOpp(leadId: string) {
  const lead = state.leads.find(l => l.id === leadId);
  if (lead.status !== 'Qualified') throw new Error('Lead not qualified');

  const opp = {
    id: uuidv4(),
    leadRef: leadId,
    contactInfo: lead.contactInfo,
    status: 'Draft',
    createdAt: new Date()
  };

  state.opportunities.push(opp);
  lead.status = 'Opportunity';
  lead.opportunityRef = opp.id;

  localStorage.setItem('jt_sim_v63', JSON.stringify(state));
}
```

**After (Production):**
```csharp
// .NET 8 API endpoint
[HttpPost("api/crm/leads/{leadId}/convert")]
[Authorize(Policy = "crm.manage")]
public async Task<ActionResult<Guid>> ConvertLeadToOpportunity(
    Guid leadId,
    [FromBody] ConvertLeadRequest request,
    CancellationToken ct)
{
    // 1. Load aggregate
    var lead = await _repository.GetLeadByIdAsync(leadId, ct);
    if (lead == null) return NotFound();

    // 2. Validate FSM transition
    if (lead.Status != LeadStatus.Qualified)
        return BadRequest("Lead must be Qualified before conversion");

    // 3. Domain command
    var command = new ConvertLeadToOpportunityCommand
    {
        LeadId = leadId,
        EstimatedValue = request.EstimatedValue,
        ConvertedBy = User.GetUserId()
    };

    var opportunityId = await _mediator.Send(command, ct);

    // 4. Publish event
    await _eventBus.PublishAsync(new LeadConvertedToOpportunity
    {
        LeadId = leadId,
        OpportunityId = opportunityId,
        ConvertedBy = User.GetUserId()
    }, ct);

    return Created($"/api/crm/opportunities/{opportunityId}", opportunityId);
}
```

**API Endpoint Sampling (40+ total):**

| World | Endpoints | Key Operations |
|-------|-----------|----------------|
| **CRM** | 9 | Lead CRUD, convert, Opportunity FSM, forecast |
| **Kontrolling** | 3 | EAC calculation, terv vs. tény, portfolio |
| **HR** | 6 | Employee, capacity, timeLog, absence |
| **Maintenance** | 7 | Asset registry, workOrder FSM, downtime |
| **QA** | 5 | Inspection FSM, defect tracking, SLA |
| **EHS** | 8 | Incident FSM, CAPA, risk, training |
| **DMS** | 4 | Document versioning, link, RAG metadata |
| **AI** | 3 | Agent run, skill list, memory query |

**Migration Checklist:**
- [ ] Define endpoint contracts (OpenAPI spec)
- [ ] Implement JWT authentication (15 min access, 7 day refresh)
- [ ] Add RBAC authorization (crm.manage, quote.create, etc.)
- [ ] Rate limiting (100 req/min public, 1000 req/min auth)
- [ ] Validation middleware (FluentValidation)
- [ ] Audit logging (all CUD operations → audit_events table)
- [ ] Error handling (ProblemDetails format)
- [ ] API versioning (Accept header: vnd.joinerytech.v1+json)

**Critical Gotcha:** **Maintenance real-time sync** — Asset downtime must conflict-check with Production schedule → optimistic locking + conflict resolution.

---

### 1.4 FSM Complexity Transformation

#### Pattern: UI-Level Validation → Domain Aggregate FSM

**Before (Prototype):**
```typescript
// UI-level FSM (canGo validation)
function canGoToNegotiation(opp: Opportunity): boolean {
  return opp.status === 'Proposal' && opp.estimatedValue > 0;
}

function setOppStatus(oppId: string, newStatus: string) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!canGoToNegotiation(opp) && newStatus === 'Negotiation') {
    toast.error('Cannot negotiate without proposal');
    return;
  }
  opp.status = newStatus;
  localStorage.setItem('jt_sim_v63', JSON.stringify(state));
}
```

**After (Production):**
```csharp
// Domain aggregate with strict FSM
public class Opportunity : AggregateRoot
{
    public OpportunityId Id { get; private set; }
    public OpportunityStatus Status { get; private set; }
    public Money EstimatedValue { get; private set; }

    // FSM transition method
    public void MoveToNegotiation()
    {
        // Guard: validate current state
        if (Status != OpportunityStatus.Proposal)
            throw new InvalidOperationException(
                $"Cannot move to Negotiation from {Status}. Must be in Proposal status.");

        // Guard: validate invariants
        if (EstimatedValue.Amount <= 0)
            throw new InvalidOperationException(
                "Cannot negotiate opportunity with no estimated value.");

        // State transition
        Status = OpportunityStatus.Negotiation;

        // Raise event
        AddDomainEvent(new OpportunityNegotiated
        {
            OpportunityId = Id,
            NegotiatedAt = DateTime.UtcNow
        });
    }
}
```

**FSM Complexity Matrix:**

| World | FSMs | Complexity | Prototype | Production Refactor |
|-------|------|------------|-----------|---------------------|
| **CRM** | 2 (Lead, Opp) | MEDIUM | ✅ canGo validation | Lead + Opp aggregates, domain events |
| **Kontrolling** | 0 (calculated) | LOW | ✅ No FSM | Maintain calculated fields |
| **HR** | 2 (Absence, Capacity) | MEDIUM | ✅ Kész | Absence aggregate, capacity engine |
| **Maintenance** | 2 (WorkOrder, Asset) | HIGH | ✅ Calculated asset status | WorkOrder aggregate, Asset factory |
| **QA** | 1 (Inspection) | MEDIUM | ✅ Kész | Inspection aggregate + defect collection |
| **EHS** | 3 (Incident, CAPA, Risk) | HIGH | ✅ CAPA no FSM | Incident aggregate + CAPA service |
| **DMS** | 1 (Document) | LOW | ✅ Kész | Document aggregate + version factory |
| **AI** | 1 (Agent stage) | LOW | ✅ Non-strict | Agent aggregate (skill + memory collections) |

**Migration Checklist:**
- [ ] Map prototype FSM states to domain enums
- [ ] Implement guard clauses (transition validation)
- [ ] Define domain events per transition
- [ ] Unit test all FSM transitions (happy path + invalid)
- [ ] Integration test FSM event publishing
- [ ] Document FSM diagrams (Mermaid stateDiagram-v2)

**Critical Gotcha:** **Maintenance WorkOrder → InProgress transition** — Must check asset NOT under maintenance (conflict detection) before starting work.

---

### 1.5 Integration Transformation

#### Pattern: Direct Store Access → Event-Driven Message Bus

**Before (Prototype):**
```typescript
// Direct store mutation with side-effects
function approveQuote(quoteId: string) {
  const quote = state.quotes.find(q => q.id === quoteId);
  quote.status = 'Approved';

  // Side-effect 1: Create order
  const order = { quoteRef: quoteId, status: 'Draft', ... };
  state.orders.push(order);

  // Side-effect 2: HR assignment
  const assignment = { projectRef: order.id, employeeId: quote.salesRep };
  state.assignments.push(assignment);

  // Side-effect 3: Kontrolling update
  const project = state.projects.find(p => p.orderRef === order.id);
  project.status = 'Active';

  localStorage.setItem('jt_sim_v63', JSON.stringify(state));
}
```

**After (Production):**
```csharp
// Event-driven approach
public class QuoteApprovedEventHandler : INotificationHandler<QuoteApproved>
{
    private readonly IOrderService _orderService;
    private readonly IHRService _hrService;
    private readonly IEventBus _eventBus;

    public async Task Handle(QuoteApproved evt, CancellationToken ct)
    {
        // 1. Create order (Sales module)
        var orderId = await _orderService.CreateOrderFromQuoteAsync(
            evt.QuoteId, evt.CustomerId, ct);

        // 2. Publish OrderCreated event → HR subscribes
        await _eventBus.PublishAsync(new OrderCreated
        {
            OrderId = orderId,
            QuoteRef = evt.QuoteId,
            SalesRep = evt.ApprovedBy
        }, ct);

        // HR service subscribes to OrderCreated → auto-create assignment
        // Kontrolling service subscribes to OrderCreated → activate project
    }
}

// HR service event handler (different module)
public class OrderCreatedHandler : INotificationHandler<OrderCreated>
{
    public async Task Handle(OrderCreated evt, CancellationToken ct)
    {
        await _hrService.CreateAssignmentAsync(
            projectId: evt.OrderId,
            employeeId: evt.SalesRep,
            role: "SalesOwner",
            ct);
    }
}
```

**Cross-World Integration Map:**

| Trigger | Source | Target | Event | Action |
|---------|--------|--------|-------|--------|
| Lead converted | CRM | Sales | LeadConverted | Auto-create customer |
| Opportunity won | CRM | HR | OppWon | Project team assignment |
| TimeLog created | HR | Kontrolling | TimeLogged | Labor cost update |
| Asset downtime | Maintenance | Production | AssetDowntime | Schedule conflict flag |
| Inspection failed | QA | Procurement | InspectionFailed | PO complaint ticket |
| Incident training req | EHS | HR | IncidentTrainingRequired | Training record + gap |
| Maintenance plan review | EHS | Maintenance | RiskAssessed | Increase maint frequency |
| Document versioned | DMS | All | DocumentVersioned | Link to entity + audit |
| Agent run | AI | All | AgentExecuted | Fetch brand context + memory |

**Migration Checklist:**
- [ ] Define domain events catalog (30+ events across 8 worlds)
- [ ] Implement event bus (in-process MediatR → RabbitMQ/Kafka later)
- [ ] Phase 1: Sync API (CRM, HR, Kontrolling)
- [ ] Phase 2: Async events (CRM → Sales, Maintenance → Production)
- [ ] Phase 3: Cross-service sagas (Order → Production → QA → Logistics → Finance)
- [ ] Event versioning + replay capability (debugging)
- [ ] Monitoring + alerting (event processing lag)

**Critical Gotcha:** **Cross-world event ordering** — CRM → HR → Kontrolling chain must guarantee order → use event versioning + idempotent handlers.

---

## 2. WAVE-BASED MIGRATION SEQUENCING

### Wave 1 — P0 (8-10 weeks): Foundation

**Goal:** 80% business requirement, async foundation

**Scope:**
1. **CRM** (HIGH complexity)
   - Lead + Opportunity aggregates
   - Forecast calculation
   - Integration: CRM → Sales (quote creation)
2. **HR** (MEDIUM-HIGH complexity)
   - Employee + Capacity engine
   - TimeLog + labor cost
   - Integration: HR → Kontrolling
3. **Kontrolling** (MEDIUM complexity)
   - Terv vs. tény (plan vs. actual)
   - EAC calculation (10K+ line items)
   - Portfolio aggregation

**Timeline:**
- **Week 1-2:** CRM data model + API (leads, opps, forecast)
- **Week 2-3:** HR schema + capacity engine
- **Week 3-4:** Kontrolling EAC + aggregation
- **Week 4-5:** Zustand + TanStack Query wrapper (state management)
- **Week 5-7:** Event bus (LeadConverted, OppWon → async messages)
- **Week 7-8:** Testing + staging migration (dual-write pattern)
- **Week 8-10:** Go-live (shadow read 2 weeks, cutover)

**Critical Path:**
- CRM lead deduplication (before migration)
- EAC versioning audit trail (Kontrolling)
- Dual-write pattern validation (30 days)

---

### Wave 2 — P1 (6-8 weeks): Operational Completeness

**Goal:** Cross-world integrations, real-time

**Scope:**
1. **Maintenance** (HIGH complexity)
   - Asset registry validation
   - WorkOrder FSM
   - Integration: Maintenance → Production (downtime event)
2. **QA** (MEDIUM complexity)
   - Inspection FSM
   - Defect tracking
   - Integration: QA → Procurement (failed inspection → PO complaint)
3. **EHS** (HIGH complexity)
   - Incident FSM + CAPA
   - Risk assessment + compliance
   - Integration: EHS → HR (training requirement), EHS → Maintenance (risk → maint plan)

**Timeline:**
- **Week 1-2:** Maintenance schema + asset validation (reality check)
- **Week 2-3:** QA API + inspection FSM
- **Week 3-4:** EHS schema + compliance review (Hungarian Mvt + ISO 45001 + GDPR)
- **Week 4-5:** Real-time integrations (WebSocket/SSE for downtime, 5-min polling fallback)
- **Week 5-6:** Event sagas (QA → Procurement, EHS → HR)
- **Week 6-8:** Testing + cutover

**Critical Path:**
- Asset registry validation (Maintenance — physical inspection)
- EHS legal compliance review (Hungarian Mvt + ISO 45001)
- Real-time architecture decision (SSE vs. WebSocket)

---

### Wave 3 — P2 (4-6 weeks): Supporting Systems

**Goal:** Future-oriented features

**Scope:**
1. **DMS** (LOW-MEDIUM complexity)
   - Document versioning
   - S3 file storage (signed URLs)
   - Metadata backfill (existing docs have no version info)
2. **AI** (LOW-MEDIUM complexity)
   - Agent API + skill list
   - Memory query
   - Prompt assembly (brand context)
   - Integration: AI → All (fetch brand context + memory)

**Timeline:**
- **Week 1-2:** DMS API + document versioning + S3 migration
- **Week 2-3:** AI agent API + prompt assembly
- **Week 3-4:** Branding context integration (brand → all worlds)
- **Week 4-6:** Testing + optimization

**Critical Path:**
- DMS document metadata backfill (version info missing)
- AI API token security (.NET secret manager)

---

## 3. RISK FRAMEWORK

### 🔴 CRITICAL RISKS

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | **CRM Lead Deduplication** | 500+ leads → potential duplicates (email/phone fuzzy match) | Pre-migration cleanup script (fuzzy match algorithm) + manual review |
| 2 | **Kontrolling EAC Versioning** | EAC calculation history lost (which plan version?) | Add audit trail (eac_calculations table: plan_version, timestamp, value) |
| 3 | **Maintenance Asset Registry** | Asset size/location/operator ≠ reality | Physical inspection + validation before migration |
| 4 | **EHS Legal Compliance** | Hungarian Mvt + ISO 45001 + GDPR (personal data) | Compliance review with legal team (week 3-4 Wave 2) |

### 🟠 HIGH RISKS

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 5 | **Real-time Sync (Maintenance ↔ Production)** | Single source of truth? | Optimistic locking + conflict resolution (event-driven) |
| 6 | **HR Payroll Integration** | Employee paygrade → external payroll system? | API integration design + boundary definition |
| 7 | **QA Inspection Photos** | BLOB storage → S3 migration | Signed URLs + batch migration script |
| 8 | **DMS Document Versioning** | Existing docs have no version metadata | Backfill script (create v1 for all existing docs) |
| 9 | **AI API Token Security** | localStorage → .NET secret manager | Token rotation + HashiCorp Vault integration |
| 10 | **Cross-World Event Ordering** | CRM → HR → Kontrolling chain, guaranteed order? | Event versioning + idempotent handlers |

### 🟡 MEDIUM RISKS

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 11 | **Kontrolling Margin Realism** | Prototype margin ~87%, production ≈ 35% | Data validation + margin recalculation |
| 12 | **FSM Strict Validation** | Prototype lenient (non-strict), production strict | Edge case testing + migration data fix |
| 13 | **Offline-First** | Prototype uses localStorage fallback, production always-online | Remove fallback + online-only enforcement |
| 14 | **Multi-Tenant Isolation** | Single-tenant prototype, production multi-tenant | RLS row-level security implementation |
| 15 | **Audit Logging** | Prototype has none, production comprehensive (1000x storage) | Audit table design + retention policy |

---

## 4. ARCHITECTURE RECOMMENDATIONS

### 4.1 State Management

**Decision:** Zustand + TanStack Query (dual-layer)

**Rationale:**
- Zustand: Simple, no boilerplate (vs. Redux)
- TanStack Query: Server state caching + invalidation
- Alternative: Jotai (atomic) — simpler but less flexible
- Not recommended: Recoil (Facebook maintained status unclear)

**Implementation:**
```typescript
// Zustand: UI-only state
const useUIStore = create<UIState>((set) => ({
  modals: { crm: false },
  filters: { world: "crm", statusFilter: [] },
  setModalOpen: (name, open) => set((s) => ({ modals: { ...s.modals, [name]: open } })),
}));

// TanStack Query: server state
const useQuotes = (filter) => useQuery(['quotes', filter], () => api.get('/api/quotes', { params: filter }));
const useApproveQuote = () => useMutation((id) => api.post(`/api/quotes/${id}/approve`), {
  onSuccess: () => queryClient.invalidateQueries('quotes'),
});
```

---

### 4.2 API Style

**Decision:** RESTful + GraphQL consideration for later

**Rationale:**
- REST: Simpler, team familiar, adequate for 40+ endpoints
- GraphQL: Later (if complex nested queries become bottleneck)
- Not recommended: Live.js (stale browser tech)

---

### 4.3 Real-Time Architecture

**Decision:** Server-Sent Events (SSE) > WebSocket

**Rationale:**
- SSE: Simpler, fault-tolerant, built-in HTTP
- Fallback: 5-min polling (stateless, easier scaling)
- WebSocket: More complex (bidirectional not needed for Maintenance downtime)

---

### 4.4 Async Processing

**Decision:** Hangfire (Wave 1) → Consider Kafka (Wave 2+)

**Rationale:**
- Hangfire: In-process, simpler, sufficient for CRM forecast nightly update
- Kafka: If event replay needed (debugging, audit)
- RabbitMQ: Alternative (simpler than Kafka, less features)

---

## 5. IMPLEMENTATION CHECKLISTS

### 5.1 Data Migration Checklist

**Phase A: Schema Definition**
- [ ] Design PostgreSQL schema (tables, constraints, indexes, RLS)
- [ ] Create Liquibase/Flyway migrations
- [ ] Add audit columns (created_at, updated_at, tenant_id)
- [ ] Implement RLS policies (tenant isolation)
- [ ] Create indexes (performance: tenant_id + status, created_at DESC)

**Phase B: ETL Script**
- [ ] Build Node.js ETL script (Prisma ORM)
- [ ] Normalize hierarchical JSON → relational tables
- [ ] Data validation (missing refs, data type mismatches)
- [ ] Fuzzy matching for duplicates (CRM leads: email/phone)
- [ ] Test data generation (100x scale for load testing)

**Phase C: Dual-Write Validation**
- [ ] Frontend read: Production DB (shadow read)
- [ ] Frontend write: Both localStorage + PostgreSQL (30 days)
- [ ] Validation endpoint: localStorage data ≠ DB data → alert
- [ ] Cutover decision: 100% parity → disable localStorage

---

### 5.2 State Management Checklist

**Week 1-2: Zustand Wrapper**
- [ ] Identify UI-only state (modals, filters, drafts)
- [ ] Create Zustand stores (1 per world or global)
- [ ] Immer plugin integration (immutable updates)
- [ ] Persist plugin (sessionStorage for critical state)

**Week 2-4: TanStack Query Adapter**
- [ ] Replace entity lists → useQuery hooks
- [ ] Replace actions → useMutation hooks
- [ ] Optimistic updates (UI before API wait)
- [ ] Error boundaries + retry logic (exponential backoff)
- [ ] Background refetch strategy (Kontrolling 5 min, Maintenance real-time)

**Week 3-5: Testing**
- [ ] Zustand selector unit tests (no API calls)
- [ ] TanStack Query integration tests (msw mock server)
- [ ] Offline-first removal (localStorage recovery deprecated)

---

### 5.3 API Development Checklist

**Week 1: Skeleton**
- [ ] Create .NET 8 API project structure
- [ ] Configure JWT authentication (15 min access, 7 day refresh)
- [ ] Add RBAC authorization policies (crm.manage, quote.create, etc.)
- [ ] Rate limiting middleware (100 req/min public, 1000 req/min auth)
- [ ] FluentValidation integration
- [ ] ProblemDetails error handling

**Week 2-3: Endpoints (40+ total)**
- [ ] CRM endpoints (9: leads, opps, forecast)
- [ ] Kontrolling endpoints (3: EAC, terv vs. tény, portfolio)
- [ ] HR endpoints (6: employee, capacity, timeLog)
- [ ] OpenAPI/Swagger documentation

**Week 4: Integration**
- [ ] Event bus setup (MediatR in-process)
- [ ] Domain event publishing (LeadConverted, OppWon, etc.)
- [ ] Audit logging (all CUD → audit_events table)
- [ ] API versioning (Accept header: vnd.joinerytech.v1+json)

---

### 5.4 FSM Testing Checklist

**Unit Tests (Domain Layer)**
- [ ] All FSM transitions (happy path)
- [ ] Invalid transitions (throw exception)
- [ ] Guard clauses (value validation)
- [ ] Event publishing (LeadQualified, OppWon, etc.)

**Integration Tests (API Layer)**
- [ ] POST /api/crm/leads → 201 Created
- [ ] PUT /api/crm/leads/{id}/qualify (invalid transition) → 400 Bad Request
- [ ] POST /api/crm/leads/{id}/convert → 201 Created + OpportunityCreated event
- [ ] GET /api/crm/opportunities/forecast → 200 OK (weighted value calculation)

**E2E Tests (Full Flow)**
- [ ] Lead (New → Contacted → Qualified → Opportunity)
- [ ] Opportunity (Draft → Proposal → Negotiation → Won → Quote)
- [ ] Inspection (Draft → InProgress → Passed/Failed → Linked to PO complaint)

---

### 5.5 Security Checklist

**Authentication**
- [ ] JWT token generation (15 min access, 7 day refresh)
- [ ] Refresh token rotation (security best practice)
- [ ] Token blacklisting (logout, security breach)

**Authorization**
- [ ] RBAC policies (crm.manage, crm.view, quote.create, etc.)
- [ ] Resource-level permissions (lead.assignedTo = currentUser)
- [ ] Tenant isolation (RLS enforced at DB level)

**Data Protection**
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React default escaping + CSP headers)
- [ ] HTTPS enforcement (redirect HTTP → HTTPS)
- [ ] Password hashing (bcrypt + salt)
- [ ] 2FA for admin accounts

**OWASP Top 10**
- [ ] A01: Broken Access Control → RLS + RBAC
- [ ] A02: Cryptographic Failures → JWT + HTTPS
- [ ] A03: Injection → Parameterized queries
- [ ] A07: CSRF → SameSite cookies + anti-CSRF tokens

---

## 6. CRITICAL SUCCESS FACTORS

### ✅ MUST-HAVE (Non-Negotiable)

1. **Data Integrity Audit**
   - CRM lead deduplication (email/phone fuzzy match)
   - Referencial integrity (foreign keys + cascade rules)
   - Kontrolling EAC versioning (audit trail)

2. **Authentication/Authorization**
   - JWT tokens (day 1)
   - RBAC policies (crm.manage, etc.)
   - RLS enforcement (multi-tenant isolation)

3. **Offline Fallback Decision**
   - Online-only mandatory (remove localStorage fallback)
   - OR offline-first with local SQLite sync (mobile app)

### ✅ STRONGLY RECOMMENDED

1. **EHS Compliance Review**
   - Hungarian Munkavédelmi törvény (Mvt)
   - ISO 45001 (occupational health & safety)
   - GDPR (personal data: employee incidents, training)

2. **HR Payroll Integration**
   - Design boundary (internal vs. external payroll)
   - API contract definition

3. **Event Versioning**
   - Event replay capability (debugging)
   - Event schema evolution

4. **Monitoring + Alerting**
   - Datadog / Grafana / Application Insights
   - API latency + error rate dashboards
   - Event processing lag alerts

### ⚠️ CONTINGENCY (Future Considerations)

1. **Multi-Tenant Support**
   - Currently single-company
   - RLS foundation enables multi-tenant later

2. **Global Expansion**
   - Timezone handling (UTC storage, local display)
   - Currency conversion (HUF/EUR/USD)
   - i18n (Hungarian + English)

3. **Mobile App**
   - Web PWA vs. native (React Native)
   - Offline-first mobile (local SQLite sync)

---

## 7. EFFORT BREAKDOWN

| Component | Engineering | QA | Ops | Docs | **Total** |
|-----------|------------|-----|------|------|----------|
| **Data migration** | 120 h | 40 h | 20 h | — | **180 h** |
| **API development** | 240 h | 60 h | — | — | **300 h** |
| **State management refactor** | 80 h | 40 h | — | — | **120 h** |
| **FSM domain logic** | 160 h | 60 h | — | — | **220 h** |
| **Integration + events** | 200 h | 80 h | — | — | **280 h** |
| **Testing + security** | — | 200 h | — | — | **200 h** |
| **Infrastructure + deployment** | — | — | 100 h | — | **100 h** |
| **Documentation + training** | 40 h | — | — | 80 h | **120 h** |
| **TOTAL** | **840 h** | **480 h** | **120 h** | **80 h** | **1520 h** |

**Team Composition:**
- 4 Engineers (backend + frontend)
- 2 QA Engineers
- 1 Ops Engineer
- Total: **7 full-time**

**Duration:** 22 weeks (3 waves: 10 + 8 + 6 weeks, overlap 2 weeks)

**Cost:** ~€150k (€65/h burdened engineering rate)

---

## 8. RELATED RESOURCES

### SpaceOS Knowledge Base

- **ADR-054:** JoineryTech CRM Domain Model Design (`/opt/spaceos/docs/architecture/decisions/ADR-054-joinerytech-crm-domain-model.md`)
- **Backend Patterns:** .NET 8 Clean Architecture, CQRS, FSM (`/opt/spaceos/docs/knowledge/engineering/BACKEND_PATTERNS.md`)
- **Database Patterns:** RLS, Migration, Testcontainers (`/opt/spaceos/docs/knowledge/patterns/DATABASE_PATTERNS.md`)
- **Security Patterns:** JWT, RBAC, OWASP Top 10 (`/opt/spaceos/docs/knowledge/security/SECURITY_PATTERNS.md`)
- **Event Sourcing:** Domain events, MediatR, saga pattern (`/opt/spaceos/docs/knowledge/patterns/EVENT_SOURCING_PATTERNS.md`)

### External References

- **React 18 Docs:** https://react.dev/
- **TanStack Query:** https://tanstack.com/query/latest
- **Zustand:** https://zustand-demo.pmnd.rs/
- **.NET 8 Docs:** https://learn.microsoft.com/en-us/aspnet/core/
- **PostgreSQL RLS:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

## 9. APPENDIX: PER-WORLD COMPLEXITY MATRIX

| World | Data | State Mgmt | API | FSM | Integration | **Total** | **Wave** |
|-------|------|-----------|-----|-----|-------------|----------|---------|
| **CRM** | M | H | H | M | H | **HIGH** | **1** |
| **Kontrolling** | M | L | M | L | M | **MEDIUM** | **1** |
| **HR** | M | M | M | M | H | **MEDIUM-H** | **1** |
| **Maintenance** | M | M | M | H | H | **HIGH** | **2** |
| **QA** | L | M | M | M | M | **MEDIUM** | **2** |
| **EHS** | M | M | M | H | H | **HIGH** | **2** |
| **DMS** | M | L | L | L | M | **LOW-M** | **3** |
| **AI** | L | L | M | L | M | **LOW-M** | **3** |

**Legend:**
- **L** (Low): 1-2 weeks effort
- **M** (Medium): 2-4 weeks effort
- **H** (High): 4-6 weeks effort

---

**Document Status:** ✅ PRODUCTION-READY
**Created:** 2026-07-01 (MSG-LIBRARIAN-018)
**Source:** MSG-EXPLORER-013 Gap Analysis Report
**Author:** Librarian terminal
**Reviewed By:** TBD (Conductor, Architect, Backend, Frontend)

**Next Review:** After Wave 1 completion (2026 Q3)
