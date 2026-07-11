using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get tasks for a lead.
/// </summary>
public sealed class GetLeadTasksQueryHandler : IRequestHandler<GetLeadTasksQuery, Result<List<TaskDto>>>
{
    private readonly ILeadRepository _repository;

    public GetLeadTasksQueryHandler(ILeadRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<List<TaskDto>>> Handle(GetLeadTasksQuery request, CancellationToken ct)
    {
        try
        {
            var lead = await _repository.GetByIdAsync(request.TenantId, request.LeadId, ct).ConfigureAwait(false);

            if (lead is null)
            {
                return Result.NotFound($"Lead {request.LeadId} not found");
            }

            var tasks = lead.Tasks
                .OrderByDescending(t => t.DueDate)
                .Select(MapToDto)
                .ToList();

            return Result.Success(tasks);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve lead tasks: {ex.Message}");
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
