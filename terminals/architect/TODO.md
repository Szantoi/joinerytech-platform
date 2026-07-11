# ARCHITECT Terminal TODO

> Utolsó frissítés: 2026-06-24
> Kontextus: Konzultatív architekturális partner

## Prioritás: HIGH

### 1. TaskMessageBox Architecture Review
**Státusz:** NEW
**Leírás:** A root terminál implementált egy új TaskMessageBox rendszert. Architektúra review szükséges:

**Komponensek:**
- `src/task-message-box/types.ts` - TypeScript típusok
- `src/task-message-box/store.ts` - SQLite backend (better-sqlite3, WAL mode)
- `src/task-message-box/mcp-tools.ts` - MCP tool definíciók
- Auto .md rendering inbox/outbox mappákba

**Review kérdések:**
1. Content hash (SHA-256) elég-e az integritáshoz?
2. Terminal izolációs logika megfelelő-e?
3. SQLite WAL mode skálázhatósági korlátok?

### 2. Graph-Based Workflow (ADR-041) támogatás
**Státusz:** ONGOING
**Ref:** `/opt/spaceos/docs/architecture/decisions/ADR-041-graph-based-workflow-architecture.md`

---

## Prioritás: MEDIUM

### 3. EHS + Catalog Hybrid Architecture
**Státusz:** Review cycle-ben
**Ref:** `docs/tasks/new/SpaceOS_CatalogEHS_Hybrid_Architecture_*.md` (4 verzió)

### 4. Knowledge Service DDD Refactoring
**Ref:** `docs/architecture/decisions/ADR-047-knowledge-service-ddd-refactoring.md`

---

## Referencia: Mikor hívnak

Root hívja az Architect terminált:
- Új cross-module interfész definiálásakor
- Komplex domain döntésnél (aggregate root vs. value object)
- >5 napos implementációs feladat spec-je előtt
- Ha nem biztos a meglévő kódbázis mintájában
