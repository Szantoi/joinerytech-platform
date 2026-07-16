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
/// Handler for CreateOpportunityCommand.
/// Creates opportunity directly (not from lead conversion).
/// Initiates in "Open" status.
/// </summary>
public sealed class CreateOpportunityHandler : IRequestHandler<CreateOpportunityCommand, Result<OpportunityDto>>
{
    private readonly IOpportunityRepository _opportunityRepository;
    private readonly IPublisher _publisher;

    public CreateOpportunityHandler(IOpportunityRepository opportunityRepository, IPublisher publisher)
    {
        _opportunityRepository = opportunityRepository;
        _publisher = publisher;
    }

    public async Task<Result<OpportunityDto>> Handle(CreateOpportunityCommand request, CancellationToken cancellationToken)
    {
        // Create contact info value object
        var contactInfo = ContactInfo.Create(
            request.ContactName,
            request.Email,
            request.Phone,
            request.Company);

        // Create money value object
        var estimatedValue = Money.Create(request.EstimatedValue, request.Currency);

        // Create opportunity aggregate using factory method
        // Note: CreateDirect() is used (not from lead)
        var opportunityResult = Opportunity.CreateDirect(
            request.TenantId,
            request.CustomerId,
            contactInfo,
            request.Title,
            estimatedValue,
            request.ExpectedCloseDate.HasValue ? new DateTimeOffset(request.ExpectedCloseDate.Value) : null,
            request.AssignedToUserId,
            request.CreatedBy);

        if (!opportunityResult.IsSuccess)
            return opportunityResult.Map(x => CrmDtoMapper.ToDto(x));

        var opportunity = opportunityResult.Value;

        // Persist aggregate
        await _opportunityRepository.AddAsync(opportunity, cancellationToken).ConfigureAwait(false);

        // Publish domain events
        foreach (var domainEvent in opportunity.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        opportunity.ClearDomainEvents();

        return Result.Success(CrmDtoMapper.ToDto(opportunity));
    }

}
