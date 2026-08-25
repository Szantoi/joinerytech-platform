using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Options;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>Explicit composition of the Kernel-backed online authority provider.</summary>
public static class KernelOnlineIdentityAuthorityServiceCollectionExtensions
{
    /// <summary>
    /// Registers the source-ready Kernel provider with a host-owned service authenticator.
    /// </summary>
    /// <remarks>
    /// This method is the only activation path. <c>AddSpaceOsModuleAuth</c> does not call it,
    /// and the seven platform hosts intentionally do not opt in yet. The configuration still
    /// requires <c>Enabled=true</c> and is validated on host startup.
    /// </remarks>
    public static IServiceCollection AddKernelOnlineIdentityAuthorityStateProvider<TAuthenticator>(
        this IServiceCollection services,
        IConfiguration configuration)
        where TAuthenticator : class, IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddOptions<KernelOnlineIdentityAuthorityOptions>()
            .Bind(configuration.GetSection(KernelOnlineIdentityAuthorityOptions.SectionName))
            .ValidateOnStart();
        services.TryAddEnumerable(
            ServiceDescriptor.Singleton<
                IValidateOptions<KernelOnlineIdentityAuthorityOptions>,
                KernelOnlineIdentityAuthorityOptionsValidator>());

        services.TryAddSingleton(TimeProvider.System);
        services.AddMemoryCache();
        services.TryAddSingleton<KernelOnlineIdentityAuthorityRuntimeState>();
        services.TryAddSingleton<IKernelOnlineIdentityAuthorityObservability>(
            static serviceProvider => serviceProvider.GetRequiredService<KernelOnlineIdentityAuthorityRuntimeState>());

        services.TryAddTransient<TAuthenticator>();
        services.AddTransient<IKernelOnlineIdentityAuthorityServiceAuthenticator>(
            static serviceProvider => serviceProvider.GetRequiredService<TAuthenticator>());
        var httpClientBuilder = services
            .AddHttpClient<KernelOnlineIdentityAuthorityStateProvider>((serviceProvider, client) =>
            {
                var options = serviceProvider
                    .GetRequiredService<IOptions<KernelOnlineIdentityAuthorityOptions>>()
                    .Value;
                client.BaseAddress = KernelOnlineIdentityAuthorityEndpointPolicy.CreateBaseUri(options.BaseUrl!);
                // One linked CTS in the provider owns the complete <=1500 ms budget.
                client.Timeout = Timeout.InfiniteTimeSpan;
            })
            .ConfigurePrimaryHttpMessageHandler(serviceProvider =>
            {
                var options = serviceProvider
                    .GetRequiredService<IOptions<KernelOnlineIdentityAuthorityOptions>>()
                    .Value;
                var boundary = KernelOnlineIdentityAuthoritySendBoundaryHandler.Create(
                    options,
                    serviceProvider.GetRequiredService<IHostEnvironment>(),
                    serviceProvider.GetService<KernelOnlineIdentityAuthorityTestTransportOverride>());
                KernelOnlineIdentityAuthorityBuilderAttestation.Stamp(serviceProvider, boundary);
                return boundary;
            });
        EnsureFinalTransportBoundaryFilter(services, httpClientBuilder.Name);

        // Explicit registration wins regardless of whether the host called this before or after
        // AddSpaceOsModuleAuth. Without this method the existing default-deny provider remains.
        services.Replace(ServiceDescriptor.Transient<IOnlineIdentityAuthorityStateProvider>(
            static serviceProvider => serviceProvider.GetRequiredService<KernelOnlineIdentityAuthorityStateProvider>()));

        services.AddHealthChecks().AddCheck<KernelOnlineIdentityAuthorityReadinessHealthCheck>(
            "kernel-online-identity-authority",
            failureStatus: HealthStatus.Unhealthy,
            tags: ["ready"]);

        return services;
    }

    /// <summary>
    /// Installs an in-process transport only for the friend test assembly. The source-owned
    /// primary boundary independently enforces the exact test assembly and pinned Development
    /// endpoint before accepting this override.
    /// </summary>
    internal static IServiceCollection AddKernelOnlineIdentityAuthorityTestTransport(
        this IServiceCollection services,
        Func<HttpMessageHandler> handlerFactory)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(handlerFactory);

        services.Replace(ServiceDescriptor.Singleton(
            new KernelOnlineIdentityAuthorityTestTransportOverride(handlerFactory)));
        return services;
    }

    private static void EnsureFinalTransportBoundaryFilter(
        IServiceCollection services,
        string clientName)
    {
        if (services.Any(static descriptor =>
                descriptor.ServiceType == typeof(IHttpMessageHandlerBuilderFilter)
                && descriptor.ImplementationInstance
                    is KernelOnlineIdentityAuthorityHandlerBuilderFilter))
        {
            return;
        }

        // The factory composes filters in registration order. Position zero makes this filter's
        // post-step run last, after existing and subsequently appended filters/configuration.
        services.Insert(
            0,
            ServiceDescriptor.Singleton<IHttpMessageHandlerBuilderFilter>(
                new KernelOnlineIdentityAuthorityHandlerBuilderFilter(clientName)));
    }
}
