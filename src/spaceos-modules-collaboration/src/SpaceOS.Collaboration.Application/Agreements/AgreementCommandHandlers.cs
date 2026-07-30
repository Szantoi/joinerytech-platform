using MediatR;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.Concurrency;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.Agreements;

/// <summary>
/// Shared handling for every agreement transition: authorize → precondition → domain action →
/// persist → new status and version.
/// </summary>
/// <remarks>
/// <para>
/// As with the work packages, the handler repeats no business rule: who may act and from which
/// state lives in <see cref="CollaborationAgreement"/>. The timestamp comes from an injected
/// clock, so the audit trail can be asserted rather than trusted.
/// </para>
/// <para>
/// <b>The guard is a constructor dependency, not a pipeline step</b> (B2B-10 F3). A MediatR
/// behaviour would have been less intrusive and is bypassed the moment anything invokes a handler
/// directly — a background job, a test, a future orchestrator. Authorization that can be stepped
/// around is worth what it costs to step around it.
/// </para>
/// <para>
/// The agreement itself is participation-gated rather than grant-gated: the guest may answer an
/// agreement it is party to without holding a grant, because the grants are issued by the very
/// agreement it would need one to accept. See <see cref="ICollaborationAccessGuard"/>.
/// </para>
/// </remarks>
public abstract class AgreementCommandHandlerBase<TCommand>(
    ICollaborationAccessGuard accessGuard,
    IAgreementRepository repository,
    TimeProvider clock) : IRequestHandler<TCommand, AgreementTransitionResult>
    where TCommand : IAgreementCommand
{
    /// <summary>Invokes the aggregate's transition; guards stay in the domain.</summary>
    protected abstract void Apply(CollaborationAgreement agreement, TCommand command, DateTimeOffset timestampUtc);

    public async Task<AgreementTransitionResult> Handle(TCommand command, CancellationToken cancellationToken)
    {
        // Loads through the guard: the caller's right to see this agreement is decided before the
        // aggregate is in hand, and the same instance is then acted on — no second query, and no
        // window where a handler holds an aggregate it was not entitled to load.
        var agreement = await accessGuard.EnsureParticipationAsync(
            command.AgreementId, command.ActorTenantId, cancellationToken);

        // AFTER the guard: a caller with no right to this agreement must not learn its version.
        CollaborationPrecondition.Verify(command.ExpectedRowVersion, agreement.RowVersion);

        Apply(agreement, command, clock.GetUtcNow());

        await repository.SaveChangesAsync(cancellationToken);

        return new AgreementTransitionResult(agreement.Status, agreement.RowVersion);
    }
}

/// <summary>propose — Draft → Proposed (host).</summary>
public sealed class ProposeAgreementHandler(ICollaborationAccessGuard accessGuard, IAgreementRepository repository, TimeProvider clock)
    : AgreementCommandHandlerBase<ProposeAgreementCommand>(accessGuard, repository, clock)
{
    protected override void Apply(CollaborationAgreement agreement, ProposeAgreementCommand command, DateTimeOffset timestampUtc)
        => agreement.Propose(command.ActorTenantId, command.ActorUserId, timestampUtc);
}

/// <summary>accept — Proposed → Accepted (guest, with terms and evidence).</summary>
public sealed class AcceptAgreementHandler(ICollaborationAccessGuard accessGuard, IAgreementRepository repository, TimeProvider clock)
    : AgreementCommandHandlerBase<AcceptAgreementCommand>(accessGuard, repository, clock)
{
    protected override void Apply(CollaborationAgreement agreement, AcceptAgreementCommand command, DateTimeOffset timestampUtc)
        => agreement.Accept(
            command.ActorTenantId, command.ActorUserId, command.TermsRevisionId,
            command.AcceptanceEvidence, timestampUtc);
}

/// <summary>reject — Proposed → Rejected (guest, with reason).</summary>
public sealed class RejectAgreementHandler(ICollaborationAccessGuard accessGuard, IAgreementRepository repository, TimeProvider clock)
    : AgreementCommandHandlerBase<RejectAgreementCommand>(accessGuard, repository, clock)
{
    protected override void Apply(CollaborationAgreement agreement, RejectAgreementCommand command, DateTimeOffset timestampUtc)
        => agreement.Reject(command.ActorTenantId, command.ActorUserId, command.Reason, timestampUtc);
}

/// <summary>cancel — Draft | Proposed → Cancelled (host).</summary>
public sealed class CancelAgreementHandler(ICollaborationAccessGuard accessGuard, IAgreementRepository repository, TimeProvider clock)
    : AgreementCommandHandlerBase<CancelAgreementCommand>(accessGuard, repository, clock)
{
    protected override void Apply(CollaborationAgreement agreement, CancelAgreementCommand command, DateTimeOffset timestampUtc)
        => agreement.Cancel(command.ActorTenantId, command.ActorUserId, command.Reason, timestampUtc);
}

/// <summary>supersede — Accepted → Superseded (host, with the replacing revision).</summary>
public sealed class SupersedeAgreementHandler(ICollaborationAccessGuard accessGuard, IAgreementRepository repository, TimeProvider clock)
    : AgreementCommandHandlerBase<SupersedeAgreementCommand>(accessGuard, repository, clock)
{
    protected override void Apply(CollaborationAgreement agreement, SupersedeAgreementCommand command, DateTimeOffset timestampUtc)
        => agreement.Supersede(
            command.ActorTenantId, command.ActorUserId, command.SupersedingTermsRevisionId, timestampUtc);
}
