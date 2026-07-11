// Ehs.Domain/ValueObjects/EventId.cs

namespace Ehs.Domain.ValueObjects;

/// <summary>
/// Value object representing a unique EHS event identifier.
/// </summary>
public sealed record EventId
{
    public Guid Value { get; init; }

    private EventId(Guid value) => Value = value;

    public static EventId New() => new(Guid.NewGuid());

    public static EventId From(Guid value)
    {
        if (value == Guid.Empty)
            throw new ArgumentException("EventId cannot be empty.", nameof(value));

        return new EventId(value);
    }

    public override string ToString() => Value.ToString();
}
