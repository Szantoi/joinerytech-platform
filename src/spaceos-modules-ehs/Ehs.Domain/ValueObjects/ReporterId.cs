// Ehs.Domain/ValueObjects/ReporterId.cs

namespace Ehs.Domain.ValueObjects;

/// <summary>
/// Value object representing the ID of the user who reported an incident.
/// </summary>
public sealed record ReporterId
{
    public Guid Value { get; init; }

    private ReporterId(Guid value) => Value = value;

    public static ReporterId From(Guid value)
    {
        if (value == Guid.Empty)
            throw new ArgumentException("ReporterId cannot be empty.", nameof(value));

        return new ReporterId(value);
    }

    public override string ToString() => Value.ToString();
}
