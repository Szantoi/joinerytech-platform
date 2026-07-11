using System;

namespace JoineryTech.CRM.Domain.ValueObjects;

/// <summary>
/// Money Value Object - Currency-aware monetary value.
/// </summary>
public readonly record struct Money
{
    public decimal Amount { get; }
    public Currency Currency { get; }

    public Money(decimal amount, Currency currency)
    {
        if (amount < 0)
            throw new DomainException("Money amount cannot be negative");

        Amount = amount;
        Currency = currency;
    }

    public static Money Zero(Currency currency) => new(0m, currency);

    public static Money From(decimal amount, string currencyCode) =>
        new(amount, Currency.From(currencyCode));

    /// <summary>
    /// Formats money for display (e.g., "1,000,000 Ft", "€12,500.00")
    /// </summary>
    public string Formatted()
    {
        return Currency.Code switch
        {
            "HUF" => $"{Amount:N0} Ft",
            "EUR" => $"€{Amount:N2}",
            "USD" => $"${Amount:N2}",
            _ => $"{Amount:N2} {Currency.Code}"
        };
    }

    // ========== Arithmetic Operations ==========

    /// <summary>
    /// Adds two Money values. Throws if currencies don't match.
    /// </summary>
    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new DomainException("Cannot add money with different currencies");

        return new Money(Amount + other.Amount, Currency);
    }

    /// <summary>
    /// Subtracts two Money values. Throws if currencies don't match.
    /// </summary>
    public Money Subtract(Money other)
    {
        if (Currency != other.Currency)
            throw new DomainException("Cannot subtract money with different currencies");

        return new Money(Amount - other.Amount, Currency);
    }

    /// <summary>
    /// Multiplies Money by a factor.
    /// </summary>
    public Money Multiply(decimal factor)
    {
        return new Money(Amount * factor, Currency);
    }

    /// <summary>
    /// Divides Money by a divisor.
    /// </summary>
    public Money Divide(decimal divisor)
    {
        if (divisor == 0)
            throw new DomainException("Cannot divide by zero");

        return new Money(Amount / divisor, Currency);
    }

    // ========== Comparison Operators ==========

    public static bool operator >(Money left, Money right)
    {
        if (left.Currency != right.Currency)
            throw new DomainException("Cannot compare money with different currencies");

        return left.Amount > right.Amount;
    }

    public static bool operator <(Money left, Money right)
    {
        if (left.Currency != right.Currency)
            throw new DomainException("Cannot compare money with different currencies");

        return left.Amount < right.Amount;
    }

    public static bool operator >=(Money left, Money right) => left > right || left.Amount == right.Amount;
    public static bool operator <=(Money left, Money right) => left < right || left.Amount == right.Amount;
}

/// <summary>
/// Currency Value Object - ISO 4217 currency code.
/// </summary>
public readonly record struct Currency
{
    public string Code { get; }

    private Currency(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainException("Currency code cannot be empty");
        if (code.Length != 3)
            throw new DomainException("Currency code must be 3 characters (ISO 4217)");

        Code = code.ToUpperInvariant();
    }

    public static Currency From(string code) => new(code);

    // Common currencies
    public static Currency HUF => new("HUF");
    public static Currency EUR => new("EUR");
    public static Currency USD => new("USD");
}
