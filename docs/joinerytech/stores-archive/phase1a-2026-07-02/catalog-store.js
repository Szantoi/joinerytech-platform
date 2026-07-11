// ──────────────────────────────────────────────────────────────────────────
// catalog-store.js — Product Catalog & Classification slice
//
// Handles: Items, Categories, Assembly Configurations
// Size target: ~50KB (currently mixed in app-store.jsx)
// Pattern: Pure functions, immutable state updates
// ──────────────────────────────────────────────────────────────────────────

export const catalogSlice = {
  // ── Get initial state for Catalog ──
  getState: () => ({
    items: [],
    categories: [],
    assemblies: [],
    specifications: {},
    catalogSeq: { item: 1, category: 1, assembly: 1 }
  }),

  // ── All Catalog actions (reducers) ──
  actions: {
    // CATEGORIES (hierarchical product classification)
    createCategory: (state, payload) => {
      // payload: { name, parentId, color, fields, description }
      const newCategory = {
        id: `CAT-${state.catalogSeq.category}`,
        name: payload.name,
        parentId: payload.parentId || null,
        color: payload.color || "#6b7280",
        fields: payload.fields || [], // typed properties
        description: payload.description || "",
        sortOrder: payload.sortOrder || 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        categories: [newCategory, ...state.categories],
        catalogSeq: { ...state.catalogSeq, category: state.catalogSeq.category + 1 }
      };
    },

    updateCategory: (state, payload) => {
      // payload: { categoryId, updates: { name, color, fields, ... } }
      return {
        ...state,
        categories: state.categories.map(cat =>
          cat.id === payload.categoryId
            ? {
                ...cat,
                ...payload.updates,
                updatedAt: new Date().toISOString()
              }
            : cat
        )
      };
    },

    updateCategoryFields: (state, payload) => {
      // payload: { categoryId, fields: [{ key, label, type, ... }] }
      return {
        ...state,
        categories: state.categories.map(cat =>
          cat.id === payload.categoryId
            ? {
                ...cat,
                fields: payload.fields,
                updatedAt: new Date().toISOString()
              }
            : cat
        )
      };
    },

    deleteCategory: (state, payload) => {
      // payload: { categoryId }
      return {
        ...state,
        categories: state.categories.filter(cat => cat.id !== payload.categoryId)
      };
    },

    // CATALOG ITEMS (products in inventory)
    createItem: (state, payload) => {
      // payload: { sku, name, categoryId, price, cost, unit, description, properties, ... }
      const newItem = {
        id: `ITEM-${state.catalogSeq.item}`,
        sku: payload.sku,
        name: payload.name,
        categoryId: payload.categoryId,
        description: payload.description || "",
        price: payload.price || 0,
        cost: payload.cost || 0,
        unit: payload.unit || "db",
        currency: payload.currency || "HUF",
        isActive: true,
        properties: payload.properties || {}, // Dynamic typed fields
        images: payload.images || [],
        supplier: payload.supplier || null,
        leadTime: payload.leadTime || 0, // days
        minQty: payload.minQty || 1,
        maxQty: payload.maxQty || 1000,
        weight: payload.weight || 0, // kg
        dimensions: payload.dimensions || { length: 0, width: 0, height: 0 },
        tags: payload.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        items: [newItem, ...state.items],
        catalogSeq: { ...state.catalogSeq, item: state.catalogSeq.item + 1 }
      };
    },

    updateItem: (state, payload) => {
      // payload: { itemId, updates: { name, price, cost, description, ... } }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === payload.itemId
            ? {
                ...item,
                ...payload.updates,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      };
    },

    updateItemProperties: (state, payload) => {
      // payload: { itemId, properties: { field1, field2, ... } }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === payload.itemId
            ? {
                ...item,
                properties: {
                  ...item.properties,
                  ...payload.properties
                },
                updatedAt: new Date().toISOString()
              }
            : item
        )
      };
    },

    updateItemPrice: (state, payload) => {
      // payload: { itemId, price, cost }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === payload.itemId
            ? {
                ...item,
                price: payload.price || item.price,
                cost: payload.cost !== undefined ? payload.cost : item.cost,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      };
    },

    addItemImage: (state, payload) => {
      // payload: { itemId, image: { url, label, sortOrder } }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === payload.itemId
            ? {
                ...item,
                images: [payload.image, ...item.images],
                updatedAt: new Date().toISOString()
              }
            : item
        )
      };
    },

    toggleItemActive: (state, payload) => {
      // payload: { itemId }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === payload.itemId
            ? {
                ...item,
                isActive: !item.isActive,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      };
    },

    deleteItem: (state, payload) => {
      // payload: { itemId }
      return {
        ...state,
        items: state.items.filter(item => item.id !== payload.itemId)
      };
    },

    // ASSEMBLIES (bill of materials / product configurations)
    createAssembly: (state, payload) => {
      // payload: { name, description, parts, costBase, notes }
      const newAssembly = {
        id: `ASM-${state.catalogSeq.assembly}`,
        name: payload.name,
        description: payload.description || "",
        parts: payload.parts || [], // [ { itemId, qty, optional } ]
        costBase: payload.costBase || 0,
        notes: payload.notes || "",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        assemblies: [newAssembly, ...state.assemblies],
        catalogSeq: { ...state.catalogSeq, assembly: state.catalogSeq.assembly + 1 }
      };
    },

    updateAssembly: (state, payload) => {
      // payload: { assemblyId, updates: { name, description, parts, costBase, ... } }
      return {
        ...state,
        assemblies: state.assemblies.map(assembly =>
          assembly.id === payload.assemblyId
            ? {
                ...assembly,
                ...payload.updates,
                updatedAt: new Date().toISOString()
              }
            : assembly
        )
      };
    },

    addAssemblyPart: (state, payload) => {
      // payload: { assemblyId, part: { itemId, qty, optional } }
      return {
        ...state,
        assemblies: state.assemblies.map(assembly =>
          assembly.id === payload.assemblyId
            ? {
                ...assembly,
                parts: [payload.part, ...assembly.parts],
                updatedAt: new Date().toISOString()
              }
            : assembly
        )
      };
    },

    removeAssemblyPart: (state, payload) => {
      // payload: { assemblyId, itemId }
      return {
        ...state,
        assemblies: state.assemblies.map(assembly =>
          assembly.id === payload.assemblyId
            ? {
                ...assembly,
                parts: assembly.parts.filter(p => p.itemId !== payload.itemId),
                updatedAt: new Date().toISOString()
              }
            : assembly
        )
      };
    },

    updateAssemblyPart: (state, payload) => {
      // payload: { assemblyId, itemId, qty, optional }
      return {
        ...state,
        assemblies: state.assemblies.map(assembly =>
          assembly.id === payload.assemblyId
            ? {
                ...assembly,
                parts: assembly.parts.map(part =>
                  part.itemId === payload.itemId
                    ? { ...part, qty: payload.qty, optional: payload.optional }
                    : part
                ),
                updatedAt: new Date().toISOString()
              }
            : assembly
        )
      };
    },

    deleteAssembly: (state, payload) => {
      // payload: { assemblyId }
      return {
        ...state,
        assemblies: state.assemblies.filter(assembly => assembly.id !== payload.assemblyId)
      };
    },

    // SPECIFICATIONS (shared technical specs storage)
    updateSpecification: (state, payload) => {
      // payload: { key, data }
      return {
        ...state,
        specifications: {
          ...state.specifications,
          [payload.key]: {
            ...state.specifications[payload.key],
            ...payload.data,
            updatedAt: new Date().toISOString()
          }
        }
      };
    },

    deleteSpecification: (state, payload) => {
      // payload: { key }
      const specs = { ...state.specifications };
      delete specs[payload.key];
      return {
        ...state,
        specifications: specs
      };
    }
  },

  // ── Seed data for demo (optional) ──
  seedData: {
    items: [
      {
        id: "ITEM-1",
        sku: "AJ-STD-001",
        name: "Ajtórendszer Standard",
        categoryId: "CAT-1",
        description: "Szabványos ajtórendszer szekrénybútorhoz",
        price: 75000,
        cost: 35000,
        unit: "db",
        currency: "HUF",
        isActive: true,
        properties: {
          szelesseg: 700,
          magassag: 2100,
          vastagsag: 40,
          anyag: "Tömörfa"
        },
        images: [
          { url: "https://cdn.joinerytech.hu/products/ajtosystem-001.webp", label: "Termék fénykép", sortOrder: 1 }
        ],
        supplier: "Doorstar Kft.",
        leadTime: 5,
        minQty: 1,
        maxQty: 500,
        weight: 15,
        dimensions: { length: 700, width: 40, height: 2100 },
        tags: ["ajtó", "szekrény", "standard"],
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-28T15:30:00Z"
      },
      {
        id: "ITEM-2",
        sku: "EL-ABS-001",
        name: "Élzáró ABS 1mm",
        categoryId: "CAT-2",
        description: "ABS élzáró szalag 1mm vastagságban",
        price: 150,
        cost: 60,
        unit: "fm",
        currency: "HUF",
        isActive: true,
        properties: {
          szelesseg: 22,
          vastagsag: 1,
          anyag: "ABS",
          szin: "Tölgy"
        },
        images: [],
        supplier: "Brüchle KG",
        leadTime: 3,
        minQty: 50,
        maxQty: 5000,
        weight: 0.05,
        dimensions: { length: 50, width: 22, height: 1 },
        tags: ["élzáró", "ABS"],
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-28T14:00:00Z"
      }
    ],
    categories: [
      {
        id: "CAT-1",
        name: "Ajtók",
        parentId: null,
        color: "#a8703a",
        fields: [
          { key: "szelesseg", label: "Szélesség (mm)", type: "number", unit: "mm" },
          { key: "magassag", label: "Magasság (mm)", type: "number", unit: "mm" },
          { key: "vastagsag", label: "Vastagság (mm)", type: "number", unit: "mm" },
          { key: "anyag", label: "Anyag", type: "select", options: ["Tömörfa", "MDF", "Furnierezve"] }
        ],
        description: "Szekrénybútorokhoz szükséges ajtók",
        sortOrder: 1,
        isActive: true,
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-28T15:30:00Z"
      },
      {
        id: "CAT-2",
        name: "Élzárók",
        parentId: null,
        color: "#5b8a72",
        fields: [
          { key: "szelesseg", label: "Szélesség (mm)", type: "number", unit: "mm" },
          { key: "vastagsag", label: "Vastagság (mm)", type: "number", unit: "mm" },
          { key: "anyag", label: "Anyag", type: "select", options: ["ABS", "PVC", "Melamin"] },
          { key: "szin", label: "Szín", type: "color" }
        ],
        description: "Élzáró szalagok és sávok",
        sortOrder: 2,
        isActive: true,
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-28T15:30:00Z"
      }
    ],
    assemblies: [
      {
        id: "ASM-1",
        name: "Konyhabútor csomag",
        description: "Teljes konyhabútor szett",
        parts: [
          { itemId: "ITEM-1", qty: 4, optional: false },
          { itemId: "ITEM-2", qty: 50, optional: false }
        ],
        costBase: 150000,
        notes: "Standard konyha assembly",
        isActive: true,
        createdAt: "2026-06-15T10:00:00Z",
        updatedAt: "2026-06-28T15:30:00Z"
      }
    ],
    specifications: {
      "standard-door": {
        name: "Standard Ajtó Spec",
        minWidth: 500,
        maxWidth: 1000,
        minHeight: 1500,
        maxHeight: 2500,
        updatedAt: "2026-06-20T10:00:00Z"
      },
      "edging-types": {
        abs: { name: "ABS", benefit: "Szívós, könnyen formázható" },
        pvc: { name: "PVC", benefit: "Olcsó, felújítható" },
        melamin: { name: "Melamin", benefit: "Dekoratív, tartós" },
        updatedAt: "2026-06-20T10:00:00Z"
      }
    },
    catalogSeq: { item: 3, category: 3, assembly: 2 }
  }
};
