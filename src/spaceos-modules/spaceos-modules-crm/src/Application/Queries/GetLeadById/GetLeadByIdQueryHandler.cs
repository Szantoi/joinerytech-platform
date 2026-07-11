using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Interfaces;

namespace SpaceOS.Modules.CRM.Application.Queries.GetLeadById;

/// <summary>
/// Handler for GetLeadByIdQuery
/// </summary>
public class GetLeadByIdQueryHandler : IRequestHandler<GetLeadByIdQuery, Result<LeadResponse>>
{
    private readonly ILeadRepository _repository;

    public GetLeadByIdQueryHandler(ILeadRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result<LeadResponse>> Handle(GetLeadByIdQuery request, CancellationToken ct)
    {
        var lead = await _repository.GetByIdAsync(request.LeadId, ct).ConfigureAwait(false);
        if (lead == null)
        {
            return Result<LeadResponse>.NotFound($"Lead with ID {request.LeadId} not found");
        }

        if (lead.TenantId != request.TenantId)
        {
            return Result<LeadResponse>.Forbidden();
        }

        var response = new LeadResponse
        {
            Id = lead.Id,
            Name = lead.ContactInfo.Name,
            Email = lead.ContactInfo.Email.Value,
            Phone = lead.ContactInfo.Phone?.Value,
            Company = lead.ContactInfo.Company,
            Status = lead.Status.ToString(),
            Source = lead.Source.ToString(),
            AssignedTo = lead.AssignedTo,
            OpportunityRef = lead.OpportunityRef,
            ActivityCount = lead.Activities.Count,
            TaskCount = lead.Tasks.Count,
            CreatedAt = lead.CreatedAt,
            UpdatedAt = lead.UpdatedAt ?? lead.CreatedAt
        };

        return Result<LeadResponse>.Success(response);
    }
}
