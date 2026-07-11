---
name: testing-strategy
description: 'Project-wide testing strategy defining test levels, quality assurance standards, and test planning. Use when planning test coverage, reviewing QA processes, or defining test acceptance criteria.'
domain: engineering
last_updated: 2026-02-24
---

# ?? QA / General Testing Strategy Skill

**Summary:** Ez a skill definiálja a projekt átfogó tesztelési stratégiáját, a tesztelési szinteket és a minõségbiztosítási szabványokat.

## ?? Mikor töltsd be?

- **Teszt Tervezés**: Teszt esetek (Test Cases) írásakor.
- **QA Review**: Fejlesztõi tesztek ellenõrzésekor.
- **Hibajelentés**: Bug report készítésekor.
- **Automata Teszt**: E2E vagy Integrációs tesztek írásakor.

---

## ??? Tesztelési Stratégia (Test Pyramid)

A projekt a tesztelési piramis elvét követi a gyors visszacsatolás érdekében.

1. **Unit Tests (L1)**:
   - ?? **Fókusz**: Izolált üzleti logika (Domain Entities, Services).
   - ??? **Eszköz**: xUnit (Backend), Vitest (Frontend).
   - ? **Sebesség**: Nagyon gyors (<1s).
2. **Integration Tests (L2)**:
   - ?? **Fókusz**: Komponensek együttmûködése (Controller + DB, Hook + Component).
   - ??? **Eszköz**: WebApplicationFactory (Backend), React Testing Library (Frontend).
   - ? **Sebesség**: Közepes.
3. **E2E / System Tests (L3)**:
   - ?? **Fókusz**: Teljes user flow-k (Login -> Create Project).
   - ??? **Eszköz**: Playwright (ha van), vagy manuális teszt.
   - ? **Sebesség**: Lassú.

### ?? QA Konvenciók

- **AAA Pattern**: Arrange (Elõkészítés), Act (Cselekvés), Assert (Ellenõrzés).
- **Naming**: `[Method]_[Scenario]_[ExpectedResult]` (pl. `Create_InvalidData_ThrowsException`).
- **Bug Report**: Mindig tartalmazzon reprodukciós lépéseket és elvárt vs. kapott eredményt.

---

## ?? Teszt Minták (N-shot Patterns)

### 1. Unit Test Minta (C# / xUnit)

```csharp
public class ProjectTests
{
    [Fact]
    public void Create_WithValidName_ShouldCreateProject()
    {
        // Arrange
        var name = "Test Project";

        // Act
        var project = Project.Create(name);

        // Assert
        project.Should().NotBeNull();
        project.Name.Should().Be(name);
        project.Status.Should().Be(ProjectStatus.Draft);
    }
}
```

### Paraméterezett teszt

```csharp
[Theory]
[InlineData("")]
[InlineData("   ")]
[InlineData(null)]
public void Create_WithInvalidName_ShouldThrow(string? invalidName)
{
    var act = () => Project.Create(invalidName!);
    act.Should().Throw<DomainValidationException>();
}
```

### Állapot átmenet teszt

```csharp
[Fact]
public void Activate_WhenDraft_ShouldChangeStatusToActive()
{
    // Arrange
    var project = Project.Create("Test");

    // Act
    project.Activate();

    // Assert
    project.Status.Should().Be(ProjectStatus.Active);
}

[Fact]
public void Activate_WhenAlreadyActive_ShouldThrowWorkflowException()
{
    // Arrange
    var project = Project.Create("Test");
    project.Activate();

    // Act
    var act = () => project.Activate();

    // Assert
    act.Should().Throw<WorkflowException>();
}
```

---

## ??? Teszt elnevezési konvenció

```text
MethodName_WhenCondition_ShouldExpectedResult

Példák:
- Create_WithValidName_ShouldCreateProject
- Activate_WhenDraft_ShouldChangeStatusToActive
- Delete_WhenHasTasks_ShouldThrowException
```

---

## ? Teszt futtatás

```powershell
# Minden teszt
dotnet test

# Csak egy projekt
dotnet test JoineryTech.Flow.Core.Tests

# Verbose kimenet
dotnet test --logger "console;verbosity=detailed"

# Szûrés névre
dotnet test --filter "FullyQualifiedName~ProjectTests"
```

---

## ? Teszt checklist

Minden üzleti metódushoz:

- [ ] **Happy path** - sikeres eset
- [ ] **Validation error** - hibás input
- [ ] **Edge case** - határesetek (null, üres, max érték)
- [ ] **State transitions** - állapot átmenetek (ha van)

---

## ?? Gyakori hibák

| Hiba | Megoldás |
| ------ | ---------- |
| `Test not discovered` | Hiányzik `[Fact]` vagy `[Theory]` attribútum |
| `FluentAssertions not found` | `dotnet add package FluentAssertions` |
| `Object reference null` | Arrange részben nincs inicializálva |

---

## ?? Referencia fájlok

- `JoineryTech.Flow.Core.Tests/Entities/ProjectTests.cs`
- `JoineryTech.Flow.Core.Tests/DomainServices/ProjectWorkflowTests.cs`
