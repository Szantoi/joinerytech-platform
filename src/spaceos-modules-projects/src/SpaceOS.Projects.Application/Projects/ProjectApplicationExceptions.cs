namespace SpaceOS.Projects.Application.Projects;

/// <summary>
/// The caller asked for a project it cannot see — either it does not exist, or it belongs to
/// another tenant.
/// </summary>
/// <remarks>
/// <b>The two cases are deliberately not distinguished.</b> A "wrong tenant" answer that differed
/// from "no such project" would turn this into an existence oracle across tenants: anyone could
/// probe ids and learn which ones are real. The collaboration module settled the same question the
/// same way (404 for the non-participant), and the read path here cannot tell them apart anyway —
/// the query filter and RLS both return nothing.
/// </remarks>
public sealed class ProjectNotFoundException(Guid projectId)
    : Exception($"No project {projectId} is visible to the calling tenant.")
{
    /// <summary>The project that was asked for.</summary>
    public Guid ProjectId { get; } = projectId;
}

/// <summary>
/// The caller's <c>If-Match</c> precondition did not match the stored row version.
/// </summary>
/// <remarks>
/// Carries both versions so the API can answer 412 with something the client can act on
/// (PROJ-06). Separate from EF's own <c>DbUpdateConcurrencyException</c>, which reports the race
/// that happened <i>during</i> the write; this one reports a caller working from a stale read
/// before the write was even attempted.
/// </remarks>
public sealed class ProjectPreconditionFailedException(Guid projectId, int expected, int actual)
    : Exception($"Project {projectId} is at version {actual}, not the expected {expected}.")
{
    /// <summary>The project that was asked for.</summary>
    public Guid ProjectId { get; } = projectId;

    /// <summary>The version the caller believed was current.</summary>
    public int ExpectedRowVersion { get; } = expected;

    /// <summary>The version actually stored.</summary>
    public int ActualRowVersion { get; } = actual;
}
