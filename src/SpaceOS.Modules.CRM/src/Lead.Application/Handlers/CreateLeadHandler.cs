using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for CreateLeadCommand.
/// Creates new lead in "New" status, stores to repository, publishes domain events.
/// </summary>
public sealed class CreateLeadHandler : IRequestHandler<CreateLeadCommand, Result<LeadResponse>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IPublisher _publisher;

    public CreateLeadHandler(ILeadRepository leadRepository, IPublisher publisher)
    {
        _leadRepository = leadRepository;
        _publisher = publisher;
    }

    public async Task<Result<LeadResponse>> Handle(CreateLeadCommand request, CancellationToken cancellationToken)
    {
        // Validate and create contact info
        var contactInfo = ContactInfo.Create(
            request.ContactName,
            request.Email,
            request.Phone,
            request.Company);

        // Create aggregate using factory method
        var leadResult = Lead.Create(
            request.TenantId,
            contactInfo,
            request.Source,
            request.AssignedToUserId,
            request.CreatedBy);

        if (!leadResult.IsSuccess)
            return leadResult.Map(x => MapToResponse(x));

        var lead = leadResult.Value;

        // Persist aggregate
        await _leadRepository.AddAsync(lead, cancellationToken).ConfigureAwait(false);

        // Publish domain events (for event handlers, sagas, etc.)
        foreach (var domainEvent in lead.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        // Clear events after publishing
        lead.ClearDomainEvents();

        // Return success response
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
/// Repository interface for Lead aggregate.
/// Implemented in Infrastructure layer.
/// </summary>
public interface ILeadRepository
{
    Task<Lead?> GetByIdAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken);
    Task<List<Lead>> GetByTenantAsync(Guid tenantId, CancellationToken cancellationToken);
    Task<List<Lead>> GetByStatusAsync(Guid tenantId, string status, CancellationToken cancellationToken);
    Task<List<Lead>> GetByAssignedUserAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken);
    Task AddAsync(Lead lead, CancellationToken cancellationToken);
    Task UpdateAsync(Lead lead, CancellationToken cancellationToken);
    Task DeleteAsync(Guid tenantId, Guid leadId, CancellationToken cancellationToken);
}
