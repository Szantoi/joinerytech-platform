namespace SpaceOS.Modules.Production.Domain.ProductionJobs;

/// <summary>
/// Workflow step FSM states
/// </summary>
public enum WorkflowStepStatus
{
    /// <summary>
    /// Step is queued, waiting to be started
    /// </summary>
    Pending = 0,

    /// <summary>
    /// Step is currently in progress
    /// </summary>
    InProgress = 1,

    /// <summary>
    /// Step is completed
    /// </summary>
    Done = 2
}
