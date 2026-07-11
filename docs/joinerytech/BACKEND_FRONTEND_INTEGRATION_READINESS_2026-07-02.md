# JoineryTech Backend-Frontend Integration Readiness Assessment

**Document Version:** 1.0
**Date:** 2026-07-02
**Prepared by:** Explorer Terminal
**Status:** Research Complete — Readiness Analysis Pending Architect Review

---

## Executive Summary

The **Backend Architecture Plan** (5,200+ lines, .NET 8 REST API, PostgreSQL RLS, DDD/FSM) and **Frontend UI/UX Audit** (521 lines, 108 JSX components, localStorage monolith) reveal **critical integration gaps** that must be addressed before Phase 1 development begins.

### Key Finding

**The Backend design assumes a stateless REST API client, but the Frontend is currently a stateful localStorage monolith.** This architectural mismatch creates 8 critical integration challenges:

| Gap | Priority | Phase Impact | Mitigation |
|-----|----------|-------------|-----------|
| **State Management** | CRITICAL | Phase 1-3 | Redesign frontend state layer |
| **Authentication Flow** | CRITICAL | Phase 1 | Implement JWT token handling |
| **Real-Time Sync** | HIGH | Phase 2 | WebSocket/SSE infrastructure |
| **API Contract Specification** | HIGH | Phase 1 | Define OpenAPI fully before coding |
| **Error Handling** | HIGH | Phase 1 | Unified error response patterns |
| **Performance Migration** | HIGH | Phase 1 | Modularize app-store monolith |
| **Data Validation** | MEDIUM | Phase 1 | Validation rules sync (frontend-backend) |
| **Testing Strategy** | MEDIUM | Phase 1 | API integration tests from day 1 |

---

## 1. Architecture Analysis: Backend vs Frontend

### 1.1 Backend Architecture (Plan)

**Paradigm:** Stateless REST API server with event-driven domain logic

```
Client (Portal)
    ↓ (HTTP REST + JWT)
API Gateway (Node.js, port 3000)
    ↓ (Internal routing)
.NET 8 Modules (ports 5000-5004)
    ↓ (CQRS Commands/Queries)
PostgreSQL + RLS
    ↓ (Event Store)
Domain Events (immutable audit log)
```

**Key Assumptions:**
- Client sends stateless HTTP requests
- Server maintains single source of truth (PostgreSQL)
- Each API response is self-contained (no session state)
- State transitions validated server-side (FSM)
- Real-time updates via polling/GraphQL subscriptions (Phase 2)

### 1.2 Frontend Architecture (Current)

**Paradigm:** Stateful localStorage monolith with immutability simulation

```
React App (Portal)
    ↓ (Babel + CDN)
window.sim (global store, 9,087 lines)
    ↓ (Actions: approveQuote, releaseOrder, etc.)
localStorage (jt_sim_v43)
    ↓ (JSONL serialization)
Browser Storage (5-10 MB limit)
```

**Key Assumptions:**
- All state lives in `window.sim` (single source of truth)
- Actions are synchronous and atomic
- State persists to localStorage automatically
- No network required (offline-first)
- No authentication layer

### 1.3 The Architectural Mismatch

| Aspect | Backend | Frontend | Gap |
|--------|---------|----------|-----|
| **State Location** | Server DB | Browser localStorage | Frontend must sync to API |
| **Authority** | Server (FSM enforced) | Client (simulated) | Server must override client decisions |
| **Transactions** | ACID (PostgreSQL) | Simulated immutability | Race conditions possible |
| **Auth** | JWT + RBAC | None (admin sim) | Entire auth system needed |
| **Real-time** | Optional (polling/GraphQL Sub) | Automatic (store change) | Need event subscription layer |
| **Offline** | Not supported | Expected | Must remove offline capability |
| **Validation** | Server-side (DDD) | Client-side (ad-hoc) | Duplicate validation logic risk |

---

## 2. Critical Integration Gaps

### Gap 1: State Management Paradigm Shift (CRITICAL)

**Problem:** Frontend maintains complete simulation state locally; Backend expects stateless client.

**Current Frontend State Model:**
```javascript
window.sim = {
  quotes: [ { id, status, lines[], ...}, ... ],      // 100-1k items
  orders: [ { id, status, items[], ...}, ... ],      // 100-1k items
  customers: [ ... ],
  materials: [ ... ],
  employees: [ ... ],
  // ... 40+ entity types, all in-memory
}

// Action: approveQuote(quoteId)
// Effect: Modifies window.sim + localStorage immediately
// No server validation
```

**Backend API Model:**
```
POST /api/v1/quotes/{quoteId}/approve
Headers: { Authorization: "Bearer <JWT>" }

Response 200:
{
  id: "q123",
  status: "approved",
  updatedAt: "2026-07-02T10:30:00Z",
  approvedBy: { id: "u456", name: "John Doe" }
}

Server enforces:
- User has "quote.approve" permission (RBAC)
- Quote is in "pending" state (FSM)
- Authorization (tenant isolation via RLS)
```

**Integration Challenge:**

1. **Frontend must become a "thin client":**
   - No local state mutations
   - Always wait for server response
   - Handle optimistic UI updates carefully

2. **Two state models must coexist during migration:**
   - Phase 1: API for auth + catalog
   - Phase 2: API for quotes/orders (hybrid mode)
   - Phase 3: Complete cutover

3. **Data consistency risks:**
   - Browser refresh loses all state (localStorage not synced with DB)
   - Concurrent edits (two users modify same quote)
   - Offline changes become invalid

**Recommended Solution:**

```javascript
// New architecture: TanStack Query (React Query) + API-first

const useQuoteApproval = (quoteId) => {
  const queryClient = useQueryClient();

  const { mutate: approveQuote } = useMutation({
    mutationFn: async () => {
      return api.post(`/quotes/${quoteId}/approve`);
    },
    onMutate: async () => {
      // Optimistic update
      queryClient.setQueryData(['quotes', quoteId], (old) => ({
        ...old,
        status: 'approved'
      }));
    },
    onError: (error) => {
      // Rollback on server error
      queryClient.invalidateQueries(['quotes', quoteId]);
    },
    onSuccess: (data) => {
      // Sync with server response
      queryClient.setQueryData(['quotes', quoteId], data);
    }
  });

  return { approveQuote };
};
```

**Implementation Roadmap:**
- **Week 1-2 (Phase 1):** Introduce TanStack Query, keep localStorage as fallback
- **Week 3-6 (Phase 2):** Migrate core transaction flows (quotes → orders → invoices)
- **Week 7-8 (Phase 3):** Remove localStorage, API-only state

**Risk Level:** 🔴 CRITICAL — 70% of Phase 1-2 effort

---

### Gap 2: Authentication & Authorization (CRITICAL)

**Problem:** Frontend has zero auth; Backend requires JWT + RBAC for every request.

**Current Frontend Security:**
```javascript
// portal.jsx - Role simulation
const userRole = localStorage.getItem('jt_user_role') || 'admin';
const hasPermission = (perm) => {
  // Hardcoded permission checks
  if (userRole === 'admin') return true;
  if (userRole === 'sales' && perm === 'quote.approve') return true;
  return false;
};
```

**Backend Security Model:**
```
JWT Token Structure:
{
  sub: "user-123",
  tenant_id: "tenant-456",
  roles: ["sales.manager", "crm.user"],
  permissions: ["quote.approve", "order.create", "crm.lead.view"],
  exp: 1688472000
}

Every request validated:
- Token signature (HS256)
- Expiration
- Tenant isolation (RLS)
- Permission check (RBAC)
- Audit logging
```

**Integration Challenge:**

1. **Token Lifecycle Management:**
   - JWT acquisition (login flow)
   - Token refresh (before expiration)
   - Device tracking (multi-device sessions)
   - Logout & token revocation

2. **Role-Based Visibility:**
   - Frontend must hide/disable UI based on permissions
   - Server enforces actual rules (defense in depth)
   - Permission mismatches expose security gaps

3. **Multi-Account Support:**
   - Backend supports B2B partners, resellers, B2C customers
   - Frontend currently hardcoded to single account
   - Account switching flow needed

**Recommended Solution:**

```javascript
// New auth flow with JWT

// 1. Login
const loginMutation = useMutation({
  mutationFn: async (credentials) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    return response.json(); // { accessToken, refreshToken, expiresIn }
  },
  onSuccess: (data) => {
    // Store tokens securely
    localStorage.setItem('accessToken', data.accessToken); // ⚠️ HTTPONLY in production
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('expiresAt', Date.now() + data.expiresIn * 1000);
  }
});

// 2. API Interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Token Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try refresh
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        // Retry original request
        return apiClient(error.config);
      } else {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

**Implementation Roadmap:**
- **Week 1 (Phase 1):** Auth API endpoints + JWT token handling
- **Week 2-3:** Frontend login/logout + token lifecycle
- **Week 4-6 (Phase 2):** Permission-based UI rendering
- **Week 7-8:** Audit logging + compliance validation

**Risk Level:** 🔴 CRITICAL — Security gap until complete

---

### Gap 3: Real-Time Synchronization (HIGH)

**Problem:** Frontend uses synchronous state mutations; Backend needs async event streams for multi-user scenarios.

**Current Frontend (Synchronous):**
```javascript
// Two users editing the same order simultaneously

// User 1
approveOrder(orderId); // Immediately updates window.sim → localStorage

// User 2
approveOrder(orderId); // Also immediately updates window.sim → localStorage

// Result: Both state changes lose data
```

**Backend Requirement (Eventual Consistency):**
```
User 1 POST /orders/{id}/approve
  → Backend: Validate state, emit OrderApprovedEvent
  → Database updated
  → Event broadcast to all subscribed clients

User 2 (same time)
  POST /orders/{id}/approve
  → Backend: REJECTS (order already approved)
  → Error response: { code: "STATE_INVALID", message: "Order is already approved" }
```

**Integration Challenge:**

1. **Stale Data on Refresh:**
   - User makes changes offline
   - Refreshes page → localStorage lost
   - API has source of truth but browser has no cache

2. **Optimistic UI vs Server Reality:**
   - Frontend updates UI immediately
   - Server validation fails (other user already approved)
   - UI must rollback (jarring UX)

3. **Event Ordering:**
   - WebSocket events may arrive out-of-order
   - Must reconstruct consistent state

**Recommended Solution (Phase 2):**

```javascript
// WebSocket subscription to real-time updates

const useRealtimeQuotes = (tenantId) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(`wss://api.joinery.local/ws/quotes?tenant_id=${tenantId}`);

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);

      // update = { type: "quote.status_changed", id: "q123", status: "approved", changedBy: "user-456" }

      queryClient.setQueryData(['quotes', update.id], (old) => ({
        ...old,
        status: update.status,
        updatedAt: update.timestamp,
        changedBy: update.changedBy
      }));
    };

    return () => ws.close();
  }, [tenantId, queryClient]);
};
```

**Implementation Roadmap:**
- **Phase 1:** HTTP polling (inefficient but simple)
- **Phase 2:** WebSocket subscriptions (real-time)
- **Phase 3:** Event sourcing + snapshot mechanism

**Risk Level:** 🟠 HIGH — Workaround possible but limiting

---

### Gap 4: API Contract Specification (HIGH)

**Problem:** Backend plan has high-level endpoint visions; Frontend needs detailed request/response contracts.

**Backend Plan (Vague):**
```
POST /api/v1/quotes/{quoteId}/approve
"Approve a quote and transition to order creation"
```

**Frontend Needs (Specific):**
```
Request:
  POST /api/v1/quotes/{quoteId}/approve
  {
    approvalReason?: string,
    notifyCustomer?: boolean
  }

Response 200:
  {
    id: "q123",
    status: "approved",
    order: {
      id: "o456",
      createdAt: "2026-07-02T..."
    },
    updatedAt: "2026-07-02T...",
    approvedBy: { id, email, name }
  }

Response 400 (Validation Error):
  {
    code: "VALIDATION_FAILED",
    errors: [
      { field: "quoteId", message: "Quote not found" }
    ]
  }

Response 422 (State Invalid):
  {
    code: "STATE_INVALID",
    message: "Quote cannot be approved from 'draft' status",
    currentStatus: "draft",
    allowedTransitions: ["send_to_customer", "cancel"]
  }

Response 401 (Unauthorized):
  {
    code: "UNAUTHORIZED",
    message: "You do not have 'quote.approve' permission"
  }
```

**Integration Challenge:**

1. **Frontend Teams Code Independently:**
   - Backend writes API without frontend input
   - Frontend writes UI expecting different response format
   - Discovery happens during integration (late, painful)

2. **Error Response Consistency:**
   - Does 400 mean validation or state error?
   - How does frontend distinguish retry-able vs terminal failures?
   - What fields are always present?

3. **Pagination & Filtering:**
   - Backend plan mentions "token-based pagination"
   - Frontend audit doesn't address table performance
   - How many items per page? What filters?

**Recommended Solution:**

OpenAPI 3.1 spec written **BEFORE coding** (contract-first development)

```yaml
openapi: 3.1.0
info:
  title: JoineryTech API
  version: 1.0.0

paths:
  /quotes/{quoteId}/approve:
    post:
      summary: Approve a quote
      parameters:
        - name: quoteId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                approvalReason:
                  type: string
                  nullable: true
                notifyCustomer:
                  type: boolean
                  default: false
      responses:
        '200':
          description: Quote approved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Quote'
        '400':
          $ref: '#/components/responses/ValidationError'
        '422':
          $ref: '#/components/responses/StateInvalidError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
```

**Implementation Roadmap:**
- **Week 1 (Phase 0):** Write full OpenAPI spec for core modules (CRM, Sales, Warehouse)
- **Week 2-4 (Phase 1):** Backend code-gen from spec
- **Week 4-6:** Frontend integration tests against spec
- **Ongoing:** Spec updates as design evolves

**Risk Level:** 🟠 HIGH — Delays start but saves weeks later

---

### Gap 5: Error Handling & Resilience (HIGH)

**Problem:** Frontend audit doesn't address API error recovery; Backend plan assumes standard HTTP semantics.

**Frontend Current Approach:**
```javascript
// Synchronous actions, no error handling beyond try-catch
const approveQuote = (quoteId) => {
  try {
    const quote = sim.quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Quote not found');
    if (quote.status !== 'sent') throw new Error('Cannot approve from this status');
    quote.status = 'approved';
    persistToLocalStorage();
  } catch (e) {
    console.error(e); // ⚠️ User sees nothing
  }
};
```

**Backend Requirement:**
```
Every API call can fail with:
  400 — Validation error (fix input, retry)
  401 — Token expired (refresh, retry)
  403 — Permission denied (show error, don't retry)
  409 — Conflict (state changed, retry with fresh data)
  422 — State invalid (guide user to correct state, don't retry)
  429 — Rate limit (backoff + retry)
  500 — Server error (log, retry with exponential backoff)
```

**Integration Challenge:**

1. **Retry Logic Complexity:**
   - Which errors are retry-able?
   - How long to wait between retries?
   - Max retry attempts?

2. **User Communication:**
   - Show transient errors (network) differently from terminal errors (permissions)
   - Offer recovery actions (login again, refresh state, try later)

3. **Offline Handling:**
   - Frontend currently works offline (localStorage)
   - API requires network
   - Transition strategy needed

**Recommended Solution:**

```javascript
// Utility: Retry with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Determine if retry-able
      const status = error.response?.status;
      const isRetryable = [408, 429, 500, 502, 503, 504].includes(status);

      if (!isRetryable || i === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// Usage
const approveQuoteMutation = useMutation({
  mutationFn: (quoteId) => retryWithBackoff(
    () => api.post(`/quotes/${quoteId}/approve`)
  ),
  onError: (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    if (status === 401) {
      toast.error('Session expired. Please log in again.');
      redirectToLogin();
    } else if (status === 403) {
      toast.error('You do not have permission to approve quotes.');
    } else if (status === 422 && code === 'STATE_INVALID') {
      toast.error('Quote status has changed. Please refresh.');
      queryClient.invalidateQueries(['quotes']);
    } else if ([500, 502, 503].includes(status)) {
      toast.warning('Server error. Retrying...');
    } else {
      toast.error(error.response?.data?.message || 'Failed to approve quote.');
    }
  }
});
```

**Implementation Roadmap:**
- **Week 1-2 (Phase 1):** Error response standardization (Backend)
- **Week 2-3:** Frontend error handling library + toasts
- **Week 4-6 (Phase 2):** Retry logic + exponential backoff
- **Week 7-8:** Offline queue simulation (Phase 3 stretch goal)

**Risk Level:** 🟠 HIGH — Essential for production stability

---

### Gap 6: Performance Migration Path (HIGH)

**Problem:** Frontend audit identified 4.2 MB build with 488 KB monolith; Backend assumes modularized state.

**Current Frontend:**
- Single `app-store.jsx` with all state + actions
- No code splitting (all 108 JSX files loaded immediately)
- No tree-shaking (Babel + Tailwind from CDN)

**Backend Assumption:**
- API responses are fine-grained (one entity per response)
- Client caches what it needs (TanStack Query)
- Build can be modularized by feature (code splitting)

**Integration Challenge:**

1. **Monolith → Modular Transition:**
   - app-store.jsx (9,087 lines) must split into domain slices
   - Each domain has independent API calls + caching
   - Coordination logic for cross-domain features

2. **Build Optimization:**
   - Move from CDN Babel to build-time transpilation (Vite)
   - Implement Tailwind PurgeCSS (saves 40 KB)
   - Add code splitting for lazy-loaded pages

3. **Migration Timeline Collision:**
   - Backend Phase 1: Auth + Catalog API
   - Frontend Phase 1: Rebuild for modularization + add TanStack Query
   - **Both must complete before Phase 2 can start**

**Recommended Solution:**

```
Frontend Build Roadmap (parallel with Backend Phase 1):

Week 1: Vite + build-time transpilation
  - Add Vite + TailwindCSS PostCSS
  - Build: 4.2 MB → 2.8 MB

Week 2: TanStack Query + store refactor
  - Add React Query + hooks
  - Remove window.sim dependency from 20 components

Week 3: App-store modularization
  - Split by domain: /hooks/useCRM, /hooks/useSales, /hooks/useWarehouse
  - 9,087 lines → 5 files × 1,800 lines

Week 4: Code splitting + lazy loading
  - Lazy-load page-procurement2, page-sales-detail, page-mfg-prep
  - Route-based bundling: 4 main bundles (Sales, Procurement, Manufacturing, Design)
  - Build: 2.8 MB → 1.8–2.2 MB

Week 5-6: Integration testing with Auth API
  - Connect to /api/v1/auth endpoints
  - Test JWT token refresh flow
```

**Risk Level:** 🟠 HIGH — Foundational, blocks Phase 1-2 integration

---

### Gap 7: Data Validation Alignment (MEDIUM)

**Problem:** Frontend has ad-hoc validation; Backend implements domain rules via FSM + DDD.

**Current Frontend Validation (Weak):**
```javascript
// item-builder.jsx
const validateItemCode = (code) => {
  return code.length > 0 && /^[A-Z0-9\-]+$/.test(code);
};

// No check for duplicates
// No check for reserved codes
// No check for customer-specific restrictions
```

**Backend Validation (Strong):**
```csharp
// CatalogItem Aggregate Root
public class CatalogItem : AggregateRoot
{
  private CatalogItem(ItemCode code, string name, TenantId tenantId)
  {
    Code = CatalogItemCode.Create(code).Value; // ✓ Throws if invalid
    Name = ItemName.Create(name).Value;        // ✓ Throws if invalid
    TenantId = tenantId;
  }

  // ValueObject: CatalogItemCode
  public static Result<CatalogItemCode> Create(string code)
  {
    if (string.IsNullOrWhiteSpace(code))
      return Result.Failure($"Item code cannot be empty");

    if (code.Length > 50)
      return Result.Failure($"Item code must be <= 50 chars");

    if (!Regex.IsMatch(code, @"^[A-Z0-9\-]+$"))
      return Result.Failure($"Item code must contain only uppercase letters, digits, dashes");

    return Result.Success(new CatalogItemCode(code));
  }
}
```

**Integration Challenge:**

1. **Duplicate Validation:**
   - Business rules written twice (frontend JavaScript + backend C#)
   - Risk of divergence
   - Maintenance burden

2. **Validation Timing:**
   - Frontend: immediate as-you-type
   - Backend: on submit (HTTP request)
   - User sees green check, then API rejects?

3. **Localization:**
   - Error messages in frontend (hardcoded strings)
   - Error messages from backend (API response)
   - Inconsistent UX

**Recommended Solution:**

```javascript
// Frontend uses backend validation as source of truth

// 1. Server-side validation rules exported to OpenAPI spec
// (OpenAPI includes examples of invalid inputs)

// 2. Frontend generates validators from OpenAPI
// Tools: @openapi-generator-plus/typescript-fetch-client

// 3. Frontend uses library validators for UX feedback only
// (Red squiggle immediately, but trust server validation)

const CreateQuoteForm = () => {
  const [customerCode, setCustomerCode] = useState('');
  const [error, setError] = useState(null);

  // 1. Async validation (server-side)
  const validateCustomerCode = useCallback(
    debounce(async (code) => {
      if (!code) {
        setError(null);
        return;
      }

      try {
        const response = await api.post('/quotes/validate', { customerCode: code });
        setError(null); // Valid
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid customer code');
      }
    }, 300),
    []
  );

  return (
    <input
      value={customerCode}
      onChange={(e) => {
        setCustomerCode(e.target.value);
        validateCustomerCode(e.target.value);
      }}
      aria-invalid={!!error}
      className={error ? 'ring-2 ring-red-500' : ''}
    />
  );
};
```

**Implementation Roadmap:**
- **Week 2-3 (Phase 1):** Define validation rules in OpenAPI spec
- **Week 4-6:** Generate TypeScript validators from OpenAPI
- **Week 7-8:** Update frontend forms to use generated validators

**Risk Level:** 🟡 MEDIUM — Can work around, improve over time

---

### Gap 8: Testing Strategy (MEDIUM)

**Problem:** Frontend audit doesn't mention tests; Backend plan assumes API contract testing.

**Current Frontend (No Tests):**
- No Jest/Vitest setup
- No E2E tests (Cypress/Playwright planned but not implemented)
- Manual QA only

**Backend Requirement:**
- API integration tests for each endpoint
- Contract tests (verify request/response structure)
- FSM state transition tests

**Integration Challenge:**

1. **Test Environment Setup:**
   - Need test API server (sandbox)
   - Need test data fixtures
   - Database cleanup between tests

2. **Frontend Integration Tests:**
   - Must test against API sandbox, not localStorage
   - Async mutation testing (wait for API response)
   - Error scenario testing (401, 422, 500)

3. **E2E Test Coverage:**
   - Login flow
   - Quote creation → approval → order
   - Error recovery (retry, fallback)

**Recommended Solution:**

```javascript
// Vitest + Testing Library for components
// Playwright for E2E

// 1. Component test (Quote approval)
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { QuoteCard } from './QuoteCard';
import { apiMock } from '@/__mocks__/api';

describe('QuoteCard Approval', () => {
  it('should approve a quote and show success message', async () => {
    const quote = {
      id: 'q123',
      status: 'sent',
      customerName: 'Acme Corp',
      amount: 5000
    };

    apiMock.post('/quotes/q123/approve').reply(200, {
      ...quote,
      status: 'approved'
    });

    render(
      <QueryClientProvider client={testQueryClient}>
        <QuoteCard quote={quote} />
      </QueryClientProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByText(/approved successfully/i)).toBeInTheDocument();
    });
  });

  it('should show error if approval fails', async () => {
    const quote = { id: 'q123', status: 'draft' };

    apiMock.post('/quotes/q123/approve').reply(422, {
      code: 'STATE_INVALID',
      message: 'Cannot approve from draft status'
    });

    render(
      <QueryClientProvider client={testQueryClient}>
        <QuoteCard quote={quote} />
      </QueryClientProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByText(/cannot approve from draft/i)).toBeInTheDocument();
    });
  });
});

// 2. E2E test (Full quote lifecycle)
import { test, expect } from '@playwright/test';

test('Quote lifecycle: Create → Approve → Order', async ({ page }) => {
  // 1. Login
  await page.goto('http://localhost:5173/login');
  await page.fill('input[name="email"]', 'sales@acme.com');
  await page.fill('input[name="password"]', 'demo-password');
  await page.click('button:has-text("Sign In")');

  // 2. Wait for dashboard
  await page.waitForNavigation();
  expect(page.url()).toContain('/dashboard');

  // 3. Create new quote
  await page.click('button:has-text("New Quote")');
  await page.fill('input[name="customerCode"]', 'ACME-001');
  await page.click('button:has-text("Create")');

  // 4. Add line items
  const quoteId = page.url().match(/quotes\/(q\d+)/)[1];
  await page.fill('input[name="itemCode"]', 'CABINET-A');
  await page.fill('input[name="quantity"]', '10');
  await page.click('button:has-text("Add Item")');

  // 5. Send for approval
  await page.click('button:has-text("Send")');
  await expect(page.locator('text=Quote sent')).toBeVisible();

  // 6. Approve (as manager)
  // Logout + login as manager
  await page.goto('http://localhost:5173/quotes/' + quoteId);
  await page.click('button:has-text("Approve")');
  await expect(page.locator('text=Quote approved')).toBeVisible();

  // 7. Verify order was created
  await page.click('text=Order created');
  expect(page.url()).toContain('/orders/o');
});
```

**Implementation Roadmap:**
- **Week 3-4 (Phase 1):** Vitest setup + component test examples
- **Week 5-6:** E2E Playwright tests for happy paths
- **Week 7-8 (Phase 2):** Error scenario testing + coverage goals

**Risk Level:** 🟡 MEDIUM — Optional for Phase 1 start, essential for Phase 2+

---

## 3. Integration Checklist — Phase 1 Readiness

### Pre-Phase 1: Architecture Alignment (Week -1 to 0)

- [ ] **API Contract Specification**
  - [ ] Write full OpenAPI 3.1 spec for Auth, Catalog, CRM, Sales modules
  - [ ] Include request/response examples for 200, 400, 401, 422, 500
  - [ ] Share spec with Frontend team for feedback
  - [ ] Lock spec before implementation starts

- [ ] **Frontend State Architecture**
  - [ ] Design TanStack Query structure (hooks, query keys)
  - [ ] Plan app-store → TanStack Query migration
  - [ ] Identify Phase 1 scope (Auth only, no transactional state)
  - [ ] Design fallback strategy (localStorage cache during Phase 1)

- [ ] **Auth System Design**
  - [ ] JWT token structure (payload fields)
  - [ ] Token refresh mechanism (endpoint, rotation)
  - [ ] RBAC model (roles, permissions, resource constraints)
  - [ ] Role -> Permission mapping table

- [ ] **Error Handling Framework**
  - [ ] Define HTTP status codes for each error type
  - [ ] Error response schema (consistent structure)
  - [ ] Frontend error handling library (Toast/Alert patterns)
  - [ ] Retry logic (which errors, backoff strategy)

### Phase 1: Core Infrastructure (Weeks 1-4)

**Backend (Weeks 1-4):**
- [ ] Auth API endpoints (login, refresh, logout)
- [ ] Catalog API endpoints (GET /catalog, GET /catalog/{id})
- [ ] Permission system (RBAC + RLS in PostgreSQL)
- [ ] API Gateway setup (routing + error normalization)

**Frontend (Weeks 1-4, parallel):**
- [ ] Vite setup + build optimization
- [ ] TanStack Query integration
- [ ] JWT token handling (storage, refresh interceptor)
- [ ] Login form + auth flow
- [ ] Error handling library + Toast notifications

**Integration Testing:**
- [ ] API contract tests (Backend)
- [ ] Component tests for auth flow (Frontend)
- [ ] API mocks for Frontend tests

### Phase 1 Exit Criteria

- [ ] Auth flow works end-to-end (login → JWT → refresh)
- [ ] Catalog API returns data correctly
- [ ] Frontend can fetch catalog data and display it
- [ ] Error responses follow spec; Frontend handles them correctly
- [ ] Logout clears tokens and redirects to login
- [ ] 80% test coverage for auth module
- [ ] API response time < 200ms (p95)

---

## 4. Risk Assessment & Mitigation

### High-Priority Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| **State management mismatch causes data loss** | CRITICAL | HIGH | Early spike: prototype state migration with TanStack Query |
| **API contract undefined, causes rework** | CRITICAL | MEDIUM | Write OpenAPI spec Week 0; use contract testing |
| **JWT token expiration breaks user sessions** | HIGH | MEDIUM | Implement refresh logic early; test token rotation edge case |
| **App-store monolith blocks performance improvement** | HIGH | MEDIUM | Modularize in parallel with API implementation |
| **localStorage fallback creates inconsistency** | HIGH | LOW | Phase 1 = Auth only (no transactional state) |

### Medium-Priority Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| **Real-time sync complexity delayed to Phase 2** | MEDIUM | HIGH | Accept as Phase 2 scope; document polling strategy for Phase 1 |
| **Validation rule divergence (frontend vs backend)** | MEDIUM | MEDIUM | Generate validators from OpenAPI spec |
| **Performance gains not realized by Phase 3** | MEDIUM | MEDIUM | Plan code splitting from Week 1; measure continuously |

---

## 5. Recommendations

### 1. Contract-First Development (Critical Path)

**Action:** Write OpenAPI 3.1 spec for entire Phase 1 **before** Backend and Frontend coding starts.

**Timeline:** Week 0 (3-4 days)
**Owner:** Architect (with Backend + Frontend input)
**Deliverable:** `/opt/spaceos/docs/joinerytech/API_SPEC_PHASE1.yaml`

### 2. Parallel Frontend Modernization (Blocking)

**Action:** Frontend must complete Vite migration + TanStack Query integration **in parallel** with Backend API development.

**Timeline:** Weeks 1-4 (Phase 1)
**Owner:** Frontend Terminal
**Deliverable:** Modularized frontend build, ready for API integration

### 3. Early Integration Spike (Risk Mitigation)

**Action:** Week 2 = Backend ships Auth API; Frontend connects immediately.
- Not waiting for all endpoints
- Test token refresh edge cases
- Validate error handling assumptions

**Timeline:** Weeks 2-3
**Owner:** Backend + Frontend
**Deliverable:** Full auth flow working end-to-end

### 4. Validation Rule Extraction (Medium Priority)

**Action:** After API spec locked, generate TypeScript validators for Frontend.

**Timeline:** Weeks 3-4
**Owner:** Backend + Frontend (code-gen setup)
**Deliverable:** `@generated/validators` library in Frontend

### 5. Real-Time Strategy Decision (Phase Boundary)

**Action:** Phase 1 = HTTP polling only (no WebSocket). Phase 2 = Evaluate WebSocket vs GraphQL subscriptions.

**Timeline:** Week 4 (Phase 1 exit review)
**Owner:** Architect + Tech Lead
**Deliverable:** Real-Time Implementation Plan v1.0

---

## 6. Success Metrics

### Phase 1 Success (End of Week 4)

| Metric | Target | Measurement |
|--------|--------|------------|
| **API Response Time** | < 200ms (p95) | APM dashboard (Serilog/ELK) |
| **Frontend Build Size** | 2.2 MB (from 4.2 MB) | Bundlesize script |
| **Test Coverage** | ≥ 80% (auth module) | Jest/Vitest coverage report |
| **Auth Flow Success Rate** | 99.5% | Login funnel analytics |
| **Error Handling** | 100% of error codes tested | E2E test results |

### Phase 2-3 Success (End of Week 20)

| Metric | Target | Measurement |
|--------|--------|------------|
| **API Response Time** | < 300ms (p95) across all endpoints | APM dashboard |
| **Frontend Performance** | Lighthouse score ≥ 85 | Lighthouse CI |
| **Real-Time Sync Latency** | < 500ms event delivery | WebSocket metrics |
| **Offline Capability** | No offline support (API-only) | Feature test |
| **Data Consistency** | 0 data loss incidents | Error tracking (Sentry) |

---

## 7. Appendix: Reference Documents

**Backend Architecture Plan:**
- Location: `/opt/spaceos/docs/joinerytech/BACKEND_ARCHITECTURE_PLAN.md`
- Sections: Tech Stack (11 sections), 1,371 lines
- Key: DDD/FSM patterns, PostgreSQL RLS, 3-phase migration

**Frontend UI/UX Audit:**
- Location: `/opt/spaceos/docs/joinerytech/AUDIT_UI_PERFORMANCE_A11Y_2026-07-02.md`
- Findings: Performance (488 KB monolith), UX (navigation), A11y (keyboard nav)
- Key: 50%+ build size reduction possible, state management redesign needed

**Project Status:**
- Location: `/opt/spaceos/docs/joinerytech/PROJECT_STATUS.md`
- Context: 40+ modules, localStorage prototype, 108 JSX files

---

## Document Sign-Off

**Prepared by:** Explorer Terminal
**Date:** 2026-07-02 07:45 UTC
**Status:** Ready for Architect Review

**Next Steps:**
1. Architect reviews integration gaps (target: same day)
2. Root approves Phase 1 readiness plan
3. Backend + Frontend begin Week 0 (OpenAPI spec writing)
4. Weekly integration sync during Phase 1

---

**End of Integration Readiness Assessment**
