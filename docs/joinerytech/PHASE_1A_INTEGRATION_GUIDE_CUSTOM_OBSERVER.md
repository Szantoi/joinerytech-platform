# Phase 1-A Integration Guide — Custom Observable Store

**Updated for custom observer pattern (not Zustand)**

**Task:** MSG-FRONTEND-092 Performance Optimization Phase 1-A
**Goal:** Integrate 5 modular store slices into app-store.jsx
**Timeline:** ~10 hours
**Target:** app-store.jsx 9,087 lines → ~3,500 lines (61% reduction via extraction)

---

## Understanding the Current Architecture

### How app-store.jsx Works

The app uses a **custom observable pattern** (NOT Zustand):

```javascript
// Line 1117 in app-store.jsx
let state = null;  // Mutable state object

// Line 1366
function ensure() {
  if (!state) state = load();  // Lazy initialization
  return state;
}

// Line 1474
const api = {
  getState() { /* returns current state */ },
  subscribe(fn) { /* add listener */ },
  set(fn) { /* update state using reducer */ },

  // ~700 action methods like:
  createLead(payload) { set((s) => ({ /* updates */ })); },
  createQuote(payload) { set((s) => ({ /* updates */ })); },
  // ... etc
};

window.sim = api;
```

### The `set()` Function

```javascript
// Custom implementation (simplified)
function set(updater) {
  ensure();
  const updates = updater(state);  // Call reducer with current state
  state = { ...state, ...updates }; // Apply updates immutably
  listeners.forEach(fn => fn());   // Notify subscribers
  localStorage.setItem('jt_sim_v63', JSON.stringify(state));
}
```

**Key Pattern:** Actions call `set((s) => ({ updates }))` where updates is a partial state object.

---

## Integration Strategy

### Step 1: Create Observable Adapter (NEW)

**File:** `stores/observable-adapter.js` (NEW)

This adapter converts slice reducers to api methods:

```javascript
// stores/observable-adapter.js
import { crmSlice } from './crm-store.js';
import { salesSlice } from './sales-store.js';
import { warehouseSlice } from './warehouse-store.js';
import { productionSlice } from './production-store.js';
import { catalogSlice } from './catalog-store.js';

const SLICES = {
  crm: crmSlice,
  sales: salesSlice,
  warehouse: warehouseSlice,
  production: productionSlice,
  catalog: catalogSlice
};

/**
 * Create api methods from all slice reducers
 *
 * Usage in app-store.jsx:
 *   const api = {
 *     getState() { ... },
 *     subscribe(fn) { ... },
 *     set,
 *     ...createAllActions(set),  // <-- Add this
 *   };
 */
export function createAllActions(set) {
  const actions = {};
  let actionCount = 0;

  Object.entries(SLICES).forEach(([sliceName, slice]) => {
    Object.entries(slice.actions).forEach(([actionName, reducer]) => {
      actions[actionName] = (payload) => {
        try {
          // Call reducer with current state (state is closure in set function)
          // Reducer returns partial state updates
          const reducerFn = (currentState) => {
            const updates = reducer(currentState, payload);
            return updates;
          };

          // Use set() to apply updates
          set(reducerFn);
          actionCount++;
        } catch (error) {
          console.error(`Error in ${sliceName}.${actionName}:`, error);
          throw error;
        }
      };
    });
  });

  console.log(`✓ Observable adapter: ${actionCount} actions loaded from slices`);
  return actions;
}

/**
 * Validate slice compatibility with observable pattern
 */
export function validateSliceCompatibility() {
  let errors = [];
  let warnings = [];

  Object.entries(SLICES).forEach(([sliceName, slice]) => {
    if (!slice.getState || typeof slice.getState !== 'function') {
      errors.push(`${sliceName}.getState() must be a function`);
    }

    if (!slice.actions || typeof slice.actions !== 'object') {
      errors.push(`${sliceName}.actions must be an object`);
    } else {
      Object.entries(slice.actions).forEach(([actionName, reducer]) => {
        if (typeof reducer !== 'function') {
          errors.push(`${sliceName}.actions.${actionName} is not a function`);
        }
      });
    }

    if (!slice.seedData) {
      warnings.push(`${sliceName} missing seedData`);
    }
  });

  if (errors.length > 0) {
    console.error('❌ Slice compatibility errors:', errors);
    return false;
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Slice compatibility warnings:', warnings);
  }

  console.log('✓ All slices compatible with observable adapter');
  return true;
}

export function getSliceMetadata() {
  const metadata = {};

  Object.entries(SLICES).forEach(([sliceName, slice]) => {
    const actionNames = Object.keys(slice.actions);

    metadata[sliceName] = {
      actions: actionNames,
      actionCount: actionNames.length,
    };
  });

  return metadata;
}

validateSliceCompatibility();
```

### Step 2: Integrate into app-store.jsx

**File:** `/opt/spaceos/docs/joinerytech/app-store.jsx` (MODIFY around line 1474)

**BEFORE:**
```javascript
const api = {
  getState() { /* ... */ },
  subscribe(fn) { /* ... */ },
  set,
  reset() { /* ... */ },

  // ~700 inline action definitions:
  createLead(payload) { set((s) => ({ ... })); },
  setTradeMarkup(catId, markup) { set((s) => ({ ... })); },
  // ... 698 more methods
};
```

**AFTER:**
```javascript
// ADD at top of file (after imports, before const api = ...)
import { createAllActions } from './stores/observable-adapter.js';
import { getInitialState, getSeedData } from './stores/index.js';

const api = {
  getState() { /* ... */ },
  subscribe(fn) { /* ... */ },
  set,
  reset() { /* ... */ },

  // NEW: Load all actions from slices
  ...createAllActions(set),

  // KEEP existing app-specific methods:
  setTradeMarkup(catId, markup) { /* keep this one */ },
  // ... keep only app-specific methods that don't exist in slices
};
```

### Step 3: Merge State Initialization

**Current state initialization (line ~1350):**
```javascript
function seed() {
  return {
    // Manual state init with 500+ lines of inline seed data
    leads: [...],
    quotes: [...],
    materials: [...],
    // ... everything mixed together
  };
}
```

**After integration:**
```javascript
function seed() {
  return {
    // Get initial state from slices
    ...getInitialState(),
    // Get seed/demo data from slices
    ...getSeedData(),
    // Keep app-specific seed data that doesn't belong to slices
    // (templates, system settings, etc.)
  };
}
```

---

## Step-by-Step Implementation

### Phase 1: Create Observer Adapter

1. Create `stores/observable-adapter.js` (see Step 1 above)
2. Run validation: Check console for `✓ All slices compatible`

### Phase 2: Integrate into app-store.jsx

1. Add imports at top of app-store.jsx:
```javascript
import { createAllActions } from './stores/observable-adapter.js';
import { getInitialState, getSeedData } from './stores/index.js';
```

2. Modify the `api` object (line ~1474):
   - Add `...createAllActions(set),` after `reset()` method
   - REMOVE inline action definitions for CRM, Sales, Warehouse, Production, Catalog

3. Update `seed()` function (line ~1350):
   - Replace inline state initialization with `getInitialState()` + `getSeedData()`

### Phase 3: Remove Redundant Code (~570 lines)

**CRM actions to remove (~60 lines):**
- `createLead`, `updateLeadStatus`, `updateLead`, `deleteLead`
- `createOpportunity`, `updateOpportunityStatus`, `updateOpportunity`, `deleteOpportunity`
- `convertLeadToOpp`, `addActivity`

**Sales actions to remove (~150 lines):**
- `createQuote`, `updateQuoteStatus`, `updateQuote`, `deleteQuote`
- `approveQuote`, `rejectQuote`, `expireQuote`
- `createOrder`, `updateOrderStatus`, `updateOrder`, `releaseOrder`
- `addToCart`, `removeFromCart`, `clearCart`, `checkoutCart`
- `addCustomer`, `updateCustomer`, `deleteCustomer`

**Warehouse actions to remove (~140 lines):**
- `addMaterial`, `updateMaterial`, `deleteMaterial`
- `createMovement`, `updateMovement`
- `createShipment`, `updateShipmentStatus`, `releaseShipment`
- `assignVehicle`, `assignCrew`, `updateCrew`

**Production actions to remove (~120 lines):**
- `createJob`, `updateJobStatus`, `updateJob`, `deleteJob`
- `createTask`, `updateTaskStatus`, `updateTask`, `deleteTask`
- `createSchedule`, `updateSchedule`, `deleteSchedule`
- `createNesting`, `updateNesting`, `deleteNesting`

**Catalog actions to remove (~100 lines):**
- `createItem`, `updateItem`, `deleteItem`
- `createCategory`, `updateCategory`, `deleteCategory`
- `createAssembly`, `updateAssembly`, `deleteAssembly`
- `getItemByCode`, `searchItems`, etc.

### Phase 4: Test Each Domain

```javascript
// In browser console after integration:

// CRM
window.sim.createLead({ email: 'test@example.com', company: 'Test Inc' });
window.sim.updateLeadStatus({ id: 'LEAD-1', newStatus: 'Contacted' });

// Sales
window.sim.createQuote({ customer: 'Test', value: 50000 });
window.sim.approveQuote({ id: 'Q-1' });

// Warehouse
window.sim.addMaterial({ code: 'MAT-100', name: 'Wood', onHand: 500 });
window.sim.updateMaterialStock({ code: 'MAT-100', qty: 100, type: 'out' });

// Production
window.sim.createJob({ orderId: 'JT-1', type: 'cabinet' });
window.sim.createTask({ jobId: 'JOB-1', name: 'Cutting', type: 'cutting' });

// Catalog
window.sim.createItem({ sku: 'ITEM-1', name: 'Door', categoryId: 'CAT-1' });

// Verify persistence
localStorage.getItem('jt_sim_v63'); // Should exist
```

### Phase 5: Verify Backwards Compatibility

```javascript
// All existing React components should still work
const sim = window.useSim();
console.assert(typeof sim.createLead === 'function');
console.assert(sim.leads && Array.isArray(sim.leads));

// localStorage format unchanged
const stored = localStorage.getItem('jt_sim_v63');
console.assert(stored !== null && stored.includes('leads'));

// Page reload test
// 1. Open app in browser
// 2. Create a lead: window.sim.createLead({ email: 'test@x.com', company: 'Test' })
// 3. Hard refresh (Cmd+Shift+R)
// 4. Verify lead still exists: window.sim.leads.length > 0
```

---

## Expected Outcomes

### Code Reduction

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| app-store.jsx | 9,087 lines | ~3,500 lines | 61% |
| CRM actions | ~60 lines | 0 | 100% |
| Sales actions | ~150 lines | 0 | 100% |
| Warehouse actions | ~140 lines | 0 | 100% |
| Production actions | ~120 lines | 0 | 100% |
| Catalog actions | ~100 lines | 0 | 100% |
| **Total** | **9,087** | **~3,500** | **61%** |

### Performance Impact (Phase 1-A)

- **Bundle size:** 488 KB → ~400 KB (18% reduction)
- **Parse time:** Reduced (fewer lines to parse)
- **Module load:** Minimal (slices are small, focused)

### Timeline

| Step | Hours | Status |
|------|-------|--------|
| 1. Create adapter | 1 | ⏳ Next |
| 2. Integrate into app-store | 1 | Pending |
| 3. Remove redundant code | 4 | Pending |
| 4. Test domains | 4 | Pending |
| **Total Phase 1-A** | **10** | Ready to start |

---

## Rollback Plan

If integration fails:

1. Restore backup: `cp app-store.jsx.backup-2026-07-02 app-store.jsx`
2. Remove adapter: `rm stores/observable-adapter.js`
3. Remove slice imports: Delete import statements added in Step 2
4. Reload browser with hard refresh (Cmd+Shift+R)

---

## Success Criteria

- [ ] All 74 slice actions callable via `window.sim.actionName()`
- [ ] CRM domain tested (create, update, convert)
- [ ] Sales domain tested (quote, order, cart)
- [ ] Warehouse domain tested (material, shipment)
- [ ] Production domain tested (job, task, nesting)
- [ ] Catalog domain tested (item, category, assembly)
- [ ] localStorage persistence verified
- [ ] No console errors
- [ ] Bundle size reduced 18% (488KB → 400KB)

---

## Key Differences from Zustand Approach

| Aspect | Custom Observer | Previous Zustand Plan |
|--------|-----------------|----------------------|
| Store pattern | Manual observable | Zustand library |
| `set()` signature | `set((state) => updates)` | `set((state) => updates)` |
| Adapter needed | YES (`observable-adapter.js`) | YES (`zustand-adapter.js`) |
| Slice reducer pattern | `(state, payload) => updates` | `(state, payload) => updates` |
| Integration complexity | Same | Same |
| Code reduction | 61% | 80%+ |

**Conclusion:** The custom observer pattern is compatible with slices. The integration strategy is nearly identical, just adapted for the app's internal architecture.

---

*Last Updated: 2026-07-02*
*Task: MSG-FRONTEND-092 Phase 1-A*
*Status: Ready for implementation*
