using SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

namespace SpaceOS.Modules.Production.Domain.ProductionJobs.Events;

/// <summary>
/// Domain event: Workflow step started (Pending → InProgress)
/// </summary>
public record WorkflowStepStarted(
    ProductionJobId JobId,
    WorkflowStepName StepName,
    DateTimeOffset OccurredAt
) : IDomainEvent;
