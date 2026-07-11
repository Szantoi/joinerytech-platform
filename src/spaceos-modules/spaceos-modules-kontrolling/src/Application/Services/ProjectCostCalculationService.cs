namespace SpaceOS.Modules.Kontrolling.Application.Services;

using SpaceOS.Modules.Kontrolling.Domain.Aggregates;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Service for calculating project costs
/// </summary>
public sealed class ProjectCostCalculationService : IProjectCostCalculationService
{
    private readonly IIntegrationDataProvider _integrationProvider;
    private readonly IOverheadConfigRepository _overheadConfigRepo;
    private readonly ICostAdjustmentRepository _adjustmentRepo;

    public ProjectCostCalculationService(
        IIntegrationDataProvider integrationProvider,
        IOverheadConfigRepository overheadConfigRepo,
        ICostAdjustmentRepository adjustmentRepo)
    {
        _integrationProvider = integrationProvider;
        _overheadConfigRepo = overheadConfigRepo;
        _adjustmentRepo = adjustmentRepo;
    }

    public async Task<ProjectCostCalculation> CalculateAsync(
        Guid projectId,
        Guid tenantId,
        CancellationToken ct = default)
    {
        // 1. Fetch integration data
        var integrationData = await _integrationProvider.GetProjectDataAsync(
            projectId, tenantId, ct).ConfigureAwait(false);

        // 2. Fetch overhead config (default to 15% DirectCostPercentage if not found)
        var overheadConfig = await _overheadConfigRepo.GetByTenantAsync(tenantId, ct).ConfigureAwait(false)
            ?? OverheadConfig.Create(tenantId, OverheadAllocationMethod.DirectCostPercentage, 0.15m, Guid.Empty);

        // 3. Fetch cost adjustments
        var projectAdjustments = await _adjustmentRepo.GetByProjectAsync(projectId, tenantId, ct).ConfigureAwait(false);
        var portfolioAdjustments = await _adjustmentRepo.GetPortfolioAdjustmentsAsync(tenantId, ct).ConfigureAwait(false);
        var allAdjustments = projectAdjustments.Concat(portfolioAdjustments);

        // 4. Aggregate costs by category
        var costData = AggregateCostsByCategory(integrationData, allAdjustments);

        // 5. Calculate total labor hours (for LaborHours overhead method)
        var totalLaborHours = integrationData.TimeLogs.Sum(tl => tl.HoursWorked);

        // 6. Calculate using domain model
        var calculation = ProjectCostCalculation.Calculate(
            projectId,
            tenantId,
            integrationData.Revenue,
            costData,
            overheadConfig.AllocationMethod,
            overheadConfig.OverheadRate,
            totalLaborHours);

        return calculation;
    }

    private static Dictionary<CostCategory, (Money planned, Money actual)> AggregateCostsByCategory(
        Application.DTOs.ProjectIntegrationData integrationData,
        IEnumerable<Domain.Entities.CostAdjustment> adjustments)
    {
        var currency = "HUF"; // TODO: make configurable
        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>();

        // Material costs
        var materialPlanned = integrationData.MfgPrepData?.MaterialCost ?? Money.Zero(currency);
        var materialActual = integrationData.WarehouseReceipts
            .Aggregate(Money.Zero(currency), (sum, receipt) => sum.Add(receipt.TotalCost));
        costData[CostCategory.Material] = (materialPlanned, materialActual);

        // Labor costs
        var laborPlanned = integrationData.MfgPrepData?.LaborCost ?? Money.Zero(currency);
        var laborActual = integrationData.TimeLogs
            .Aggregate(Money.Zero(currency), (sum, log) => sum.Add(log.CostTotal));
        costData[CostCategory.Labor] = (laborPlanned, laborActual);

        // Supplier costs (invoices)
        var supplierPlanned = Money.Zero(currency);
        var supplierActual = integrationData.SupplierInvoices
            .Aggregate(Money.Zero(currency), (sum, invoice) => sum.Add(invoice.Amount));
        costData[CostCategory.Supplier] = (supplierPlanned, supplierActual);

        // Logistics costs
        var logisticsPlanned = integrationData.Shipments
            .Aggregate(Money.Zero(currency), (sum, shipment) => sum.Add(shipment.EstimatedCost));
        var logisticsActual = integrationData.Shipments
            .Where(s => s.ActualCost != null)
            .Aggregate(Money.Zero(currency), (sum, shipment) => sum.Add(shipment.ActualCost!));
        costData[CostCategory.Logistics] = (logisticsPlanned, logisticsActual);

        // Apply adjustments
        foreach (var adj in adjustments.Where(a => !a.IsDeleted))
        {
            if (costData.TryGetValue(adj.Category, out var existing))
            {
                var adjustedActual = existing.actual.Add(adj.Amount);
                costData[adj.Category] = (existing.planned, adjustedActual);
            }
        }

        return costData;
    }
}
