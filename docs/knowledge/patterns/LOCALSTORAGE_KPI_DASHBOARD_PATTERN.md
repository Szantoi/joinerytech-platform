# LocalStorage KPI Dashboard Pattern — React Implementation

**Created:** 2026-06-22 (based on Catalog MVP Phase 1)

---

## Pattern Overview

**LocalStorage KPI Dashboard** = User-customizable metric dashboard with trend tracking, localStorage persistence, and zero backend dependency for MVP.

### Use Case: Quick Analytics MVP

**Problem:** Product owner needs KPI dashboard ASAP (3-4 days), backend analytics API not ready yet.

**Solution:** Client-side calculation + localStorage schema + mock data → Swap to real API later without UI changes.

---

## Architecture Pattern

### Component Hierarchy

```
<KPIDashboard />                   ← Container
  ├─ CSS Grid (2/4 cols)
  ├─ <KPICard /> × 4               ← Metric card (value, delta, sparkline)
  └─ <KPIConfigModal />            ← Customization modal
       └─ Up/Down reorder controls
```

### Custom Hooks (Separation of Concerns)

```typescript
// hooks/useKPICalculator.ts — Calculation logic
export function useKPICalculator(kpiData: KPIData, trends: TrendHistory)

// hooks/useDashboardLayout.ts — Persistence logic
export function useDashboardLayout()
```

---

## Data Schema

### TypeScript Interfaces

```typescript
// KPI Metric Definition
export type KPIMetricId = 'inventory-value' | 'active-skus' | 'avg-price' | 'low-stock'

export interface KPIMetric {
  id: KPIMetricId
  label: string
  value: number
  unit: 'currency' | 'count' | 'percentage'
  delta?: number        // % change from previous period
  trend?: 'up' | 'down' | 'neutral'
  sparklineData?: number[]  // Last 6 months for mini chart
}

// Raw KPI Data (from API or mock)
export interface KPIData {
  'inventory-value': number
  'active-skus': number
  'avg-price': number
  'low-stock': number
}

// Trend History (localStorage)
export interface TrendHistory {
  [metricId: string]: {
    [month: string]: number  // "2026-06": 12400000
  }
}

// localStorage Schema
export interface DashboardLayout {
  kpiOrder: KPIMetricId[]
  trends: TrendHistory
}
```

### localStorage Schema Example

```json
{
  "spaceos_dashboard_layout": {
    "kpiOrder": ["inventory-value", "active-skus", "avg-price", "low-stock"],
    "trends": {
      "inventory-value": {
        "2026-05": 11500000,
        "2026-06": 12400000
      },
      "active-skus": {
        "2026-05": 820,
        "2026-06": 847
      }
    }
  }
}
```

**Key Points:**
- `kpiOrder` — User customization (drag-drop or up/down buttons)
- `trends` — Monthly snapshots for delta % calculation
- Automatically adds new KPIs if missing (future-proof)

---

## Hook Implementation

### useKPICalculator (Calculation Logic)

```typescript
// hooks/useKPICalculator.ts
import { useMemo } from 'react'

export function useKPICalculator(
  kpiData: KPIData,
  trends: TrendHistory
): KPIMetric[] {
  return useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7) // "2026-06"
    const previousMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .slice(0, 7) // "2026-05"

    const metrics: KPIMetric[] = [
      {
        id: 'inventory-value',
        label: 'Készletérték',
        value: kpiData['inventory-value'],
        unit: 'currency',
        delta: calculateDelta('inventory-value'),
        trend: getTrend(calculateDelta('inventory-value')),
        sparklineData: getSparklineData('inventory-value')
      },
      // ... other metrics
    ]

    return metrics

    // Helper: Calculate delta %
    function calculateDelta(metricId: KPIMetricId): number | undefined {
      const current = trends[metricId]?.[currentMonth]
      const previous = trends[metricId]?.[previousMonth]

      if (!current || !previous) return undefined

      return ((current - previous) / previous) * 100
    }

    // Helper: Trend direction
    function getTrend(delta?: number): 'up' | 'down' | 'neutral' {
      if (!delta) return 'neutral'
      if (delta > 0) return 'up'
      if (delta < 0) return 'down'
      return 'neutral'
    }

    // Helper: Extract last 6 months for sparkline
    function getSparklineData(metricId: KPIMetricId): number[] | undefined {
      const monthlyData = trends[metricId]
      if (!monthlyData) return undefined

      const months = Object.keys(monthlyData).sort().slice(-6)
      return months.map(month => monthlyData[month])
    }
  }, [kpiData, trends])
}
```

**Key Points:**
- **useMemo:** Recalculate only when `kpiData` or `trends` change
- **Delta calculation:** `(current - previous) / previous * 100`
- **Sparkline data:** Last 6 months from `trends` object
- **Currency formatting:** Done in component (M/K suffix)

### useDashboardLayout (Persistence Logic)

```typescript
// hooks/useDashboardLayout.ts
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'spaceos_dashboard_layout'

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored
      ? JSON.parse(stored)
      : {
          kpiOrder: ['inventory-value', 'active-skus', 'avg-price', 'low-stock'],
          trends: {}
        }
  })

  // Auto-persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  }, [layout])

  // Record current KPI values as trend snapshot
  const recordTrend = (kpiData: KPIData) => {
    const currentMonth = new Date().toISOString().slice(0, 7) // "2026-06"

    setLayout(prev => ({
      ...prev,
      trends: {
        ...prev.trends,
        'inventory-value': {
          ...prev.trends['inventory-value'],
          [currentMonth]: kpiData['inventory-value']
        },
        'active-skus': {
          ...prev.trends['active-skus'],
          [currentMonth]: kpiData['active-skus']
        },
        'avg-price': {
          ...prev.trends['avg-price'],
          [currentMonth]: kpiData['avg-price']
        },
        'low-stock': {
          ...prev.trends['low-stock'],
          [currentMonth]: kpiData['low-stock']
        }
      }
    }))
  }

  // Reorder KPIs (up/down buttons)
  const moveKPI = (metricId: KPIMetricId, direction: 'up' | 'down') => {
    setLayout(prev => {
      const currentIndex = prev.kpiOrder.indexOf(metricId)
      if (currentIndex === -1) return prev

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (newIndex < 0 || newIndex >= prev.kpiOrder.length) return prev

      const newOrder = [...prev.kpiOrder]
      ;[newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]]

      return { ...prev, kpiOrder: newOrder }
    })
  }

  // Reset to default
  const resetLayout = () => {
    setLayout({
      kpiOrder: ['inventory-value', 'active-skus', 'avg-price', 'low-stock'],
      trends: {}
    })
  }

  return {
    kpiOrder: layout.kpiOrder,
    trends: layout.trends,
    recordTrend,
    moveKPI,
    resetLayout
  }
}
```

**Key Points:**
- **Lazy initial state:** `useState(() => JSON.parse(localStorage))` (read once)
- **Auto-persist:** `useEffect` saves on every `layout` change
- **Trend recording:** Call `recordTrend(kpiData)` once per day/session
- **Reorder:** Swap array indices (simpler than drag-drop library)

---

## UI Component Pattern

### KPIDashboard Container

```typescript
// components/catalog/KPIDashboard.tsx
export function KPIDashboard({ kpiData }: { kpiData: KPIData }) {
  const { kpiOrder, trends, recordTrend } = useDashboardLayout()
  const metrics = useKPICalculator(kpiData, trends)

  // Record trend snapshot on mount (once per session)
  useEffect(() => {
    recordTrend(kpiData)
  }, []) // Only on mount

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpiOrder.map(metricId => {
        const metric = metrics.find(m => m.id === metricId)
        if (!metric) return null

        return <KPICard key={metricId} metric={metric} />
      })}

      <button onClick={openConfigModal}>Beállítások</button>
    </div>
  )
}
```

### KPICard Component

```typescript
// components/catalog/KPICard.tsx
export function KPICard({ metric }: { metric: KPIMetric }) {
  const formattedValue = formatCurrency(metric.value)
  const deltaColor = metric.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'

  return (
    <div className="border rounded-lg p-4">
      <div className="text-sm text-gray-500">{metric.label}</div>
      <div className="text-2xl font-bold">{formattedValue}</div>

      {metric.delta !== undefined && (
        <div className={`text-sm ${deltaColor}`}>
          {metric.trend === 'up' ? '↑' : '↓'} {metric.delta.toFixed(1)}%
        </div>
      )}

      {metric.sparklineData && <Sparkline data={metric.sparklineData} />}
    </div>
  )
}

// Helper: Currency formatting with M/K suffix
function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M Ft`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K Ft`
  }
  return `${value} Ft`
}
```

### KPIConfigModal (Customization)

```typescript
// components/catalog/KPIConfigModal.tsx
export function KPIConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { kpiOrder, moveKPI, resetLayout } = useDashboardLayout()

  return (
    <Modal open={open} onClose={onClose}>
      <h2>KPI Sorrend</h2>

      {kpiOrder.map((metricId, index) => (
        <div key={metricId} className="flex items-center gap-2">
          <span>{LABELS[metricId]}</span>

          <button
            onClick={() => moveKPI(metricId, 'up')}
            disabled={index === 0}
          >
            ↑
          </button>

          <button
            onClick={() => moveKPI(metricId, 'down')}
            disabled={index === kpiOrder.length - 1}
          >
            ↓
          </button>
        </div>
      ))}

      <button onClick={resetLayout}>Reset</button>
      <button onClick={onClose}>Bezárás</button>
    </Modal>
  )
}

const LABELS: Record<KPIMetricId, string> = {
  'inventory-value': 'Készletérték',
  'active-skus': 'Aktív SKU-k',
  'avg-price': 'Átlagár',
  'low-stock': 'Alacsony készlet'
}
```

**Why up/down instead of drag-drop?**
- **Bundle size:** No `react-dnd` or `@dnd-kit` dependency (~50KB gzipped)
- **Simplicity:** 2 buttons vs drag event handlers
- **Accessibility:** Keyboard navigation easier than drag-drop

---

## Migration Path (localStorage → API)

### Phase 1: Mock Data + localStorage

```typescript
// Mock KPI data
const mockKPIData: KPIData = {
  'inventory-value': 12_400_000,
  'active-skus': 847,
  'avg-price': 15_200,
  'low-stock': 23
}

<KPIDashboard kpiData={mockKPIData} />
```

### Phase 2: Real API + localStorage (Hybrid)

```typescript
// Fetch from backend, still use localStorage for trends
const { data: kpiData } = useSWR('/api/analytics/kpi', fetcher)

<KPIDashboard kpiData={kpiData || mockKPIData} />
```

**Trends still in localStorage** — Backend doesn't have historical data yet

### Phase 3: Full Backend Migration

```typescript
// Backend provides both current + historical data
const { data } = useSWR('/api/analytics/kpi?include=trends', fetcher)

<KPIDashboard
  kpiData={data.current}
  trends={data.trends}  // Backend-provided trends
/>
```

**Remove localStorage logic** — Backend is source of truth

---

## Testing Strategy

### Unit Tests (Hook Logic)

```typescript
// __tests__/useKPICalculator.test.ts
import { renderHook } from '@testing-library/react-hooks'
import { useKPICalculator } from '../hooks/useKPICalculator'

test('calculates delta percentage correctly', () => {
  const kpiData: KPIData = {
    'inventory-value': 12_400_000,
    'active-skus': 847,
    'avg-price': 15_200,
    'low-stock': 23
  }

  const trends: TrendHistory = {
    'inventory-value': {
      '2026-05': 11_500_000,
      '2026-06': 12_400_000
    }
  }

  const { result } = renderHook(() => useKPICalculator(kpiData, trends))

  const inventoryMetric = result.current.find(m => m.id === 'inventory-value')
  expect(inventoryMetric?.delta).toBeCloseTo(7.83, 1) // (12.4M - 11.5M) / 11.5M * 100
  expect(inventoryMetric?.trend).toBe('up')
})

test('handles missing trend data gracefully', () => {
  const kpiData: KPIData = {
    'inventory-value': 12_400_000,
    'active-skus': 847,
    'avg-price': 15_200,
    'low-stock': 23
  }

  const trends: TrendHistory = {} // Empty trends

  const { result } = renderHook(() => useKPICalculator(kpiData, trends))

  const inventoryMetric = result.current.find(m => m.id === 'inventory-value')
  expect(inventoryMetric?.delta).toBeUndefined()
  expect(inventoryMetric?.trend).toBe('neutral')
})
```

### Component Tests (UI)

```typescript
// __tests__/KPIDashboard.test.tsx
test('renders 4 KPI cards in correct order', () => {
  const { getAllByTestId } = render(<KPIDashboard kpiData={mockKPIData} />)

  const cards = getAllByTestId('kpi-card')
  expect(cards).toHaveLength(4)
  expect(cards[0]).toHaveTextContent('Készletérték')
})

test('opens config modal on button click', () => {
  const { getByText, queryByText } = render(<KPIDashboard kpiData={mockKPIData} />)

  expect(queryByText('KPI Sorrend')).not.toBeInTheDocument()

  fireEvent.click(getByText('Beállítások'))

  expect(queryByText('KPI Sorrend')).toBeInTheDocument()
})
```

---

## Common Pitfalls

### 1. localStorage quota exceeded (5MB limit)
**Problem:** Too many trend snapshots (>100 months)
**Fix:** Limit to last 12 months, auto-prune old data

### 2. Trend recording every render
**Problem:** `recordTrend(kpiData)` in component body → infinite loop
**Fix:** `useEffect` with empty deps (once per mount)

### 3. KPI order mutation
**Problem:** Direct array mutation breaks React state
**Fix:** Spread operator `[...prev.kpiOrder]` before swap

### 4. Number formatting locale issues
**Problem:** `12400000` displays as "12,400,000" (US) or "12 400 000" (HU)
**Fix:** Custom `formatCurrency()` with M/K suffix

---

## Performance Considerations

- **useMemo:** Prevents recalculation on every render (only when data/trends change)
- **localStorage read:** Once on mount (lazy initial state)
- **localStorage write:** Throttled by React state updates (not on every keystroke)
- **Trend snapshots:** Max 12 months × 4 KPIs = 48 numbers (~500 bytes)

---

## References

- Implementation: `portal/src/hooks/useKPICalculator.ts`, `portal/src/components/catalog/` (8 tests pass)
- DONE message: `terminals/frontend/outbox/2026-06-22_011_catalog-mvp-phase1-kpi-dashboard-done.md`
- Bundle size: 447KB gzip (no drag-drop library)
- Migration path: localStorage → Hybrid → Full Backend
