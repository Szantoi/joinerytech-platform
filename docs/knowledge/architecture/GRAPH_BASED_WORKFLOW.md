# Graph-Based Workflow & Project Management

> **Státusz:** CONCEPT (2026-06-22)
> **Prioritás:** HIGH - Stratégiai irány

## Vízió

Minden SpaceOS workflow és projekt **gráfként** reprezentálható és vizualizálható:
- **Epicek** függnek más epicektől
- **Taskok** függnek más taskoktól
- **Flow lépések** függnek előző lépésektől
- **Terminálok** párhuzamosan dolgoznak független ágakon

## Alkalmazási területek

### 1. Projekt Management (Agent Fleet)

```yaml
# docs/projects/EPICS.yaml
epics:
  - id: EPIC-CUTTING-Q3
    name: "Cutting Module Q3"
    depends_on: ["EPIC-KERNEL-STABLE"]
    parallel_with: ["EPIC-PORTAL-V2"]
    tasks_yaml: "cutting-q3/TASKS.yaml"

  - id: EPIC-PORTAL-V2
    name: "Customer Portal v2"
    depends_on: ["EPIC-IDENTITY-V1"]
    tasks_yaml: "portal-v2/TASKS.yaml"
```

**Előnyök:**
- Conductor látja a teljes függőségi fát
- Automatikus parallelizáció ahol lehet
- Blocker detection: ha EPIC-A blokkolva, minden downstream EPIC is
- Critical path számítás

### 2. Manufacturing Workflow (SpaceOS Core)

```yaml
# Ajtógyártás workflow gráfként
nodes:
  - id: ORDER_RECEIVED
    type: start

  - id: DESIGN_APPROVAL
    depends_on: [ORDER_RECEIVED]

  - id: CUTTING_PLAN
    depends_on: [DESIGN_APPROVAL]
    parallel_with: [HARDWARE_ORDER]

  - id: HARDWARE_ORDER
    depends_on: [DESIGN_APPROVAL]

  - id: CNC_CUTTING
    depends_on: [CUTTING_PLAN]

  - id: ASSEMBLY
    depends_on: [CNC_CUTTING, HARDWARE_ORDER]  # JOIN pont

  - id: QC_CHECK
    depends_on: [ASSEMBLY]

  - id: SHIPPING
    depends_on: [QC_CHECK]
    type: end
```

**Előnyök:**
- Vizuális workflow builder a portálon
- Automatikus optimalizáció (parallel ágak)
- Real-time tracking: melyik node aktív
- Bottleneck detection

### 3. Planning Pipeline (Idea → Delivery)

```
IDEA ──┬── SELECTED ── DEBATE ── CONSENSUS ── QUEUE
       │                                        │
       │                              ┌─────────┴─────────┐
       │                              ▼                   ▼
       │                          BACKEND ───┬─── FRONTEND
       │                              │      │        │
       │                              ▼      │        ▼
       │                           DONE ─────┴──── DONE
       │                              │
       ▼                              ▼
    ARCHIVE ◄───────────────────── MERGED
```

## Technikai megvalósítás

### Adatmodell

```typescript
interface GraphNode {
  id: string;
  type: 'epic' | 'task' | 'workflow_step' | 'terminal';
  name: string;
  status: 'pending' | 'active' | 'done' | 'blocked';
  depends_on: string[];      // Bejövő élek
  triggers: string[];        // Kimenő élek
  parallel_with?: string[];  // Párhuzamos ágak
  metadata: Record<string, any>;
}

interface WorkflowGraph {
  id: string;
  name: string;
  nodes: GraphNode[];
  // Computed at runtime:
  critical_path?: string[];
  parallel_groups?: string[][];
  blocked_chains?: string[][];
}
```

### Vizualizáció opciók

| Szint | Technológia | Use Case |
|-------|-------------|----------|
| **Simple** | Mermaid.js | STATUS.md-be generált gráf |
| **Medium** | D3.js | Datahaven dashboard read-only |
| **Full** | React Flow | Interaktív szerkesztő |

### API Endpoints (tervezett)

```
GET  /api/graph/epics              # Epic dependency graph
GET  /api/graph/project/:slug      # Project task graph
GET  /api/graph/workflow/:id       # Manufacturing workflow
POST /api/graph/validate           # Cycle detection, orphan check
GET  /api/graph/critical-path/:id  # Longest path calculation
```

## Implementációs fázisok

### Phase 1: EPICS.yaml + Mermaid (MVP)
- [ ] EPICS.yaml schema definiálás
- [ ] Mermaid gráf generátor
- [ ] STATUS.md auto-update a gráffal
- [ ] Conductor: epic-szintű függőség kezelés

### Phase 2: Dashboard vizualizáció
- [ ] D3.js vagy React Flow integráció
- [ ] Real-time státusz frissítés (SSE)
- [ ] Click-to-navigate (epic → project → task)

### Phase 3: Workflow Builder
- [ ] Drag & drop node editor
- [ ] Template library (ajtógyártás, szekrénygyártás, stb.)
- [ ] Export/Import YAML

### Phase 4: Manufacturing Integration
- [ ] SpaceOS Kernel workflow engine
- [ ] Real-time tracking
- [ ] SLA/deadline számítás

## Kapcsolódó döntések

- **ADR-041**: Graph-based project dependencies (pending)
- **Datahaven Projects page**: Gantt + Graph view

## Megjegyzések

- A gráf mindig DAG (Directed Acyclic Graph) - ciklusok tiltottak
- Topológiai rendezés a végrehajtási sorrendhez
- Parallel ágak automatikus detektálása a Conductor számára

---

**Létrehozva:** 2026-06-22 Root session
**Következő lépés:** Phase 1 MVP implementáció döntés
