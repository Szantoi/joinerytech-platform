using SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

namespace SpaceOS.Modules.Production.Domain.ProductionJobs.Events;

/// <summary>
/// Domain event: ProductionJob completed, all 6 steps Done, ready for shipping
/// </summary>
public record ProductionJobShippingReady(
    ProductionJobId JobId,
    DateTimeOffset OccurredAt
) : IDomainEvent;
