namespace SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

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
    /// Add two money values (must be same currency)
    /// </summary>
    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException($"Cannot add {Currency} and {other.Currency}");

        return new Money(Amount + other.Amount, Currency);
    }

    /// <summary>
    /// Subtract two money values (must be same currency)
    /// </summary>
    public Money Subtract(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException($"Cannot subtract {other.Currency} from {Currency}");

        return new Money(Amount - other.Amount, Currency);
    }

    /// <summary>
    /// Multiply money by a scalar
    /// </summary>
    public Money Multiply(decimal multiplier) => new Money(Amount * multiplier, Currency);

    /// <summary>
    /// Divide money by a scalar
    /// </summary>
    public Money Divide(decimal divisor)
    {
        if (divisor == 0)
            throw new DivideByZeroException("Cannot divide money by zero");

        return new Money(Amount / divisor, Currency);
    }

    /// <summary>
    /// Check if amount is positive
    /// </summary>
    public bool IsPositive => Amount > 0;

    /// <summary>
    /// Check if amount is negative
    /// </summary>
    public bool IsNegative => Amount < 0;

    /// <summary>
    /// Check if amount is zero
    /// </summary>
    public bool IsZero => Amount == 0;

    /// <summary>
    /// Factory method for HUF
    /// </summary>
    public static Money FromHUF(decimal amount) => new Money(amount, "HUF");

    // Operator overloads
    public static Money operator +(Money left, Money right) => left.Add(right);
    public static Money operator -(Money left, Money right) => left.Subtract(right);
    public static Money operator *(Money money, decimal multiplier) => money.Multiply(multiplier);
    public static Money operator /(Money money, decimal divisor) => money.Divide(divisor);
}
