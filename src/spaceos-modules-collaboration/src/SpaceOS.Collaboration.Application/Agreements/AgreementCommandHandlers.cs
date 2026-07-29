using MediatR;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.Agreements;

/// <summary>
/// Shared handling for every agreement transition: load → domain action → persist → new status.
/// </summary>
/// <remarks>
/// As with the work packages, the handler repeats no business rule: who may act and from which
/// state lives in <see cref="CollaborationAgreement"/>. The timestamp comes from an injected
/// clock, so the audit trail can be asserted rather than trusted.
/// </remarks>
public abstract class AgreementCommandHandlerBase<TCommand>(
    IAgreementRepository repository,
    TimeProvider clock) : IRequestHandler<TCommand, AgreementStatus>
    where TCommand : IAgreementCommand
{
    /// <summary>Invokes the aggregate's transition; guards stay in the domain.</summary>
    protected abstract void Apply(CollaborationAgreement agreement, TCommand command, DateTimeOffset timestampUtc);

    public async Task<AgreementStatus> Handle(TCommand command, CancellationToken cancellationToken)
    {
        var agreement = await repository.GetByIdAsync(command.AgreementId, cancellationToken)
            ?? throw new KeyNotFoundException($"Agreement {command.AgreementId} was not found.");

        Apply(agreement, command, clock.GetUtcNow());

        await repository.SaveChangesAsync(cancellationToken);

        return agreement.Status;
    }
}

/// <summary>propose — Draft → Proposed (host).</summary>
public sealed class ProposeAgreementHandler(IAgreementRepository repository, TimeProvider clock)
    : AgreementCommandHandlerBase<ProposeAgreementCommand>(repository, clock)
{
    protected override void Apply(CollaborationAgreement agreement, ProposeAgreementCommand command, DateTimeOffset timestampUtc)
        => agreement.Propose(command.ActorTenantId, command.ActorUserId, timestampUtc);
}

/// <summary>accept — Proposed → Accepted (guest, with terms and evidence).</summary>
public sealed class AcceptAgreementHandler(IAgreementRepository repository, TimeProvider clock)
    : AgreementCommandHandlerBase<AcceptAgreementCommand>(repository, clock)
{
    protected override void Apply(CollaborationAgreement agreement, AcceptAgreementCommand command, DateTimeOffset timestampUtc)
        => agreement.Accept(
            command.ActorTenantId, command.ActorUserId, command.TermsRevisionId,
            command.AcceptanceEvidence, timestampUtc);
}

/// <summary>reject — Proposed → Rejected (guest, with reason).</summary>
public sealed class RejectAgreementHandler(IAgreementRepository repository, TimeProvider clock)
    : AgreementCommandHandlerBase<RejectAgreementCommand>(repository, clock)
{
    protected override void Apply(CollaborationAgreement agreement, RejectAgreementCommand command, DateTimeOffset timestampUtc)
        => agreement.Reject(command.ActorTenantId, command.ActorUserId, command.Reason, timestampUtc);
}

/// <summary>cancel — Draft | Proposed → Cancelled (host).</summary>
public sealed class CancelAgreementHandler(IAgreementRepository repository, TimeProvider clock)
    : AgreementCommandHandlerBase<CancelAgreementCommand>(repository, clock)
{
    protected override void Apply(CollaborationAgreement agreement, CancelAgreementCommand command, DateTimeOffset timestampUtc)
        => agreement.Cancel(command.ActorTenantId, command.ActorUserId, command.Reason, timestampUtc);
}

/// <summary>supersede — Accepted → Superseded (host, with the replacing revision).</summary>
public sealed class SupersedeAgreementHandler(IAgreementRepository repository, TimeProvider clock)
    : AgreementCommandHandlerBase<SupersedeAgreementCommand>(repository, clock)
{
    protected override void Apply(CollaborationAgreement agreement, SupersedeAgreementCommand command, DateTimeOffset timestampUtc)
        => agreement.Supersede(
            command.ActorTenantId, command.ActorUserId, command.SupersedingTermsRevisionId, timestampUtc);
}
