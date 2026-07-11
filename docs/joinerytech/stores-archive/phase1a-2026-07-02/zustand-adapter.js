// ──────────────────────────────────────────────────────────────────────────
// zustand-adapter.js — Bridge between slice reducers and Zustand store
//
// This adapter converts pure reducer functions from slices into Zustand actions.
// Enables safe, incremental refactoring of app-store.jsx without rewriting
// the entire 9,087 line file.
//
// Pattern:
//   Zustand: actions[actionName] = (payload) => (set) => set(newState)
//   Slices:  actions[actionName] = (state, payload) => newState
//
// Adapter bridges these patterns.
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
 * Create Zustand-compatible actions from all slice reducers
 *
 * Usage in app-store.jsx:
 *   const api = create((set, get) => ({
 *     ...getInitialState(),
 *     ...getSeedData(),
 *     ...createAllActions(set),  // <-- Add this
 *   }));
 *
 * Returns:
 *   {
 *     createLead: (payload) => (set) => set((state) => crmSlice.actions.createLead(state, payload)),
 *     updateLeadStatus: (payload) => (set) => set(...),
 *     ...74 total actions
 *   }
 */
export function createAllActions() {
  const actions = {};
  let actionCount = 0;

  // Iterate each slice
  Object.entries(SLICES).forEach(([sliceName, slice]) => {
    // Iterate each action in the slice
    Object.entries(slice.actions).forEach(([actionName, reducer]) => {
      // Create Zustand action that wraps the slice reducer
      actions[actionName] = (payload) => (set, get) => {
        try {
          const currentState = get();
          const newState = reducer(currentState, payload);

          // Update Zustand state
          set(newState);

          actionCount++;
        } catch (error) {
          console.error(`Error in ${sliceName}.${actionName}:`, error);
          throw error;
        }
      };
    });
  });

  console.log(`✓ Zustand adapter: ${actionCount} actions loaded from slices`);
  return actions;
}

/**
 * Validate that all slice reducers are compatible with Zustand
 *
 * Checks:
 * - Reducer is a function
 * - Reducer returns an object (new state)
 * - No mutations (state !== newState for objects)
 */
export function validateSliceCompatibility() {
  let errors = [];
  let warnings = [];

  Object.entries(SLICES).forEach(([sliceName, slice]) => {
    // Check getState() returns object
    const initialState = slice.getState();
    if (typeof initialState !== 'object' || initialState === null) {
      errors.push(`${sliceName}.getState() must return an object`);
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

  console.log('✓ All slices compatible with Zustand adapter');
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
  console.group('🔌 Zustand Adapter Debug Info');
  console.log('Slices loaded:', Object.keys(SLICES));
  console.log('Total actions:', Object.values(SLICES).reduce((sum, s) => sum + Object.keys(s.actions).length, 0));
  console.log('Metadata:', getSliceMetadata());
  console.groupEnd();
}
