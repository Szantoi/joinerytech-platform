using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// Configuration of the explicitly opted-in Kernel-backed online identity authority.
/// </summary>
/// <remarks>
/// The section has no endpoint or credential defaults. Merely referencing the Hosting
/// package never enables an outbound call; a host must call the dedicated registration
/// extension and set <see cref="Enabled"/> to <see langword="true"/>.
/// </remarks>
public sealed class KernelOnlineIdentityAuthorityOptions
{
    /// <summary>Configuration section consumed by the opt-in registration.</summary>
    public const string SectionName = "IdentityAuthority:Kernel";

    /// <summary>Absolute opt-in gate. Defaults to false.</summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Kernel base URL. It must exactly match a source-owned endpoint policy; configuration
    /// cannot introduce a host, port or base path.
    /// </summary>
    public string? BaseUrl { get; set; }

    /// <summary>
    /// One part of the friend-test clear-text gate. It is valid only when the internal test
    /// transport marker is also present for the exact test assembly and pinned loopback URI.
    /// </summary>
    public bool AllowDevelopmentLoopbackHttp { get; set; }

    /// <summary>
    /// Opaque reference resolved by the host-supplied service authenticator.
    /// It is never transmitted, logged or interpreted as credential material by this package.
    /// </summary>
    public string? ServiceAuthReference { get; set; }

    /// <summary>Total budget for lookup, authentication, retry delay and response parsing.</summary>
    public int TotalTimeoutMilliseconds { get; set; } = 1500;

    /// <summary>Budget for one outbound attempt.</summary>
    public int AttemptTimeoutMilliseconds { get; set; } = 600;

    /// <summary>Maximum attempts for the fixed, read-only resolve operation.</summary>
    public int MaxAttempts { get; set; } = 2;

    /// <summary>Bounded delay before the second attempt.</summary>
    public int RetryDelayMilliseconds { get; set; } = 50;

    /// <summary>
    /// Positive-response cache lifetime. Zero, the secure default, disables caching.
    /// </summary>
    public int CacheTtlMilliseconds { get; set; }

    /// <summary>Maximum accepted response body size.</summary>
    public int MaxResponseBytes { get; set; } = 32 * 1024;

    /// <summary>Maximum age of the last successful Kernel contact reported as ready.</summary>
    public int ReadinessMaximumAgeSeconds { get; set; } = 60;
}

/// <summary>Fail-fast validation for <see cref="KernelOnlineIdentityAuthorityOptions"/>.</summary>
internal sealed class KernelOnlineIdentityAuthorityOptionsValidator(
    IHostEnvironment environment,
    KernelOnlineIdentityAuthorityTestTransportOverride? testTransport = null)
    : IValidateOptions<KernelOnlineIdentityAuthorityOptions>
{
    private const int MaximumTotalTimeoutMilliseconds = 1500;
    private const int MaximumCacheTtlMilliseconds = 2000;
    private static readonly HashSet<string> AllowedServiceReferenceSchemes =
        new(StringComparer.Ordinal) { "certificate", "env", "vault" };

    /// <inheritdoc />
    public ValidateOptionsResult Validate(
        string? name,
        KernelOnlineIdentityAuthorityOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var failures = new List<string>();
        if (!options.Enabled)
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:Enabled must be true when the " +
                "Kernel provider is explicitly registered; the provider is default-off.");
        }

        ValidateBaseUrl(options, failures);
        ValidateServiceAuthReference(options.ServiceAuthReference, failures);

        if (options.TotalTimeoutMilliseconds is <= 0 or > MaximumTotalTimeoutMilliseconds)
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:TotalTimeoutMilliseconds " +
                $"must be between 1 and {MaximumTotalTimeoutMilliseconds}.");
        }

        if (options.AttemptTimeoutMilliseconds <= 0
            || options.AttemptTimeoutMilliseconds > options.TotalTimeoutMilliseconds)
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:AttemptTimeoutMilliseconds " +
                "must be positive and no greater than the total timeout.");
        }

        if (options.MaxAttempts is < 1 or > 2)
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:MaxAttempts must be 1 or 2.");
        }

        if (options.RetryDelayMilliseconds is < 0 or > 250)
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:RetryDelayMilliseconds " +
                "must be between 0 and 250.");
        }

        if (options.CacheTtlMilliseconds is < 0 or > MaximumCacheTtlMilliseconds)
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:CacheTtlMilliseconds " +
                $"must be between 0 and {MaximumCacheTtlMilliseconds}; zero is the secure default.");
        }

        if (options.MaxResponseBytes is < 4096 or > 64 * 1024)
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:MaxResponseBytes " +
                "must be between 4096 and 65536.");
        }

        if (options.ReadinessMaximumAgeSeconds is < 1 or > 3600)
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:ReadinessMaximumAgeSeconds " +
                "must be between 1 and 3600.");
        }

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }

    private void ValidateBaseUrl(
        KernelOnlineIdentityAuthorityOptions options,
        ICollection<string> failures)
    {
        var configured = options.BaseUrl;
        if (string.IsNullOrWhiteSpace(configured)
            || !Uri.TryCreate(configured, UriKind.Absolute, out var uri)
            || string.IsNullOrWhiteSpace(uri.Host)
            || (!string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.Ordinal)
                && !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.Ordinal)))
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:BaseUrl must be an absolute HTTP(S) URL.");
            return;
        }

        if (!string.IsNullOrEmpty(uri.UserInfo)
            || !string.IsNullOrEmpty(uri.Query)
            || !string.IsNullOrEmpty(uri.Fragment))
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:BaseUrl must not contain " +
                "userinfo, query or fragment components.");
        }

        if (uri.Scheme == Uri.UriSchemeHttp)
        {
            if (!environment.IsDevelopment()
                || !string.Equals(
                    environment.ApplicationName,
                    KernelOnlineIdentityAuthoritySendBoundaryHandler.TestAssemblyName,
                    StringComparison.Ordinal)
                || testTransport is null
                || !options.AllowDevelopmentLoopbackHttp
                || !KernelOnlineIdentityAuthorityEndpointPolicy.IsExactNormalizedUri(
                    uri,
                    new Uri(
                        KernelOnlineIdentityAuthorityProtocol.DevelopmentLoopbackBaseUrl,
                        UriKind.Absolute)))
            {
                failures.Add(
                    $"{KernelOnlineIdentityAuthorityOptions.SectionName}:the runtime transport is " +
                    "HTTPS-only; HTTP is allowed only by explicit opt-in with the internal transport " +
                    "override in the exact friend test assembly, Development environment and " +
                    "source-pinned 127.0.0.1:65535 endpoint.");
            }

            return;
        }

        if (options.AllowDevelopmentLoopbackHttp)
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:AllowDevelopmentLoopbackHttp " +
                "is valid only with the internal friend-test transport override and source-pinned HTTP endpoint.");
        }

        var productionPin = KernelOnlineIdentityAuthorityProtocol.ProductionBaseUrl;
        if (string.IsNullOrWhiteSpace(productionPin))
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:the production Kernel endpoint " +
                "source pin is intentionally unconfigured; activation requires a reviewed code change.");
            return;
        }

        if (!Uri.TryCreate(productionPin, UriKind.Absolute, out var pinnedUri)
            || pinnedUri.Scheme != Uri.UriSchemeHttps
            || Uri.CheckHostName(pinnedUri.Host) != UriHostNameType.Dns
            || !KernelOnlineIdentityAuthorityEndpointPolicy.IsExactNormalizedUri(uri, pinnedUri))
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:BaseUrl must exactly match the " +
                "source-pinned production HTTPS DNS endpoint, including port and base path.");
        }
    }

    private static void ValidateServiceAuthReference(
        string? configured,
        ICollection<string> failures)
    {
        if (string.IsNullOrWhiteSpace(configured)
            || configured.Length > 256
            || configured.Any(static character => char.IsWhiteSpace(character) || char.IsControl(character)))
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:ServiceAuthReference must be a " +
                "non-secret env://, vault:// or certificate:// reference of at most 256 characters.");
            return;
        }

        var separator = configured.IndexOf("://", StringComparison.Ordinal);
        var scheme = separator > 0 ? configured[..separator] : string.Empty;
        var target = separator > 0 ? configured[(separator + 3)..] : string.Empty;
        if (!AllowedServiceReferenceSchemes.Contains(scheme)
            || target.Length == 0
            || target.IndexOfAny(['?', '#', '@', '=']) >= 0)
        {
            failures.Add(
                $"{KernelOnlineIdentityAuthorityOptions.SectionName}:ServiceAuthReference must be a " +
                "non-secret env://, vault:// or certificate:// reference; inline credentials are forbidden.");
        }
    }
}
