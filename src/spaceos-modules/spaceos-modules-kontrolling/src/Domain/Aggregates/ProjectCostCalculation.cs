namespace SpaceOS.Modules.Kontrolling.Domain.Aggregates;

using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// ProjectCostCalculation aggregate - real-time cost calculation (NOT stored in DB)
/// Aggregates data from Production, HR, Finance, Warehouse, Logistics modules
/// </summary>
public sealed class ProjectCostCalculation
{
    /// <summary>
    /// Project identifier
    /// </summary>
    public Guid ProjectId { get; private set; }

    /// <summary>
    /// Tenant identifier
    /// </summary>
    public Guid TenantId { get; private set; }

    /// <summary>
    /// Revenue (planned vs actual)
    /// </summary>
    public Revenue Revenue { get; private set; }

    /// <summary>
    /// Cost breakdown by category
    /// </summary>
    public IReadOnlyDictionary<CostCategory, CategoryCost> CostByCategory { get; private set; }

    /// <summary>
    /// Overhead allocation configuration
    /// </summary>
    public OverheadAllocationMethod OverheadMethod { get; private set; }

    /// <summary>
    /// Overhead rate (percentage for DirectCostPercentage method)
    /// </summary>
    public decimal OverheadRate { get; private set; }

    /// <summary>
    /// Total planned cost (sum of all categories)
    /// </summary>
    public Money TotalPlannedCost { get; private set; }

    /// <summary>
    /// Total actual cost (sum of all categories)
    /// </summary>
    public Money TotalActualCost { get; private set; }

    /// <summary>
    /// Estimate at Completion (EAC) - projected total cost
    /// </summary>
    public Money CostEAC { get; private set; }

    /// <summary>
    /// Calculated overhead cost
    /// </summary>
    public Money Overhead { get; private set; }

    /// <summary>
    /// Total variance (actual - planned)
    /// </summary>
    public Money TotalVariance { get; private set; }

    /// <summary>
    /// Variance percentage relative to planned
    /// </summary>
    public decimal VariancePercentage { get; private set; }

    /// <summary>
    /// Margin based on EAC
    /// </summary>
    public Margin EACMargin { get; private set; }

    /// <summary>
    /// Timestamp of calculation
    /// </summary>
    public DateTime CalculatedAt { get; private set; }

    private ProjectCostCalculation()
    {
        // EF Core constructor
        Revenue = null!;
        CostByCategory = new Dictionary<CostCategory, CategoryCost>();
        TotalPlannedCost = null!;
        TotalActualCost = null!;
        CostEAC = null!;
        Overhead = null!;
        TotalVariance = null!;
        EACMargin = null!;
    }

    /// <summary>
    /// Calculate project costs from integration data
    /// </summary>
    public static ProjectCostCalculation Calculate(
        Guid projectId,
        Guid tenantId,
        Revenue revenue,
        Dictionary<CostCategory, (Money planned, Money actual)> costData,
        OverheadAllocationMethod overheadMethod,
        decimal overheadRate,
        decimal totalLaborHours = 0)
    {
        if (costData == null || costData.Count == 0)
            throw new ArgumentException("Cost data cannot be empty", nameof(costData));

        var calculation = new ProjectCostCalculation
        {
            ProjectId = projectId,
            TenantId = tenantId,
            Revenue = revenue,
            OverheadMethod = overheadMethod,
            OverheadRate = overheadRate,
            CalculatedAt = DateTime.UtcNow
        };

        // Build cost breakdown by category
        var costByCategory = new Dictionary<CostCategory, CategoryCost>();
        foreach (var (category, costs) in costData)
        {
            costByCategory[category] = CategoryCost.Calculate(costs.planned, costs.actual);
        }
        calculation.CostByCategory = costByCategory;

        // Calculate totals
        calculation.CalculateTotals();

        // Calculate EAC (Estimate at Completion)
        calculation.CalculateEAC();

        // Calculate overhead
        calculation.CalculateOverhead(totalLaborHours);

        // Calculate variance
        calculation.CalculateVariance();

        // Calculate margin
        calculation.EACMargin = Margin.Calculate(revenue.Actual, calculation.CostEAC);

        return calculation;
    }

    /// <summary>
    /// Calculate total planned and actual costs
    /// </summary>
    private void CalculateTotals()
    {
        var currency = CostByCategory.First().Value.Planned.Currency;
        var totalPlanned = Money.Zero(currency);
        var totalActual = Money.Zero(currency);

        foreach (var categoryCost in CostByCategory.Values)
        {
            totalPlanned = totalPlanned.Add(categoryCost.Planned);
            totalActual = totalActual.Add(categoryCost.Actual);
        }

        TotalPlannedCost = totalPlanned;
        TotalActualCost = totalActual;
    }

    /// <summary>
    /// Calculate EAC (Estimate at Completion) using MAX(planned, actual) per category
    /// EAC Formula: projected[category] = MAX(planned[category], actual[category])
    /// </summary>
    private void CalculateEAC()
    {
        var currency = TotalPlannedCost.Currency;
        var eac = Money.Zero(currency);

        foreach (var categoryCost in CostByCategory.Values)
        {
            // Use the Projected property from CategoryCost which already implements MAX logic
            eac = eac.Add(categoryCost.Projected);
        }

        CostEAC = eac;
    }

    /// <summary>
    /// Calculate overhead using configured allocation method
    /// </summary>
    private void CalculateOverhead(decimal totalLaborHours)
    {
        var currency = TotalActualCost.Currency;

        Overhead = OverheadMethod switch
        {
            OverheadAllocationMethod.DirectCostPercentage =>
                TotalActualCost.Multiply(OverheadRate / 100),

            OverheadAllocationMethod.LaborHours =>
                totalLaborHours > 0
                    ? new Money(totalLaborHours * OverheadRate, currency)
                    : Money.Zero(currency),

            OverheadAllocationMethod.Revenue =>
                Revenue.Actual.Multiply(OverheadRate / 100),

            _ => throw new InvalidOperationException($"Unknown overhead method: {OverheadMethod}")
        };
    }

    /// <summary>
    /// Calculate variance between actual and planned
    /// </summary>
    private void CalculateVariance()
    {
        TotalVariance = TotalActualCost.Subtract(TotalPlannedCost);

        // Variance percentage = (actual - planned) / planned * 100
        VariancePercentage = TotalPlannedCost.Amount != 0
            ? (TotalVariance.Amount / TotalPlannedCost.Amount) * 100
            : 0m;
    }

    /// <summary>
    /// Get cost breakdown for a specific category
    /// </summary>
    public CategoryCost? GetCategoryCost(CostCategory category)
    {
        return CostByCategory.TryGetValue(category, out var cost) ? cost : null;
    }

    /// <summary>
    /// Check if project is over budget
    /// </summary>
    public bool IsOverBudget => TotalVariance.IsPositive;

    /// <summary>
    /// Check if project is under budget
    /// </summary>
    public bool IsUnderBudget => TotalVariance.IsNegative;

    /// <summary>
    /// Check if EAC margin is profitable
    /// </summary>
    public bool IsProfitable => EACMargin.IsProfitable;

    /// <summary>
    /// Get worst performing category (highest overspend)
    /// </summary>
    public (CostCategory category, CategoryCost cost)? GetWorstPerformingCategory()
    {
        var overspentCategories = CostByCategory
            .Where(kvp => kvp.Value.IsOverspent)
            .OrderByDescending(kvp => kvp.Value.Variance.Amount)
            .FirstOrDefault();

        return overspentCategories.Key != default
            ? (overspentCategories.Key, overspentCategories.Value)
            : null;
    }

    /// <summary>
    /// Get best performing category (highest underspend)
    /// </summary>
    public (CostCategory category, CategoryCost cost)? GetBestPerformingCategory()
    {
        var underspentCategories = CostByCategory
            .Where(kvp => kvp.Value.IsUnderBudget)
            .OrderBy(kvp => kvp.Value.Variance.Amount)
            .FirstOrDefault();

        return underspentCategories.Key != default
            ? (underspentCategories.Key, underspentCategories.Value)
            : null;
    }
}
