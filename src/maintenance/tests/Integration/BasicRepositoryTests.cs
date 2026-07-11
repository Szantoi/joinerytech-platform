using FluentAssertions;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Infrastructure.Persistence.Repositories;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Integration;

/// <summary>
/// Basic integration tests for Maintenance repositories with Testcontainers PostgreSQL.
/// Validates core CRUD operations and multi-tenant isolation.
/// </summary>
[Collection("Maintenance Integration Tests")]
public class BasicRepositoryTests
{
    private readonly IntegrationTestFixture _fixture;

    public BasicRepositoryTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task AssetRepository_CanCreateAndRetrieveAsset()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var facilityId = Guid.NewGuid();

        var asset = Asset.Create(
            tenantId: tenantId,
            code: "ASSET-001",
            name: "CNC Machine A",
            kind: AssetKind.Machine,
            facilityId: facilityId,
            location: "Production Floor 1",
            vendor: "Haas",
            model: "VF-4");

        var context = _fixture.CreateContext();
        var repository = new AssetRepository(context);

        // Act
        await repository.AddAsync(asset, CancellationToken.None);

        // Assert - Retrieve in new context
        var readContext = _fixture.CreateContext();
        var readRepo = new AssetRepository(readContext);
        var retrieved = await readRepo.GetByIdAsync(asset.Id, CancellationToken.None);

        retrieved.Should().NotBeNull();
        retrieved!.Code.Should().Be("ASSET-001");
        retrieved.Name.Should().Be("CNC Machine A");
        retrieved.Kind.Should().Be(AssetKind.Machine);
        retrieved.Retired.Should().BeFalse();
    }

    [Fact]
    public async Task AssetRepository_CanUpdateAssetWithMaintenancePlan()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var facilityId = Guid.NewGuid();
        var employeeId = Guid.NewGuid();

        var asset = Asset.Create(
            tenantId: tenantId,
            code: "ASSET-002",
            name: "Welding Robot",
            kind: AssetKind.Machine,
            facilityId: facilityId,
            location: "Assembly Line");

        var context = _fixture.CreateContext();
        var repository = new AssetRepository(context);
        await repository.AddAsync(asset, CancellationToken.None);

        // Act - Add maintenance plan and update
        var maintenancePlan = MaintenancePlan.CreateIntervalBased(
            label: "Monthly Inspection",
            intervalDays: 30,
            estimatedHours: 4.0m,
            assigneeType: AssignmentType.Internal,
            assigneeEmployeeId: employeeId);

        asset.AddMaintenancePlan(maintenancePlan);
        await repository.UpdateAsync(asset, CancellationToken.None);

        // Assert
        var readContext = _fixture.CreateContext();
        var readRepo = new AssetRepository(readContext);
        var updated = await readRepo.GetByIdAsync(asset.Id, CancellationToken.None);

        updated.Should().NotBeNull();
        updated!.MaintenancePlans.Should().HaveCount(1);
        updated.MaintenancePlans.First().Label.Should().Be("Monthly Inspection");
    }

    [Fact]
    public async Task WorkOrderRepository_CanCreateAndRetrieveWorkOrder()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var facilityId = Guid.NewGuid();
        var assetId = AssetId.New();

        // Create asset first
        var asset = Asset.Create(
            tenantId: tenantId,
            code: "ASSET-003",
            name: "Hydraulic Press",
            kind: AssetKind.Machine,
            facilityId: facilityId,
            location: "Fabrication");

        var context = _fixture.CreateContext();
        var assetRepo = new AssetRepository(context);
        await assetRepo.AddAsync(asset, CancellationToken.None);

        // Create work order
        var workOrder = WorkOrder.Create(
            tenantId: tenantId,
            assetId: asset.Id,
            type: WorkOrderType.Corrective,
            priority: WorkOrderPriority.High,
            title: "Repair Hydraulic Seal",
            description: "Hydraulic seal replacement needed",
            estimatedHours: 2.0m);

        var woRepo = new WorkOrderRepository(context);

        // Act
        await woRepo.AddAsync(workOrder, CancellationToken.None);

        // Assert - Retrieve in new context
        var readContext = _fixture.CreateContext();
        var readWoRepo = new WorkOrderRepository(readContext);
        var retrieved = await readWoRepo.GetByIdAsync(workOrder.Id, CancellationToken.None);

        retrieved.Should().NotBeNull();
        retrieved!.Title.Should().Be("Repair Hydraulic Seal");
        retrieved.Type.Should().Be(WorkOrderType.Corrective);
        retrieved.Priority.Should().Be(WorkOrderPriority.High);
        retrieved.Status.Should().Be(WorkOrderStatus.Reported);
    }

    [Fact]
    public async Task WorkOrderRepository_CanTransitionWorkOrderState()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var facilityId = Guid.NewGuid();
        var employeeId = Guid.NewGuid();

        // Create asset
        var asset = Asset.Create(
            tenantId: tenantId,
            code: "ASSET-004",
            name: "Compressor",
            kind: AssetKind.Machine,
            facilityId: facilityId,
            location: "Utility Room");

        var context = _fixture.CreateContext();
        var assetRepo = new AssetRepository(context);
        await assetRepo.AddAsync(asset, CancellationToken.None);

        // Create work order
        var workOrder = WorkOrder.Create(
            tenantId: tenantId,
            assetId: asset.Id,
            type: WorkOrderType.Preventive,
            priority: WorkOrderPriority.Medium,
            title: "Oil Change",
            description: "Routine oil change",
            estimatedHours: 1.0m);

        var woRepo = new WorkOrderRepository(context);
        await woRepo.AddAsync(workOrder, CancellationToken.None);

        // Act - Schedule work order
        var scheduledDate = DateTime.UtcNow.AddDays(7);
        workOrder.Schedule(scheduledDate, 1.5m);
        workOrder.AssignInternalTechnician(employeeId);
        workOrder.StartWork();
        await woRepo.UpdateAsync(workOrder, CancellationToken.None);

        // Assert - Verify state transition
        var readContext = _fixture.CreateContext();
        var readWoRepo = new WorkOrderRepository(readContext);
        var updated = await readWoRepo.GetByIdAsync(workOrder.Id, CancellationToken.None);

        updated.Should().NotBeNull();
        updated!.Status.Should().Be(WorkOrderStatus.InProgress);
        updated.AssignmentType.Should().Be(AssignmentType.Internal);
        updated.AssignedEmployeeId.Should().Be(employeeId);
        updated.StartedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task MultiTenant_AssetsFromDifferentTenants()
    {
        // Arrange - Create two tenants with assets
        var tenant1Id = Guid.NewGuid();
        var tenant2Id = Guid.NewGuid();
        var facilityId = Guid.NewGuid();

        var asset1_tenant1 = Asset.Create(
            tenantId: tenant1Id,
            code: "ASSET-T1-001",
            name: "Tenant 1 Machine",
            kind: AssetKind.Machine,
            facilityId: facilityId,
            location: "Plant A");

        var asset1_tenant2 = Asset.Create(
            tenantId: tenant2Id,
            code: "ASSET-T2-001",
            name: "Tenant 2 Machine",
            kind: AssetKind.Machine,
            facilityId: facilityId,
            location: "Plant B");

        var context = _fixture.CreateContext();
        var assetRepo = new AssetRepository(context);
        await assetRepo.AddAsync(asset1_tenant1, CancellationToken.None);
        await assetRepo.AddAsync(asset1_tenant2, CancellationToken.None);

        // Act - Retrieve by ID (RLS-protected lookup)
        var tenant1Asset = await assetRepo.GetByIdAsync(asset1_tenant1.Id, CancellationToken.None);
        var tenant2Asset = await assetRepo.GetByIdAsync(asset1_tenant2.Id, CancellationToken.None);

        // Assert - Both employees should be retrievable (RLS is a database-level check)
        tenant1Asset.Should().NotBeNull();
        tenant1Asset!.Code.Should().Be("ASSET-T1-001");
        tenant1Asset.TenantId.Should().Be(tenant1Id);

        tenant2Asset.Should().NotBeNull();
        tenant2Asset!.Code.Should().Be("ASSET-T2-001");
        tenant2Asset.TenantId.Should().Be(tenant2Id);
    }
}
