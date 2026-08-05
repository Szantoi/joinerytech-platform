namespace SpaceOS.Projects.Api.Kernel;

/// <summary>
/// Answers "does this Kernel flow-epic exist for the calling user" (PROJ-06).
/// </summary>
/// <remarks>
/// <para>
/// <b>Why this port lives in the API project and not in Application.</b> The application layer's
/// <c>AssignEpicCommand</c> documents the split: the existence answer lives in the Kernel, and
/// reaching it needs the caller's own bearer token — which only a request scope has. A port in
/// the application layer would suggest the check can happen anywhere; it cannot, and the
/// endpoint is the one place that both has the token and has not yet mutated anything.
/// </para>
/// <para>
/// The resolution runs BEFORE the command is sent, so a project is never mutated on the strength
/// of a check that has not happened (the F5/2 ordering).
/// </para>
/// </remarks>
public interface IFlowEpicResolver
{
    /// <summary>
    /// Resolves the epic on behalf of the caller, or returns <c>false</c> when the Kernel does
    /// not know it <i>for this caller</i> (absent and not-yours answer identically, by the
    /// Kernel's own row filter).
    /// </summary>
    /// <exception cref="EpicResolutionRejectedException">The Kernel refused this service's forwarded credentials (trust misconfigured).</exception>
    /// <exception cref="EpicResolutionUnavailableException">The Kernel could not answer now (timeout, connection failure, 5xx, malformed body).</exception>
    Task<bool> FlowEpicExistsAsync(Guid flowEpicId, CancellationToken cancellationToken = default);
}

/// <summary>
/// The assignment named an epic the Kernel does not know for this caller — mapped to <c>422</c>.
/// </summary>
/// <remarks>The message is safe: the epic id is the caller's own input.</remarks>
public sealed class FlowEpicUnresolvedException(Guid flowEpicId)
    : Exception($"Flow-epic {flowEpicId} does not resolve for this caller; it cannot be assigned.")
{
    /// <summary>The epic the caller named.</summary>
    public Guid FlowEpicId { get; } = flowEpicId;
}

/// <summary>The Kernel refused the forwarded token — mapped to <c>502</c>, because a retry will not help.</summary>
public sealed class EpicResolutionRejectedException(int statusCode)
    : Exception($"The Kernel refused the forwarded credentials with HTTP {statusCode}.")
{
    /// <summary>The status the Kernel answered.</summary>
    public int StatusCode { get; } = statusCode;
}

/// <summary>The Kernel could not answer now — mapped to <c>503</c>, an honest "try again later".</summary>
public sealed class EpicResolutionUnavailableException : Exception
{
    public EpicResolutionUnavailableException(string reason)
        : base($"The Kernel could not verify the flow-epic: {reason}.") { }

    public EpicResolutionUnavailableException(string reason, Exception innerException)
        : base($"The Kernel could not verify the flow-epic: {reason}.", innerException) { }
}
