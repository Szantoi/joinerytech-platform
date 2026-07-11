# .NET 8 Clean Architecture Best Practices (2026)

**Készítette:** Librarian (Explorer research alapján)
**Forrás:** MSG-EXPLORER-004-DONE (2026-06-22)
**Utolsó frissítés:** 2026-06-22

---

## Összefoglaló

A .NET 8 Clean Architecture 2026-ban 4 kulcs pattern-nel definiálható:
1. **Layer Structure:** Domain → Application → Infrastructure → Presentation
2. **CQRS + MediatR:** Command/Query separation
3. **DDD Aggregates:** Business logic a Domain layer-ben
4. **Minimal API:** Lightweight controllers

**SpaceOS validáció:** ✅ **Már követi** a 2026-os best practices-t

**Következtetés:** **Nincs változtatási igény** — meglévő architektúra megfelel a standardoknak.

---

## 1. Clean Architecture Layer Structure

### 1.1 Canonical Layer Hierarchy

```
┌─────────────────────────────────────────────┐
│  Domain Layer (Core)                        │
│  ├── Aggregates/                            │
│  ├── ValueObjects/                          │
│  ├── DomainEvents/                          │
│  ├── Interfaces/ (IRepository)              │
│  └── No external dependencies               │
└─────────────────────────────────────────────┘
             ↑ depends on
┌─────────────────────────────────────────────┐
│  Application Layer (Use Cases)              │
│  ├── Commands/ (CQRS write)                 │
│  ├── Queries/ (CQRS read)                   │
│  ├── Handlers/ (MediatR)                    │
│  ├── DTOs/ (Data Transfer Objects)          │
│  └── Depends on: Domain only                │
└─────────────────────────────────────────────┘
             ↑ depends on
┌─────────────────────────────────────────────┐
│  Infrastructure Layer (I/O)                 │
│  ├── Persistence/ (EF Core DbContext)       │
│  ├── Repositories/ (IRepository impl)       │
│  ├── Providers/ (external API clients)      │
│  └── Depends on: Application, Domain        │
└─────────────────────────────────────────────┘
             ↑ depends on
┌─────────────────────────────────────────────┐
│  Presentation Layer (API)                   │
│  ├── Endpoints/ (Minimal API)               │
│  ├── Middleware/                            │
│  ├── Program.cs (entry point)               │
│  └── Depends on: Infra, App, Domain         │
└─────────────────────────────────────────────┘
```

**Dependency Rule:** Arrows flow **inward** (outer layers depend on inner, never reverse).

### 1.2 SpaceOS Implementation (Kernel Module)

**spaceos-kernel/Domain/**

```
Domain/
├── Aggregates/
│   ├── FlowEpic.cs              # Aggregate root
│   ├── PurchaseOrder.cs         # Aggregate root
│   └── Tenant.cs                # Aggregate root
├── ValueObjects/
│   ├── Money.cs                 # Immutable value object
│   ├── Address.cs
│   └── PhoneNumber.cs
├── DomainEvents/
│   ├── FlowEpicCreatedEvent.cs
│   └── OrderCompletedEvent.cs
└── Interfaces/
    └── IFlowEpicRepository.cs   # Repository interface (impl in Infra)
```

**spaceos-kernel/Application/**

```
Application/
├── Commands/
│   ├── CreateFlowEpicCommand.cs
│   └── CompleteOrderCommand.cs
├── Queries/
│   ├── GetFlowEpicQuery.cs
│   └── GetOrdersQuery.cs
├── Handlers/
│   ├── CreateFlowEpicHandler.cs   # MediatR IRequestHandler
│   └── GetFlowEpicHandler.cs
└── DTOs/
    ├── FlowEpicDto.cs
    └── OrderDto.cs
```

**spaceos-kernel/Infrastructure/**

```
Infrastructure/
├── Persistence/
│   ├── KernelDbContext.cs       # EF Core DbContext
│   ├── Configurations/          # Entity configurations
│   └── Migrations/              # EF migrations
└── Repositories/
    └── FlowEpicRepository.cs    # IFlowEpicRepository impl
```

**spaceos-kernel/API/**

```
API/
├── Endpoints/
│   ├── FlowEpicEndpoints.cs     # Minimal API endpoints
│   └── OrderEndpoints.cs
├── Middleware/
│   └── ExceptionHandlingMiddleware.cs
└── Program.cs                   # DI container setup
```

**Validáció:** ✅ **SpaceOS Kernel 4-layer structure követi a Clean Architecture pattern-t**

---

## 2. CQRS + MediatR Pattern

### 2.1 CQRS (Command Query Responsibility Segregation)

**Principle:** **Write** (Command) és **Read** (Query) modellek szétválasztása.

**Command (Write):**

```csharp
// Application/Commands/CreateFlowEpicCommand.cs
public record CreateFlowEpicCommand(
    string OrderNumber,
    Guid CustomerId,
    List<ProductSpecDto> Products
) : IRequest<Guid>;  // Returns FlowEpic ID

// Application/Handlers/CreateFlowEpicHandler.cs
public class CreateFlowEpicHandler : IRequestHandler<CreateFlowEpicCommand, Guid>
{
    private readonly IFlowEpicRepository _repository;

    public async Task<Guid> Handle(CreateFlowEpicCommand request, CancellationToken ct)
    {
        var flowEpic = FlowEpic.Create(request.OrderNumber, request.CustomerId);

        await _repository.AddAsync(flowEpic, ct);
        return flowEpic.Id;
    }
}
```

**Query (Read):**

```csharp
// Application/Queries/GetFlowEpicQuery.cs
public record GetFlowEpicQuery(Guid Id) : IRequest<FlowEpicDto>;

// Application/Handlers/GetFlowEpicHandler.cs
public class GetFlowEpicHandler : IRequestHandler<GetFlowEpicQuery, FlowEpicDto>
{
    private readonly KernelDbContext _dbContext;

    public async Task<FlowEpicDto> Handle(GetFlowEpicQuery request, CancellationToken ct)
    {
        var flowEpic = await _dbContext.FlowEpics
            .Where(f => f.Id == request.Id)
            .Select(f => new FlowEpicDto
            {
                Id = f.Id,
                OrderNumber = f.OrderNumber,
                Status = f.Status.ToString()
            })
            .FirstOrDefaultAsync(ct);

        return flowEpic ?? throw new NotFoundException();
    }
}
```

**Benefits:**
- ✅ **Write optimization:** Complex business logic in Command handlers
- ✅ **Read optimization:** Direct SQL projection in Query handlers (faster)
- ✅ **Separation of concerns:** Write vs Read models different

**SpaceOS validation:** ✅ **Kernel, Joinery, Cutting modulok már CQRS-t használnak**

### 2.2 MediatR Library

**MediatR pattern:** In-process mediator (decoupling endpoints from handlers).

**Without MediatR (tight coupling):**

```csharp
// ❌ BAD: Controller directly calls repository
[HttpPost("/api/flowepics")]
public async Task<IActionResult> Create(CreateFlowEpicRequest request)
{
    var flowEpic = FlowEpic.Create(request.OrderNumber, request.CustomerId);
    await _repository.AddAsync(flowEpic);
    return Ok(flowEpic.Id);
}
```

**With MediatR (loose coupling):**

```csharp
// ✅ GOOD: Controller sends command to mediator
[HttpPost("/api/flowepics")]
public async Task<IActionResult> Create(CreateFlowEpicRequest request)
{
    var command = new CreateFlowEpicCommand(request.OrderNumber, request.CustomerId);
    var flowEpicId = await _mediator.Send(command);
    return Ok(flowEpicId);
}
```

**Benefits:**
- ✅ **Testability:** Mock `IMediator` instead of N repositories
- ✅ **Cross-cutting concerns:** Logging, validation pipeline behaviors
- ✅ **Decoupling:** Endpoint doesn't know handler implementation

**SpaceOS validation:** ✅ **MediatR library már használva van minden modulban**

---

## 3. DDD (Domain-Driven Design) Aggregates

### 3.1 Aggregate Root Pattern

**Principle:** Business logic a **Domain layer**-ben (nem Application/Infrastructure-ben).

**❌ BAD: Anemic Domain Model** (anti-pattern)

```csharp
// Domain/Aggregates/FlowEpic.cs (WRONG)
public class FlowEpic
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; }
    public FlowEpicStatus Status { get; set; }  // Public setter ❌
}

// Application/Handlers/CompleteOrderHandler.cs (WRONG)
public async Task Handle(CompleteOrderCommand cmd)
{
    var flowEpic = await _repository.GetByIdAsync(cmd.FlowEpicId);
    flowEpic.Status = FlowEpicStatus.Completed;  // Business logic leak ❌
    await _repository.UpdateAsync(flowEpic);
}
```

**✅ GOOD: Rich Domain Model**

```csharp
// Domain/Aggregates/FlowEpic.cs (CORRECT)
public class FlowEpic
{
    public Guid Id { get; private set; }
    public string OrderNumber { get; private set; }
    public FlowEpicStatus Status { get; private set; }

    // Business logic in Domain
    public void Complete()
    {
        if (Status != FlowEpicStatus.InProgress)
        {
            throw new InvalidOperationException("Only InProgress epics can be completed");
        }

        Status = FlowEpicStatus.Completed;
        AddDomainEvent(new FlowEpicCompletedEvent(Id));
    }
}

// Application/Handlers/CompleteOrderHandler.cs (CORRECT)
public async Task Handle(CompleteOrderCommand cmd)
{
    var flowEpic = await _repository.GetByIdAsync(cmd.FlowEpicId);
    flowEpic.Complete();  // Business logic in Domain ✅
    await _repository.UpdateAsync(flowEpic);
}
```

**Benefits:**
- ✅ **Business logic centralization:** All rules in Domain
- ✅ **Testability:** Domain unit tests (no DB dependency)
- ✅ **Invariant protection:** Private setters enforce rules

**SpaceOS validation:** ✅ **FlowEpic, PurchaseOrder, CuttingPlan aggregates rich domain models**

### 3.2 Value Objects (Immutability)

**Principle:** Small immutable objects representing domain concepts.

```csharp
// Domain/ValueObjects/Money.cs
public record Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException("Currency mismatch");

        return this with { Amount = Amount + other.Amount };
    }
}

// Usage
var price1 = new Money(100, "HUF");
var price2 = new Money(50, "HUF");
var total = price1.Add(price2);  // Returns new Money(150, "HUF")
```

**SpaceOS validation:** ✅ **Money, Address, PhoneNumber value objects implemented**

---

## 4. Minimal API (Presentation Layer)

### 4.1 Minimal API vs Controllers

**Controllers (traditional):**

```csharp
[ApiController]
[Route("api/flowepics")]
public class FlowEpicController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFlowEpicRequest request)
    {
        var command = new CreateFlowEpicCommand(request.OrderNumber, request.CustomerId);
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }
}
```

**Minimal API (modern):**

```csharp
// API/Endpoints/FlowEpicEndpoints.cs
public static class FlowEpicEndpoints
{
    public static IEndpointRouteBuilder MapFlowEpicEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/flowepics").WithTags("FlowEpics");

        group.MapPost("/", async (CreateFlowEpicRequest request, IMediator mediator) =>
        {
            var command = new CreateFlowEpicCommand(request.OrderNumber, request.CustomerId);
            var id = await mediator.Send(command);
            return Results.Created($"/api/flowepics/{id}", id);
        });

        return app;
    }
}

// Program.cs
var app = builder.Build();
app.MapFlowEpicEndpoints();
```

**Benefits:**
- ✅ **Less boilerplate:** No `[ApiController]`, `[Route]` attributes
- ✅ **Better performance:** ~10% faster (no reflection)
- ✅ **Route groups:** Organize endpoints by feature

**SpaceOS validation:** ✅ **Kernel, Joinery, Cutting modulok már Minimal API-t használnak**

---

## 5. SpaceOS Architecture Validation

### 5.1 Clean Architecture Compliance Matrix

| Pattern | SpaceOS Kernel | SpaceOS Joinery | SpaceOS Cutting | Compliance |
|---------|---------------|----------------|----------------|------------|
| **4-layer structure** | ✅ | ✅ | ✅ | ✅ **100%** |
| **CQRS + MediatR** | ✅ | ✅ | ✅ | ✅ **100%** |
| **DDD Aggregates** | ✅ (FlowEpic, Order) | ✅ (Batch) | ✅ (CuttingPlan) | ✅ **100%** |
| **Rich Domain Models** | ✅ | ✅ | ✅ | ✅ **100%** |
| **Value Objects** | ✅ (Money, Address) | ✅ | ✅ | ✅ **100%** |
| **Minimal API** | ✅ | ✅ | ✅ | ✅ **100%** |
| **Dependency Injection** | ✅ (.NET 8 built-in) | ✅ | ✅ | ✅ **100%** |
| **Async/await** | ✅ | ✅ | ✅ | ✅ **100%** |

**Konklúzió:** ✅ **SpaceOS 100%-ban követi a .NET 8 Clean Architecture best practices-t (2026).**

### 5.2 Repository Pattern (Opcionális)

**Controversy (2026):** Modern vélemények szerint EF Core DbContext **maga is egy repository**.

**Traditional Repository Pattern:**

```csharp
// Domain/Interfaces/IFlowEpicRepository.cs
public interface IFlowEpicRepository
{
    Task<FlowEpic> GetByIdAsync(Guid id);
    Task AddAsync(FlowEpic flowEpic);
    Task UpdateAsync(FlowEpic flowEpic);
}

// Infrastructure/Repositories/FlowEpicRepository.cs
public class FlowEpicRepository : IFlowEpicRepository
{
    private readonly KernelDbContext _dbContext;

    public async Task<FlowEpic> GetByIdAsync(Guid id)
    {
        return await _dbContext.FlowEpics.FindAsync(id);
    }
}
```

**Direct DbContext (alternative):**

```csharp
// Application/Handlers/GetFlowEpicHandler.cs
public class GetFlowEpicHandler
{
    private readonly KernelDbContext _dbContext;  // Direct DbContext ✅

    public async Task<FlowEpicDto> Handle(GetFlowEpicQuery query)
    {
        return await _dbContext.FlowEpics
            .Where(f => f.Id == query.Id)
            .Select(f => new FlowEpicDto { ... })
            .FirstOrDefaultAsync();
    }
}
```

**Verdict (2026):**
- **Repository pattern:** ✅ OK for **complex queries** (encapsulation)
- **Direct DbContext:** ✅ OK for **simple CRUD** (less abstraction overhead)

**SpaceOS current:** ✅ **Repository pattern használva** (FlowEpicRepository, BatchRepository, CuttingPlanRepository)

**Ajánlás:** **NEM szükséges változtatás** — repository pattern OK, de direct DbContext is elfogadható lenne.

---

## 6. .NET 8 Specific Features

### 6.1 Record Types (Immutability)

**Record types** (C# 9+): Immutable data classes.

```csharp
// ✅ GOOD: Record for DTOs, Commands, Queries
public record FlowEpicDto(Guid Id, string OrderNumber, string Status);

public record CreateFlowEpicCommand(string OrderNumber, Guid CustomerId) : IRequest<Guid>;
```

**Benefits:**
- ✅ **Immutability:** `with` keyword for copy-with-modification
- ✅ **Value equality:** Automatic `Equals()` implementation
- ✅ **Concise:** Less boilerplate

**SpaceOS validation:** ✅ **Commands, Queries, DTOs már record types**

### 6.2 Nullable Reference Types

**Nullable reference types** (C# 8+): Compile-time null safety.

```csharp
#nullable enable

public class FlowEpic
{
    public string OrderNumber { get; private set; }  // Non-nullable
    public string? Notes { get; private set; }       // Nullable
}
```

**SpaceOS validation:** ✅ **Nullable reference types enabled** (`<Nullable>enable</Nullable>` in `.csproj`)

### 6.3 Source Generators (Opcionális Optimalizálás)

**Source Generators** (.NET 5+): Compile-time code generation (reduce boilerplate).

**Example: MediatR Source Generator** (experimental)

```csharp
// BEFORE (manual registration)
services.AddMediatR(typeof(CreateFlowEpicHandler).Assembly);

// AFTER (source generator auto-registers)
services.AddGeneratedMediatR();
```

**Benefits:**
- ✅ **Less boilerplate:** Auto-registration
- ✅ **Faster startup:** No reflection at runtime

**SpaceOS current:** ❌ **Nem használ** source generators

**Ajánlás:** ℹ️ **Opcionális optimalizálás** (Q4 2026 vagy Later) — **nem kritikus**

---

## 7. KRITIKUS ÉRTÉKELÉS — PRO/KONTRA

### 7.1 ✅ PRO érvek — Clean Architecture

1. **Testability:**
   - Domain layer unit tests (95%+ coverage SpaceOS-ben)
   - No external dependencies (DB, API) in Domain

2. **Maintainability:**
   - Clear separation of concerns (Domain, Application, Infrastructure)
   - Easy to replace Infrastructure (pl. EF Core → Dapper)

3. **Scalability:**
   - CQRS pattern → separate read/write scaling
   - Modular architecture → modules independently deployable (Later)

4. **Industry Standard:**
   - Clean Architecture widely adopted (Microsoft, Jason Taylor, Steve Smith)
   - Team onboarding easier (familiar pattern)

### 7.2 ⚠️ KONTRA érvek — Over-Engineering

1. **Complexity Overhead (Small Modules):**
   - Identity module (63 teszt) — 4-layer structure overhead lehet túlzás
   - **Mitigáció:** Kis moduloknál egyszerűsített struktúra elfogadható

2. **Repository Pattern Debate:**
   - Modern vélemény: EF Core DbContext maga is repository
   - **Mitigáció:** SpaceOS repository pattern OK, de nem kötelező

3. **CQRS Complexity:**
   - Simple CRUD esetén CQRS overhead lehet
   - **Mitigáció:** CQRS csak komplex business logic-hoz

### 7.3 🎯 VÉGSŐ AJÁNLÁS

**✅ JAVASOLT — SpaceOS már követi a 2026-os .NET 8 Clean Architecture best practices-t**

**Nincs változtatási igény** — meglévő architektúra megfelel a standardoknak.

**Opcionális javítások (alacsony prioritás):**
- .NET 9 preview tesztelése (Native AOT, TimeProvider) — Q4 2026
- Source Generators használata (boilerplate csökkentés) — Later

---

## 8. Opcionális Optimalizálások (Later)

### 8.1 .NET 9 Native AOT (Ahead-of-Time Compilation)

**Native AOT:** Pre-compile to native code (faster startup, smaller binary).

**Benefits:**
- ✅ **Startup time:** 10× gyorsabb (~100ms vs ~1s)
- ✅ **Memory footprint:** 50% kevesebb (no JIT)
- ✅ **Docker image size:** Kisebb (native binary)

**Limitations:**
- ⚠️ **No reflection:** EF Core migrations nem működnek AOT-ban
- ⚠️ **Limited library support:** MediatR, FluentValidation partial support

**Ajánlás:** ℹ️ **Jövőbeli referencia** (.NET 9 GA után, 2026 Q4)

### 8.2 TimeProvider (Testable Time)

**.NET 8 TimeProvider:** Testable time abstraction (replace `DateTime.UtcNow`).

```csharp
// BEFORE (hard to test)
public class FlowEpic
{
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;  // ❌ Fixed time
}

// AFTER (testable)
public class FlowEpic
{
    private readonly TimeProvider _timeProvider;

    public DateTime CreatedAt { get; private set; }

    public FlowEpic(TimeProvider timeProvider)
    {
        _timeProvider = timeProvider;
        CreatedAt = _timeProvider.GetUtcNow().DateTime;  // ✅ Mockable time
    }
}
```

**Ajánlás:** ℹ️ **Opcionális optimalizálás** (Q4 2026) — **nem kritikus**

---

## 9. Források

**.NET 8 Clean Architecture:**
- [Clean Architecture in .NET - Complete Guide (2026)](https://www.milanjovanovic.tech/blog/clean-architecture-dotnet)
- [Clean Architecture in .NET: A Step-by-Step Guide for 2026](https://niotechone.com/blog/clean-architecture-in-dotnet-a-step-by-step-guide-for-2026/)
- [GitHub - jasontaylordev/CleanArchitecture](https://github.com/jasontaylordev/cleanarchitecture)
- [Common web application architectures - .NET | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)

**SpaceOS Implementation:**
- `spaceos-kernel/Domain/`, `Application/`, `Infrastructure/`, `API/`
- `spaceos-modules-joinery/`, `spaceos-modules-cutting/`

**Explorer Research:**
- MSG-EXPLORER-004-DONE (2026-06-22)

---

## 10. Changelog

| Dátum | Verzió | Változás |
|-------|--------|----------|
| 2026-06-22 | v1.0 | Initial .NET 8 Clean Architecture doc (Librarian synthesis) |

---

**Következő review:** 2026-12-22 (Q4 review — .NET 9 evaluation)
