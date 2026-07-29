using MediatR;
using SpaceOS.Collaboration.Application.Projections;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.WorkPackages;

/// <summary>
/// Shared handling for every work-package transition: load → domain action → persist → read model.
/// </summary>
/// <remarks>
/// <para>
/// <b>The handler does not re-state a single business rule.</b> Who may act, from which state,
/// and what a transition demands all live in <see cref="DelegatedWorkPackage"/>; repeating them
/// here would create a second truth that drifts the first time one side is edited. The handler's
/// job is plumbing: fetch, call, save, project.
/// </para>
/// <para>
/// The timestamp comes from an injected <see cref="TimeProvider"/> rather than
/// <c>DateTimeOffset.UtcNow</c>, so an audit trail can be tested for what it records instead of
/// being taken on faith.
/// </para>
/// </remarks>
public abstract class WorkPackageCommandHandlerBase<TCommand> : IRequestHandler<TCommand, WorkPackageReadModel>
    where TCommand : IWorkPackageCommand
{
    private readonly IWorkPackageRepository _repository;
    private readonly CollaborationProjectionService _projections;
    private readonly TimeProvider _clock;

    protected WorkPackageCommandHandlerBase(
        IWorkPackageRepository repository,
        CollaborationProjectionService projections,
        TimeProvider clock)
    {
        _repository = repository;
        _projections = projections;
        _clock = clock;
    }

    /// <summary>Invokes the aggregate's transition; guards stay in the domain.</summary>
    protected abstract void Apply(DelegatedWorkPackage workPackage, TCommand command, DateTimeOffset timestampUtc);

    public async Task<WorkPackageReadModel> Handle(TCommand command, CancellationToken cancellationToken)
    {
        var workPackage = await _repository.GetByIdAsync(command.WorkPackageId, cancellationToken)
            ?? throw new KeyNotFoundException($"Work package {command.WorkPackageId} was not found.");

        Apply(workPackage, command, _clock.GetUtcNow());

        await _repository.SaveChangesAsync(cancellationToken);

        // Projected FOR THE ACTOR: the read model's allowed-actions list depends on which side
        // is asking, and answering with the other party's options would invite a call that the
        // domain then refuses.
        return _projections.ProjectWorkPackage(workPackage, command.ActorTenantId)!;
    }
}

/// <summary>offer — Draft → Offered (host).</summary>
public sealed class OfferWorkPackageHandler(
    IWorkPackageRepository repository, CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<OfferWorkPackageCommand>(repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, OfferWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Offer(command.ActorTenantId, command.ActorUserId, timestampUtc);
}

/// <summary>accept — Offered → Accepted (guest).</summary>
public sealed class AcceptWorkPackageHandler(
    IWorkPackageRepository repository, CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<AcceptWorkPackageCommand>(repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, AcceptWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Accept(command.ActorTenantId, command.ActorUserId, timestampUtc);
}

/// <summary>reject — Offered → Rejected (guest, with reason).</summary>
public sealed class RejectWorkPackageHandler(
    IWorkPackageRepository repository, CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<RejectWorkPackageCommand>(repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, RejectWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Reject(command.ActorTenantId, command.ActorUserId, command.Reason, timestampUtc);
}

/// <summary>start — Accepted → InProgress (guest).</summary>
public sealed class StartWorkPackageProgressHandler(
    IWorkPackageRepository repository, CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<StartWorkPackageProgressCommand>(repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, StartWorkPackageProgressCommand command, DateTimeOffset timestampUtc)
        => workPackage.StartProgress(command.ActorTenantId, command.ActorUserId, timestampUtc);
}

/// <summary>submit — InProgress → Submitted (guest, with deliverable).</summary>
public sealed class SubmitWorkPackageHandler(
    IWorkPackageRepository repository, CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<SubmitWorkPackageCommand>(repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, SubmitWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Submit(command.ActorTenantId, command.ActorUserId, command.DeliverableRef, timestampUtc);
}

/// <summary>request-changes — Submitted → ChangesRequested (host, with reason).</summary>
public sealed class RequestWorkPackageChangesHandler(
    IWorkPackageRepository repository, CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<RequestWorkPackageChangesCommand>(repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, RequestWorkPackageChangesCommand command, DateTimeOffset timestampUtc)
        => workPackage.RequestChanges(command.ActorTenantId, command.ActorUserId, command.Reason, timestampUtc);
}

/// <summary>complete — Submitted → Completed (host, with proof).</summary>
public sealed class CompleteWorkPackageHandler(
    IWorkPackageRepository repository, CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<CompleteWorkPackageCommand>(repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, CompleteWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Complete(command.ActorTenantId, command.ActorUserId, command.CompletionProofRef, timestampUtc);
}

/// <summary>cancel — any non-completed state → Cancelled (either party, with reason).</summary>
public sealed class CancelWorkPackageHandler(
    IWorkPackageRepository repository, CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<CancelWorkPackageCommand>(repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, CancelWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Cancel(command.ActorTenantId, command.ActorUserId, command.Reason, timestampUtc);
}
