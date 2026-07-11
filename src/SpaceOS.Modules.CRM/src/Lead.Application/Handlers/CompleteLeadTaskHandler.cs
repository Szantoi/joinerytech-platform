using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Domain.Aggregates;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for CompleteLeadTaskCommand.
/// Marks a task on a lead as completed.
/// </summary>
public sealed class CompleteLeadTaskHandler : IRequestHandler<CompleteLeadTaskCommand, Result<LeadResponse>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IPublisher _publisher;

    public CompleteLeadTaskHandler(ILeadRepository leadRepository, IPublisher publisher)
    {
        _leadRepository = leadRepository;
        _publisher = publisher;
    }

    public async Task<Result<LeadResponse>> Handle(CompleteLeadTaskCommand request, CancellationToken cancellationToken)
    {
        var lead = await _leadRepository.GetByIdAsync(request.TenantId, request.LeadId, cancellationToken)
            .ConfigureAwait(false);

        if (lead is null)
            return Result.NotFound($"Lead with ID {request.LeadId} not found");

        var completeResult = lead.CompleteTask(request.TaskId, request.CompletedBy);

        if (!completeResult.IsSuccess)
            return completeResult.Map(x => MapToResponse(lead));

        await _leadRepository.UpdateAsync(lead, cancellationToken).ConfigureAwait(false);

        foreach (var domainEvent in lead.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        lead.ClearDomainEvents();
        return Result.Success(MapToResponse(lead));
    }

    private static LeadResponse MapToResponse(Lead lead)
    {
        return new LeadResponse
        {
            Id = lead.Id,
            TenantId = lead.TenantId,
            Status = lead.Status.ToString(),
            ContactName = lead.ContactInfo.Name,
            Email = lead.ContactInfo.Email,
            Phone = lead.ContactInfo.Phone,
            Company = lead.ContactInfo.Company,
            Source = lead.Source.ToString(),
            AssignedToUserId = lead.AssignedTo,
            OpportunityRef = lead.OpportunityRef,
            ActivityCount = lead.Activities.Count,
            TaskCount = lead.Tasks.Count,
            OpenTaskCount = lead.Tasks.Count(t => !t.IsCompleted),
            CreatedAt = lead.CreatedAt,
            UpdatedAt = lead.UpdatedAt
        };
    }
}
