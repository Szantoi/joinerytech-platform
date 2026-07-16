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
/// Handler for CreateLeadCommand.
/// Creates new lead in "New" status, stores to repository, publishes domain events.
/// </summary>
public sealed class CreateLeadHandler : IRequestHandler<CreateLeadCommand, Result<LeadDto>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IPublisher _publisher;

    public CreateLeadHandler(ILeadRepository leadRepository, IPublisher publisher)
    {
        _leadRepository = leadRepository;
        _publisher = publisher;
    }

    public async Task<Result<LeadDto>> Handle(CreateLeadCommand request, CancellationToken cancellationToken)
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
            return leadResult.Map(x => CrmDtoMapper.ToDto(x));

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
        return Result.Success(CrmDtoMapper.ToDto(lead));
    }

}
