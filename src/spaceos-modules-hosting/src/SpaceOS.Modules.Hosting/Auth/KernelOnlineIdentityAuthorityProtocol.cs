using System.Collections.Immutable;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>Stable wire constants of the Kernel online identity authority.</summary>
public static class KernelOnlineIdentityAuthorityProtocol
{
    /// <summary>Fixed, read-only resolution endpoint appended to the configured Kernel base URL.</summary>
    public const string ResolvePath = "api/internal/identity-authority/resolve";

    /// <summary>Exact schema discriminator required in every successful response.</summary>
    public const string SchemaVersion = "spaceos.online-identity-authority/v1";

    /// <summary>
    /// Source-reviewed production trust anchor. It intentionally remains unset until
    /// activation supplies and reviews the canonical Kernel DNS endpoint.
    /// </summary>
    public const string? ProductionBaseUrl = null;

    /// <summary>
    /// The only clear-text endpoint accepted by the explicit Development test policy.
    /// The fixed loopback URI is for an in-process handler and must never be a host fallback.
    /// </summary>
    public const string DevelopmentLoopbackBaseUrl = "http://127.0.0.1:65535/";
}

internal static class KernelOnlineIdentityAuthorityEndpointPolicy
{
    internal static Uri CreateBaseUri(string configured)
        => new(configured.TrimEnd('/') + "/", UriKind.Absolute);

    internal static Uri CreateResolveUri(string configured)
        => new(CreateBaseUri(configured), KernelOnlineIdentityAuthorityProtocol.ResolvePath);

    internal static bool IsExactNormalizedUri(Uri? actual, Uri expected)
        => actual is { IsAbsoluteUri: true }
           && string.Equals(actual.Scheme, expected.Scheme, StringComparison.Ordinal)
           && string.Equals(actual.IdnHost, expected.IdnHost, StringComparison.Ordinal)
           && actual.Port == expected.Port
           && string.Equals(actual.AbsolutePath, expected.AbsolutePath, StringComparison.Ordinal)
           && string.Equals(actual.Query, expected.Query, StringComparison.Ordinal)
           && string.Equals(actual.Fragment, expected.Fragment, StringComparison.Ordinal)
           && string.Equals(actual.UserInfo, expected.UserInfo, StringComparison.Ordinal);
}

/// <summary>Shared, source-pinned grammar for an opaque online-authority subject.</summary>
internal static class OnlineIdentityAuthoritySubject
{
    internal const int MaximumLength = 256;

    internal static bool IsCanonical(string? subject)
    {
        if (string.IsNullOrEmpty(subject) || subject.Length > MaximumLength)
            return false;

        foreach (var character in subject)
        {
            var category = char.GetUnicodeCategory(character);
            if (char.IsWhiteSpace(character)
                || char.IsControl(character)
                || char.IsSurrogate(character)
                || category == UnicodeCategory.Format)
            {
                return false;
            }
        }

        return true;
    }
}

/// <summary>Non-secret, bounded result classification used by logs, metrics and readiness.</summary>
public enum KernelOnlineIdentityAuthorityOutcome
{
    /// <summary>A strict 200 response was accepted.</summary>
    Success,

    /// <summary>A non-expired positive cache entry was returned.</summary>
    CacheHit,

    /// <summary>The Kernel authoritatively reported an unknown subject/tenant pair.</summary>
    NotFound,

    /// <summary>The dedicated service identity was not accepted.</summary>
    Unauthorized,

    /// <summary>The dedicated service identity lacks permission.</summary>
    Forbidden,

    /// <summary>The authority state could not be read consistently.</summary>
    Conflict,

    /// <summary>The Kernel rate-limited the lookup.</summary>
    RateLimited,

    /// <summary>The Kernel returned a classified server failure.</summary>
    ServerError,

    /// <summary>The fixed endpoint returned an unexpected HTTP status.</summary>
    UnexpectedStatus,

    /// <summary>The lookup exceeded an attempt or total budget.</summary>
    Timeout,

    /// <summary>The Kernel transport failed.</summary>
    TransportError,

    /// <summary>The host-supplied service credential adapter could not authenticate the request.</summary>
    ServiceAuthenticationError,

    /// <summary>The 200 response was not the strict authority schema.</summary>
    MalformedResponse,

    /// <summary>The response did not echo the exact requested subject and tenant.</summary>
    ScopeMismatch,

    /// <summary>The caller canceled its own request.</summary>
    CallerCancelled,
}

/// <summary>Fail-closed provider failure with a stable, non-secret outcome.</summary>
public sealed class KernelOnlineIdentityAuthorityException : Exception
{
    /// <summary>Creates a classified provider failure.</summary>
    public KernelOnlineIdentityAuthorityException(
        KernelOnlineIdentityAuthorityOutcome outcome,
        string message,
        Exception? innerException = null)
        : base(message, innerException)
    {
        Outcome = outcome;
    }

    /// <summary>Stable outcome safe for metrics and structured logs.</summary>
    public KernelOnlineIdentityAuthorityOutcome Outcome { get; }
}

internal sealed record KernelOnlineIdentityAuthorityRequest(
    [property: JsonPropertyName("subject")] string Subject,
    [property: JsonPropertyName("tenantId")] string TenantId);

/// <summary>Strict parser for the successful Kernel response.</summary>
internal static class KernelOnlineIdentityAuthorityResponseParser
{
    private const int MaximumCollectionCount = 10;
    private const int MaximumValueLength = 100;
    private const long MaximumJsonSafeInteger = 9_007_199_254_740_991;
    private const string TenantMembersManage = "tenant.members.manage";
    private static readonly HashSet<string> ExpectedProperties = new(StringComparer.Ordinal)
    {
        "schemaVersion",
        "subject",
        "tenantId",
        "tenantStatus",
        "membershipStatus",
        "membershipVersion",
        "projectionVersion",
        "acceptTokensIssuedAtOrAfter",
        "permissions",
        "enabledModules",
    };

    internal static OnlineIdentityAuthorityState Parse(
        ReadOnlyMemory<byte> body,
        string expectedSubject,
        Guid expectedTenantId)
    {
        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(body, new JsonDocumentOptions
            {
                AllowTrailingCommas = false,
                CommentHandling = JsonCommentHandling.Disallow,
                MaxDepth = 8,
            });
        }
        catch (JsonException exception)
        {
            throw Malformed("The Kernel authority response is not valid JSON.", exception);
        }

        using (document)
        {
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
                throw Malformed("The Kernel authority response root must be an object.");

            RejectDuplicateProperties(root);
            var properties = root.EnumerateObject().ToArray();
            if (properties.Length != ExpectedProperties.Count
                || !ExpectedProperties.SetEquals(properties.Select(static property => property.Name)))
            {
                throw Malformed("The Kernel authority response property set is not exact.");
            }

            var schemaVersion = ReadString(root, "schemaVersion");
            if (!string.Equals(
                    schemaVersion,
                    KernelOnlineIdentityAuthorityProtocol.SchemaVersion,
                    StringComparison.Ordinal))
            {
                throw Malformed("The Kernel authority response schemaVersion is unknown.");
            }

            var subject = ReadString(root, "subject");
            var tenantText = ReadString(root, "tenantId");
            var expectedTenantText = expectedTenantId.ToString("D", CultureInfo.InvariantCulture);
            if (!string.Equals(subject, expectedSubject, StringComparison.Ordinal)
                || !string.Equals(tenantText, expectedTenantText, StringComparison.Ordinal))
            {
                throw new KernelOnlineIdentityAuthorityException(
                    KernelOnlineIdentityAuthorityOutcome.ScopeMismatch,
                    "The Kernel authority response did not echo the exact requested scope.");
            }

            var tenantStatus = ReadString(root, "tenantStatus");
            var membershipStatus = ReadString(root, "membershipStatus");
            var tenantActive = tenantStatus switch
            {
                "active" => true,
                "deactivated" => false,
                _ => throw Malformed("The Kernel authority tenantStatus is unknown."),
            };
            var membershipActive = membershipStatus switch
            {
                "active" => true,
                "deactivated" or "revoked" => false,
                _ => throw Malformed("The Kernel authority membershipStatus is unknown."),
            };

            var membershipVersion = ReadPositiveVersion(root, "membershipVersion");
            var projectionVersion = ReadPositiveVersion(root, "projectionVersion");
            var cutoff = ReadUtcCutoff(root);
            var permissions = ReadSortedUniqueStrings(root, "permissions", IsCanonicalPermission);
            var enabledModules = ReadSortedUniqueStrings(
                root,
                "enabledModules",
                TenantResolver.IsAllowedAuthorityModuleId);

            var permissionModules = permissions
                .Where(static permission => permission != TenantMembersManage)
                .Select(static permission => permission[..permission.LastIndexOf('.')])
                .ToArray();
            if (permissionModules.Distinct(StringComparer.Ordinal).Count() != permissionModules.Length
                || permissionModules.Length != enabledModules.Length
                || permissionModules.Any(module => !enabledModules.Contains(module, StringComparer.Ordinal)))
            {
                throw Malformed(
                    "The Kernel authority permissions and enabledModules do not describe the same canonical modules.");
            }

            return new OnlineIdentityAuthorityState(
                subject,
                expectedTenantId,
                tenantActive,
                membershipActive,
                membershipVersion,
                projectionVersion,
                cutoff,
                permissions,
                enabledModules);
        }
    }

    private static string ReadString(JsonElement root, string propertyName)
    {
        var property = root.GetProperty(propertyName);
        if (property.ValueKind != JsonValueKind.String || property.GetString() is not { } value)
            throw Malformed($"The Kernel authority {propertyName} must be a JSON string.");
        return value;
    }

    private static long ReadPositiveVersion(JsonElement root, string propertyName)
    {
        var property = root.GetProperty(propertyName);
        if (property.ValueKind != JsonValueKind.Number
            || !property.TryGetInt64(out var value)
            || value is < 1 or > MaximumJsonSafeInteger)
        {
            throw Malformed(
                $"The Kernel authority {propertyName} must be a positive JSON-safe integer.");
        }

        return value;
    }

    private static DateTimeOffset ReadUtcCutoff(JsonElement root)
    {
        var raw = ReadString(root, "acceptTokensIssuedAtOrAfter");
        if (!raw.EndsWith('Z')
            || !DateTimeOffset.TryParseExact(
                raw,
                ["yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd'T'HH:mm:ss.FFFFFFF'Z'"],
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsed)
            || parsed.Offset != TimeSpan.Zero)
        {
            throw Malformed(
                "The Kernel authority acceptTokensIssuedAtOrAfter must be a UTC RFC3339 timestamp ending in Z.");
        }

        return parsed;
    }

    private static ImmutableArray<string> ReadSortedUniqueStrings(
        JsonElement root,
        string propertyName,
        Func<string?, bool> validator)
    {
        var property = root.GetProperty(propertyName);
        if (property.ValueKind != JsonValueKind.Array
            || property.GetArrayLength() > MaximumCollectionCount)
        {
            throw Malformed(
                $"The Kernel authority {propertyName} must be a bounded JSON array.");
        }

        var values = new List<string>(property.GetArrayLength());
        foreach (var item in property.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.String
                || item.GetString() is not { } value
                || value.Length > MaximumValueLength
                || !validator(value))
            {
                throw Malformed(
                    $"The Kernel authority {propertyName} contains a non-canonical value.");
            }

            values.Add(value);
        }

        if (values.Distinct(StringComparer.Ordinal).Count() != values.Count
            || !values.SequenceEqual(values.Order(StringComparer.Ordinal), StringComparer.Ordinal))
        {
            throw Malformed(
                $"The Kernel authority {propertyName} must be sorted and unique.");
        }

        return values.ToImmutableArray();
    }

    private static bool IsCanonicalPermission(string? value)
    {
        if (value == TenantMembersManage)
            return true;
        if (string.IsNullOrEmpty(value))
            return false;

        var separator = value.LastIndexOf('.');
        if (separator <= 0 || separator == value.Length - 1)
            return false;

        var action = value[(separator + 1)..];
        return action is "view" or "edit" or "admin"
               && TenantResolver.IsAllowedAuthorityModuleId(value[..separator]);
    }

    private static void RejectDuplicateProperties(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                {
                    var names = new HashSet<string>(StringComparer.Ordinal);
                    foreach (var property in element.EnumerateObject())
                    {
                        if (!names.Add(property.Name))
                            throw Malformed("The Kernel authority response contains a duplicate JSON property.");
                        RejectDuplicateProperties(property.Value);
                    }

                    break;
                }
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                    RejectDuplicateProperties(item);
                break;
        }
    }

    private static KernelOnlineIdentityAuthorityException Malformed(
        string message,
        Exception? innerException = null)
        => new(KernelOnlineIdentityAuthorityOutcome.MalformedResponse, message, innerException);
}
