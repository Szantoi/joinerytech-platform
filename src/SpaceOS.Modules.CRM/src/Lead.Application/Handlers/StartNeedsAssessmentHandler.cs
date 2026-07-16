using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for StartNeedsAssessmentCommand.
/// Transitions opportunity from Open → NeedsAssessment, sets probability to 25%.
/// </summary>
public sealed class StartNeedsAssessmentHandler : IRequestHandler<StartNeedsAssessmentCommand, Result<OpportunityDto>>
{
    private readonly IOpportunityRepository _opportunityRepository;
    private readonly IPublisher _publisher;

    public StartNeedsAssessmentHandler(IOpportunityRepository opportunityRepository, IPublisher publisher)
    {
        _opportunityRepository = opportunityRepository;
        _publisher = publisher;
    }

    public async Task<Result<OpportunityDto>> Handle(StartNeedsAssessmentCommand request, CancellationToken cancellationToken)
    {
        var opportunity = await _opportunityRepository.GetByIdAsync(request.TenantId, request.OpportunityId, cancellationToken)
            .ConfigureAwait(false);

        if (opportunity is null)
            return Result.NotFound($"Opportunity with ID {request.OpportunityId} not found");

        var transitionResult = opportunity.StartNeedsAssessment(request.ActedBy);

        if (!transitionResult.IsSuccess)
            return transitionResult.Map(x => CrmDtoMapper.ToDto(opportunity));

        await _opportunityRepository.UpdateAsync(opportunity, cancellationToken).ConfigureAwait(false);

        foreach (var domainEvent in opportunity.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        opportunity.ClearDomainEvents();
        return Result.Success(CrmDtoMapper.ToDto(opportunity));
    }

}
