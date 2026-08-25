using System.Globalization;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>Exact server-side profile expected after cryptographic JWT validation.</summary>
public sealed record CanonicalOidcAccessTokenProfile(
    string Issuer,
    string Audience,
    string AuthorizedParty,
    string TokenType = "JWT",
    string AccessTokenPayloadType = "Bearer");

/// <summary>
/// Current online authority for one subject and tenant. Implementations must read the
/// Kernel/identity source of truth, not browser state or token claims.
/// </summary>
public sealed record OnlineIdentityAuthorityState(
    string Subject,
    Guid TenantId,
    bool TenantActive,
    bool MembershipActive,
    long MembershipVersion,
    long ProjectionVersion,
    DateTimeOffset AcceptTokensIssuedAtOrAfter,
    IReadOnlyCollection<string> Permissions,
    IReadOnlyCollection<string> EnabledModules);

/// <summary>Online lookup boundary used to invalidate otherwise well-signed stale tokens.</summary>
public interface IOnlineIdentityAuthorityStateProvider
{
    /// <summary>Returns current state, or <c>null</c> when the subject/tenant pair is unknown.</summary>
    ValueTask<OnlineIdentityAuthorityState?> GetCurrentAsync(
        string subject,
        Guid tenantId,
        CancellationToken cancellationToken);
}

/// <summary>
/// Fail-closed default used until a host registers its Kernel/identity-backed provider.
/// It deliberately recognizes no subject/tenant pair.
/// </summary>
internal sealed class DefaultDenyOnlineIdentityAuthorityStateProvider
    : IOnlineIdentityAuthorityStateProvider
{
    public ValueTask<OnlineIdentityAuthorityState?> GetCurrentAsync(
        string subject,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return ValueTask.FromResult<OnlineIdentityAuthorityState?>(null);
    }
}

/// <summary>Stable, non-secret outcome of canonical access-token validation.</summary>
public sealed record CanonicalOidcValidationResult(
    bool IsValid,
    string Code,
    Guid TenantId)
{
    /// <summary>Creates a successful outcome.</summary>
    public static CanonicalOidcValidationResult Success(Guid tenantId) => new(true, "valid", tenantId);

    /// <summary>Creates a fail-closed outcome.</summary>
    public static CanonicalOidcValidationResult Deny(string code) => new(false, code, Guid.Empty);
}

/// <summary>
/// Validates exact OIDC claims and fresh online membership/projection state after the
/// standard JWT bearer handler has verified signature, lifetime and signing key.
/// </summary>
/// <remarks>
/// This class intentionally does not fetch metadata or JWKS and must never be used instead
/// of cryptographic validation. It is the second stage called from
/// <c>JwtBearerEvents.OnTokenValidated</c>. Unknown/rotated <c>kid</c>, signature, issuer,
/// audience and lifetime remain the bearer handler's responsibility; this validator
/// reasserts the exact issuer/audience/algorithm/key-id envelope and adds <c>azp</c>,
/// native tenant projection, monotonic version and online revoke/deactivate checks.
/// </remarks>
public sealed class CanonicalOidcAccessTokenValidator
{
    private readonly OidcAuthorityClock _clock;

    /// <summary>
    /// Creates the second-stage validator with the source-owned OIDC clock.
    /// </summary>
    internal CanonicalOidcAccessTokenValidator(OidcAuthorityClock clock)
    {
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    /// <summary>Validates a cryptographically accepted bearer token against online state.</summary>
    public async ValueTask<CanonicalOidcValidationResult> ValidateAsync(
        ClaimsPrincipal principal,
        SecurityToken securityToken,
        CanonicalOidcAccessTokenProfile profile,
        IOnlineIdentityAuthorityStateProvider stateProvider,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(principal);
        ArgumentNullException.ThrowIfNull(securityToken);
        ArgumentNullException.ThrowIfNull(profile);
        ArgumentNullException.ThrowIfNull(stateProvider);

        if (string.IsNullOrWhiteSpace(profile.Issuer)
            || string.IsNullOrWhiteSpace(profile.Audience)
            || string.IsNullOrWhiteSpace(profile.AuthorizedParty)
            || string.IsNullOrWhiteSpace(profile.TokenType)
            || string.IsNullOrWhiteSpace(profile.AccessTokenPayloadType))
        {
            return CanonicalOidcValidationResult.Deny("profile_invalid");
        }

        if (!TryReadEnvelope(
                securityToken,
                out var issuer,
                out var audiences,
                out var algorithm,
                out var keyId,
                out var tokenType)
            || !string.Equals(issuer, profile.Issuer, StringComparison.Ordinal)
            || !IsBoundedUniqueAudienceSet(audiences, profile.Audience)
            || !string.Equals(algorithm, SecurityAlgorithms.RsaSha256, StringComparison.Ordinal)
            || string.IsNullOrWhiteSpace(keyId)
            || !string.Equals(tokenType, profile.TokenType, StringComparison.Ordinal)
            || !HasOneExactJoseTokenTypeHeader(securityToken, profile.TokenType)
            || !HasCanonicalNativeTenantWireClaim(securityToken, profile.AccessTokenPayloadType))
        {
            return CanonicalOidcValidationResult.Deny("token_envelope_invalid");
        }

        if (!HasExactlyOneClaim(principal, "azp", profile.AuthorizedParty)
            || !HasExactlyOneClaim(principal, "typ", profile.AccessTokenPayloadType)
            || HasLegacyRoleAuthorityClaim(principal))
        {
            return CanonicalOidcValidationResult.Deny("client_binding_invalid");
        }

        if (!TryReadSingleNonEmptyClaim(principal, "sub", out var subject)
            || !OnlineIdentityAuthoritySubject.IsCanonical(subject)
            || !TryReadPositiveIntegerClaim(principal, TenancyDefaults.MembershipVersionClaim, out var membershipVersion)
            || !TryReadPositiveIntegerClaim(principal, TenancyDefaults.ProjectionVersionClaim, out var projectionVersion)
            || !TryReadIssuedAt(principal, out var issuedAt))
        {
            return CanonicalOidcValidationResult.Deny("authority_version_invalid");
        }

        // A signed token whose iat is materially in the future could otherwise satisfy a
        // newly-raised revoke cutoff before it should exist. The bound is source-owned and
        // intentionally cannot be widened through Jwt configuration.
        if (!_clock.IsIssuedAtWithinFutureSkew(issuedAt))
            return CanonicalOidcValidationResult.Deny("token_issued_in_future");

        if (!TenantResolver.TryGetCanonicalAuthority(principal, logger: null, out var tokenAuthority))
            return CanonicalOidcValidationResult.Deny("tenant_authority_invalid");

        var current = await stateProvider.GetCurrentAsync(
            subject,
            tokenAuthority.TenantId,
            cancellationToken).ConfigureAwait(false);

        if (current is null)
            return CanonicalOidcValidationResult.Deny("subject_tenant_unknown");
        if (!string.Equals(current.Subject, subject, StringComparison.Ordinal)
            || current.TenantId != tokenAuthority.TenantId)
        {
            return CanonicalOidcValidationResult.Deny("authority_scope_mismatch");
        }
        if (!current.TenantActive)
            return CanonicalOidcValidationResult.Deny("tenant_inactive");
        if (!current.MembershipActive)
            return CanonicalOidcValidationResult.Deny("membership_inactive");
        if (current.MembershipVersion != membershipVersion)
            return CanonicalOidcValidationResult.Deny("membership_stale");
        if (current.ProjectionVersion != projectionVersion)
            return CanonicalOidcValidationResult.Deny("projection_stale");
        if (!ExactlyMatches(current.Permissions, tokenAuthority.Permissions)
            || !ExactlyMatches(current.EnabledModules, tokenAuthority.EnabledModules))
        {
            return CanonicalOidcValidationResult.Deny("projection_content_stale");
        }
        if (issuedAt < current.AcceptTokensIssuedAtOrAfter)
            return CanonicalOidcValidationResult.Deny("token_revoked");

        return CanonicalOidcValidationResult.Success(tokenAuthority.TenantId);
    }

    private static bool TryReadEnvelope(
        SecurityToken token,
        out string issuer,
        out IReadOnlyList<string> audiences,
        out string? algorithm,
        out string? keyId,
        out string? tokenType)
    {
        switch (token)
        {
            case JsonWebToken json:
                issuer = json.Issuer;
                audiences = json.Audiences.ToArray();
                algorithm = json.Alg;
                keyId = json.Kid;
                tokenType = json.Typ;
                return true;
            case JwtSecurityToken jwt:
                issuer = jwt.Issuer;
                audiences = jwt.Audiences.ToArray();
                algorithm = jwt.Header.Alg;
                keyId = jwt.Header.Kid;
                tokenType = jwt.Header.Typ;
                return true;
            default:
                issuer = string.Empty;
                audiences = [];
                algorithm = null;
                keyId = null;
                tokenType = null;
                return false;
        }
    }

    private static bool HasOneExactJoseTokenTypeHeader(SecurityToken token, string expected)
    {
        var encodedHeader = token switch
        {
            JsonWebToken json => json.EncodedHeader,
            JwtSecurityToken jwt => jwt.RawHeader,
            _ => null,
        };
        if (string.IsNullOrWhiteSpace(encodedHeader))
            return false;

        try
        {
            using var document = JsonDocument.Parse(Base64UrlEncoder.DecodeBytes(encodedHeader));
            if (document.RootElement.ValueKind != JsonValueKind.Object)
                return false;

            var properties = document.RootElement.EnumerateObject().ToArray();
            if (properties.Select(static property => property.Name)
                    .Distinct(StringComparer.Ordinal).Count() != properties.Length)
            {
                return false;
            }

            var typeProperties = properties
                .Where(static property => property.NameEquals("typ"))
                .ToArray();
            return typeProperties.Length == 1
                   && typeProperties[0].Value.ValueKind == JsonValueKind.String
                   && string.Equals(typeProperties[0].Value.GetString(), expected, StringComparison.Ordinal);
        }
        catch (JsonException)
        {
            return false;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool HasCanonicalNativeTenantWireClaim(SecurityToken token, string expectedPayloadType)
    {
        var encodedPayload = token switch
        {
            JsonWebToken json => json.EncodedPayload,
            JwtSecurityToken jwt => jwt.RawPayload,
            _ => null,
        };
        if (string.IsNullOrWhiteSpace(encodedPayload))
            return false;

        try
        {
            using var document = JsonDocument.Parse(Base64UrlEncoder.DecodeBytes(encodedPayload));
            if (document.RootElement.ValueKind != JsonValueKind.Object)
                return false;

            var properties = document.RootElement.EnumerateObject().ToArray();
            if (properties.Select(static property => property.Name)
                    .Distinct(StringComparer.Ordinal).Count() != properties.Length)
            {
                return false;
            }

            var payloadTypes = properties.Where(static property => property.NameEquals("typ")).ToArray();
            var tenantProperties = properties
                .Where(static property => property.NameEquals(TenancyDefaults.TenantListClaim))
                .ToArray();
            if (properties.Any(static property => IsLegacyRoleAuthorityClaimName(property.Name)))
                return false;

            return payloadTypes.Length == 1
                   && payloadTypes[0].Value.ValueKind == JsonValueKind.String
                   && string.Equals(payloadTypes[0].Value.GetString(), expectedPayloadType, StringComparison.Ordinal)
                   && tenantProperties.Length == 1
                   && tenantProperties[0].Value.ValueKind == JsonValueKind.Array
                   && tenantProperties[0].Value.GetArrayLength() == 1
                   && tenantProperties[0].Value[0].ValueKind == JsonValueKind.Object;
        }
        catch (JsonException)
        {
            return false;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool HasExactlyOneClaim(ClaimsPrincipal principal, string type, string expected)
    {
        var claims = principal.FindAll(type).ToArray();
        return claims.Length == 1 && string.Equals(claims[0].Value, expected, StringComparison.Ordinal);
    }

    private static bool HasLegacyRoleAuthorityClaim(ClaimsPrincipal principal)
        => principal.Claims.Any(static claim => IsLegacyRoleAuthorityClaimName(claim.Type));

    private static bool IsLegacyRoleAuthorityClaimName(string name)
        => name is "role" or "roles" or "realm_access"
           || string.Equals(name, ClaimTypes.Role, StringComparison.Ordinal);

    private static bool IsBoundedUniqueAudienceSet(IReadOnlyList<string> audiences, string expected)
        => audiences.Count is >= 1 and <= 8
           && audiences.All(static audience => !string.IsNullOrWhiteSpace(audience) && audience.Length <= 100)
           && audiences.Distinct(StringComparer.Ordinal).Count() == audiences.Count
           && audiences.Count(audience => string.Equals(audience, expected, StringComparison.Ordinal)) == 1;

    private static bool ExactlyMatches(
        IReadOnlyCollection<string> current,
        IReadOnlySet<string> signed)
        => current.Count == signed.Count
           && current.Distinct(StringComparer.Ordinal).Count() == current.Count
           && current.All(signed.Contains);

    private static bool TryReadSingleNonEmptyClaim(
        ClaimsPrincipal principal,
        string type,
        out string value)
    {
        var claims = principal.FindAll(type).ToArray();
        value = claims.Length == 1 ? claims[0].Value : string.Empty;
        return claims.Length == 1 && !string.IsNullOrWhiteSpace(value);
    }

    private static bool TryReadPositiveIntegerClaim(
        ClaimsPrincipal principal,
        string type,
        out long value)
    {
        var claims = principal.FindAll(type).ToArray();
        value = 0;
        if (claims.Length != 1 || !IsIntegerValueType(claims[0].ValueType))
            return false;

        return long.TryParse(claims[0].Value, NumberStyles.None, CultureInfo.InvariantCulture, out value)
               && value >= 1;
    }

    private static bool TryReadIssuedAt(ClaimsPrincipal principal, out DateTimeOffset value)
    {
        value = default;
        if (!TryReadPositiveIntegerClaim(principal, "iat", out var seconds))
            return false;

        try
        {
            value = DateTimeOffset.FromUnixTimeSeconds(seconds);
            return true;
        }
        catch (ArgumentOutOfRangeException)
        {
            return false;
        }
    }

    private static bool IsIntegerValueType(string valueType)
        => valueType is ClaimValueTypes.Integer
            or ClaimValueTypes.Integer32
            or ClaimValueTypes.Integer64
            or ClaimValueTypes.UInteger32
            or ClaimValueTypes.UInteger64;
}
