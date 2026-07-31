namespace SpaceOS.Collaboration.Application.Adapters;

/// <summary>
/// The caller's own bearer token, for forwarding to the Kernel (B2B-10 F5 root decision:
/// the authentication path is on-behalf-of).
/// </summary>
/// <remarks>
/// <para>
/// <b>Request-scoped by decree, not by accident.</b> The root decision (2026-07-31) says this
/// path exists ONLY inside a user request: a background worker (outbox, scheduled job) has no
/// user token, therefore no Kernel call on this path — and if one is ever needed, that is a NEW
/// root decision, not a silent service-identity fallback. <see cref="RequireToken"/> throwing
/// loudly is how that decree is enforced in code rather than in a document.
/// </para>
/// <para>
/// Declared in the application layer, implemented by whoever knows what "the current request"
/// means in its process — the same division as <c>ICollaborationCallerContext</c>.
/// </para>
/// </remarks>
public interface IOnBehalfOfTokenSource
{
    /// <summary>The raw bearer token of the current request.</summary>
    /// <exception cref="OnBehalfOfTokenUnavailableException">
    /// No request or no bearer token — i.e. somebody tried this path from outside a user request.
    /// </exception>
    string RequireToken();
}

/// <summary>
/// The on-behalf-of path was entered with no user token to forward.
/// </summary>
/// <remarks>
/// Deliberately NOT mapped to a client-facing status by name: inside a real request this cannot
/// happen (the token got the caller through authentication), so surfacing it means a programming
/// error — a background path reached the Kernel adapter. That must fail loudly, not degrade.
/// </remarks>
public sealed class OnBehalfOfTokenUnavailableException()
    : Exception(
        "The Kernel on-behalf-of path needs the current request's bearer token, and there is none. " +
        "This path is request-scoped by root decision (B2B-10 F5, 2026-07-31); calling the Kernel " +
        "from background processing requires a new root decision, not a service-identity fallback.");
