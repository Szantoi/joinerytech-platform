using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
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
    private sealed record TenantClaimEntry
    {
        // Keycloak's production Script Mapper emits snake_case. The camelCase aliases
        // preserve pre-ERPSEP test/dev tokens during the migration, without changing the
        // public wire contract.
        [JsonPropertyName("tenant_id")]
        public string? TenantId { get; init; }

        [JsonPropertyName("tenantId")]
        public string? LegacyTenantId { get; init; }

        [JsonPropertyName("enabled_modules")]
        public string[]? EnabledModules { get; init; }

        [JsonPropertyName("enabledModules")]
        public string[]? LegacyEnabledModules { get; init; }

        public string? ResolvedTenantId => TenantId ?? LegacyTenantId;

        public IEnumerable<string> ResolvedEnabledModules =>
            EnabledModules ?? LegacyEnabledModules ?? [];
    }

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
    /// Gets the enabled module identifiers for the tenant already resolved by the tenancy
    /// middleware. Only canonical module IDs are retained. A missing, malformed or
    /// tenant-mismatched claim yields an empty set (fail closed).
    /// </summary>
    /// <remarks>
    /// The flat claim is kept as a migration fallback for the current Keycloak mapper.
    /// When a <c>spaceos_tenants</c> claim is present, its entry for <paramref name="tenantId"/>
    /// is authoritative so a multi-tenant token cannot borrow another tenant's modules.
    /// This JWT-derived result is an interim gate only; the final ERPSEP-06 Instance Context
    /// endpoint must revalidate Kernel <c>entitled</c> and <c>enabled</c> state.
    /// </remarks>
    public static IReadOnlySet<string> GetEnabledModules(
        ClaimsPrincipal user,
        Guid tenantId,
        ILogger? logger = null)
    {
        ArgumentNullException.ThrowIfNull(user);
        if (tenantId == Guid.Empty)
            return new HashSet<string>(StringComparer.Ordinal);

        var tenantListClaims = user.FindAll(TenancyDefaults.TenantListClaim).ToArray();
        var entries = tenantListClaims
            .SelectMany(claim => ParseTenantListClaim(claim.Value, user, logger));

        var matchedEntries = entries
            .Where(entry => TryParseGuid(entry.ResolvedTenantId, out var entryTenant) && entryTenant == tenantId)
            .ToArray();

        // A signed token must contain one authoritative entry per tenant. Unioning
        // duplicate entries would let a malformed issuer payload widen access.
        if (matchedEntries.Length == 1)
            return CanonicalizeModules(matchedEntries[0].ResolvedEnabledModules);

        if (matchedEntries.Length > 1)
            return new HashSet<string>(StringComparer.Ordinal);

        // A non-empty tenant list without a matching entry is not eligible for a global
        // fallback: it is malformed for the resolved tenant and therefore denied.
        if (tenantListClaims.Length > 0)
            return new HashSet<string>(StringComparer.Ordinal);

        return CanonicalizeModules(user.FindAll(TenancyDefaults.EnabledModulesClaim)
            .SelectMany(claim => ParseModuleClaim(claim.Value, user, logger)));
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
        foreach (var tenantsClaim in user.FindAll(TenancyDefaults.TenantListClaim))
        {
            foreach (var entry in ParseTenantListClaim(tenantsClaim.Value, user, logger))
            {
                if (TryParseGuid(entry.ResolvedTenantId, out var listTenant))
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

    private static IEnumerable<string> ParseModuleClaim(
        string claimValue,
        ClaimsPrincipal user,
        ILogger? logger)
    {
        if (string.IsNullOrWhiteSpace(claimValue))
            return [];

        try
        {
            var value = claimValue.Trim();
            if (value.StartsWith('['))
                return JsonSerializer.Deserialize<string[]>(value, JsonOptions) ?? [];

            // Keycloak mappers may stringify an array. A quoted scalar is accepted too,
            // but only after canonical-ID validation below.
            if (value.StartsWith('"'))
            {
                var unwrapped = JsonSerializer.Deserialize<string>(value, JsonOptions);
                return unwrapped is null
                    ? []
                    : ParseModuleClaim(unwrapped, user, logger);
            }

            return [value];
        }
        catch (JsonException ex)
        {
            logger?.LogWarning(ex,
                "Failed to deserialize the {Claim} claim for subject {Sub}; treating it as empty.",
                TenancyDefaults.EnabledModulesClaim, user.FindFirst("sub")?.Value);
            return [];
        }
    }

    private static IReadOnlySet<string> CanonicalizeModules(IEnumerable<string> modules)
    {
        var result = new HashSet<string>(StringComparer.Ordinal);
        foreach (var module in modules)
        {
            var value = module?.Trim();
            if (IsCanonicalModuleId(value))
                result.Add(value!);
        }

        return result;
    }

    internal static bool IsCanonicalModuleId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var separator = value.IndexOf('.');
        if (separator <= 0 || separator == value.Length - 1 || value.IndexOf('.', separator + 1) >= 0)
            return false;

        return IsModuleIdPart(value.AsSpan(0, separator), allowLeadingDigit: false)
            && IsModuleIdPart(value.AsSpan(separator + 1), allowLeadingDigit: false);
    }

    private static bool IsModuleIdPart(ReadOnlySpan<char> value, bool allowLeadingDigit)
    {
        if (value.IsEmpty || (!allowLeadingDigit && !char.IsAsciiLetterLower(value[0])))
            return false;

        var previousWasHyphen = false;
        foreach (var character in value)
        {
            if (!(char.IsAsciiLetterLower(character) || char.IsAsciiDigit(character) || character == '-'))
                return false;

            if (character == '-')
            {
                if (previousWasHyphen)
                    return false;

                previousWasHyphen = true;
                continue;
            }

            previousWasHyphen = false;
        }

        return !previousWasHyphen;
    }

    private static bool TryParseGuid(string? value, out Guid guid)
    {
        guid = Guid.Empty;
        return !string.IsNullOrWhiteSpace(value) && Guid.TryParse(value, out guid) && guid != Guid.Empty;
    }
}
