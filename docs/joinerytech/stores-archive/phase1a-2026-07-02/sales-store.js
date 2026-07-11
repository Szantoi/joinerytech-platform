// ──────────────────────────────────────────────────────────────────────────
// sales-store.js — Sales & Order Management slice
//
// Handles: Quotes, Orders, Customers, Cart
// Size target: ~80KB (currently mixed in app-store.jsx)
// Pattern: Pure functions, immutable state updates
// ──────────────────────────────────────────────────────────────────────────

export const salesSlice = {
  // ── Get initial state for Sales ──
  getState: () => ({
    quotes: [],
    orders: [],
    customers: [],
    cart: [],
    salesSeq: { quote: 1, order: 1 }
  }),

  // ── All Sales actions (reducers) ──
  actions: {
    // QUOTES
    createQuote: (state, payload) => {
      // payload: { id, customer, date, expires, value, status, items, owner, projectRef, ... }
      const newQuote = {
        id: payload.id || `Q-${state.salesSeq.quote}`,
        customer: payload.customer,
        date: payload.date || new Date().toISOString().split('T')[0],
        expires: payload.expires,
        value: payload.value || 0,
        status: "draft", // draft, sent, approved, rejected, expired
        items: payload.items || 0,
        owner: payload.owner,
        projectRef: payload.projectRef || null,
        lines: payload.lines || [],
        notes: payload.notes || "",
        createdAt: payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customerAcceptedAt: null,
        priceChanges: []
      };
      return {
        ...state,
        quotes: [newQuote, ...state.quotes],
        salesSeq: { ...state.salesSeq, quote: state.salesSeq.quote + 1 }
      };
    },

    updateQuote: (state, payload) => {
      // payload: { id, updates: { customer, value, status, ... } }
      return {
        ...state,
        quotes: state.quotes.map(quote =>
          quote.id === payload.id
            ? { ...quote, ...payload.updates, updatedAt: new Date().toISOString() }
            : quote
        )
      };
    },

    updateQuoteStatus: (state, payload) => {
      // payload: { id, newStatus }
      return {
        ...state,
        quotes: state.quotes.map(quote =>
          quote.id === payload.id
            ? { ...quote, status: payload.newStatus, updatedAt: new Date().toISOString() }
            : quote
        )
      };
    },

    approveQuote: (state, payload) => {
      // payload: { id, customerAcceptedAt }
      return {
        ...state,
        quotes: state.quotes.map(quote =>
          quote.id === payload.id
            ? {
                ...quote,
                status: "approved",
                customerAcceptedAt: payload.customerAcceptedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            : quote
        )
      };
    },

    updateQuoteLines: (state, payload) => {
      // payload: { quoteId, lines, value, itemCount, priceChange }
      return {
        ...state,
        quotes: state.quotes.map(quote =>
          quote.id === payload.quoteId
            ? {
                ...quote,
                lines: payload.lines,
                value: payload.value,
                items: payload.itemCount,
                priceChanges: [...(quote.priceChanges || []), payload.priceChange],
                updatedAt: new Date().toISOString()
              }
            : quote
        )
      };
    },

    deleteQuote: (state, payload) => {
      // payload: { id }
      return {
        ...state,
        quotes: state.quotes.filter(quote => quote.id !== payload.id)
      };
    },

    // ORDERS
    createOrder: (state, payload) => {
      // payload: { id, customer, type, date, status, total, items, projectId, source, fromQuote, lines, ... }
      const newOrder = {
        id: payload.id || `JT-${state.salesSeq.order}`,
        customer: payload.customer,
        type: payload.type || "general", // cabinet, door, service, custom
        date: payload.date || new Date().toISOString().split('T')[0],
        status: "pending", // pending, calc, ready, released, in-progress, delivered, cancelled
        total: payload.total || 0,
        items: payload.items || 0,
        projectId: payload.projectId || null,
        source: payload.source || "manual", // manual, quote, project
        fromQuote: payload.fromQuote || null,
        lines: payload.lines || [],
        notes: payload.notes || "",
        procurementDone: false,
        deliveredAt: null,
        createdAt: payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        orders: [newOrder, ...state.orders],
        salesSeq: { ...state.salesSeq, order: state.salesSeq.order + 1 }
      };
    },

    updateOrder: (state, payload) => {
      // payload: { id, updates: { status, total, notes, ... } }
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === payload.id
            ? { ...order, ...payload.updates, updatedAt: new Date().toISOString() }
            : order
        )
      };
    },

    updateOrderStatus: (state, payload) => {
      // payload: { id, newStatus }
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === payload.id
            ? { ...order, status: payload.newStatus, updatedAt: new Date().toISOString() }
            : order
        )
      };
    },

    updateOrderLines: (state, payload) => {
      // payload: { orderId, lines, total }
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === payload.orderId
            ? {
                ...order,
                lines: payload.lines,
                total: payload.total,
                items: payload.lines.length,
                updatedAt: new Date().toISOString()
              }
            : order
        )
      };
    },

    markProcurementDone: (state, payload) => {
      // payload: { orderId }
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === payload.orderId
            ? { ...order, procurementDone: true, updatedAt: new Date().toISOString() }
            : order
        )
      };
    },

    markOrderDelivered: (state, payload) => {
      // payload: { id, deliveredAt }
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === payload.id
            ? {
                ...order,
                status: "delivered",
                deliveredAt: payload.deliveredAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            : order
        )
      };
    },

    deleteOrder: (state, payload) => {
      // payload: { id }
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== payload.id)
      };
    },

    // CUSTOMERS
    createCustomer: (state, payload) => {
      // payload: { id, name, email, phone, address, company, ... }
      const newCustomer = {
        id: payload.id || `CUST-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        phone: payload.phone || "",
        address: payload.address || "",
        company: payload.company || "",
        type: payload.type || "retail", // retail, wholesale, corporate
        status: "active", // active, inactive, blocked
        notes: payload.notes || "",
        createdAt: payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        customers: [newCustomer, ...state.customers]
      };
    },

    updateCustomer: (state, payload) => {
      // payload: { id, updates: { name, email, phone, ... } }
      return {
        ...state,
        customers: state.customers.map(customer =>
          customer.id === payload.id
            ? { ...customer, ...payload.updates, updatedAt: new Date().toISOString() }
            : customer
        )
      };
    },

    deleteCustomer: (state, payload) => {
      // payload: { id }
      return {
        ...state,
        customers: state.customers.filter(customer => customer.id !== payload.id)
      };
    },

    // CART (shopping cart before checkout)
    addToCart: (state, payload) => {
      // payload: { itemId, qty, price, ... }
      const existingItem = state.cart.find(item => item.itemId === payload.itemId);
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map(item =>
            item.itemId === payload.itemId
              ? { ...item, qty: item.qty + payload.qty }
              : item
          )
        };
      }
      return {
        ...state,
        cart: [
          {
            itemId: payload.itemId,
            name: payload.name,
            qty: payload.qty || 1,
            price: payload.price || 0,
            unit: payload.unit || "db",
            addedAt: new Date().toISOString()
          },
          ...state.cart
        ]
      };
    },

    updateCartItem: (state, payload) => {
      // payload: { itemId, qty, price }
      return {
        ...state,
        cart: state.cart.map(item =>
          item.itemId === payload.itemId
            ? { ...item, qty: payload.qty, price: payload.price || item.price }
            : item
        )
      };
    },

    removeFromCart: (state, payload) => {
      // payload: { itemId }
      return {
        ...state,
        cart: state.cart.filter(item => item.itemId !== payload.itemId)
      };
    },

    clearCart: (state) => {
      return {
        ...state,
        cart: []
      };
    }
  },

  // ── Seed data for demo (optional) ──
  seedData: {
    quotes: [
      {
        id: "Q-2426-001",
        customer: "Doorstar Kft.",
        date: "2026-06-15",
        expires: "2026-07-15",
        value: 2500000,
        status: "approved",
        items: 3,
        owner: "Szabó A.",
        projectRef: "PRJ-2026-001",
        lines: [
          { name: "Ajtórendszer Standard", code: "AJ-001", qty: 20, unit: "db", price: 1500000 },
          { name: "Szerviz csomag", code: "SZ-001", qty: 1, unit: "klt", price: 500000 },
          { name: "Telepítés", code: "TEL-001", qty: 1, unit: "klt", price: 500000 }
        ],
        createdAt: "2026-06-15T10:00:00Z",
        updatedAt: "2026-06-28T15:30:00Z",
        customerAcceptedAt: "2026-06-20T14:00:00Z",
        priceChanges: []
      }
    ],
    orders: [
      {
        id: "JT-2426-0001",
        customer: "Doorstar Kft.",
        type: "cabinet",
        date: "2026-06-18",
        status: "released",
        total: 2500000,
        items: 3,
        projectId: "PRJ-2026-001",
        source: "quote",
        fromQuote: "Q-2426-001",
        lines: [
          { name: "Ajtórendszer Standard", code: "AJ-001", qty: 20, unit: "db", price: 1500000 },
          { name: "Szerviz csomag", code: "SZ-001", qty: 1, unit: "klt", price: 500000 },
          { name: "Telepítés", code: "TEL-001", qty: 1, unit: "klt", price: 500000 }
        ],
        procurementDone: false,
        deliveredAt: null,
        createdAt: "2026-06-18T09:00:00Z",
        updatedAt: "2026-06-28T14:00:00Z",
        notes: "Gépesített raktárból szállítás"
      }
    ],
    customers: [
      {
        id: "CUST-1",
        name: "Doorstar Kft.",
        email: "contact@doorstar.hu",
        phone: "+36-1-123-4567",
        address: "Budapest, XIV. kerület",
        company: "Doorstar Kft.",
        type: "corporate",
        status: "active",
        createdAt: "2026-04-15T10:00:00Z",
        updatedAt: "2026-06-28T15:30:00Z",
        notes: "Stratégiai partnerek, nagy mennyiség"
      }
    ],
    cart: [],
    salesSeq: { quote: 2, order: 2 }
  }
};
