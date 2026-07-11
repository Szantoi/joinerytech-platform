namespace SpaceOS.Modules.Production.Domain.ProductionJobs.Events;

/// <summary>
/// Domain event marker interface
/// </summary>
public interface IDomainEvent
{
    DateTimeOffset OccurredAt => DateTimeOffset.UtcNow;
}
