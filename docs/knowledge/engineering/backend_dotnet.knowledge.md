---
name: backend-dotnet
description: '.NET 10 Web API development standards, code patterns and best practices following Clean Architecture. Use when implementing controllers, DTOs, services, or domain logic in C#.'
domain: engineering
last_updated: 2026-02-24
---

# ??? Backend / .NET Core Development Skill

**Summary:** Ez a skill biztosítja a .NET 10 Web API fejlesztéséhez szükséges szabványokat, kódmintákat és best practice-eket a Clean Architecture elvei alapján.

## ?? Mikor töltsd be?

- **API Fejlesztés**: Controller, Endpoint, Middleware létrehozása.
- **Üzleti Logika**: Domain Service, Validation, DTO mapping.
- **Hibakeresés**: Backend build hibák vagy runtime exception-ök esetén.

---

## ??? Architektúra és Szabályok (Clean Architecture)

A projekt szigorú rétegzõdést követ. A függõségek csak **befelé** mutathatnak.

1. **Core (Domain)**:
   - ? Nem függhet semmitõl (sem DB, sem HTTP).
   - ? Tartalmazza: Entitások, Value Objects, Domain Services, Repository Interface-ek, Custom Exceptions.
2. **Infra (Infrastructure)**:
   - ? Függ a Core-tól.
   - ? Tartalmazza: EF Core DbContext, Repository Implementációk, External Services (Email, File).
3. **Api (Presentation)**:
   - ? Függ a Core-tól és az Infra-tól.
   - ? Tartalmazza: Controllers, DTOs, Middleware, DI Configuration (`Program.cs`).

### ?? Kódolási Konvenciók

- **Rich Domain Model**: Az entitások nem csak adatot tárolnak, hanem viselkedést is (metódusok).
- **Private Setters**: `public string Title { get; private set; }` - csak metóduson vagy konstruktoron keresztül módosítható.
- **DTO-k használata**: Soha ne adj vissza Entitást a Controllerbõl. Mindig map-eld DTO-ra.
- **Async/Await**: Minden I/O mûvelet legyen aszinkron (`Task`, `await`).

---

## ?? Kód Minták (N-shot Patterns)

### 1. Controller Minta

```csharp
[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectRepository _repository;

    public ProjectsController(IProjectRepository repository)
    {
        _repository = repository;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDto>> GetById(Guid id)
    {
        var project = await _repository.GetByIdAsync(id);
        if (project == null) return NotFound();

        return Ok(project.ToDto()); // Vagy AutoMapper
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateProjectDto dto)
    {
        // 1. Validáció (ha nincs FluentValidation)
        if (string.IsNullOrEmpty(dto.Title)) return BadRequest("Title is required");

        // 2. Domain Logic
        var project = Project.Create(dto.Title, dto.Description);

        // 3. Persistence
        await _repository.AddAsync(project);

        return CreatedAtAction(nameof(GetById), new { id = project.Id }, project.Id);
    }
}
```

### 2. DTO (Data Transfer Object) Minta

```csharp
// Request DTO (Input)
public record CreateProjectDto(string Title, string? Description);

// Response DTO (Output)
public record ProjectDto(Guid Id, string Title, string Status, DateTime CreatedAt);
```

### 3. Domain Entity Minta (Rich Model)

```csharp
public class Project : Entity
{
    public string Title { get; private set; }
    public ProjectStatus Status { get; private set; }

    // Factory method (Constructor helyett)
    public static Project Create(string title, string? description)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainException("Title cannot be empty");

        return new Project
        {
            Id = Guid.NewGuid(),
            Title = title,
            Status = ProjectStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };
    }

    // Domain behavior
    public void Start()
    {
        if (Status != ProjectStatus.Draft)
            throw new DomainException("Only draft projects can be started");

        Status = ProjectStatus.Active;
    }
}
```

## Build / Run parancsok

- `dotnet test JoineryTech.Flow.Core.Tests`
- `dotnet ef migrations add AddProject -p JoineryTech.Flow.Infra -s JoineryTech.Flow.Api`

## Gyakori hibák

- Nem fut a migration: ellenõrizd a startup DbContext regisztrációját.

## Referenciák

- `JoineryTech.Flow.Core/Entities/Project.cs`
- `JoineryTech.Flow.Infra/Persistence`
