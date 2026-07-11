# Datahaven UI Patterns — UX Best Practices

> **Szintetizált UX pattern-ek** a Datahaven Dashboard v2 fejlesztéshez
>
> Forrás: Explorer UX research (2026-06-30) — Grafana, Linear, Jira, SaaS Dashboard Design 2026

**Last updated:** 2026-06-30
**Maintained by:** Librarian
**Source:** Explorer MSG-EXPLORER-010-DONE (UX Pattern Research)

---

## 📋 GYORS HIVATKOZÁS — FRONTEND TERMINÁLNAK

| Use Case | Javaslat Pattern | Quick Link |
|----------|-----------------|------------|
| **Új dashboard feature építek** | KPI Card System | [Pattern #1](#1-dashboard-kpi-card-system) |
| **Drag-drop kell** | dnd-kit + Optimistic Updates | [Pattern #2](#2-kanban-board-real-time-feedback) |
| **Mobile-first** | Touch target ≥ 44px, swipe support | [Pattern #2](#2-kanban-board-real-time-feedback) |
| **Dark theme** | Dark-first design (WCAG AA+) | [Pattern #3](#3-dark-first-bento-grid-layout) |
| **Data-dense layout** | Progressive disclosure, expandable rows | [Pattern #3](#3-dark-first-bento-grid-layout) |
| **Real-time updates** | SSE/WebSocket + status-based coloring | [Pattern #1](#1-dashboard-kpi-card-system), [#2](#2-kanban-board-real-time-feedback) |

---

## 🎨 UX PATTERN CATALOGUE

### 1. Dashboard KPI Card System

**Forrás:** Grafana, Datadog, Production Dashboard Grid Systems

**Pattern összefoglaló:**
Az **4-6 legfontosabb KPI** sticky header strip formájában az oldal tetején. Real-time frissítés (2-3 másodpercenként), status-based coloring (zöld/narancssárga/piros), trend indicator (↑/↓).

#### Mikor használd

- Executive/operational dashboard esetén
- Real-time monitoring igény (agent status, queue size, pipeline health)
- Gyors döntéshozatal támogatása (első pillantásra látható KPI-k)

#### Layout struktúra

```
┌─────────────────────┐
│  📊 METRIC LABEL    │
│  ▲ 42               │  ← value (nagy, olvasható, 2.5rem)
│  +2.5% (trend)      │  ← trend indicator (zöld/narancssárga/piros)
└─────────────────────┘
```

**Jellemzők:**
- **Sticky header strip** — 4-6 KPI card csoportosítva
- **Egyenlő szélesség vagy aszimmetrikus** (nagyobb card = fontosabb metrika)
- **Real-time frissítés:** SSE vagy WebSocket → 2-3 másodpercenként
- **Visual hierarchy:** Icon + Label + Value + Trend

#### Datahaven Dashboard alkalmazási pontok

**6 KPI javaslat:**
1. **Active Terminals** — hány terminal dolgozik jelenleg (WORKING status)
2. **Inbox Queue** — hány UNREAD üzenet van összesen (7 terminál)
3. **Avg Task Time** — átlagos task elvégzési idő (perc)
4. **Pipeline Health** — % sikeres DONE vs BLOCKED ratio (last 24h)
5. **Datahaven API Uptime** — % uptime utolsó 24h-ből
6. **Last DONE Task** — legutolsó DONE task timestamp (relative time)

#### Technikai stack

**Frontend (React/TypeScript):**
```typescript
interface KPICard {
  label: string;
  value: number | string;
  unit?: string;
  trend?: number; // % change
  status?: 'healthy' | 'warning' | 'critical';
  icon?: ReactNode;
  onClick?: () => void; // drilldown capability
}

// Dashboard header
<div className="kpi-strip">
  <KPICard label="Active Terminals" value={7} trend={+1} status="healthy" />
  <KPICard label="Inbox Queue" value={23} trend={+5} status="warning" />
  <KPICard label="Avg Task Time" value="28m" trend={-12} status="healthy" />
  {/* ... */}
</div>
```

**Backend (Node.js/Knowledge Service MCP tool):**
```typescript
// MCP tool: get_dashboard_metrics
{
  "activeTerminals": 7,
  "inboxQueue": 23,
  "avgTaskTime": 1680, // seconds
  "pipelineHealth": 0.94, // 94% success rate
  "apiUptime": 0.999,
  "lastTaskDone": {
    "time": "2026-06-30T12:45:00Z",
    "taskId": "MSG-BACKEND-042"
  }
}
```

**Real-time updates:**
- SSE endpoint: `GET /api/dashboard/metrics/stream`
- Refetch interval: 2-3 másodpercenként (configurable)
- Caching: React Query state memorization

#### CSS/Design System

**Dark theme (Datahaven):**
- **Background:** `rgba(255, 255, 255, 0.05)` (translucent strip)
- **Card bg:** `rgba(255, 255, 255, 0.08)` (subtle glass effect)
- **Border:** `rgba(255, 255, 255, 0.1)`
- **Typography:** KPI value = `2.5rem` (nagy, olvasható)
- **Spacing:** `16px` gap between cards

**Responsive:**
- Desktop (1200px+): 6 cards horizontal
- Tablet (768px-1200px): 3 cards, 2 rows
- Mobile (< 768px): 1 card per row (vertical stack)

```css
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  padding: 16px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.kpi-card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 200ms ease;
}

.kpi-value {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 8px 0;
}

.kpi-trend {
  font-size: 0.875rem;
  color: var(--trend-color); /* green/orange/red */
}
```

#### Accessibility követelmények

- **WCAG AA:** Text contrast ratio ≥ 4.5:1 (text/background)
- **Keyboard navigation:** Tab order logical, Enter = drill down
- **Screen reader:** ARIA labels (`role="status"`, `aria-live="polite"` for real-time updates)
- **Color-blind safe:** Status icons + color (not color alone)

#### Performance benchmark

- **Render time:** ≤ 200ms (card render + API fetch)
- **Real-time latency:** ≤ 1s (SSE update → UI change)
- **FPS:** 60 FPS (smooth hover transitions)

---

### 2. Kanban Board Real-Time Feedback

**Forrás:** Linear.app, Jira, LogRocket Drag-Drop UX, Mobile-First Workflows 2026

**Pattern összefoglaló:**
Azonnali vizuális visszajelzés drag-and-drop interakciónál, real-time collaboration (WebSocket sync), mobile-first touch optimization (long-press drag, swipe gestures).

#### Mikor használd

- Task management board (Kanban, Scrum)
- Real-time collaboration igény (több terminál dolgozik párhuzamosan)
- Mobile-first használat (tablet/mobilon is kell működjön)

#### Drag-and-Drop Best Practices

**1. Azonnali Visual Feedback:**
- Card megváltozik (opacity `0.7`, shadow növekedés) mozgatás közben
- Target column highlight (drop zone `border: 2px dashed`)
- Smooth animation (`200ms cubic-bezier(0.4, 0, 0.2, 1)`)

**2. Intuitive Interaction:**
- **Mouse:** click-drag-release
- **Touch:** long-press (500ms) → drag (mobilon)
- **Keyboard:** Tab + arrow keys (a11y support)

**3. Real-Time Collaboration:**
- Más terminál card mozgatása → valós időben látszik
- Conflict resolution: "X is moving this card" tooltip
- Optimistic updates (local update first, then sync to server)

#### Mobile-First Considerations

**Layout responsive breakpoints:**
```
Desktop (1200px+):   [Discovery] [Delivery]  (side-by-side)
Tablet (768-1200px): [Discovery] [Delivery]  (stacked, narrower)
Mobile (< 768px):    [Delivery]   (tabbed, one swimlane at a time)
                     [Discovery]
```

**Touch optimization:**
- **Button sizing:** 44×44px minimum (finger-friendly)
- **Swipe gestures:** Swipe left = move card, long-press = detail modal
- **Touch feedback:** Haptic vibration (if supported)

#### Datahaven Kanban Dual-Track Board

**Discovery Track (Planning Pipeline):**
```
┌───────────┬──────────┬──────────┬─────────┐
│ Ideas     │ Selected │ Debate   │ Queue   │
│ [5 cards] │ [2]      │ [1]      │ [3]     │
└───────────┴──────────┴──────────┴─────────┘
```

**Delivery Track (7 Terminal Swimlanes):**
```
┌───────────┬──────────┬──────────┬─────────┐
│ Backend   │ Design   │ Frontend │ Done    │
│ [4 cards] │ [2]      │ [3]      │ [8]     │
└───────────┴──────────┴──────────┴─────────┘
```

**Mobile experience:**
- Discovery track tabbed view → swipe to switch
- Delivery swimlanes collapsed → tap to expand
- Card detail modal → long-press or tap
- Status badge animations → smooth transitions

#### Technikai stack

**Frontend (React + dnd-kit):**
```typescript
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { WebSocketContext } from "./WebSocketProvider";

const KanbanCard = ({ task, swimlane }) => {
  const { setNodeRef, isOver } = useDroppable({ id: task.id });
  const { attributes, listeners, setNodeRef: dragRef } = useDraggable({
    id: task.id
  });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-card ${isOver ? 'over' : ''}`}
      {...attributes}
      {...listeners}
      onDragEnd={() => updateTaskStatus(task.id, swimlane.id)}
    >
      <h3>{task.title}</h3>
      <p>{task.assignee}</p>
    </div>
  );
};

// Real-time updates via WebSocket
const ws = new WebSocket('ws://localhost:3456/api/kanban/stream');
ws.onmessage = (event) => {
  const { type, task, action } = JSON.parse(event.data);
  if (type === 'CARD_MOVED') {
    setTasks(prev => updateTaskInList(prev, task));
  }
};
```

**Backend (Node.js + WebSocket):**
```typescript
io.on('connection', (socket) => {
  socket.on('card:move', async (taskId, targetColumn) => {
    const task = await updateTaskStatus(taskId, targetColumn);

    // Broadcast to ALL connected clients
    io.emit('card:moved', {
      type: 'CARD_MOVED',
      task,
      movedBy: socket.data.terminal
    });
  });
});
```

#### Animation & Feedback (CSS)

```css
.kanban-card {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: grab;
  border: 2px solid transparent;
}

.kanban-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.kanban-card.dragging {
  opacity: 0.7;
  cursor: grabbing;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.kanban-column.drop-over {
  background: rgba(37, 99, 235, 0.1);
  border: 2px dashed rgba(37, 99, 235, 0.5);
}

.kanban-card.moved-feedback {
  background: rgba(16, 185, 129, 0.1);
  animation: pulse 500ms ease-out;
}

@keyframes pulse {
  0% { background: rgba(16, 185, 129, 0.2); }
  100% { background: transparent; }
}
```

#### Accessibility követelmények

- **WCAG AA:** Color contrast ≥ 4.5:1, drag state visual cues
- **Keyboard navigation:** Tab (focus cards), Arrow keys (move), Enter (drop)
- **Screen reader:** ARIA labels (`aria-grabbed`, `aria-dropeffect`)
- **Touch accessibility:** Long-press (500ms) = drag start, audible/haptic feedback

#### Performance benchmark

- **60 FPS drag animation** — no janky frame drops
- **WebSocket latency:** ≤ 200ms (local update → server → broadcast)
- **Optimistic update:** Instant local state change, rollback on conflict

---

### 3. Dark-First Bento Grid Layout

**Forrás:** SaaS Dashboard Design 2026, Dark Mode UI Trends, Data-Dense Layout Best Practices

**Pattern összefoglaló:**
**Dark-first design** (dark theme primary, light theme adapted after) + **Bento Grid** (aszimmetrikus card grid, CSS Grid 12 column). Optimal contrast, minimal eye strain, data-dense progressive disclosure.

#### Mikor használd

- Dashboard ahol 4+ óra napi használat (engineer/analyst users)
- Data-dense információ (sok metrika, task, timeline egyszerre)
- Industrial/B2B környezet (dark theme standard)

#### Bento Grid Layout Structure

```
┌──────────────────────────────────┐
│   KPI Strip (6 cards, sticky)    │  ← 1 row, full width
├──────────────┬──────────────────┤
│ Kanban Board │  Timeline Graph  │  ← 2 col, 50% each
│  (Discovery) │  (Project Gantt) │
├──────────────┼──────────┬───────┤
│              │  Task    │ Alert │  ← Asymmetric
│ Details      │  List    │ Panel │
│ Sidebar      │ (tall)   │       │
└──────────────┴──────────┴───────┘
```

**Jellemzők:**
- **Aszimmetrikus card méretek** (1/2, 2/3, 1/3 width)
- **CSS Grid auto-placement** (12 column system)
- **Responsive:** Grid reorganizes at breakpoints (1200px, 768px, 480px)
- **Dark background** (minimal eye strain, `#1a1d23` near-black)
- **Translucent card backgrounds** (visual hierarchy, `#242931`)

#### Dark-First Design Principles

**1. Contrast First:**
- WCAG AA minimum: **4.5:1** text/background
- WCAG AAA goal: **7:1** where possible (KPI numbers, critical alerts)

**2. Opaque Backgrounds:**
- Text cards: **Opaque bg** (`#242931`) — no translucency for readability
- Number displays: **High contrast** (`#e5e7eb` text on `#1a1d23`)

**3. Color Palette (Dark-First):**

```json
{
  "dark": {
    "bg": {
      "primary": "#1a1d23",   // near-black (main background)
      "secondary": "#242931", // card background (slightly lighter)
      "tertiary": "#2f3440"   // elevated elements
    },
    "text": {
      "primary": "#e5e7eb",   // light gray (NOT pure white, eye strain)
      "secondary": "#9ca3af", // muted text (descriptions)
      "muted": "#6b7280"      // disabled, timestamps
    },
    "status": {
      "healthy": "#10b981",   // green (DONE, WORKING)
      "warning": "#f59e0b",   // orange (PENDING, queue ≥ 10)
      "critical": "#ef4444",  // red (BLOCKED, ERROR)
      "info": "#3b82f6"       // blue (Info, links)
    }
  }
}
```

**Light theme (adapted from dark):**
- **NOT inverse** — dark-first designed, light adapted after
- Same semantic colors, different bg/text values

**4. Reduced Eye Strain:**
- **Minimal animation** (only on user interaction, no autoplaying loops)
- **Soft shadows** (`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4)`)
- **Consistent spacing** (16px base unit, 8px for tight spacing)

#### Datahaven Dashboard Layout

**CSS Grid Implementation:**

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: minmax(120px, auto);
  gap: 16px;
  padding: 16px;
  background: #1a1d23;
}

/* KPI Strip: full width, 1 row */
.kpi-strip {
  grid-column: 1 / -1;
  grid-row: auto;
}

/* Kanban: 6 columns, tall */
.kanban-board {
  grid-column: 1 / 7;   /* 50% */
  grid-row: auto / span 4;
}

/* Timeline/Gantt: 6 columns, tall */
.timeline-graph {
  grid-column: 7 / 13;  /* 50% */
  grid-row: auto / span 4;
}

/* Sidebar details: 3 columns */
.details-sidebar {
  grid-column: 1 / 4;   /* 25% */
  grid-row: auto / span 4;
}

/* Task list: 6 columns */
.task-list {
  grid-column: 4 / 10;  /* 50% */
  grid-row: auto / span 4;
}

/* Alerts: 3 columns */
.alert-panel {
  grid-column: 10 / 13; /* 25% */
  grid-row: auto / span 2;
}

/* Responsive: Tablet */
@media (max-width: 1200px) {
  .kanban-board, .timeline-graph, .details-sidebar, .task-list, .alert-panel {
    grid-column: 1 / -1; /* Full width */
  }
}

/* Mobile */
@media (max-width: 480px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
```

#### Data-Dense Patterns (Progressive Disclosure)

**Pattern:** Show summary, reveal details on demand

```typescript
// Expandable row pattern
<div className="data-dense-table">
  <tr onClick={() => toggleDetail(task.id)}>
    <td>{task.title}</td>
    <td>{task.status}</td>
    <td>▼ Details</td>
  </tr>
  {isDetailOpen && (
    <ExpandableRow>
      {/* Full task metadata, timeline, dependencies */}
    </ExpandableRow>
  )}
</div>
```

**Jellemzők:**
- **Compact rows** (32px height default, no extra padding)
- **Sortable columns** (click header = sort)
- **Progressive disclosure** (click row = expand details)
- **Max 20 rows visible** (scroll or pagination for more)
- **Icons > Text** (status badges ✅/⚠️/❌ instead of "DONE"/"PENDING"/"BLOCKED")

#### Accessibility követelmények

- **WCAG AA:** Text contrast ≥ 4.5:1 (minimum)
- **WCAG AAA goal:** ≥ 7:1 for KPI numbers, critical alerts
- **Color-blind safe:** Status = icon + color (not color alone)
- **Keyboard nav:** Tab order logical, Enter = expand row
- **Screen reader:** ARIA labels for icons (`aria-label="Status: Done"`)

#### Performance benchmark

- **80+ FPS:** Scroll, sort, filter operations
- **Render time:** ≤ 300ms (full dashboard grid render)
- **CSS Grid layout:** Hardware-accelerated (GPU rendering)

---

## 🔗 REFERENCIA LINK KATALÓGUS

### Dashboard Design

| Forrás | URL | Tanulság |
|--------|-----|----------|
| **Grafana Dashboard Best Practices** | [grafana.com/grafana/dashboards](https://grafana.com/grafana/dashboards/) | KPI card strip layout, real-time metrics |
| **Datadog Executive Dashboards** | [datadoghq.com/blog](https://www.datadoghq.com/blog/datadog-executive-dashboards/) | Executive vs operational dashboard patterns |
| **Production Dashboard Grid** | [fullstackinfra.substack.com](https://fullstackinfra.substack.com/p/day-64-building-a-production-grade) | Grid layout best practices |

### Kanban & Drag-Drop

| Forrás | URL | Tanulság |
|--------|-----|----------|
| **LogRocket Drag-Drop UX** | [blog.logrocket.com](https://blog.logrocket.com/ux-design/drag-and-drop-ui-examples/) | Visual feedback patterns, animation easing |
| **Jira Kanban Board Patterns** | [titanapps.io/blog](https://titanapps.io/blog/jira-kanban-board) | Swimlane organization, card structure |
| **Mobile-First Kanban 2026** | [any.do/blog](https://www.any.do/blog/top-kanban-boards-for-mobile-first-workflows-in-2026/) | Touch optimization, swipe gestures |

### Dark Mode & Data-Dense

| Forrás | URL | Tanulság |
|--------|-----|----------|
| **SaaS Dashboard Design 2026** | [925studios.co/blog](https://www.925studios.co/blog/saas-dashboard-design-examples-2026) | Dark-first design, Bento grid examples |
| **Dark Mode UI Trends 2026** | [midrocket.com](https://midrocket.com/en/guides/ui-design-trends-2026/) | Color palette, contrast, eye strain reduction |
| **Dark Admin Dashboard Templates** | [wrappixel.com/blog](https://wrappixel.com/blog/best-dark-mode-dashboard-designs-and-templates) | Real-world dark theme examples |

### Gantt & Timeline

| Forrás | URL | Tanulság |
|--------|-----|----------|
| **Gantt Chart Best Practices** | [asana.com/resources](https://asana.com/resources/gantt-chart-basics) | Timeline layout, milestone markers |
| **Gantt Chart Dependencies** | [teamhood.com](https://teamhood.com/project-management-resources/gantt-chart-dependencies/) | Dependency visualization, critical path |
| **Timeline vs Roadmap** | [dhtmlx.com/blog](https://dhtmlx.com/blog/comparing-gantt-chart-timeline-chart/) | Timeline pattern vs Gantt chart |

---

## 🛠️ FRONTEND TERMINAL QUICK REFERENCE

### Checklist: "Új dashboard feature építek"

- [ ] **KPI card kell?** → [Pattern #1](#1-dashboard-kpi-card-system)
  - 4-6 metric card strip, sticky header
  - Status-based coloring (green/orange/red)
  - Real-time SSE/WebSocket
  - Trend indicator (↑/↓)

- [ ] **Responsive layout?**
  - Desktop: 6 cards horizontal
  - Tablet: 3 cards, 2 rows
  - Mobile: 1 card per row

- [ ] **Accessibility?**
  - WCAG AA: contrast ≥ 4.5:1
  - Keyboard nav: Tab order
  - Screen reader: ARIA labels (`role="status"`)

### Checklist: "Drag-drop feature kell"

- [ ] **Library:** dnd-kit (NOT react-dnd, deprecated)
  - `npm install @dnd-kit/core @dnd-kit/sortable`

- [ ] **Visual feedback?**
  - Dragging state: opacity `0.7`, shadow increase
  - Drop zone: `border: 2px dashed`
  - Animation: `200ms cubic-bezier(0.4, 0, 0.2, 1)`

- [ ] **Mobile support?**
  - Touch: long-press (500ms) → drag
  - Keyboard: Tab + Arrow keys

- [ ] **Real-time sync?**
  - WebSocket: `ws://localhost:3456/api/kanban/stream`
  - Optimistic update: local first, rollback on conflict
  - Broadcast: `io.emit('card:moved', task)`

### Checklist: "Mobile-first layout"

- [ ] **Touch targets:** ≥ 44×44px (finger-friendly)
- [ ] **Swipe gestures:** Long-press = drag, swipe = action
- [ ] **Responsive breakpoints:**
  - Desktop: 1200px+
  - Tablet: 768-1200px
  - Mobile: < 768px

- [ ] **Haptic feedback:** Vibration on drag (if supported)

### Checklist: "Dark theme design"

- [ ] **Color palette:** Dark-first (`#1a1d23` bg, `#e5e7eb` text)
- [ ] **Contrast:** WCAG AA minimum (4.5:1), AAA goal (7:1)
- [ ] **Status colors:**
  - Green: `#10b981` (DONE, WORKING)
  - Orange: `#f59e0b` (PENDING, queue ≥ 10)
  - Red: `#ef4444` (BLOCKED, ERROR)
  - Blue: `#3b82f6` (Info, links)

- [ ] **Light theme:** Adapted from dark (NOT inverse)

### Checklist: "Data-dense layout"

- [ ] **Progressive disclosure:** Summary view → expand on click
- [ ] **Compact rows:** 32px height default
- [ ] **Icons > Text:** Status badges (✅/⚠️/❌)
- [ ] **Sortable columns:** Click header = sort
- [ ] **Max 20 rows visible:** Scroll or pagination

---

## 📊 DATAHAVEN ALKALMAZÁSI PONTOK — KONKRÉT PÉLDÁK

### Dashboard Oldal → KPI Card Strip

**Implementáció:** Pattern #1 (Dashboard KPI Card System)

**6 KPI card sticky header:**
1. Active Terminals (WORKING status count)
2. Inbox Queue (UNREAD üzenetek összesen)
3. Avg Task Time (átlagos task idő, perc)
4. Pipeline Health (% sikeres DONE vs BLOCKED)
5. Datahaven API Uptime (% last 24h)
6. Last DONE Task (timestamp, relative time)

**Tech stack:**
- React KPICard component
- MCP tool: `get_dashboard_metrics`
- SSE endpoint: `/api/dashboard/metrics/stream`
- Real-time: 2-3 sec refresh

---

### Kanban Oldal → Dual-Track Board + Mobile

**Implementáció:** Pattern #2 (Kanban Board Real-Time Feedback)

**Discovery Track:**
- Ideas → Selected → Debate → Queue (planning pipeline)
- Drag-drop card mozgatás (idea → selected)
- Real-time sync (WebSocket)

**Delivery Track:**
- 7 swimlane (terminals: Backend, Frontend, Designer, stb.)
- Task card drag-drop (backend → frontend)
- Mobile: Tabbed view (swap discovery ↔ delivery)

**Tech stack:**
- React + dnd-kit
- WebSocket: `ws://localhost:3456/api/kanban/stream`
- Optimistic updates (local first, rollback on conflict)

---

### Planning Oldal → Gantt + Dependency Viz

**Implementáció:** Pattern #3 (Dark-First Bento Grid) + Timeline component

**Gantt chart:**
- 8 terminal × 8 month timeline
- Epic bars (color-coded: Kernel blue, Joinery green, Cutting yellow)
- Dependency arrows (epic A → epic B)
- Current date marker (vertical red line)

**Tech stack:**
- CSS Grid Bento layout
- SVG timeline rendering (horizontal bars)
- Dependency graph (arrows with dashed lines)

---

### Full Dashboard Redesign → Dark-First Bento Grid

**Implementáció:** Pattern #3 (Dark-First Bento Grid Layout)

**Layout structure:**
```
┌──────────────────────────────────┐
│   KPI Strip (sticky)             │
├──────────────┬──────────────────┤
│ Kanban Board │  Gantt Timeline  │
├──────────────┼──────────┬───────┤
│ Sidebar      │  Tasks   │ Alert │
└──────────────┴──────────┴───────┘
```

**CSS Grid 12 column system:**
- KPI Strip: 12 columns (full width)
- Kanban: 6 columns (50%)
- Timeline: 6 columns (50%)
- Sidebar: 3 columns (25%)
- Tasks: 6 columns (50%)
- Alert: 3 columns (25%)

**Responsive:**
- Desktop (1200px+): Bento grid as above
- Tablet (768-1200px): Full width cards, stacked
- Mobile (< 768px): Single column

---

## 🎯 KÖVETKEZŐ LÉPÉSEK (Frontend terminálnak)

### Phase 1: KPI Card Strip (1-2 nap)

**Acceptance Criteria:**
- [ ] 6 KPI card component létrehozva
- [ ] MCP tool `get_dashboard_metrics` implementálva
- [ ] SSE endpoint real-time frissítés
- [ ] Dark theme CSS (status-based coloring)
- [ ] Responsive (desktop/tablet/mobile)

**Files:**
- `datahaven-web/client/src/components/Dashboard/KPICard.tsx`
- `datahaven-web/client/src/hooks/useDashboardMetrics.ts`
- `datahaven-web/src/routes/dashboardRoutes.js` (SSE endpoint)

---

### Phase 2: Kanban Drag-Drop (2-3 nap)

**Acceptance Criteria:**
- [ ] dnd-kit integration (drag-drop)
- [ ] WebSocket real-time sync
- [ ] Visual feedback (hover, dragging, drop-over states)
- [ ] Mobile touch support (long-press)
- [ ] 60 FPS performance

**Files:**
- `datahaven-web/client/src/components/Kanban/KanbanBoard.tsx`
- `datahaven-web/client/src/hooks/useKanbanWebSocket.ts`
- `datahaven-web/src/routes/kanbanRoutes.js` (WebSocket)

---

### Phase 3: Dark-First Bento Grid (1-2 nap)

**Acceptance Criteria:**
- [ ] CSS Grid 12 column layout
- [ ] Dark theme colors (`#1a1d23` bg, `#e5e7eb` text)
- [ ] WCAG AA contrast validation (4.5:1)
- [ ] Responsive breakpoints (1200px, 768px, 480px)
- [ ] Progressive disclosure (expandable rows)

**Files:**
- `datahaven-web/client/src/styles/dashboard-grid.css`
- `datahaven-web/client/src/components/Layout/BentoGrid.tsx`

---

**Last updated:** 2026-06-30
**Next review:** 2026-07-30 (monthly)
**Maintained by:** Librarian (knowledge curator)
