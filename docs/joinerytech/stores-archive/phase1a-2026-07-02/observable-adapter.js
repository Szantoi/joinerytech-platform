// ──────────────────────────────────────────────────────────────────────────
// observable-adapter.js — Bridge between slice reducers and custom observer
//
// This adapter converts pure reducer functions from slices into observable
// actions compatible with app-store.jsx's custom observable pattern.
//
// Pattern:
//   Slice:     actions[name] = (state, payload) => newState
//   Observable: actions[name] = (payload) => set((state) => updates)
//
// The adapter bridges these patterns without rewriting app-store.jsx.
// ──────────────────────────────────────────────────────────────────────────

import { crmSlice } from './crm-store.js';
import { salesSlice } from './sales-store.js';
import { warehouseSlice } from './warehouse-store.js';
import { productionSlice } from './production-store.js';
import { catalogSlice } from './catalog-store.js';

// Map slice name → slice object
const SLICES = {
  crm: crmSlice,
  sales: salesSlice,
  warehouse: warehouseSlice,
  production: productionSlice,
  catalog: catalogSlice
};

/**
 * Create observable actions from all slice reducers
 *
 * Usage in app-store.jsx (around line 1474):
 *   const api = {
 *     getState() { ... },
 *     subscribe(fn) { ... },
 *     set,
 *     reset() { ... },
 *     ...createAllActions(set),  // <-- Add this
 *   };
 *
 * Returns:
 *   {
 *     createLead: (payload) => set((state) => crmSlice.actions.createLead(state, payload)),
 *     updateLeadStatus: (payload) => set(...),
 *     ...74 total actions
 *   }
 *
 * @param {Function} set - The observable set function from app-store.jsx
 * @returns {Object} Object of action methods compatible with api
 */
export function createAllActions(set) {
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
          // The set() function receives (currentState) => updates
          set((currentState) => {
            // Call the slice reducer
            // Reducer returns partial state updates (not full state)
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

  console.log(`✓ Observable adapter: ${actionCount} actions loaded from slices`);
  return actions;
}

/**
 * Validate that all slice reducers are compatible with observable pattern
 *
 * Checks:
 * - getState() is a function returning object
 * - actions is an object
 * - Each action is a function (reducer)
 * - seedData exists (optional but recommended)
 */
export function validateSliceCompatibility() {
  let errors = [];
  let warnings = [];

  Object.entries(SLICES).forEach(([sliceName, slice]) => {
    // Check getState() returns object
    if (!slice.getState || typeof slice.getState !== 'function') {
      errors.push(`${sliceName}.getState() must be a function`);
    } else {
      const initialState = slice.getState();
      if (typeof initialState !== 'object' || initialState === null) {
        errors.push(`${sliceName}.getState() must return an object`);
      }
    }

    // Check seedData exists (optional but recommended)
    if (!slice.seedData) {
      warnings.push(`${sliceName} missing seedData`);
    }

    // Check actions exist
    if (!slice.actions || typeof slice.actions !== 'object') {
      errors.push(`${sliceName}.actions must be an object`);
    } else {
      Object.entries(slice.actions).forEach(([actionName, reducer]) => {
        if (typeof reducer !== 'function') {
          errors.push(`${sliceName}.actions.${actionName} is not a function`);
        }
      });
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

/**
 * Get metadata about all slices for debugging/introspection
 */
export function getSliceMetadata() {
  const metadata = {};

  Object.entries(SLICES).forEach(([sliceName, slice]) => {
    const actionNames = Object.keys(slice.actions);
    const initialState = slice.getState();

    metadata[sliceName] = {
      actions: actionNames,
      actionCount: actionNames.length,
      stateKeys: Object.keys(initialState),
      stateSize: JSON.stringify(initialState).length,
      hasSeedData: !!slice.seedData
    };
  });

  return metadata;
}

/**
 * List all available actions across all slices
 * Useful for debugging and documentation
 */
export function listAllActions() {
  const actionsBySlice = {};

  Object.entries(SLICES).forEach(([sliceName, slice]) => {
    actionsBySlice[sliceName] = Object.keys(slice.actions);
  });

  return actionsBySlice;
}

/**
 * Export slice metadata for UI/introspection
 */
export const METADATA = (() => {
  const meta = {};
  Object.entries(SLICES).forEach(([sliceName, slice]) => {
    meta[sliceName] = {
      actions: Object.keys(slice.actions),
      actionCount: Object.keys(slice.actions).length
    };
  });
  return meta;
})();

// ── Validation ──
validateSliceCompatibility();

// ── Debug Info (remove in production) ──
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.group('🔌 Observable Adapter Debug Info');
  console.log('Slices loaded:', Object.keys(SLICES));
  console.log('Total actions:', Object.values(SLICES).reduce((sum, s) => sum + Object.keys(s.actions).length, 0));
  console.log('Metadata:', getSliceMetadata());
  console.groupEnd();
}
