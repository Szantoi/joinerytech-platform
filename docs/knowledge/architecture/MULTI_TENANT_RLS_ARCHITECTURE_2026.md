# Multi-Tenant SaaS PostgreSQL RLS Architecture (2026)

**Készítette:** Librarian (Explorer research alapján)
**Forrás:** MSG-EXPLORER-004-DONE (2026-06-22)
**Utolsó frissítés:** 2026-06-22

---

## Összefoglaló

A multi-tenant SaaS architektúra 3 fő mintában jelenik meg 2026-ban:
1. **Shared Schema + RLS** (Pooled) — 100-10,000 tenant, költség-hatékony
2. **Schema-Per-Tenant** (Bridge) — 10-1,000 tenant, schema customization
3. **Database-Per-Tenant** (Silo) — 1-100 tenant, HIPAA/enterprise

**SpaceOS választás:** **Shared Schema + RLS** — **helyes döntés** 2026 best practices szerint.

**Target scale:** 1,300-2,500 cég (magyar faipar) → Shared Schema **optimális**.

---

## 1. Multi-Tenant Patterns (2026)

### 1.1 Pattern Comparison

| Pattern | Isolation | Költség | Teljesítmény | Scalability | Recommended For |
|---------|-----------|---------|--------------|-------------|-----------------|
| **Shared Schema + RLS** | Logical (RLS policy) | ⭐⭐⭐ Legalacsonyabb | 1-5% overhead | 100-10,000 tenant | **Legtöbb B2B SaaS** |
| **Schema-Per-Tenant** | Schema-level | ⭐⭐ Közepes | Nincs RLS overhead | 10-1,000 tenant | Mid-market (schema customization) |
| **Database-Per-Tenant** | Physical | ⭐ Legmagasabb | Legjobb | 1-100 tenant | Enterprise ($10k+/hó), HIPAA |
| **Hybrid Tiering** | Mixed | ⭐⭐ | Mixed | Unlimited | Production standard 2026 |

---

## 2. Shared Schema + RLS Pattern (SpaceOS Choice)

### 2.1 Architektúra

```
┌─────────────────────────────────────────────────┐
│  Application Layer (API)                        │
│  ┌──────────────────────────────────────────┐   │
│  │  JWT Token → tenant_id extracted         │   │
│  │  UserContext.TenantId = "abc-123"        │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  DbConnectionInterceptor                        │
│  ┌──────────────────────────────────────────┐   │
│  │  SET LOCAL app.tenant_id = 'abc-123'     │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  PostgreSQL Database                            │
│  ┌──────────────────────────────────────────┐   │
│  │  RLS Policy: tenant_id =                 │   │
│  │  current_setting('app.tenant_id')::uuid  │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  Table: purchase_orders                         │
│  ├── id UUID                                    │
│  ├── tenant_id UUID  ← RLS filter column       │
│  ├── order_number VARCHAR                       │
│  └── ...                                        │
└─────────────────────────────────────────────────┘
```

### 2.2 SpaceOS Implementation

**DbConnectionInterceptor.cs** (minden modulban: Kernel, Joinery, Cutting, Identity):

```csharp
public class TenantDbConnectionInterceptor : DbConnectionInterceptor
{
    private readonly IUserContext _userContext;

    public TenantDbConnectionInterceptor(IUserContext userContext)
    {
        _userContext = userContext;
    }

    public override async ValueTask<InterceptionResult> ConnectionOpeningAsync(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _userContext.TenantId;

        if (tenantId == Guid.Empty)
        {
            throw new InvalidOperationException("Tenant context not set");
        }

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $"SET LOCAL app.tenant_id = '{tenantId}'";
        await cmd.ExecuteNonQueryAsync(cancellationToken);

        return await base.ConnectionOpeningAsync(connection, eventData, result, cancellationToken);
    }
}
```

**RLS Policy (PostgreSQL migration):**

```sql
-- Enable RLS on table
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation_policy ON purchase_orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- FORCE RLS even for table owner (CRITICAL)
ALTER TABLE purchase_orders FORCE ROW LEVEL SECURITY;
```

**UserContext.cs** (JWT claim extraction):

```csharp
public class UserContext : IUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public Guid TenantId
    {
        get
        {
            var tenantIdClaim = _httpContextAccessor.HttpContext?
                .User.FindFirst("tenant_id")?.Value;

            return tenantIdClaim != null
                ? Guid.Parse(tenantIdClaim)
                : Guid.Empty;
        }
    }
}
```

### 2.3 Multi-Layer Defense (Best Practice 2026)

SpaceOS **3-layer defense** (defense in depth):

| Layer | Mechanism | Implementation |
|-------|-----------|----------------|
| **1. API Gateway** | JWT tenant claim | Orchestrator middleware → `req.user.tenantId` |
| **2. Application** | DbConnectionInterceptor | `SET LOCAL app.tenant_id` minden connection-nél |
| **3. Database** | RLS Policy | PostgreSQL RLS policy enforcement |

**Rationale:** Ha 1 layer fail, a másik 2 still protect (defense in depth).

**Example breach scenario:**
- ❌ Developer accidentally comment out interceptor → RLS still protects
- ❌ SQL injection bypass RLS → JWT claim still validates tenant
- ❌ JWT forged → RLS + interceptor still double-check

---

## 3. Költség-hatékonyság

### 3.1 Shared Schema + RLS vs Database-Per-Tenant

**Scenario:** 2,500 tenant (SpaceOS target 2027)

| Pattern | PostgreSQL Instances | VPS Cost/instance | Total Cost/hó |
|---------|----------------------|-------------------|---------------|
| **Shared Schema** | 1 | $50/hó | **$50/hó** |
| **DB-Per-Tenant** | 2,500 | $50/hó | **$125,000/hó** |

**Költség megtakarítás:** $124,950/hó (99.96% savings)

**Elfogadott trade-off:** 1-5% RLS query overhead vs 2500× költségnövekedés.

### 3.2 SOC 2 Compliance

**Shared Schema + RLS:** ✅ **SOC 2 compliant** (logical isolation elég)

**When DB-Per-Tenant required:**
- HIPAA (healthcare data)
- FedRAMP (US government)
- Enterprise tier custom SLA ($10k+/hó customers)

**SpaceOS compliance target:** SOC 2 (faipar nem healthcare/government)

---

## 4. Performance

### 4.1 RLS Overhead (2026 Benchmarks)

**Query overhead:**
- Simple SELECT (single table): **<1%**
- Complex JOIN (3+ tables): **1-5%**
- Subquery-based RLS policy: **10-100%** (⚠️ AVOID)

**SpaceOS current RLS policies:**
```sql
-- ✅ GOOD (simple equality check)
CREATE POLICY tenant_isolation_policy ON purchase_orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ❌ BAD (subquery per row — exponential scaling)
CREATE POLICY tenant_isolation_policy ON purchase_orders
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = current_user));
```

**Rule:** RLS policy **MUST** be simple equality check (no subqueries).

### 4.2 Index Strategy

**CRITICAL:** RLS filter columns **MUST** be indexed.

```sql
-- Index tenant_id on every table with RLS
CREATE INDEX idx_purchase_orders_tenant_id ON purchase_orders (tenant_id);
CREATE INDEX idx_joinery_batches_tenant_id ON joinery_batches (tenant_id);
CREATE INDEX idx_cutting_plans_tenant_id ON cutting_plans (tenant_id);
```

**Without index:** Sequential scan (100× slower)
**With index:** Index scan (constant time)

### 4.3 Noisy Neighbor Problem

**Problem:** Egy tenant heavy query lelassítja a többit.

**Example:**
- Tenant A: 10,000 order/hó → heavy JOIN query (30s)
- Tenant B: 10 order/hó → simple SELECT (100ms) → **blocked** ha Tenant A lock-olja a table-t

**Mitigáció (Later):**
1. **Query timeout:** 30s max execution time
2. **Resource quota:** CPU/memory limit per tenant (cgroup)
3. **Read replicas:** Heavy analytics queries → read replica

**SpaceOS current state:** Nincs query timeout (TODO: Q4 2026)

---

## 5. Connection Pooling (PgBouncer)

### 5.1 PgBouncer Session Mode vs Transaction Mode

| Mode | Session Variable | RLS Compatibility | Performance |
|------|------------------|-------------------|-------------|
| **Session Mode** | Preserved | ✅ Compatible | Lower (1 conn = 1 session) |
| **Transaction Mode** | **Cleared after txn** | ❌ **BROKEN** | Higher (conn reuse) |

**SpaceOS current:** Nincs PgBouncer (direct PostgreSQL connection)

**Future (VPS production):**
- PgBouncer **session mode** OR
- `SET LOCAL app.tenant_id` (transaction-scoped, cleared after COMMIT)

**Recommended:** `SET LOCAL` (transaction-scoped) + PgBouncer transaction mode

**Implementation change:**
```csharp
// BEFORE (session-scoped)
cmd.CommandText = $"SET app.tenant_id = '{tenantId}'";

// AFTER (transaction-scoped, PgBouncer-safe)
cmd.CommandText = $"SET LOCAL app.tenant_id = '{tenantId}'";
```

**SpaceOS status:** ✅ Already using `SET LOCAL` (PgBouncer-ready)

---

## 6. Testing Strategy

### 6.1 Cross-Tenant Query Detection

**Integration test pattern:**

```csharp
[Fact]
public async Task GetOrders_DoesNotReturnOtherTenantsData()
{
    // Arrange: 2 tenants
    var tenantA = Guid.NewGuid();
    var tenantB = Guid.NewGuid();

    await SeedOrder(tenantA, "ORDER-A");
    await SeedOrder(tenantB, "ORDER-B");

    // Act: Query as Tenant A
    _userContext.TenantId = tenantA;
    var orders = await _repository.GetAllAsync();

    // Assert: Only Tenant A orders
    Assert.Single(orders);
    Assert.Equal("ORDER-A", orders.First().OrderNumber);
    Assert.DoesNotContain(orders, o => o.TenantId == tenantB);
}
```

**SpaceOS current:** ✅ Integration tests már implementálva (EHS Module)

### 6.2 RLS Policy Audit

**SQL Audit Query:**

```sql
-- List all tables WITHOUT RLS enabled
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND tablename NOT IN (
    SELECT tablename FROM pg_policies
  );
```

**Expected result:** 0 rows (minden tenant-aware táblán RLS van)

**Run frequency:** Pre-deployment checklist (minden release előtt)

---

## 7. KRITIKUS ÉRTÉKELÉS — PRO/KONTRA

### 7.1 ✅ PRO érvek — Shared Schema + RLS

1. **2026 Default Pattern:**
   - Legtöbb B2B SaaS (Stripe, Shopify, Notion) Shared Schema-t használ
   - SpaceOS target (1,300-2,500 tenant) **optimal range** Shared Schema-hoz

2. **Költség-hatékony:**
   - $50/hó vs $125,000/hó (2,500 tenant esetén)
   - 99.96% költségmegtakarítás

3. **SOC 2 Compliance:**
   - Logical isolation **elegendő** SOC 2-höz
   - SpaceOS nem healthcare (nincs HIPAA requirement)

4. **Multi-layer Defense:**
   - JWT + Interceptor + RLS (3-layer)
   - Ha 1 layer fail, másik 2 protect

5. **PostgreSQL Native:**
   - RLS built-in feature (nem custom middleware)
   - Battle-tested (PostgreSQL 9.5+ óta, 2015)

### 7.2 ⚠️ KONTRA érvek — mire figyelni

1. **Performance Overhead:**
   - 1-5% query overhead (RLS policy evaluation)
   - **Mitigáció:** Index tenant_id, simple equality RLS policy

2. **Noisy Neighbor:**
   - Egy tenant heavy query lelassítja a többit
   - **Mitigáció:** Query timeout (30s), resource quota (Later)

3. **Connection Pooling Complexity:**
   - PgBouncer transaction mode törli session variable-t
   - **Mitigáció:** `SET LOCAL` (transaction-scoped) — SpaceOS már használja ✅

4. **Compliance Escalation:**
   - Ha enterprise ügyfél HIPAA-t követel → DB-Per-Tenant szükséges
   - **Megoldás:** Hybrid tiering (Later, ha enterprise tier)

### 7.3 🎯 VÉGSŐ AJÁNLÁS

**✅ JAVASOLT — SpaceOS Shared Schema + RLS architektúra helyes választás 2026-ban**

**Indoklás:**
- Target scale (1,300-2,500 tenant) **optimális** Shared Schema-hoz
- Költség-hatékony ($50/hó vs $125k/hó)
- SOC 2 compliance elegendő (faipar nem healthcare)
- Multi-layer defense már implementálva
- PostgreSQL native RLS (battle-tested)

**Nincs változtatási igény** — meglévő implementáció követi a 2026-os best practices-t.

---

## 8. Jövőbeli Optimalizálás (Later)

### 8.1 Hybrid Tiering (Enterprise Tier)

**Scenario:** Enterprise ügyfél ($10k+/hó) dedicated DB-t követel.

**Architecture:**

```
┌────────────────────────────────────────┐
│  Standard Tier (99% tenants)           │
│  ├── Shared PostgreSQL instance        │
│  ├── RLS tenant isolation              │
│  └── Cost: $50/hó                      │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Enterprise Tier (1% tenants)          │
│  ├── Dedicated PostgreSQL instance     │
│  ├── Physical isolation                │
│  ├── Custom SLA (99.99% uptime)        │
│  └── Cost: $500/hó per tenant          │
└────────────────────────────────────────┘
```

**Routing logic:**

```csharp
public string GetConnectionString(Guid tenantId)
{
    var tier = _tenantRepository.GetTier(tenantId);

    return tier == TenantTier.Enterprise
        ? _enterpriseConnectionStrings[tenantId]  // Dedicated DB
        : _sharedConnectionString;                // Shared DB
}
```

**Trigger:** Enterprise tier pricing ($10k+/hó) → dedicated DB justified.

### 8.2 Query Timeout Enforcement

**PostgreSQL config:**

```sql
-- Global timeout (30s max)
ALTER SYSTEM SET statement_timeout = '30s';

-- Per-tenant timeout (overridable)
SET LOCAL statement_timeout = '10s';  -- Stricter for heavy tenants
```

**Application-level:**

```csharp
public async Task<List<Order>> GetOrdersAsync(CancellationToken ct)
{
    using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);

    return await _dbContext.Orders.ToListAsync(linkedCts.Token);
}
```

**Priority:** Q4 2026 (ha noisy neighbor probléma jelentkezik)

### 8.3 Read Replicas (Analytics Query Offload)

**Architecture:**

```
┌────────────────────────────────────────┐
│  Primary PostgreSQL (OLTP)             │
│  ├── Transactional queries (INSERT,   │
│  │   UPDATE, DELETE)                   │
│  └── Simple SELECT (dashboard)         │
└────────────────────────────────────────┘
          ↓ replication
┌────────────────────────────────────────┐
│  Read Replica (OLAP)                   │
│  ├── Heavy analytics queries (reports) │
│  ├── Complex JOIN (BI dashboard)       │
│  └── No RLS overhead (read-only)       │
└────────────────────────────────────────┘
```

**Trigger:** Heavy analytics queries (BI dashboard) slow down OLTP.

**Priority:** 2027 (ha 1,000+ tenant)

---

## 9. Best Practices Checklist (2026)

| Best Practice | SpaceOS Status | Notes |
|---------------|----------------|-------|
| ✅ **Multi-layer defense** | ✅ Implementálva | JWT + Interceptor + RLS |
| ✅ **RLS + GUC pattern** | ✅ Implementálva | `SET LOCAL app.tenant_id` |
| ✅ **Index tenant_id** | ✅ Implementálva | Minden RLS táblán index |
| ✅ **FORCE ROW LEVEL SECURITY** | ✅ Implementálva | Owner bypass disabled |
| ✅ **Integration tests** | ✅ Implementálva | Cross-tenant query check |
| ✅ **Simple RLS policy** | ✅ Implementálva | Equality check, no subquery |
| ✅ **PgBouncer-ready** | ✅ Implementálva | `SET LOCAL` (transaction-scoped) |
| ⚠️ **Query timeout** | ❌ TODO | Q4 2026 (30s limit) |
| ⚠️ **Read replicas** | ❌ TODO | 2027 (ha 1,000+ tenant) |
| ⚠️ **Hybrid tiering** | ❌ TODO | 2027 (ha enterprise tier) |

---

## 10. Források

**2026 Best Practices:**
- [Multi-Tenant Saas Architecture: 3 Best Proven Patterns](https://xgenious.com/multi-tenant-saas-architecture/)
- [Building a Multi-Tenant SaaS in 2026](https://gsoftconsulting.com/en/blog/building-multi-tenant-saas-2026)
- [Designing for Multi-Tenancy: Scalable Data Isolation Patterns in PostgreSQL](https://dohost.us/index.php/2026/06/12/designing-for-multi-tenancy-scalable-data-isolation-patterns-in-postgresql/)
- [How to architect multi-tenant SaaS on Postgres](https://clickhouse.com/resources/engineering/multi-tenant-saas-postgres-architecture)

**SpaceOS Implementation:**
- `spaceos-kernel/Infrastructure/Persistence/Interceptors/TenantDbConnectionInterceptor.cs`
- `spaceos-modules-*/Infrastructure/Persistence/Interceptors/` (Joinery, Cutting, Identity)
- RLS migration: `spaceos-kernel/Infrastructure/Persistence/Migrations/`

**Explorer Research:**
- MSG-EXPLORER-004-DONE (2026-06-22)

---

## 11. Changelog

| Dátum | Verzió | Változás |
|-------|--------|----------|
| 2026-06-22 | v1.0 | Initial RLS architecture doc (Librarian synthesis) |

---

**Következő review:** 2026-09-22 (Q3 review — query timeout implementation check)
