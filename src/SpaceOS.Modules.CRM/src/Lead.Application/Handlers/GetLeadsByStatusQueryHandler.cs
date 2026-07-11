using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get leads filtered by status.
/// </summary>
public sealed class GetLeadsByStatusQueryHandler : IRequestHandler<GetLeadsByStatusQuery, Result<List<LeadDto>>>
{
    private readonly ILeadRepository _repository;

    public GetLeadsByStatusQueryHandler(ILeadRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<List<LeadDto>>> Handle(GetLeadsByStatusQuery request, CancellationToken ct)
    {
        try
        {
            var leads = await _repository.GetByStatusAsync(request.TenantId, request.Status, ct).ConfigureAwait(false);

            var result = leads
                .Select(MapToDto)
                .ToList();

            return Result.Success(result);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve leads by status: {ex.Message}");
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
