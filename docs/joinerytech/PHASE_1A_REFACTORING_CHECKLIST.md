# Phase 1-A Refactoring Checklist — Detailed Implementation Steps

**Status:** In Progress
**Estimated Duration:** 14 hours
**Approach:** Incremental by domain (CRM → Sales → Warehouse → Production → Catalog)

---

## Pre-Refactoring Validation

- [ ] **Backup current app-store.jsx**
  ```bash
  cp /opt/spaceos/docs/joinerytech/app-store.jsx \
     /opt/spaceos/docs/joinerytech/app-store.jsx.backup-2026-07-02
  ```

- [ ] **Verify bundle size baseline**
  ```bash
  du -h /opt/spaceos/docs/joinerytech/app-store.jsx
  du -sh /opt/spaceos/docs/joinerytech/build/
  ```

- [ ] **Check localStorage format**
  ```javascript
  const stored = localStorage.getItem('jt_sim_v63');
  console.log('Current LS size:', stored?.length);
  ```

---

## Phase 1: CRM Domain Refactoring (2 hours)

### Step 1.1: Identify CRM Code in app-store.jsx
- [ ] Find all `createLead` references
- [ ] Find all `createOpportunity` references
- [ ] Find all `addActivity` references
- [ ] Find seed data: `leads:`, `opportunities:`, `crmTasks:`, `leadSeq:`, `oppSeq:`

### Step 1.2: Extract from app-store.jsx
- [ ] Remove CRM action implementations (lines ~X-Y)
- [ ] Remove CRM seed data (lines ~Z-W)
- [ ] Remove CRM state initialization from seed()

### Step 1.3: Wire to Slice
```javascript
// BEFORE:
function seed() {
  return { leads: [...], opportunities: [...], ... };
}

// AFTER:
import { crmSlice } from './stores/crm-store.js';

// In state initialization
state = {
  ...state,
  ...crmSlice.getState(),
  ...crmSlice.seedData
};

// In actions
window.sim.createLead = (payload) => {
  state = dispatch('crm', 'createLead', payload);
  persistState(state);
};
```

### Step 1.4: Test CRM Migration
- [ ] Open browser, navigate to CRM page
- [ ] Create new lead — verify it appears
- [ ] Update lead status — verify FSM works
- [ ] Refresh page — verify lead persists in localStorage
- [ ] Check console — no errors

### Step 1.5: Validate Backwards Compatibility
- [ ] `window.sim.leads` exists
- [ ] `window.sim.createLead()` works
- [ ] `window.sim.opportunities` exists
- [ ] `window.sim.convertLeadToOpp()` works

### Step 1.6: Bundle Size Check
```bash
du -h /opt/spaceos/docs/joinerytech/app-store.jsx
# Should be ~488KB - (CRM lines / 9087) * 488KB
```

**Expected:** ~50-60KB reduction

---

## Phase 2: Sales Domain Refactoring (2 hours)

### Step 2.1-2.6: Repeat Steps 1.1-1.6 for Sales
- [ ] Identify: quotes, orders, customers, cart
- [ ] Extract from app-store.jsx
- [ ] Wire to `salesSlice`
- [ ] Test: Create quote → approve → create order
- [ ] Test: Add to cart → update qty
- [ ] Validate: All actions work, localStorage persists
- [ ] Check: Bundle size reduced

**Expected:** ~70-80KB reduction

---

## Phase 3: Warehouse Domain Refactoring (2 hours)

### Step 3.1-3.6: Repeat for Warehouse
- [ ] Identify: materials, movements, offcuts, shipments, vehicles, crews
- [ ] Extract and wire to `warehouseSlice`
- [ ] Test: Add material → stock adjustment → shipment creation
- [ ] Test: Create vehicle → assign to shipment
- [ ] Validate: All working
- [ ] Check: Bundle size reduced

**Expected:** ~50-60KB reduction

---

## Phase 4: Production Domain Refactoring (2 hours)

### Step 4.1-4.6: Repeat for Production
- [ ] Identify: jobs, tasks, schedules, nestings
- [ ] Extract and wire to `productionSlice`
- [ ] Test: Create job → create task → update status
- [ ] Test: Create nesting → approve
- [ ] Validate: All working
- [ ] Check: Bundle size reduced

**Expected:** ~50-60KB reduction

---

## Phase 5: Catalog Domain Refactoring (1.5 hours)

### Step 5.1-5.6: Repeat for Catalog
- [ ] Identify: items, categories, assemblies, specifications
- [ ] Extract and wire to `catalogSlice`
- [ ] Test: Create item → add to assembly
- [ ] Test: Hierarchical categories work
- [ ] Validate: All working
- [ ] Check: Bundle size reduced

**Expected:** ~40-50KB reduction

---

## Phase 6: Verification & Testing (1.5 hours)

### Step 6.1: Backwards Compatibility Check
```javascript
// Verify all state properties exist
console.assert(window.sim.leads, 'leads missing');
console.assert(window.sim.quotes, 'quotes missing');
console.assert(window.sim.materials, 'materials missing');
console.assert(window.sim.jobs, 'jobs missing');
console.assert(window.sim.items, 'items missing');

// Verify all action methods exist
const requiredActions = [
  'createLead', 'updateLeadStatus', 'convertLeadToOpp',
  'createQuote', 'approveQuote', 'createOrder',
  'addMaterial', 'updateMaterialStock', 'createShipment',
  'createJob', 'createTask', 'createNesting',
  'createItem', 'createCategory', 'createAssembly'
];

requiredActions.forEach(action => {
  console.assert(typeof window.sim[action] === 'function',
    `${action} missing or not a function`);
});
```

### Step 6.2: localStorage Persistence Test
```javascript
// Test round-trip: create → save → reload → verify
const testLead = { email: 'test@example.com', company: 'Test' };
window.sim.createLead(testLead);

// Hard refresh browser
// (F5 or window.location.reload())

// Verify still there
const lead = window.sim.leads.find(l => l.email === testLead.email);
console.assert(lead, 'Lead not persisted to localStorage');
```

### Step 6.3: React Component Rendering
- [ ] Open `/trade-world/suppliers` (Supplier Catalog)
- [ ] Verify components render (no console errors)
- [ ] Verify data displays
- [ ] Test create/update flows

### Step 6.4: All Pages Test
- [ ] Supplier Catalog — loads catalog items
- [ ] Quote Request — creates quotes
- [ ] Tracking — displays order status
- [ ] (Other pages if any)

### Step 6.5: Final Bundle Size Comparison
```bash
# Before (baseline)
du -h /opt/spaceos/docs/joinerytech/app-store.jsx.backup-2026-07-02

# After refactoring
du -h /opt/spaceos/docs/joinerytech/app-store.jsx

# Expected: 488KB → 150-200KB (60-70% reduction)
```

---

## Phase 7: Documentation Update (1 hour)

- [ ] Update app-store.jsx comments (reference slices)
- [ ] Document dispatch pattern
- [ ] Add JSDoc for key functions
- [ ] Create REFACTORING_LOG.md with what was moved where

---

## Build Script Update (1 hour)

- [ ] Update build script to include stores/ folder
- [ ] Verify all .js files in stores/ are transpiled
- [ ] Check build output includes all slices
- [ ] Test build: `npm run build` or equivalent

---

## Success Metrics

### Bundle Size
| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| app-store.js | 488 KB | <200 KB | ⏳ |
| Reduction | - | 60%+ | ⏳ |

### Performance
| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| localStorage write | 200-300ms | <150ms | ⏳ |
| App load time | 5-6s | <5s | ⏳ |

### Quality
| Metric | Target | Status |
|--------|--------|--------|
| No breaking changes | ✅ | ⏳ |
| All tests pass | ✅ | ⏳ |
| localStorage format | unchanged | ⏳ |
| Backwards compatible | ✅ | ⏳ |

---

## Rollback Checklist

If critical issues occur:
- [ ] Revert to backup: `cp app-store.jsx.backup-2026-07-02 app-store.jsx`
- [ ] Identify issue in git diff
- [ ] Fix specific domain (don't redo entire refactoring)
- [ ] Re-test

---

## Timeline Estimate

| Phase | Hours | Status |
|-------|-------|--------|
| 1. CRM | 2 | ⏳ |
| 2. Sales | 2 | ⏳ |
| 3. Warehouse | 2 | ⏳ |
| 4. Production | 2 | ⏳ |
| 5. Catalog | 1.5 | ⏳ |
| 6. Verification | 1.5 | ⏳ |
| 7. Docs + Build | 2 | ⏳ |
| **TOTAL** | **14** | ⏳ |

---

## Notes

- Work incrementally: complete one domain before starting next
- Test after each domain before moving to next
- Keep backup of app-store.jsx at each stage
- Commit to git after each domain completes

---

**Ready to begin Phase 1: CRM Domain Refactoring**
