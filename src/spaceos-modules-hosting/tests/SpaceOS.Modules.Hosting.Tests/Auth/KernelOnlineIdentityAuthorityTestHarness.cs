using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using SpaceOS.Modules.Hosting.Auth;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

internal sealed class KernelOnlineIdentityAuthorityTestHarness : IAsyncDisposable
{
    private KernelOnlineIdentityAuthorityTestHarness(
        TestServer server,
        ServiceProvider services)
    {
        Server = server;
        Services = services;
        Provider = services.GetRequiredService<IOnlineIdentityAuthorityStateProvider>();
    }

    internal TestServer Server { get; }

    internal ServiceProvider Services { get; }

    internal IOnlineIdentityAuthorityStateProvider Provider { get; }

    internal static KernelOnlineIdentityAuthorityTestHarness Create(
        RequestDelegate kernel,
        IReadOnlyDictionary<string, string?>? overrides = null,
        TimeProvider? timeProvider = null,
        Func<HttpMessageHandler>? primaryHandlerFactory = null,
        Action<HttpClient>? postConfigureClient = null,
        Action<IHttpClientBuilder>? postConfigureBuilder = null)
        => Create<TestServiceAuthenticator>(
            kernel,
            overrides,
            timeProvider,
            primaryHandlerFactory,
            postConfigureClient,
            postConfigureBuilder);

    internal static KernelOnlineIdentityAuthorityTestHarness Create<TAuthenticator>(
        RequestDelegate kernel,
        IReadOnlyDictionary<string, string?>? overrides = null,
        TimeProvider? timeProvider = null,
        Func<HttpMessageHandler>? primaryHandlerFactory = null,
        Action<HttpClient>? postConfigureClient = null,
        Action<IHttpClientBuilder>? postConfigureBuilder = null)
        where TAuthenticator : class, IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        var server = new TestServer(new WebHostBuilder().Configure(app => app.Run(kernel)));
        var values = ValidConfiguration();
        if (overrides is not null)
        {
            foreach (var pair in overrides)
                values[pair.Key] = pair.Value;
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
        var environment = new HostingEnvironment
        {
            EnvironmentName = Environments.Development,
            ApplicationName = KernelOnlineIdentityAuthoritySendBoundaryHandler.TestAssemblyName,
        };
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IHostEnvironment>(environment);
        if (timeProvider is not null)
            services.AddSingleton(timeProvider);
        services.AddKernelOnlineIdentityAuthorityStateProvider<TAuthenticator>(
            configuration);
        services.AddKernelOnlineIdentityAuthorityTestTransport(
            primaryHandlerFactory ?? (() => server.CreateHandler()));
        if (postConfigureClient is not null)
        {
            services.AddHttpClient<KernelOnlineIdentityAuthorityStateProvider>(postConfigureClient);
        }

        if (postConfigureBuilder is not null)
        {
            postConfigureBuilder(
                services.AddHttpClient<KernelOnlineIdentityAuthorityStateProvider>());
        }

        return new KernelOnlineIdentityAuthorityTestHarness(
            server,
            services.BuildServiceProvider(new ServiceProviderOptions
            {
                ValidateOnBuild = true,
                ValidateScopes = true,
            }));
    }

    internal static Dictionary<string, string?> ValidConfiguration()
        => new(StringComparer.Ordinal)
        {
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:Enabled"] = "true",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:BaseUrl"] =
                KernelOnlineIdentityAuthorityProtocol.DevelopmentLoopbackBaseUrl,
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:AllowDevelopmentLoopbackHttp"] = "true",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:ServiceAuthReference"] =
                "env://KERNEL_IDENTITY_AUTH_CERTIFICATE",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:TotalTimeoutMilliseconds"] = "500",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:AttemptTimeoutMilliseconds"] = "150",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:MaxAttempts"] = "2",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:RetryDelayMilliseconds"] = "5",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:CacheTtlMilliseconds"] = "0",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:MaxResponseBytes"] = "32768",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:ReadinessMaximumAgeSeconds"] = "60",
        };

    internal static string SuccessfulResponse(
        string subject,
        Guid tenantId,
        string module = "spaceos.crm",
        string permission = "spaceos.crm.admin",
        long membershipVersion = 1,
        long projectionVersion = 1,
        string tenantStatus = "active",
        string membershipStatus = "active",
        string cutoff = "2026-08-20T00:00:00Z")
        => JsonSerializer.Serialize(new
        {
            schemaVersion = KernelOnlineIdentityAuthorityProtocol.SchemaVersion,
            subject,
            tenantId = tenantId.ToString("D"),
            tenantStatus,
            membershipStatus,
            membershipVersion,
            projectionVersion,
            acceptTokensIssuedAtOrAfter = cutoff,
            permissions = new[] { permission },
            enabledModules = new[] { module },
        });

    internal static async Task WriteJsonAsync(
        HttpContext context,
        string json,
        int statusCode = StatusCodes.Status200OK)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(json, context.RequestAborted).ConfigureAwait(false);
    }

    public async ValueTask DisposeAsync()
    {
        await Services.DisposeAsync().ConfigureAwait(false);
        Server.Dispose();
    }

    internal sealed class TestServiceAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Assert.StartsWith("env://", serviceAuthReference, StringComparison.Ordinal);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
                "Bearer",
                "synthetic-service-proof");
            return ValueTask.CompletedTask;
        }
    }
}

internal sealed class ManualTimeProvider(DateTimeOffset initialUtc) : TimeProvider
{
    private DateTimeOffset _utcNow = initialUtc;

    public override DateTimeOffset GetUtcNow() => _utcNow;

    internal void Advance(TimeSpan duration) => _utcNow += duration;
}
