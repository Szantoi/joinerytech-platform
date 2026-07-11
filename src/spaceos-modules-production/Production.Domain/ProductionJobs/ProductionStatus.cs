namespace SpaceOS.Modules.Production.Domain.ProductionJobs;

/// <summary>
/// ProductionJob FSM states
/// </summary>
public enum ProductionStatus
{
    /// <summary>
    /// Job is queued, no steps started yet
    /// </summary>
    Queued = 0,

    /// <summary>
    /// At least one step is InProgress or Done (but not all Done)
    /// </summary>
    InProgress = 1,

    /// <summary>
    /// All 6 steps are Done, ready for shipping
    /// </summary>
    ShippingReady = 2
}
