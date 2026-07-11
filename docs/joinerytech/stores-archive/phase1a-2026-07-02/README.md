# Store Slices Architecture

**Purpose:** Modular state management for JoineryTech Portal
**Pattern:** Redux-like slices with immutable updates
**Composition:** Each slice is independently versioned, built, and can be lazy-loaded

---

## Folder Structure

```
stores/
├── README.md (this file)
├── crm-store.js         (60KB) — Leads + Opportunities
├── sales-store.js       (80KB) — Quotes + Orders + Cart
├── warehouse-store.js   (70KB) — Materials + Movements + Offcuts
├── production-store.js  (60KB) — Jobs + Tasks + Schedules + Nesting
├── catalog-store.js     (50KB) — Items + Categories + Assembly
├── hr-store.js          (40KB) — Employees + Absences + Assignments
├── finance-store.js     (50KB) — Invoices + Controlling + Transactions
└── index.js             (20KB) — Main composition + shared actions
```

---

## Store Slice Interface

Every store slice exports a consistent interface:

```javascript
export const sliceName = {
  // Get initial state for this slice
  getState: () => ({
    // domain-specific state
  }),

  // List of all reducers (pure functions)
  actions: {
    actionName: (state, payload) => { /* return new state */ }
  },

  // Seed/demo data (optional)
  seedData: { /* ... */ }
};
```

---

## Example: CRM Slice

```javascript
// stores/crm-store.js

export const crmSlice = {
  getState: () => ({
    leads: [],
    opportunities: [],
    activities: [],
    crmSeq: { lead: 1, opp: 1, activity: 1 }
  }),

  actions: {
    createLead: (state, { id, email, company, assignedToUserId }) => {
      return {
        ...state,
        leads: [
          { id, email, company, status: "New", assignedToUserId, createdAt: new Date() },
          ...state.leads
        ],
        crmSeq: { ...state.crmSeq, lead: state.crmSeq.lead + 1 }
      };
    },

    updateLeadStatus: (state, { id, newStatus }) => {
      return {
        ...state,
        leads: state.leads.map(lead =>
          lead.id === id ? { ...lead, status: newStatus } : lead
        )
      };
    },

    convertLeadToOpp: (state, leadId) => {
      const lead = state.leads.find(l => l.id === leadId);
      if (!lead) return state;
      return {
        ...state,
        opportunities: [
          {
            id: `OPP-${state.crmSeq.opp}`,
            leadId,
            customerId: lead.customerId,
            status: "Open",
            // ...
          },
          ...state.opportunities
        ],
        crmSeq: { ...state.crmSeq, opp: state.crmSeq.opp + 1 }
      };
    }
  }
};
```

---

## Usage in app-store.jsx

```javascript
// app-store.jsx

import { crmSlice } from './stores/crm-store.js';
import { salesSlice } from './stores/sales-store.js';
import { warehouseSlice } from './stores/warehouse-store.js';
// ... etc

// Initialize composed state
let state = {
  ...crmSlice.getState(),
  ...salesSlice.getState(),
  ...warehouseSlice.getState(),
  // ... other slices
};

// Dispatch to correct slice
function dispatchAction(sliceName, actionName, payload) {
  const slice = SLICES[sliceName];
  if (slice && slice.actions[actionName]) {
    return slice.actions[actionName](state[sliceName], payload);
  }
}
```

---

## Build & Loading

### Static Build (Phase 1-A)
All slices are built and bundled together. Entry point: `app-store.jsx`

```bash
# build script
babel stores/*.js -d build/
babel app-store.jsx -o build/app-store.js
```

### Lazy Loading (Phase 1-B)
Slices can be dynamically imported as needed:

```javascript
// Dynamic import (webpack code-splitting)
const crmModule = await import('./stores/crm-store.js');
```

---

## Testing

Each slice should be independently testable:

```javascript
// test/crm-store.test.js
import { crmSlice } from '../stores/crm-store.js';

describe('CRM Slice', () => {
  let state;
  beforeEach(() => {
    state = crmSlice.getState();
  });

  test('createLead adds lead to state', () => {
    const newState = crmSlice.actions.createLead(state, {
      id: 'LEAD-1',
      email: 'test@example.com',
      company: 'Acme Corp'
    });
    expect(newState.leads).toHaveLength(1);
    expect(newState.leads[0].email).toBe('test@example.com');
  });
});
```

---

## Size Breakdown Target

| Slice | File Size | %  of Total |
|-------|-----------|------------|
| crm-store.js | 60KB | 16% |
| sales-store.js | 80KB | 21% |
| warehouse-store.js | 70KB | 19% |
| production-store.js | 60KB | 16% |
| catalog-store.js | 50KB | 13% |
| other slices | 40KB | 10% |
| app-store.js (core) | 30KB | 8% |
| **TOTAL** | **~390KB** | **100%** |

**vs. Current:** 488KB monolith → 390KB modular = **20% reduction** (Phase 1-A)

---

## Next: Phase 1-B (Lazy Loading)

Once slices are split, they can be lazy-loaded by world:

```javascript
// App.jsx
const worldModules = {
  crm: () => import('./stores/crm-store.js'),
  sales: () => import('./stores/sales-store.js'),
  // ...
};

async function switchWorld(worldId) {
  const module = await worldModules[worldId]();
  const slice = module[`${worldId}Slice`];
  // Load and initialize slice...
}
```

---

**Status:** In development
**Version:** 1.0
**Last Updated:** 2026-07-02
