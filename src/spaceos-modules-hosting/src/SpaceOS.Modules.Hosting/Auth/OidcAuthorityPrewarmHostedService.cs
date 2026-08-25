using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// Warms and maintains the strict discovery/JWKS cache without depending on authenticated
/// ingress. Failures remain visible through readiness and are retried with bounded backoff.
/// </summary>
internal sealed class OidcAuthorityPrewarmHostedService(
    IOptionsMonitor<JwtBearerOptions> jwtOptions,
    IOptions<SpaceOsModuleAuthOptions> authOptions,
    OidcAuthorityRuntimeState runtimeState,
    IOidcAuthorityPrewarmStartGate startGate,
    OidcAuthorityClock clock,
    ILogger<OidcAuthorityPrewarmHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan InitialRetryDelay = TimeSpan.FromMilliseconds(250);
    private static readonly TimeSpan MaximumRetryDelay = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await startGate.WaitAsync(stoppingToken).ConfigureAwait(false);
        var acknowledgedGeneration = 0L;
        var attempted = false;
        var retryDelay = InitialRetryDelay;

        while (!stoppingToken.IsCancellationRequested)
        {
            var snapshot = runtimeState.GetSnapshot();
            if (snapshot.SuccessfulConfigurationGeneration > acknowledgedGeneration)
            {
                acknowledgedGeneration = snapshot.SuccessfulConfigurationGeneration;
                retryDelay = InitialRetryDelay;
                if (!await DelayAsync(SuccessfulRefreshDelay(authOptions.Value), stoppingToken)
                        .ConfigureAwait(false))
                {
                    return;
                }

                continue;
            }

            var failuresBeforeAttempt = snapshot.ConsecutiveFailures;
            try
            {
                var manager = jwtOptions.Get(JwtBearerDefaults.AuthenticationScheme)
                    .ConfigurationManager as StrictOidcConfigurationManager
                    ?? throw new InvalidOperationException(
                        "The OIDC prewarm service requires the source-owned strict configuration manager.");
                if (attempted || acknowledgedGeneration > 0)
                    manager.RequestRefresh();

                using var attempt = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                attempt.CancelAfter(CalculateAttemptBudget(authOptions.Value.OidcAuthority));
                _ = await manager.GetConfigurationAsync(attempt.Token).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (OperationCanceledException exception)
            {
                RecordFailureWhenRetrieverDidNot(
                    failuresBeforeAttempt,
                    "configuration_prewarm_budget_exhausted");
                logger.LogWarning(
                    exception,
                    "OIDC discovery/JWKS prewarm exceeded its bounded attempt budget; readiness remains unhealthy.");
            }
            catch (Exception exception)
            {
                RecordFailureWhenRetrieverDidNot(
                    failuresBeforeAttempt,
                    "configuration_prewarm_failed");
                logger.LogWarning(
                    exception,
                    "OIDC discovery/JWKS prewarm failed; readiness remains unhealthy.");
            }

            attempted = true;
            if (runtimeState.GetSnapshot().SuccessfulConfigurationGeneration > acknowledgedGeneration)
                continue;

            if (!await DelayAsync(retryDelay, stoppingToken).ConfigureAwait(false))
                return;
            retryDelay = TimeSpan.FromMilliseconds(Math.Min(
                retryDelay.TotalMilliseconds * 2,
                MaximumRetryDelay.TotalMilliseconds));
        }
    }

    private void RecordFailureWhenRetrieverDidNot(int failuresBeforeAttempt, string outcome)
    {
        if (runtimeState.GetSnapshot().ConsecutiveFailures == failuresBeforeAttempt)
            runtimeState.RecordFailure(outcome);
    }

    private async Task<bool> DelayAsync(TimeSpan delay, CancellationToken stoppingToken)
    {
        try
        {
            await clock.DelayAsync(delay, stoppingToken).ConfigureAwait(false);
            return true;
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            return false;
        }
    }

    internal static TimeSpan CalculateAttemptBudget(OidcAuthoritySecurityOptions options)
        => TimeSpan.FromMilliseconds(Math.Min(
            10_000,
            (2 * options.BackchannelTimeoutMilliseconds) + 250));

    private static TimeSpan SuccessfulRefreshDelay(SpaceOsModuleAuthOptions options)
    {
        var refreshInterval = TimeSpan.FromSeconds(options.OidcAuthority.RefreshIntervalSeconds);
        var automaticRefresh = TimeSpan.FromMinutes(
            options.OidcAuthority.AutomaticRefreshIntervalMinutes);
        var halfMaximumAge = TimeSpan.FromSeconds(
            options.OidcAuthority.MaximumConfigurationAgeSeconds / 2d);
        var desired = automaticRefresh <= halfMaximumAge ? automaticRefresh : halfMaximumAge;
        return desired >= refreshInterval ? desired : refreshInterval;
    }
}

/// <summary>
/// Internal scheduling seam: production always uses the immediate gate; isolated protocol
/// tests can hold one host's background prewarm until that test explicitly releases it.
/// </summary>
internal interface IOidcAuthorityPrewarmStartGate
{
    ValueTask WaitAsync(CancellationToken cancellationToken);
}

internal sealed class ImmediateOidcAuthorityPrewarmStartGate : IOidcAuthorityPrewarmStartGate
{
    public ValueTask WaitAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return ValueTask.CompletedTask;
    }
}
