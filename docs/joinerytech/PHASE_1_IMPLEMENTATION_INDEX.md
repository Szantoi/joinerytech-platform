# Phase 1 Implementation Index — Complete Roadmap

**Task:** MSG-FRONTEND-092 — JoineryTech Performance Optimization Phase 1
**Status:** Architecture ✅ Complete | Implementation ⏳ In Progress
**Timeline:** 2 weeks (40 hours estimated)
**Target:** 4.2 MB → <2 MB (50%+ reduction)

---

## Quick Navigation

### 📍 Where to Start

1. **Understand the Strategy:** Read `ZUSTAND_INTEGRATION_STRATEGY.md` (12 min read)
2. **Review Checklist:** Open `PHASE_1A_REFACTORING_CHECKLIST.md` (reference while working)
3. **Study Code:** Look at `stores/crm-store.js` as reference (5 min)
4. **Understand Adapter:** Review `stores/zustand-adapter.js` (5 min)

### 📚 Complete Documentation Suite

| Document | Size | Purpose | Read Time |
|----------|------|---------|-----------|
| **ZUSTAND_INTEGRATION_STRATEGY.md** | 12K | Smart refactoring approach | 12 min |
| **PHASE_1A_REFACTORING_CHECKLIST.md** | 10K | Step-by-step implementation guide | Reference |
| **stores/README.md** | 3.1K | Store architecture overview | 5 min |
| **PHASE_1A_COMPLETION_SUMMARY.md** | 12K | Architecture & metrics | 10 min |
| **app-store-refactored-TEMPLATE.jsx** | 9.2K | Reference implementation | Reference |
| **SESSION_SUMMARY_2026-07-02.md** | 12K | Work completed this session | 10 min |

### 🎯 All Store Slices

| Slice | File | Size | Actions | Purpose |
|-------|------|------|---------|---------|
| **CRM** | crm-store.js | 8.1K | 8 | Leads, Opportunities, Activities |
| **Sales** | sales-store.js | 12K | 17 | Quotes, Orders, Customers, Cart |
| **Warehouse** | warehouse-store.js | 12K | 17 | Materials, Shipments, Vehicles, Crews |
| **Production** | production-store.js | 14K | 17 | Jobs, Tasks, Schedules, Nesting |
| **Catalog** | catalog-store.js | 15K | 15 | Items, Categories, Assemblies |
| **Adapter** | zustand-adapter.js | 5K | N/A | Zustand integration bridge |
| **Composition** | index.js | 4.4K | N/A | Slice composition system |

---

## Phase 1-A: Store Splitting Implementation

### Current Status
```
✅ Architecture Complete (5 slices + adapter + docs)
⏳ Integration Pending (wire slices into app-store.jsx)
⏳ Testing Pending (verify all 5 domains work)
⏳ Measurement Pending (bundle size + performance)
```

### Step 1: Integration (~2 hours)

**File:** `/opt/spaceos/docs/joinerytech/app-store.jsx`

**Changes Required:**

```javascript
// ADD at top of file (after create/zustand import)
import { getInitialState, getSeedData } from './stores/index.js';
import { createAllActions } from './stores/zustand-adapter.js';

// MODIFY Zustand store creation
const api = create((set, get) => ({
  // Initialize state from slices
  ...getInitialState(),
  ...getSeedData(),

  // REPLACE 415 inline action definitions with:
  ...createAllActions(),

  // Keep existing app-specific code:
  // - logging, analytics, side effects
  // - routing logic
  // - custom business logic
}));
```

**Verification:**
```javascript
// After integration, test:
console.log(Object.keys(window.sim).length); // Should include all domains
console.assert(typeof window.sim.createLead === 'function');
console.assert(typeof window.sim.createQuote === 'function');
```

### Step 2: Remove Redundant Code (~4 hours)

**Identify lines to remove:**
- ❌ All `createLead`, `updateLeadStatus`, etc. (CRM ~60 lines)
- ❌ All quote/order actions (Sales ~150 lines)
- ❌ All material/shipment actions (Warehouse ~140 lines)
- ❌ All job/task actions (Production ~120 lines)
- ❌ All item/category actions (Catalog ~100 lines)

**Total:** ~570 lines of duplicated logic to delete

**How to find:**
```bash
grep -n "createLead:\|createQuote:\|addMaterial:" /opt/spaceos/docs/joinerytech/app-store.jsx
```

### Step 3: Test & Validate (~4 hours)

**Test Each Domain:**

```javascript
// CRM
window.sim.createLead({ email: 'test@ex.com', company: 'Test' });
window.sim.updateLeadStatus({ id: 'LEAD-1', newStatus: 'Contacted' });
window.sim.convertLeadToOpp({ leadId: 'LEAD-1', customerId: 'CUST-1', title: 'Test' });

// Sales
window.sim.createQuote({ customer: 'Test', value: 50000 });
window.sim.approveQuote({ id: 'Q-1' });
window.sim.createOrder({ customer: 'Test', total: 50000 });

// Warehouse
window.sim.addMaterial({ code: 'MAT-100', name: 'Wood', onHand: 500 });
window.sim.updateMaterialStock({ code: 'MAT-100', qty: 100, type: 'out' });

// Production
window.sim.createJob({ orderId: 'JT-1', type: 'cabinet' });
window.sim.createTask({ jobId: 'JOB-1', name: 'Cutting', type: 'cutting' });

// Catalog
window.sim.createItem({ sku: 'ITEM-1', name: 'Door', categoryId: 'CAT-1' });
window.sim.createAssembly({ name: 'Cabinet Kit', parts: [] });
```

**Check localStorage:**
```javascript
const stored = localStorage.getItem('jt_sim_v63');
console.assert(stored !== null, 'Data must persist to localStorage');
// Hard refresh browser, verify data still there
```

**Verify Browser Pages:**
- [ ] Open trade-world/suppliers — loads catalog items
- [ ] Open public/cutting/quote-request — create quote works
- [ ] Check console — no errors

---

## Phase 1-B: Lazy Loading by World

### Goal
Reduce initial bundle 4.2 MB → 800KB-1MB by loading page-*.jsx on demand

### Implementation

**File:** `App.jsx` or routing component

```javascript
// Define world loaders
const worldModules = {
  sales: () => import('./pages/page-sales.jsx'),
  crm: () => import('./pages/page-crm.jsx'),
  warehouse: () => import('./pages/page-warehouse.jsx'),
  production: () => import('./pages/page-production.jsx'),
  catalog: () => import('./pages/page-catalog.jsx'),
};

// On world selection
async function switchWorld(worldId) {
  const module = await worldModules[worldId]();
  return module.default;
}
```

### Success Criteria
- [ ] Initial load <1 MB (vs 4.2 MB before)
- [ ] Page-specific chunks load on demand
- [ ] No errors in network tab
- [ ] Performance improved (Lighthouse >75)

---

## Phase 1-C: Image & Build Optimization

### C1: Image Optimization
**Target:** 300KB+ savings

- PNG → WebP conversion (50% reduction)
- Add `loading="lazy"` attributes
- Move base64 → CDN URLs in image-slot.js

### C2: Build Optimization
**Target:** 10-15% reduction

- Setup Babel minification
- Add terser to build script
- Compress CSS/JS output

### C3: localStorage Compression
**Target:** 330KB → 100KB

```javascript
import LZString from 'lz-string';

function persistState(state) {
  const compressed = LZString.compress(JSON.stringify(state));
  localStorage.setItem('jt_sim_v63', compressed);
}

function loadState() {
  const compressed = localStorage.getItem('jt_sim_v63');
  if (!compressed) return null;
  return JSON.parse(LZString.decompress(compressed));
}
```

---

## Phase 1-D: Measurement & Validation

### Metrics to Capture

**Before (Baseline)**
```bash
du -h /opt/spaceos/docs/joinerytech/build/
du -h /opt/spaceos/docs/joinerytech/app-store.jsx
# Check localStorage size
```

**After Each Phase**
```bash
# Bundle size
du -h app-store.jsx                  # Should: 488KB → 150KB
du -sh /opt/spaceos/docs/joinerytech/build/

# Initial load time (4G throttle in DevTools)
# Expected: 5-6s → <3s

# localStorage write time
console.time('persist');
window.sim.createLead({...});
console.timeEnd('persist');
# Expected: 200-300ms → <100ms
```

**Lighthouse Audit**
```bash
lighthouse https://your-site.local --output=json
# Target: Score >75 (Performance)
```

---

## Success Checklist

### ✅ Phase 1-A (Store Splitting)
- [ ] Zustand adapter integrated into app-store.jsx
- [ ] All 74 slice actions callable via window.sim
- [ ] CRM domain tested (create, update, convert)
- [ ] Sales domain tested (quote, order, cart)
- [ ] Warehouse domain tested (material, shipment)
- [ ] Production domain tested (job, task, nesting)
- [ ] Catalog domain tested (item, category, assembly)
- [ ] localStorage persistence verified (reload page, data exists)
- [ ] No console errors
- [ ] Bundle size reduced 18% (488KB → 400KB)

### ⏳ Phase 1-B (Lazy Loading)
- [ ] Dynamic import routing implemented
- [ ] Loading state component created
- [ ] All world pages load on demand
- [ ] Initial bundle <1 MB (vs 4.2 MB)
- [ ] No errors loading chunks

### ⏳ Phase 1-C (Image & Build)
- [ ] PNG → WebP conversion complete
- [ ] Image lazy loading implemented
- [ ] Minification setup complete
- [ ] localStorage compression working
- [ ] Build size reduced 20%+

### ⏳ Phase 1-D (Validation)
- [ ] Before/after metrics documented
- [ ] Lighthouse audit score >75
- [ ] All pages tested (no regression)
- [ ] DONE outbox created with metrics

---

## Key Files Reference

### 🎯 Start Here
- `ZUSTAND_INTEGRATION_STRATEGY.md` — Why this approach is best
- `PHASE_1A_REFACTORING_CHECKLIST.md` — What to do next

### 📖 Learn
- `stores/README.md` — Architecture overview
- `stores/crm-store.js` — Example slice
- `stores/zustand-adapter.js` — Integration mechanism

### 🔧 Implement
- `PHASE_1A_REFACTORING_CHECKLIST.md` — Step-by-step guide
- `app-store-refactored-TEMPLATE.jsx` — Reference code

### 📊 Track Progress
- `SESSION_SUMMARY_2026-07-02.md` — What's been done
- `PHASE_1A_COMPLETION_SUMMARY.md` — Architecture details

---

## Timeline Breakdown

| Phase | Hours | Next Steps |
|-------|-------|-----------|
| 1-A Integration | 2 | Import slices + adapter |
| 1-A Removal | 4 | Delete inline action code |
| 1-A Testing | 4 | Test all 5 domains |
| **1-A Total** | **10** | ✅ Ready to start |
| 1-B Lazy Loading | 8 | Dynamic imports |
| 1-C Optimization | 10 | Images, build, compression |
| 1-D Validation | 8 | Metrics, testing, DONE |
| **Total** | **36** | (vs 40 estimate) |

---

## Getting Help

### Troubleshooting
- **Issue:** Actions not found in window.sim
  - **Solution:** Verify `createAllActions()` is called in Zustand store
  - **Debug:** Check console: `console.log(Object.keys(window.sim))`

- **Issue:** localStorage not persisting
  - **Solution:** Verify `getSeedData()` is called during initialization
  - **Test:** Create object → hard refresh → verify exists

- **Issue:** Slice reducer errors
  - **Solution:** Check adapter validation: `validateSliceCompatibility()`
  - **Debug:** Console shows detailed error messages

### References
- **Zustand Docs:** https://github.com/pmndrs/zustand
- **Redux Reducers:** https://redux.js.org/basics/reducers
- **Bundle Analysis:** Use webpack-bundle-analyzer or import-cost

---

## Approval & Sign-Off

**Ready to Proceed?**

✅ Architecture validated
✅ Code complete
✅ Documentation comprehensive
✅ Integration plan clear
✅ Testing strategy defined

**Status:** Ready for Phase 1-A integration implementation

**Next Action:** Follow PHASE_1A_REFACTORING_CHECKLIST.md starting with Step 1

---

*Last Updated: 2026-07-02*
*Task: MSG-FRONTEND-092*
*Status: Architecture Complete, Implementation Ready*
