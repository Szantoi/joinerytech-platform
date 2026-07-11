using SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

namespace SpaceOS.Modules.Production.Domain.ProductionJobs.Events;

/// <summary>
/// Domain event: ProductionJob created (triggered by OrderConfirmed)
/// </summary>
public record ProductionJobStarted(
    ProductionJobId JobId,
    Guid OrderId,
    DateTimeOffset OccurredAt
) : IDomainEvent;
