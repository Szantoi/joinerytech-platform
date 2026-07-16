using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Repositories;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for UpdateOpportunityEstimateCommand.
/// Updates either estimated value or probability (or both) on an opportunity.
/// </summary>
public sealed class UpdateOpportunityEstimateHandler : IRequestHandler<UpdateOpportunityEstimateCommand, Result<OpportunityDto>>
{
    private readonly IOpportunityRepository _opportunityRepository;
    private readonly IPublisher _publisher;

    public UpdateOpportunityEstimateHandler(IOpportunityRepository opportunityRepository, IPublisher publisher)
    {
        _opportunityRepository = opportunityRepository;
        _publisher = publisher;
    }

    public async Task<Result<OpportunityDto>> Handle(UpdateOpportunityEstimateCommand request, CancellationToken cancellationToken)
    {
        var opportunity = await _opportunityRepository.GetByIdAsync(request.TenantId, request.OpportunityId, cancellationToken)
            .ConfigureAwait(false);

        if (opportunity is null)
            return Result.NotFound($"Opportunity with ID {request.OpportunityId} not found");

        Money? newValue = null;
        if (request.NewValue.HasValue)
        {
            newValue = Money.Create(request.NewValue.Value, request.Currency ?? opportunity.EstimatedValue.Currency);
        }

        var updateResult = opportunity.UpdateEstimate(newValue, request.NewProbability, request.UpdatedBy);

        if (!updateResult.IsSuccess)
            return updateResult.Map(x => CrmDtoMapper.ToDto(opportunity));

        await _opportunityRepository.UpdateAsync(opportunity, cancellationToken).ConfigureAwait(false);

        foreach (var domainEvent in opportunity.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        opportunity.ClearDomainEvents();
        return Result.Success(CrmDtoMapper.ToDto(opportunity));
    }

}
