namespace SpaceOS.Modules.Kontrolling.Domain.Aggregates;

using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Overhead configuration aggregate root.
/// Manages tenant-level overhead calculation rules and allocation method.
/// </summary>
public sealed class OverheadConfig
{
    private readonly List<OverheadRule> _overheadRules = new();

    /// <summary>
    /// Unique identifier for this overhead configuration
    /// </summary>
    public Guid OverheadConfigId { get; private set; }

    /// <summary>
    /// Tenant that owns this configuration (unique: one config per tenant)
    /// </summary>
    public Guid TenantId { get; private set; }

    /// <summary>
    /// Overhead allocation method (PercentageOfDirectCost, PercentageOfRevenue, PerHour)
    /// </summary>
    public OverheadAllocationMethod AllocationMethod { get; private set; }

    /// <summary>
    /// Overhead rate (0.0 - 1.0 for percentage methods, hourly rate for PerHour)
    /// </summary>
    public decimal OverheadRate { get; private set; }

    /// <summary>
    /// Overhead rules collection (category-specific overrides and exclusions)
    /// </summary>
    public IReadOnlyCollection<OverheadRule> OverheadRules => _overheadRules.AsReadOnly();

    /// <summary>
    /// When this configuration was last updated
    /// </summary>
    public DateTime UpdatedAt { get; private set; }

    /// <summary>
    /// User who last updated this configuration
    /// </summary>
    public Guid UpdatedBy { get; private set; }

    // EF Core constructor
    private OverheadConfig()
    {
    }

    /// <summary>
    /// Create a new overhead configuration for a tenant
    /// </summary>
    public static OverheadConfig Create(
        Guid tenantId,
        OverheadAllocationMethod allocationMethod,
        decimal overheadRate,
        Guid createdBy)
    {
        ValidateRate(allocationMethod, overheadRate);

        return new OverheadConfig
        {
            OverheadConfigId = Guid.NewGuid(),
            TenantId = tenantId,
            AllocationMethod = allocationMethod,
            OverheadRate = overheadRate,
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = createdBy
        };
    }

    /// <summary>
    /// Update the overhead rate
    /// </summary>
    public void UpdateRate(decimal newRate, Guid updatedBy)
    {
        ValidateRate(AllocationMethod, newRate);

        OverheadRate = newRate;
        UpdatedAt = DateTime.UtcNow;
        UpdatedBy = updatedBy;
    }

    /// <summary>
    /// Update the allocation method
    /// </summary>
    public void UpdateAllocationMethod(OverheadAllocationMethod newMethod, Guid updatedBy)
    {
        ValidateRate(newMethod, OverheadRate);

        AllocationMethod = newMethod;
        UpdatedAt = DateTime.UtcNow;
        UpdatedBy = updatedBy;
    }

    /// <summary>
    /// Add a category-specific overhead rule (override or exclusion)
    /// </summary>
    public void AddRule(CostCategory category, bool exclude, decimal? customRate, Guid updatedBy)
    {
        // Validate custom rate if provided
        if (customRate.HasValue)
        {
            ValidateRate(AllocationMethod, customRate.Value);
        }

        // Check if rule already exists for this category
        var existingRule = _overheadRules.FirstOrDefault(r => r.CostCategory == category);
        if (existingRule != null)
        {
            throw new InvalidOperationException($"Overhead rule for category {category} already exists. Use UpdateRule instead.");
        }

        var rule = OverheadRule.Create(category, exclude, customRate);
        _overheadRules.Add(rule);

        UpdatedAt = DateTime.UtcNow;
        UpdatedBy = updatedBy;
    }

    /// <summary>
    /// Update an existing overhead rule
    /// </summary>
    public void UpdateRule(CostCategory category, bool exclude, decimal? customRate, Guid updatedBy)
    {
        var rule = _overheadRules.FirstOrDefault(r => r.CostCategory == category);
        if (rule == null)
        {
            throw new InvalidOperationException($"Overhead rule for category {category} not found.");
        }

        // Validate custom rate if provided
        if (customRate.HasValue)
        {
            ValidateRate(AllocationMethod, customRate.Value);
        }

        rule.Update(exclude, customRate);

        UpdatedAt = DateTime.UtcNow;
        UpdatedBy = updatedBy;
    }

    /// <summary>
    /// Remove an overhead rule for a specific category
    /// </summary>
    public void RemoveRule(CostCategory category, Guid updatedBy)
    {
        var rule = _overheadRules.FirstOrDefault(r => r.CostCategory == category);
        if (rule == null)
        {
            throw new InvalidOperationException($"Overhead rule for category {category} not found.");
        }

        _overheadRules.Remove(rule);

        UpdatedAt = DateTime.UtcNow;
        UpdatedBy = updatedBy;
    }

    /// <summary>
    /// Get effective overhead rate for a specific cost category
    /// </summary>
    public decimal GetEffectiveRate(CostCategory category)
    {
        var rule = _overheadRules.FirstOrDefault(r => r.CostCategory == category);

        // If excluded, return 0
        if (rule?.Exclude == true)
        {
            return 0m;
        }

        // If custom rate defined, return it
        if (rule?.CustomRate.HasValue == true)
        {
            return rule.CustomRate.Value;
        }

        // Otherwise return default rate
        return OverheadRate;
    }

    /// <summary>
    /// Check if a cost category is excluded from overhead calculation
    /// </summary>
    public bool IsExcluded(CostCategory category)
    {
        var rule = _overheadRules.FirstOrDefault(r => r.CostCategory == category);
        return rule?.Exclude == true;
    }

    private static void ValidateRate(OverheadAllocationMethod method, decimal rate)
    {
        if (rate < 0)
        {
            throw new ArgumentException("Overhead rate cannot be negative", nameof(rate));
        }

        // For percentage methods, rate should be 0.0 - 1.0
        if (method is OverheadAllocationMethod.DirectCostPercentage or OverheadAllocationMethod.Revenue)
        {
            if (rate > 1.0m)
            {
                throw new ArgumentException("Overhead rate for percentage methods must be between 0.0 and 1.0", nameof(rate));
            }
        }

        // For LaborHours method, rate should be reasonable (e.g., < 10,000)
        if (method == OverheadAllocationMethod.LaborHours && rate > 10000m)
        {
            throw new ArgumentException("Overhead rate per hour seems unreasonably high", nameof(rate));
        }
    }
}
