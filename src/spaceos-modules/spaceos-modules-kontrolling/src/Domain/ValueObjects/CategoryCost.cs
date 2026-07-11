namespace SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Cost breakdown for a category - planned, actual, projected (EAC), and variance
/// </summary>
public record CategoryCost(
    Money Planned,
    Money Actual,
    Money Projected,    // MAX(Planned, Actual) for EAC calculation
    Money Variance      // Actual - Planned
)
{
    /// <summary>
    /// Factory method to calculate category cost from planned and actual
    /// </summary>
    public static CategoryCost Calculate(Money planned, Money actual)
    {
        // EAC formula: projected = MAX(planned, actual)
        var projected = actual.Amount > planned.Amount ? actual : planned;

        // Variance = Actual - Planned
        var variance = actual.Subtract(planned);

        return new CategoryCost(planned, actual, projected, variance);
    }

    /// <summary>
    /// Zero cost for a given currency
    /// </summary>
    public static CategoryCost Zero(string currency = "HUF")
    {
        var zero = Money.Zero(currency);
        return new CategoryCost(zero, zero, zero, zero);
    }

    /// <summary>
    /// Check if there's overspending
    /// </summary>
    public bool IsOverspent => Variance.IsPositive;

    /// <summary>
    /// Check if under budget
    /// </summary>
    public bool IsUnderBudget => Variance.IsNegative;
}
