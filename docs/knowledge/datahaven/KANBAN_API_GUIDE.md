# Datahaven Kanban API Guide

> REST API a SpaceOS Kanban Dual-Track board kezeléséhez.
> Port: 3457 | Service: `datahaven-web.service`

---

## Architektúra

A Kanban API két track-et kezel:

```
DISCOVERY TRACK (Planning Pipeline)
  IDEAS → SELECTED → DEBATE → CONSENSUS → QUEUE

DELIVERY TRACK (Mailbox Pipeline)
  INBOX → ACTIVE → REVIEW → DONE → ARCHIVE
  (per-terminal swimlanes)
```

### Adatforrások

| Track | Forrás | Struktúra |
|-------|--------|-----------|
| Discovery | `docs/planning/` | `ideas/`, `selected/`, `consensus/`, `queue/` |
| Delivery | `docs/mailbox/` | `{terminal}/inbox/`, `outbox/`, `archive/` |

---

## Endpoints

### Board Snapshot

```bash
# Teljes board állapot
GET /api/kanban/snapshot

# Csak discovery vagy delivery
GET /api/kanban/snapshot?track=discovery
GET /api/kanban/snapshot?track=delivery

# Terminal szűrés
GET /api/kanban/snapshot?terminals=kernel,fe
```

**Response:**
```json
{
  "timestamp": "2026-06-19T17:51:46.656Z",
  "discovery": {
    "track": "discovery",
    "columns": {
      "ideas": [...],
      "selected": [...],
      "debate": [...],
      "consensus": [...],
      "queue": [...]
    },
    "totals": { "ideas": 6, "selected": 1, ... }
  },
  "delivery": {
    "track": "delivery",
    "swimlanes": [
      {
        "terminal": "kernel",
        "sessionActive": true,
        "columns": { "inbox": [], "active": [...], ... },
        "totals": { "inbox": 0, "active": 24, ... }
      }
    ],
    "activeSessions": ["kernel", "conductor"],
    "totals": { "inbox": 2, "active": 245, ... }
  }
}
```

---

### Metrics

```bash
# 7 napos metrikák (default)
GET /api/kanban/metrics

# Custom periódus
GET /api/kanban/metrics?period=14
```

**Response:**
```json
{
  "period_days": 7,
  "discovery": {
    "wip": { "ideas": 6, "selected": 1, "debate": 0, "consensus": 0, "queue": 0 },
    "throughput": { "items_queued": 0, "items_per_day": "0.00" }
  },
  "delivery": {
    "wip": { "inbox": 2, "active": 245, "review": 236, "done": 1 },
    "throughput": { "items_completed": 15, "items_per_day": "2.14" }
  }
}
```

---

### Discovery Track

```bash
# Teljes discovery board
GET /api/kanban/discovery

# Egy oszlop
GET /api/kanban/discovery/ideas
GET /api/kanban/discovery/queue

# Egy item DoR ellenőrzéssel
GET /api/kanban/discovery/item/docs/planning/queue/my-item.md
```

**DoR Response:**
```json
{
  "id": "TEST-ITEM-001",
  "title": "My Feature",
  "status": "ready",
  "priority": "high",
  "dor": {
    "ready": true,
    "met": 4,
    "total": 4,
    "criteria": {
      "has_status_ready": true,
      "has_assignee": true,
      "has_complexity": true,
      "has_priority": true
    }
  }
}
```

---

### Delivery Track

```bash
# Teljes delivery board
GET /api/kanban/delivery

# Terminal szűrés (comma-separated)
GET /api/kanban/delivery?terminals=kernel,fe

# Egy terminal swimlane
GET /api/kanban/delivery/kernel

# Egy üzenet
GET /api/kanban/delivery/message/docs/mailbox/kernel/inbox/msg.md
```

**Swimlane Response:**
```json
{
  "terminal": "kernel",
  "sessionActive": true,
  "columns": {
    "inbox": [],
    "active": [
      {
        "id": "MSG-KERNEL-089",
        "title": "KRITIKUS REGRESSZIÓ",
        "from": "root",
        "to": "kernel",
        "type": "task",
        "priority": "critical",
        "status": "READ",
        "model": "sonnet"
      }
    ],
    "review": [...],
    "done": [],
    "archive": [...]
  },
  "totals": { "inbox": 0, "active": 24, "review": 12, "done": 0, "archive": 92 }
}
```

---

### Actions

```bash
# Terminál nudge küldés
POST /api/kanban/nudge/kernel
Content-Type: application/json

{ "message": "Van várakozó feladatod!" }
```

**Response:**
```json
{
  "success": true,
  "terminal": "kernel",
  "message": "Van várakozó feladatod!"
}
```

---

### Server-Sent Events (SSE)

```bash
# Real-time board updates
curl -N http://localhost:3457/api/kanban/events
```

**Events:**
```
event: board_update
data: {"type":"board_update","timestamp":"...","discovery":{...},"delivery":{...}}

event: review_started
data: {"type":"review_started","track":"discovery","item_path":"..."}
```

---

## Terminálok

A Delivery track 17 terminált kezel:

| Terminál | Leírás |
|----------|--------|
| kernel | Backend core services |
| orch | Orchestrator (BFF) |
| fe | Frontend portal |
| joinery | Joinery domain module |
| abstractions | Shared abstractions |
| cutting | Cutting/Nesting module |
| inventory | Inventory management |
| procurement | Procurement module |
| sales | Sales/Pricing module |
| identity | Identity/Auth module |
| infra | Infrastructure/DevOps |
| e2e | E2E testing |
| architect | Architecture decisions |
| librarian | Knowledge management |
| nexus | LLM/Agent development |
| root | Strategic decisions |
| conductor | Daily coordination |

---

## Frontmatter Formátum

### Discovery Item (planning/)

```yaml
---
id: FEAT-001
title: Feature Title
status: idea|selected|debating|consensus|ready
priority: critical|high|medium|low
complexity: XS|S|M|L|XL
assignee: kernel
terminal: kernel
blocked_by: []
dependencies: []
---
```

### Delivery Message (mailbox/)

```yaml
---
id: MSG-KERNEL-001
from: root
to: kernel
type: task|done|blocked|question
priority: critical|high|medium|low
status: UNREAD|READ|DONE|APPROVED
model: opus|sonnet|haiku
ref: MSG-REF-ID
created: 2026-06-19
completed: 2026-06-19
---
```

---

## Hibakezelés

| HTTP | Jelentés |
|------|----------|
| 200 | Sikeres |
| 400 | Invalid request (pl. ismeretlen column) |
| 404 | Item/message nem található |
| 500 | Server error |

**Error Response:**
```json
{
  "error": "Unknown column: xyz"
}
```

---

## Példák

### Board polling script

```bash
#!/bin/bash
# kanban-poll.sh - 5 másodpercenként frissít

while true; do
  clear
  echo "=== SpaceOS Kanban Board ==="
  curl -s http://localhost:3457/api/kanban/metrics | jq '.delivery.wip'
  sleep 5
done
```

### JavaScript SSE client

```javascript
const events = new EventSource('/api/kanban/events');

events.addEventListener('board_update', (e) => {
  const data = JSON.parse(e.data);
  console.log('Board updated:', data.timestamp);
  updateUI(data);
});
```

---

## Kapcsolódó

- **Spec:** `docs/agent-infrastructure/KANBAN_DUAL_TRACK_SPEC_v1.md`
- **Service:** `datahaven-web.service` (port 3457)
- **Forráskód:** `datahaven-web/src/services/` + `routes/kanbanRoutes.js`
- **Tesztek:** `datahaven-web/tests/` (104 teszt)
