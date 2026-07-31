using MediatR;
using SpaceOS.Collaboration.Application.Adapters;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.Concurrency;
using SpaceOS.Collaboration.Application.Projections;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.WorkPackages;

/// <summary>
/// Shared handling for every work-package transition: load → authorize → domain action → persist
/// → read model.
/// </summary>
/// <remarks>
/// <para>
/// <b>The handler does not re-state a single business rule.</b> Who may act, from which state,
/// and what a transition demands all live in <see cref="DelegatedWorkPackage"/>; repeating them
/// here would create a second truth that drifts the first time one side is edited. The handler's
/// job is plumbing: fetch, authorize, call, save, project.
/// </para>
/// <para>
/// <b>Authorization is not one of those domain rules</b> (B2B-10 F3). Whether the guest may move
/// this package depends on a grant living on a different aggregate — the agreement — and on the
/// clock. The package cannot answer it, so the guard does, before the transition is attempted.
/// The order matters: authorizing after the aggregate has moved would leak through the exception
/// type which state the package was in.
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
    private readonly ICollaborationAccessGuard _accessGuard;
    private readonly IWorkPackageRepository _repository;
    private readonly CollaborationProjectionService _projections;
    private readonly TimeProvider _clock;

    protected WorkPackageCommandHandlerBase(
        ICollaborationAccessGuard accessGuard,
        IWorkPackageRepository repository,
        CollaborationProjectionService projections,
        TimeProvider clock)
    {
        _accessGuard = accessGuard;
        _repository = repository;
        _projections = projections;
        _clock = clock;
    }

    /// <summary>Invokes the aggregate's transition; guards stay in the domain.</summary>
    protected abstract void Apply(DelegatedWorkPackage workPackage, TCommand command, DateTimeOffset timestampUtc);

    public async Task<WorkPackageReadModel> Handle(TCommand command, CancellationToken cancellationToken)
    {
        var workPackage = await _repository.GetByIdAsync(command.WorkPackageId, cancellationToken)
            ?? throw new CollaborationResourceNotFoundException(
                nameof(DelegatedWorkPackage), command.WorkPackageId);

        // Moving delegated work is what a grant is FOR: the agreement carries the package, and an
        // expired or revoked grant has to stop the guest here even though the row is still
        // visible to it (row-level security filters participation, not permission — F2 root
        // decision).
        await _accessGuard.EnsureCapabilityAsync(
            workPackage.AgreementId,
            command.ActorTenantId,
            CollaborationCapability.WorkPackageExecute,
            cancellationToken);

        // AFTER the guard: a caller with no right to this package must not learn its version.
        CollaborationPrecondition.Verify(command.ExpectedRowVersion, workPackage.RowVersion);

        Apply(workPackage, command, _clock.GetUtcNow());

        await _repository.SaveChangesAsync(cancellationToken);

        // Projected FOR THE ACTOR: the read model's allowed-actions list depends on which side
        // is asking, and answering with the other party's options would invite a call that the
        // domain then refuses.
        return _projections.ProjectWorkPackage(workPackage, command.ActorTenantId)!;
    }
}

/// <summary>
/// create — the birth of a delegated work package (B2B-10 F5/1). Not a transition, so it does not
/// extend <see cref="WorkPackageCommandHandlerBase{TCommand}"/>: there is nothing to load and no
/// version to verify.
/// </summary>
/// <remarks>
/// <para>
/// <b>The guard still comes first</b> (the F3X order, applied to a create): a tenant outside the
/// agreement gets the same 404 as for an agreement that does not exist, before any of its input is
/// interpreted. The check is the work-package capability, not bare participation — what the
/// agreement CARRIES is grant-gated (Gábor's decision, 2026-07-30), and the create is the first
/// thing that carries anything. For the host this collapses into participation (it issues the
/// grants, so the guard never asks it for one), but the gate is what makes the refusal shape
/// uniform with every other work-package write: a guest without the grant gets the same silent
/// 403 here as on a transition, instead of a chattier domain answer.
/// </para>
/// <para>
/// The sibling-project lookup happens here because the invariant needs a fact only the store has;
/// the rule itself stays in the domain (<see cref="CollaborationAgreement.DelegateWork"/>).
/// </para>
/// <para>
/// <b>This is the adapter's real production call site</b> (B2B-10 F5/2 — the create path, said
/// out loud as the issuance asked): the anchor's epic is resolved against the Kernel BEFORE the
/// package is born, so a dead reference cannot enter the store, and the F5/3 negative control
/// has a concrete point to measure. Read-model enrichment was the alternative and lost: it would
/// have made every READ depend on Kernel availability, where this gates only the write that
/// claims the anchor. Known limit: the Kernel's flow-epic answer carries no project id, so only
/// the EPIC's existence is verified — the ProjectId remains caller-asserted (F4/F5-3 material).
/// </para>
/// </remarks>
public sealed class CreateWorkPackageHandler(
    ICollaborationAccessGuard accessGuard,
    IWorkPackageRepository repository,
    IProjectAdapter projects,
    CollaborationProjectionService projections,
    TimeProvider clock) : IRequestHandler<CreateWorkPackageCommand, WorkPackageReadModel>
{
    public async Task<WorkPackageReadModel> Handle(CreateWorkPackageCommand command, CancellationToken cancellationToken)
    {
        var agreement = await accessGuard.EnsureCapabilityAsync(
            command.AgreementId,
            command.ActorTenantId,
            CollaborationCapability.WorkPackageExecute,
            cancellationToken);

        var workScope = CollaborationWorkScope.Create(command.ProjectId, command.EpicId, command.TaskId);

        // AFTER the guard (authorization first, F3X order), BEFORE the domain: an anchor the
        // Kernel does not know for this caller must stop the birth, fail-closed. Only existence
        // is consumed — the reference's title is read-model material for a later slice.
        _ = await projects.ResolveFlowEpicAsync(workScope.EpicId, cancellationToken)
            ?? throw new CollaborationAnchorUnresolvedException(workScope.EpicId);

        var existingProjectId = await repository.GetDelegatedProjectIdAsync(
            command.AgreementId, cancellationToken);

        var workPackage = agreement.DelegateWork(
            command.ActorTenantId,
            command.ActorUserId,
            command.Title,
            command.ScopeDescription,
            command.DueAtUtc,
            workScope,
            existingProjectId,
            clock.GetUtcNow());

        await repository.AddAsync(workPackage, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);

        return projections.ProjectWorkPackage(workPackage, command.ActorTenantId)!;
    }
}

/// <summary>offer — Draft → Offered (host).</summary>
public sealed class OfferWorkPackageHandler(
    ICollaborationAccessGuard accessGuard, IWorkPackageRepository repository,
    CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<OfferWorkPackageCommand>(accessGuard, repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, OfferWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Offer(command.ActorTenantId, command.ActorUserId, timestampUtc);
}

/// <summary>accept — Offered → Accepted (guest).</summary>
public sealed class AcceptWorkPackageHandler(
    ICollaborationAccessGuard accessGuard, IWorkPackageRepository repository,
    CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<AcceptWorkPackageCommand>(accessGuard, repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, AcceptWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Accept(command.ActorTenantId, command.ActorUserId, timestampUtc);
}

/// <summary>reject — Offered → Rejected (guest, with reason).</summary>
public sealed class RejectWorkPackageHandler(
    ICollaborationAccessGuard accessGuard, IWorkPackageRepository repository,
    CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<RejectWorkPackageCommand>(accessGuard, repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, RejectWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Reject(command.ActorTenantId, command.ActorUserId, command.Reason, timestampUtc);
}

/// <summary>start — Accepted → InProgress (guest).</summary>
public sealed class StartWorkPackageProgressHandler(
    ICollaborationAccessGuard accessGuard, IWorkPackageRepository repository,
    CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<StartWorkPackageProgressCommand>(accessGuard, repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, StartWorkPackageProgressCommand command, DateTimeOffset timestampUtc)
        => workPackage.StartProgress(command.ActorTenantId, command.ActorUserId, timestampUtc);
}

/// <summary>submit — InProgress → Submitted (guest, with deliverable).</summary>
public sealed class SubmitWorkPackageHandler(
    ICollaborationAccessGuard accessGuard, IWorkPackageRepository repository,
    CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<SubmitWorkPackageCommand>(accessGuard, repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, SubmitWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Submit(command.ActorTenantId, command.ActorUserId, command.DeliverableRef, timestampUtc);
}

/// <summary>request-changes — Submitted → ChangesRequested (host, with reason).</summary>
public sealed class RequestWorkPackageChangesHandler(
    ICollaborationAccessGuard accessGuard, IWorkPackageRepository repository,
    CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<RequestWorkPackageChangesCommand>(accessGuard, repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, RequestWorkPackageChangesCommand command, DateTimeOffset timestampUtc)
        => workPackage.RequestChanges(command.ActorTenantId, command.ActorUserId, command.Reason, timestampUtc);
}

/// <summary>complete — Submitted → Completed (host, with proof).</summary>
public sealed class CompleteWorkPackageHandler(
    ICollaborationAccessGuard accessGuard, IWorkPackageRepository repository,
    CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<CompleteWorkPackageCommand>(accessGuard, repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, CompleteWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Complete(command.ActorTenantId, command.ActorUserId, command.CompletionProofRef, timestampUtc);
}

/// <summary>cancel — any non-completed state → Cancelled (either party, with reason).</summary>
public sealed class CancelWorkPackageHandler(
    ICollaborationAccessGuard accessGuard, IWorkPackageRepository repository,
    CollaborationProjectionService projections, TimeProvider clock)
    : WorkPackageCommandHandlerBase<CancelWorkPackageCommand>(accessGuard, repository, projections, clock)
{
    protected override void Apply(DelegatedWorkPackage workPackage, CancelWorkPackageCommand command, DateTimeOffset timestampUtc)
        => workPackage.Cancel(command.ActorTenantId, command.ActorUserId, command.Reason, timestampUtc);
}
