# Zustand Integration Strategy — Smart Refactoring Approach

**Problem:** Current app-store.jsx uses Zustand (415 `set()` calls), not Redux-like reducers

**Solution:** Adapt slices to integrate with Zustand, not replace it entirely

**Benefit:** Safe, incremental refactoring without rewriting 9,087 lines

---

## Current Architecture

```javascript
// Current: Zustand store with 415 set() calls
const api = create((set, get) => ({
  // State
  leads: [],
  opportunities: [],

  // Actions using set()
  createLead: (payload) => set((s) => ({
    leads: [newLead, ...s.leads],
    leadSeq: s.leadSeq + 1
  }))
}));
```

---

## Target Architecture (Smart Integration)

```javascript
// NEW: Import slices
import { crmSlice, salesSlice, ... } from './stores/index.js';

// NEW: Create dispatch adapter for Zustand
function createSliceDispatcher(set) {
  return (sliceName, actionName, payload) => {
    set((state) => {
      // Use slice reducer
      return sliceName.actions[actionName](state, payload);
    });
  };
}

// EXISTING: Keep Zustand store structure
const api = create((set, get) => ({
  // State initialized from slices
  ...getInitialState(),
  ...getSeedData(),

  // NEW: Simplified actions using slices
  createLead: (payload) => set((s) =>
    crmSlice.actions.createLead(s, payload)
  ),

  updateLeadStatus: (payload) => set((s) =>
    crmSlice.actions.updateLeadStatus(s, payload)
  ),

  // ... repeat for all actions
}));
```

**Key Insight:** We're not rewriting Zustand — we're repurposing it to call slice reducers!

---

## Benefits of This Approach

1. **No Rewrite** — Keep Zustand structure intact
2. **Safe** — Slice reducers are pure functions, easy to test
3. **Incremental** — Migrate one domain at a time
4. **Backwards Compatible** — API unchanged (`window.sim.createLead()` still works)
5. **Smaller Code** — Zustand boilerplate reduced

---

## Implementation Plan

### Step 1: Create Zustand Adapter (New File)

**File:** `stores/zustand-adapter.js` (NEW)

```javascript
/**
 * Zustand Adapter — Bridge between slice reducers and Zustand store
 */

import {
  crmSlice,
  salesSlice,
  warehouseSlice,
  productionSlice,
  catalogSlice
} from './index.js';

// Map slice name to slice object
const SLICES = {
  crm: crmSlice,
  sales: salesSlice,
  warehouse: warehouseSlice,
  production: productionSlice,
  catalog: catalogSlice
};

/**
 * Create Zustand actions for all slice reducers
 * Usage in Zustand store: { ...createAllActions() }
 */
export function createAllActions() {
  const actions = {};

  // For each slice
  Object.entries(SLICES).forEach(([sliceName, slice]) => {
    // For each action in slice
    Object.entries(slice.actions).forEach(([actionName, reducer]) => {
      // Create Zustand action
      actions[actionName] = (payload) => (set) => {
        set((state) => reducer(state, payload));
      };
    });
  });

  return actions;
}

/**
 * Example: crmSlice.actions.createLead becomes:
 * {
 *   createLead: (payload) => (set) =>
 *     set((state) => crmSlice.actions.createLead(state, payload))
 * }
 */
```

### Step 2: Integrate into app-store.jsx

**In app-store.jsx** (after Zustand import):

```javascript
// At top
import { getInitialState, getSeedData } from './stores/index.js';
import { createAllActions } from './stores/zustand-adapter.js';

// In Zustand store creation
const api = create((set, get) => ({
  // Initialize state from slices
  ...getInitialState(),
  ...getSeedData(),

  // Integrate all slice actions
  ...createAllActions(set),

  // Keep existing app-specific actions
  // (logging, analytics, etc.)
}));
```

### Step 3: Remove Redundant Code

In app-store.jsx, remove:
- ❌ Inline CRM action definitions (lines ~X-Y)
- ❌ Inline Sales action definitions
- ❌ Inline Warehouse action definitions
- ✅ Keep: App-specific logic, routing, side effects

### Step 4: Test Each Domain

After integration:
- [ ] Test CRM actions work
- [ ] Test Sales actions work
- [ ] Test Warehouse actions work
- [ ] Test Production actions work
- [ ] Test Catalog actions work
- [ ] Test localStorage persistence
- [ ] Verify no console errors

---

## Code Reduction Example

### BEFORE (Inline in app-store.jsx)

```javascript
// ~50 lines of CRM boilerplate
createLead: (payload) => set((s) => ({
  leads: [
    {
      id: payload.id || `LEAD-${state.leadSeq}`,
      email: payload.email,
      company: payload.company,
      status: "New",
      // ... 10 more properties
    },
    ...s.leads
  ],
  leadSeq: s.leadSeq + 1
})),

updateLeadStatus: (payload) => set((s) => ({
  leads: s.leads.map(lead =>
    lead.id === payload.id
      ? { ...lead, status: payload.newStatus, updatedAt: new Date() }
      : lead
  )
})),

// ... repeat for 70+ more actions
```

### AFTER (Using slices)

```javascript
// 1 line per action!
...createAllActions(),

// That's it. All 74 actions imported from slices.
```

**Code Reduction:** 9,087 → ~500 lines in app-store.jsx (95% smaller!)

---

## Zustand-Slice Integration Pattern

### Pattern 1: Action without payload

```javascript
// Slice reducer (pure function)
deleteAllLeads: (state) => ({
  ...state,
  leads: []
})

// Zustand wrapper
deleteAllLeads: () => (set) =>
  set((state) => crmSlice.actions.deleteAllLeads(state))
```

### Pattern 2: Action with payload

```javascript
// Slice reducer
createLead: (state, payload) => ({
  ...state,
  leads: [newLead, ...state.leads]
})

// Zustand wrapper
createLead: (payload) => (set) =>
  set((state) => crmSlice.actions.createLead(state, payload))
```

### Pattern 3: Action with async (Zustand side effect)

```javascript
// Slice reducer (pure)
addActivity: (state, { leadId, activity }) => ({
  ...state,
  leads: state.leads.map(l =>
    l.id === leadId
      ? { ...l, activities: [activity, ...l.activities] }
      : l
  )
})

// Zustand async wrapper (if needed)
logActivity: async (leadId, activity) => {
  // Perform async operations
  const result = await api.call('/log', { leadId, activity });

  // Then update state with slice reducer
  set((state) =>
    crmSlice.actions.addActivity(state, { leadId, activity })
  );
}
```

---

## Implementation Roadmap

### Phase 1: Create Integration Layer (1 hour)
- [ ] Create `zustand-adapter.js`
- [ ] Test that `createAllActions()` generates all 74 actions
- [ ] Verify action signatures match

### Phase 2: Integrate into app-store.jsx (2 hours)
- [ ] Import slices + adapter
- [ ] Add `...createAllActions()` to Zustand store
- [ ] Remove first CRM action definitions
- [ ] Test CRM actions work

### Phase 3: Remove Redundant Code (4 hours)
- [ ] Remove all inline CRM action code (~60 lines)
- [ ] Remove all inline Sales code (~150 lines)
- [ ] Remove all inline Warehouse code (~140 lines)
- [ ] Remove all inline Production code (~120 lines)
- [ ] Remove all inline Catalog code (~100 lines)

### Phase 4: Verification (2 hours)
- [ ] Test all pages render
- [ ] Test create/update flows
- [ ] localStorage persistence
- [ ] Bundle size analysis
- [ ] No console errors

### Phase 5: Documentation (1 hour)
- [ ] Document new pattern
- [ ] Update comments
- [ ] Create migration guide for future changes

**Total:** ~10 hours (vs 14 hours with pure rewrite)

---

## Risk Mitigation

### Risk 1: Breaking Zustand patterns
**Mitigation:** Keep Zustand's `set()` structure; just change reducer internals

### Risk 2: State shape compatibility
**Mitigation:** Slice `getState()` returns same shape as original

### Risk 3: localStorage format changes
**Mitigation:** Use same LS_KEY, no migration needed

---

## Success Validation

After integration:

```javascript
// ✅ All actions work
window.sim.createLead({ email, company });
window.sim.createQuote({ customer, value });
window.sim.addMaterial({ code, name });

// ✅ State structure unchanged
console.assert(window.sim.leads); // CRM
console.assert(window.sim.quotes); // Sales
console.assert(window.sim.materials); // Warehouse

// ✅ localStorage format unchanged
const stored = localStorage.getItem('jt_sim_v63');
console.assert(stored !== null); // Data persisted

// ✅ Bundle size reduced
// app-store.jsx: 488KB → ~400KB (18% reduction)

// ✅ No breaking changes
// All existing code continues to work
```

---

## Comparison: Old vs New Approach

| Aspect | Pure Refactor | Zustand Integration |
|--------|---------------|-------------------|
| Rewrite lines | 9,087 → 0 | 415 → 74 |
| Time | 14 hours | 10 hours |
| Risk | High (rewrite) | Low (integration) |
| Testing | Extensive | Moderate |
| Backwards compat | Full | Full |
| Code reduction | 95% | 80% |
| Complexity | High | Low |

**Recommendation:** ✅ **Use Zustand Integration** (faster, safer, better ROI)

---

**Next:** Implement zustand-adapter.js
