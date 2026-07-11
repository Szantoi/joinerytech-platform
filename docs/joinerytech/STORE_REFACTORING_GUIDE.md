# Store Refactoring Guide — Phase 1-A Migration

**Goal:** Migrate from monolithic `app-store.jsx` (488KB) to modular store slices

**Timeline:** Incremental over 3-4 days

---

## Current State → New State

### BEFORE (Monolithic)
```
app-store.jsx (488KB, 9,087 lines)
├── CRM actions (createLead, convertLeadToOpp, ...)
├── Sales actions (createQuote, approveQuote, ...)
├── Warehouse actions (addMaterial, createShipment, ...)
├── Production actions (createJob, createTask, ...)
├── Catalog actions (createItem, createAssembly, ...)
└── Seed data (QUOTES, ORDERS, MATERIALS, ...)
```

### AFTER (Modular)
```
stores/ (modular, ~320KB total)
├── crm-store.js (~60KB)
├── sales-store.js (~80KB)
├── warehouse-store.js (~70KB)
├── production-store.js (~60KB)
├── catalog-store.js (~50KB)
└── index.js (20KB) — composition + dispatchers

app-store.jsx (refactored, ~80KB core)
├── State composition (from stores/index.js)
├── localStorage persistence
├── Zustand store wrapper (if using)
└── Export to window.sim
```

---

## Step 1: Import Slices

Replace the monolithic inline definitions with slice imports:

```javascript
// BEFORE: All actions inline in app-store.jsx
function seed() {
  return {
    leads: [...],
    opportunities: [...],
    quotes: [...],
    orders: [...],
    // ... 9000+ more lines
  };
}

// AFTER: Import from slices
import {
  getInitialState,
  getSeedData,
  createDispatcher,
  crmSlice,
  salesSlice,
  warehouseSlice,
  productionSlice,
  catalogSlice
} from './stores/index.js';

// Initialize state
let state = getInitialState();

// Apply seed data
const seedData = getSeedData();
if (localStorage.getItem(LS_KEY) === null) {
  state = { ...state, ...seedData };
}
```

---

## Step 2: Refactor Dispatcher

Create a unified dispatcher that routes to slice actions:

### BEFORE
```javascript
// Every action was a separate method
window.sim = {
  createLead(payload) { /* 20 lines */ },
  updateLeadStatus(payload) { /* 15 lines */ },
  createQuote(payload) { /* 25 lines */ },
  approveQuote(payload) { /* 20 lines */ },
  // ... hundreds of methods
};
```

### AFTER
```javascript
// Unified dispatcher that routes to slices
const dispatch = createDispatcher(state);

window.sim = {
  // CRM actions
  createLead(payload) {
    state = dispatch('crm', 'createLead', payload);
    persistState(state);
    notifySubscribers();
  },

  updateLeadStatus(payload) {
    state = dispatch('crm', 'updateLeadStatus', payload);
    persistState(state);
    notifySubscribers();
  },

  // Sales actions
  createQuote(payload) {
    state = dispatch('sales', 'createQuote', payload);
    persistState(state);
    notifySubscribers();
  },

  approveQuote(payload) {
    state = dispatch('sales', 'approveQuote', payload);
    persistState(state);
    notifySubscribers();
  },

  // ... etc for all slices
};
```

---

## Step 3: Migrate Incrementally

Do NOT refactor all 500+ actions at once. Migrate by domain:

### Domain Priority Order
1. **CRM** (leads, opportunities) — foundational for sales
2. **Sales** (quotes, orders) — most frequently used
3. **Warehouse** (materials, shipments) — complex domain
4. **Production** (jobs, tasks, nesting) — operational
5. **Catalog** (items, categories) — mostly read-only

### Per-Domain Checklist

```markdown
## CRM Migration
- [ ] Remove all CRM action definitions from app-store.jsx
- [ ] Test: Create lead, update status, convert to opp
- [ ] Verify: localStorage persistence works
- [ ] Verify: React components still work
- [ ] Run tests (if any)
- [ ] Commit

## Sales Migration
- [ ] Remove all Sales action definitions
- [ ] Test: Create quote, update lines, approve, create order
- [ ] Verify: Quote → Order creation flow works
- [ ] Run tests
- [ ] Commit

## Warehouse Migration
- [ ] Remove all Warehouse action definitions
- [ ] Test: Add material, record stock movements, create shipment
- [ ] Verify: Stock level tracking works
- [ ] Run tests
- [ ] Commit

## Production Migration
- [ ] Remove all Production action definitions
- [ ] Test: Create job, create task, create nesting
- [ ] Verify: Job FSM works
- [ ] Run tests
- [ ] Commit

## Catalog Migration
- [ ] Remove all Catalog action definitions
- [ ] Test: Create item, category, assembly
- [ ] Verify: Hierarchical categories work
- [ ] Run tests
- [ ] Commit
```

---

## Step 4: Backwards Compatibility Check

After each domain migration, verify:

1. **State Shape** — window.sim has same properties
   ```javascript
   // These must exist
   console.assert(window.sim.leads);
   console.assert(window.sim.quotes);
   console.assert(window.sim.materials);
   // ... etc
   ```

2. **Action Signatures** — Methods have same signatures
   ```javascript
   // Before:
   window.sim.createLead({ email, company, assignedToUserId })
   // After: (must be identical)
   window.sim.createLead({ email, company, assignedToUserId })
   ```

3. **localStorage Persistence**
   ```javascript
   // Test: Create object, reload page, verify still exists
   window.sim.createLead({ email: 'test@example.com', company: 'Test' });
   // Hard refresh browser
   // Verify: Lead still in window.sim.leads
   ```

4. **React Component Rendering**
   - Open each portal page (Quote list, Lead list, Material list, Job list)
   - Verify components render without errors
   - Verify data displays correctly

---

## Step 5: Testing Strategy

### Unit Tests (by slice)
```bash
# Test each slice independently
npm test -- stores/crm-store.test.js
npm test -- stores/sales-store.test.js
# ... etc
```

### Integration Tests (app-store.jsx)
```bash
# Test dispatcher routing
test('CRM action routes correctly', () => {
  let state = getInitialState();
  const dispatch = createDispatcher(state);
  state = dispatch('crm', 'createLead', {
    email: 'test@example.com',
    company: 'Test Co'
  });

  expect(state.leads).toHaveLength(1);
  expect(state.leads[0].email).toBe('test@example.com');
});
```

### E2E Tests (browser)
```javascript
// Open each portal page in browser
// Verify data loads and displays correctly
// Test create/update flows
// Check localStorage persistence
```

---

## File Size Verification

After each domain migration, verify file sizes:

```bash
# Expected sizes
du -h stores/*.js
# crm-store.js    ~60KB
# sales-store.js  ~80KB
# warehouse-store.js ~70KB
# production-store.js ~60KB
# catalog-store.js ~50KB
# index.js        ~20KB
# ──────────
# Total          ~340KB (vs 488KB before)

# app-store.jsx after refactoring
du -h app-store.jsx
# Expected: ~80KB (was 488KB)
```

---

## Rollback Plan

If issues occur:

1. **Git branch** — Do refactoring on feature branch
2. **Incremental commits** — Commit after each domain
3. **Quick revert** — `git checkout` if needed

---

## Success Criteria

- [ ] All 5 slices migrated to `stores/` folder
- [ ] app-store.jsx size reduced 488KB → <200KB (60%+ reduction)
- [ ] All actions callable via window.sim (backwards compatible)
- [ ] localStorage persistence works (test: create → reload → verify)
- [ ] No React console errors
- [ ] All portal pages render correctly
- [ ] Unit tests pass (if applicable)
- [ ] Performance stable or improved

---

## Timeline

| Phase | Duration | Task |
|-------|----------|------|
| Step 1 | 30 min | Import slices, setup index.js |
| Step 2 | 1 hour | Create unified dispatcher |
| Step 3.1 | 2 hours | Migrate CRM domain |
| Step 3.2 | 2 hours | Migrate Sales domain |
| Step 3.3 | 2 hours | Migrate Warehouse domain |
| Step 3.4 | 2 hours | Migrate Production domain |
| Step 3.5 | 1.5 hours | Migrate Catalog domain |
| Step 4 | 1.5 hours | Backwards compat checks |
| Step 5 | 1 hour | Testing + verification |
| **Total** | **~14 hours** | |

---

## Next: Lazy Loading (Phase 1-B)

After store splitting is complete and verified:

```javascript
// Dynamic import stores by page/world
const worldSlices = {
  sales: () => import('./stores/sales-store.js'),
  crm: () => import('./stores/crm-store.js'),
  warehouse: () => import('./stores/warehouse-store.js'),
  production: () => import('./stores/production-store.js'),
  catalog: () => import('./stores/catalog-store.js'),
};

// When user navigates to Sales page
async function switchWorld(worldId) {
  const sliceModule = await worldSlices[worldId]();
  // Initialize only needed slices
  state = mergeSlices(state, sliceModule);
}
```

---

## References

- Store slices: `/opt/spaceos/docs/joinerytech/stores/`
- Store architecture: `/opt/spaceos/docs/joinerytech/stores/README.md`
- Performance plan: `/opt/spaceos/docs/joinerytech/PERFORMANCE_OPTIMIZATION_PLAN_2026-07-02.md`
