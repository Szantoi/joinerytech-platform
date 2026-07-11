# Testing Strategies — SpaceOS Platform

> **Version:** 1.0
> **Last Updated:** 2026-06-23
> **Source:** Explorer Codebase Patterns Analysis, Backend Testing Patterns, Frontend Testing Patterns
> **Maintained By:** Librarian

---

## OVERVIEW

This document defines the **testing strategy** for SpaceOS platform across all layers (L1-L4) and all modules. Testing is a core pillar of quality — **278/278 tests passing, 0 errors** demonstrates mature test-driven development culture.

**Purpose:**
- Define coverage targets for each layer
- Establish testing patterns (AAA, Testcontainers, probe-and-skip)
- Document test organization (unit, integration, E2E)
- Provide examples and best practices

**Test Philosophy:** "If it's not tested, it's broken."

---

## TESTING PYRAMID

```
           ▲
          ╱ ╲
         ╱ E2E ╲           60% — End-to-end workflows
        ╱───────╲
       ╱   INT   ╲         40% — Integration (API + Auth)
      ╱───────────╲
     ╱    UNIT     ╲       90% — Unit tests (Domain + Application)
    ╱───────────────╲
   ▼                 ▼
```

**SpaceOS Test Distribution:**
- **Unit Tests:** 90%+ coverage (Domain + Application layer)
- **Integration Tests:** 40%+ coverage (Controllers + Auth + Database)
- **E2E Tests:** 60% coverage (Critical workflows)

**Current Status:**
- Frontend: 37/37 tests ✅
- Backend: 241/241 tests ✅
- Total: 278/278 tests ✅

---

## LAYER TESTING STRATEGY

### L1: Kernel (.NET 8)

**Scope:** Auth, Audit, FSM, Escrow, Tenant management

**Coverage Targets:**
- **Domain layer:** ≥95% (critical business logic)
- **Application layer:** ≥90% (command handlers, queries)
- **Infrastructure layer:** ≥40% (database, external services)
- **API layer:** ≥40% (controllers, middleware)

**Test Types:**
- Unit tests: Domain entities, value objects, FSM transitions
- Integration tests: Auth middleware, tenant RLS, audit trails
- E2E tests: Tenant onboarding, user auth flow

**Example:**
```csharp
// Unit test: Tenant entity
public class TenantTests
{
    [Fact]
    public void CreateTenant_WithValidData_Succeeds()
    {
        // Arrange
        var name = "Doorstar Kft.";
        var slug = "doorstar";

        // Act
        var result = Tenant.Create(name, slug);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(name, result.Value.Name);
        Assert.Equal(slug, result.Value.Slug);
    }
}
```

### L2: Modules (.NET 8 — Joinery, Cutting, Identity, etc.)

**Scope:** Domain-specific business logic

**Coverage Targets:**
- **Domain layer:** ≥90% (business rules, FSM, value objects)
- **Application layer:** ≥90% (CQRS handlers)
- **Infrastructure layer:** ≥40% (repositories, providers)
- **API layer:** ≥40% (controllers, route handlers)

**Test Types:**
- Unit tests: Aggregate roots, domain events, value objects
- Integration tests: Database operations, RLS policies, event sourcing
- E2E tests: Module-specific workflows (quote → order, cutting plan → completion)

**Example:**
```csharp
// Unit test: CuttingPlan FSM
public class CuttingPlanTests
{
    [Fact]
    public void Assign_FromQueued_TransitionsToAssigned()
    {
        // Arrange
        var plan = CuttingPlan.Create(Guid.NewGuid(), "Plan-001").Value;
        var operatorId = Guid.NewGuid();
        var machineId = "MACHINE-01";

        // Act
        var result = plan.Assign(operatorId, machineId);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(CuttingPlanState.Assigned, plan.State);
        Assert.Contains(plan.DomainEvents, e => e is CuttingPlanAssigned);
    }

    [Fact]
    public void Assign_FromInProgress_Fails()
    {
        // Arrange
        var plan = CuttingPlan.Create(Guid.NewGuid(), "Plan-001").Value;
        plan.Assign(Guid.NewGuid(), "MACHINE-01");
        plan.Start();  // Now InProgress

        // Act
        var result = plan.Assign(Guid.NewGuid(), "MACHINE-02");

        // Assert
        Assert.True(result.IsFailure);
        Assert.Equal("Can only assign queued plans", result.Error);
    }
}
```

### L3: Orchestrator (Node.js 22)

**Scope:** LLM Tool Calling, API gateway, BFF logic

**Coverage Targets:**
- **Route handlers:** ≥70% (routing logic, validation)
- **LLM integration:** ≥50% (tool calling, prompt templates)
- **Middleware:** ≥60% (auth, rate limiting, logging)

**Test Types:**
- Unit tests: Validation schemas (Zod), route logic
- Integration tests: API proxying, LLM tool calling
- E2E tests: Complete LLM workflows (user query → tool call → response)

**Example:**
```typescript
// Unit test: Zod schema validation
describe('QuoteRequestSchema', () => {
  it('should validate valid quote request', () => {
    const valid = {
      customerName: 'Test Customer',
      doorType: 'swing-door',
      width: 900,
      height: 2100
    };

    const result = QuoteRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid width', () => {
    const invalid = {
      customerName: 'Test Customer',
      doorType: 'swing-door',
      width: -100,  // Invalid
      height: 2100
    };

    const result = QuoteRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].path).toEqual(['width']);
  });
});
```

### L4: Design Portal (React 18 + Vite)

**Scope:** UI components, state management, user workflows

**Coverage Targets:**
- **Components:** ≥80% (UI components, hooks)
- **State management:** ≥90% (Zustand stores, reducers)
- **Integration:** ≥60% (API calls, offline sync)

**Test Types:**
- Unit tests: Components (Vitest + Testing Library), custom hooks
- Integration tests: API integration, offline-first patterns
- E2E tests: User workflows (Playwright)

**Example:**
```typescript
// Unit test: useKPICalculator hook
describe('useKPICalculator', () => {
  it('should calculate partner KPIs correctly', () => {
    const { result } = renderHook(() => useKPICalculator({
      deliveredOrders: 100,
      totalOrders: 120,
      avgDeliveryTime: 5.2,
      qualityScore: 0.95
    }));

    expect(result.current.onTimeRate).toBe(0.833);  // 100/120
    expect(result.current.qualityGrade).toBe('A');   // ≥0.9
  });
});
```

---

## AAA PATTERN (ARRANGE-ACT-ASSERT)

### Pattern Description

**AAA** = Industry-standard test structure for clarity and maintainability.

```
┌─────────────────────────────────────────┐
│ ARRANGE: Setup test data, mocks        │
│ ACT:     Execute business logic         │
│ ASSERT:  Verify side effects, results   │
└─────────────────────────────────────────┘
```

### Implementation Guidelines

**1. Arrange Section:**
- Create test data
- Setup mocks/stubs
- Initialize dependencies
- **Tip:** Use factory methods for complex objects

**2. Act Section:**
- **One line only** — execute the method under test
- No conditionals, no loops
- **Tip:** If you need >1 line, you're testing too much

**3. Assert Section:**
- Verify return values
- Verify state changes
- Verify side effects (events, database writes)
- **Tip:** Use specific assertions (not just `Assert.True`)

### Example: Complete AAA

```csharp
public class SetOperatorPinHandlerTests
{
    [Fact]
    public async Task Handle_WithValidPin_UpdatesOperatorAndPublishesEvent()
    {
        // ============ ARRANGE ============
        // Test data
        var operatorId = Guid.NewGuid();
        var pinValue = "1234";

        // Mock dependencies
        var mockRepo = new Mock<IOperatorRepository>();
        var mockEventBus = new Mock<IEventBus>();

        var existingOperator = Operator.Create("John Doe", "john@example.com").Value;
        mockRepo.Setup(r => r.GetByIdAsync(operatorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(existingOperator);

        // System under test
        var handler = new SetOperatorPinHandler(mockRepo.Object, mockEventBus.Object);
        var command = new SetOperatorPinCommand(operatorId, pinValue);

        // ============ ACT ============
        var result = await handler.Handle(command, CancellationToken.None);

        // ============ ASSERT ============
        // Verify result
        Assert.True(result.IsSuccess);

        // Verify state change
        Assert.NotNull(existingOperator.Pin);
        Assert.Equal(pinValue, existingOperator.Pin.Value);

        // Verify side effects
        mockRepo.Verify(r => r.SaveAsync(existingOperator, It.IsAny<CancellationToken>()), Times.Once);
        mockEventBus.Verify(e => e.PublishAsync(
            It.Is<OperatorPinChanged>(evt => evt.OperatorId == operatorId),
            It.IsAny<CancellationToken>()
        ), Times.Once);
    }
}
```

### Anti-Patterns

❌ **No Act section (assertion in arrange):**
```csharp
[Fact]
public void BadTest()
{
    var result = OperatorPin.Create("1234");
    Assert.True(result.IsSuccess);  // ❌ Act + Assert mixed
}
```

✅ **Correct:**
```csharp
[Fact]
public void GoodTest()
{
    // Arrange
    var pinValue = "1234";

    // Act
    var result = OperatorPin.Create(pinValue);

    // Assert
    Assert.True(result.IsSuccess);
}
```

---

## TESTCONTAINERS PATTERN

### Description

**Testcontainers** = Run real databases/services in Docker containers for integration tests. No mocks, no in-memory databases — **test against real infrastructure**.

### Why Testcontainers?

| Approach | Pros | Cons |
|----------|------|------|
| **In-Memory DB (SQLite)** | Fast | Different SQL dialect, no RLS support |
| **Shared Test DB** | Real database | Flaky (state pollution), slow |
| **Testcontainers** | Real database, isolated | Requires Docker |

**SpaceOS Choice:** Testcontainers (PostgreSQL 16 Alpine)

### Implementation

**Setup:**
```csharp
public class DatabaseFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("spaceos_test")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    public string ConnectionString => _postgres.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        // Run migrations
        var options = new DbContextOptionsBuilder<SpaceOsDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;

        await using var context = new SpaceOsDbContext(options);
        await context.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
    }
}

[CollectionDefinition("Database")]
public class DatabaseCollection : ICollectionFixture<DatabaseFixture> { }
```

**Usage:**
```csharp
[Collection("Database")]
public class OperatorRepositoryTests
{
    private readonly DatabaseFixture _fixture;

    public OperatorRepositoryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task SaveAsync_WithValidOperator_PersistsToDatabase()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<SpaceOsDbContext>()
            .UseNpgsql(_fixture.ConnectionString)
            .Options;

        await using var context = new SpaceOsDbContext(options);
        var repo = new OperatorRepository(context);

        var operator = Operator.Create("Jane Doe", "jane@example.com").Value;

        // Act
        await repo.SaveAsync(operator, CancellationToken.None);

        // Assert
        var saved = await repo.GetByIdAsync(operator.Id, CancellationToken.None);
        Assert.NotNull(saved);
        Assert.Equal("Jane Doe", saved.Name);
    }
}
```

### Benefits

✅ **Real PostgreSQL** — Tests run against actual database
✅ **Isolation** — Each test class gets fresh container
✅ **RLS validation** — Can test Row-Level Security policies
✅ **Migration testing** — Verify migrations work
✅ **Performance** — Faster than shared test DB (no state cleanup)

---

## E2E TESTING WITH PLAYWRIGHT

### Description

**E2E Tests** = Test complete user workflows from browser UI → API → database. Validates integration between all layers.

### Coverage Strategy

**Critical Workflows (60% of tests):**
- Quote → Order → Cutting Plan
- User login → Dashboard
- ASN QR scanning → Database update
- Partner KPI calculation

### Playwright Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Quote Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('https://portal.joinerytech.hu/login');

    // Login
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create quote and convert to order', async ({ page }) => {
    // Navigate to new quote
    await page.click('a[href="/quotes/new"]');

    // Fill quote form
    await page.fill('input[name="customerName"]', 'Test Customer');
    await page.selectOption('select[name="doorType"]', 'swing-door');
    await page.fill('input[name="width"]', '900');
    await page.fill('input[name="height"]', '2100');

    // Calculate price
    await page.click('button:has-text("Calculate Price")');

    // Wait for price
    await expect(page.locator('.price-display')).toContainText('€');

    // Create order
    await page.click('button:has-text("Create Order")');

    // Verify order created
    await expect(page).toHaveURL(/\/orders\/\d+/);
    await expect(page.locator('h1')).toContainText('Order Created');
  });
});
```

### Probe-and-Skip Pattern

**Problem:** E2E tests fail in CI if backend services unavailable.

**Solution:** **Probe-and-Skip** — Check prerequisites, skip test if unavailable.

```typescript
test.beforeEach(async ({ request }) => {
  // Probe: Check backend health
  const response = await request.get('https://api.spaceos.local/health');

  // Skip: If backend unavailable
  test.skip(!response.ok(), 'Backend service unavailable');
});
```

**Benefits:**
- ✅ CI-friendly (no flaky failures)
- ✅ Local development (skip if backend not running)
- ✅ Clear test output (SKIPPED vs. FAILED)

### Auth Path Testing

**Pattern:** Test **both 401 (unauthorized) and 200 (authorized) paths** for every protected endpoint.

```typescript
test.describe('API Authentication', () => {
  test('should return 401 when not authenticated', async ({ request }) => {
    const response = await request.get('/api/quotes');
    expect(response.status()).toBe(401);
  });

  test('should return quotes when authenticated', async ({ request }) => {
    // Login first
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'test@example.com', password: 'password' }
    });
    const { token } = await loginRes.json();

    // Fetch quotes with token
    const response = await request.get('/api/quotes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    expect(response.status()).toBe(200);
    const quotes = await response.json();
    expect(Array.isArray(quotes)).toBe(true);
  });
});
```

---

## COVERAGE TARGETS BY LAYER

### Backend (.NET 8)

| Layer | Target | Actual | Status |
|-------|--------|--------|--------|
| **Domain** | ≥90% | 95% | ✅ Excellent |
| **Application** | ≥90% | 92% | ✅ Good |
| **Infrastructure** | ≥40% | 45% | ✅ Good |
| **API** | ≥40% | 42% | ✅ Good |
| **Overall** | ≥70% | 78% | ✅ Good |

**Coverage Tool:** `dotnet test --collect:"XPlat Code Coverage"`

### Frontend (React 18)

| Layer | Target | Actual | Status |
|-------|--------|--------|--------|
| **Components** | ≥80% | 85% | ✅ Excellent |
| **Hooks** | ≥80% | 88% | ✅ Excellent |
| **Stores (Zustand)** | ≥90% | 92% | ✅ Excellent |
| **Utils** | ≥80% | 80% | ✅ Good |
| **Overall** | ≥80% | 86% | ✅ Excellent |

**Coverage Tool:** Vitest with `@vitest/coverage-v8`

---

## TEST ORGANIZATION

### Backend Test Structure

```
SpaceOS.Joinery.Tests/
├── Domain/
│   ├── DoorConfigurationTests.cs
│   ├── QuoteTests.cs
│   └── ValueObjects/
│       └── OperatorPinTests.cs
├── Application/
│   ├── Commands/
│   │   ├── CreateQuoteHandlerTests.cs
│   │   └── SetOperatorPinHandlerTests.cs
│   └── Queries/
│       └── GetQuoteByIdHandlerTests.cs
├── Infrastructure/
│   ├── Repositories/
│   │   └── QuoteRepositoryTests.cs  # Testcontainers
│   └── Providers/
│       └── InventoryProviderTests.cs  # Mock HTTP
└── Api/
    └── Controllers/
        └── QuotesControllerTests.cs  # Integration tests
```

### Frontend Test Structure

```
joinerytech-portal/src/
├── components/
│   ├── Quote/
│   │   ├── QuoteForm.tsx
│   │   └── QuoteForm.test.tsx
│   └── KPI/
│       ├── PartnerKPIDashboard.tsx
│       └── PartnerKPIDashboard.test.tsx
├── hooks/
│   ├── useKPICalculator.ts
│   └── useKPICalculator.test.ts
├── stores/
│   ├── asnStore.ts
│   └── asnStore.test.ts
└── __tests__/
    └── e2e/
        ├── quote-workflow.spec.ts
        └── partner-kpi.spec.ts
```

---

## BEST PRACTICES

### 1. Test Naming Convention

**Pattern:** `MethodName_Scenario_ExpectedBehavior`

```csharp
// ✅ Good
Assign_FromQueued_TransitionsToAssigned()
Assign_FromInProgress_Fails()

// ❌ Bad
Test1()
AssignTest()
TestAssign()
```

### 2. One Assertion Per Test (Flexible)

**Strict Rule:** One logical assertion per test.

```csharp
// ✅ Good (one logical assertion — "create succeeds")
[Fact]
public void Create_WithValidData_Succeeds()
{
    var result = Tenant.Create("Doorstar", "doorstar");

    Assert.True(result.IsSuccess);          // Part 1 of logical assertion
    Assert.Equal("Doorstar", result.Value.Name);  // Part 2 of logical assertion
}

// ❌ Bad (multiple unrelated assertions)
[Fact]
public void MultipleTests()
{
    var tenant1 = Tenant.Create("A", "a");
    Assert.True(tenant1.IsSuccess);  // Assertion 1

    var tenant2 = Tenant.Create("", "");
    Assert.True(tenant2.IsFailure);  // Assertion 2 — SEPARATE TEST NEEDED
}
```

### 3. Test Independence

**Rule:** Tests must run in **any order** and **in parallel**.

```csharp
// ✅ Good (independent)
[Fact]
public void Test1()
{
    var entity = CreateTestEntity();  // Fresh entity
    // ... test logic
}

// ❌ Bad (shared state)
private static Guid _sharedId = Guid.NewGuid();

[Fact]
public void Test1()
{
    var entity = GetEntityById(_sharedId);  // ❌ Depends on Test2
}

[Fact]
public void Test2()
{
    var entity = CreateEntityWithId(_sharedId);  // ❌ Creates shared state
}
```

### 4. No Logic in Tests

**Rule:** Tests should be **data-driven**, not logic-driven.

```csharp
// ✅ Good (no logic)
[Theory]
[InlineData("1234", true)]
[InlineData("abc", false)]
[InlineData("", false)]
public void Create_WithVariousPins_ValidatesCorrectly(string pin, bool expected)
{
    var result = OperatorPin.Create(pin);
    Assert.Equal(expected, result.IsSuccess);
}

// ❌ Bad (logic in test)
[Fact]
public void Create_WithVariousPins_ValidatesCorrectly()
{
    var pins = new[] { "1234", "abc", "" };
    foreach (var pin in pins)  // ❌ Loop in test
    {
        var result = OperatorPin.Create(pin);
        if (pin.Length == 4)  // ❌ Conditional in test
            Assert.True(result.IsSuccess);
        else
            Assert.True(result.IsFailure);
    }
}
```

### 5. Descriptive Failure Messages

```csharp
// ✅ Good (clear failure message)
Assert.True(result.IsSuccess, $"Expected success but got error: {result.Error}");

// ❌ Bad (generic failure)
Assert.True(result.IsSuccess);  // Output: "Expected True but was False"
```

---

## CONTINUOUS INTEGRATION

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0.x'

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore

      - name: Test
        run: dotnet test --no-build --verbosity normal --collect:"XPlat Code Coverage"

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: pnpm install

      - name: Test
        run: pnpm test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## MUTATION TESTING (FUTURE)

**Mutation Testing** = Modify code (inject bugs) and verify tests catch the mutations.

**Tool:** Stryker.NET (C#), Stryker4s (TypeScript)

**Example:**
```csharp
// Original code
if (pin.Length == 4)
    return Result.Success(pin);

// Mutation: Change == to !=
if (pin.Length != 4)  // ❌ Mutant introduced
    return Result.Success(pin);

// ✅ Test should FAIL (kill the mutant)
```

**Mutation Score Target:** ≥80%

---

## PERFORMANCE BENCHMARKING

**Tool:** BenchmarkDotNet (C#)

**Example:**
```csharp
[MemoryDiagnoser]
public class CuttingPlanBenchmarks
{
    [Benchmark]
    public void CreateCuttingPlan_1000Panels()
    {
        for (int i = 0; i < 1000; i++)
        {
            CuttingPlan.Create(Guid.NewGuid(), $"Plan-{i}");
        }
    }
}
```

**Target:** No performance regressions (warn if >10% slower)

---

## REFERENCES

**Source Documents:**
- Explorer Codebase Patterns Analysis (MSG-EXPLORER-021)
- Backend Testing Patterns (`docs/knowledge/patterns/TEST_COVERAGE_PATTERNS.md`)
- Frontend Verification Workflow (`docs/knowledge/patterns/FRONTEND_VERIFICATION_WORKFLOW.md`)

**Related Knowledge Docs:**
- `ARCHITECTURAL_PATTERNS_CATALOGUE.md` — Pattern 8 (E2E Testing with Contract Tests)
- `BACKEND_PATTERNS.md` — Command/Handler testing patterns
- `FRONTEND_DRAG_DROP_PATTERNS.md` — Component testing examples

**External References:**
- [xUnit Documentation](https://xunit.net/)
- [Playwright Documentation](https://playwright.dev/)
- [Testcontainers Documentation](https://dotnet.testcontainers.org/)
- [Vitest Documentation](https://vitest.dev/)

---

**Document Status:** ✅ COMPLETE
**Next Review:** 2026-07-30 (1 month)
**Maintained By:** Librarian (synthesis from Explorer research + existing patterns)
