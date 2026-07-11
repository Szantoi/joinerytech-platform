namespace SpaceOS.Modules.QA.Domain.StrongIds;

/// <summary>
/// Strongly-typed ID for Ticket aggregate
/// </summary>
public record TicketId(Guid Value)
{
    public static TicketId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
