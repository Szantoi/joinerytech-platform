using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get tasks for an opportunity.
/// </summary>
public sealed class GetOpportunityTasksQueryHandler : IRequestHandler<GetOpportunityTasksQuery, Result<List<TaskDto>>>
{
    private readonly IOpportunityRepository _repository;

    public GetOpportunityTasksQueryHandler(IOpportunityRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<List<TaskDto>>> Handle(GetOpportunityTasksQuery request, CancellationToken ct)
    {
        try
        {
            var opportunity = await _repository.GetByIdAsync(request.TenantId, request.OpportunityId, ct).ConfigureAwait(false);

            if (opportunity is null)
            {
                return Result.NotFound($"Opportunity {request.OpportunityId} not found");
            }

            var tasks = opportunity.Tasks
                .OrderByDescending(t => t.DueDate)
                .Select(MapToDto)
                .ToList();

            return Result.Success(tasks);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve opportunity tasks: {ex.Message}");
        }
    }

    private static TaskDto MapToDto(Domain.Entities.Task task)
    {
        return new TaskDto
        {
            Id = task.Id,
            Title = task.Title,
            DueDate = task.DueDate,
            Priority = task.Priority.ToString(),
            IsCompleted = task.IsCompleted,
            CreatedBy = task.CreatedBy,
            CreatedByName = task.CreatedByName ?? string.Empty,
            CreatedAt = task.CreatedAt
        };
    }
}
