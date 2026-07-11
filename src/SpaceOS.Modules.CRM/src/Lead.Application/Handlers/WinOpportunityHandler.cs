using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Domain.Aggregates;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for WinOpportunityCommand.
/// Transitions opportunity to Won status (terminal), probability 100%, links order reference.
/// </summary>
public sealed class WinOpportunityHandler : IRequestHandler<WinOpportunityCommand, Result<OpportunityResponse>>
{
    private readonly IOpportunityRepository _opportunityRepository;
    private readonly IPublisher _publisher;

    public WinOpportunityHandler(IOpportunityRepository opportunityRepository, IPublisher publisher)
    {
        _opportunityRepository = opportunityRepository;
        _publisher = publisher;
    }

    public async Task<Result<OpportunityResponse>> Handle(WinOpportunityCommand request, CancellationToken cancellationToken)
    {
        var opportunity = await _opportunityRepository.GetByIdAsync(request.TenantId, request.OpportunityId, cancellationToken)
            .ConfigureAwait(false);

        if (opportunity is null)
            return Result.NotFound($"Opportunity with ID {request.OpportunityId} not found");

        var finalValue = request.FinalValue.HasValue
            ? new Money(request.FinalValue.Value, request.Currency ?? opportunity.EstimatedValue.Currency)
            : null;

        var winResult = opportunity.Win(request.OrderId, finalValue, request.ActedBy);

        if (!winResult.IsSuccess)
            return winResult.Map(x => MapToResponse(opportunity));

        await _opportunityRepository.UpdateAsync(opportunity, cancellationToken).ConfigureAwait(false);

        foreach (var domainEvent in opportunity.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        opportunity.ClearDomainEvents();
        return Result.Success(MapToResponse(opportunity));
    }

    private static OpportunityResponse MapToResponse(Opportunity opportunity)
    {
        return new OpportunityResponse
        {
            Id = opportunity.Id,
            TenantId = opportunity.TenantId,
            Status = opportunity.Status.ToString(),
            LeadId = opportunity.LeadId,
            CustomerId = opportunity.CustomerId,
            ContactInfo = opportunity.ContactInfo.Name,
            Title = opportunity.Title,
            EstimatedValue = opportunity.EstimatedValue.Amount,
            Currency = opportunity.EstimatedValue.Currency,
            Probability = opportunity.Probability,
            ExpectedCloseDate = opportunity.ExpectedCloseDate,
            OrderRef = opportunity.OrderId,
            QuoteRef = opportunity.QuoteId,
            FinalValue = opportunity.FinalValue?.Amount,
            LossReason = opportunity.LossReason,
            CompetitorName = opportunity.CompetitorName,
            CreatedAt = opportunity.CreatedAt,
            UpdatedAt = opportunity.UpdatedAt
        };
    }
}
