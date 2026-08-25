using System.Security.Claims;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace SpaceOS.Modules.Hosting.Tenancy;

/// <summary>Outcome classification of a tenant resolution attempt.</summary>
public enum TenantResolutionStatus
{
    /// <summary>The canonical token authority resolved exactly one tenant.</summary>
    Resolved,

    /// <summary>The token carries no canonical tenant authority claim.</summary>
    NoTenantClaim,

    /// <summary>The token carries an ambiguous, legacy or malformed tenant authority.</summary>
    InvalidTenantAuthority,

    /// <summary>The optional selection header does not match the signed tenant.</summary>
    HeaderNotInTokenTenants,
}

/// <summary>Result of <see cref="TenantResolver.Resolve"/>.</summary>
public sealed record TenantResolutionResult(
    TenantResolutionStatus Status,
    Guid TenantId,
    string? RejectedHeaderValue);

/// <summary>
/// Resolves the versioned, native <c>spaceos_tenants</c> access-token authority.
/// </summary>
/// <remarks>
/// The accepted profile is deliberately singular and unambiguous: exactly one native
/// <c>spaceos_tenants</c> entry with snake-case <c>tenant_id</c>,
/// <c>permissions</c> and <c>enabled_modules</c>. Flat <c>tid</c>,
/// <c>tenant_id</c>, permission/module fallbacks, camel-case aliases and mixed profiles
/// are rejected. The array may materialize as one JSON-array claim or as one JSON-object
/// claim after ASP.NET's JWT handler splits the native array; those are the same wire
/// profile, not compatibility alternatives.
/// </remarks>
public static class TenantResolver
{
    private const int MaximumPermissions = 10;
    private const int MaximumModules = 10;
    private const int MaximumValueLength = 100;
    private const string TenantMembersManage = "tenant.members.manage";
    private static readonly HashSet<Guid> ReservedTenantIds =
    [
        Guid.Empty,
        Guid.Parse("00000000-0000-0000-0000-000000000001"),
        Guid.Parse("00000000-0000-0000-0000-000000000002"),
    ];
    private static readonly HashSet<string> AllowedEntryProperties = new(StringComparer.Ordinal)
    {
        "tenant_id",
        "permissions",
        "enabled_modules",
        "tenant_type",
        "brand_skin",
    };
    private static readonly HashSet<string> AllowedAuthorityModules = new(StringComparer.Ordinal)
    {
        "spaceos.crm",
        "spaceos.controlling",
        "spaceos.hr",
        "spaceos.maintenance",
        "spaceos.qa",
        "spaceos.ehs",
        "spaceos.dms",
        "joinerytech.door",
        "joinerytech.plant",
    };

    private static readonly string[] ProhibitedTopLevelAuthorityClaims =
    [
        TenancyDefaults.TenantIdClaim,
        TenancyDefaults.LegacyTenantIdClaim,
        TenancyDefaults.EnabledModulesClaim,
        TenancyDefaults.PermissionsClaim,
        "tenantId",
        "spaceosTenants",
        "enabledModules",
    ];

    internal sealed record CanonicalTenantAuthority(
        Guid TenantId,
        IReadOnlySet<string> Permissions,
        IReadOnlySet<string> EnabledModules);

    /// <summary>Resolves the signed tenant and validates an optional tenant header.</summary>
    public static TenantResolutionResult Resolve(
        ClaimsPrincipal user,
        string? requestedTenantHeader,
        ILogger? logger = null)
    {
        ArgumentNullException.ThrowIfNull(user);

        var hasTenantClaim = user.FindAll(TenancyDefaults.TenantListClaim).Any();
        if (!TryGetCanonicalAuthority(user, logger, out var authority))
        {
            return new TenantResolutionResult(
                hasTenantClaim || HasProhibitedAuthorityClaim(user)
                    ? TenantResolutionStatus.InvalidTenantAuthority
                    : TenantResolutionStatus.NoTenantClaim,
                Guid.Empty,
                null);
        }

        if (string.IsNullOrWhiteSpace(requestedTenantHeader))
            return new TenantResolutionResult(TenantResolutionStatus.Resolved, authority.TenantId, null);

        if (Guid.TryParseExact(requestedTenantHeader, "D", out var requested)
            && requested == authority.TenantId)
        {
            return new TenantResolutionResult(TenantResolutionStatus.Resolved, requested, null);
        }

        return new TenantResolutionResult(
            TenantResolutionStatus.HeaderNotInTokenTenants,
            Guid.Empty,
            requestedTenantHeader);
    }

    /// <summary>
    /// Returns modules only from the same canonical entry that resolved the tenant.
    /// Any malformed, legacy, mixed or tenant-mismatched authority returns an empty set.
    /// </summary>
    public static IReadOnlySet<string> GetEnabledModules(
        ClaimsPrincipal user,
        Guid tenantId,
        ILogger? logger = null)
    {
        ArgumentNullException.ThrowIfNull(user);
        return tenantId != Guid.Empty
               && TryGetCanonicalAuthority(user, logger, out var authority)
               && authority.TenantId == tenantId
            ? authority.EnabledModules
            : EmptySet();
    }

    /// <summary>
    /// Returns permissions only from the same canonical entry that resolved the tenant.
    /// Any malformed, legacy, mixed or tenant-mismatched authority returns an empty set.
    /// </summary>
    public static IReadOnlySet<string> GetPermissions(
        ClaimsPrincipal user,
        Guid tenantId,
        ILogger? logger = null)
    {
        ArgumentNullException.ThrowIfNull(user);
        return tenantId != Guid.Empty
               && TryGetCanonicalAuthority(user, logger, out var authority)
               && authority.TenantId == tenantId
            ? authority.Permissions
            : EmptySet();
    }

    internal static bool TryGetCanonicalAuthority(
        ClaimsPrincipal user,
        ILogger? logger,
        out CanonicalTenantAuthority authority)
    {
        authority = null!;
        if (HasProhibitedAuthorityClaim(user))
            return false;

        var claims = user.FindAll(TenancyDefaults.TenantListClaim).ToArray();
        if (claims.Length != 1)
            return false;

        try
        {
            using var document = JsonDocument.Parse(claims[0].Value, new JsonDocumentOptions
            {
                AllowTrailingCommas = false,
                CommentHandling = JsonCommentHandling.Disallow,
                MaxDepth = 8,
            });

            var root = document.RootElement;
            JsonElement entry;
            if (root.ValueKind == JsonValueKind.Array)
            {
                if (root.GetArrayLength() != 1)
                    return false;
                entry = root[0];
            }
            else if (root.ValueKind == JsonValueKind.Object)
            {
                // JsonWebTokenHandler materializes a native one-element JSON array as
                // one object-valued Claim. A JSON string containing an object/array is
                // intentionally not accepted.
                entry = root;
            }
            else
            {
                return false;
            }

            return TryParseEntry(entry, out authority);
        }
        catch (JsonException exception)
        {
            logger?.LogWarning(
                exception,
                "Rejected malformed {Claim} authority for subject {Sub}.",
                TenancyDefaults.TenantListClaim,
                user.FindFirst("sub")?.Value);
            return false;
        }
    }

    private static bool TryParseEntry(
        JsonElement entry,
        out CanonicalTenantAuthority authority)
    {
        authority = null!;
        if (entry.ValueKind != JsonValueKind.Object)
            return false;

        var properties = entry.EnumerateObject().ToArray();
        if (properties.Length is < 3 or > 5
            || properties.Select(static property => property.Name).Distinct(StringComparer.Ordinal).Count()
               != properties.Length
            || properties.Any(property => !AllowedEntryProperties.Contains(property.Name))
            || !properties.Any(static property => property.NameEquals("tenant_id"))
            || !properties.Any(static property => property.NameEquals("permissions"))
            || !properties.Any(static property => property.NameEquals("enabled_modules"))
            || !HasValidOptionalMetadata(entry, "tenant_type")
            || !HasValidOptionalMetadata(entry, "brand_skin"))
        {
            return false;
        }

        var tenantText = entry.GetProperty("tenant_id");
        if (tenantText.ValueKind != JsonValueKind.String
            || !TryParseCanonicalTenantId(tenantText.GetString(), out var tenantId)
            || !TryParseSortedUniqueStrings(
                entry.GetProperty("permissions"), MaximumPermissions, IsCanonicalPermission, out var permissions)
            || !TryParseSortedUniqueStrings(
                entry.GetProperty("enabled_modules"), MaximumModules, IsAllowedAuthorityModuleId, out var modules))
        {
            return false;
        }

        var permissionModules = permissions
            .Where(static permission => permission != TenantMembersManage)
            .Select(static permission => permission[..permission.LastIndexOf('.')])
            .ToArray();

        // One effective permission per module, and the exact same module set in both
        // signed arrays. This prevents consumers from choosing the wider of two claims.
        if (permissionModules.Distinct(StringComparer.Ordinal).Count() != permissionModules.Length
            || permissionModules.Length != modules.Count
            || permissionModules.Any(module => !modules.Contains(module)))
        {
            return false;
        }

        authority = new CanonicalTenantAuthority(tenantId, permissions, modules);
        return true;
    }

    private static bool HasValidOptionalMetadata(JsonElement entry, string propertyName)
    {
        if (!entry.TryGetProperty(propertyName, out var metadata))
            return true;
        if (metadata.ValueKind != JsonValueKind.String)
            return false;

        var value = metadata.GetString();
        return value is not null && value.Trim().Length > 0 && value.Length <= MaximumValueLength;
    }

    private static bool TryParseSortedUniqueStrings(
        JsonElement element,
        int maximumCount,
        Func<string?, bool> validator,
        out IReadOnlySet<string> values)
    {
        values = EmptySet();
        if (element.ValueKind != JsonValueKind.Array || element.GetArrayLength() > maximumCount)
            return false;

        var parsed = new List<string>(element.GetArrayLength());
        foreach (var item in element.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.String)
                return false;

            var value = item.GetString();
            if (value is null || value.Length > MaximumValueLength || !validator(value))
                return false;
            parsed.Add(value);
        }

        if (parsed.Distinct(StringComparer.Ordinal).Count() != parsed.Count
            || !parsed.SequenceEqual(parsed.Order(StringComparer.Ordinal), StringComparer.Ordinal))
        {
            return false;
        }

        values = new HashSet<string>(parsed, StringComparer.Ordinal);
        return true;
    }

    private static bool TryParseCanonicalTenantId(string? value, out Guid tenantId)
    {
        tenantId = Guid.Empty;
        return value is not null
               && value == value.ToLowerInvariant()
               && Guid.TryParseExact(value, "D", out tenantId)
               && !ReservedTenantIds.Contains(tenantId);
    }

    private static bool HasProhibitedAuthorityClaim(ClaimsPrincipal user)
        => ProhibitedTopLevelAuthorityClaims.Any(claim => user.FindAll(claim).Any());

    private static bool IsCanonicalPermission(string? value)
    {
        if (value == TenantMembersManage)
            return true;
        if (string.IsNullOrEmpty(value))
            return false;

        var actionSeparator = value.LastIndexOf('.');
        if (actionSeparator <= 0 || actionSeparator == value.Length - 1)
            return false;

        var action = value[(actionSeparator + 1)..];
        return action is "view" or "edit" or "admin"
               && IsAllowedAuthorityModuleId(value[..actionSeparator]);
    }

    internal static bool IsAllowedAuthorityModuleId(string? value)
        => value is not null && AllowedAuthorityModules.Contains(value);

    internal static bool IsCanonicalModuleId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var separator = value.IndexOf('.');
        if (separator <= 0 || separator == value.Length - 1 || value.IndexOf('.', separator + 1) >= 0)
            return false;

        return IsModuleIdPart(value.AsSpan(0, separator))
               && IsModuleIdPart(value.AsSpan(separator + 1));
    }

    private static bool IsModuleIdPart(ReadOnlySpan<char> value)
    {
        if (value.IsEmpty || !char.IsAsciiLetterLower(value[0]))
            return false;

        var previousWasHyphen = false;
        foreach (var character in value)
        {
            if (!(char.IsAsciiLetterLower(character) || char.IsAsciiDigit(character) || character == '-'))
                return false;
            if (character == '-' && previousWasHyphen)
                return false;
            previousWasHyphen = character == '-';
        }

        return !previousWasHyphen;
    }

    private static IReadOnlySet<string> EmptySet()
        => new HashSet<string>(StringComparer.Ordinal);
}
