namespace SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

/// <summary>
/// WorkflowStep identifier (strongly-typed Guid)
/// </summary>
public record WorkflowStepId(Guid Value)
{
    public static WorkflowStepId New() => new(Guid.NewGuid());
    public static WorkflowStepId From(Guid value) => new(value);

    public override string ToString() => Value.ToString();
}
