using SpaceOS.Modules.CRM.Application.Interfaces;
using SpaceOS.Modules.Contracts.CRM.Events;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Event handler for QuoteCreatedFromOpportunityEvent (Sales → CRM) (ADR-063)
/// Completes the conversion: Converting → Won with QuoteRef
/// NOTE: Phase 1 - Called manually in integration tests. Phase 2 will integrate with event bus.
/// </summary>
public class QuoteCreatedFromOpportunityEventHandler
{
    private readonly IOpportunityRepository _repository;

    public QuoteCreatedFromOpportunityEventHandler(IOpportunityRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task HandleAsync(QuoteCreatedFromOpportunityEvent notification, CancellationToken ct)
    {
        try
        {
            var opportunity = await _repository.GetByIdAsync(notification.OpportunityId, ct).ConfigureAwait(false);

            if (opportunity == null || opportunity.ConversionId != notification.ConversionId)
            {
                // Ignore stale event (opportunity not found or conversionId mismatch)
                return;
            }

            // FSM transition: Converting → Won
            opportunity.CompleteConversion(notification.QuoteId);

            await _repository.SaveChangesAsync(ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            // Log error but don't throw (event handler should be idempotent)
            // TODO: Add structured logging
            Console.Error.WriteLine($"Error handling QuoteCreatedFromOpportunityEvent: {ex.Message}");
        }
    }
}
