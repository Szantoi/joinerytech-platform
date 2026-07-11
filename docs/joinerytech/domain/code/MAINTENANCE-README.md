# JoineryTech Maintenance Domain — C# Skeleton Code

**Purpose:** Implementation reference for Backend terminal. These skeleton files demonstrate DDD patterns, FSM validation, and repository contracts.

---

## Files Included

| File | Purpose |
|---|---|
| `WorkOrderStatus.cs` | WorkOrder FSM enum + transition validator |
| `IAssetRepository.cs` | Repository contract for Asset aggregate (with RLS) |
| `IWorkOrderRepository.cs` | Repository contract for WorkOrder aggregate (with RLS) |
| `InvalidStateTransitionException.cs` | Domain exception for FSM violations (shared with CRM, HR) |

---

## Implementation Checklist

### Phase 1: Core Domain (Week 1-2)

**Shared Kernel**
- [ ] `AggregateRoot<TId>` base class
- [ ] `ValueObject` base class
- [ ] `Entity<TId>` base class
- [ ] `DomainEvent` base class
- [ ] `DomainException` base class

**Asset Aggregate**
- [ ] `Asset.cs` aggregate root (see MAINTENANCE_DOMAIN_MODEL.md Section 1.1)
- [ ] `AssetId.cs` strongly-typed ID
- [ ] `AssetKind.cs` enum (Machine, Vehicle, Tool, Infrastructure, IT, Room)
- [ ] `MaintenancePlan.cs` entity (preventive maintenance scheduling)
- [ ] `MaintenancePlanId.cs` strongly-typed ID
- [ ] Unit tests: 30+ test cases for Asset invariants

**WorkOrder Aggregate**
- [ ] `WorkOrder.cs` aggregate root (see MAINTENANCE_DOMAIN_MODEL.md Section 1.2)
- [ ] `WorkOrderId.cs` strongly-typed ID
- [ ] `WorkOrderStatus.cs` enum + FSM validator ✅ (provided)
- [ ] `WorkOrderType.cs` enum (Corrective, Preventive, Cleaning)
- [ ] `WorkOrderPriority.cs` enum (Critical, High, Medium, Low)
- [ ] `WorkOrderPart.cs` entity (parts used in work order)
- [ ] `InvalidStateTransitionException.cs` ✅ (shared with CRM/HR)
- [ ] Unit tests: 40+ test cases for FSM transitions + downtime blocking

**Value Objects**
- [ ] `Downtime.cs` (see MAINTENANCE_DOMAIN_MODEL.md Section 3.1)
- [ ] `AssignmentType.cs` enum (Internal, External)
- [ ] `MaintenancePlanKind.cs` enum (Preventive, Inspection)
- [ ] `MaintenanceTrigger.cs` enum (Interval, OperatingHours)

---

### Phase 2: Domain Services (Week 3)

**Asset Status Calculation**
- [ ] `IAssetStatusCalculationService.cs` interface (see MAINTENANCE_DOMAIN_MODEL.md Section 4.1)
- [ ] `AssetStatusCalculationService.cs` implementation
- [ ] `AssetStatus.cs` value object (Operational, UnderMaintenance, TemporarilyRetired, Retired)
- [ ] Unit tests: 20+ test cases for status calculation

**Preventive Maintenance Scheduling**
- [ ] `IPreventiveMaintenanceSchedulerService.cs` interface (see MAINTENANCE_DOMAIN_MODEL.md Section 4.2)
- [ ] `PreventiveMaintenanceSchedulerService.cs` implementation
- [ ] Unit tests: 25+ test cases for interval-based and operating-hours-based triggers

**Maintenance Cost Estimation**
- [ ] `IMaintenanceCostEstimatorService.cs` interface (see MAINTENANCE_DOMAIN_MODEL.md Section 4.3)
- [ ] `MaintenanceCostEstimatorService.cs` implementation
- [ ] `CostEstimate.cs` value object
- [ ] Unit tests: 15+ test cases for labor + parts cost calculation

---

### Phase 3: Repositories (Week 4)

**EF Core Configurations**
- [ ] `AssetConfiguration.cs` (see MAINTENANCE_DOMAIN_MODEL.md Section 9 - EF Core Mapping Example)
- [ ] `WorkOrderConfiguration.cs` (see Section 9)
- [ ] `MaintenancePlanConfiguration.cs` (owned entity for preventive scheduling)
- [ ] `WorkOrderPartConfiguration.cs` (owned entity for parts tracking)

**Repository Implementations**
- [ ] `AssetRepository.cs` implementing `IAssetRepository` ✅ (contract provided)
- [ ] `WorkOrderRepository.cs` implementing `IWorkOrderRepository` ✅ (contract provided)

**PostgreSQL RLS Setup**
```sql
ALTER TABLE "Assets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "Assets"
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE "WorkOrders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "WorkOrders"
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Integration Tests**
- [ ] `AssetRepositoryTests.cs` (Testcontainers, RLS validation, MaintenancePlans loading)
- [ ] `WorkOrderRepositoryTests.cs` (Testcontainers, date range queries, downtime filtering)

---

### Phase 4: CQRS Handlers (Week 5-6)

**Commands**
- [ ] `CreateAssetCommand` + handler
- [ ] `UpdateAssetCommand` + handler
- [ ] `LinkAssetToMachineCommand` + handler
- [ ] `LinkAssetToVehicleCommand` + handler
- [ ] `RecordOperatingHoursCommand` + handler
- [ ] `RetireAssetCommand` + handler
- [ ] `CreateMaintenancePlanCommand` + handler
- [ ] `CreateWorkOrderCommand` + handler
- [ ] `ScheduleWorkOrderCommand` + handler (requires `maintenance.manage` permission)
- [ ] `StartWorkOrderCommand` + handler
- [ ] `CompleteWorkOrderCommand` + handler
- [ ] `PostponeWorkOrderCommand` + handler
- [ ] `RejectWorkOrderCommand` + handler (requires `maintenance.manage` permission)
- [ ] `AddWorkOrderPartCommand` + handler

**Queries**
- [ ] `GetAssetByIdQuery` + handler
- [ ] `ListAssetsQuery` + handler
- [ ] `GetAssetsByKindQuery` + handler
- [ ] `GetAssetsByMachineIdQuery` + handler (Production integration)
- [ ] `GetWorkOrderByIdQuery` + handler
- [ ] `ListWorkOrdersQuery` + handler
- [ ] `GetWorkOrdersByAssetQuery` + handler
- [ ] `GetWorkOrdersByStatusQuery` + handler
- [ ] `GetActiveDowntimeWorkOrdersQuery` + handler (Production integration)
- [ ] `GetMaintenanceDueAssetsQuery` + handler (preventive scheduling)
- [ ] `GetMaintenanceCostEstimateQuery` + handler

**Event Handlers**
- [ ] `WorkOrderStartedEventHandler` → Block production capacity if RequiresDowntime=true
- [ ] `WorkOrderCompletedEventHandler` → Release production capacity, record labor cost
- [ ] `AssetLinkedToMachineEventHandler` → Notify Production module
- [ ] `MaintenancePlanDueEventHandler` → Create preventive WorkOrder

---

### Phase 5: API Integration (Week 6)

**REST Endpoints**
```
POST   /api/maintenance/assets              → CreateAssetCommand
GET    /api/maintenance/assets/{id}         → GetAssetByIdQuery
PATCH  /api/maintenance/assets/{id}         → UpdateAssetCommand
DELETE /api/maintenance/assets/{id}         → RetireAssetCommand
POST   /api/maintenance/assets/{id}/hours   → RecordOperatingHoursCommand

POST   /api/maintenance/work-orders         → CreateWorkOrderCommand
GET    /api/maintenance/work-orders/{id}    → GetWorkOrderByIdQuery
PATCH  /api/maintenance/work-orders/{id}/schedule → ScheduleWorkOrderCommand
PATCH  /api/maintenance/work-orders/{id}/start    → StartWorkOrderCommand
PATCH  /api/maintenance/work-orders/{id}/complete → CompleteWorkOrderCommand
PATCH  /api/maintenance/work-orders/{id}/postpone → PostponeWorkOrderCommand

GET    /api/maintenance/assets/due?date={date} → GetMaintenanceDueAssetsQuery
GET    /api/maintenance/downtime?start={start}&end={end} → GetActiveDowntimeWorkOrdersQuery
GET    /api/maintenance/cost-estimate/{workOrderId} → GetMaintenanceCostEstimateQuery
```

**OpenAPI Specification**
- [ ] Integrate Maintenance endpoints into JoineryTech OpenAPI spec
- [ ] Add WorkOrderStatus enum schema
- [ ] Add FSM transition validation error responses (400 Bad Request)

---

## Usage Examples

### Creating an Asset

```csharp
// Command
var command = new CreateAssetCommand
{
    Code = "EDGE-01",
    Name = "Homag Edgebander KAL 310/6/A/S2",
    Kind = AssetKind.Machine,
    AcquisitionDate = new DateOnly(2018, 3, 15),
    AcquisitionCost = 12500000, // 12.5M HUF
    MachineId = "MACHINE-HOMAG-EDGE-01" // Production integration
};

var result = await _mediator.Send(command);

// Result: AssetId
```

---

### Creating a Preventive Maintenance Plan

```csharp
// Command
var command = new CreateMaintenancePlanCommand
{
    AssetId = assetId,
    Kind = MaintenancePlanKind.Preventive,
    Description = "Quarterly lubrication and calibration",
    Trigger = MaintenanceTrigger.Interval,
    IntervalDays = 90, // Every 90 days
    EstimatedHours = 4
};

var result = await _mediator.Send(command);

// Result: MaintenancePlanId
```

---

### Creating a Work Order

```csharp
// Command
var command = new CreateWorkOrderCommand
{
    AssetId = assetId,
    Type = WorkOrderType.Corrective,
    Priority = WorkOrderPriority.High,
    ReportedBy = currentUserId,
    Description = "Machine stopped mid-cycle, error code E42",
    RequiresDowntime = true // Blocks production capacity
};

var result = await _mediator.Send(command);

// Result: WorkOrderId
```

---

### Scheduling a Work Order

```csharp
// Command (requires maintenance.manage permission)
var command = new ScheduleWorkOrderCommand
{
    WorkOrderId = workOrderId,
    ScheduledAt = new DateTime(2026, 8, 10, 8, 0, 0),
    TechnicianId = technicianId,
    EstimatedHours = 6
};

var result = await _mediator.Send(command);

// Events published:
// - WorkOrderScheduledEvent
// - Technician assignment created in HR module
```

---

### Starting a Work Order (Downtime Blocking)

```csharp
// Command
var command = new StartWorkOrderCommand
{
    WorkOrderId = workOrderId
};

var result = await _mediator.Send(command);

// Events published:
// - WorkOrderStartedEvent
// - MachineDowntimeStartedEvent (if RequiresDowntime=true)
//   → Production module blocks machine capacity
```

---

### FSM Transition Validation

```csharp
// INVALID transition - will throw
var workOrder = await _repository.GetByIdAsync(workOrderId);
workOrder.CompleteWorkOrder(actualHours: 6); // Throws InvalidStateTransitionException if Status != InProgress

// VALID transition
if (WorkOrderStatusTransitions.IsValidTransition(workOrder.Status, WorkOrderStatus.Scheduled))
{
    workOrder.Schedule(scheduledAt, technicianId, estimatedHours);
    await _repository.UpdateAsync(workOrder);
}
```

---

## Integration Examples

### Maintenance → Production (Downtime Blocking)

```csharp
// Production scheduling checks machine downtime before assigning task
public async Task<bool> IsMachineAvailableAsync(string machineId, DateTime date)
{
    var downtimeMap = await _maintenanceIntegration.GetDowntimeMapAsync(date, date);
    return !downtimeMap.TryGetValue((machineId, DateOnly.FromDateTime(date)), out var hasDowntime) || !hasDowntime;
}

// Maintenance publishes event when work starts
public record MachineDowntimeStartedEvent(AssetId AssetId, string MachineId, DateTime Start) : DomainEvent;
```

---

### Maintenance → HR (Technician Scheduling)

```csharp
// Work order scheduling creates technician assignment
public async Task<Assignment> CreateTechnicianAssignmentAsync(WorkOrder workOrder)
{
    if (!workOrder.TechnicianId.HasValue)
        return null;

    var assignment = Assignment.Create(
        workOrder.TechnicianId.Value,
        workOrder.ScheduledAt.Value,
        workOrder.EstimatedHours,
        AssignmentType.Maintenance
    );

    return assignment;
}
```

---

### Maintenance → Procurement (Parts Request)

```csharp
// Work order completion triggers parts replenishment
public async Task CheckPartsReplenishmentAsync(WorkOrder workOrder)
{
    foreach (var part in workOrder.Parts)
    {
        var stock = await _procurementIntegration.GetStockLevelAsync(part.PartCode);
        if (stock.Quantity < stock.ReorderPoint)
        {
            await _procurementIntegration.CreateReplenishmentRequestAsync(part.PartCode, stock.ReorderQuantity);
        }
    }
}
```

---

### Maintenance → Controlling (Cost Tracking)

```csharp
// Calculate maintenance cost for project tracking
public async Task<decimal> CalculateMaintenanceCostAsync(WorkOrder workOrder)
{
    var laborCost = await _costEstimator.CalculateLaborCostAsync(workOrder.TechnicianId, workOrder.ActualHours);
    var partsCost = workOrder.Parts.Sum(p => p.Quantity * p.UnitPrice);
    var externalCost = workOrder.AssignmentType == AssignmentType.External ? workOrder.ExternalCost : 0;

    return laborCost + partsCost + externalCost;
}
```

---

## Testing Examples

### FSM Transition Tests

```csharp
[Fact]
public void Schedule_FromReported_TransitionsToScheduled()
{
    // Arrange
    var workOrder = WorkOrder.Create(tenantId, assetId, WorkOrderType.Corrective,
        WorkOrderPriority.High, userId, "Test issue", requiresDowntime: false);

    // Act
    workOrder.Schedule(DateTime.UtcNow.AddDays(1), technicianId, estimatedHours: 4);

    // Assert
    workOrder.Status.Should().Be(WorkOrderStatus.Scheduled);
    workOrder.TechnicianId.Should().Be(technicianId);
}

[Fact]
public void Schedule_FromCompleted_ThrowsInvalidStateTransitionException()
{
    // Arrange
    var workOrder = CreateCompletedWorkOrder();

    // Act & Assert
    var act = () => workOrder.Schedule(DateTime.UtcNow.AddDays(1), technicianId, estimatedHours: 4);
    act.Should().Throw<InvalidStateTransitionException>()
        .WithMessage("Invalid WorkOrder state transition: Completed → Scheduled");
}
```

---

### Preventive Maintenance Scheduling Tests

```csharp
[Fact]
public void IsPlanDue_IntervalBased_WithinDays_ReturnsTrue()
{
    // Arrange
    var asset = CreateAsset();
    var plan = CreateMaintenancePlan(trigger: MaintenanceTrigger.Interval, intervalDays: 90);
    plan.LastDone = new DateOnly(2026, 5, 1);

    // Act
    var isDue = _scheduler.IsPlanDue(plan, asset, new DateOnly(2026, 7, 25), withinDays: 7);

    // Assert
    isDue.Should().BeTrue(); // Due on 2026-07-30 (90 days after 2026-05-01)
}

[Fact]
public void IsPlanDue_OperatingHoursBased_WithinThreshold_ReturnsTrue()
{
    // Arrange
    var asset = CreateAsset(operatingHours: 1950);
    var plan = CreateMaintenancePlan(trigger: MaintenanceTrigger.OperatingHours, intervalHours: 500);
    plan.LastDoneHours = 1500;

    // Act
    var isDue = _scheduler.IsPlanDue(plan, asset, DateOnly.FromDateTime(DateTime.Today), withinDays: 7);

    // Assert
    isDue.Should().BeTrue(); // 1950 - 1500 = 450 hours since last done, within 50-hour threshold
}
```

---

### Downtime Blocking Tests

```csharp
[Fact]
public void StartWorkOrder_RequiresDowntime_BlocksProductionCapacity()
{
    // Arrange
    var workOrder = CreateScheduledWorkOrder(requiresDowntime: true, machineId: "MACHINE-HOMAG-EDGE-01");

    // Act
    workOrder.StartWork();

    // Assert
    workOrder.Status.Should().Be(WorkOrderStatus.InProgress);
    workOrder.DomainEvents.Should().Contain(e => e is MachineDowntimeStartedEvent);
}

[Fact]
public void GetDowntimeMap_InProgressWorkOrder_ReturnsDowntimeEntry()
{
    // Arrange
    var workOrder = CreateInProgressWorkOrder(requiresDowntime: true, machineId: "MACHINE-HOMAG-EDGE-01", startedAt: new DateTime(2026, 8, 5, 8, 0, 0));

    // Act
    var downtimeMap = _service.GetDowntimeMap(new DateOnly(2026, 8, 5), new DateOnly(2026, 8, 5), new[] { workOrder });

    // Assert
    downtimeMap.Should().ContainKey(("MACHINE-HOMAG-EDGE-01", new DateOnly(2026, 8, 5)));
    downtimeMap[("MACHINE-HOMAG-EDGE-01", new DateOnly(2026, 8, 5))].Should().BeTrue();
}
```

---

## Notes for Backend Terminal

1. **RLS Enforcement:** All repository queries must enforce tenant isolation via PostgreSQL RLS (`app.tenant_id` GUC).

2. **FSM Validation:** ALWAYS validate state transitions at domain level. Never bypass `WorkOrderStatusTransitions.IsValidTransition()`.

3. **Downtime Blocking:** Only `InProgress` status with `RequiresDowntime=true` blocks production capacity. Completed work orders are historical.

4. **Operating Hours Tracking:** ALWAYS accumulate operating hours. NEVER compute from work orders. Use `Asset.RecordOperatingHours()`.

5. **Preventive Maintenance Scheduling:** Run scheduler service daily to check if plans are due. Create work orders automatically for due plans.

6. **Permission Gates:** Schedule/Reject actions require `maintenance.manage` permission. Enforce at application service level.

7. **Domain Events:** All aggregate state changes MUST publish domain events. Event handlers trigger cross-module integration (e.g., production downtime blocking, HR assignment creation).

8. **Cost Calculation:** Always compute cost from source data (labor hours, parts). NEVER store computed cost values.

9. **Asset Retirement:** Retired assets cannot record operating hours or create new work orders. Enforce at domain level.

10. **External Contractors:** WorkOrder with `AssignmentType=External` does NOT create HR Assignment. Track external cost separately.

---

**Full Domain Model:** See `/opt/spaceos/docs/joinerytech/domain/MAINTENANCE_DOMAIN_MODEL.md`
**Related:** HR Domain Model (`HR_DOMAIN_MODEL.md`), CRM Domain Model, Kontrolling Domain Model

---

*Architect Terminal - MSG-ARCHITECT-039*
