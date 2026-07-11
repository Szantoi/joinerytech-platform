using SpaceOS.Modules.CRM.Application.Interfaces;
using SpaceOS.Modules.Contracts.CRM.Events;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Event handler for QuoteCreationFailedEvent (Sales → CRM) (ADR-063)
/// Rolls back the conversion: Converting → Negotiation
/// NOTE: Phase 1 - Called manually in integration tests. Phase 2 will integrate with event bus.
/// </summary>
public class QuoteCreationFailedEventHandler
{
    private readonly IOpportunityRepository _repository;

    public QuoteCreationFailedEventHandler(IOpportunityRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task HandleAsync(QuoteCreationFailedEvent notification, CancellationToken ct)
    {
        try
        {
            var opportunity = await _repository.GetByIdAsync(notification.OpportunityId, ct).ConfigureAwait(false);

            if (opportunity == null || opportunity.ConversionId != notification.ConversionId)
            {
                // Ignore stale event (opportunity not found or conversionId mismatch)
                return;
            }

            // FSM transition: Converting → Negotiation (rollback)
            opportunity.RollbackConversion(notification.Reason);

            await _repository.SaveChangesAsync(ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            // Log error but don't throw (event handler should be idempotent)
            // TODO: Add structured logging
            Console.Error.WriteLine($"Error handling QuoteCreationFailedEvent: {ex.Message}");
        }
    }
}
