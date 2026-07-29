using MediatR;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.Agreements;

/// <summary>
/// Every agreement command names its actor, because every transition is actor-guarded: the host
/// proposes, the guest answers.
/// </summary>
/// <remarks>
/// <b>The result is the new status, not a read model.</b> <c>AgreementReadModel</c> exists as a
/// type but nothing builds it yet, and two of its fields (the terms hash and the active work
/// package count) come from outside this aggregate. Returning a half-filled projection would be
/// worse than returning less: the caller could not tell which parts are real. The full view
/// belongs to F3, together with the projection that feeds it.
/// </remarks>
public interface IAgreementCommand : IRequest<AgreementStatus>
{
    /// <summary>The agreement to move.</summary>
    Guid AgreementId { get; }

    /// <summary>Tenant the actor belongs to; the domain checks it against host/guest.</summary>
    Guid ActorTenantId { get; }

    /// <summary>User who acted.</summary>
    Guid ActorUserId { get; }
}

/// <summary>Host puts the drafted agreement in front of the guest.</summary>
public sealed record ProposeAgreementCommand(Guid AgreementId, Guid ActorTenantId, Guid ActorUserId)
    : IAgreementCommand;

/// <summary>Guest accepts, naming the terms revision and the evidence behind it.</summary>
public sealed record AcceptAgreementCommand(
    Guid AgreementId, Guid ActorTenantId, Guid ActorUserId, Guid TermsRevisionId, string AcceptanceEvidence)
    : IAgreementCommand;

/// <summary>Guest refuses, with the reason the host will read.</summary>
public sealed record RejectAgreementCommand(
    Guid AgreementId, Guid ActorTenantId, Guid ActorUserId, string Reason)
    : IAgreementCommand;

/// <summary>Host withdraws an agreement the guest has not accepted yet.</summary>
public sealed record CancelAgreementCommand(
    Guid AgreementId, Guid ActorTenantId, Guid ActorUserId, string? Reason)
    : IAgreementCommand;

/// <summary>Host replaces the accepted terms with a newer revision.</summary>
public sealed record SupersedeAgreementCommand(
    Guid AgreementId, Guid ActorTenantId, Guid ActorUserId, Guid SupersedingTermsRevisionId)
    : IAgreementCommand;
