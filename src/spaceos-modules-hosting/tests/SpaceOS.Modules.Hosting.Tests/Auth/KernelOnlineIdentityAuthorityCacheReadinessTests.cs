using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.Hosting.Auth;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

public sealed partial class KernelOnlineIdentityAuthorityStateProviderTests
{
    [Fact]
    public async Task Same_subject_resolves_two_tenants_without_cross_scope_state()
    {
        var calls = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
        {
            Interlocked.Increment(ref calls);
            using var request = await System.Text.Json.JsonDocument.ParseAsync(
                context.Request.Body,
                cancellationToken: context.RequestAborted).ConfigureAwait(false);
            var tenantId = request.RootElement.GetProperty("tenantId").GetGuid();
            var response = tenantId == TenantA
                ? KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA)
                : KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(
                    Subject,
                    TenantB,
                    "spaceos.ehs",
                    "spaceos.ehs.view",
                    membershipVersion: 7,
                    projectionVersion: 9);
            await KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(context, response)
                .ConfigureAwait(false);
        }, new Dictionary<string, string?>
        {
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:CacheTtlMilliseconds"] = "2000",
        });

        var tenantA = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);
        var tenantB = await harness.Provider.GetCurrentAsync(Subject, TenantB, CancellationToken.None);
        var cachedTenantA = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);

        Assert.NotNull(tenantA);
        Assert.NotNull(tenantB);
        Assert.Equal(TenantA, tenantA.TenantId);
        Assert.Equal(TenantB, tenantB.TenantId);
        Assert.Equal(new[] { "spaceos.crm" }, tenantA.EnabledModules);
        Assert.Equal(new[] { "spaceos.ehs" }, tenantB.EnabledModules);
        Assert.Equal(7, tenantB.MembershipVersion);
        Assert.Equal(9, tenantB.ProjectionVersion);
        Assert.Equal(TenantA, cachedTenantA?.TenantId);
        Assert.Equal(2, calls);
    }

    [Fact]
    public async Task Cache_is_disabled_by_default()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
        {
            var version = Interlocked.Increment(ref attempts);
            await KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(
                context,
                KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(
                    Subject,
                    TenantA,
                    membershipVersion: version))
                .ConfigureAwait(false);
        });

        var first = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);
        var second = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);

        Assert.Equal(1, first?.MembershipVersion);
        Assert.Equal(2, second?.MembershipVersion);
        Assert.Equal(2, attempts);
    }

    [Fact]
    public async Task Cached_authority_collections_are_defensive_and_immutable()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
        {
            Interlocked.Increment(ref attempts);
            await KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(
                context,
                KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA))
                .ConfigureAwait(false);
        }, new Dictionary<string, string?>
        {
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:CacheTtlMilliseconds"] = "2000",
        });

        var first = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);
        var permissions = Assert.IsAssignableFrom<IList<string>>(first?.Permissions);
        var modules = Assert.IsAssignableFrom<IList<string>>(first?.EnabledModules);

        Assert.Throws<NotSupportedException>(() => permissions[0] = "spaceos.ehs.admin");
        Assert.Throws<NotSupportedException>(() => modules.Add("spaceos.ehs"));

        var cached = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);
        Assert.Equal(new[] { "spaceos.crm.admin" }, cached?.Permissions);
        Assert.Equal(new[] { "spaceos.crm" }, cached?.EnabledModules);
        Assert.Equal(1, attempts);
    }

    [Fact]
    public async Task Expired_cache_is_never_used_after_online_timeout()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
        {
            if (Interlocked.Increment(ref attempts) == 1)
            {
                await KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(
                    context,
                    KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA))
                    .ConfigureAwait(false);
                return;
            }

            await Task.Delay(TimeSpan.FromSeconds(5), context.RequestAborted).ConfigureAwait(false);
        }, new Dictionary<string, string?>
        {
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:CacheTtlMilliseconds"] = "20",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:MaxAttempts"] = "1",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:TotalTimeoutMilliseconds"] = "80",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:AttemptTimeoutMilliseconds"] = "40",
        });

        var first = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);
        Assert.NotNull(first);
        await Task.Delay(40);

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.Timeout, exception.Outcome);
        Assert.Equal(2, attempts);
        Assert.Equal(
            KernelOnlineIdentityAuthorityOutcome.Timeout,
            harness.Services.GetRequiredService<IKernelOnlineIdentityAuthorityObservability>()
                .GetSnapshot().LastOutcome);
    }

    [Fact]
    public async Task Readiness_tracks_success_failure_and_freshness_without_active_probe()
    {
        var calls = 0;
        var clock = new ManualTimeProvider(DateTimeOffset.Parse("2026-08-20T10:00:00Z"));
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
        {
            if (Interlocked.Increment(ref calls) == 1)
            {
                await KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(
                    context,
                    KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA))
                    .ConfigureAwait(false);
                return;
            }

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        }, new Dictionary<string, string?>
        {
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:MaxAttempts"] = "1",
        }, clock);
        var health = new KernelOnlineIdentityAuthorityReadinessHealthCheck(
            harness.Services.GetRequiredService<IKernelOnlineIdentityAuthorityObservability>(),
            harness.Services.GetRequiredService<IOptions<KernelOnlineIdentityAuthorityOptions>>(),
            clock);
        var context = new HealthCheckContext();

        Assert.Equal(HealthStatus.Unhealthy, (await health.CheckHealthAsync(context)).Status);
        await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);
        Assert.Equal(HealthStatus.Healthy, (await health.CheckHealthAsync(context)).Status);

        clock.Advance(TimeSpan.FromSeconds(61));
        Assert.Equal(HealthStatus.Unhealthy, (await health.CheckHealthAsync(context)).Status);

        await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));
        Assert.Equal(HealthStatus.Unhealthy, (await health.CheckHealthAsync(context)).Status);
    }
}
