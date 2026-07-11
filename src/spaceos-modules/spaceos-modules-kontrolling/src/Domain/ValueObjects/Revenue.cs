namespace SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Revenue value object - planned and actual revenue
/// </summary>
public record Revenue(Money Planned, Money Actual)
{
    /// <summary>
    /// Zero revenue for a given currency
    /// </summary>
    public static Revenue Zero(string currency = "HUF") =>
        new Revenue(Money.Zero(currency), Money.Zero(currency));

    /// <summary>
    /// Variance between actual and planned revenue
    /// </summary>
    public Money Variance => Actual.Subtract(Planned);

    /// <summary>
    /// Check if revenue target was met
    /// </summary>
    public bool TargetMet => Actual.Amount >= Planned.Amount;
}
