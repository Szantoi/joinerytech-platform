// ──────────────────────────────────────────────────────────────────────────
// page-adapter-demo.jsx — Observable Adapter Integration Demo (Phase 1-B PoC)
//
// This page demonstrates the observable adapter pattern integration with
// app-store.jsx. Shows both old and new patterns side-by-side.
//
// Purpose: Proof of Concept for MSG-FRONTEND-095 Phase 1-B
// Status: Demo/Documentation page
// ──────────────────────────────────────────────────────────────────────────

function PageAdapterDemo() {
  const sim = useSim();
  const [demoLog, setDemoLog] = React.useState([]);

  const addLog = (message) => {
    setDemoLog(prev => [...prev, { time: new Date().toLocaleTimeString(), message }]);
  };

  // ── Demo 1: CRM Lead Creation ────────────────────────────────────────────
  const handleCreateLead = () => {
    try {
      sim.createLead({
        email: `demo${Date.now()}@test.com`,
        company: 'Demo Company Inc.',
        source: 'adapter-demo'
      });
      addLog('✓ Lead created via StoreAdapter (CRM slice)');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  // ── Demo 2: Sales Cart Addition ──────────────────────────────────────────
  const handleAddToCart = () => {
    try {
      sim.addToCart({
        id: `DEMO-${Date.now()}`,
        name: 'Demo Product',
        price: 1500,
        qty: 1
      });
      addLog('✓ Item added to cart via StoreAdapter (Sales slice)');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  // ── Demo 3: Warehouse Stock Movement ─────────────────────────────────────
  const handleStockMovement = () => {
    try {
      sim.recordStockMovement({
        materialId: 'MAT-001',
        type: 'in',
        qty: 50,
        prevQty: 100,
        newQty: 150,
        reason: 'adapter-demo'
      });
      addLog('✓ Stock movement recorded via StoreAdapter (Warehouse slice)');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  // ── Demo 4: Production Job Creation ──────────────────────────────────────
  const handleCreateJob = () => {
    try {
      sim.createJob({
        orderId: `ORD-${Date.now()}`,
        priority: 'high',
        dueDate: '2026-07-10'
      });
      addLog('✓ Production job created via StoreAdapter (Production slice)');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  // ── Demo 5: Catalog Item Addition ────────────────────────────────────────
  const handleAddCatalogItem = () => {
    try {
      sim.addCatalogItem({
        code: `DEMO-${Date.now()}`,
        name: 'Demo Catalog Item',
        unit: 'pc',
        price: 2500
      });
      addLog('✓ Catalog item added via StoreAdapter (Catalog slice)');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  // ── State Inspection ──────────────────────────────────────────────────────
  const sliceStates = {
    leads: (sim.leads || []).length,
    opportunities: (sim.opportunities || []).length,
    cartItems: (sim.cart?.items || []).length,
    stockMovements: (sim.stockMovements || []).length,
    jobs: (sim.jobs || []).length,
    catalogItems: (sim.items || []).length
  };

  return (
    <div className="page-padding">
      <div className="page-header">
        <h1>🔌 Observable Adapter Integration Demo</h1>
        <p className="text-muted">
          Phase 1-B Proof of Concept — MSG-FRONTEND-095
        </p>
      </div>

      <div className="row">
        {/* Left Column: Demo Actions */}
        <div className="col-md-6">
          <div className="card mb-3">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Store Adapter Actions</h5>
            </div>
            <div className="card-body">
              <p className="text-muted small">
                These actions are loaded from 5 modular store slices via the
                observable adapter pattern. Each action updates state and
                triggers observers.
              </p>

              <div className="d-grid gap-2">
                <button className="btn btn-outline-primary" onClick={handleCreateLead}>
                  📧 Create Lead (CRM Slice)
                </button>
                <button className="btn btn-outline-success" onClick={handleAddToCart}>
                  🛒 Add to Cart (Sales Slice)
                </button>
                <button className="btn btn-outline-warning" onClick={handleStockMovement}>
                  📦 Stock Movement (Warehouse Slice)
                </button>
                <button className="btn btn-outline-info" onClick={handleCreateJob}>
                  🔧 Create Job (Production Slice)
                </button>
                <button className="btn btn-outline-secondary" onClick={handleAddCatalogItem}>
                  📋 Add Catalog Item (Catalog Slice)
                </button>
              </div>
            </div>
          </div>

          {/* Current State Counts */}
          <div className="card">
            <div className="card-header bg-dark text-white">
              <h6 className="mb-0">Current State</h6>
            </div>
            <div className="card-body">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr>
                    <td>Leads:</td>
                    <td><strong>{sliceStates.leads}</strong></td>
                  </tr>
                  <tr>
                    <td>Opportunities:</td>
                    <td><strong>{sliceStates.opportunities}</strong></td>
                  </tr>
                  <tr>
                    <td>Cart Items:</td>
                    <td><strong>{sliceStates.cartItems}</strong></td>
                  </tr>
                  <tr>
                    <td>Stock Movements:</td>
                    <td><strong>{sliceStates.stockMovements}</strong></td>
                  </tr>
                  <tr>
                    <td>Production Jobs:</td>
                    <td><strong>{sliceStates.jobs}</strong></td>
                  </tr>
                  <tr>
                    <td>Catalog Items:</td>
                    <td><strong>{sliceStates.catalogItems}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Event Log */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Action Log</h5>
              <button
                className="btn btn-sm btn-light"
                onClick={() => setDemoLog([])}
              >
                Clear
              </button>
            </div>
            <div className="card-body" style={{height: '500px', overflowY: 'auto'}}>
              {demoLog.length === 0 ? (
                <p className="text-muted text-center mt-5">
                  <em>Click an action button to see results here</em>
                </p>
              ) : (
                <ul className="list-unstyled">
                  {demoLog.map((entry, idx) => (
                    <li key={idx} className="mb-2 p-2 border-bottom">
                      <small className="text-muted">{entry.time}</small>
                      <div>{entry.message}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Documentation Section */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">📖 Integration Pattern Documentation</h5>
            </div>
            <div className="card-body">
              <h6>Before (Old Pattern):</h6>
              <pre className="bg-light p-3 rounded">
{`// Direct state mutation (anti-pattern)
window.sim.set((state) => ({
  leads: [...state.leads, newLead]
}));`}
              </pre>

              <h6>After (New Pattern with Store Adapter):</h6>
              <pre className="bg-light p-3 rounded">
{`// Action method from CRM slice (via adapter)
window.sim.createLead({
  email: 'user@example.com',
  company: 'Example Corp'
});

// Benefits:
// ✓ Type-safe action payload
// ✓ Encapsulated business logic
// ✓ Testable in isolation
// ✓ Maintains backward compatibility`}
              </pre>

              <h6>Architecture:</h6>
              <ul>
                <li><strong>stores-bundle.js</strong> — 5 domain slices + adapter</li>
                <li><strong>app-store.jsx</strong> — Wires adapter actions via spread</li>
                <li><strong>Observable pattern</strong> — set() triggers emit()</li>
                <li><strong>Backward compatible</strong> — Existing pages unaffected</li>
              </ul>

              <div className="alert alert-success">
                <strong>✓ Integration Status:</strong> Phase 1-B observable adapter
                successfully integrated. All 5 domain slices available via window.sim API.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
