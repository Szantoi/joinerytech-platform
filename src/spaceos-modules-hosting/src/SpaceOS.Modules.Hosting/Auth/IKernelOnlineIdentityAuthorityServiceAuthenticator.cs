namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// Applies a dedicated module-host service identity to an outbound Kernel authority request.
/// </summary>
/// <remarks>
/// The implementation is supplied by the composing host because credential custody belongs to
/// the deployment environment. Implementations must resolve <c>serviceAuthReference</c>
/// from an approved secret/certificate store. They must never forward the end user's bearer token,
/// and must never place the reference itself on the wire. The provider attests the complete request
/// after this call: only <c>Authorization</c> and optional <c>DPoP</c> proof headers may be added.
/// Method, URI, body, content headers and every other request header are immutable across the call.
/// </remarks>
public interface IKernelOnlineIdentityAuthorityServiceAuthenticator
{
    /// <summary>Applies a dedicated service proof without changing any pre-existing request field.</summary>
    ValueTask AuthenticateAsync(
        HttpRequestMessage request,
        string serviceAuthReference,
        CancellationToken cancellationToken);
}
