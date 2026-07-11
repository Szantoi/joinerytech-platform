using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Interfaces;

namespace SpaceOS.Modules.CRM.Application.Queries.GetLeadsByStatus;

/// <summary>
/// Handler for GetLeadsByStatusQuery
/// </summary>
public class GetLeadsByStatusQueryHandler : IRequestHandler<GetLeadsByStatusQuery, Result<IReadOnlyList<LeadResponse>>>
{
    private readonly ILeadRepository _repository;

    public GetLeadsByStatusQueryHandler(ILeadRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result<IReadOnlyList<LeadResponse>>> Handle(GetLeadsByStatusQuery request, CancellationToken ct)
    {
        var leads = await _repository.GetByStatusAsync(request.Status, request.TenantId, ct).ConfigureAwait(false);

        var responses = leads.Select(lead => new LeadResponse
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
        }).ToList();

        return Result<IReadOnlyList<LeadResponse>>.Success(responses);
    }
}
