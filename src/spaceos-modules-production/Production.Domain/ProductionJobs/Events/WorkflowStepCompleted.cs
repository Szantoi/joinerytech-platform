using SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

namespace SpaceOS.Modules.Production.Domain.ProductionJobs.Events;

/// <summary>
/// Domain event: Workflow step completed (InProgress → Done)
/// </summary>
public record WorkflowStepCompleted(
    ProductionJobId JobId,
    WorkflowStepName StepName,
    DateTimeOffset OccurredAt,
    string? PhotoUrl
) : IDomainEvent;
