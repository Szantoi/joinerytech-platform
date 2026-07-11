using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Domain.Aggregates;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for DeleteLeadCommand.
/// Soft-deletes a lead (marks as deleted, does not remove from database).
/// </summary>
public sealed class DeleteLeadHandler : IRequestHandler<DeleteLeadCommand, Result>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IPublisher _publisher;

    public DeleteLeadHandler(ILeadRepository leadRepository, IPublisher publisher)
    {
        _leadRepository = leadRepository;
        _publisher = publisher;
    }

    public async Task<Result> Handle(DeleteLeadCommand request, CancellationToken cancellationToken)
    {
        var lead = await _leadRepository.GetByIdAsync(request.TenantId, request.LeadId, cancellationToken)
            .ConfigureAwait(false);

        if (lead is null)
            return Result.NotFound($"Lead with ID {request.LeadId} not found");

        var deleteResult = lead.Delete(request.DeletedBy);

        if (!deleteResult.IsSuccess)
            return deleteResult;

        await _leadRepository.DeleteAsync(request.TenantId, request.LeadId, cancellationToken)
            .ConfigureAwait(false);

        foreach (var domainEvent in lead.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        lead.ClearDomainEvents();
        return Result.Success();
    }
}
