# JoineryTech Performance Optimization — Implementation Plan Phase 1

**Project:** Performance Optimization Phase 1 (Quick Wins)
**Timeline:** 2 weeks (40 hours)
**Target:** 4.2MB → <2MB (50%+ size reduction)
**Date:** 2026-07-02

---

## PHASE BREAKDOWN

### PHASE 1-A: Store Splitting (Week 1)
**Goal:** Extract monolithic 488KB app-store.jsx → modular slices
**Expected savings:** 200KB+ (40% reduction in core bundle)

#### Deliverables
- [x] Create stores/ folder structure
- [ ] Extract CRM slice (leads, opportunities)
- [ ] Extract Sales slice (quotes, orders, cart)
- [ ] Extract Warehouse slice (materials, movements, offcuts)
- [ ] Extract Production slice (jobs, tasks, schedules)
- [ ] Extract Catalog slice (items, categories, assembly)
- [ ] Refactor app-store.jsx (slice composition)
- [ ] Update build script (bundle all slices)
- [ ] Test state persistence (localStorage)
- [ ] Performance measurement (before/after)

#### Architecture Pattern

```javascript
// OLD: app-store.jsx (488KB monolith)
// window.sim = { quotes, orders, leads, warehouse, production, catalog, ... }

// NEW: app-store.jsx (core only, ~80KB)
import { crmSlice } from './stores/crm-store.js';
import { salesSlice } from './stores/sales-store.js';
import { warehouseSlice } from './stores/warehouse-store.js';
import { productionSlice } from './stores/production-store.js';
import { catalogSlice } from './stores/catalog-store.js';

// Compose slices
window.sim = {
  ...crmSlice.getState(),
  ...salesSlice.getState(),
  ...warehouseSlice.getState(),
  ...productionSlice.getState(),
  ...catalogSlice.getState(),
  // Core API methods...
};
```

#### Store Slice Template

```javascript
// stores/crm-store.js (~60KB)
export const crmSlice = {
  getState: () => ({
    leads: [],
    opportunities: [],
    crmSeq: { lead: 1, opp: 1 }
  }),

  actions: {
    createLead: (state, payload) => { /* ... */ },
    updateLead: (state, { id, updates }) => { /* ... */ },
    convertLeadToOpp: (state, leadId) => { /* ... */ },
    createOpportunity: (state, payload) => { /* ... */ },
    updateOpportunity: (state, { id, updates }) => { /* ... */ },
    updateOpportunityStatus: (state, { id, newStatus }) => { /* ... */ }
  }
};
```

---

### PHASE 1-B: Lazy Loading by World (Week 1-2)
**Goal:** Dynamically load page-*.jsx files on world selection
**Expected savings:** 1MB+ (initial bundle <1MB)

#### Deliverables
- [ ] Implement dynamic import routing
- [ ] Create loading state component
- [ ] Add preload strategy (hover/idle)
- [ ] Add error boundary (chunk load failure)
- [ ] Test all worlds (sales, crm, warehouse, production, etc.)

---

### PHASE 1-C: Image & Build Optimization (Week 2)
**Goal:** Reduce payload + minify build
**Expected savings:** 300KB+ images + 10-15% build reduction

#### C1: Image Optimization
- [ ] Convert PNG placeholders → WebP (50% reduction)
- [ ] Add lazy loading (`loading="lazy"`)
- [ ] Move base64 → CDN URLs
- [ ] Update image-slot.js

#### C2: Build Optimization
- [ ] Setup Babel minification (terser)
- [ ] Create babel.config.js
- [ ] Add build minification script
- [ ] Update HTML to use minified files

#### C3: localStorage Compression
- [ ] Add LZString dependency
- [ ] Implement compression on persist
- [ ] Implement decompression on load
- [ ] Test persistence round-trip

---

### PHASE 1-D: Measurement & Validation (Week 2 end)
**Goal:** Validate all metrics, document results

#### Deliverables
- [ ] Bundle size report (before/after breakdown)
- [ ] Lighthouse performance audit
- [ ] Initial load time measurement
- [ ] localStorage write time benchmark
- [ ] All functionality test (regression)
- [ ] DONE outbox with metrics

---

## SUCCESS CRITERIA

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| **Bundle Size** | 4.2 MB | <2 MB | ⏳ |
| **app-store.js** | 488 KB | <200 KB | ⏳ |
| **Initial Load** | 5-6s | <3s | ⏳ |
| **localStorage Write** | 200-300ms | <100ms | ⏳ |
| **Lighthouse Score** | ~45 | >75 | ⏳ |

---

## IMPLEMENTATION NOTES

### Phase 1-A Dependencies
- No external libraries needed
- Pure refactoring (no breaking changes)
- localStorage format unchanged (v63)

### Phase 1-B Dependencies
- No external libraries
- Requires testing of dynamic chunk loading
- Error handling for network failures

### Phase 1-C Dependencies
- **LZString** (compression library)
- **terser** (minification)
- **imagemin** (WebP conversion, optional)

---

## RISK MITIGATION

| Risk | Mitigation |
|------|-----------|
| State hydration fails | Fallback to seed data, test localStorage load/save round-trip |
| Lazy load fails | Error boundary + fallback UI |
| Storage quota exceeded | Compression + cleanup script |
| Breaking changes | Comprehensive regression testing |

---

## NEXT STEPS

1. **Today:** Create stores/ folder + start CRM slice extraction
2. **Tomorrow:** Complete Sales, Warehouse, Production, Catalog slices
3. **Day 3:** Refactor app-store.jsx + test composition
4. **Day 4-5:** Lazy loading implementation
5. **Day 6-7:** Image/build optimization
6. **Day 8:** Final validation + metrics + DONE outbox

---

## MEASUREMENT TOOLS

```bash
# Bundle size analysis
du -sh /opt/spaceos/docs/joinerytech/build/
du -h /opt/spaceos/docs/joinerytech/build/*.js | sort -hr

# Lighthouse
lighthouse https://joinerytech.local --output=json

# Chrome DevTools
Performance → Record → Analyze
```

---

**Status:** IN_PROGRESS (Phase 1-A started)
**Last Updated:** 2026-07-02 09:00
