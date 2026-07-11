// ──────────────────────────────────────────────────────────────────────────
// stores/index.js — Main store composition
//
// Composes all slices (CRM, Sales, Warehouse, Production, Catalog) into a
// unified application state. Entry point for app-store.jsx.
//
// Pattern:
//   1. Import slice getState() to initialize state
//   2. Import slice actions for dispatching
//   3. Provide dispatchers that route to correct slice
// ──────────────────────────────────────────────────────────────────────────

import { crmSlice } from './crm-store.js';
import { salesSlice } from './sales-store.js';
import { warehouseSlice } from './warehouse-store.js';
import { productionSlice } from './production-store.js';
import { catalogSlice } from './catalog-store.js';

/**
 * Initialize composed state from all slices
 */
export function getInitialState() {
  return {
    // CRM domain
    ...crmSlice.getState(),
    // Sales domain
    ...salesSlice.getState(),
    // Warehouse domain
    ...warehouseSlice.getState(),
    // Production domain
    ...productionSlice.getState(),
    // Catalog domain
    ...catalogSlice.getState(),
  };
}

/**
 * Get seed/demo data from all slices
 */
export function getSeedData() {
  return {
    // CRM domain
    ...crmSlice.seedData,
    // Sales domain
    ...salesSlice.seedData,
    // Warehouse domain
    ...warehouseSlice.seedData,
    // Production domain
    ...productionSlice.seedData,
    // Catalog domain
    ...catalogSlice.seedData,
  };
}

/**
 * Dispatch action to appropriate slice based on action name
 *
 * Usage:
 *   dispatch('crm', 'createLead', { email, company, ... })
 *   dispatch('sales', 'createQuote', { customer, value, ... })
 *   dispatch('warehouse', 'addMaterial', { code, name, ... })
 *   dispatch('production', 'createJob', { orderId, type, ... })
 *   dispatch('catalog', 'createItem', { sku, name, ... })
 */
export function createDispatcher(currentState) {
  const slices = {
    crm: crmSlice,
    sales: salesSlice,
    warehouse: warehouseSlice,
    production: productionSlice,
    catalog: catalogSlice,
  };

  return function dispatch(sliceName, actionName, payload) {
    const slice = slices[sliceName];
    if (!slice || !slice.actions[actionName]) {
      console.error(`Action ${sliceName}.${actionName} not found`);
      return currentState;
    }

    // Get slice state from current state
    // Note: Slices store their state directly in root (via ...spread in getInitialState)
    // So we pass the full state, and the reducer returns the full state with updates
    const sliceState = currentState;
    const newSliceState = slice.actions[actionName](sliceState, payload);

    return newSliceState;
  };
}

/**
 * List all available actions per slice
 */
export function getAvailableActions() {
  return {
    crm: Object.keys(crmSlice.actions),
    sales: Object.keys(salesSlice.actions),
    warehouse: Object.keys(warehouseSlice.actions),
    production: Object.keys(productionSlice.actions),
    catalog: Object.keys(catalogSlice.actions),
  };
}

/**
 * Slice metadata for UI/tooling
 */
export const SLICE_METADATA = {
  crm: {
    name: 'CRM',
    description: 'Customer Relationship Management - Leads, Opportunities, Activities',
    icon: 'users',
    color: '#3b82f6',
    size: '~60KB'
  },
  sales: {
    name: 'Sales',
    description: 'Sales & Orders - Quotes, Orders, Customers, Cart',
    icon: 'shopping-cart',
    color: '#10b981',
    size: '~80KB'
  },
  warehouse: {
    name: 'Warehouse',
    description: 'Inventory & Logistics - Materials, Shipments, Vehicles, Crews',
    icon: 'package',
    color: '#f59e0b',
    size: '~70KB'
  },
  production: {
    name: 'Production',
    description: 'Manufacturing - Jobs, Tasks, Schedules, Nesting',
    icon: 'hammer',
    color: '#ef4444',
    size: '~60KB'
  },
  catalog: {
    name: 'Catalog',
    description: 'Product Catalog - Items, Categories, Assemblies',
    icon: 'layers',
    color: '#8b5cf6',
    size: '~50KB'
  }
};

/**
 * Export all slices for potential future use
 */
export { crmSlice, salesSlice, warehouseSlice, productionSlice, catalogSlice };
