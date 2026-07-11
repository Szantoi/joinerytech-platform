# CRM Module Testing Strategy

**Date:** 2026-07-02
**Module:** SpaceOS.Modules.CRM
**Framework:** xUnit + FluentAssertions
**Target Coverage:** 85%+

---

## Testing Pyramid

```
                     E2E (End-to-End)
                   /    Workflows     \
                 /   Orchestrator      \
               ___________________________
              |                         |
              |   Integration Tests     |
              |  (Repositories, EF)     |
              |__________________________|
             /                           \
           /                               \
         /_________________________________ \
        |                                   |
        |      Unit Tests (FSM, Logic)      |
        |  Domain Aggregates, Handlers      |
        |___________________________________|
```

---

## Test Layers

### 1. Unit Tests (Domain Logic)

**Purpose:** Verify domain business logic and FSM transitions without external dependencies

**Current Tests:**
- `LeadFsmTests.cs` - 8 test cases
- `OpportunityFsmTests.cs` - 11 test cases

**Coverage Areas:**
- ✅ Lead FSM: New → Contacted → Qualified → Disqualified
- ✅ Opportunity FSM: Open → NeedsAssessment → SolutionAssembly → Proposal → Negotiation → Won/Lost/Abandoned
- ✅ Probability progression (0 → 25 → 50 → 75 → 90 → 100)
- ✅ Terminal state enforcement
- ✅ Multi-aggregate independence
- ✅ Cross-aggregate coordination (Lead → Opportunity)

**Test Pattern:**
```csharp
[Fact]
public void StateTransition_Should_FollowFsmRules()
{
    // Arrange - setup aggregate in known state
    var lead = Lead.Create(...);

    // Act - perform state transition
    lead.Contact();

    // Assert - verify new state and side effects
    lead.Status.Should().Be(LeadState.Contacted);
}
```

### 2. Validator Tests

**Purpose:** Verify FluentValidation rules for all commands

**Tests to Create:**
- `CreateLeadCommandValidatorTests.cs` - 6 test cases
- `QualifyLeadCommandValidatorTests.cs` - 4 test cases
- `CreateOpportunityCommandValidatorTests.cs` - 5 test cases
- `WinOpportunityCommandValidatorTests.cs` - 4 test cases
- `SendProposalCommandValidatorTests.cs` - 3 test cases

**Coverage:**
- Required field validation (NotEmpty)
- Email format validation
- Currency code validation (ISO 4217)
- Date range validation (future dates)
- String length constraints
- Enum validation
- Cross-field rules (at least one of X or Y)

**Example:**
```csharp
[Fact]
public void CreateLeadCommand_WithInvalidEmail_Should_Fail()
{
    var validator = new CreateLeadCommandValidator();
    var command = new CreateLeadCommand
    {
        Email = "not-an-email"
    };

    var result = validator.Validate(command);
    result.IsValid.Should().BeFalse();
}
```

### 3. Handler Tests (CQRS)

**Purpose:** Verify command and query handlers with mocked repositories

**Tests to Create:**
- `CreateLeadHandlerTests.cs` - 3 test cases
- `ContactLeadHandlerTests.cs` - 2 test cases
- `QualifyLeadHandlerTests.cs` - 2 test cases
- `GetLeadByIdQueryHandlerTests.cs` - 3 test cases
- `GetPipelineForecastQueryHandlerTests.cs` - 4 test cases

**Pattern:**
```csharp
public class CreateLeadHandlerTests
{
    private readonly Mock<ILeadRepository> _repositoryMock;
    private readonly CreateLeadHandler _handler;

    public CreateLeadHandlerTests()
    {
        _repositoryMock = new Mock<ILeadRepository>();
        _handler = new CreateLeadHandler(_repositoryMock.Object);
    }

    [Fact]
    public async Task Handle_Should_CreateLead_And_SaveToRepository()
    {
        // Arrange
        var command = new CreateLeadCommand { ... };

        // Act
        var result = await _handler.Handle(command, default);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _repositoryMock.Verify(
            r => r.AddAsync(It.IsAny<Lead>(), default),
            Times.Once);
    }
}
```

### 4. Repository Tests (Integration)

**Purpose:** Verify EF Core queries work correctly against database

**Tests to Create (Require TestContainer/Docker):**
- `LeadRepositoryTests.cs` - 8 test cases
- `OpportunityRepositoryTests.cs` - 10 test cases

**Coverage:**
- GetByIdAsync with tenant filtering
- GetByStatusAsync with enum conversion
- GetByAssignedUserAsync for assignment tracking
- AddAsync/UpdateAsync for persistence
- SaveChangesAsync transaction handling
- RLS tenant isolation (negative cases)

**Pattern:**
```csharp
public class LeadRepositoryTests : IAsyncLifetime
{
    private PostgresContainer _postgres;
    private CrmDbContext _dbContext;
    private LeadRepository _repository;

    public async Task InitializeAsync()
    {
        _postgres = new PostgresContainer("postgres:15");
        await _postgres.StartAsync();

        var optionsBuilder = new DbContextOptionsBuilder<CrmDbContext>()
            .UseNpgsql(_postgres.GetConnectionString());
        _dbContext = new CrmDbContext(optionsBuilder.Options);
        await _dbContext.Database.MigrateAsync();

        _repository = new LeadRepository(_dbContext);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnLead_IfInTenant()
    {
        // Arrange
        var lead = Lead.Create(...);
        await _repository.AddAsync(lead);
        await _repository.SaveChangesAsync();

        // Act
        var result = await _repository.GetByIdAsync(lead.Id);

        // Assert
        result.Should().NotBeNull();
        result.TenantId.Should().Be(lead.TenantId);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_IfDifferentTenant()
    {
        // RLS enforcement test
        var lead = Lead.Create(tenantId1, ...);
        await _repository.AddAsync(lead);
        await _repository.SaveChangesAsync();

        // Simulate different tenant context
        // Lead should not be accessible

        var result = await _repository.GetByIdAsync(lead.Id);
        result.Should().BeNull();
    }
}
```

### 5. E2E / Workflow Tests

**Purpose:** Verify complete business workflows from API request to database

**Workflows to Test:**
1. **Lead Creation → Contact → Qualify → Convert → Opportunity**
   - Tests: 2 (success path + edge cases)
   - Time: ~500ms

2. **Opportunity Progression Through All Stages**
   - Tests: 1 (full pipeline: Open → Won)
   - Time: ~200ms

3. **Parallel Opportunities from Same Lead**
   - Tests: 1 (independence, no interference)
   - Time: ~300ms

4. **Activity/Task Lifecycle**
   - Tests: 2 (creation, completion, retrieval)
   - Time: ~400ms

**Pattern (WebApplicationFactory):**
```csharp
public class CrmE2ETests : IAsyncLifetime
{
    private WebApplicationFactory<Program> _factory;
    private HttpClient _client;

    public async Task InitializeAsync()
    {
        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                // Configure test database, disable auth, etc.
            });
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task CreateLead_ContactQualify_ConvertToOpportunity_Success()
    {
        // Arrange
        var createLeadRequest = new CreateLeadRequest { ... };

        // Act 1: Create Lead
        var createResponse = await _client.PostAsJsonAsync("/api/crm/leads", createLeadRequest);
        createResponse.StatusCode.Should().Be(201);
        var leadId = await createResponse.Content.ReadAsAsync<Guid>();

        // Act 2: Contact Lead
        var contactResponse = await _client.PutAsync($"/api/crm/leads/{leadId}/contact", null);
        contactResponse.StatusCode.Should().Be(204);

        // Act 3: Qualify Lead
        var qualifyResponse = await _client.PutAsync($"/api/crm/leads/{leadId}/qualify", null);
        qualifyResponse.StatusCode.Should().Be(204);

        // Act 4: Convert to Opportunity
        var convertRequest = new ConvertToOpportunityRequest { Value = 50000m, ... };
        var convertResponse = await _client.PostAsJsonAsync(
            $"/api/crm/leads/{leadId}/convert",
            convertRequest);
        convertResponse.StatusCode.Should().Be(201);

        // Assert
        convertResponse.Should().NotBeNull();
    }
}
```

---

## Test Execution Plan

### Phase 1: Unit Tests (Can run now)
**Duration:** 1-2 hours
**Status:** LeadFsmTests ✅ Created | OpportunityFsmTests ✅ Created

Files:
- LeadFsmTests.cs (8 tests)
- OpportunityFsmTests.cs (11 tests)
- LeadTests.cs (existing, 2 tests)

**Total:** 21 unit tests covering core FSM logic

### Phase 2: Validator Tests (Ready to create)
**Duration:** 2-3 hours
**Status:** 📋 Pending

Files to create:
- CreateLeadCommandValidatorTests.cs (6 tests)
- QualifyLeadCommandValidatorTests.cs (4 tests)
- CreateOpportunityCommandValidatorTests.cs (5 tests)
- WinOpportunityCommandValidatorTests.cs (4 tests)
- UpdateOpportunityEstimateCommandValidatorTests.cs (3 tests)

**Total:** 22 validator tests

### Phase 3: Handler Tests (Requires Moq)
**Duration:** 3-4 hours
**Status:** 📋 Pending

Files to create:
- CreateLeadHandlerTests.cs (3 tests)
- ContactLeadHandlerTests.cs (2 tests)
- GetLeadByIdQueryHandlerTests.cs (3 tests)
- GetPipelineForecastQueryHandlerTests.cs (4 tests)
- UpdateOpportunityEstimateHandlerTests.cs (2 tests)

**Total:** 14 handler tests

### Phase 4: Repository Tests (Requires TestContainers)
**Duration:** 4-5 hours
**Status:** 📋 Pending

Files to create:
- LeadRepositoryTests.cs (8 tests)
- OpportunityRepositoryTests.cs (10 tests)

**Total:** 18 integration tests

### Phase 5: E2E Tests (Requires running API)
**Duration:** 3-4 hours
**Status:** 📋 Pending

Files to create:
- CrmE2ETests.cs (4-5 tests covering workflows)

**Total:** 5 E2E tests

---

## Coverage Goals

| Test Type | Target | Current | Gap |
|-----------|--------|---------|-----|
| Unit Tests | 40 | 21 | 19 |
| Validator Tests | 22 | 0 | 22 |
| Handler Tests | 14 | 0 | 14 |
| Integration Tests | 18 | 0 | 18 |
| E2E Tests | 5 | 0 | 5 |
| **TOTAL** | **99** | **21** | **78** |

**Coverage Target:** 85%+ of code paths
**Current Estimate:** ~35% (21 tests, FSM logic mainly)

---

## Test Run Sequence

```
1. Unit Tests (LeadFsmTests + OpportunityFsmTests)
   ↓
2. Add Validator Tests
   ↓
3. Add Handler Tests (with Moq)
   ↓
4. Add Repository Tests (with TestContainers)
   ↓
5. Add E2E Tests (with WebApplicationFactory)
   ↓
6. Run Full Suite: dotnet test --coverage
```

---

## Build & Execution

### Build Test Project
```bash
cd /opt/spaceos/backend/spaceos-modules/spaceos-modules-crm
dotnet build tests/SpaceOS.Modules.CRM.Tests.csproj
```

### Run All Tests
```bash
dotnet test tests/SpaceOS.Modules.CRM.Tests.csproj --logger "console;verbosity=normal"
```

### Run Specific Test
```bash
dotnet test tests/SpaceOS.Modules.CRM.Tests.csproj --filter "FullyQualifiedName~LeadFsmTests"
```

### With Coverage Report
```bash
dotnet test /p:CollectCoverage=true /p:CoverageFormat=opencover /p:Exclude="[*]*.Program"
```

---

## Dependencies to Add (When Build Restores)

For Phase 3+:
- `Moq` 4.20.0 (already in csproj)

For Phase 4+:
- `Testcontainers` 3.9.0
- `Testcontainers.PostgreSql` 3.9.0

For Phase 5+:
- `Microsoft.AspNetCore.Mvc.Testing` 8.0.x

---

## Success Criteria

✅ Phase 1 (Unit): All 21 tests pass
✅ Phase 2 (Validators): All 22 tests pass
✅ Phase 3 (Handlers): All 14 tests pass
✅ Phase 4 (Integration): All 18 tests pass
✅ Phase 5 (E2E): All 5 tests pass
✅ Overall: 99 tests, 85%+ code coverage

---

## Notes for Future Sessions

1. **FSM Logic Verified:** Both Lead and Opportunity state machines are well-tested at unit level
2. **Validator Coverage:** All 20 validators need systematic test coverage
3. **Handler Testing:** Requires proper Moq setup for repository mocking
4. **Integration Testing:** Critical for verifying EF Core queries and RLS enforcement
5. **E2E Testing:** Validates complete workflows including authorization and error scenarios

---

**Status:** Test infrastructure scaffolded. Phases 1-2 ready for implementation. Phases 4-5 blocked by NuGet (build dependency).

Generated: 2026-07-02T12:00 UTC
Backend Terminal
