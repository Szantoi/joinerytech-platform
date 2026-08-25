using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>Non-secret point-in-time status of the OIDC discovery/JWKS dependency.</summary>
public sealed record OidcAuthoritySnapshot(
    DateTimeOffset? LastSuccessfulConfigurationAt,
    DateTimeOffset? LastFailureAt,
    string LastOutcome,
    int ConsecutiveFailures,
    long SuccessfulConfigurationGeneration);

/// <summary>
/// Tracks only full, parsed and strictly validated network configurations. Returning a cached
/// configuration never advances <see cref="OidcAuthoritySnapshot.LastSuccessfulConfigurationAt"/>.
/// </summary>
public sealed class OidcAuthorityRuntimeState
{
    private readonly OidcAuthorityClock _clock;
    private readonly object _sync = new();
    private OidcAuthoritySnapshot _snapshot = new(null, null, "cold", 0, 0);

    internal OidcAuthorityRuntimeState(OidcAuthorityClock clock)
    {
        _clock = clock;
    }

    /// <summary>Returns one coherent, non-secret snapshot.</summary>
    public OidcAuthoritySnapshot GetSnapshot()
    {
        lock (_sync)
            return _snapshot;
    }

    internal DateTimeOffset UtcNow => _clock.UtcNow;

    internal void RecordConfigurationSuccess()
    {
        var now = _clock.UtcNow;
        lock (_sync)
        {
            _snapshot = new OidcAuthoritySnapshot(
                now,
                null,
                "configuration_success",
                0,
                _snapshot.SuccessfulConfigurationGeneration + 1);
        }
    }

    internal void RecordFailure(string outcome)
    {
        var now = _clock.UtcNow;
        lock (_sync)
        {
            _snapshot = _snapshot with
            {
                LastFailureAt = now,
                LastOutcome = outcome,
                ConsecutiveFailures = _snapshot.ConsecutiveFailures + 1,
            };
        }
    }
}

/// <summary>Readiness for the exact OIDC discovery/JWKS dependency used by JwtBearer.</summary>
public sealed class OidcAuthorityReadinessHealthCheck(
    OidcAuthorityRuntimeState runtimeState,
    IOptions<SpaceOsModuleAuthOptions> configuredOptions) : IHealthCheck
{
    /// <inheritdoc />
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var snapshot = runtimeState.GetSnapshot();
        if (snapshot.LastSuccessfulConfigurationAt is null)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy(
                "OIDC discovery/JWKS has not produced a validated configuration.",
                data: Data(snapshot, null)));
        }

        if (snapshot.LastFailureAt is { } failure
            && failure >= snapshot.LastSuccessfulConfigurationAt.Value)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy(
                "The latest OIDC discovery/JWKS refresh failed.",
                data: Data(snapshot, null)));
        }

        var age = runtimeState.UtcNow - snapshot.LastSuccessfulConfigurationAt.Value;
        if (age < TimeSpan.Zero
            || age > TimeSpan.FromSeconds(
                configuredOptions.Value.OidcAuthority.MaximumConfigurationAgeSeconds))
        {
            return Task.FromResult(HealthCheckResult.Unhealthy(
                "The last validated OIDC discovery/JWKS configuration is stale.",
                data: Data(snapshot, age)));
        }

        return Task.FromResult(HealthCheckResult.Healthy(
            "OIDC discovery/JWKS is validated and fresh.",
            Data(snapshot, age)));
    }

    private static IReadOnlyDictionary<string, object> Data(
        OidcAuthoritySnapshot snapshot,
        TimeSpan? age)
        => new Dictionary<string, object>(StringComparer.Ordinal)
        {
            ["lastOutcome"] = snapshot.LastOutcome,
            ["lastSuccessfulConfigurationAgeSeconds"] = age?.TotalSeconds ?? -1,
            ["consecutiveFailures"] = snapshot.ConsecutiveFailures,
            ["successfulConfigurationGeneration"] = snapshot.SuccessfulConfigurationGeneration,
        };
}
