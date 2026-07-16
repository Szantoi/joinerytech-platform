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
/// Handler for UpdateLeadContactInfoCommand.
/// Updates contact information (name, email, phone, company) on a lead.
/// </summary>
public sealed class UpdateLeadContactInfoHandler : IRequestHandler<UpdateLeadContactInfoCommand, Result<LeadDto>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IPublisher _publisher;

    public UpdateLeadContactInfoHandler(ILeadRepository leadRepository, IPublisher publisher)
    {
        _leadRepository = leadRepository;
        _publisher = publisher;
    }

    public async Task<Result<LeadDto>> Handle(UpdateLeadContactInfoCommand request, CancellationToken cancellationToken)
    {
        var lead = await _leadRepository.GetByIdAsync(request.TenantId, request.LeadId, cancellationToken)
            .ConfigureAwait(false);

        if (lead is null)
            return Result.NotFound($"Lead with ID {request.LeadId} not found");

        // The aggregate takes the ContactInfo value object, not loose fields
        // (its invariants — required name, e-mail shape — live in the VO).
        var contactInfo = ContactInfo.Create(
            request.ContactName,
            request.Email,
            request.Phone,
            request.Company);

        var updateResult = lead.UpdateContactInfo(contactInfo, request.UpdatedBy);

        if (!updateResult.IsSuccess)
            return updateResult.Map(x => CrmDtoMapper.ToDto(lead));

        await _leadRepository.UpdateAsync(lead, cancellationToken).ConfigureAwait(false);

        foreach (var domainEvent in lead.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        lead.ClearDomainEvents();
        return Result.Success(CrmDtoMapper.ToDto(lead));
    }

}
