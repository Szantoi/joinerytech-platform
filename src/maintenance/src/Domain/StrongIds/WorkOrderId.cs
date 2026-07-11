namespace SpaceOS.Modules.Maintenance.Domain.StrongIds;

/// <summary>
/// Strongly-typed ID for WorkOrder aggregate
/// </summary>
public record WorkOrderId(Guid Value)
{
    public static WorkOrderId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
