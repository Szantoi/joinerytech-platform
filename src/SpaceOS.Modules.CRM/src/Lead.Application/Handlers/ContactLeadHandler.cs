using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for ContactLeadCommand.
/// Transitions lead from New → Contacted status via FSM.
/// FSM validation is enforced by Lead.Contact() method.
/// </summary>
public sealed class ContactLeadHandler : IRequestHandler<ContactLeadCommand, Result<LeadDto>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IPublisher _publisher;

    public ContactLeadHandler(ILeadRepository leadRepository, IPublisher publisher)
    {
        _leadRepository = leadRepository;
        _publisher = publisher;
    }

    public async Task<Result<LeadDto>> Handle(ContactLeadCommand request, CancellationToken cancellationToken)
    {
        // Fetch lead from repository
        var lead = await _leadRepository.GetByIdAsync(request.TenantId, request.LeadId, cancellationToken)
            .ConfigureAwait(false);

        if (lead is null)
            return Result.NotFound($"Lead with ID {request.LeadId} not found");

        // Attempt FSM transition via domain method
        // This enforces: can only transition from New → Contacted
        var transitionResult = lead.Contact(request.Notes, request.ActedBy);

        if (!transitionResult.IsSuccess)
            return transitionResult.Map(x => CrmDtoMapper.ToDto(lead));

        // Persist updated aggregate
        await _leadRepository.UpdateAsync(lead, cancellationToken).ConfigureAwait(false);

        // Publish domain events
        foreach (var domainEvent in lead.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        lead.ClearDomainEvents();

        return Result.Success(CrmDtoMapper.ToDto(lead));
    }

}
