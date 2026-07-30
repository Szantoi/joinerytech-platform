namespace SpaceOS.Collaboration.Application.Authorization;

/// <summary>
/// The caller is not a party to the resource, or it does not exist — the two are answered
/// identically on purpose (B2B-10 F3).
/// </summary>
/// <remarks>
/// A tenant that is neither host nor guest must not be able to tell "no such agreement" apart
/// from "an agreement you have nothing to do with": the difference alone would confirm that a
/// given identifier belongs to a real collaboration between two named companies. The API maps
/// this to <c>404</c>.
/// </remarks>
public sealed class CollaborationResourceNotFoundException(string resourceKind, Guid resourceId)
    : Exception($"{resourceKind} {resourceId} was not found.")
{
    /// <summary>What was being looked for (for logs, not for the response body).</summary>
    public string ResourceKind { get; } = resourceKind;

    /// <summary>Which identifier was asked for.</summary>
    public Guid ResourceId { get; } = resourceId;
}

/// <summary>
/// The caller is a party, but has no active grant for what it tried to do — mapped to <c>403</c>.
/// </summary>
/// <remarks>
/// Separated from <see cref="CollaborationResourceNotFoundException"/> because the distinction is
/// meaningful here and safe to reveal: the guest already knows the agreement exists, it is party
/// to it. Telling it "you are not permitted" is how it learns to ask the host for a grant, rather
/// than reporting a phantom bug.
/// </remarks>
public sealed class CollaborationAccessDeniedException(
    string capability,
    CollaborationDenialReason reason)
    : Exception($"The caller is not permitted to '{capability}' ({reason}).")
{
    /// <summary>The capability that was required.</summary>
    public string Capability { get; } = capability;

    /// <summary>Why it was denied — logged, never returned to the caller verbatim.</summary>
    public CollaborationDenialReason Reason { get; } = reason;
}

/// <summary>
/// The command named an actor other than the authenticated caller (B2B-10 F3) — mapped to <c>403</c>.
/// </summary>
/// <remarks>
/// This is the body/header tenant-spoofing gate B2B-02 asked for. It is a separate type from a
/// plain denial because it is not a missing permission: it is a request that tried to act as
/// somebody else, and it belongs in the log as such.
/// </remarks>
public sealed class CollaborationActorMismatchException(Guid callerTenantId, Guid claimedTenantId)
    : Exception("The request claimed an actor tenant other than the authenticated one.")
{
    /// <summary>Tenant the token resolved to.</summary>
    public Guid CallerTenantId { get; } = callerTenantId;

    /// <summary>Tenant the payload claimed to be acting as.</summary>
    public Guid ClaimedTenantId { get; } = claimedTenantId;
}

/// <summary>No authenticated caller was available where one was required.</summary>
public sealed class CollaborationCallerUnresolvedException(string message) : Exception(message);

/// <summary>Why a permitted-looking caller was refused; for logs and tests.</summary>
public enum CollaborationDenialReason
{
    /// <summary>No grant of this capability was ever issued to the guest.</summary>
    NoGrant = 0,

    /// <summary>A grant exists but was revoked.</summary>
    GrantRevoked = 1,

    /// <summary>A grant exists but its validity has ended.</summary>
    GrantExpired = 2,

    /// <summary>The capability is not one this module knows — a typo, not a permission problem.</summary>
    UnknownCapability = 3
}
