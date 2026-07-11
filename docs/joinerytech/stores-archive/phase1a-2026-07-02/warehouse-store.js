// ──────────────────────────────────────────────────────────────────────────
// warehouse-store.js — Inventory & Logistics Management slice
//
// Handles: Materials, Shipments, Vehicles, Crews
// Size target: ~70KB (currently mixed in app-store.jsx)
// Pattern: Pure functions, immutable state updates
// ──────────────────────────────────────────────────────────────────────────

export const warehouseSlice = {
  // ── Get initial state for Warehouse ──
  getState: () => ({
    materials: [],
    movements: [],
    offcuts: [],
    shipments: [],
    vehicles: [],
    crews: [],
    warehouseSeq: { movement: 1, shipment: 1 }
  }),

  // ── All Warehouse actions (reducers) ──
  actions: {
    // MATERIALS & STOCK
    addMaterial: (state, payload) => {
      // payload: { code, name, category, onHand, unit, minLevel, maxLevel, ... }
      const newMaterial = {
        code: payload.code,
        name: payload.name,
        category: payload.category || "general",
        onHand: payload.onHand || 0,
        unit: payload.unit || "db",
        minLevel: payload.minLevel || 10,
        maxLevel: payload.maxLevel || 1000,
        cost: payload.cost || 0,
        supplier: payload.supplier || null,
        lastMovement: payload.lastMovement || null,
        trend: payload.trend || "stable", // rising, stable, falling
        createdAt: payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        materials: [newMaterial, ...state.materials]
      };
    },

    updateMaterialStock: (state, payload) => {
      // payload: { code, qty, type: "in|out|adjust", reason }
      const material = state.materials.find(m => m.code === payload.code);
      if (!material) return state;

      let newQty = material.onHand;
      if (payload.type === "in") newQty += payload.qty;
      else if (payload.type === "out") newQty = Math.max(0, newQty - payload.qty);
      else if (payload.type === "adjust") newQty = payload.qty;

      const movement = {
        id: `MOV-${state.warehouseSeq.movement}`,
        materialCode: payload.code,
        type: payload.type,
        qty: payload.qty,
        reason: payload.reason || "manual",
        prevQty: material.onHand,
        newQty,
        createdAt: new Date().toISOString()
      };

      return {
        ...state,
        materials: state.materials.map(m =>
          m.code === payload.code
            ? {
                ...m,
                onHand: newQty,
                lastMovement: movement.id,
                updatedAt: new Date().toISOString()
              }
            : m
        ),
        movements: [movement, ...state.movements],
        warehouseSeq: { ...state.warehouseSeq, movement: state.warehouseSeq.movement + 1 }
      };
    },

    updateMaterial: (state, payload) => {
      // payload: { code, updates: { name, minLevel, supplier, ... } }
      return {
        ...state,
        materials: state.materials.map(material =>
          material.code === payload.code
            ? { ...material, ...payload.updates, updatedAt: new Date().toISOString() }
            : material
        )
      };
    },

    deleteMaterial: (state, payload) => {
      // payload: { code }
      return {
        ...state,
        materials: state.materials.filter(m => m.code !== payload.code)
      };
    },

    // OFFCUTS (отходы, обрезки)
    recordOffcut: (state, payload) => {
      // payload: { materialCode, qty, source, notes }
      const newOffcut = {
        id: `OFC-${Date.now()}`,
        materialCode: payload.materialCode,
        qty: payload.qty,
        unit: payload.unit || "db",
        source: payload.source, // job-id, cutting-waste, damaged, etc.
        notes: payload.notes || "",
        reclaimable: payload.reclaimable !== false,
        createdAt: new Date().toISOString()
      };
      return {
        ...state,
        offcuts: [newOffcut, ...state.offcuts]
      };
    },

    reclaimOffcut: (state, payload) => {
      // payload: { offcutId }
      return {
        ...state,
        offcuts: state.offcuts.filter(ofc => ofc.id !== payload.offcutId)
      };
    },

    // SHIPMENTS & DELIVERY
    createShipment: (state, payload) => {
      // payload: { orderId, deliveryAddress, expectedDate, items, ... }
      const newShipment = {
        id: `SHP-${state.warehouseSeq.shipment}`,
        orderId: payload.orderId,
        status: "pending", // pending, packed, in-transit, delivered, failed
        deliveryAddress: payload.deliveryAddress,
        expectedDate: payload.expectedDate,
        actualDate: null,
        items: payload.items || [],
        vehicleId: payload.vehicleId || null,
        crewId: payload.crewId || null,
        notes: payload.notes || "",
        tracking: payload.tracking || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        shipments: [newShipment, ...state.shipments],
        warehouseSeq: { ...state.warehouseSeq, shipment: state.warehouseSeq.shipment + 1 }
      };
    },

    updateShipment: (state, payload) => {
      // payload: { shipmentId, updates: { status, vehicleId, crewId, ... } }
      return {
        ...state,
        shipments: state.shipments.map(shipment =>
          shipment.id === payload.shipmentId
            ? {
                ...shipment,
                ...payload.updates,
                updatedAt: new Date().toISOString()
              }
            : shipment
        )
      };
    },

    updateShipmentStatus: (state, payload) => {
      // payload: { shipmentId, newStatus, actualDate }
      return {
        ...state,
        shipments: state.shipments.map(shipment =>
          shipment.id === payload.shipmentId
            ? {
                ...shipment,
                status: payload.newStatus,
                actualDate: payload.newStatus === "delivered" ? (payload.actualDate || new Date().toISOString()) : null,
                updatedAt: new Date().toISOString()
              }
            : shipment
        )
      };
    },

    // VEHICLES
    createVehicle: (state, payload) => {
      // payload: { plate, model, capacity, type, status, ... }
      const newVehicle = {
        id: `VEH-${Date.now()}`,
        plate: payload.plate,
        model: payload.model,
        capacity: payload.capacity || 5000, // kg
        type: payload.type || "van", // van, truck, car, pickup
        status: "available", // available, in-use, maintenance, out-of-service
        notes: payload.notes || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        vehicles: [newVehicle, ...state.vehicles]
      };
    },

    updateVehicle: (state, payload) => {
      // payload: { vehicleId, updates: { status, model, ... } }
      return {
        ...state,
        vehicles: state.vehicles.map(vehicle =>
          vehicle.id === payload.vehicleId
            ? {
                ...vehicle,
                ...payload.updates,
                updatedAt: new Date().toISOString()
              }
            : vehicle
        )
      };
    },

    deleteVehicle: (state, payload) => {
      // payload: { vehicleId }
      return {
        ...state,
        vehicles: state.vehicles.filter(v => v.id !== payload.vehicleId)
      };
    },

    // CREWS
    createCrew: (state, payload) => {
      // payload: { name, members, contact, ... }
      const newCrew = {
        id: `CRW-${Date.now()}`,
        name: payload.name,
        members: payload.members || [],
        contact: payload.contact || null,
        status: "available", // available, on-job, off-duty, inactive
        notes: payload.notes || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        crews: [newCrew, ...state.crews]
      };
    },

    updateCrew: (state, payload) => {
      // payload: { crewId, updates: { name, status, members, ... } }
      return {
        ...state,
        crews: state.crews.map(crew =>
          crew.id === payload.crewId
            ? {
                ...crew,
                ...payload.updates,
                updatedAt: new Date().toISOString()
              }
            : crew
        )
      };
    },

    addCrewMember: (state, payload) => {
      // payload: { crewId, member }
      return {
        ...state,
        crews: state.crews.map(crew =>
          crew.id === payload.crewId
            ? {
                ...crew,
                members: [...crew.members, payload.member],
                updatedAt: new Date().toISOString()
              }
            : crew
        )
      };
    },

    removeCrewMember: (state, payload) => {
      // payload: { crewId, memberId }
      return {
        ...state,
        crews: state.crews.map(crew =>
          crew.id === payload.crewId
            ? {
                ...crew,
                members: crew.members.filter(m => m.id !== payload.memberId),
                updatedAt: new Date().toISOString()
              }
            : crew
        )
      };
    },

    deleteCrew: (state, payload) => {
      // payload: { crewId }
      return {
        ...state,
        crews: state.crews.filter(c => c.id !== payload.crewId)
      };
    }
  },

  // ── Seed data for demo (optional) ──
  seedData: {
    materials: [
      {
        code: "MAT-001",
        name: "MDF 18mm",
        category: "board",
        onHand: 450,
        unit: "lap",
        minLevel: 50,
        maxLevel: 500,
        cost: 4500,
        supplier: "Egger Kft.",
        lastMovement: "MOV-1",
        trend: "stable",
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-28T15:30:00Z"
      },
      {
        code: "MAT-002",
        name: "Élzáró ABS 1mm",
        category: "edging",
        onHand: 2500,
        unit: "fm",
        minLevel: 500,
        maxLevel: 5000,
        cost: 150,
        supplier: "Brüchle KG",
        lastMovement: "MOV-2",
        trend: "rising",
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-28T14:00:00Z"
      }
    ],
    movements: [
      {
        id: "MOV-1",
        materialCode: "MAT-001",
        type: "out",
        qty: 50,
        reason: "job-release",
        prevQty: 500,
        newQty: 450,
        createdAt: "2026-06-28T14:30:00Z"
      }
    ],
    offcuts: [],
    shipments: [
      {
        id: "SHP-1",
        orderId: "JT-2426-0001",
        status: "in-transit",
        deliveryAddress: "Budapest, XIV. kerület",
        expectedDate: "2026-07-05",
        actualDate: null,
        items: [
          { materialCode: "MAT-001", qty: 20, unit: "lap" },
          { materialCode: "MAT-002", qty: 500, unit: "fm" }
        ],
        vehicleId: "VEH-1",
        crewId: "CRW-1",
        notes: "Kapusorompó + szállítási szervezés",
        tracking: "SHIP-12345",
        createdAt: "2026-06-28T10:00:00Z",
        updatedAt: "2026-06-28T12:00:00Z"
      }
    ],
    vehicles: [
      {
        id: "VEH-1",
        plate: "KLM-123",
        model: "Iveco Daily",
        capacity: 8000,
        type: "van",
        status: "in-use",
        notes: "Elsőszámú szállítójármű",
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-06-28T14:00:00Z"
      }
    ],
    crews: [
      {
        id: "CRW-1",
        name: "Szállítás A",
        members: [
          { id: "MBR-1", name: "Kiss József", role: "driver" },
          { id: "MBR-2", name: "Kovács Péter", role: "assistant" }
        ],
        contact: "+36-30-123-4567",
        status: "on-job",
        notes: "Kapusor szállítása, 2026-06-28",
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-06-28T14:00:00Z"
      }
    ],
    warehouseSeq: { movement: 2, shipment: 2 }
  }
};
