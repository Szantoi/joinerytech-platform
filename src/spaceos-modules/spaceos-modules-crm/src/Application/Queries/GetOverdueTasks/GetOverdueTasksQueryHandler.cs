using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Interfaces;

namespace SpaceOS.Modules.CRM.Application.Queries.GetOverdueTasks;

/// <summary>
/// Handler for GetOverdueTasksQuery - finds all uncompleted tasks past due date
/// </summary>
public class GetOverdueTasksQueryHandler : IRequestHandler<GetOverdueTasksQuery, Result<IReadOnlyList<CrmTaskResponse>>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IOpportunityRepository _opportunityRepository;

    public GetOverdueTasksQueryHandler(
        ILeadRepository leadRepository,
        IOpportunityRepository opportunityRepository)
    {
        _leadRepository = leadRepository ?? throw new ArgumentNullException(nameof(leadRepository));
        _opportunityRepository = opportunityRepository ?? throw new ArgumentNullException(nameof(opportunityRepository));
    }

    public async Task<Result<IReadOnlyList<CrmTaskResponse>>> Handle(GetOverdueTasksQuery request, CancellationToken ct)
    {
        var results = new List<CrmTaskResponse>();

        // Get overdue tasks from Leads
        var leads = await _leadRepository.GetByStatusAsync(string.Empty, request.TenantId, ct).ConfigureAwait(false); // Get all leads for tenant
        foreach (var lead in leads)
        {
            var overdueTasks = lead.Tasks.Where(t => t.IsOverdue());
            foreach (var task in overdueTasks)
            {
                results.Add(new CrmTaskResponse
                {
                    TaskId = task.TaskId,
                    Title = task.Title,
                    DueDate = task.DueDate,
                    Priority = task.Priority.ToString(),
                    Completed = task.Completed,
                    CompletedAt = task.CompletedAt,
                    CreatedBy = task.CreatedBy,
                    CompletedBy = task.CompletedBy,
                    EntityType = "Lead",
                    EntityId = lead.Id,
                    IsOverdue = true
                });
            }
        }

        // Get overdue tasks from Opportunities
        var opportunities = await _opportunityRepository.GetAllAsync(request.TenantId, ct).ConfigureAwait(false);
        foreach (var opp in opportunities)
        {
            var overdueTasks = opp.Tasks.Where(t => t.IsOverdue());
            foreach (var task in overdueTasks)
            {
                results.Add(new CrmTaskResponse
                {
                    TaskId = task.TaskId,
                    Title = task.Title,
                    DueDate = task.DueDate,
                    Priority = task.Priority.ToString(),
                    Completed = task.Completed,
                    CompletedAt = task.CompletedAt,
                    CreatedBy = task.CreatedBy,
                    CompletedBy = task.CompletedBy,
                    EntityType = "Opportunity",
                    EntityId = opp.Id,
                    IsOverdue = true
                });
            }
        }

        // Sort by due date (most overdue first)
        var sorted = results.OrderBy(t => t.DueDate).ToList();

        return Result<IReadOnlyList<CrmTaskResponse>>.Success(sorted);
    }
}
