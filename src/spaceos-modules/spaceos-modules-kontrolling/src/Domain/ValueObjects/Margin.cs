namespace SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Margin value object - absolute amount and percentage
/// </summary>
public record Margin(Money Amount, decimal Percentage)
{
    /// <summary>
    /// Zero margin for a given currency
    /// </summary>
    public static Margin Zero(string currency = "HUF") =>
        new Margin(Money.Zero(currency), 0m);

    /// <summary>
    /// Calculate margin from revenue and cost
    /// </summary>
    public static Margin Calculate(Money revenue, Money cost)
    {
        if (revenue.Currency != cost.Currency)
            throw new InvalidOperationException($"Currency mismatch: {revenue.Currency} vs {cost.Currency}");

        var marginAmount = revenue.Subtract(cost);

        // Avoid division by zero
        var marginPercentage = revenue.Amount != 0
            ? (marginAmount.Amount / revenue.Amount) * 100
            : 0m;

        return new Margin(marginAmount, marginPercentage);
    }

    /// <summary>
    /// Check if margin is positive (profitable)
    /// </summary>
    public bool IsProfitable => Amount.IsPositive;

    /// <summary>
    /// Check if margin is negative (loss)
    /// </summary>
    public bool IsLoss => Amount.IsNegative;
}
