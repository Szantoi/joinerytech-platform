using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get activities for an opportunity.
/// </summary>
public sealed class GetOpportunityActivitiesQueryHandler : IRequestHandler<GetOpportunityActivitiesQuery, Result<List<ActivityDto>>>
{
    private readonly IOpportunityRepository _repository;

    public GetOpportunityActivitiesQueryHandler(IOpportunityRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<List<ActivityDto>>> Handle(GetOpportunityActivitiesQuery request, CancellationToken ct)
    {
        try
        {
            var opportunity = await _repository.GetByIdAsync(request.TenantId, request.OpportunityId, ct).ConfigureAwait(false);

            if (opportunity is null)
            {
                return Result.NotFound($"Opportunity {request.OpportunityId} not found");
            }

            var activities = opportunity.Activities
                .OrderByDescending(a => a.CreatedAt)
                .Select(MapToDto)
                .ToList();

            return Result.Success(activities);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve opportunity activities: {ex.Message}");
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
