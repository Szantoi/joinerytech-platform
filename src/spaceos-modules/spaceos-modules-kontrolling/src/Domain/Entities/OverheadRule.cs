namespace SpaceOS.Modules.Kontrolling.Domain.Entities;

using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Category-specific overhead rule (owned by OverheadConfig).
/// Allows excluding categories from overhead or applying custom rates.
/// </summary>
public sealed class OverheadRule
{
    /// <summary>
    /// Cost category this rule applies to
    /// </summary>
    public CostCategory CostCategory { get; private set; }

    /// <summary>
    /// If true, exclude this category from overhead calculation
    /// </summary>
    public bool Exclude { get; private set; }

    /// <summary>
    /// Custom overhead rate for this category (overrides default config rate)
    /// </summary>
    public decimal? CustomRate { get; private set; }

    // EF Core constructor
    private OverheadRule()
    {
    }

    /// <summary>
    /// Create a new overhead rule
    /// </summary>
    internal static OverheadRule Create(
        CostCategory category,
        bool exclude,
        decimal? customRate)
    {
        // Validation: Cannot have both exclude=true AND custom rate
        if (exclude && customRate.HasValue)
        {
            throw new InvalidOperationException("Cannot exclude a category and provide a custom rate at the same time");
        }

        // Validation: If not excluded, should have either default or custom rate
        if (!exclude && customRate.HasValue && customRate.Value < 0)
        {
            throw new ArgumentException("Custom rate cannot be negative", nameof(customRate));
        }

        return new OverheadRule
        {
            CostCategory = category,
            Exclude = exclude,
            CustomRate = customRate
        };
    }

    /// <summary>
    /// Update the overhead rule
    /// </summary>
    internal void Update(bool exclude, decimal? customRate)
    {
        // Validation: Cannot have both exclude=true AND custom rate
        if (exclude && customRate.HasValue)
        {
            throw new InvalidOperationException("Cannot exclude a category and provide a custom rate at the same time");
        }

        // Validation: If not excluded, custom rate (if provided) cannot be negative
        if (!exclude && customRate.HasValue && customRate.Value < 0)
        {
            throw new ArgumentException("Custom rate cannot be negative", nameof(customRate));
        }

        Exclude = exclude;
        CustomRate = customRate;
    }
}
