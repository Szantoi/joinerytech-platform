namespace SpaceOS.Modules.QA.Domain.ValueObjects;

/// <summary>
/// Money value object - amount and currency
/// </summary>
public record Money(decimal Amount, string Currency)
{
    /// <summary>
    /// Zero money with specified currency
    /// </summary>
    public static Money Zero(string currency = "HUF") => new Money(0, currency);

    /// <summary>
    /// Factory method to create money
    /// </summary>
    public static Money Create(decimal amount, string currency) => new Money(amount, currency);

    /// <summary>
    /// Add two money values (must be same currency)
    /// </summary>
    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException($"Cannot add {Currency} and {other.Currency}");

        return new Money(Amount + other.Amount, Currency);
    }

    /// <summary>
    /// Check if amount is positive
    /// </summary>
    public bool IsPositive => Amount > 0;

    /// <summary>
    /// Check if amount is zero
    /// </summary>
    public bool IsZero => Amount == 0;
}
