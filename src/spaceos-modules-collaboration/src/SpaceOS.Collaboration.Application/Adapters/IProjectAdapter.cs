namespace SpaceOS.Collaboration.Application.Adapters;

/// <summary>
/// What the Kernel answers about a flow-epic: the anchor exists, and what people call it.
/// </summary>
/// <remarks>
/// <b>No <c>ProjectOwnerTenantId</c> — deleted by root decision (B2B-10 F5, 2026-07-31).</b>
/// The wire cannot fill it (the Kernel's <c>FlowEpicDto</c> carries no tenant), and it is not
/// needed: on the on-behalf-of path the Kernel scopes every read by the caller's own token, so
/// the tenant proof IS the Kernel's 404. A field the adapter would have to invent is a field
/// somebody would eventually trust.
/// </remarks>
public record ProjectReference(Guid FlowEpicId, string Title);

/// <summary>
/// Resolves a work-scope anchor against the host's project system (B2B-10 F5).
/// </summary>
/// <remarks>
/// <para>
/// <c>null</c> means "no such flow-epic <i>for this caller</i>" — absent and not-yours are one
/// answer, exactly as our own guard answers, because the Kernel makes the same choice: its row
/// filter runs on the token's tenant, so a foreign epic and a nonexistent one are
/// indistinguishable on purpose.
/// </para>
/// <para>
/// There is deliberately no <c>requestingTenantId</c> parameter. The pre-F5 shape took one and
/// compared it against the stored owner field — the adapter's single, self-invented security
/// property. On the on-behalf-of path the caller's identity travels IN THE TOKEN, and the party
/// that enforces it is the Kernel; a parameter here would be a second claim of the same fact
/// that nothing checks.
/// </para>
/// <para>
/// Failures other than "not found" are thrown, never folded into <c>null</c>: an unreachable
/// Kernel must read as "cannot answer now" (<see cref="ProjectResolutionUnavailableException"/>),
/// and a Kernel that refuses our token as a named configuration fault
/// (<see cref="ProjectResolutionRejectedException"/>). Folding either into "no such epic" would
/// make an outage look like bad user input.
/// </para>
/// </remarks>
public interface IProjectAdapter
{
    /// <summary>The epic's reference, or <c>null</c> when the Kernel does not know it for this caller.</summary>
    Task<ProjectReference?> ResolveFlowEpicAsync(Guid flowEpicId, CancellationToken cancellationToken = default);
}

/// <summary>
/// The work scope named a flow-epic the Kernel does not know for this caller — mapped to <c>422</c>.
/// </summary>
/// <remarks>
/// Telling the (authorized, host-side) caller that its anchor does not resolve is safe and
/// actionable: it is their own project system, and the fix is on their side of the wire.
/// </remarks>
public sealed class CollaborationAnchorUnresolvedException(Guid flowEpicId)
    : Exception($"The work scope names flow-epic {flowEpicId}, which the Kernel does not know for this caller.")
{
    public Guid FlowEpicId { get; } = flowEpicId;
}

/// <summary>
/// The Kernel could not answer (timeout, connection failure, 5xx) — mapped to <c>503</c>.
/// </summary>
/// <remarks>
/// Fail-closed by design: a package whose anchor could not be checked is not created. The name
/// says "try again later", which is the truth — unlike a 422, which would send the caller
/// hunting for a typo in a perfectly good epic id.
/// </remarks>
public sealed class ProjectResolutionUnavailableException(string reason, Exception? inner = null)
    : Exception($"The Kernel could not answer the anchor resolution: {reason}", inner);

/// <summary>
/// The Kernel refused our forwarded credentials (401/403) — mapped to <c>502</c>.
/// </summary>
/// <remarks>
/// Named separately from "unavailable" because the operator's next step differs: nothing is
/// down, the trust between the two services is misconfigured (audience, realm, clock), and no
/// amount of retrying will fix it.
/// </remarks>
public sealed class ProjectResolutionRejectedException(int statusCode)
    : Exception($"The Kernel refused the forwarded credentials with HTTP {statusCode}; the service trust configuration needs attention.")
{
    public int StatusCode { get; } = statusCode;
}
