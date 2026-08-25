using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>Source-owned wall clock and scheduler for OIDC freshness and prewarm.</summary>
internal sealed class OidcAuthorityClock
{
    private readonly TimeProvider _timeProvider;

    /// <summary>
    /// The only tolerated positive issuer clock drift for an access-token <c>iat</c>.
    /// This is source-owned and deliberately matches the sealed bearer lifetime skew; host
    /// configuration cannot widen the interval used to cross an online revoke cutoff.
    /// </summary>
    internal static TimeSpan MaximumFutureIssuedAtSkew => TimeSpan.FromSeconds(30);

    internal OidcAuthorityClock(
        string expectedIssuer,
        IHostEnvironment environment,
        OidcAuthorityTestClockOverride? testOverride)
    {
        if (testOverride is not null
            && (!OidcAuthorityTransport.IsPinnedTestProcess(environment, expectedIssuer)
                || !OidcAuthorityTestClockRegistration.IsSourceMarked(testOverride)))
        {
            throw new InvalidOperationException(
                "The OIDC test clock is restricted to the exact friend test assembly and source-pinned fake HTTPS authority.");
        }

        _timeProvider = testOverride?.TimeProvider ?? TimeProvider.System;
    }

    internal DateTimeOffset UtcNow => _timeProvider.GetUtcNow();

    /// <summary>
    /// Returns whether an issued-at instant is not meaningfully ahead of the source-owned clock.
    /// </summary>
    internal bool IsIssuedAtWithinFutureSkew(DateTimeOffset issuedAt)
    {
        var now = UtcNow;
        return issuedAt <= now || issuedAt - now <= MaximumFutureIssuedAtSkew;
    }

    internal Task DelayAsync(TimeSpan delay, CancellationToken cancellationToken)
        => Task.Delay(delay, _timeProvider, cancellationToken);
}

/// <summary>Friend-test-only source-marked OIDC clock registration.</summary>
internal static class OidcAuthorityTestClockRegistration
{
    private static readonly object SourceMarker = new();

    internal static IServiceCollection AddOidcAuthorityTestClock(
        this IServiceCollection services,
        TimeProvider timeProvider)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(timeProvider);
        services.Replace(ServiceDescriptor.Singleton(
            new OidcAuthorityTestClockOverride(timeProvider, SourceMarker)));
        return services;
    }

    internal static bool IsSourceMarked(OidcAuthorityTestClockOverride testOverride)
        => testOverride.HasMarker(SourceMarker);
}

internal sealed class OidcAuthorityTestClockOverride(
    TimeProvider timeProvider,
    object sourceMarker)
{
    internal TimeProvider TimeProvider { get; } = timeProvider;

    internal bool HasMarker(object expected) => ReferenceEquals(sourceMarker, expected);
}
