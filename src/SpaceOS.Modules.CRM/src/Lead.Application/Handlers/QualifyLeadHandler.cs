using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for QualifyLeadCommand.
/// Transitions lead from Contacted → Qualified status via FSM.
/// </summary>
public sealed class QualifyLeadHandler : IRequestHandler<QualifyLeadCommand, Result<LeadDto>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IPublisher _publisher;

    public QualifyLeadHandler(ILeadRepository leadRepository, IPublisher publisher)
    {
        _leadRepository = leadRepository;
        _publisher = publisher;
    }

    public async Task<Result<LeadDto>> Handle(QualifyLeadCommand request, CancellationToken cancellationToken)
    {
        var lead = await _leadRepository.GetByIdAsync(request.TenantId, request.LeadId, cancellationToken)
            .ConfigureAwait(false);

        if (lead is null)
            return Result.NotFound($"Lead with ID {request.LeadId} not found");

        var transitionResult = lead.Qualify(request.QualificationNotes, request.ActedBy);

        if (!transitionResult.IsSuccess)
            return transitionResult.Map(x => CrmDtoMapper.ToDto(lead));

        await _leadRepository.UpdateAsync(lead, cancellationToken).ConfigureAwait(false);

        foreach (var domainEvent in lead.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        lead.ClearDomainEvents();
        return Result.Success(CrmDtoMapper.ToDto(lead));
    }

}
