namespace SpaceOS.Modules.Production.Application.ProductionJobs.Commands;

/// <summary>
/// Command: Start a workflow step (Pending → InProgress)
/// </summary>
public record StartWorkflowStepCommand(
    Guid JobId,
    string StepName
);
