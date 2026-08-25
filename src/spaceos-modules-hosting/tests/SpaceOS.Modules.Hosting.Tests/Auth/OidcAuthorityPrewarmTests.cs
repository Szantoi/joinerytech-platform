using System.Diagnostics;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tests.Auth.Protocol;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

public sealed class OidcAuthorityPrewarmTests
{
    [Fact]
    public async Task Cold_host_prewarms_to_healthy_without_authentication_traffic()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        Assert.Equal(HealthStatus.Unhealthy, await harness.CheckOidcReadinessAsync());
        Assert.Equal("cold", harness.OidcRuntimeState.GetSnapshot().LastOutcome);
        Assert.Equal(0, harness.Oidc.DiscoveryRequestCount);

        harness.ReleaseOidcPrewarm();

        Assert.Equal(
            HealthStatus.Healthy,
            await EventuallyReadinessAsync(harness, HealthStatus.Healthy, TimeSpan.FromSeconds(3)));
        Assert.True(harness.Oidc.DiscoveryRequestCount >= 1);
        Assert.True(harness.Oidc.JwksRequestCount >= 1);
        Assert.Equal(0, harness.Oidc.AuthorizationRequestCount);
        Assert.Equal(0, harness.Oidc.TokenRequestCount);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Initial_outage_stays_unhealthy_then_recovers_without_authentication_traffic()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(
            initialDiscoveryFault: ProtocolEndpointFault.Timeout);
        harness.ReleaseOidcPrewarm();

        await EventuallyAsync(
            () => Task.FromResult(
                harness.OidcRuntimeState.GetSnapshot().ConsecutiveFailures > 0),
            TimeSpan.FromSeconds(2));
        Assert.Equal(HealthStatus.Unhealthy, await harness.CheckOidcReadinessAsync());

        harness.Oidc.DiscoveryFault = ProtocolEndpointFault.None;

        Assert.Equal(
            HealthStatus.Healthy,
            await EventuallyReadinessAsync(harness, HealthStatus.Healthy, TimeSpan.FromSeconds(4)));
        Assert.Equal(0, harness.Oidc.AuthorizationRequestCount);
        Assert.Equal(0, harness.Oidc.TokenRequestCount);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Shutdown_cancels_an_in_flight_prewarm_and_attempt_budget_is_bounded()
    {
        Assert.Equal(
            TimeSpan.FromMilliseconds(450),
            OidcAuthorityPrewarmHostedService.CalculateAttemptBudget(new OidcAuthoritySecurityOptions
            {
                BackchannelTimeoutMilliseconds = 100,
            }));
        Assert.Equal(
            TimeSpan.FromSeconds(10),
            OidcAuthorityPrewarmHostedService.CalculateAttemptBudget(new OidcAuthoritySecurityOptions
            {
                BackchannelTimeoutMilliseconds = 5000,
            }));

        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(
            initialDiscoveryFault: ProtocolEndpointFault.Timeout);
        harness.ReleaseOidcPrewarm();
        await EventuallyAsync(
            () => Task.FromResult(harness.Oidc.DiscoveryRequestCount > 0),
            TimeSpan.FromSeconds(1));

        var stopwatch = Stopwatch.StartNew();
        using var shutdownBudget = new CancellationTokenSource(TimeSpan.FromSeconds(1));
        await harness.StopModuleAsync(shutdownBudget.Token);
        stopwatch.Stop();

        Assert.True(stopwatch.Elapsed < TimeSpan.FromSeconds(1));
    }

    private static async Task<HealthStatus> EventuallyReadinessAsync(
        CanonicalOidcProtocolHarness harness,
        HealthStatus expected,
        TimeSpan timeout)
    {
        var status = await harness.CheckOidcReadinessAsync();
        await EventuallyAsync(async () =>
        {
            status = await harness.CheckOidcReadinessAsync();
            return status == expected;
        }, timeout);
        return status;
    }

    private static async Task EventuallyAsync(Func<Task<bool>> condition, TimeSpan timeout)
    {
        var deadline = DateTimeOffset.UtcNow + timeout;
        do
        {
            if (await condition())
                return;
            await Task.Delay(TimeSpan.FromMilliseconds(25));
        }
        while (DateTimeOffset.UtcNow < deadline);

        Assert.Fail("The bounded prewarm condition was not observed before the deadline.");
    }
}
