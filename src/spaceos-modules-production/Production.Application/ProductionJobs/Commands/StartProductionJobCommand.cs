namespace SpaceOS.Modules.Production.Application.ProductionJobs.Commands;

/// <summary>
/// Command: Start new ProductionJob (triggered by OrderConfirmed event)
/// </summary>
public record StartProductionJobCommand(
    Guid OrderId,
    Guid CustomerId,
    string ProjectName,
    DateTimeOffset Deadline
);

/// <summary>
/// Command result: ProductionJob ID
/// </summary>
public record StartProductionJobResult(Guid JobId);
