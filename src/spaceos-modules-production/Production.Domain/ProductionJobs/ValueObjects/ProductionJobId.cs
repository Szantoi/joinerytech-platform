namespace SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

/// <summary>
/// ProductionJob identifier (strongly-typed Guid)
/// </summary>
public record ProductionJobId(Guid Value)
{
    public static ProductionJobId New() => new(Guid.NewGuid());
    public static ProductionJobId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}
