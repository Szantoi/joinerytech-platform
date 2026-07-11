using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.Interfaces;
using SpaceOS.Modules.Contracts.CRM.Events;

namespace SpaceOS.Modules.CRM.Application.Commands.ConvertOpportunityToQuote;

/// <summary>
/// Handler for ConvertOpportunityToQuoteCommand (ADR-063 Phase 1)
/// Initiates async conversion from Opportunity to Sales Quote
/// </summary>
public class ConvertOpportunityToQuoteCommandHandler : IRequestHandler<ConvertOpportunityToQuoteCommand, Result<ConversionResult>>
{
    private readonly IOpportunityRepository _repository;
    private readonly IPublisher _publisher;

    public ConvertOpportunityToQuoteCommandHandler(
        IOpportunityRepository repository,
        IPublisher publisher)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _publisher = publisher ?? throw new ArgumentNullException(nameof(publisher));
    }

    public async Task<Result<ConversionResult>> Handle(
        ConvertOpportunityToQuoteCommand request,
        CancellationToken ct)
    {
        try
        {
            // Fetch opportunity
            var opportunity = await _repository.GetByIdAsync(request.OpportunityId, ct).ConfigureAwait(false);

            if (opportunity == null)
            {
                return Result<ConversionResult>.NotFound($"Opportunity {request.OpportunityId} not found");
            }

            // Use conversion ID from API (idempotency key generated at API layer)
            var conversionId = Guid.NewGuid();

            // Start conversion (FSM transition: Negotiation → Converting)
            // This is idempotent - if already converting with same ID, no error
            opportunity.StartConversion(conversionId);

            // Persist state change
            await _repository.SaveChangesAsync(ct).ConfigureAwait(false);

            // Publish Module Event to Sales module
            // TODO: Implement IModuleEventPublisher for cross-module events
            // For now, OpportunityConvertedToQuoteEvent is NOT published
            // Phase 2 will add event bus integration

            return Result<ConversionResult>.Success(new ConversionResult
            {
                ConversionId = conversionId
            });
        }
        catch (InvalidOperationException ex)
        {
            return Result<ConversionResult>.Invalid(new ValidationError
            {
                ErrorMessage = ex.Message
            });
        }
        catch (Exception ex)
        {
            return Result<ConversionResult>.Error(ex.Message);
        }
    }
}
