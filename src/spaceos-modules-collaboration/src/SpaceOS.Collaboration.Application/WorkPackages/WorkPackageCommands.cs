using MediatR;
using SpaceOS.Collaboration.Application.Concurrency;
using SpaceOS.Collaboration.Application.Projections;

namespace SpaceOS.Collaboration.Application.WorkPackages;

/// <summary>
/// Every command carries WHO is acting, because every work-package transition is
/// actor-guarded in the domain.
/// </summary>
/// <remarks>
/// The actor is a command field rather than ambient state on purpose: a transition recorded
/// without knowing who made it is worthless in a two-tenant audit trail, and an implicit
/// "current user" is the thing that goes missing in a background job.
/// </remarks>
public interface IWorkPackageCommand : IRequest<WorkPackageReadModel>, IConditionalCommand
{
    /// <summary>The work package to move.</summary>
    Guid WorkPackageId { get; }

    /// <summary>Tenant the actor belongs to; the domain checks it against host/guest.</summary>
    Guid ActorTenantId { get; }

    /// <summary>User who acted.</summary>
    Guid ActorUserId { get; }
}

/// <summary>
/// Host creates a new delegated work package under an agreement (B2B-10 F5/1).
/// </summary>
/// <remarks>
/// <para>
/// Deliberately NOT an <see cref="IWorkPackageCommand"/>: there is no package to identify yet and
/// no version to expect, so neither <c>WorkPackageId</c> nor <c>ExpectedRowVersion</c> would mean
/// anything. Retry-safety for a create comes from the <c>Idempotency-Key</c> the endpoint demands,
/// not from a precondition.
/// </para>
/// <para>
/// The scope fields are flat GUIDs rather than a <c>CollaborationWorkScope</c>, so that the value
/// object is constructed exactly once, in the handler, where its factory can refuse a malformed
/// anchor — a command carrying a pre-built scope would mean two places can build one.
/// </para>
/// </remarks>
public sealed record CreateWorkPackageCommand(
    Guid AgreementId,
    Guid ActorTenantId,
    Guid ActorUserId,
    string Title,
    string ScopeDescription,
    DateTimeOffset DueAtUtc,
    Guid ProjectId,
    Guid EpicId,
    Guid? TaskId = null)
    : IRequest<WorkPackageReadModel>;

/// <summary>Host offers the package to the guest.</summary>
public sealed record OfferWorkPackageCommand(
    Guid WorkPackageId, Guid ActorTenantId, Guid ActorUserId, int? ExpectedRowVersion = null)
    : IWorkPackageCommand;

/// <summary>Guest accepts the offer.</summary>
public sealed record AcceptWorkPackageCommand(
    Guid WorkPackageId, Guid ActorTenantId, Guid ActorUserId, int? ExpectedRowVersion = null)
    : IWorkPackageCommand;

/// <summary>Guest refuses the offer, with a reason the host can act on.</summary>
public sealed record RejectWorkPackageCommand(
    Guid WorkPackageId, Guid ActorTenantId, Guid ActorUserId, string Reason,
    int? ExpectedRowVersion = null)
    : IWorkPackageCommand;

/// <summary>Guest starts working.</summary>
public sealed record StartWorkPackageProgressCommand(
    Guid WorkPackageId, Guid ActorTenantId, Guid ActorUserId, int? ExpectedRowVersion = null)
    : IWorkPackageCommand;

/// <summary>Guest submits the deliverable.</summary>
public sealed record SubmitWorkPackageCommand(
    Guid WorkPackageId, Guid ActorTenantId, Guid ActorUserId, string DeliverableRef,
    int? ExpectedRowVersion = null)
    : IWorkPackageCommand;

/// <summary>Host sends it back for changes, with a reason.</summary>
public sealed record RequestWorkPackageChangesCommand(
    Guid WorkPackageId, Guid ActorTenantId, Guid ActorUserId, string Reason,
    int? ExpectedRowVersion = null)
    : IWorkPackageCommand;

/// <summary>Host accepts the delivery as complete.</summary>
public sealed record CompleteWorkPackageCommand(
    Guid WorkPackageId, Guid ActorTenantId, Guid ActorUserId, string CompletionProofRef,
    int? ExpectedRowVersion = null)
    : IWorkPackageCommand;

/// <summary>
/// Either party withdraws the package, with a mandatory reason.
/// </summary>
/// <remarks>
/// Both sides may cancel (the domain checks only that the actor is a party), and the reason is
/// required there too — a withdrawal the other tenant cannot explain to their own people is how
/// a collaboration ends badly.
/// </remarks>
public sealed record CancelWorkPackageCommand(
    Guid WorkPackageId, Guid ActorTenantId, Guid ActorUserId, string Reason,
    int? ExpectedRowVersion = null)
    : IWorkPackageCommand;
