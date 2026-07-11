# Kernel (L1 Core Layer) Context

**Project:** `spaceos/kernel`
**Epic:** EPIC-KERNEL-STABLE
**Status:** DONE ✅ (completed: 2026-04-30)
**Last Updated:** 2026-06-24

---

## Aktuális állapot (HOT)

**Epic Status:** DONE ✅ (L1 stable, production-ready)

Kernel stabil, DONE státuszban. **Minden modul (Joinery, Cutting, Inventory, Identity, Orch, Portal) a Kernel-re épül.**

### Maintenance & Incremental Features
Bár az epic DONE, kisebb finomítások és security frissítések folyamatosak:
- RLS policy updates
- Multi-tenant best practices 2026 (MULTI_TENANT_RLS_ARCHITECTURE_2026.md)
- .NET 8 Clean Architecture compliance (DOTNET_8_CLEAN_ARCHITECTURE_2026.md)

---

## Közelmúlt (WARM — utolsó 2 hét)

### Architecture Reviews (2026-06-22)
**Két kritikus external research doc létrejött:**
- [MULTI_TENANT_RLS_ARCHITECTURE_2026.md](../architecture/MULTI_TENANT_RLS_ARCHITECTURE_2026.md) — Multi-tenant SaaS RLS best practices (2026 validated)
- [DOTNET_8_CLEAN_ARCHITECTURE_2026.md](../architecture/DOTNET_8_CLEAN_ARCHITECTURE_2026.md) — .NET 8 Clean Architecture (4-layer, CQRS+MediatR, DDD)

**SpaceOS 100% compliance:** Kernel implementáció teljes mértékben követi mindkét doc javaslatait.

### Event Sourcing Patterns (2026-06-22)
Új pattern doc az EHS module event sourcing implementációjához:
- [EVENT_SOURCING_PATTERNS.md](../patterns/EVENT_SOURCING_PATTERNS.md)
- Idempotency (client-generated UUID)
- GDPR compliance (anonymization events)
- Offline-first event queueing

---

## Architekturális alapok (COLD — stabil döntések)

### L1 Kernel Szerepkör
**Kernel = SpaceOS alapréteg (L1)** — üzleti logika NÉLKÜL.

**Felelősségek:**
- ✅ **Auth & Authorization** — JWT RS256, RBAC, RLS (ADR-001, ADR-004)
- ✅ **Audit Trail** — immutability, SHA-256 hashed events (ADR-003)
- ✅ **FSM (Finite State Machine)** — domain entity state transitions
- ✅ **Escrow** — data integrity, ACID transaction garantálás
- ✅ **Multi-tenancy** — PostgreSQL RLS tenant isolation

**Határok:**
- ❌ Kernel NOT OWNS: business logic (az Driver layer-ben van: Joinery, Cutting, stb.)
- ❌ Kernel NEM TUDJA mi az "ajtó" vagy "szabászat" — csak `IParametricProduct` interface-t lát (ADR-002)

### Modular Monolith (ADR-002)
**Kernel IParametricProduct interface:**
```csharp
public interface IParametricProduct
{
    Guid ProductId { get; }
    Guid TenantId { get; }
    Dictionary<string, object> Parameters { get; }

    Task<GeometryResult> GenerateGeometry(IGeometryEngine engine);
    Task<ValidationResult> ValidateParameters();
}
```

**Driver modulok** (Joinery, Cutting) implementálják az interface-t.
Kernel: escrow, audit, FSM → **nincs** `if (product is Joinery)` logic.

**Előny:** Új driver hozzáadása Kernel kód módosítás NÉLKÜL (DI registration only).

### Kritikus ADR-ek (L1 Kernel)

#### ADR-001: JWT RS256 + Azure Key Vault (2026-04-03 APPROVED)
| Item | Decision |
|------|----------|
| JWT algoritmus | **RS256** (asymmetric) |
| Private key tár | **Azure Key Vault** (prod); PEM file dev-ben |
| Hash chain serializáció | **PostgreSQL advisory lock** (`pg_try_advisory_xact_lock`) |
| Audit sink | **Azure Immutable Blob Storage** (WORM) |

**Miért:** Production security audit finding → RS256 asymmetric key, no shared secret risk.

#### ADR-003: Immutability & Audit Trail (APPROVED)
**Audit table minden DML event-hez:**
```sql
CREATE TABLE "AuditEvents" (
    "Id" uuid PRIMARY KEY,
    "EntityType" text NOT NULL,
    "EntityId" uuid NOT NULL,
    "Operation" text NOT NULL, -- INSERT, UPDATE, DELETE
    "ChangedBy" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "ChangedAt" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "BeforeData" jsonb,
    "AfterData" jsonb,
    "DataHash" text NOT NULL -- SHA256(BeforeData||AfterData)
);
```

**Golden Rule #3:** Immutability & Trust → nincs UPDATE CAD adatokon, minden SHA-256 hashed.

#### ADR-004: RBAC + Need-to-Know (APPROVED)
**Role-Based Access Control:**
- 6 role: `manufacturer`, `customer`, `supplier`, `admin`, `operator`, `auditor`
- **Need-to-Know** elv: customer NEM látja manufacturer belső BOM-ját

**PostgreSQL RLS implementation:**
```sql
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

**Minden query:**
```sql
SET LOCAL app.current_tenant = '<tenant-guid>';
SELECT * FROM products; -- RLS automatikusan filterel
```

### Dependencies (EPICS.yaml)
```yaml
depends_on: []  # Kernel = root dependency, senki nem függ tőle kivéve mindenki
status: done
target_date: '2026-04-30'
```

**Kernel-re épülő modulok:**
- EPIC-JOINERY-V2 ✅
- EPIC-CUTTING-Q3 (active)
- EPIC-INVENTORY-V1 ✅
- EPIC-IDENTITY-V1 ✅
- EPIC-ORCH-V2 ✅

---

## Kapcsolódó tudás (Kernel-specifikus)

### Architekturális Docs
| Doc | Tier | Prioritás |
|-----|------|-----------|
| [ADR_CATALOGUE.md](../architecture/ADR_CATALOGUE.md) | warm | critical |
| [MULTI_TENANT_RLS_ARCHITECTURE_2026.md](../architecture/MULTI_TENANT_RLS_ARCHITECTURE_2026.md) | warm | critical |
| [DOTNET_8_CLEAN_ARCHITECTURE_2026.md](../architecture/DOTNET_8_CLEAN_ARCHITECTURE_2026.md) | warm | critical |
| [DESIGN_MEMORY.md](../architecture/DESIGN_MEMORY.md) | cold | high |

### Patterns
| Doc | Tier | Prioritás |
|-----|------|-----------|
| [DATABASE_PATTERNS.md](../patterns/DATABASE_PATTERNS.md) | warm | critical |
| [EVENT_SOURCING_PATTERNS.md](../patterns/EVENT_SOURCING_PATTERNS.md) | hot | high |
| [TEST_COVERAGE_PATTERNS.md](../patterns/TEST_COVERAGE_PATTERNS.md) | hot | high |
| [SECURITY_PATTERNS.md](../patterns/SECURITY_PATTERNS.md) | hot | critical |
| [TESTING_STRATEGIES.md](../patterns/TESTING_STRATEGIES.md) | hot | high |

### Security & Deployment
| Doc | Tier | Prioritás |
|-----|------|-----------|
| [SECURITY_AUDIT_2026-06-20.md](../security/SECURITY_AUDIT_2026-06-20.md) | warm | critical |
| [KNOWN_GOTCHAS.md](../deployment/KNOWN_GOTCHAS.md) | warm | critical |

### Engineering Knowledge
| Doc | Tier | Prioritás |
|-----|------|-----------|
| [BACKEND_PATTERNS.md](../engineering/BACKEND_PATTERNS.md) | warm | high |
| [backend_dotnet.knowledge.md](../engineering/backend_dotnet.knowledge.md) | warm | high |
| [database_efcore.knowledge.md](../engineering/database_efcore.knowledge.md) | warm | high |

---

## API Endpoints (Kernel Layer)

**Kernel NEM exposed direktben** — modulok (Joinery, Cutting) használják internal API-ként.

**Tipikus Kernel service hívások (internal):**
```csharp
// Audit service
await _auditService.LogEvent(entityType, entityId, operation, beforeData, afterData);

// FSM transition
await _fsmEngine.TransitionAsync(entity, fromState, toState, context);

// RLS tenant scope
using var scope = _tenantContext.SetTenant(tenantId);
// ... RLS policy automatikusan filterel
```

---

## Known Gotchas (Kernel Layer)

1. **RLS tenant_id leak** — ha `SET LOCAL app.current_tenant` elmarad → 0 row returned (nem exception!)
2. **EF Core RLS integration** — `DbConnectionInterceptor` kell minden connection-höz
3. **AuditChain GenesisHash kritikus** — ha ez elvész → audit chain törött (2642d195...)
4. **PostgreSQL advisory lock** — `pg_try_advisory_xact_lock` transaction-dependent, nem session
5. **JWT RS256 key rotation** — Azure Key Vault rotation policy 90 nap, régi token 7 napig valid

**Referencia:** [KNOWN_GOTCHAS.md](../deployment/KNOWN_GOTCHAS.md), [INFRA_CONTEXT.md](INFRA_CONTEXT.md)

---

## VPS Deployment (Kernel-specifikus)

**VPS Location:** `/opt/spaceos/SpaceOS.Kerner/` (typo! "Kerner" nem "Kernel")
**Deploy target:** `/opt/spaceos/spaceos-kernel/publish/`
**Systemd service:** `spaceos-kernel.service`

**DB Connection:**
```
Host=localhost;Port=5433;Database=spaceos;User=spaceos_app
```

**FONTOS:** 5433 port (natív PostgreSQL), NEM 5432 (Docker).

**Environment:**
- `kernel.env` — `AuditChain__GenesisHash`, `JWT__KeyVaultUri`, stb.
- `appsettings.Production.json` — TILOS commit (secrets)

**Deploy parancsok:**
```bash
# 1. Build (gabor user)
cd /opt/spaceos/SpaceOS.Kerner/
dotnet publish -c Release -o ../spaceos-kernel/publish/

# 2. Restart (spaceos service user)
sudo systemctl restart spaceos-kernel

# 3. Health check
curl http://localhost:5000/health
```

**Referencia:** [INFRA_CONTEXT.md](INFRA_CONTEXT.md), [DEPLOYMENT_RUNBOOK.md](../deployment/DEPLOYMENT_RUNBOOK.md)

---

## 5 Golden Rule alkalmazása (Kernel szinten)

### #1: Data → Rules → Geometry
**Kernel NEM SZÁMOL** — csak validál és perzisztál.
Geometry calculation: Driver layer (`IParametricProduct.GenerateGeometry()`).

### #2: Modular Monolith
**Kernel IParametricProduct interface** — minden driver implementálja.

### #3: Immutability & Trust
**SHA-256 hashed audit events** — nincs UPDATE CAD adaton.

### #4: Need-to-Know RBAC
**PostgreSQL RLS** — customer nem látja manufacturer BOM-ját.

### #5: Walking Skeleton First
**Kernel L1 stabil** → minden modul erre épül, matematika a Driver layer-ben mélyül.

---

## Következő fázis (jövőbeli roadmap)

### Kernel v2 elképzelések (nincs tervezve még)
- **Event Sourcing native support** — Kernel szintű event store (jelenleg Driver layer felelősség)
- **Distributed transaction support** — multi-DB escrow (PostgreSQL + MongoDB)
- **GDPR compliance tooling** — right-to-be-forgotten automatizálás

### Blocker követelmények v2-höz
- **ADR review** — event sourcing vs CRUD trade-off
- **Performance benchmark** — 10k+ tenant scale testing

---

## Kapcsolódó terminálok

| Terminál | Szerepkör | Interakció |
|----------|-----------|------------|
| **Backend** | Kernel maintenance, .NET fejlesztés | DONE státusz, incremental fixes only |
| **Architect** | ADR review, cross-module konzultáció | Ha Kernel v2 terv készül |
| **Infra** | VPS deploy, systemd, PostgreSQL DBA | Production deployment |
| **Explorer** | .NET 8 pattern research | Clean Architecture, CQRS, DDD |

---

## Referenciák

- **Epic definition:** `docs/projects/EPICS.yaml` (EPIC-KERNEL-STABLE)
- **ADR Catalogue:** `docs/knowledge/architecture/ADR_CATALOGUE.md`
- **Multi-tenant RLS:** `docs/knowledge/architecture/MULTI_TENANT_RLS_ARCHITECTURE_2026.md`
- **Clean Architecture:** `docs/knowledge/architecture/DOTNET_8_CLEAN_ARCHITECTURE_2026.md`
- **Security Patterns:** `docs/knowledge/patterns/SECURITY_PATTERNS.md`
- **Database Patterns:** `docs/knowledge/patterns/DATABASE_PATTERNS.md`
- **Infra Context:** `docs/knowledge/context/INFRA_CONTEXT.md`

---

## Státusz összefoglaló

**Kernel L1 = STABLE, PRODUCTION-READY, DONE ✅**

Minden modul (Joinery, Cutting, Inventory, Identity, Orch, Portal) stabilan épül a Kernel-re.
Incremental security/RLS finomítások folyamatosak, de az epic DONE.

Ha új L1 core feature készül (event sourcing, distributed tx) → új epic + ADR kell.
