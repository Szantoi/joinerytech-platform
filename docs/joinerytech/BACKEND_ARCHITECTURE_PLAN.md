# JoineryTech Backend API Architecture — Comprehensive Plan

**Document Version:** 1.0
**Date:** 2026-07-02
**Status:** Design Phase Complete
**Audience:** Backend Development Team, Architect, Technical Leadership

---

## Executive Summary

The JoineryTech Portal is currently a **localStorage-based prototype** with 40+ integrated modules across 12 business domains (CRM, Sales, Production, Warehouse, HR, Maintenance, EHS, QA, Procurement, Interior Design, Trade, AI). This document outlines the **strategic transition to a production-ready backend API architecture** while maintaining the complex domain logic, state machine patterns, and multi-tenant capabilities already proven in the prototype.

**Key Decisions:**
- **Backend:** .NET 8 (Modular Monolith pattern, aligned with SpaceOS Kernel architecture)
- **API:** REST + GraphQL (REST for CRUD, GraphQL for complex queries)
- **Database:** PostgreSQL (RLS for multi-tenant, JSONB for flexible domain entities)
- **Architecture:** Domain-Driven Design (DDD) with Aggregate Roots, Event Sourcing for critical domains
- **Authentication:** JWT + OAuth 2.0 (token-based, multi-device capable)
- **Migration:** Phased, module-by-module with localStorage fallback layer initially

**Migration Timeline:** 3 phases over Q3-Q4 2026

---

## 1. Technology Stack & Rationale

### 1.1 Backend Framework: .NET 8

**Choice:** .NET 8 (Modular Monolith)

**Rationale:**
| Criterion | .NET 8 | Node.js | Python Django |
|---|---|---|---|
| **Type Safety** | ⭐⭐⭐⭐⭐ Strong (F# ready) | ⭐⭐⭐ TypeScript (optional) | ⭐⭐ Limited |
| **Domain Complexity** | ⭐⭐⭐⭐⭐ DDD native | ⭐⭐⭐ (patterns needed) | ⭐⭐⭐ ORM strong |
| **State Machine Support** | ⭐⭐⭐⭐⭐ NuGet ecosystem | ⭐⭐⭐ (Xstate) | ⭐⭐⭐ (django-fsm) |
| **Multi-tenant Scaling** | ⭐⭐⭐⭐⭐ RLS + OIDC built-in | ⭐⭐⭐ Passport/custom | ⭐⭐⭐⭐ django-tenant-schemas |
| **Performance** | ⭐⭐⭐⭐⭐ AOT + SIMD | ⭐⭐⭐ Event loop | ⭐⭐⭐ Gunicorn |
| **JoineryTech Fit** | ⭐⭐⭐⭐⭐ Mirrors SpaceOS Kernel | ⭐⭐⭐ Already used (Orch) | ⭐⭐⭐⭐ Learning curve |

**Advantage:** Aligns with existing SpaceOS Kernel architecture; strong DDD/FSM support for the complex domains already modeled in the prototype.

### 1.2 API Styles: Hybrid REST + GraphQL

**REST Layer (Primary):**
- CRUD operations on entities
- Standard HTTP semantics
- Token-based pagination (cursor/offset)
- Versioning via URI path (`/api/v1/`, `/api/v2/`)

**GraphQL Layer (Secondary, Phase 2):**
- Complex multi-module queries (e.g., "Give me quote + related customer + all associated orders + production jobs")
- Real-time subscriptions for operational dashboards
- Client-driven query optimization (fields selection)

**Why Both?**
- REST is standard for mobile/embedded clients (JoineryTech Portal first)
- GraphQL for future data analytics / BI dashboards
- Reduces over-fetching during Phase 1; enables efficient querying Phase 2+

### 1.3 Database: PostgreSQL 14+

**Why PostgreSQL?**
1. **Row-Level Security (RLS)** — native multi-tenant isolation per tenant_id
2. **JSONB** — store domain-specific configurations (price tiers, BOM templates, FSM state data)
3. **Event Sourcing support** — immutable event table + snapshotting
4. **Full-text search** — catalog + document search (DMS module)
5. **Partitioning** — time-series partitions for order/quote history
6. **Proven scale** — 5k-10k concurrent tenants in production

**Schema Organization:**
```
jt_core/
  tenants (tenant_id, name, status, ...)
  users (id, tenant_id, email, roles, ...)

jt_catalog/
  catalog_items (id, tenant_id, name, category, price, status, ...)
  catalog_categories (id, name, parent_id, ...)

jt_crm/
  leads (id, tenant_id, status, source, ...)
  opportunities (id, tenant_id, lead_id, status, ...)

jt_sales/
  quotes (id, tenant_id, opp_id, status, ...)
  quote_lines (id, quote_id, item_id, qty, price, ...)
  orders (id, tenant_id, quote_id, status, ...)

jt_production/
  jobs (id, tenant_id, order_id, status, ...)
  job_steps (id, job_id, seq, operation, status, ...)

[... 8+ other domain schemas]
```

---

## 2. API Architecture Patterns

### 2.1 Domain-Driven Design (DDD) Structure

**Per-Module Structure:**

```
JoineryTech.Modules.CRM/
├── Domain/
│   ├── Aggregates/
│   │   ├── Lead.cs (root)
│   │   └── Opportunity.cs (root)
│   ├── ValueObjects/
│   │   ├── LeadSource.cs
│   │   └── OpportunityStatus.cs
│   ├── DomainEvents/
│   │   ├── LeadCreatedEvent.cs
│   │   └── LeadConvertedEvent.cs
│   └── Specifications/
│       └── LeadsForCustomerSpec.cs
│
├── Application/
│   ├── Commands/
│   │   ├── CreateLeadCommand.cs
│   │   ├── ConvertLeadToOppCommand.cs
│   │   └── Handlers/
│   ├── Queries/
│   │   ├── GetLeadsQuery.cs
│   │   └── Handlers/
│   └── DTOs/
│       ├── LeadDto.cs
│       └── OpportunityDto.cs
│
├── Infrastructure/
│   ├── Persistence/
│   │   ├── CrmDbContext.cs
│   │   └── Repositories/
│   │       └── LeadRepository.cs
│   └── ExternalServices/
│       └── EmailService.cs
│
├── Api/
│   └── LeadsEndpoints.cs (Minimal API endpoints)
│
└── Tests/
    ├── Unit/
    └── Integration/
```

**Advantages:**
- **Separation of concerns** — Domain logic independent of persistence
- **Testability** — Domain events captured, easily mocked
- **Scalability** — CQRS/Event Sourcing retrofittable per module

### 2.2 API Gateway & Orchestration

**Architecture:**
```
Mobile App / Portal Frontend
         ↓
    [API Gateway] (port 3000 — Node.js)
         ↓
   ┌─────┴─────┬────────┬──────────┐
   ↓           ↓        ↓          ↓
 .NET API  .NET API  .NET API  .NET API
 Core     CRM      Sales    Prod
 (5000)   (5001)   (5002)   (5003)
```

**API Gateway Responsibilities:**
- Request routing to backend modules
- JWT token validation & refresh
- Rate limiting & quotas (per tenant)
- Request logging & audit trail
- Tenant context injection (from token)
- Error response normalization
- CORS handling

**Why separate gateway?**
- Each module is independently deployable
- Gateway can scale independently
- Easy to add caching layer (Redis)
- Supports future microservices migration

### 2.3 State Machine (FSM) Implementation

**Strategy:** Type-safe FSM using Ardalis.Specification pattern

```csharp
public abstract class AggregateRoot
{
    protected List<DomainEvent> _domainEvents = new();

    public void Transition<TEnum>(TEnum newState, string? reason = null)
        where TEnum : Enum
    {
        var canTransition = CanTransition(this.State, newState);
        if (!canTransition)
            throw new InvalidOperationException(
                $"Cannot transition from {State} to {newState}");

        // State machine logic
        this.State = newState;
        this.AddDomainEvent(new StateChangedEvent(this.Id, newState, reason));
    }

    protected abstract bool CanTransition<TEnum>(
        Enum currentState, TEnum targetState) where TEnum : Enum;
}

// Example: Lead FSM
public class Lead : AggregateRoot
{
    public LeadStatus Status { get; private set; }

    protected override bool CanTransition(
        Enum current, Enum target)
    {
        return (current, target) switch
        {
            (LeadStatus.New, LeadStatus.Contacted) => true,
            (LeadStatus.Contacted, LeadStatus.Qualified) => true,
            (LeadStatus.Qualified, LeadStatus.ConvertedToOpp) => true,
            (LeadStatus.Any, LeadStatus.Rejected) => true, // Can reject from any state
            _ => false
        };
    }

    public Result<bool> ConvertToOpportunity(CustomerId customerId)
    {
        if (!CanTransition(Status, LeadStatus.ConvertedToOpp))
            return Result.Failure("Cannot convert from current status");

        Transition(LeadStatus.ConvertedToOpp, "Manual conversion");
        this.RaiseDomainEvent(new LeadConvertedEvent(this.Id, customerId));
        return Result.Success(true);
    }
}
```

**Benefits:**
- Type-safe transitions
- Audit trail via domain events
- Cross-module consistency

---

## 3. Data Model Mapping: localStorage → PostgreSQL

### 3.1 Entity Mapping Matrix

**Legend:**
- **Type**: Master Data (MD), Transactional (TXN), Event (EVT), Config (CFG)
- **Tenant Scope**: Global (shared), Per-Tenant (isolated)
- **Mutability**: Immutable (append-only), Mutable (CRUD)

| Entity | Type | Count | Schema | Tenant | Mutability | Notes |
|--------|------|-------|--------|--------|------------|-------|
| **CORE** |||||
| Tenant | MD | 1 | tenants | — | MD | Multi-tenant root |
| User | MD | 100–1k | users | Per-T | Mutable | Auth + profile |
| Permission | CFG | 50–100 | permissions | Global | Static | Role-based access |
| **CATALOG** |||||
| CatalogItem | MD | 500–5k | catalog_items | Per-T | Mutable | Product master |
| Category | MD | 20–50 | categories | Per-T | MD | Hierarchical tree |
| Supplier | MD | 10–100 | suppliers | Per-T | Mutable | Vendor master |
| **CRM** |||||
| Lead | TXN | 100–1k | leads | Per-T | Mutable | Sales pipeline |
| Opportunity | TXN | 50–500 | opportunities | Per-T | Mutable | Deal pipeline |
| Customer | MD | 20–500 | customers | Per-T | Mutable | B2B/B2C accounts |
| **SALES** |||||
| Quote | TXN | 50–1k | quotes | Per-T | Mutable | Proposals |
| QuoteLine | TXN | 500–5k | quote_lines | Per-T | Mutable | Line items |
| Order | TXN | 50–1k | orders | Per-T | Mutable | Purchase orders |
| OrderLine | TXN | 500–5k | order_lines | Per-T | Mutable | Line items |
| Invoice | TXN | 50–1k | invoices | Per-T | Immutable | Financial record |
| **PRODUCTION** |||||
| Job | TXN | 50–500 | jobs | Per-T | Mutable | Manufacturing job |
| JobStep | TXN | 500–5k | job_steps | Per-T | Mutable | Operation sequence |
| Material | MD | 100–1k | materials | Per-T | Mutable | Inventory |
| **WAREHOUSE** |||||
| InventoryLot | TXN | 500–5k | inventory_lots | Per-T | Mutable | Stock tracking |
| PO (Inbound) | TXN | 50–500 | purchase_orders | Per-T | Mutable | Vendor orders |
| Requisition | TXN | 100–1k | requisitions | Per-T | Mutable | Internal orders |
| **HR / MAINTENANCE / EHS / QA** |||||
| Employee | MD | 10–200 | employees | Per-T | Mutable | Staff master |
| Asset | MD | 10–100 | assets | Per-T | Mutable | Equipment |
| WorkOrder | TXN | 100–500 | work_orders | Per-T | Mutable | Maintenance |
| Incident | TXN | 10–50 | incidents | Per-T | Mutable | EHS events |
| Inspection | TXN | 50–500 | qa_inspections | Per-T | Mutable | Quality checks |
| **OTHER** |||||
| Document | MD | 100–1k | documents | Per-T | Immutable | DMS versioned |
| ServiceTicket | TXN | 50–500 | service_tickets | Per-T | Mutable | Post-delivery |
| DomainEvent | EVT | 10k–100k | domain_events | Per-T | Immutable | Event audit log |

### 3.2 Relationship Mapping

**Key Relationships:**

```
Tenant (1) ──────────────────────────────→ (N) User
           ──────────────────────────────→ (N) CatalogItem
           ──────────────────────────────→ (N) Lead
           ──────────────────────────────→ (N) Opportunity
           ──────────────────────────────→ (N) Quote
           ──────────────────────────────→ (N) Order

Lead (1) ──→ (1) Customer (back-reference only, resolved at conversion)
Lead (1) ──→ (0..1) Opportunity (via ConvertLeadToOpp)

Opportunity (1) ──→ (N) Quote (via OppCreateQuote)
                ──→ (0..1) Lead (backref)
                ──→ (0..1) Customer

Quote (1) ──→ (N) QuoteLine
         ──→ (1) Opportunity (back-reference)
         ──→ (1) Customer (direct)
         ──→ (0..1) Order (when approved)

Order (1) ──→ (N) OrderLine
        ──→ (1) Quote (backref)
        ──→ (0..1) Invoice
        ──→ (N) Job (production jobs)

Job (1) ──→ (N) JobStep (sequenced operations)
       ──→ (1) Order (backref)
       ──→ (N) Material withdrawal

Material (1) ──→ (N) InventoryLot (stock locations/batches)

[... 30+ other relationships ...]
```

### 3.3 Tenant Isolation Strategy

**Approach: PostgreSQL Row-Level Security (RLS) + Application Filter**

```sql
-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Policy: Users see only their tenant's quotes
CREATE POLICY tenant_isolation_quotes ON quotes
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Set tenant context in request
SET app.tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Query automatically filtered
SELECT * FROM quotes; -- Only returns quotes for this tenant
```

**Application Layer Filter (Defense-in-depth):**

```csharp
public class TenantFilterSpecification<T> : Specification<T>
    where T : class, IHasTenant
{
    public TenantFilterSpecification(Guid tenantId)
    {
        Query.Where(x => x.TenantId == tenantId);
    }
}

// Usage in repository
public async Task<Quote> GetByIdAsync(Guid quoteId, Guid tenantId, CancellationToken ct)
{
    var spec = new QuoteByIdSpec(quoteId, tenantId); // Enforces tenant filter
    return await _repository.FirstOrDefaultAsync(spec, ct);
}
```

---

## 4. Authentication & Authorization Strategy

### 4.1 Authentication Flow: JWT + OAuth 2.0

**Flow Diagram:**

```
┌──────────────┐
│  User/Client │
└──────┬───────┘
       │ 1. POST /auth/login
       │    (email + password)
       ↓
┌──────────────────────────┐
│  JoineryTech Auth Server │  (JWT issuer)
│  - Validate credentials  │
│  - Check MFA (optional)  │
│  - Create JWT + Refresh  │
└──────┬───────────────────┘
       │ 2. {accessToken, refreshToken, expiresIn}
       ↓
┌──────────────┐
│  Client App  │  Store tokens in secure storage
└──────┬───────┘
       │ 3. Authorization: Bearer {accessToken}
       ↓
┌──────────────────────────┐
│  API Gateway             │
│  - Validate JWT sig      │
│  - Check token expiry    │
│  - Extract tenant_id     │
│  - Route request         │
└──────────────────────────┘
       │ 4. Valid request
       ↓
┌──────────────┐
│  Module API  │  (authenticated & authorized)
└──────────────┘
```

**JWT Structure:**

```json
{
  "iss": "https://auth.joinerytech.hu",
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "email": "user@company.hu",
  "roles": ["sales.create", "crm.manage", "quote.approve"],
  "account_type": "internal",  // internal | partner | reseller | customer
  "exp": 1719868800,
  "iat": 1719868200
}
```

### 4.2 Role-Based Access Control (RBAC)

**Permission Model:**

```
Role         Permissions
────────────────────────────────────────
Admin        all.*
Sales Lead   quote.*, order.read, crm.*
Purchasing   procurement.*, suppliers.*
Production   job.*, production.read, material.read
Warehouse    warehouse.*, material.*
QA           quality.*
HR           hr.*, employees.read
Finance      invoice.*, payment.*, report.*
Partner      (partner.read, order.read, po.read, invoice.read)
```

**Permission Check in Code:**

```csharp
public class QuoteEndpoints
{
    [Authorize(Policy = "quote.create")]
    public static async Task<IResult> CreateQuote(
        CreateQuoteRequest request,
        IMediator mediator,
        IUser user) // User context from token
    {
        var command = new CreateQuoteCommand(
            request.CustomerId,
            request.Lines,
            tenantId: user.TenantId);

        var result = await mediator.Send(command);
        return result.IsSuccess
            ? Results.Created($"/api/quotes/{result.Value.Id}", result.Value)
            : Results.BadRequest(result.Errors);
    }
}
```

### 4.3 Multi-Device Session Management

**Strategy:** Token + Refresh Token with device tracking

```csharp
public class RefreshTokenRequest
{
    public string RefreshToken { get; set; }
    public string DeviceId { get; set; } // Unique per device
}

public class AuthService
{
    public async Task<Result<TokenResponse>> RefreshAccessTokenAsync(
        string refreshToken, string deviceId, CancellationToken ct)
    {
        // Verify refresh token + device match
        var session = await _sessionRepo.FirstOrDefaultAsync(
            new SessionByTokenSpec(refreshToken, deviceId), ct);

        if (session?.IsExpired ?? true)
            return Result.Failure("Session expired");

        // Issue new access token
        var newAccessToken = _tokenService.GenerateAccessToken(session.User);
        session.LastActivityAt = DateTime.UtcNow;

        await _sessionRepo.UpdateAsync(session, ct);
        return Result.Success(new TokenResponse { AccessToken = newAccessToken, ... });
    }
}
```

---

## 5. API Endpoints Specification (OpenAPI v3.1 Draft)

### 5.1 Core Endpoints Structure

**Versioning:** `/api/v1/` (REST), `/graphql` (GraphQL)

**Response Format:**

```json
{
  "success": true,
  "data": { ... },
  "errors": []
}
```

### 5.2 CRM Module Endpoints (Sample)

**GET /api/v1/leads**
```
Description: List all leads for authenticated tenant
Query Params:
  - status: string (uj, kapcsolat, minosites, nurturing, konvertalva, elvetve)
  - source: string (telefon, email, weboldal, ...)
  - page: int (default: 1)
  - pageSize: int (default: 20, max: 100)
  - sortBy: string (createdAt, status, lastActivity)
  - sortOrder: asc | desc

Response (200):
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "lead-uuid",
        "name": "Acme Designs Ltd",
        "email": "john@acme.hu",
        "status": "qualified",
        "source": "weboldal",
        "createdAt": "2026-06-15T10:30:00Z",
        "lastActivityAt": "2026-07-01T14:20:00Z",
        "opportunityId": "opp-uuid",
        "notes": "..."
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 20,
      "totalItems": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "errors": []
}
```

**POST /api/v1/leads**
```
Description: Create new lead
Body:
{
  "name": "New Company Ltd",
  "email": "contact@new.hu",
  "phone": "+36-1-123-4567",
  "source": "telefon",
  "companyType": "kozos",
  "notes": "Referred by Doorstar"
}

Response (201):
{
  "success": true,
  "data": {
    "id": "lead-uuid",
    "name": "New Company Ltd",
    "status": "uj",
    "createdAt": "2026-07-02T08:15:00Z"
  }
}

Errors (400, 409):
{
  "success": false,
  "errors": [
    "Email already exists as customer",
    "Required field: name"
  ]
}
```

**POST /api/v1/leads/{id}/convert**
```
Description: Convert lead to opportunity + create customer
Body:
{
  "customerId": "uuid" | null, // null = create new customer
  "customerData": { // If customerId is null
    "companyName": "...",
    "address": "...",
    "vatNumber": "..."
  }
}

Response (200):
{
  "success": true,
  "data": {
    "leadId": "lead-uuid",
    "opportunityId": "opp-uuid",
    "customerId": "cust-uuid",
    "leadStatus": "konvertalva"
  }
}
```

**GET /api/v1/opportunities**
```
Description: List opportunities (same pagination as leads)
Query Params:
  - status: string (nyitott, igenyfelmeres, osszeallitas, ajanlat, targyalas, megnyert, elveszett)
  - customerId: uuid (optional filter)
  - probabilityMin: int (5-50-75-90)

Response (200):
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "opp-uuid",
        "customerId": "cust-uuid",
        "leadId": "lead-uuid",
        "title": "Konyhabútor projekt",
        "status": "ajanlat",
        "probability": 50,
        "estimatedValue": 250000,
        "estimatedValueHuf": "250.000 Ft",
        "forecastValue": 125000,
        "expectedClosureDate": "2026-08-15",
        "createdAt": "2026-06-20T09:00:00Z"
      }
    ]
  }
}
```

**POST /api/v1/opportunities/{id}/create-quote**
```
Description: Create draft quote from opportunity
Body:
{
  "quoteTitle": "Konyhabútor - Ajánlat",
  "terms": "30 nap fizetési határidő"
}

Response (201):
{
  "success": true,
  "data": {
    "opportunityId": "opp-uuid",
    "quoteId": "quote-uuid",
    "quoteStatus": "piszkozat",
    "opportunityStatus": "osszeallitas"
  }
}
```

### 5.3 Sales Module Endpoints

**POST /api/v1/quotes/{id}/lines**
```
Description: Add line item to quote
Body:
{
  "catalogItemId": "item-uuid",
  "quantity": 2,
  "customPrice": 125000 | null,  // null = use catalog price
  "notes": "Special finish"
}

Response (201):
{
  "success": true,
  "data": {
    "lineId": "line-uuid",
    "catalogItemName": "Konyha modul L-alakú",
    "quantity": 2,
    "unitPrice": 125000,
    "totalPrice": 250000,
    "quoteTotal": 1250000
  }
}
```

**PUT /api/v1/quotes/{id}/status**
```
Description: Transition quote status (piszkozat → kikuldte → megnyert / elveszett)
Body:
{
  "newStatus": "kikuldte",
  "reason": "Customer approved"
}

Response (200):
{
  "success": true,
  "data": {
    "quoteId": "quote-uuid",
    "status": "kikuldte",
    "statusChangedAt": "2026-07-02T10:30:00Z"
  }
}
```

**POST /api/v1/quotes/{id}/approve**
```
Description: Approve quote + create order
Body:
{
  "orderTitle": "Konyhabútor - Rendelés",
  "terms": "50% előleg, 50% szállítás előtt",
  "deliveryDate": "2026-08-15"
}

Response (201):
{
  "success": true,
  "data": {
    "quoteId": "quote-uuid",
    "orderId": "order-uuid",
    "orderStatus": "nyitott",
    "orderTotal": 1250000
  }
}
```

### 5.4 Production Module Endpoints

**POST /api/v1/jobs**
```
Description: Create production job from order
Body:
{
  "orderId": "order-uuid",
  "priority": "normal" | "high" | "urgent",
  "releaseDate": "2026-07-05",
  "dueDate": "2026-08-10"
}

Response (201):
{
  "success": true,
  "data": {
    "jobId": "job-uuid",
    "orderId": "order-uuid",
    "status": "uj",
    "steps": []  // Empty initially
  }
}
```

**GET /api/v1/jobs/{id}/steps**
```
Description: Get production steps for a job
Response (200):
{
  "success": true,
  "data": {
    "jobId": "job-uuid",
    "steps": [
      {
        "id": "step-uuid",
        "sequence": 1,
        "operation": "nesting",
        "status": "nyitott",
        "assignedTo": "emp-uuid",
        "dueAt": "2026-07-05T14:00:00Z",
        "duration": 480  // minutes
      },
      {
        "id": "step-uuid-2",
        "sequence": 2,
        "operation": "cutting",
        "status": "nyitott",
        "assignedTo": null,
        "dueAt": "2026-07-06T14:00:00Z",
        "duration": 360
      }
    ]
  }
}
```

**PUT /api/v1/jobs/{jobId}/steps/{stepId}/status**
```
Description: Update production step status
Body:
{
  "newStatus": "folyamatban" | "kesz" | "selejt" | "halasztva",
  "reason": "Halasztva: szalag-csere"
}

Response (200):
{
  "success": true,
  "data": {
    "jobId": "job-uuid",
    "stepId": "step-uuid",
    "status": "folyamatban",
    "startedAt": "2026-07-05T08:00:00Z"
  }
}
```

### 5.5 Warehouse Module Endpoints

**POST /api/v1/inventory/movements**
```
Description: Log stock movement (inbound/outbound/adjustment)
Body:
{
  "materialId": "mat-uuid",
  "movementType": "inbound" | "outbound" | "adjustment",
  "quantity": 100,
  "referenceId": "po-uuid" | "job-uuid" | null,
  "referenceType": "purchase_order" | "production_job" | null,
  "notes": "Received from Falco"
}

Response (201):
{
  "success": true,
  "data": {
    "movementId": "mov-uuid",
    "materialId": "mat-uuid",
    "quantity": 100,
    "newStock": 450,
    "movedAt": "2026-07-02T09:15:00Z"
  }
}
```

**GET /api/v1/inventory**
```
Description: List all materials with stock levels
Query Params:
  - status: active | low | discontinued
  - sortBy: name | stock | reorderLevel

Response (200):
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "mat-uuid",
        "name": "Tölgy bútorlap 18mm",
        "category": "lapanyag",
        "currentStock": 450,
        "reorderLevel": 100,
        "unit": "db",
        "lastMovementAt": "2026-07-02T09:15:00Z",
        "status": "active"
      }
    ]
  }
}
```

### 5.6 Error Response Format

```json
{
  "success": false,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Quote total must be > 0",
      "field": "lines"
    },
    {
      "code": "AUTHORIZATION_ERROR",
      "message": "User does not have quote.approve permission"
    }
  ]
}
```

---

## 6. localStorage → Backend Migration Roadmap

### 6.1 Migration Strategy: Phased with Fallback

**Principle:** Old client continues to work during transition; new API layer added incrementally.

**Architecture:**

```
Phase 1: Core Services
  ├── Auth layer (JWT issuer)
  ├── Tenant management
  ├── User/Permission management
  └── Catalog sync (read-only initially)

Phase 2: Core Transactions
  ├── CRM (leads + opportunities)
  ├── Sales (quotes + orders)
  └── Customers

Phase 3: Operations
  ├── Production (jobs + steps)
  ├── Warehouse (inventory + movements)
  ├── Procurement (PO + requisitions)
  └── HR/Maintenance/EHS/QA
```

### 6.2 Phase-by-Phase Roadmap

#### **Phase 1: Core Infrastructure (Weeks 1–4, July 2026)**

**Target:** Authentication, tenant isolation, catalog read API

| Week | Task | Deliverable |
|------|------|-------------|
| 1–2 | - Auth server (.NET Identity + JWT) | Login endpoint, token generation |
| | - PostgreSQL schema (tenants, users, catalog) | DB + RLS policies |
| | - API Gateway scaffolding | Request routing, tenant context |
| 3–4 | - Catalog sync (import from localStorage seed) | GET /api/v1/catalog endpoints |
| | - Permission system (role definitions) | RBAC middleware |
| | - **Testing:** Auth flow, multi-tenant isolation | E2E tests, manual testing |

**Success Criteria:**
- ✅ User can log in via JWT
- ✅ Token refresh works
- ✅ Catalog endpoints serve tenant-specific data
- ✅ RLS prevents tenant data leakage

#### **Phase 2: Core Transactions (Weeks 5–12, August 2026)**

**Target:** CRM + Sales modules fully backend-powered

| Week | Task | Deliverable |
|------|------|-------------|
| 5–7 | - CRM module (Lead + Opportunity aggregates) | Leads/Opps CRUD, state transitions |
| | - Sales module (Quote + Order aggregates) | Quote/Order CRUD, approval flow |
| | - Customer entity (sync from localStorage) | Customer master data |
| | - Data migration: export localStorage → PostgreSQL | Migration script + validation |
| 8–10 | - Frontend adapter layer (REST client generation) | API integration in React Portal |
| | - Portal: swap localStorage→API for CRM/Sales | Leads page, Opps page, Sales flow |
| | - Dual-write (localStorage + backend) during cutover | Shadow mode — both sources in sync |
| 11–12 | - Cutover: Turn off localStorage writes for Phase 1 modules | Read from API only |
| | - Validation: data consistency checks | Reports on discrepancies |
| | - **Testing:** E2E lead→quote→order flow | Regression suite, manual UAT |

**Success Criteria:**
- ✅ All CRM & Sales workflows work via API
- ✅ Data consistency: localStorage & DB match
- ✅ Performance: API queries < 200ms (p95)
- ✅ Zero data loss during cutover

#### **Phase 3: Operations & Support Modules (Weeks 13–20, September–October 2026)**

**Target:** Production, Warehouse, Procurement, HR, QA, EHS

| Week | Task | Deliverable |
|------|------|-------------|
| 13–15 | - Production module (Job + JobStep FSM) | Job CRUD, step transitions |
| | - Warehouse module (Material + InventoryLot) | Stock tracking, movements |
| 16–17 | - Procurement module (PO + Requisition FSM) | Vendor orders, receiving |
| | - HR + Maintenance modules (FSM implementations) | Employee master, work orders, assets |
| 18–19 | - QA + EHS modules (Inspection + Incident FSM) | Quality checks, safety events |
| | - Integration tests: cross-module flows | Production→Warehouse→Finance |
| 20 | - Cutover: All modules backend-powered | Shadow mode → read-only localStorage |
| | - Validation + monitoring | Dashboard, alerts |

**Success Criteria:**
- ✅ All 40+ modules have backend API
- ✅ Complex workflows (job→steps→materials→invoicing) work end-to-end
- ✅ Data integrity during cutover
- ✅ Performance baseline: 95th percentile < 500ms

### 6.3 Data Migration Strategy

**Step 1: Schema Preparation**
```sql
-- Create staging table for localStorage export
CREATE TABLE staging_localStorage_export (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(50),
  entity_data JSONB,
  imported_at TIMESTAMP DEFAULT NOW()
);
```

**Step 2: Export from Portal**
```javascript
// In JoineryTech Portal, add export function
window.exportToJsonl = () => {
  const entities = [
    ...Object.entries(window.sim.quotes || {}).map(([k, v]) => ({
      id: k, entity_type: 'quote', entity_data: v
    })),
    ...Object.entries(window.sim.orders || {}).map(([k, v]) => ({
      id: k, entity_type: 'order', entity_data: v
    })),
    // ... all entities
  ];

  const jsonl = entities.map(e => JSON.stringify(e)).join('\n');
  downloadFile('export.jsonl', jsonl);
};
```

**Step 3: Transform & Load**
```csharp
public class DataMigrationService
{
    public async Task MigrateLeadsFromJsonlAsync(
        string jsonlPath, Guid tenantId, CancellationToken ct)
    {
        using var reader = new StreamReader(jsonlPath);
        string? line;
        int imported = 0, failed = 0;

        while ((line = await reader.ReadLineAsync(ct)) != null)
        {
            try
            {
                var staging = JsonConvert.DeserializeObject<StagingEntity>(line);
                if (staging.EntityType != "lead") continue;

                // Map localStorage format → Lead aggregate
                var leadData = staging.EntityData.ToObject<LeadStagingDto>();
                var lead = Lead.Create(
                    name: leadData.Name,
                    email: leadData.Email,
                    source: LeadSource.FromString(leadData.Source),
                    tenantId: tenantId
                );

                // Preserve original ID if collision-free
                if (!await _repository.ExistsByIdAsync(staging.Id, ct))
                    lead.SetId(staging.Id);

                await _repository.AddAsync(lead, ct);
                imported++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to migrate lead: {Line}", line);
                failed++;
            }
        }

        _logger.LogInformation(
            "Migration complete: {Imported} imported, {Failed} failed",
            imported, failed);
    }
}
```

**Step 4: Validation**
```sql
-- Consistency check: count comparison
SELECT
  'quotes' as entity,
  COUNT(*) as backend_count
FROM quotes
WHERE tenant_id = 'target-tenant-uuid'
UNION ALL
SELECT
  'orders',
  COUNT(*)
FROM orders
WHERE tenant_id = 'target-tenant-uuid'
-- Compare against localStorage count
```

### 6.4 Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **Data loss during cutover** | - Export + snapshot before cutover<br>- Dual-write for 1 week<br>- Automated consistency checks<br>- Rollback plan: restore from snapshot |
| **API performance degradation** | - Load testing Phase 1 (1k concurrent users)<br>- Cache warm-up before cutover<br>- Database index optimization<br>- RLS policy performance review |
| **Incompatible FSM transitions** | - Map all localStorage transitions to backend FSMs<br>- Pre-cutover validation<br>- Manual state repair if needed |
| **Authentication failures** | - Test JWT generation with existing users<br>- Token refresh during cutover<br>- Session cleanup script |
| **Tenant isolation breach** | - RLS policy review by security team<br>- Penetration test (write arbitrary tenant_id)<br>- Application-layer filter as backup |

### 6.5 Rollback Plan

**If cutover fails at Phase 2:**
1. Restore DB from pre-cutover snapshot (2h)
2. Revert frontend to localStorage mode (15 min)
3. Re-export backend data for diagnostics
4. Post-mortem & fix issues (1–2 weeks)
5. Retry cutover

---

## 7. Advanced Patterns & Future Considerations

### 7.1 Event Sourcing (Phase 2+ Domains)

**Rationale:** Critical domains (Order, Invoice, Job) benefit from complete audit trail + time-travel capability.

```csharp
public abstract class EventSourcedAggregate : AggregateRoot
{
    private readonly List<DomainEvent> _uncommittedEvents = new();
    public IReadOnlyList<DomainEvent> UncommittedEvents => _uncommittedEvents.AsReadOnly();

    protected void ApplyEvent(DomainEvent @event)
    {
        When(@event); // Apply to aggregate state
        _uncommittedEvents.Add(@event);
    }

    public void CommitEvents() => _uncommittedEvents.Clear();

    protected abstract void When(DomainEvent @event);
}

// Example: Order aggregate
public class Order : EventSourcedAggregate
{
    public Guid Id { get; private set; }
    public Guid QuoteId { get; private set; }
    public OrderStatus Status { get; private set; }
    public List<OrderLine> Lines { get; } = new();
    public decimal Total { get; private set; }

    public static Order CreateFromQuote(Quote quote, Guid tenantId)
    {
        var order = new Order();
        order.ApplyEvent(new OrderCreatedEvent(
            Guid.NewGuid(), tenantId, quote.Id, quote.Lines.ToList()));
        return order;
    }

    public void Release()
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("Can only release draft orders");

        ApplyEvent(new OrderReleasedEvent(Id));
    }

    protected override void When(DomainEvent @event)
    {
        switch (@event)
        {
            case OrderCreatedEvent ev:
                Id = ev.OrderId;
                QuoteId = ev.QuoteId;
                Status = OrderStatus.Draft;
                Lines.AddRange(ev.Lines);
                Total = ev.Lines.Sum(l => l.TotalPrice);
                break;
            case OrderReleasedEvent ev:
                Status = OrderStatus.Released;
                break;
        }
    }
}

// Event store table
CREATE TABLE order_events (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

### 7.2 CQRS Separation (Read Models)

**Future optimization:** Separate read models for complex queries (e.g., dashboard KPIs)

```csharp
// Command side (write to transactional DB)
public async Task<Result> CreateQuoteAsync(CreateQuoteCommand cmd)
{
    var quote = Quote.Create(cmd.CustomerId, cmd.Lines);
    await _quoteRepository.AddAsync(quote);
    await _unitOfWork.SaveChangesAsync();

    // Publish event to event bus
    await _eventBus.PublishAsync(new QuoteCreatedEvent(quote.Id));
}

// Read side (async projection into denormalized views)
public class QuoteReadModelProjector : IEventHandler<QuoteCreatedEvent>
{
    public async Task HandleAsync(QuoteCreatedEvent @event)
    {
        // Insert into read-optimized view
        await _readDb.InsertAsync(new QuoteReadModel
        {
            Id = @event.QuoteId,
            CustomerName = await _customerService.GetNameAsync(@event.CustomerId),
            Total = @event.Total,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow
        });

        // Update dashboard KPI cache
        await _cache.IncrementAsync("quotes:created:today");
    }
}

// Query returns from read model (millisecond latency)
public async Task<List<QuoteReadModel>> GetRecentQuotesAsync()
{
    return await _readDb
        .Set<QuoteReadModel>()
        .OrderByDescending(q => q.CreatedAt)
        .Take(100)
        .ToListAsync();
}
```

### 7.3 Real-Time Subscriptions (GraphQL + WebSocket)

**Phase 2+:** Enable live dashboards

```graphql
subscription OnOrderStatusChanged($tenantId: ID!) {
  orderStatusChanged(tenantId: $tenantId) {
    orderId
    oldStatus
    newStatus
    changedAt
    changedBy
  }
}

subscription OnInventoryLow($tenantId: ID!, $threshold: Int!) {
  inventoryLow(tenantId: $tenantId, threshold: $threshold) {
    materialId
    materialName
    currentStock
    reorderLevel
  }
}
```

---

## 8. Production Deployment & Monitoring

### 8.1 Deployment Architecture

```
Internet
   │
┌──┴───────────────────────┐
│  CloudFlare / AWS Shield  │
└──┬──────────────────────┘
   │
┌──┴───────────────────┐
│  Load Balancer       │ (Session affinity)
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ API Gateway (1) │ │
│ │ (Node.js + pm2) │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ API Gateway (2) │ │
│ │ (Node.js + pm2) │ │
│ └─────────────────┘ │
└─────────┬────────────┘
          │
┌─────────┴────────────┐
│ .NET Module Services │ (behind internal LB)
├─────────────────────┤
│ Core (5000)         │
│ CRM (5001)          │
│ Sales (5002)        │
│ Production (5003)   │
│ Warehouse (5004)    │
│ [+ 5 more]          │
└─────────┬───────────┘
          │
┌─────────┴──────────────────┐
│ PostgreSQL Cluster (Primary)│
│ + Read Replicas (2)        │
│ + Backup / Standby (1)     │
└────────────────────────────┘
```

### 8.2 Monitoring & Observability

**Metrics Dashboard:**
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Tenant-specific usage
- Database connection pool
- Cache hit rate

**Logging:**
- Structured logging (Serilog → ELK)
- Request correlation ID
- Tenant context in all logs
- Performance events (slow queries)

**Alerts:**
- API error rate > 1%
- Latency p95 > 500ms
- Database CPU > 80%
- JWT validation failures spike
- Tenant data inconsistency detected

---

## 9. Appendix: Full Entity-Relationship Diagram (ERD) Sketch

```
[Not included in this plan—generates from actual database schema]

Key domains:
├── Core (tenants, users, permissions)
├── Catalog (items, categories, suppliers)
├── CRM (leads, opportunities, customers)
├── Sales (quotes, orders, invoices)
├── Production (jobs, steps, materials)
├── Warehouse (lots, movements, POs)
├── HR/Maintenance (employees, assets, work orders)
├── QA/EHS (inspections, incidents)
├── Finance (invoices, payments, GL)
└── Support (service tickets, DMS)
```

---

## 10. Success Metrics & Timeline

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| **Phase 1 complete** | End July 2026 | Auth + catalog API live, 0 security incidents |
| **Phase 2 complete** | End August 2026 | CRM + Sales 100% backend, zero data loss, cutover successful |
| **Phase 3 complete** | End October 2026 | All 40+ modules live, production performance validated |
| **Production launch** | Q4 2026 | Doorstar live with full backend, monitoring established |

---

## 11. Next Steps

1. **Architecture Review:** Schedule session with Architect + Principal Engineer
2. **Tech Stack Validation:** Confirm .NET 8 + PostgreSQL + Modular Monolith
3. **Database Schema Design:** Detailed ERD + migration scripts (Architect + Backend)
4. **API Contract Definition:** OpenAPI 3.1 spec (Backend + Frontend)
5. **Development Sprint Planning:** Week-by-week task breakdown (Conductor + Team)
6. **Infrastructure Setup:** VPS/Cloud environment, RLS policy templates, monitoring stack

---

**Document Owner:** Backend Terminál (SpaceOS)
**Review Date:** 2026-07-02
**Status:** Ready for Architecture Review
