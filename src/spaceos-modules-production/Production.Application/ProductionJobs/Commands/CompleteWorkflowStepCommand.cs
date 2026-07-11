namespace SpaceOS.Modules.Production.Application.ProductionJobs.Commands;

/// <summary>
/// Command: Complete a workflow step (InProgress → Done)
/// </summary>
public record CompleteWorkflowStepCommand(
    Guid JobId,
    string StepName,
    string? PhotoUrl,
    string CompletedBy
);
