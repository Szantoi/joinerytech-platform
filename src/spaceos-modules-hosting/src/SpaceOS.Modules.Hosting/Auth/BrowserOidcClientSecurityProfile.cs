namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>Read-back shape used to prove the public browser-client flow offline.</summary>
public sealed record BrowserOidcClientSecurityProfile(
    bool PublicClient,
    bool StandardFlowEnabled,
    bool ImplicitFlowEnabled,
    bool DirectAccessGrantsEnabled,
    bool ServiceAccountsEnabled,
    string ProofKeyCodeChallengeMethod)
{
    /// <summary>
    /// Returns true only for Authorization Code with PKCE S256 and no browser-inappropriate
    /// fallback grant. This is a configuration/read-back contract, not a live login proof.
    /// </summary>
    public bool IsAuthorizationCodeWithPkceS256()
        => PublicClient
           && StandardFlowEnabled
           && !ImplicitFlowEnabled
           && !DirectAccessGrantsEnabled
           && !ServiceAccountsEnabled
           && string.Equals(ProofKeyCodeChallengeMethod, "S256", StringComparison.Ordinal);
}
