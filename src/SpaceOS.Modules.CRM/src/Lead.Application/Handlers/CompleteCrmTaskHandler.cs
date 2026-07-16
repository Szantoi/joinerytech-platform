using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Policies;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for CompleteCrmTaskCommand — completes a task addressed by its id alone.
///
/// Tasks are child entities of EITHER aggregate, and the portal's Feladatok screen
/// completes them from the flat list without knowing the parent
/// (<c>POST /api/crm/tasks/{id}/complete</c>). So the owning aggregate is resolved
/// first, then the domain method does the work.
/// </summary>
public sealed class CompleteCrmTaskHandler : IRequestHandler<CompleteCrmTaskCommand, Result<CrmTaskListItemDto>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IOpportunityRepository _opportunityRepository;
    private readonly IPublisher _publisher;
    private readonly CrmOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<CompleteCrmTaskHandler> _logger;

    public CompleteCrmTaskHandler(
        ILeadRepository leadRepository,
        IOpportunityRepository opportunityRepository,
        IPublisher publisher,
        IOptions<CrmOptions> options,
        TimeProvider timeProvider,
        ILogger<CompleteCrmTaskHandler> logger)
    {
        _leadRepository = leadRepository;
        _opportunityRepository = opportunityRepository;
        _publisher = publisher;
        _options = options.Value;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<Result<CrmTaskListItemDto>> Handle(CompleteCrmTaskCommand request, CancellationToken ct)
    {
        var leads = await _leadRepository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);
        var owningLead = leads.FirstOrDefault(l => l.Tasks.Any(t => t.Id == request.TaskId));

        if (owningLead is not null)
        {
            var result = owningLead.CompleteTask(request.TaskId, request.CompletedBy);
            if (!result.IsSuccess)
            {
                return result.Map(_ => default(CrmTaskListItemDto)!);
            }

            await _leadRepository.UpdateAsync(owningLead, ct).ConfigureAwait(false);
            await PublishAsync(owningLead.GetDomainEvents(), ct).ConfigureAwait(false);
            owningLead.ClearDomainEvents();

            _logger.LogInformation(
                "CRM task {TaskId} completed on lead {LeadId} for tenant {TenantId}",
                request.TaskId, owningLead.Id, request.TenantId);

            var task = owningLead.Tasks.First(t => t.Id == request.TaskId);
            return Result.Success(ToDto(task, CrmRefType.Lead, owningLead.Id,
                owningLead.ContactInfo.Name, owningLead.AssignedTo));
        }

        var opportunities = await _opportunityRepository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);
        var owningOpportunity = opportunities.FirstOrDefault(o => o.Tasks.Any(t => t.Id == request.TaskId));

        if (owningOpportunity is null)
        {
            return Result.NotFound($"Task with ID {request.TaskId} not found");
        }

        var oppResult = owningOpportunity.CompleteTask(request.TaskId, request.CompletedBy);
        if (!oppResult.IsSuccess)
        {
            return oppResult.Map(_ => default(CrmTaskListItemDto)!);
        }

        await _opportunityRepository.UpdateAsync(owningOpportunity, ct).ConfigureAwait(false);
        await PublishAsync(owningOpportunity.GetDomainEvents(), ct).ConfigureAwait(false);
        owningOpportunity.ClearDomainEvents();

        _logger.LogInformation(
            "CRM task {TaskId} completed on opportunity {OpportunityId} for tenant {TenantId}",
            request.TaskId, owningOpportunity.Id, request.TenantId);

        var oppTask = owningOpportunity.Tasks.First(t => t.Id == request.TaskId);
        return Result.Success(ToDto(oppTask, CrmRefType.Opportunity, owningOpportunity.Id,
            owningOpportunity.Title, owningOpportunity.AssignedTo));
    }

    private async Task PublishAsync(IReadOnlyList<Domain.Common.DomainEvent> events, CancellationToken ct)
    {
        foreach (var domainEvent in events)
        {
            await _publisher.Publish(domainEvent, ct).ConfigureAwait(false);
        }
    }

    private CrmTaskListItemDto ToDto(
        Domain.Aggregates.CrmTask task,
        CrmRefType refType,
        Guid refId,
        string refTitle,
        Guid assignedTo) => new()
    {
        Id = task.Id,
        RefType = refType,
        RefId = refId,
        RefTitle = refTitle,
        Title = task.Title,
        Priority = task.Priority,
        DueDate = task.DueDate,
        IsCompleted = task.IsCompleted,
        Sla = TaskSlaPolicy.Compute(
            task.DueDate, _timeProvider.GetUtcNow(), _options.Tasks.SlaSoonDays, task.IsCompleted),
        AssignedToUserId = assignedTo
    };
}
