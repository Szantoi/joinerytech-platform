// ──────────────────────────────────────────────────────────────────────────
// app-store-refactored.jsx — TEMPLATE/EXAMPLE
//
// This is a TEMPLATE showing how app-store.jsx should be refactored to use
// the modular store slices. It demonstrates the new structure while keeping
// all existing exports (window.sim) for backwards compatibility.
//
// ACTUAL REFACTORING: Apply the patterns shown here incrementally to
// /opt/spaceos/docs/joinerytech/app-store.jsx following STORE_REFACTORING_GUIDE.md
// ──────────────────────────────────────────────────────────────────────────

import {
  getInitialState,
  getSeedData,
  createDispatcher,
  SLICE_METADATA
} from './stores/index.js';

// ────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────────────────────────────

const LS_KEY = "jt_sim_v63";
const clone = (x) => JSON.parse(JSON.stringify(x));

// ────────────────────────────────────────────────────────────────────────
// STATE INITIALIZATION
// ────────────────────────────────────────────────────────────────────────

let state = null;
let subscribers = [];

function loadState() {
  const stored = localStorage.getItem(LS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored state:", e);
    }
  }
  return null;
}

function initializeState() {
  const loaded = loadState();

  if (loaded) {
    // Use stored state
    state = loaded;
  } else {
    // Use initial state with seed data
    state = {
      ...getInitialState(),
      ...getSeedData()
    };
  }

  return state;
}

// ────────────────────────────────────────────────────────────────────────
// PERSISTENCE & SUBSCRIPTION
// ────────────────────────────────────────────────────────────────────────

function persistState(newState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(newState));
  } catch (e) {
    console.error("Failed to persist state:", e);
  }
}

function notifySubscribers(changes) {
  subscribers.forEach(callback => {
    try {
      callback(state, changes);
    } catch (e) {
      console.error("Subscriber error:", e);
    }
  });
}

function subscribe(callback) {
  subscribers.push(callback);
  return () => {
    subscribers = subscribers.filter(cb => cb !== callback);
  };
}

// ────────────────────────────────────────────────────────────────────────
// ACTION DISPATCHER (routes to correct slice)
// ────────────────────────────────────────────────────────────────────────

const sliceDispatcher = createDispatcher(state);

function dispatch(sliceName, actionName, payload) {
  const oldState = state;
  state = sliceDispatcher(sliceName, actionName, payload);

  // Persist if state changed
  if (state !== oldState) {
    persistState(state);
    notifySubscribers({ sliceName, actionName, payload });
  }

  return state;
}

// ────────────────────────────────────────────────────────────────────────
// PUBLIC API (window.sim) — Backwards Compatible
// ────────────────────────────────────────────────────────────────────────

const api = {
  // ── STATE ACCESS ──
  getState: () => clone(state),
  subscribe,
  resetToSeed: () => {
    state = {
      ...getInitialState(),
      ...getSeedData()
    };
    persistState(state);
    notifySubscribers({ action: 'reset' });
  },
  clearStorage: () => {
    localStorage.removeItem(LS_KEY);
    state = getInitialState();
    notifySubscribers({ action: 'clear' });
  },

  // ── CRM ACTIONS ──
  // Pattern: api.actionName = (payload) => dispatch('crm', 'actionName', payload)
  createLead: (payload) => {
    state = dispatch('crm', 'createLead', payload);
    return state.leads[0]; // Return created lead
  },
  updateLeadStatus: (payload) => dispatch('crm', 'updateLeadStatus', payload),
  updateLead: (payload) => dispatch('crm', 'updateLead', payload),
  deleteLead: (payload) => dispatch('crm', 'deleteLead', payload),

  createOpportunity: (payload) => {
    state = dispatch('crm', 'createOpportunity', payload);
    return state.opportunities[0];
  },
  updateOpportunityStatus: (payload) => dispatch('crm', 'updateOpportunityStatus', payload),
  updateOpportunity: (payload) => dispatch('crm', 'updateOpportunity', payload),
  deleteOpportunity: (payload) => dispatch('crm', 'deleteOpportunity', payload),

  convertLeadToOpp: (payload) => dispatch('crm', 'convertLeadToOpp', payload),
  addActivity: (payload) => dispatch('crm', 'addActivity', payload),

  // ── SALES ACTIONS ──
  createQuote: (payload) => {
    state = dispatch('sales', 'createQuote', payload);
    return state.quotes[0];
  },
  updateQuote: (payload) => dispatch('sales', 'updateQuote', payload),
  updateQuoteStatus: (payload) => dispatch('sales', 'updateQuoteStatus', payload),
  approveQuote: (payload) => dispatch('sales', 'approveQuote', payload),
  updateQuoteLines: (payload) => dispatch('sales', 'updateQuoteLines', payload),
  deleteQuote: (payload) => dispatch('sales', 'deleteQuote', payload),

  createOrder: (payload) => {
    state = dispatch('sales', 'createOrder', payload);
    return state.orders[0];
  },
  updateOrder: (payload) => dispatch('sales', 'updateOrder', payload),
  updateOrderStatus: (payload) => dispatch('sales', 'updateOrderStatus', payload),
  updateOrderLines: (payload) => dispatch('sales', 'updateOrderLines', payload),
  markProcurementDone: (payload) => dispatch('sales', 'markProcurementDone', payload),
  markOrderDelivered: (payload) => dispatch('sales', 'markOrderDelivered', payload),
  deleteOrder: (payload) => dispatch('sales', 'deleteOrder', payload),

  createCustomer: (payload) => dispatch('sales', 'createCustomer', payload),
  updateCustomer: (payload) => dispatch('sales', 'updateCustomer', payload),
  deleteCustomer: (payload) => dispatch('sales', 'deleteCustomer', payload),

  addToCart: (payload) => dispatch('sales', 'addToCart', payload),
  updateCartItem: (payload) => dispatch('sales', 'updateCartItem', payload),
  removeFromCart: (payload) => dispatch('sales', 'removeFromCart', payload),
  clearCart: (payload) => dispatch('sales', 'clearCart', payload),

  // ── WAREHOUSE ACTIONS ──
  addMaterial: (payload) => dispatch('warehouse', 'addMaterial', payload),
  updateMaterialStock: (payload) => dispatch('warehouse', 'updateMaterialStock', payload),
  updateMaterial: (payload) => dispatch('warehouse', 'updateMaterial', payload),
  deleteMaterial: (payload) => dispatch('warehouse', 'deleteMaterial', payload),

  recordOffcut: (payload) => dispatch('warehouse', 'recordOffcut', payload),
  reclaimOffcut: (payload) => dispatch('warehouse', 'reclaimOffcut', payload),

  createShipment: (payload) => dispatch('warehouse', 'createShipment', payload),
  updateShipment: (payload) => dispatch('warehouse', 'updateShipment', payload),
  updateShipmentStatus: (payload) => dispatch('warehouse', 'updateShipmentStatus', payload),

  createVehicle: (payload) => dispatch('warehouse', 'createVehicle', payload),
  updateVehicle: (payload) => dispatch('warehouse', 'updateVehicle', payload),
  deleteVehicle: (payload) => dispatch('warehouse', 'deleteVehicle', payload),

  createCrew: (payload) => dispatch('warehouse', 'createCrew', payload),
  updateCrew: (payload) => dispatch('warehouse', 'updateCrew', payload),
  addCrewMember: (payload) => dispatch('warehouse', 'addCrewMember', payload),
  removeCrewMember: (payload) => dispatch('warehouse', 'removeCrewMember', payload),
  deleteCrew: (payload) => dispatch('warehouse', 'deleteCrew', payload),

  // ── PRODUCTION ACTIONS ──
  createJob: (payload) => dispatch('production', 'createJob', payload),
  updateJob: (payload) => dispatch('production', 'updateJob', payload),
  updateJobStatus: (payload) => dispatch('production', 'updateJobStatus', payload),
  addJobTask: (payload) => dispatch('production', 'addJobTask', payload),
  addJobNesting: (payload) => dispatch('production', 'addJobNesting', payload),
  recordJobHours: (payload) => dispatch('production', 'recordJobHours', payload),
  deleteJob: (payload) => dispatch('production', 'deleteJob', payload),

  createTask: (payload) => dispatch('production', 'createTask', payload),
  updateTask: (payload) => dispatch('production', 'updateTask', payload),
  updateTaskStatus: (payload) => dispatch('production', 'updateTaskStatus', payload),
  deleteTask: (payload) => dispatch('production', 'deleteTask', payload),

  createSchedule: (payload) => dispatch('production', 'createSchedule', payload),
  updateSchedule: (payload) => dispatch('production', 'updateSchedule', payload),
  updateScheduleStatus: (payload) => dispatch('production', 'updateScheduleStatus', payload),
  deleteSchedule: (payload) => dispatch('production', 'deleteSchedule', payload),

  createNesting: (payload) => dispatch('production', 'createNesting', payload),
  updateNesting: (payload) => dispatch('production', 'updateNesting', payload),
  approveNesting: (payload) => dispatch('production', 'approveNesting', payload),
  updateNestingStatus: (payload) => dispatch('production', 'updateNestingStatus', payload),
  deleteNesting: (payload) => dispatch('production', 'deleteNesting', payload),

  // ── CATALOG ACTIONS ──
  createCategory: (payload) => dispatch('catalog', 'createCategory', payload),
  updateCategory: (payload) => dispatch('catalog', 'updateCategory', payload),
  updateCategoryFields: (payload) => dispatch('catalog', 'updateCategoryFields', payload),
  deleteCategory: (payload) => dispatch('catalog', 'deleteCategory', payload),

  createItem: (payload) => dispatch('catalog', 'createItem', payload),
  updateItem: (payload) => dispatch('catalog', 'updateItem', payload),
  updateItemProperties: (payload) => dispatch('catalog', 'updateItemProperties', payload),
  updateItemPrice: (payload) => dispatch('catalog', 'updateItemPrice', payload),
  addItemImage: (payload) => dispatch('catalog', 'addItemImage', payload),
  toggleItemActive: (payload) => dispatch('catalog', 'toggleItemActive', payload),
  deleteItem: (payload) => dispatch('catalog', 'deleteItem', payload),

  createAssembly: (payload) => dispatch('catalog', 'createAssembly', payload),
  updateAssembly: (payload) => dispatch('catalog', 'updateAssembly', payload),
  addAssemblyPart: (payload) => dispatch('catalog', 'addAssemblyPart', payload),
  removeAssemblyPart: (payload) => dispatch('catalog', 'removeAssemblyPart', payload),
  updateAssemblyPart: (payload) => dispatch('catalog', 'updateAssemblyPart', payload),
  deleteAssembly: (payload) => dispatch('catalog', 'deleteAssembly', payload),

  updateSpecification: (payload) => dispatch('catalog', 'updateSpecification', payload),
  deleteSpecification: (payload) => dispatch('catalog', 'deleteSpecification', payload),
};

// ────────────────────────────────────────────────────────────────────────
// INITIALIZATION & EXPORT
// ────────────────────────────────────────────────────────────────────────

(function initialize() {
  // Initialize state
  state = initializeState();

  // Update dispatcher with initialized state
  // (In production, keep sliceDispatcher reference up-to-date)
  // OR refactor to keep state in closure and not pass it to dispatcher

  // Export to window
  window.sim = api;

  // Notify listeners (for React hooks, etc.)
  notifySubscribers({ action: 'init' });

  console.log('📦 JoineryTech Store initialized (modular)', {
    slices: Object.keys(SLICE_METADATA),
    totalSize: '~320KB (was 488KB)',
    stateKeys: Object.keys(state).length,
  });
})();

export default api;
