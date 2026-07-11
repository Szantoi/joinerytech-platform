// ──────────────────────────────────────────────────────────────────────────
// stores-bundle.js — Browser-compatible store slices + observable adapter
//
// This bundle exposes window.StoreAdapter with createAllActions() function
// for integration with app-store.jsx custom observable pattern.
//
// Load this BEFORE app-store.jsx in HTML:
//   <script src="stores-bundle.js"></script>
//   <script type="text/babel" src="app-store.jsx"></script>
// ──────────────────────────────────────────────────────────────────────────

(function() {
  'use strict';

  // ── CRM Store Slice ────────────────────────────────────────────────────────
  const crmSlice = {
    getState: () => ({
      leads: [],
      opportunities: [],
      activities: [],
      crmSeq: { lead: 1, opp: 1, activity: 1 }
    }),

    actions: {
      createLead: (state, payload) => {
        const newLead = {
          id: payload.id || `LEAD-${state.crmSeq.lead}`,
          email: payload.email,
          company: payload.company,
          status: "New",
          source: payload.source || "manual",
          assignedToUserId: payload.assignedToUserId,
          createdAt: payload.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: payload.notes || "",
          tags: payload.tags || [],
          activities: []
        };
        return {
          ...state,
          leads: [newLead, ...state.leads],
          crmSeq: { ...state.crmSeq, lead: state.crmSeq.lead + 1 }
        };
      },

      updateLeadStatus: (state, payload) => {
        return {
          ...state,
          leads: state.leads.map(lead =>
            lead.id === payload.id
              ? { ...lead, status: payload.newStatus, updatedAt: new Date().toISOString() }
              : lead
          )
        };
      },

      // Note: Reduced to 2 actions for PoC - full implementation will add remaining 6
    }
  };

  // ── Sales Store Slice ──────────────────────────────────────────────────────
  const salesSlice = {
    getState: () => ({
      quotes: [],
      orders: [],
      customers: [],
      cart: { items: [], total: 0 },
      salesSeq: { quote: 1, order: 1, customer: 1 }
    }),

    actions: {
      addToCart: (state, payload) => {
        const existingItem = state.cart.items.find(item => item.id === payload.id);
        let newItems;
        if (existingItem) {
          newItems = state.cart.items.map(item =>
            item.id === payload.id
              ? { ...item, qty: item.qty + (payload.qty || 1) }
              : item
          );
        } else {
          newItems = [...state.cart.items, { ...payload, qty: payload.qty || 1 }];
        }
        const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
        return {
          ...state,
          cart: { items: newItems, total: newTotal }
        };
      },

      // Note: Reduced for PoC - full implementation has 17 actions
    }
  };

  // ── Warehouse Store Slice ──────────────────────────────────────────────────
  const warehouseSlice = {
    getState: () => ({
      materials: [],
      stockMovements: [],
      shipments: [],
      vehicles: [],
      crews: [],
      warehouseSeq: { material: 1, movement: 1, shipment: 1 }
    }),

    actions: {
      recordStockMovement: (state, payload) => {
        const movement = {
          id: payload.id || `MOV-${state.warehouseSeq.movement}`,
          materialId: payload.materialId,
          type: payload.type, // "in" | "out"
          qty: payload.qty,
          prevQty: payload.prevQty,
          newQty: payload.newQty,
          reason: payload.reason,
          createdAt: new Date().toISOString()
        };
        return {
          ...state,
          stockMovements: [movement, ...state.stockMovements],
          warehouseSeq: { ...state.warehouseSeq, movement: state.warehouseSeq.movement + 1 }
        };
      },

      // Note: Reduced for PoC
    }
  };

  // ── Production Store Slice ─────────────────────────────────────────────────
  const productionSlice = {
    getState: () => ({
      jobs: [],
      tasks: [],
      schedules: [],
      nestingPlans: [],
      productionSeq: { job: 1, task: 1, schedule: 1, nesting: 1 }
    }),

    actions: {
      createJob: (state, payload) => {
        const newJob = {
          id: payload.id || `JOB-${state.productionSeq.job}`,
          orderId: payload.orderId,
          status: "pending", // pending | in-progress | completed | blocked
          priority: payload.priority || "medium",
          startDate: payload.startDate,
          dueDate: payload.dueDate,
          assignedTo: payload.assignedTo,
          tasks: [],
          createdAt: new Date().toISOString()
        };
        return {
          ...state,
          jobs: [newJob, ...state.jobs],
          productionSeq: { ...state.productionSeq, job: state.productionSeq.job + 1 }
        };
      },

      // Note: Reduced for PoC
    }
  };

  // ── Catalog Store Slice ────────────────────────────────────────────────────
  const catalogSlice = {
    getState: () => ({
      items: [],
      categories: [],
      assemblies: [],
      specifications: [],
      catalogSeq: { item: 1, category: 1, assembly: 1, spec: 1 }
    }),

    actions: {
      addCatalogItem: (state, payload) => {
        const newItem = {
          id: payload.id || `ITEM-${state.catalogSeq.item}`,
          code: payload.code,
          name: payload.name,
          categoryId: payload.categoryId,
          unit: payload.unit || "pc",
          price: payload.price || 0,
          active: payload.active !== false,
          tags: payload.tags || [],
          createdAt: new Date().toISOString()
        };
        return {
          ...state,
          items: [newItem, ...state.items],
          catalogSeq: { ...state.catalogSeq, item: state.catalogSeq.item + 1 }
        };
      },

      // Note: Reduced for PoC
    }
  };

  // ── Observable Adapter ─────────────────────────────────────────────────────
  const SLICES = {
    crm: crmSlice,
    sales: salesSlice,
    warehouse: warehouseSlice,
    production: productionSlice,
    catalog: catalogSlice
  };

  /**
   * Create observable actions from all slice reducers
   * Compatible with app-store.jsx custom observable pattern
   *
   * @param {Function} set - The observable set function from app-store.jsx
   * @returns {Object} Object of action methods compatible with api
   */
  function createAllActions(set) {
    const actions = {};
    let actionCount = 0;

    // Iterate each slice
    Object.entries(SLICES).forEach(([sliceName, slice]) => {
      // Iterate each action in the slice
      Object.entries(slice.actions).forEach(([actionName, reducer]) => {
        // Create observable action that wraps the slice reducer
        actions[actionName] = (payload) => {
          try {
            // Use set() with a reducer function
            set((currentState) => {
              // Call the slice reducer
              const updates = reducer(currentState, payload);
              return updates;
            });
            actionCount++;
          } catch (error) {
            console.error(`Error in ${sliceName}.${actionName}:`, error);
            throw error;
          }
        };
      });
    });

    console.log(`✓ Observable adapter: ${actionCount} actions ready (${Object.keys(actions).length} unique)`);
    return actions;
  }

  /**
   * Get initial state from all slices combined
   */
  function getCombinedInitialState() {
    const combined = {};
    Object.values(SLICES).forEach(slice => {
      Object.assign(combined, slice.getState());
    });
    return combined;
  }

  // ── Expose to window scope ─────────────────────────────────────────────────
  window.StoreAdapter = {
    createAllActions: createAllActions,
    getCombinedInitialState: getCombinedInitialState,
    slices: SLICES, // For debugging/introspection
    version: '1.0.0-poc'
  };

  console.log('✓ StoreAdapter loaded:', Object.keys(SLICES).length, 'slices');
})();
