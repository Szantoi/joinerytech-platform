# Architect Decisions Memory

> **Architectural decisions cache** — Cold memory (365d TTL)
>
> ADR-ek és döntések összefoglalója.

## Key Architectural Decisions

### ADR-001: Clean Architecture
**Decision:** Modular Monolith + Clean Architecture + DDD
**Rationale:** [link to full ADR]

### ADR-041: Graph-Based Workflow
**Decision:** Epic és task dependency gráf
**Rationale:** [link to full ADR]

### ADR-048: Tiered Project Context
**Decision:** hot/warm/cold/shared memory tiers
**Rationale:** [link to full ADR]

### ADR-049: Parallel Workers
**Decision:** Dependency-aware parallel worker execution
**Rationale:** [link to full ADR]

## Technology Choices

### Backend Stack
.NET 8, PostgreSQL 16, Entity Framework Core

### Authentication
Keycloak 26+ with OIDC

### Deployment
VPS (4x vCPU, 8GB RAM), Nginx reverse proxy

---

**Last updated:** YYYY-MM-DD
