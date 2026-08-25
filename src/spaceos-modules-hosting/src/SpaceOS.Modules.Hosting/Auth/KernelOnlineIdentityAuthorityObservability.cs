using System.Diagnostics.Metrics;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>Thread-safe, non-secret operational snapshot of the Kernel authority dependency.</summary>
public sealed record KernelOnlineIdentityAuthoritySnapshot(
    KernelOnlineIdentityAuthorityOutcome? LastOutcome,
    DateTimeOffset? LastAttemptAt,
    DateTimeOffset? LastSuccessfulContactAt,
    DateTimeOffset? LastDependencyFailureAt,
    double LastLatencyMilliseconds,
    bool LastResultWasCacheHit,
    int ConsecutiveDependencyFailures);

/// <summary>Read-only state exposed to readiness and platform metric adapters.</summary>
public interface IKernelOnlineIdentityAuthorityObservability
{
    /// <summary>Returns one coherent point-in-time snapshot.</summary>
    KernelOnlineIdentityAuthoritySnapshot GetSnapshot();
}

/// <summary>
/// Records bounded outcome and latency data without subject, tenant or credential labels.
/// </summary>
public sealed class KernelOnlineIdentityAuthorityRuntimeState(
    TimeProvider timeProvider) : IKernelOnlineIdentityAuthorityObservability
{
    private static readonly Meter Meter = new("SpaceOS.Modules.Hosting.IdentityAuthority", "1.0.0");
    private static readonly Counter<long> Outcomes = Meter.CreateCounter<long>(
        "spaceos.identity_authority.outcomes",
        description: "Kernel online identity authority outcomes.");
    private static readonly Histogram<double> Latency = Meter.CreateHistogram<double>(
        "spaceos.identity_authority.duration",
        unit: "ms",
        description: "End-to-end Kernel online identity authority lookup latency.");
    private readonly object _sync = new();
    private KernelOnlineIdentityAuthoritySnapshot _snapshot = new(
        null,
        null,
        null,
        null,
        0,
        false,
        0);

    /// <inheritdoc />
    public KernelOnlineIdentityAuthoritySnapshot GetSnapshot()
    {
        lock (_sync)
            return _snapshot;
    }

    internal DateTimeOffset UtcNow => timeProvider.GetUtcNow();

    internal void Record(
        KernelOnlineIdentityAuthorityOutcome outcome,
        TimeSpan latency,
        KernelOnlineIdentityAuthorityDependencyObservation observation)
    {
        var now = timeProvider.GetUtcNow();
        lock (_sync)
        {
            var successfulContact = _snapshot.LastSuccessfulContactAt;
            var dependencyFailure = _snapshot.LastDependencyFailureAt;
            var consecutiveFailures = _snapshot.ConsecutiveDependencyFailures;

            if (observation == KernelOnlineIdentityAuthorityDependencyObservation.Available)
            {
                successfulContact = now;
                dependencyFailure = null;
                consecutiveFailures = 0;
            }
            else if (observation == KernelOnlineIdentityAuthorityDependencyObservation.Unavailable)
            {
                dependencyFailure = now;
                consecutiveFailures++;
            }

            _snapshot = new KernelOnlineIdentityAuthoritySnapshot(
                outcome,
                now,
                successfulContact,
                dependencyFailure,
                latency.TotalMilliseconds,
                outcome == KernelOnlineIdentityAuthorityOutcome.CacheHit,
                consecutiveFailures);
        }

        var outcomeName = OutcomeName(outcome);
        Outcomes.Add(1, new KeyValuePair<string, object?>("outcome", outcomeName));
        Latency.Record(
            latency.TotalMilliseconds,
            new KeyValuePair<string, object?>("outcome", outcomeName));
    }

    internal static string OutcomeName(KernelOnlineIdentityAuthorityOutcome outcome)
        => outcome switch
        {
            KernelOnlineIdentityAuthorityOutcome.Success => "success",
            KernelOnlineIdentityAuthorityOutcome.CacheHit => "cache_hit",
            KernelOnlineIdentityAuthorityOutcome.NotFound => "not_found",
            KernelOnlineIdentityAuthorityOutcome.Unauthorized => "unauthorized",
            KernelOnlineIdentityAuthorityOutcome.Forbidden => "forbidden",
            KernelOnlineIdentityAuthorityOutcome.Conflict => "conflict",
            KernelOnlineIdentityAuthorityOutcome.RateLimited => "rate_limited",
            KernelOnlineIdentityAuthorityOutcome.ServerError => "server_error",
            KernelOnlineIdentityAuthorityOutcome.UnexpectedStatus => "unexpected_status",
            KernelOnlineIdentityAuthorityOutcome.Timeout => "timeout",
            KernelOnlineIdentityAuthorityOutcome.TransportError => "transport_error",
            KernelOnlineIdentityAuthorityOutcome.ServiceAuthenticationError => "service_authentication_error",
            KernelOnlineIdentityAuthorityOutcome.MalformedResponse => "malformed_response",
            KernelOnlineIdentityAuthorityOutcome.ScopeMismatch => "scope_mismatch",
            KernelOnlineIdentityAuthorityOutcome.CallerCancelled => "caller_cancelled",
            _ => "unknown",
        };
}

internal enum KernelOnlineIdentityAuthorityDependencyObservation
{
    Neutral,
    Available,
    Unavailable,
}

/// <summary>
/// Observational readiness for the dependency actually used by authorization decisions.
/// </summary>
/// <remarks>
/// The check never invents a subject or performs an unauthorised probe. Before the first real
/// lookup it reports unhealthy; a recent successful 200/404 reports healthy, while a dependency
/// failure or an expired last-success timestamp reports unhealthy.
/// </remarks>
public sealed class KernelOnlineIdentityAuthorityReadinessHealthCheck(
    IKernelOnlineIdentityAuthorityObservability observability,
    IOptions<KernelOnlineIdentityAuthorityOptions> options,
    TimeProvider timeProvider) : IHealthCheck
{
    /// <inheritdoc />
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var snapshot = observability.GetSnapshot();
        if (snapshot.LastSuccessfulContactAt is null)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy(
                snapshot.LastDependencyFailureAt is null
                    ? "Kernel authority has not yet been observed."
                    : "Kernel authority has no successful contact after a dependency failure.",
                data: Data(snapshot, null)));
        }

        if (snapshot.LastDependencyFailureAt is { } failure
            && failure >= snapshot.LastSuccessfulContactAt.Value)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy(
                "The latest Kernel authority dependency observation failed.",
                data: Data(snapshot, null)));
        }

        var age = timeProvider.GetUtcNow() - snapshot.LastSuccessfulContactAt.Value;
        if (age > TimeSpan.FromSeconds(options.Value.ReadinessMaximumAgeSeconds))
        {
            return Task.FromResult(HealthCheckResult.Unhealthy(
                "The last successful Kernel authority contact is stale.",
                data: Data(snapshot, age)));
        }

        return Task.FromResult(HealthCheckResult.Healthy(
            "Kernel authority was contacted successfully within the freshness window.",
            Data(snapshot, age)));
    }

    private static IReadOnlyDictionary<string, object> Data(
        KernelOnlineIdentityAuthoritySnapshot snapshot,
        TimeSpan? age)
        => new Dictionary<string, object>(StringComparer.Ordinal)
        {
            ["lastOutcome"] = snapshot.LastOutcome is { } outcome
                ? KernelOnlineIdentityAuthorityRuntimeState.OutcomeName(outcome)
                : "none",
            ["lastLatencyMilliseconds"] = snapshot.LastLatencyMilliseconds,
            ["lastSuccessfulContactAgeSeconds"] = age?.TotalSeconds ?? -1,
            ["consecutiveDependencyFailures"] = snapshot.ConsecutiveDependencyFailures,
        };
}
