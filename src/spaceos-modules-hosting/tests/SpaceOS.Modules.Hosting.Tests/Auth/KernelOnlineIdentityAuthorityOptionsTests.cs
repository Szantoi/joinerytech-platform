using System.Net;
using System.Net.Sockets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.Hosting.Auth;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

public sealed class KernelOnlineIdentityAuthorityOptionsTests
{
    [Fact]
    public void Production_endpoint_pin_is_intentionally_unconfigured_and_fails_closed()
    {
        var result = Validator(Environments.Production).Validate(null, ValidOptions());

        Assert.True(result.Failed);
        Assert.Contains("source pin is intentionally unconfigured", string.Join(" ", result.Failures));
    }

    [Fact]
    public void Development_accepts_only_the_explicit_source_pinned_loopback_policy()
    {
        var options = ValidOptions();
        options.BaseUrl = KernelOnlineIdentityAuthorityProtocol.DevelopmentLoopbackBaseUrl;
        options.AllowDevelopmentLoopbackHttp = true;

        var result = Validator(
            Environments.Development,
            withTestTransport: true,
            applicationName: KernelOnlineIdentityAuthoritySendBoundaryHandler.TestAssemblyName).Validate(null, options);

        Assert.True(result.Succeeded);
    }

    [Theory]
    [InlineData("http://localhost:65535/")]
    [InlineData("http://127.0.0.1:65534/")]
    [InlineData("http://127.0.0.1:65535/kernel/")]
    [InlineData("https://127.0.0.1:65535/")]
    [InlineData("http://kernel.internal:65535/")]
    public void Development_rejects_every_non_pinned_scheme_host_port_or_path(string baseUrl)
    {
        var options = ValidOptions();
        options.BaseUrl = baseUrl;
        options.AllowDevelopmentLoopbackHttp = true;

        var result = Validator(
            Environments.Development,
            withTestTransport: true,
            applicationName: KernelOnlineIdentityAuthoritySendBoundaryHandler.TestAssemblyName).Validate(null, options);

        Assert.True(result.Failed);
        Assert.Contains("source-pinned", string.Join(" ", result.Failures), StringComparison.Ordinal);
    }

    [Fact]
    public void Development_loopback_clear_text_requires_an_explicit_opt_in()
    {
        var options = ValidOptions();
        options.BaseUrl = KernelOnlineIdentityAuthorityProtocol.DevelopmentLoopbackBaseUrl;

        var result = Validator(
            Environments.Development,
            withTestTransport: true,
            applicationName: KernelOnlineIdentityAuthoritySendBoundaryHandler.TestAssemblyName).Validate(null, options);

        Assert.True(result.Failed);
        Assert.Contains("explicit opt-in", string.Join(" ", result.Failures), StringComparison.Ordinal);
    }

    [Fact]
    public void Development_http_requires_the_actual_internal_test_transport_marker()
    {
        var options = ValidOptions();
        options.BaseUrl = KernelOnlineIdentityAuthorityProtocol.DevelopmentLoopbackBaseUrl;
        options.AllowDevelopmentLoopbackHttp = true;

        var result = Validator(
            Environments.Development,
            withTestTransport: false,
            applicationName: KernelOnlineIdentityAuthoritySendBoundaryHandler.TestAssemblyName).Validate(null, options);

        Assert.True(result.Failed);
        Assert.Contains("internal transport override", string.Join(" ", result.Failures), StringComparison.Ordinal);
    }

    [Fact]
    public void Spoofed_application_name_cannot_enable_the_internal_test_transport()
    {
        var options = ValidOptions();
        options.BaseUrl = KernelOnlineIdentityAuthorityProtocol.DevelopmentLoopbackBaseUrl;
        options.AllowDevelopmentLoopbackHttp = true;

        var result = Validator(
            Environments.Development,
            withTestTransport: true,
            applicationName: "SpaceOS.Modules.Hosting.Tests.Spoofed").Validate(null, options);

        Assert.True(result.Failed);
        Assert.Contains("exact friend test assembly", string.Join(" ", result.Failures), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("http://kernel.internal/", "HTTPS")]
    [InlineData("https://user@kernel.internal/", "userinfo")]
    [InlineData("https://kernel.internal/?target=other", "query")]
    [InlineData("https://kernel.internal/#fragment", "fragment")]
    public void Production_rejects_unsafe_base_urls(string baseUrl, string expectedMessage)
    {
        var options = ValidOptions();
        options.BaseUrl = baseUrl;

        var result = Validator(Environments.Production).Validate(null, options);

        Assert.True(result.Failed);
        Assert.Contains(expectedMessage, string.Join(" ", result.Failures), StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("raw-secret")]
    [InlineData("https://user:password@kernel.internal/")]
    [InlineData("env://KEY=value")]
    public void Inline_or_missing_service_credentials_are_rejected(string? reference)
    {
        var options = ValidOptions();
        options.ServiceAuthReference = reference;

        var result = Validator(Environments.Production).Validate(null, options);

        Assert.True(result.Failed);
        Assert.Contains("ServiceAuthReference", string.Join(" ", result.Failures), StringComparison.Ordinal);
    }

    [Fact]
    public void Disabled_registration_and_out_of_bounds_safety_values_are_rejected()
    {
        var options = ValidOptions();
        options.Enabled = false;
        options.TotalTimeoutMilliseconds = 1501;
        options.AttemptTimeoutMilliseconds = 1502;
        options.MaxAttempts = 3;
        options.RetryDelayMilliseconds = 251;
        options.CacheTtlMilliseconds = 2001;
        options.MaxResponseBytes = 65537;
        options.ReadinessMaximumAgeSeconds = 0;

        var result = Validator(Environments.Production).Validate(null, options);
        var failures = string.Join(" ", result.Failures ?? []);

        Assert.True(result.Failed);
        Assert.Contains("Enabled", failures, StringComparison.Ordinal);
        Assert.Contains("TotalTimeoutMilliseconds", failures, StringComparison.Ordinal);
        Assert.Contains("AttemptTimeoutMilliseconds", failures, StringComparison.Ordinal);
        Assert.Contains("MaxAttempts", failures, StringComparison.Ordinal);
        Assert.Contains("RetryDelayMilliseconds", failures, StringComparison.Ordinal);
        Assert.Contains("CacheTtlMilliseconds", failures, StringComparison.Ordinal);
        Assert.Contains("MaxResponseBytes", failures, StringComparison.Ordinal);
        Assert.Contains("ReadinessMaximumAgeSeconds", failures, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Invalid_production_options_fail_on_host_start_without_network()
    {
        var values = KernelOnlineIdentityAuthorityTestHarness.ValidConfiguration();
        values[$"{KernelOnlineIdentityAuthorityOptions.SectionName}:BaseUrl"] =
            "http://kernel.internal/";
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
        using var host = new HostBuilder()
            .UseEnvironment(Environments.Production)
            .ConfigureServices((context, services) =>
            {
                services.AddKernelOnlineIdentityAuthorityStateProvider<
                    KernelOnlineIdentityAuthorityTestHarness.TestServiceAuthenticator>(
                    configuration);
            })
            .Build();

        var exception = await Assert.ThrowsAsync<OptionsValidationException>(() =>
            host.StartAsync(CancellationToken.None));

        Assert.Contains("HTTPS", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Development_cleartext_without_internal_transport_fails_on_start_before_connect()
    {
        var listener = new TcpListener(IPAddress.Loopback, 65535);
        listener.Start(backlog: 1);
        using var acceptCancellation = new CancellationTokenSource();
        var acceptTask = listener.AcceptTcpClientAsync(acceptCancellation.Token).AsTask();
        try
        {
            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(KernelOnlineIdentityAuthorityTestHarness.ValidConfiguration())
                .Build();
            using var host = new HostBuilder()
                .ConfigureHostConfiguration(hostConfiguration =>
                    hostConfiguration.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        [HostDefaults.ApplicationKey] =
                            KernelOnlineIdentityAuthoritySendBoundaryHandler.TestAssemblyName,
                    }))
                .UseEnvironment(Environments.Development)
                .ConfigureServices((_, services) =>
                {
                    services.AddKernelOnlineIdentityAuthorityStateProvider<
                        KernelOnlineIdentityAuthorityTestHarness.TestServiceAuthenticator>(
                        configuration);
                })
                .Build();

            var exception = await Assert.ThrowsAsync<OptionsValidationException>(() =>
                host.StartAsync(CancellationToken.None));

            Assert.Contains("internal transport override", exception.Message, StringComparison.Ordinal);
            Assert.NotSame(
                acceptTask,
                await Task.WhenAny(acceptTask, Task.Delay(TimeSpan.FromMilliseconds(100))));
        }
        finally
        {
            acceptCancellation.Cancel();
            listener.Stop();
            try
            {
                using var unexpectedConnection = await acceptTask;
            }
            catch (OperationCanceledException)
            {
            }
            catch (SocketException)
            {
            }
            catch (ObjectDisposedException)
            {
            }
        }
    }

    [Fact]
    public void Development_cleartext_without_internal_transport_fails_on_provider_resolution()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(KernelOnlineIdentityAuthorityTestHarness.ValidConfiguration())
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IHostEnvironment>(new HostingEnvironment
        {
            EnvironmentName = Environments.Development,
            ApplicationName = KernelOnlineIdentityAuthoritySendBoundaryHandler.TestAssemblyName,
        });
        services.AddKernelOnlineIdentityAuthorityStateProvider<
            KernelOnlineIdentityAuthorityTestHarness.TestServiceAuthenticator>(
            configuration);
        using var provider = services.BuildServiceProvider();

        var exception = Assert.Throws<OptionsValidationException>(() =>
            provider.GetRequiredService<IOnlineIdentityAuthorityStateProvider>());

        Assert.Contains("internal transport override", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Runtime_sockets_transport_rejects_http_even_if_options_validation_is_bypassed()
    {
        var options = ValidOptions();
        options.BaseUrl = KernelOnlineIdentityAuthorityProtocol.DevelopmentLoopbackBaseUrl;
        options.AllowDevelopmentLoopbackHttp = true;
        var environment = new HostingEnvironment
        {
            EnvironmentName = Environments.Development,
            ApplicationName = KernelOnlineIdentityAuthoritySendBoundaryHandler.TestAssemblyName,
        };

        var exception = Assert.Throws<InvalidOperationException>(() =>
            KernelOnlineIdentityAuthoritySendBoundaryHandler.Create(
                options,
                environment,
                testTransport: null));

        Assert.Contains("HTTPS-only", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Spoofed_test_application_name_fails_on_start_even_with_internal_transport_marker()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(KernelOnlineIdentityAuthorityTestHarness.ValidConfiguration())
            .Build();
        using var host = new HostBuilder()
            .ConfigureHostConfiguration(hostConfiguration =>
                hostConfiguration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    [HostDefaults.ApplicationKey] = "SpaceOS.Modules.Hosting.Tests.Spoofed",
                }))
            .UseEnvironment(Environments.Development)
            .ConfigureServices((_, services) =>
            {
                services.AddKernelOnlineIdentityAuthorityStateProvider<
                    KernelOnlineIdentityAuthorityTestHarness.TestServiceAuthenticator>(
                    configuration);
                services.AddKernelOnlineIdentityAuthorityTestTransport(
                    static () => new HttpClientHandler());
            })
            .Build();

        var exception = await Assert.ThrowsAsync<OptionsValidationException>(() =>
            host.StartAsync(CancellationToken.None));

        Assert.Contains("exact friend test assembly", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Without_explicit_opt_in_existing_default_provider_remains_deny_all()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Authority"] = "https://issuer.test/realms/spaceos",
                ["Jwt:Audience"] = "crm-api",
                ["Jwt:AuthorizedParty"] = "portal-app",
            })
            .Build();
        var services = new ServiceCollection();
        services.AddSpaceOsModuleAuth(
            configuration,
            new HostingEnvironment { EnvironmentName = Environments.Production });
        using var provider = services.BuildServiceProvider();

        var authority = provider.GetRequiredService<IOnlineIdentityAuthorityStateProvider>();
        var state = await authority.GetCurrentAsync(
            "subject",
            Guid.Parse("11111111-2222-4333-8444-555555555555"),
            CancellationToken.None);

        Assert.Null(state);
        Assert.DoesNotContain(
            services,
            static descriptor => descriptor.ImplementationType == typeof(KernelOnlineIdentityAuthorityStateProvider));
    }

    [Fact]
    public void Explicit_opt_in_registers_the_Kernel_provider_but_does_not_call_it()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(KernelOnlineIdentityAuthorityTestHarness.ValidConfiguration())
            .Build();
        var environment = new HostingEnvironment
        {
            EnvironmentName = Environments.Development,
            ApplicationName = KernelOnlineIdentityAuthoritySendBoundaryHandler.TestAssemblyName,
        };
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IHostEnvironment>(environment);
        services.AddKernelOnlineIdentityAuthorityStateProvider<
            KernelOnlineIdentityAuthorityTestHarness.TestServiceAuthenticator>(
            configuration);
        services.AddKernelOnlineIdentityAuthorityTestTransport(
            static () => new HttpClientHandler());
        services.AddSpaceOsModuleAuth(
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Authority"] = "https://issuer.test/realms/spaceos",
                    ["Jwt:Audience"] = "crm-api",
                    ["Jwt:AuthorizedParty"] = "portal-app",
                })
                .Build(),
            environment);
        using var provider = services.BuildServiceProvider();

        var authority = provider.GetRequiredService<IOnlineIdentityAuthorityStateProvider>();

        Assert.IsType<KernelOnlineIdentityAuthorityStateProvider>(authority);
    }

    [Fact]
    public void Explicit_opt_in_after_auth_registration_wins_over_the_default_deny_provider()
    {
        var environment = new HostingEnvironment
        {
            EnvironmentName = Environments.Development,
            ApplicationName = KernelOnlineIdentityAuthoritySendBoundaryHandler.TestAssemblyName,
        };
        var authConfiguration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Authority"] = "https://issuer.test/realms/spaceos",
                ["Jwt:Audience"] = "crm-api",
                ["Jwt:AuthorizedParty"] = "portal-app",
            })
            .Build();
        var kernelConfiguration = new ConfigurationBuilder()
            .AddInMemoryCollection(KernelOnlineIdentityAuthorityTestHarness.ValidConfiguration())
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IHostEnvironment>(environment);
        services.AddSpaceOsModuleAuth(authConfiguration, environment);
        services.AddKernelOnlineIdentityAuthorityStateProvider<
            KernelOnlineIdentityAuthorityTestHarness.TestServiceAuthenticator>(
            kernelConfiguration);
        services.AddKernelOnlineIdentityAuthorityTestTransport(
            static () => new HttpClientHandler());
        using var provider = services.BuildServiceProvider();

        Assert.IsType<KernelOnlineIdentityAuthorityStateProvider>(
            provider.GetRequiredService<IOnlineIdentityAuthorityStateProvider>());
    }

    private static KernelOnlineIdentityAuthorityOptions ValidOptions()
        => new()
        {
            Enabled = true,
            BaseUrl = "https://kernel.internal/",
            ServiceAuthReference = "vault://joinerytech/kernel-authority-client",
            TotalTimeoutMilliseconds = 1500,
            AttemptTimeoutMilliseconds = 600,
            MaxAttempts = 2,
            RetryDelayMilliseconds = 50,
            CacheTtlMilliseconds = 0,
            MaxResponseBytes = 32768,
            ReadinessMaximumAgeSeconds = 60,
        };

    private static KernelOnlineIdentityAuthorityOptionsValidator Validator(
        string environmentName,
        bool withTestTransport = false,
        string? applicationName = null)
        => new(
            new HostingEnvironment
            {
                EnvironmentName = environmentName,
                ApplicationName = applicationName ?? string.Empty,
            },
            withTestTransport
                ? new KernelOnlineIdentityAuthorityTestTransportOverride(
                    static () => new HttpClientHandler())
                : null);
}
