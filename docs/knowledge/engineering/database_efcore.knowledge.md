---
name: database-efcore
description: 'Database layer (Infra) implementation standards with EF Core configurations and Repository patterns. Use when working with entity configurations, Fluent API, SQLite, or repository implementations.'
domain: engineering
last_updated: 2026-02-24
---

# ??? Backend / Database & EF Core Skill

**Summary:** Ez a skill biztosítja az adatbázis réteg (Infra) implementálásához szükséges szabványokat, EF Core konfigurációkat és Repository mintákat.

## ?? Mikor töltsd be?

- **Adatbázis Tervezés**: Entitások konfigurálása (Fluent API), DbContext beállítása.
- **Adatkezelés**: Repository implementáció írása (CRUD).
- **Migráció**: Adatbázis séma módosítása.
- **Seed Data**: Kezdeti adatok feltöltése.

---

## ??? Architektúra és Szabályok

A perzisztencia réteg a **Clean Architecture** `Infrastructure` rétegében helyezkedik el.

1. **Core (Domain)**:
   - ? Tartalmazza az `IProjectRepository` interfészt.
   - ? Nem tud az EF Core-ról (nincs `DbSet`, nincs `DbContext`).
2. **Infra (Persistence)**:
   - ? Implementálja az interfészeket (`ProjectRepository`).
   - ? Tartalmazza a `DbContext`-et és a Migrációkat.
   - ? Használja a `Microsoft.EntityFrameworkCore` csomagokat.

### ?? Kódolási Konvenciók

- **Fluent API**: Az entitások konfigurálását külön `IEntityTypeConfiguration<T>` osztályokban végezzük, nem az `OnModelCreating`-ben ömlesztve.
- **Scoped Lifetime**: A `DbContext` és a Repository-k `Scoped` élettartamúak.
- **No Logic in Repo**: A Repository csak adatot mozgat, üzleti logikát nem tartalmaz.
- **Async**: Minden adatbázis mûvelet aszinkron (`ToListAsync`, `SaveChangesAsync`).

---

## ?? Kód Minták (N-shot Patterns)

### 1. Entity Configuration Minta (Fluent API)

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using JoineryTech.Flow.Core.Entities;

namespace JoineryTech.Flow.Infra.Persistence.Configurations;

public class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        // Primary Key
        builder.HasKey(p => p.Id);

        // Properties
        builder.Property(p => p.Title)
            .IsRequired()
            .HasMaxLength(Project.MaxTitleLength);

        builder.Property(p => p.Status)
            .HasConversion<string>()  // Enum tárolása stringként
            .IsRequired();

        // Relationships
        builder.HasMany<WorkTask>()
            .WithOne()
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(p => p.Title)
            .IsUnique();

        // Private setters support (ha szükséges)
        // builder.Property(p => p.Title).HasField("_title");
    }
}
```

### Entity Configuration (Fluent API)

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using JoineryTech.Flow.Core.Entities;

namespace JoineryTech.Flow.Infra.Persistence.Configurations;

public class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Title)
            .IsRequired()
            .HasMaxLength(Project.MaxTitleLength);

        builder.Property(p => p.Description)
            .HasMaxLength(500);

        builder.Property(p => p.Status)
            .HasConversion<string>()  // Enum -> string
            .IsRequired();

        builder.HasMany<WorkTask>()
            .WithOne()
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => p.Title)
            .IsUnique();
    }
}
```

### Repository implementáció (EF Core)

```csharp
using Microsoft.EntityFrameworkCore;
using JoineryTech.Flow.Core.Entities;
using JoineryTech.Flow.Core.Interfaces;

namespace JoineryTech.Flow.Infra.Persistence;

public class ProjectRepository : IProjectRepository
{
    private readonly AppDbContext _context;

    public ProjectRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Project?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<List<Project>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Projects
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Project project, CancellationToken cancellationToken = default)
    {
        _context.Projects.Add(project);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Project project, CancellationToken cancellationToken = default)
    {
        _context.Projects.Update(project);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> IsTitleUniqueAsync(string title, Guid? excludeId = null, CancellationToken cancellationToken = default)
    {
        return !await _context.Projects
            .AnyAsync(p =>
                p.Title == title &&
                (!excludeId.HasValue || p.Id != excludeId.Value),
                cancellationToken);
    }
}
```

### DI Registration (Program.cs)

```csharp
// SQLite connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=joinerytech.db";

// Register DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

// Register repositories (Scoped for EF Core!)
builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
builder.Services.AddScoped<IWorkTaskRepository, WorkTaskRepository>();
```

**?? FONTOS**: InMemory-nál `AddSingleton`, EF Core-nál `AddScoped`!

### WorkTaskRepository minta

```csharp
using Microsoft.EntityFrameworkCore;
using JoineryTech.Flow.Core.Entities;
using JoineryTech.Flow.Core.Interfaces;

namespace JoineryTech.Flow.Infra.Persistence;

public class WorkTaskRepository : IWorkTaskRepository
{
    private readonly AppDbContext _context;

    public WorkTaskRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(WorkTask task)
    {
        _context.WorkTasks.Add(task);
        await _context.SaveChangesAsync();
    }

    public async Task<WorkTask?> GetByIdAsync(Guid id)
    {
        return await _context.WorkTasks
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<IEnumerable<WorkTask>> ListByProjectAsync(Guid projectId)
    {
        return await _context.WorkTasks
            .Where(t => t.ProjectId == projectId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task UpdateAsync(WorkTask task)
    {
        _context.WorkTasks.Update(task);
        await _context.SaveChangesAsync();
    }
}
```

### appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=joinerytech.db"
  }
}
```

---

## ? Migráció parancsok

```powershell
# FONTOS: Mindig az Api mappából futtasd (startup project)
cd JoineryTech.Flow.Api

# Új migráció létrehozása
dotnet ef migrations add InitialCreate --project ../JoineryTech.Flow.Infra

# Migráció alkalmazása (DB frissítés)
dotnet ef database update --project ../JoineryTech.Flow.Infra

# Migráció visszavonása
dotnet ef migrations remove --project ../JoineryTech.Flow.Infra

# DB törlése és újraépítése
dotnet ef database drop --project ../JoineryTech.Flow.Infra
dotnet ef database update --project ../JoineryTech.Flow.Infra
```

---

## ?? Seed Data

### Option 1: HasData (migrációba épül)

```csharp
// ProjectConfiguration.cs
public void Configure(EntityTypeBuilder<Project> builder)
{
    // ... egyéb konfig ...

    builder.HasData(
        new { Id = Guid.Parse("..."), Title = "Demo Project", ... }
    );
}
```

### Option 2: Runtime seeding (ajánlott)

```csharp
// Program.cs (app.Run() elõtt)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    if (!await db.Projects.AnyAsync())
    {
        db.Projects.AddRange(
            Project.Create("Konyhabútor - Kovács család", "Egyedi konyhabútor"),
            Project.Create("Hálószoba gardrób", "Beépített szekrény")
        );
        await db.SaveChangesAsync();
    }
}
```

---

## ?? Gyakori hibák

| Hiba | Megoldás |
| ------ | ---------- |
| `No database provider configured` | Hiányzik `UseSqlite()` a Program.cs-bõl |
| `Unable to create DbContext` | Hiányzik `Microsoft.EntityFrameworkCore.Design` package |
| `The entity type requires a primary key` | Hiányzik `HasKey()` vagy `[Key]` attribútum |
| `Cannot insert duplicate key` | Unique constraint violation - ellenõrizd az adatot |
| `Private setter not working` | Használj `builder.Property().HasField()` vagy backing field-et |
| `Navigation property null` | Hiányzik `.Include()` a query-bõl |
| `Enum stored as int` | Használj `.HasConversion<string>()` |

### Private setter kezelése EF Core-ral

```csharp
// Ha az entitásnak private setter-ei vannak:
builder.Property(p => p.Title)
    .HasField("_title");  // backing field használata

// VAGY ConfigureConventions-ban:
protected override void ConfigureConventions(ModelConfigurationBuilder builder)
{
    builder.Properties<string>()
        .HaveMaxLength(200);
}
```

---

## ?? InMemory › SQLite migráció lépései

1. **NuGet packages hozzáadása** (lásd fent)
2. **AppDbContext létrehozása** (`Infra/Persistence/AppDbContext.cs`)
3. **Entity Configuration** (`Infra/Persistence/Configurations/*.cs`)
4. **Repository átírása** (InMemory › EF Core)
5. **DI registration** (Program.cs)
6. **Migráció generálása** (`dotnet ef migrations add`)
7. **Seed data** (runtime seeding ajánlott)
8. **InMemory repository törlése** (ha már nem kell)

---

## ?? Referencia fájlok

- `JoineryTech.Flow.Core/Interfaces/IProjectRepository.cs` - Interface minta
- `JoineryTech.Flow.Infra/Persistence/InMemoryProjectRepository.cs` - Jelenlegi implementáció
- `JoineryTech.Flow.Api/Program.cs` - DI konfiguráció
