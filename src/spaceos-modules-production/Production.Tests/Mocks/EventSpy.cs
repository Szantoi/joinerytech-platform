using SpaceOS.Modules.Production.Domain.ProductionJobs.Events;

namespace Production.Tests.Mocks;

/// <summary>
/// Spy for capturing domain events during tests.
/// </summary>
/// <typeparam name="TEvent">Domain event type to spy on</typeparam>
public class EventSpy<TEvent> where TEvent : IDomainEvent
{
    private readonly List<TEvent> _publishedEvents = new();

    /// <summary>
    /// Gets all events that were published.
    /// </summary>
    public IReadOnlyList<TEvent> PublishedEvents => _publishedEvents.AsReadOnly();

    /// <summary>
    /// Records an event as published.
    /// </summary>
    public void Record(TEvent @event)
    {
        _publishedEvents.Add(@event);
    }

    /// <summary>
    /// Clears all recorded events.
    /// </summary>
    public void Clear()
    {
        _publishedEvents.Clear();
    }
}
