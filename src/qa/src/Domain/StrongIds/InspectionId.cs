namespace SpaceOS.Modules.QA.Domain.StrongIds;

/// <summary>
/// Strongly-typed ID for Inspection aggregate
/// </summary>
public record InspectionId(Guid Value)
{
    public static InspectionId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
