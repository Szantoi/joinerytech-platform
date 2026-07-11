# JoineryTech HR Domain — C# Skeleton Code

**Purpose:** Implementation reference for Backend terminal. These skeleton files demonstrate DDD patterns, FSM validation, and repository contracts.

---

## Files Included

| File | Purpose |
|---|---|
| `AbsenceStatus.cs` | Absence FSM enum + transition validator |
| `IEmployeeRepository.cs` | Repository contract for Employee aggregate (with RLS) |
| `IAbsenceRepository.cs` | Repository contract for Absence aggregate (with RLS) |
| `InvalidStateTransitionException.cs` | Domain exception for FSM violations (shared with CRM) |

---

## Implementation Checklist

### Phase 1: Core Domain (Week 1-2)

**Shared Kernel**
- [ ] `AggregateRoot<TId>` base class
- [ ] `ValueObject` base class
- [ ] `Entity<TId>` base class
- [ ] `DomainEvent` base class
- [ ] `DomainException` base class

**Employee Aggregate**
- [ ] `Employee.cs` aggregate root (see HR_DOMAIN_MODEL.md Section 1.1)
- [ ] `EmployeeId.cs` strongly-typed ID
- [ ] `Department.cs` enum
- [ ] `EmploymentType.cs` enum
- [ ] Unit tests: 30+ test cases for Employee invariants

**Absence Aggregate**
- [ ] `Absence.cs` aggregate root (see HR_DOMAIN_MODEL.md Section 1.2)
- [ ] `AbsenceId.cs` strongly-typed ID
- [ ] `AbsenceStatus.cs` enum + FSM validator ✅ (provided)
- [ ] `AbsenceType.cs` enum
- [ ] `InvalidStateTransitionException.cs` ✅ (provided)
- [ ] Unit tests: 30+ test cases for FSM transitions

**Value Objects**
- [ ] `PersonalData.cs` (see HR_DOMAIN_MODEL.md Section 2.1)
- [ ] `Skill.cs` + `SkillKey.cs` + `SkillLevel.cs` (see Section 2.2)
- [ ] `PayGrade.cs` (see Section 2.3)
- [ ] `MaritalStatus.cs` enum (see Section 2.7)
- [ ] `Email.cs` (shared with CRM)
- [ ] `Color.cs` (UI avatar color)
- [ ] `Address.cs` (shared)

---

### Phase 2: Domain Services (Week 3)

**Capacity Calculation**
- [ ] `ICapacityCalculationService.cs` interface (see HR_DOMAIN_MODEL.md Section 3.1)
- [ ] `CapacityCalculationService.cs` implementation
- [ ] `DailyLoad.cs` value object
- [ ] `WeekSummary.cs` value object
- [ ] Unit tests: 20+ test cases for capacity calculation

**Vacation Entitlement**
- [ ] `IVacationEntitlementService.cs` interface (see HR_DOMAIN_MODEL.md Section 3.2)
- [ ] `VacationEntitlementService.cs` implementation
- [ ] `VacationEntitlement.cs` value object
- [ ] `VacationBalance.cs` value object
- [ ] `SickLeaveBalance.cs` value object
- [ ] Unit tests: 15+ test cases for Hungarian Labor Code compliance

---

### Phase 3: Repositories (Week 4)

**EF Core Configurations**
- [ ] `EmployeeConfiguration.cs` (see HR_DOMAIN_MODEL.md Section 9 - EF Core Mapping Example)
- [ ] `AbsenceConfiguration.cs` (see Section 9)
- [ ] `AssignmentConfiguration.cs` (owned entity for capacity tracking)

**Repository Implementations**
- [ ] `EmployeeRepository.cs` implementing `IEmployeeRepository` ✅ (contract provided)
- [ ] `AbsenceRepository.cs` implementing `IAbsenceRepository` ✅ (contract provided)

**PostgreSQL RLS Setup**
```sql
ALTER TABLE "Employees" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "Employees"
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE "Absences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "Absences"
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Integration Tests**
- [ ] `EmployeeRepositoryTests.cs` (Testcontainers, RLS validation)
- [ ] `AbsenceRepositoryTests.cs` (Testcontainers, date range queries)

---

### Phase 4: CQRS Handlers (Week 5-6)

**Commands**
- [ ] `CreateEmployeeCommand` + handler
- [ ] `UpdateEmployeeCommand` + handler
- [ ] `AddEmployeeSkillCommand` + handler
- [ ] `UpdateEmployeeSkillCommand` + handler
- [ ] `DeactivateEmployeeCommand` + handler
- [ ] `CreateAbsenceCommand` + handler
- [ ] `ApproveAbsenceCommand` + handler (requires `hr.manage` permission)
- [ ] `RejectAbsenceCommand` + handler (requires `hr.manage` permission)
- [ ] `StartAbsenceCommand` + handler
- [ ] `CompleteAbsenceCommand` + handler

**Queries**
- [ ] `GetEmployeeByIdQuery` + handler
- [ ] `ListEmployeesQuery` + handler
- [ ] `GetEmployeesBySkillQuery` + handler
- [ ] `GetAbsenceByIdQuery` + handler
- [ ] `ListAbsencesQuery` + handler
- [ ] `GetAbsencesByEmployeeQuery` + handler
- [ ] `GetVacationBalanceQuery` + handler
- [ ] `GetDailyCapacityQuery` + handler
- [ ] `GetOverloadsQuery` + handler

**Event Handlers**
- [ ] `AbsenceApprovedEventHandler` → Send notification
- [ ] `AbsenceRejectedEventHandler` → Send notification
- [ ] `EmployeeCreatedEventHandler` → Initialize EHS training records
- [ ] `EmployeeDeactivatedEventHandler` → Cancel active assignments

---

### Phase 5: API Integration (Week 6)

**REST Endpoints**
```
POST   /api/hr/employees              → CreateEmployeeCommand
GET    /api/hr/employees/{id}         → GetEmployeeByIdQuery
PATCH  /api/hr/employees/{id}         → UpdateEmployeeCommand
DELETE /api/hr/employees/{id}         → DeactivateEmployeeCommand
POST   /api/hr/employees/{id}/skills  → AddEmployeeSkillCommand

POST   /api/hr/absences               → CreateAbsenceCommand
GET    /api/hr/absences/{id}          → GetAbsenceByIdQuery
PATCH  /api/hr/absences/{id}/approve  → ApproveAbsenceCommand
PATCH  /api/hr/absences/{id}/reject   → RejectAbsenceCommand

GET    /api/hr/employees/{id}/vacation-balance → GetVacationBalanceQuery
GET    /api/hr/capacity/daily?date={date}      → GetDailyCapacityQuery
GET    /api/hr/capacity/overloads?start={start}&end={end} → GetOverloadsQuery
```

**OpenAPI Specification**
- [ ] Integrate HR endpoints into JoineryTech OpenAPI spec
- [ ] Add AbsenceStatus enum schema
- [ ] Add FSM transition validation error responses (400 Bad Request)

---

## Usage Examples

### Creating an Employee

```csharp
// Command
var command = new CreateEmployeeCommand
{
    Name = "Kovács János",
    Role = "Szakmunkás",
    Department = Department.Production,
    FacilityId = facilityId,
    PayGrade = PayGrade.Skilled,
    WeeklyHours = 40,
    Email = "janos.kovacs@example.com"
};

var result = await _mediator.Send(command);

// Result: EmployeeId
```

---

### Creating an Absence Request

```csharp
// Command
var command = new CreateAbsenceCommand
{
    EmployeeId = employeeId,
    Type = AbsenceType.Vacation,
    StartDate = new DateOnly(2026, 8, 1),
    EndDate = new DateOnly(2026, 8, 15),
    Reason = "Nyári szabadság"
};

var result = await _mediator.Send(command);

// Result: AbsenceId
```

---

### Approving an Absence

```csharp
// Command (requires hr.manage permission)
var command = new ApproveAbsenceCommand
{
    AbsenceId = absenceId,
    ApprovedBy = currentUserId
};

var result = await _mediator.Send(command);

// Events published:
// - AbsenceApprovedEvent
// - Capacity recalculation triggered
```

---

### Calculating Vacation Balance

```csharp
// Query
var query = new GetVacationBalanceQuery
{
    EmployeeId = employeeId,
    Year = 2026
};

var balance = await _mediator.Send(query);

// Result:
// {
//   "entitlement": 22,     // Base 20 + 1 child (+2)
//   "base": 20,
//   "childExtra": 2,
//   "used": 10,
//   "remaining": 12
// }
```

---

### FSM Transition Validation

```csharp
// INVALID transition - will throw
var absence = await _repository.GetByIdAsync(absenceId);
absence.CompleteAbsence(); // Throws InvalidStateTransitionException if Status != InProgress

// VALID transition
if (AbsenceStatusTransitions.IsValidTransition(absence.Status, AbsenceStatus.Approved))
{
    absence.Approve(currentUserId);
    await _repository.UpdateAsync(absence);
}
```

---

## Integration Examples

### HR → Production (Capacity Check)

```csharp
// Production scheduling checks capacity before assigning task
public async Task<bool> CanAssignTaskAsync(EmployeeId employeeId, DateOnly date, decimal requiredHours)
{
    var capacity = await _capacityService.CalculateDailyCapacity(employee);
    var load = await _capacityService.CalculateDailyLoad(employeeId, date, assignments, absences);

    return !load.IsAbsent && (load.Hours + requiredHours <= capacity);
}
```

---

### HR → EHS (Training Records)

```csharp
// EHS module queries employee info
public async Task<EmployeeInfo> GetEmployeeInfoAsync(EmployeeId employeeId)
{
    var employee = await _employeeRepository.GetByIdAsync(employeeId);
    if (employee == null)
        return null;

    return new EmployeeInfo(employee.Id, employee.Name, employee.Department);
}
```

---

### HR → Controlling (Labor Cost)

```csharp
// Controlling calculates labor cost from time logs
public async Task<decimal> CalculateLaborCostAsync(TimeLog timeLog)
{
    var hourlyRate = await _hrIntegration.GetHourlyRateAsync(timeLog.EmployeeId);
    var loadMultiplier = 1.9m; // Gross wage → loaded shop rate
    return timeLog.Hours * hourlyRate * loadMultiplier;
}
```

---

## Testing Examples

### FSM Transition Tests

```csharp
[Fact]
public void Approve_FromPending_TransitionsToApproved()
{
    // Arrange
    var absence = Absence.Create(tenantId, employeeId, AbsenceType.Vacation,
        new DateOnly(2026, 8, 1), new DateOnly(2026, 8, 15), "Nyári szabadság");

    // Act
    absence.Approve(managerId);

    // Assert
    absence.Status.Should().Be(AbsenceStatus.Approved);
    absence.ApprovedByUserId.Should().Be(managerId);
}

[Fact]
public void Approve_FromCompleted_ThrowsInvalidStateTransitionException()
{
    // Arrange
    var absence = CreateCompletedAbsence();

    // Act & Assert
    var act = () => absence.Approve(managerId);
    act.Should().Throw<InvalidStateTransitionException>()
        .WithMessage("Invalid Absence state transition: Completed → Approved");
}
```

---

### Capacity Calculation Tests

```csharp
[Fact]
public void CalculateDailyLoad_WithApprovedAbsence_ReturnsAbsent()
{
    // Arrange
    var employee = CreateEmployee(weeklyHours: 40);
    var absence = CreateAbsence(AbsenceStatus.Approved, new DateOnly(2026, 8, 1), new DateOnly(2026, 8, 1));
    var assignments = new List<Assignment>();

    // Act
    var load = _service.CalculateDailyLoad(employee.Id, new DateOnly(2026, 8, 1), assignments, new[] { absence });

    // Assert
    load.IsAbsent.Should().BeTrue();
    load.Hours.Should().Be(0);
}

[Fact]
public void CalculateEntitlement_With2Children_Returns24Days()
{
    // Arrange
    var employee = CreateEmployee(children: 2);

    // Act
    var entitlement = _service.CalculateEntitlement(employee);

    // Assert
    entitlement.Base.Should().Be(20);
    entitlement.ChildExtra.Should().Be(4); // Mt. §118: 2 children → +4 days
    entitlement.Total.Should().Be(24);
}
```

---

## Notes for Backend Terminal

1. **RLS Enforcement:** All repository queries must enforce tenant isolation via PostgreSQL RLS (`app.tenant_id` GUC).

2. **FSM Validation:** ALWAYS validate state transitions at domain level. Never bypass `AbsenceStatusTransitions.IsValidTransition()`.

3. **Hungarian Labor Code:** Vacation entitlement calculation MUST comply with Mt. §118 (child vacation days) and §123 (sick leave).

4. **Capacity Calculation:** Always compute capacity from source data (assignments, absences). NEVER store computed capacity values.

5. **Permission Gates:** Approve/Reject actions require `hr.manage` permission. Enforce at application service level.

6. **Domain Events:** All aggregate state changes MUST publish domain events. Event handlers trigger cross-module integration (e.g., capacity recalculation, EHS notifications).

7. **Personal Data:** `PersonalData` value object contains sensitive information. Enforce `hr.manage` permission for read/write access.

---

**Full Domain Model:** See `/opt/spaceos/docs/joinerytech/domain/HR_DOMAIN_MODEL.md`
**Related:** CRM Domain Model (`CRM_DOMAIN_MODEL.md`), Kontrolling Domain Model, Maintenance Domain Model

---

*Architect Terminal - MSG-ARCHITECT-038*
