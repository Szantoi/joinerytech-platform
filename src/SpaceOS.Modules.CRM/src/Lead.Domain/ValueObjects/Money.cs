namespace SpaceOS.Modules.CRM.Domain.ValueObjects;

/// <summary>
/// Money value object (amount + currency).
/// Immutable, properly typed for monetary values.
/// </summary>
public sealed class Money : IEquatable<Money>
{
    /// <summary>Monetary amount (in the smallest unit, e.g., cents)</summary>
    public decimal Amount { get; }

    /// <summary>ISO 4217 currency code (default: HUF)</summary>
    public string Currency { get; }

    private Money(decimal amount, string currency)
    {
        if (amount < 0)
            throw new ArgumentException("Amount cannot be negative", nameof(amount));
        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3)
            throw new ArgumentException("Currency must be 3-letter ISO code", nameof(currency));

        Amount = decimal.Round(amount, 2);
        Currency = currency.ToUpperInvariant();
    }

    public static Money Create(decimal amount, string currency = "HUF")
    {
        return new Money(amount, currency);
    }

    public static Money Zero(string currency = "HUF") => new(0, currency);

    public Money Add(Money other)
    {
        if (!Currency.Equals(other.Currency, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Cannot add {Currency} and {other.Currency}");

        return new Money(Amount + other.Amount, Currency);
    }

    public Money Subtract(Money other)
    {
        if (!Currency.Equals(other.Currency, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Cannot subtract {Currency} and {other.Currency}");

        var result = Amount - other.Amount;
        if (result < 0)
            throw new InvalidOperationException("Result would be negative");

        return new Money(result, Currency);
    }

    public Money Multiply(decimal factor)
    {
        if (factor < 0)
            throw new ArgumentException("Factor cannot be negative", nameof(factor));

        return new Money(Amount * factor, Currency);
    }

    public bool Equals(Money? other)
    {
        if (ReferenceEquals(null, other)) return false;
        return Amount == other.Amount &&
               Currency.Equals(other.Currency, StringComparison.OrdinalIgnoreCase);
    }

    public override bool Equals(object? obj) => Equals(obj as Money);

    public override int GetHashCode() => HashCode.Combine(Amount, Currency);

    public override string ToString() => $"{Amount:F2} {Currency}";

    public static bool operator ==(Money? left, Money? right)
    {
        if (ReferenceEquals(left, right)) return true;
        if (ReferenceEquals(left, null) || ReferenceEquals(right, null)) return false;
        return left.Equals(right);
    }

    public static bool operator !=(Money? left, Money? right) => !(left == right);

    public static bool operator <(Money left, Money right)
    {
        if (!left.Currency.Equals(right.Currency, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Cannot compare different currencies");
        return left.Amount < right.Amount;
    }

    public static bool operator >(Money left, Money right)
    {
        if (!left.Currency.Equals(right.Currency, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Cannot compare different currencies");
        return left.Amount > right.Amount;
    }

    public static bool operator <=(Money left, Money right) => left < right || left == right;
    public static bool operator >=(Money left, Money right) => left > right || left == right;
}
