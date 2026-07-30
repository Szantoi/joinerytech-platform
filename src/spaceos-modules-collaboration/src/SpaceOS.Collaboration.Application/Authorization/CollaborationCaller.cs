namespace SpaceOS.Collaboration.Application.Authorization;

/// <summary>
/// Who is making the request, as resolved from the authenticated identity (B2B-10 F3).
/// </summary>
/// <remarks>
/// <para>
/// This type exists so that "the acting tenant" has a source that a request body cannot reach.
/// The F1 commands carry <c>ActorTenantId</c> as a field on purpose (a transition recorded without
/// its actor is worthless in a two-tenant audit trail), but a field the client fills in is a
/// claim, not a fact — and B2B-02 named body/header tenant-spoofing as an open gap. The guard
/// reconciles the two: the command still says who acted, and the caller context decides whether
/// it was allowed to say that.
/// </para>
/// </remarks>
/// <param name="TenantId">Tenant resolved from the token, never from the payload.</param>
/// <param name="UserId">The acting user inside that tenant.</param>
public sealed record CollaborationCaller(Guid TenantId, Guid UserId)
{
    /// <summary>Builds a caller, refusing an incomplete identity.</summary>
    /// <exception cref="ArgumentException">Either identifier is empty.</exception>
    public static CollaborationCaller Create(Guid tenantId, Guid userId)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("Caller tenant cannot be empty.", nameof(tenantId));

        if (userId == Guid.Empty)
            throw new ArgumentException("Caller user cannot be empty.", nameof(userId));

        return new CollaborationCaller(tenantId, userId);
    }
}
