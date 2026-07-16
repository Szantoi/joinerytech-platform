using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Policies;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: flat task list across leads and opportunities (portal Feladatok screen).
/// The SLA is computed here from the configured warning window
/// (<c>Crm:Tasks:SlaSoonDays</c>) — it is never stored.
/// </summary>
public sealed class GetCrmTasksQueryHandler : IRequestHandler<GetCrmTasksQuery, Result<CrmTaskListItemDto[]>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IOpportunityRepository _opportunityRepository;
    private readonly CrmOptions _options;
    private readonly TimeProvider _timeProvider;

    public GetCrmTasksQueryHandler(
        ILeadRepository leadRepository,
        IOpportunityRepository opportunityRepository,
        IOptions<CrmOptions> options,
        TimeProvider timeProvider)
    {
        _leadRepository = leadRepository;
        _opportunityRepository = opportunityRepository;
        _options = options.Value;
        _timeProvider = timeProvider;
    }

    public async Task<Result<CrmTaskListItemDto[]>> Handle(GetCrmTasksQuery request, CancellationToken ct)
    {
        var leads = await _leadRepository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);
        var opportunities = await _opportunityRepository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);

        var now = _timeProvider.GetUtcNow();
        var soonDays = _options.Tasks.SlaSoonDays;

        var fromLeads = leads.SelectMany(lead => lead.Tasks.Select(task =>
            ToListItem(task, CrmRefType.Lead, lead.Id, lead.ContactInfo.Name, lead.AssignedTo, now, soonDays)));

        var fromOpportunities = opportunities.SelectMany(opp => opp.Tasks.Select(task =>
            ToListItem(task, CrmRefType.Opportunity, opp.Id, opp.Title, opp.AssignedTo, now, soonDays)));

        var rows = fromLeads.Concat(fromOpportunities);

        if (request.Done.HasValue)
        {
            rows = rows.Where(t => t.IsCompleted == request.Done.Value);
        }

        // Earliest deadline first — SLA breaches at the top (portal ordering).
        return Result.Success(rows.OrderBy(t => t.DueDate).ToArray());
    }

    private static CrmTaskListItemDto ToListItem(
        CrmTask task,
        CrmRefType refType,
        Guid refId,
        string refTitle,
        Guid assignedTo,
        DateTimeOffset now,
        int soonDays) => new()
    {
        Id = task.Id,
        RefType = refType,
        RefId = refId,
        RefTitle = refTitle,
        Title = task.Title,
        Priority = task.Priority,
        DueDate = task.DueDate,
        IsCompleted = task.IsCompleted,
        Sla = TaskSlaPolicy.Compute(task.DueDate, now, soonDays, task.IsCompleted),
        AssignedToUserId = assignedTo
    };
}
