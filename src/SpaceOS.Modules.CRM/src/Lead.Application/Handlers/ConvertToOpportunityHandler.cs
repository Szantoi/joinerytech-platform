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
/// Handler for ConvertToOpportunityCommand.
///
/// Coordinates two aggregates:
/// 1. Lead: Qualified → Opportunity (terminal transition)
/// 2. Opportunity: Creates new opportunity from lead data
///
/// Atomicity: Both changes must succeed or both roll back.
/// </summary>
public sealed class ConvertToOpportunityHandler : IRequestHandler<ConvertToOpportunityCommand, Result<LeadDto>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IOpportunityRepository _opportunityRepository;
    private readonly IPublisher _publisher;

    public ConvertToOpportunityHandler(
        ILeadRepository leadRepository,
        IOpportunityRepository opportunityRepository,
        IPublisher publisher)
    {
        _leadRepository = leadRepository;
        _opportunityRepository = opportunityRepository;
        _publisher = publisher;
    }

    public async Task<Result<LeadDto>> Handle(ConvertToOpportunityCommand request, CancellationToken cancellationToken)
    {
        // Step 1: Fetch lead
        var lead = await _leadRepository.GetByIdAsync(request.TenantId, request.LeadId, cancellationToken)
            .ConfigureAwait(false);

        if (lead is null)
            return Result.NotFound($"Lead with ID {request.LeadId} not found");

        // Step 2: Create contact info for opportunity
        var contactInfo = ContactInfo.Create(
            lead.ContactInfo.Name,
            lead.ContactInfo.Email,
            lead.ContactInfo.Phone,
            lead.ContactInfo.Company);

        // Step 3: Create opportunity aggregate from lead
        var estimatedValue = Money.Create(request.EstimatedValue, request.Currency);
        var opportunityResult = Opportunity.CreateFromLead(
            request.TenantId,
            lead.Id,
            request.CustomerId,
            contactInfo,
            request.Title,
            estimatedValue,
            request.ExpectedCloseDate.HasValue ? new DateTimeOffset(request.ExpectedCloseDate.Value) : null,
            lead.AssignedTo,
            request.ConvertedBy);

        if (!opportunityResult.IsSuccess)
            return opportunityResult.Map(x => CrmDtoMapper.ToDto(lead));

        var opportunity = opportunityResult.Value;

        // Step 4: Transition lead to Opportunity status
        var conversionResult = lead.ConvertToOpportunity(opportunity.Id, request.CustomerId, request.ConvertedBy);

        if (!conversionResult.IsSuccess)
            return conversionResult.Map(x => CrmDtoMapper.ToDto(lead));

        // Step 5: Persist both aggregates
        await _opportunityRepository.AddAsync(opportunity, cancellationToken).ConfigureAwait(false);
        await _leadRepository.UpdateAsync(lead, cancellationToken).ConfigureAwait(false);

        // Step 6: Publish domain events from both aggregates
        foreach (var domainEvent in lead.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        foreach (var domainEvent in opportunity.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        lead.ClearDomainEvents();
        opportunity.ClearDomainEvents();

        return Result.Success(CrmDtoMapper.ToDto(lead));
    }

}
