using System.Security.Claims;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace SpaceOS.Modules.Hosting.Tenancy;

/// <summary>Outcome classification of a tenant resolution attempt.</summary>
public enum TenantResolutionStatus
{
    /// <summary>A tenant was resolved from the token (and the optional header was valid).</summary>
    Resolved,

    /// <summary>The token carries no tenant identity at all (no tid / spaceos_tenants / tenant_id claim).</summary>
    NoTenantClaim,

    /// <summary>
    /// A tenant selection header was sent but its value is not among the tenants present in
    /// the caller's token — a forgery attempt or a stale client. Must map to HTTP 403.
    /// </summary>
    HeaderNotInTokenTenants,
}

/// <summary>Result of <see cref="TenantResolver.Resolve"/>.</summary>
/// <param name="Status">Outcome classification.</param>
/// <param name="TenantId">The resolved tenant when <paramref name="Status"/> is <see cref="TenantResolutionStatus.Resolved"/>; otherwise <see cref="Guid.Empty"/>.</param>
/// <param name="RejectedHeaderValue">The offending header value when the header was rejected; otherwise <c>null</c>.</param>
public sealed record TenantResolutionResult(
    TenantResolutionStatus Status,
    Guid TenantId,
    string? RejectedHeaderValue);

/// <summary>
/// Pure tenant-resolution logic shared by all module hosts (ADR-061, decision T1):
/// the tenant identity comes from the JWT; a tenant selection header is only accepted
/// when it matches a tenant present in the token.
/// </summary>
/// <remarks>
/// Claim priority mirrors the kernel's <c>TenantSessionInterceptor</c>:
/// <c>tid</c> → <c>spaceos_tenants</c> (JSON array, with the Keycloak Script-Mapper
/// double-serialization guard) → legacy <c>tenant_id</c>.
/// </remarks>
public static class TenantResolver
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>Entry shape of the <c>spaceos_tenants</c> claim (kernel <c>TenantClaimDto</c> subset).</summary>
    private sealed record TenantClaimEntry(string? TenantId);

    /// <summary>
    /// Resolves the effective tenant for <paramref name="user"/>, optionally honouring a
    /// tenant selection header — but only when the header matches a token tenant.
    /// </summary>
    /// <param name="user">The authenticated principal.</param>
    /// <param name="requestedTenantHeader">Raw value of the tenant selection header, or <c>null</c> when absent.</param>
    /// <param name="logger">Optional logger for claim-parsing warnings.</param>
    /// <returns>The resolution result; never throws for malformed input.</returns>
    public static TenantResolutionResult Resolve(
        ClaimsPrincipal user,
        string? requestedTenantHeader,
        ILogger? logger = null)
    {
        var tokenTenants = CollectTokenTenants(user, logger);

        if (tokenTenants.Count == 0)
            return new TenantResolutionResult(TenantResolutionStatus.NoTenantClaim, Guid.Empty, null);

        if (string.IsNullOrWhiteSpace(requestedTenantHeader))
            return new TenantResolutionResult(TenantResolutionStatus.Resolved, tokenTenants[0], null);

        // ADR-061 (T1): the header is an allowlist SELECTION, never an identity source.
        if (Guid.TryParse(requestedTenantHeader, out var requested) && tokenTenants.Contains(requested))
            return new TenantResolutionResult(TenantResolutionStatus.Resolved, requested, null);

        return new TenantResolutionResult(
            TenantResolutionStatus.HeaderNotInTokenTenants, Guid.Empty, requestedTenantHeader);
    }

    /// <summary>
    /// Collects every tenant id present in the token, in kernel claim priority order.
    /// The first entry is the default tenant when no header is sent.
    /// </summary>
    private static List<Guid> CollectTokenTenants(ClaimsPrincipal user, ILogger? logger)
    {
        var tenants = new List<Guid>();

        void Add(Guid guid)
        {
            if (guid != Guid.Empty && !tenants.Contains(guid))
                tenants.Add(guid);
        }

        // Priority 1: flat "tid" claim.
        if (TryParseGuid(user.FindFirst(TenancyDefaults.TenantIdClaim)?.Value, out var tid))
            Add(tid);

        // Priority 2: "spaceos_tenants" JSON array claim (KC-T2).
        var tenantsClaim = user.FindFirst(TenancyDefaults.TenantListClaim)?.Value;
        if (!string.IsNullOrWhiteSpace(tenantsClaim))
        {
            foreach (var entry in ParseTenantListClaim(tenantsClaim, user, logger))
            {
                if (TryParseGuid(entry.TenantId, out var listTenant))
                    Add(listTenant);
            }
        }

        // Priority 3: legacy flat "tenant_id" claim (kept during the Keycloak migration).
        if (TryParseGuid(user.FindFirst(TenancyDefaults.LegacyTenantIdClaim)?.Value, out var legacy))
            Add(legacy);

        return tenants;
    }

    private static IReadOnlyList<TenantClaimEntry> ParseTenantListClaim(
        string claimValue,
        ClaimsPrincipal user,
        ILogger? logger)
    {
        try
        {
            // Kernel BE-01 guard: the Keycloak Script Mapper may JSON.stringify() the array,
            // wrapping it in a string — unwrap before deserializing.
            var json = claimValue.TrimStart().StartsWith('[')
                ? claimValue
                : JsonSerializer.Deserialize<string>(claimValue, JsonOptions) ?? claimValue;

            return JsonSerializer.Deserialize<List<TenantClaimEntry>>(json, JsonOptions) ?? [];
        }
        catch (JsonException ex)
        {
            logger?.LogWarning(ex,
                "Failed to deserialize the {Claim} claim for subject {Sub}; treating it as absent.",
                TenancyDefaults.TenantListClaim, user.FindFirst("sub")?.Value);
            return [];
        }
    }

    private static bool TryParseGuid(string? value, out Guid guid)
    {
        guid = Guid.Empty;
        return !string.IsNullOrWhiteSpace(value) && Guid.TryParse(value, out guid) && guid != Guid.Empty;
    }
}
