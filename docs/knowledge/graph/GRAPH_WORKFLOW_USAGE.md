# Graph-Based Workflow Usage Guide

> **ADR-041 Phase 1** — Epic Dependency Graph & Workflow Visualization
>
> **Status:** ✅ LIVE (2026-06-22)
> **Version:** 1.0

---

## Overview

The Graph-Based Workflow system provides **dependency-aware project coordination** for SpaceOS epics, tasks, and manufacturing workflows. It uses **graph theory algorithms** (topological sort, critical path, parallel groups) to enable:

- **Cross-project dependency tracking** (EPICS.yaml)
- **Automatic execution order** computation
- **Critical path** identification for bottleneck detection
- **Parallel execution** optimization
- **Mermaid visualization** for clarity

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      EPICS.yaml (Source)                    │
│  - Version-controlled epic definitions                      │
│  - Dependency declarations (depends_on, parallel_with)      │
│  - Status tracking (pending, active, done, blocked)         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─► epicsValidator.ts  → Schema + DAG validation
                  ├─► epicsLoader.ts     → YAML → WorkflowGraph
                  ├─► operations.ts      → Graph algorithms
                  └─► mermaidGenerator.ts → Mermaid diagrams
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   WorkflowGraph (Runtime)                   │
│  - nodes: GraphNode[]                                       │
│  - execution_order: string[]  (topological sort)            │
│  - critical_path: string[]    (longest chain)               │
│  - parallel_groups: string[][] (independent nodes)          │
│  - completion_percentage: number                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Load Epic Graph

```typescript
import { loadEpicGraph } from '@/graph';

const graph = await loadEpicGraph('docs/projects/EPICS.yaml');

console.log(graph.completion_percentage); // 50%
console.log(graph.execution_order);       // ['EPIC-KERNEL', 'EPIC-JOINERY', ...]
console.log(graph.critical_path);         // ['EPIC-KERNEL', 'EPIC-PORTAL', ...]
```

### 2. Validate EPICS.yaml

```typescript
import { validateEpicsYaml } from '@/pipeline/epicsValidator';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';

const content = await fs.readFile('docs/projects/EPICS.yaml', 'utf-8');
const parsed = yaml.load(content);

const validation = validateEpicsYaml(parsed);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### 3. Generate Mermaid Diagram

```typescript
import { generateMermaid } from '@/graph';

const graph = await loadEpicGraph('docs/projects/EPICS.yaml');
const mermaid = generateMermaid(graph);

console.log(mermaid);
// graph LR
//   EPIC-KERNEL[Kernel Stable] -->|triggers| EPIC-JOINERY[Joinery v2]
//   ...
```

### 4. Update Codebase Status

```typescript
import { updateCodebaseStatusWithEpics } from '@/pipeline/statusUpdater';

// Auto-update docs/Codebase_Status.md with epic graph
await updateCodebaseStatusWithEpics('docs/Codebase_Status.md', true); // with Mermaid
```

---

## REST API Endpoints

### GET /api/graph/epics

Returns the complete epic dependency graph.

**Query params:**
- `mermaid` (boolean): Include Mermaid diagram in response

**Response:**
```json
{
  "graph": {
    "id": "spaceos-epics",
    "type": "epic_dependency",
    "nodes": [...],
    "execution_order": ["EPIC-KERNEL", "EPIC-JOINERY", ...],
    "critical_path": ["EPIC-KERNEL", "EPIC-PORTAL", ...],
    "parallel_groups": [["EPIC-JOINERY", "EPIC-CUTTING"], ...],
    "completion_percentage": 50
  },
  "mermaid": "graph LR\n  ..." // if ?mermaid=true
}
```

### POST /api/graph/validate

Validate EPICS.yaml content without saving to disk.

**Request body:**
```json
{
  "yaml": "version: \"1.0\"\nepics:\n  ..."
}
```

**Response:**
```json
{
  "validation": {
    "valid": true,
    "is_dag": true,
    "errors": [],
    "warnings": [],
    "cycles": [],
    "orphans": []
  }
}
```

### GET /api/graph/critical-path/epic/spaceos-epics

Get critical path for a graph.

**Response:**
```json
{
  "critical_path": {
    "path": ["EPIC-KERNEL", "EPIC-ORCH", "EPIC-PORTAL", "EPIC-DOORSTAR"],
    "length": 4,
    "total_duration": null
  }
}
```

### GET /api/graph/mermaid/epic/spaceos-epics

Generate Mermaid diagram.

**Response:**
```json
{
  "mermaid": "graph LR\n  EPIC-KERNEL[Kernel] --> EPIC-JOINERY[Joinery]\n  ...",
  "node_count": 10
}
```

---

## EPICS.yaml Schema

```yaml
version: "1.0"
updated: "2026-06-22"

epics:
  - id: EPIC-KERNEL          # Unique identifier
    name: "Kernel Stable"    # Human-readable name
    project: spaceos/kernel  # Project slug
    depends_on: []           # Epic IDs this depends on
    parallel_with: []        # Optional: can run in parallel with
    status: done             # pending | active | done | blocked
    target_date: "2026-04-30" # YYYY-MM-DD
    tasks_yaml: "spaceos/kernel/TASKS.yaml" # Path to task definition
    description: |
      Kernel foundation: auth, audit, FSM
```

### Validation Rules

| Rule | Description |
|------|-------------|
| **E1** | `version` required (semantic versioning) |
| **E2** | `updated` required (YYYY-MM-DD) |
| **E3** | `epics` array required and non-empty |
| **E4** | All epic IDs unique |
| **E5** | `depends_on` references exist |
| **E6** | `parallel_with` references exist |
| **E7** | No circular dependencies (DAG validation) |
| **E8** | `status` values valid |
| **E9** | `project` field required |
| **E10** | `tasks_yaml` path required |

---

## Graph Algorithms

### Topological Sort

Computes execution order respecting dependencies.

```typescript
import { topologicalSort } from '@/graph/operations';

const result = topologicalSort(graph);
console.log(result.sorted); // ['EPIC-A', 'EPIC-B', 'EPIC-C']
console.log(result.valid);  // true (if DAG)
console.log(result.cycles); // [] (if DAG)
```

### Critical Path

Finds longest dependency chain (bottleneck).

```typescript
import { findCriticalPath } from '@/graph/operations';

const result = findCriticalPath(graph);
console.log(result.path);   // ['EPIC-A', 'EPIC-C', 'EPIC-E']
console.log(result.length); // 3
```

### Parallel Groups

Identifies nodes that can execute in parallel.

```typescript
import { findParallelGroups } from '@/graph/operations';

const result = findParallelGroups(graph);
console.log(result.groups);  // [['EPIC-B', 'EPIC-D'], ['EPIC-F']]
console.log(result.levels);  // 2
console.log(result.max_parallelism); // 2
```

---

## Caching

Epic graph is **cached in-memory** and reloaded only when EPICS.yaml is modified.

```typescript
import { loadEpicGraphCached, clearEpicGraphCache } from '@/graph/epicsLoader';

// First call: loads from disk
const graph1 = await loadEpicGraphCached('docs/projects/EPICS.yaml');

// Second call: returns cached instance (instant)
const graph2 = await loadEpicGraphCached('docs/projects/EPICS.yaml');

// graph1 === graph2  (same instance)

// Force reload
clearEpicGraphCache();
const graph3 = await loadEpicGraphCached('docs/projects/EPICS.yaml'); // reloads
```

---

## Troubleshooting

### Validation Errors

**Problem:** `EPICS.yaml validation failed: [E7_CIRCULAR_DEPENDENCY]`

**Solution:** Check `depends_on` chains for cycles:
```bash
# Use validation endpoint to debug
curl -X POST http://localhost:3456/api/graph/validate \
  -H "Content-Type: application/json" \
  -d '{"yaml": "..."}'
```

### File Not Found

**Problem:** `EPICS.yaml not found at path: docs/projects/EPICS.yaml`

**Solution:** Ensure working directory is `/opt/spaceos`:
```bash
cd /opt/spaceos
node -e "require('./spaceos-nexus/knowledge-service/dist/graph/epicsLoader').loadEpicGraph('docs/projects/EPICS.yaml')"
```

### Mermaid Not Rendering

**Problem:** Mermaid diagram shows syntax errors in browser.

**Solution:** Validate graph first:
```typescript
const graph = await loadEpicGraph('docs/projects/EPICS.yaml');
console.log(graph.has_cycles); // Should be false
```

---

## Integration Examples

### Auto-Update STATUS.md on Task Completion

```typescript
import { updateCodebaseStatusWithEpics } from '@/pipeline/statusUpdater';

// In DONE message handler
async function handleDoneMessage(msg: DoneMessage) {
  // ... process DONE ...

  // Auto-update epic status
  await updateCodebaseStatusWithEpics('docs/Codebase_Status.md', false);
}
```

### Dashboard Widget

```tsx
import { useEffect, useState } from 'react';

function EpicGraph() {
  const [graph, setGraph] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3456/api/graph/epics?mermaid=true')
      .then(res => res.json())
      .then(data => setGraph(data.graph));
  }, []);

  if (!graph) return <div>Loading...</div>;

  return (
    <div>
      <h2>Epic Dependency Graph</h2>
      <p>Completion: {graph.completion_percentage}%</p>
      <pre>{graph.mermaid}</pre>
    </div>
  );
}
```

---

## Future Enhancements (Phase 2+)

- [ ] **React Flow integration** — Interactive graph editor in frontend
- [ ] **Auto-dispatch based on graph** — Conductor uses critical path for prioritization
- [ ] **Real-time graph updates** — WebSocket push when EPICS.yaml changes
- [ ] **Project-level graphs** — Load TASKS.yaml and build project graph
- [ ] **Manufacturing workflow graphs** — Production step dependencies
- [ ] **Graph analytics** — Bottleneck detection, slack time, resource optimization

---

## References

- **ADR-041:** `/opt/spaceos/docs/architecture/decisions/ADR-041-graph-based-workflow-architecture.md`
- **Source Code:** `/opt/spaceos/spaceos-nexus/knowledge-service/src/graph/`
- **API Routes:** `/opt/spaceos/spaceos-nexus/knowledge-service/src/api/graphRoutes.ts`
- **Validation Logic:** `/opt/spaceos/spaceos-nexus/knowledge-service/src/pipeline/epicsValidator.ts`

---

**Last Updated:** 2026-06-22
**Maintainer:** Backend Terminal (SpaceOS Agent Infrastructure)
