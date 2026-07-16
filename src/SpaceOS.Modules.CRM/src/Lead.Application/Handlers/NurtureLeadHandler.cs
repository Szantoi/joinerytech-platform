using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for NurtureLeadCommand.
/// Transitions a lead Qualified → Nurturing via the FSM (wire: minosites → nurturing).
///
/// Error contract: missing lead → NotFound (404); illegal transition → Conflict
/// (409, raised by the aggregate); payload guard → Invalid (400).
/// </summary>
public sealed class NurtureLeadHandler : IRequestHandler<NurtureLeadCommand, Result<LeadDto>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IPublisher _publisher;
    private readonly ILogger<NurtureLeadHandler> _logger;

    public NurtureLeadHandler(
        ILeadRepository leadRepository,
        IPublisher publisher,
        ILogger<NurtureLeadHandler> logger)
    {
        _leadRepository = leadRepository;
        _publisher = publisher;
        _logger = logger;
    }

    public async Task<Result<LeadDto>> Handle(NurtureLeadCommand request, CancellationToken cancellationToken)
    {
        var lead = await _leadRepository
            .GetByIdAsync(request.TenantId, request.LeadId, cancellationToken)
            .ConfigureAwait(false);

        if (lead is null)
        {
            return Result.NotFound($"Lead with ID {request.LeadId} not found");
        }

        var transitionResult = lead.Nurture(request.Notes, request.ActedBy);

        if (!transitionResult.IsSuccess)
        {
            _logger.LogWarning(
                "Lead {LeadId} nurture rejected ({Status}) for tenant {TenantId}",
                request.LeadId, transitionResult.Status, request.TenantId);

            return transitionResult.Map(_ => CrmDtoMapper.ToDto(lead));
        }

        await _leadRepository.UpdateAsync(lead, cancellationToken).ConfigureAwait(false);

        foreach (var domainEvent in lead.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        lead.ClearDomainEvents();

        _logger.LogInformation(
            "Lead {LeadId} moved to nurturing for tenant {TenantId}",
            request.LeadId, request.TenantId);

        return Result.Success(CrmDtoMapper.ToDto(lead));
    }
}
