using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for AbandonOpportunityCommand.
/// Transitions opportunity to Abandoned status (terminal), probability 0%, records abandonment reason.
/// </summary>
public sealed class AbandonOpportunityHandler : IRequestHandler<AbandonOpportunityCommand, Result<OpportunityDto>>
{
    private readonly IOpportunityRepository _opportunityRepository;
    private readonly IPublisher _publisher;

    public AbandonOpportunityHandler(IOpportunityRepository opportunityRepository, IPublisher publisher)
    {
        _opportunityRepository = opportunityRepository;
        _publisher = publisher;
    }

    public async Task<Result<OpportunityDto>> Handle(AbandonOpportunityCommand request, CancellationToken cancellationToken)
    {
        var opportunity = await _opportunityRepository.GetByIdAsync(request.TenantId, request.OpportunityId, cancellationToken)
            .ConfigureAwait(false);

        if (opportunity is null)
            return Result.NotFound($"Opportunity with ID {request.OpportunityId} not found");

        var abandonResult = opportunity.Abandon(request.Reason, request.AbandonedBy);

        if (!abandonResult.IsSuccess)
            return abandonResult.Map(x => CrmDtoMapper.ToDto(opportunity));

        await _opportunityRepository.UpdateAsync(opportunity, cancellationToken).ConfigureAwait(false);

        foreach (var domainEvent in opportunity.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        opportunity.ClearDomainEvents();
        return Result.Success(CrmDtoMapper.ToDto(opportunity));
    }

}
