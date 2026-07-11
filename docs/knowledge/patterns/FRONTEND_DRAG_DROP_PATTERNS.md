# Frontend Drag-and-Drop Patterns

**Created:** 2026-06-22 (based on TOP3 Batch Assignment implementation)

---

## Native HTML5 Drag-and-Drop Pattern

### Use Case: Kanban Board Workflow

**Implementation:** BatchAssignmentBoard (Cutting Module)

### Component Structure

```typescript
// Main Board Component
const BatchAssignmentBoard = ({ date, batches, onAssignSuccess }) => {
  const [draggedBatch, setDraggedBatch] = useState<Batch | null>(null)
  const [localBatches, setLocalBatches] = useState(batches)

  return (
    <div className="grid grid-cols-4 gap-4">
      <DropZone onDrop={(machineId) => handleDrop(machineId)}>
        {/* Column content */}
      </DropZone>
    </div>
  )
}
```

### Draggable Card Pattern

```typescript
<div
  draggable={item.status === 'unassigned'}  // Conditional draggability
  onDragStart={() => handleDragStart(item)}
  onDragEnd={handleDragEnd}
  className={`... ${item.status === 'unassigned' ? 'cursor-move hover:shadow-lg' : 'cursor-default'}`}
>
  {/* Card content */}
</div>
```

**Key Points:**
- Only draggable when status allows (`status === 'unassigned'`)
- Visual feedback via `cursor-move` + `hover:shadow-lg`
- State tracking in parent component (`draggedBatch`)

### Drop Zone Pattern

```typescript
const DropZone = ({ machineId, onDrop, children }) => {
  const [isOver, setIsOver] = useState(false)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true) }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(machineId)
        setIsOver(false)
      }}
      className={`... ${isOver ? 'bg-teal-50 ring-2 ring-teal-300' : ''}`}
    >
      {children}
    </div>
  )
}
```

**Key Points:**
- `e.preventDefault()` in `onDragOver` is **REQUIRED** for drop to work
- Visual feedback when hovering: `bg-teal-50 ring-2 ring-teal-300`
- State tracking for hover: `isOver`

### State Management Pattern

```typescript
// Optimistic UI update on drop
const handleDrop = (machineId: string) => {
  if (!draggedBatch) return

  // Update local state immediately (optimistic)
  setLocalBatches(prev =>
    prev.map(b => b.id === draggedBatch.id
      ? { ...b, assignedMachine: machineId }
      : b
    )
  )
  setDraggedBatch(null)
}

// API call after assignment
const handleAssign = async (request: AssignRequest) => {
  await mutate(`/api/endpoint`, { method: 'POST', body: request })

  // Sync local state with backend response
  setLocalBatches(prev =>
    prev.map(b => b.id === request.id
      ? { ...b, status: 'assigned', ...request }
      : b
    )
  )

  onAssignSuccess?.()
}
```

**Key Points:**
- **Two-phase update:** Drop → Optimistic UI, Assign → Backend sync
- Local state (`localBatches`) mirrors props initially
- Parent callback (`onAssignSuccess`) for side effects (toast, refetch)

---

## Visual Feedback Best Practices

### Status-Based Styling

```typescript
const statusStyles = {
  unassigned: 'bg-white border-gray-200',
  assigned: 'border-amber-500 bg-amber-50',
  running: 'border-teal-500 bg-teal-50',
  completed: 'border-emerald-500 bg-emerald-50',
}

<div className={`... ${statusStyles[batch.status]}`}>
```

### Draggable Visual States

- **Idle:** `cursor-move` when hoverable
- **Dragging:** `opacity-50` on drag start
- **Drop target hover:** `ring-2 ring-teal-300 bg-teal-50`
- **Disabled:** `cursor-default` when not draggable

---

## Common Pitfalls

### 1. Forgot `e.preventDefault()` in `onDragOver`
**Symptom:** Drop event never fires
**Fix:** Always call `e.preventDefault()` in `onDragOver`

### 2. Dragging non-serializable state
**Symptom:** State lost after drag
**Fix:** Store dragged item in state, not in `event.dataTransfer`

### 3. Mobile touch events not working
**Symptom:** Drag doesn't work on touchscreen
**Fix:** Native HTML5 drag-drop supports touch events automatically (works on modern browsers)

### 4. Multiple drop zones interfering
**Symptom:** Drop fires on wrong zone
**Fix:** Use unique `machineId` prop per DropZone, check in `onDrop`

---

## Testing Strategy

### Manual Smoke Test Checklist
- [ ] Drag card from source column
- [ ] Hover over target column → visual highlight appears
- [ ] Drop card → card moves to target column
- [ ] Assign form appears (if applicable)
- [ ] Submit form → API call successful
- [ ] Card updates with new status/styling
- [ ] Toast notification appears
- [ ] Try dragging non-draggable card → cursor-default, no drag

### Unit Test Coverage (TODO)
- Drag start → `draggedBatch` state set
- Drag end → `draggedBatch` state cleared
- Drop event → `onDrop` callback called with correct `machineId`
- Status-based draggability → only `unassigned` draggable

---

## Performance Considerations

- **Small datasets (<100 items):** Native HTML5 is fast enough
- **Large datasets (>100 items):** Consider virtualization (react-window)
- **Re-render optimization:** Use `useMemo` for column filtering

---

## References

- Implementation: `portal/src/components/machining/BatchAssignmentBoard.tsx` (468 lines)
- Integration: `portal/src/pages/ProductionPage.tsx` (lines 490-499)
- DONE message: `terminals/frontend/outbox/2026-06-22_018_top3-machine-scheduling-ui-done.md`
