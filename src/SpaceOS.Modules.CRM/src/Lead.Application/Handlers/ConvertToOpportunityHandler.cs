using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Domain.Aggregates;
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
public sealed class ConvertToOpportunityHandler : IRequestHandler<ConvertToOpportunityCommand, Result<LeadResponse>>
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

    public async Task<Result<LeadResponse>> Handle(ConvertToOpportunityCommand request, CancellationToken cancellationToken)
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
        var estimatedValue = new Money(request.EstimatedValue, request.Currency);
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
            return opportunityResult.Map(x => MapToResponse(lead));

        var opportunity = opportunityResult.Value;

        // Step 4: Transition lead to Opportunity status
        var conversionResult = lead.ConvertToOpportunity(opportunity.Id, request.CustomerId, request.ConvertedBy);

        if (!conversionResult.IsSuccess)
            return conversionResult.Map(x => MapToResponse(lead));

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

        return Result.Success(MapToResponse(lead));
    }

    private static LeadResponse MapToResponse(Lead lead)
    {
        return new LeadResponse
        {
            Id = lead.Id,
            TenantId = lead.TenantId,
            Status = lead.Status.ToString(),
            ContactName = lead.ContactInfo.Name,
            Email = lead.ContactInfo.Email,
            Phone = lead.ContactInfo.Phone,
            Company = lead.ContactInfo.Company,
            Source = lead.Source.ToString(),
            AssignedToUserId = lead.AssignedTo,
            OpportunityRef = lead.OpportunityRef,
            ActivityCount = lead.Activities.Count,
            TaskCount = lead.Tasks.Count,
            OpenTaskCount = lead.Tasks.Count(t => !t.IsCompleted),
            CreatedAt = lead.CreatedAt,
            UpdatedAt = lead.UpdatedAt
        };
    }
}

/// <summary>
/// Repository interface for Opportunity aggregate.
/// Implemented in Infrastructure layer.
/// </summary>
public interface IOpportunityRepository
{
    Task<Opportunity?> GetByIdAsync(Guid tenantId, Guid opportunityId, CancellationToken cancellationToken);
    Task<List<Opportunity>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken);
    Task<List<Opportunity>> GetByStatusAsync(Guid tenantId, string status, CancellationToken cancellationToken);
    Task<List<Opportunity>> GetByAssignedUserAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken);
    Task<List<Opportunity>> GetByLeadIdAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken);
    Task AddAsync(Opportunity opportunity, CancellationToken cancellationToken);
    Task UpdateAsync(Opportunity opportunity, CancellationToken cancellationToken);
    Task DeleteAsync(Guid tenantId, Guid opportunityId, CancellationToken cancellationToken);
}
