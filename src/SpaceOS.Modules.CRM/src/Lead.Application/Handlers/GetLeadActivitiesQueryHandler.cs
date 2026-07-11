using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get activities for a lead.
/// </summary>
public sealed class GetLeadActivitiesQueryHandler : IRequestHandler<GetLeadActivitiesQuery, Result<List<ActivityDto>>>
{
    private readonly ILeadRepository _repository;

    public GetLeadActivitiesQueryHandler(ILeadRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<List<ActivityDto>>> Handle(GetLeadActivitiesQuery request, CancellationToken ct)
    {
        try
        {
            var lead = await _repository.GetByIdAsync(request.TenantId, request.LeadId, ct).ConfigureAwait(false);

            if (lead is null)
            {
                return Result.NotFound($"Lead {request.LeadId} not found");
            }

            var activities = lead.Activities
                .OrderByDescending(a => a.CreatedAt)
                .Select(MapToDto)
                .ToList();

            return Result.Success(activities);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve lead activities: {ex.Message}");
        }
    }

    private static ActivityDto MapToDto(Domain.Entities.Activity activity)
    {
        return new ActivityDto
        {
            Type = activity.Type.ToString(),
            Description = activity.Description,
            CreatedBy = activity.CreatedBy,
            CreatedByName = activity.CreatedByName ?? string.Empty,
            CreatedAt = activity.CreatedAt
        };
    }
}
