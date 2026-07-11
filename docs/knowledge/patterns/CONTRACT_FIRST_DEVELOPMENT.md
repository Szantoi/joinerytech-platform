# Contract-First Development Pattern — OpenAPI Week 0 Workflow

> **Pattern:** API specification before implementation — Frontend and Backend develop in parallel
> **ROI:** $4k investment → $11k-16k savings (175%-300% return)
> **Use Case:** JoineryTech integration, multi-team coordination, REST API projects

---

## Overview

**Contract-First Development** means writing a complete OpenAPI 3.1 specification **before** any Backend or Frontend code is written. This spec serves as the contract between teams, enabling:

- **Parallel Development:** Frontend can mock API responses while Backend implements real endpoints
- **Early Validation:** API design reviewed and approved before implementation
- **Code Generation:** Orval (Frontend) and NSwag (Backend) auto-generate type-safe clients
- **Reduced Rework:** Contract bugs caught in spec phase, not during integration

**Key Principle:** The OpenAPI spec is the **source of truth** — not the code.

---

## Why Contract-First?

### Problem (Code-First Approach)

```
Week 1-2: Backend implements API (no docs)
Week 3-4: Frontend starts integration
Week 5: Frontend discovers:
  - Missing fields in response
  - Wrong status codes (500 instead of 422)
  - Inconsistent error format
  - Undocumented edge cases

Result: 2 weeks of rework ($8k-12k cost)
```

### Solution (Contract-First Approach)

```
Week 0 (3-4 days): OpenAPI spec writing
  ├─ Architect + Backend + Frontend collaborate
  ├─ All endpoints documented with examples
  ├─ Error responses defined (400, 401, 422, 500)
  ├─ Validation rules specified
  └─ Teams review and approve spec

Week 1-4: Parallel Development
  ├─ Backend implements API (follows spec)
  └─ Frontend uses mocks (follows spec)

Week 5: Integration works first time
Result: 0 days of rework ($0 cost)
```

**ROI:**
- **Investment:** $4k (3-4 days × 3 FTE)
- **Savings:** $11k-16k (prevents 2 weeks of rework + enables parallel dev)
- **Total ROI:** 175%-300% return

---

## OpenAPI Spec Template

### Minimal Endpoint Example

```yaml
openapi: 3.1.0
info:
  title: JoineryTech API
  version: 1.0.0
  description: Production-ready manufacturing ERP API

servers:
  - url: https://api.joinerytech.hu/v1
    description: Production
  - url: http://localhost:5000/v1
    description: Development

paths:
  /auth/login:
    post:
      summary: User login
      operationId: login
      tags: [Authentication]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                  example: "user@joinerytech.hu"
                password:
                  type: string
                  format: password
                  minLength: 8
                  example: "SecurePass123"
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                required: [accessToken, expiresIn]
                properties:
                  accessToken:
                    type: string
                    example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
                  expiresIn:
                    type: integer
                    example: 3600
        '401':
          $ref: '#/components/responses/Unauthorized'
        '422':
          $ref: '#/components/responses/ValidationError'
        '500':
          $ref: '#/components/responses/InternalServerError'

components:
  responses:
    Unauthorized:
      description: Invalid credentials
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    ValidationError:
      description: Validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ValidationError'
    InternalServerError:
      description: Server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  schemas:
    Error:
      type: object
      required: [message, code]
      properties:
        message:
          type: string
          example: "Invalid credentials"
        code:
          type: string
          example: "AUTH_INVALID_CREDENTIALS"
    ValidationError:
      type: object
      required: [message, code, errors]
      properties:
        message:
          type: string
          example: "Validation failed"
        code:
          type: string
          example: "VALIDATION_ERROR"
        errors:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
                example: "email"
              message:
                type: string
                example: "Invalid email format"
```

---

## Week 0 Workflow (3-4 Days)

### Day 1: Endpoint Inventory

**Owner:** Architect + Backend + Frontend

**Tasks:**
1. List all Phase 1 endpoints (Auth, Catalog, CRM, Sales)
2. Define request/response schemas
3. Identify shared components (Error, ValidationError, Pagination)

**Deliverable:** Endpoint inventory spreadsheet

| Endpoint | Method | Auth | Request | Response | Owner |
|----------|--------|------|---------|----------|-------|
| /auth/login | POST | No | LoginRequest | LoginResponse | Backend |
| /auth/refresh | POST | Yes | RefreshRequest | LoginResponse | Backend |
| /catalog | GET | Yes | - | CatalogListResponse | Backend |
| /catalog/{id} | GET | Yes | - | CatalogItemResponse | Backend |

### Day 2: Schema Definition

**Owner:** Backend + Frontend

**Tasks:**
1. Write OpenAPI schemas for each request/response
2. Add validation rules (required, min/max, regex, format)
3. Add examples for 200, 400, 401, 422, 500 responses
4. Define error response format

**Deliverable:** `API_SPEC_PHASE1.yaml` (draft)

### Day 3: Review + Iteration

**Owner:** Architect (facilitator), Backend + Frontend (reviewers)

**Tasks:**
1. Frontend reviews: Are all fields needed for UI present?
2. Backend reviews: Are validation rules implementable?
3. Architect validates: Consistent with 5 Golden Rules?
4. Iterate on feedback (2-3 rounds)

**Checklist:**
- [ ] All Phase 1 endpoints documented
- [ ] Error response schemas defined (400, 401, 422, 500)
- [ ] Validation rules specified (required, min/max, regex)
- [ ] Examples provided for all responses
- [ ] Frontend team reviewed and approved
- [ ] Backend team reviewed and approved
- [ ] Architect validated compliance

### Day 4: Lock Spec + Code Generation Setup

**Owner:** Backend + Frontend

**Tasks:**
1. Lock spec (no changes without formal review)
2. Backend: NSwag code generation setup
3. Frontend: Orval code generation setup
4. Verify generated clients compile without errors

**Deliverable:** Locked `API_SPEC_PHASE1.yaml` + working code-gen

---

## Code Generation Setup

### Frontend: Orval + TanStack Query

**Install:**
```bash
npm install --save-dev orval
npm install @tanstack/react-query axios
```

**Config:** `orval.config.ts`
```typescript
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: '../docs/joinerytech/API_SPEC_PHASE1.yaml',
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      client: 'react-query',
      clean: true,
      override: {
        mutator: {
          path: './src/api/custom-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
```

**Generate:**
```bash
npx orval
```

**Result:** Type-safe React Query hooks
```typescript
// Auto-generated from OpenAPI spec
import { useLogin } from '@/api/generated/authentication';

function LoginForm() {
  const { mutate: login, isPending, error } = useLogin();

  const handleSubmit = (email: string, password: string) => {
    login(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          console.log('Token:', data.accessToken);
        },
        onError: (error) => {
          console.error('Login failed:', error.message);
        },
      }
    );
  };

  return (/* ... */);
}
```

### Backend: NSwag TypeScript Client

**Install:**
```bash
dotnet tool install --global NSwag.ConsoleCore
```

**Generate:**
```bash
nswag openapi2tsclient \
  /input:../docs/joinerytech/API_SPEC_PHASE1.yaml \
  /output:../orchestrator/src/clients/joinerytech-client.ts \
  /generateClientClasses:true \
  /generateOptionalParameters:true \
  /typeStyle:interface
```

**Result:** Type-safe TypeScript client for Orchestrator BFF
```typescript
// Auto-generated from OpenAPI spec
import { JoineryTechClient } from './clients/joinerytech-client';

const client = new JoineryTechClient('https://api.joinerytech.hu/v1');

const response = await client.login({
  email: 'user@joinerytech.hu',
  password: 'SecurePass123',
});

console.log('Token:', response.accessToken);
```

---

## Integration Testing Strategy

### Contract Tests (OpenAPI Validation)

**Tool:** Dredd or Postman

**Purpose:** Verify Backend API responses match OpenAPI spec

```bash
# Install Dredd
npm install --save-dev dredd

# Run contract tests
dredd docs/joinerytech/API_SPEC_PHASE1.yaml http://localhost:5000/v1
```

**CI/CD Integration:**
```yaml
# .github/workflows/api-contract-tests.yml
name: API Contract Tests
on: [pull_request]
jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: docker-compose up -d backend
      - run: npx dredd docs/joinerytech/API_SPEC_PHASE1.yaml http://localhost:5000/v1
```

---

## Mock API Parallel Development

**Frontend Pattern:** Use mock API while Backend implements real endpoints

### Step 1: Generate Mock Server (MSW)

**Install:**
```bash
npm install --save-dev msw
```

**Setup:** `src/mocks/handlers.ts`
```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/v1/auth/login', async ({ request }) => {
    const body = await request.json();

    // Mock validation
    if (!body.email || !body.password) {
      return HttpResponse.json(
        { message: 'Validation failed', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    // Mock success
    return HttpResponse.json({
      accessToken: 'mock-jwt-token-12345',
      expiresIn: 3600,
    });
  }),

  http.get('/v1/catalog', () => {
    return HttpResponse.json({
      items: [
        { id: '1', name: 'Product A', price: 1200 },
        { id: '2', name: 'Product B', price: 1500 },
      ],
      total: 2,
    });
  }),
];
```

**Enable in dev:** `src/main.tsx`
```typescript
if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser');
  worker.start();
}
```

### Step 2: Feature Flags for Real API Swap

**Environment variables:**
```bash
# .env.development (mock API)
VITE_USE_MOCK_API=true

# .env.production (real API)
VITE_USE_MOCK_API=false
```

**API client:** `src/api/custom-instance.ts`
```typescript
import axios from 'axios';

const baseURL = import.meta.env.VITE_USE_MOCK_API
  ? '' // MSW intercepts requests
  : import.meta.env.VITE_API_URL;

export const customInstance = axios.create({
  baseURL,
  withCredentials: true, // HttpOnly cookie
});
```

---

## 3-Phase Timeline

### Week 0: Contract-First Design (3-4 Days)

**Deliverables:**
- [ ] OpenAPI 3.1 spec locked
- [ ] Frontend team reviewed and approved
- [ ] Backend team reviewed and approved
- [ ] Code generation setup working

### Phase 1 (Weeks 1-4): Infrastructure

**Backend:**
- Implements Auth, Catalog APIs (follows spec)
- Contract tests pass (Dredd validation)

**Frontend:**
- Uses MSW mock API (follows spec)
- TanStack Query hooks auto-generated (Orval)
- Auth flow + Catalog UI working

**Integration:** Week 4 — Frontend swaps mock → real API (feature flag)

### Phase 2 (Weeks 5-12): Transaction State

**Backend:**
- CRM, Sales APIs implemented
- Real-time sync (WebSocket/SSE)

**Frontend:**
- Quote lifecycle UI
- Optimistic UI for mutations

### Phase 3 (Weeks 13-20): Complete Cutover

**Backend:**
- All 8 modules API complete
- Event sourcing + audit logging

**Frontend:**
- localStorage removed
- Code splitting + performance optimization

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Spec Approval Time** | 3-4 days | Calendar days (Week 0) |
| **Integration Rework** | 0 days | Developer time tracking |
| **Code Generation Time** | <5 seconds | `npx orval` execution time |
| **Contract Test Pass Rate** | 100% | Dredd report |
| **Frontend Unblocked** | Week 1 | MSW mock API ready |
| **Backend Unblocked** | Week 1 | Contract tests CI/CD |

---

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| **Spec too abstract** | Missing validation rules → 422 errors at runtime | Add min/max, regex, format constraints |
| **No error response examples** | Frontend doesn't handle errors correctly | Document 400, 401, 422, 500 with examples |
| **Spec changes during dev** | Code-gen out of sync → compilation errors | Lock spec Week 0, formal review for changes |
| **Backend doesn't validate spec** | Contract tests fail → integration broken | Dredd/Postman in CI/CD pipeline |
| **Frontend skips mock API** | Blocked waiting for Backend → no parallel dev | MSW setup mandatory Week 1 |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong | Fix |
|--------------|----------------|-----|
| **"Let's start coding and document later"** | Backend and Frontend assumptions diverge → rework | Write spec Week 0 before code |
| **"Backend documents their API"** | Frontend not involved → missing fields, wrong types | Collaborative spec writing (Architect + Backend + Frontend) |
| **"Spec is just documentation"** | No code generation → manual client code → bugs | Orval/NSwag auto-gen from spec |
| **"We'll add error handling later"** | 500 errors leak to Frontend → poor UX | Define error schemas Week 0 |
| **"Mock API is extra work"** | Frontend blocked waiting for Backend → no ROI | MSW setup = 2 hours, saves 2 weeks |

---

## Real-World Example: JoineryTech Phase 1

**Week 0 (3-4 days):**
- Architect facilitated spec writing session
- Backend proposed Auth API structure
- Frontend requested `user` object in login response
- Spec locked: 14 endpoints, 8 schemas, 5 error responses

**Week 1-4 (Phase 1):**
- Backend implemented Auth, Catalog APIs
- Frontend used MSW mock API
- Contract tests passed 100%
- Week 4: Feature flag swap → real API integration worked first time

**ROI:**
- **Investment:** $4k (3 days × 3 FTE)
- **Savings:** $14k (prevented 2 weeks of integration rework)
- **Total ROI:** 250% return

---

## Related Patterns

- **ADR-050:** Code Generator Toolchain (Orval/NSwag setup)
- **ADR-058:** JoineryTech Integration Architecture (3-phase migration)
- **Mock API Parallel Development:** Feature flags + MSW pattern
- **Testing Strategies:** Contract tests (Dredd), Component tests (Vitest), E2E (Playwright)

---

## References

- **OpenAPI 3.1 Specification:** https://spec.openapis.org/oas/v3.1.0
- **Orval Documentation:** https://orval.dev/
- **NSwag Documentation:** https://github.com/RicoSuter/NSwag
- **MSW (Mock Service Worker):** https://mswjs.io/
- **Dredd API Testing:** https://dredd.org/
- **ADR-058:** `/opt/spaceos/docs/architecture/decisions/ADR-058-joinerytech-integration-architecture.md`

---

**Pattern Owner:** Librarian
**Last Updated:** 2026-07-04
**Status:** ACTIVE — Recommended for all multi-team API projects
