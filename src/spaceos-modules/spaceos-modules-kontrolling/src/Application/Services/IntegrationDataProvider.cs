namespace SpaceOS.Modules.Kontrolling.Application.Services;

using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Stub integration data provider - will be replaced with real DB queries in Week 3
/// </summary>
public sealed class IntegrationDataProvider : IIntegrationDataProvider
{
    public Task<ProjectIntegrationData> GetProjectDataAsync(
        Guid projectId,
        Guid tenantId,
        CancellationToken ct = default)
    {
        // TODO: Replace with real DB queries in Week 3 (Infrastructure layer)
        // This is a stub implementation for Week 2 Application layer testing

        var revenue = new Revenue(
            Planned: Money.FromHUF(50_000_000), // 50M HUF planned
            Actual: Money.FromHUF(48_000_000)    // 48M HUF actual
        );

        var mfgPrepData = new MfgPrepCostData(
            ProjectId: projectId,
            MaterialCost: Money.FromHUF(15_000_000),
            LaborCost: Money.FromHUF(10_000_000),
            EstimatedLaborHours: 2000
        );

        var timeLogs = new List<TimeLogCostData>
        {
            new(projectId, Guid.NewGuid(), 500, 5000, Money.FromHUF(2_500_000)),
            new(projectId, Guid.NewGuid(), 600, 4500, Money.FromHUF(2_700_000))
        };

        var warehouseReceipts = new List<WarehouseReceiptData>
        {
            new(Guid.NewGuid(), projectId, Guid.NewGuid(), 100, Money.FromHUF(50_000), Money.FromHUF(5_000_000)),
            new(Guid.NewGuid(), projectId, Guid.NewGuid(), 200, Money.FromHUF(40_000), Money.FromHUF(8_000_000))
        };

        var shipments = new List<ShipmentCostData>
        {
            new(Guid.NewGuid(), projectId, Money.FromHUF(500_000), Money.FromHUF(450_000))
        };

        var supplierInvoices = new List<InboundInvoiceData>
        {
            new(Guid.NewGuid(), projectId, Guid.NewGuid(), Money.FromHUF(3_000_000), DateTime.UtcNow)
        };

        var data = new ProjectIntegrationData(
            revenue,
            mfgPrepData,
            timeLogs,
            warehouseReceipts,
            shipments,
            supplierInvoices
        );

        return Task.FromResult(data);
    }

    public Task<IEnumerable<ProjectInfo>> GetActiveProjectsAsync(
        Guid tenantId,
        CancellationToken ct = default)
    {
        // TODO: Replace with real DB queries in Week 3 (Infrastructure layer)
        // This is a stub implementation for Week 2 Application layer testing

        var projects = new List<ProjectInfo>
        {
            new(Guid.Parse("00000000-0000-0000-0000-000000000001"), "Project Alpha"),
            new(Guid.Parse("00000000-0000-0000-0000-000000000002"), "Project Beta"),
            new(Guid.Parse("00000000-0000-0000-0000-000000000003"), "Project Gamma")
        };

        return Task.FromResult<IEnumerable<ProjectInfo>>(projects);
    }
}
