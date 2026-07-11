using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get single lead by ID.
/// RLS: Only if in tenant.
/// </summary>
public sealed class GetLeadByIdQueryHandler : IRequestHandler<GetLeadByIdQuery, Result<LeadDto>>
{
    private readonly ILeadRepository _repository;

    public GetLeadByIdQueryHandler(ILeadRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<LeadDto>> Handle(GetLeadByIdQuery request, CancellationToken ct)
    {
        try
        {
            var lead = await _repository.GetByIdAsync(request.TenantId, request.LeadId, ct).ConfigureAwait(false);

            if (lead is null)
            {
                return Result.NotFound($"Lead {request.LeadId} not found in tenant {request.TenantId}");
            }

            return Result.Success(MapToDto(lead));
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve lead: {ex.Message}");
        }
    }

    private static LeadDto MapToDto(Domain.Aggregates.Lead lead)
    {
        return new LeadDto
        {
            Id = lead.Id,
            TenantId = lead.TenantId,
            Status = lead.Status.ToString(),
            ContactName = lead.ContactName,
            Email = lead.ContactInfo.Email,
            Phone = lead.ContactInfo.Phone,
            Company = lead.ContactInfo.Company,
            Source = lead.Source.ToString(),
            AssignedToUserId = lead.AssignedToUserId,
            AssignedToUserName = lead.AssignedToUserName ?? string.Empty,
            OpportunityRef = lead.OpportunityRef,
            ActivityCount = lead.Activities.Count,
            TaskCount = lead.Tasks.Count,
            OpenTaskCount = lead.Tasks.Count(t => !t.IsCompleted),
            CreatedAt = lead.CreatedAt,
            CreatedByName = lead.CreatedByName ?? string.Empty,
            UpdatedAt = lead.UpdatedAt,
            UpdatedByName = lead.UpdatedByName
        };
    }
}
