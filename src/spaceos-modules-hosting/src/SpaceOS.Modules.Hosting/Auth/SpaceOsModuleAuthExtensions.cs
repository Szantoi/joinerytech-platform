using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// The shared module-host authentication wiring (ADR-061): one Keycloak JWT bearer
/// configuration for all seven JoineryTech module hosts, with the kernel as reference
/// implementation — not as a dependency.
/// </summary>
public static class SpaceOsModuleAuthExtensions
{
    /// <summary>
    /// Registers authentication + authorization for a module host from the <c>Jwt</c>
    /// configuration section. Fail-fast: missing or inconsistent configuration throws at
    /// startup instead of leaving the host unprotected or unusable (the CRM
    /// "AddAuthentication() without a scheme" class of bug cannot recur).
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The host configuration (must contain the <c>Jwt</c> section).</param>
    /// <param name="environment">The host environment (drives HTTPS metadata + Development-mode guard).</param>
    /// <returns>The same service collection, for chaining.</returns>
    /// <exception cref="InvalidOperationException">
    /// The <c>Jwt</c> section is missing, the mode is unknown, Keycloak mode lacks
    /// Authority/Audience, or Development mode is requested outside the Development environment.
    /// </exception>
    public static IServiceCollection AddSpaceOsModuleAuth(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(environment);

        var section = configuration.GetSection(SpaceOsModuleAuthOptions.SectionName);
        var options = section.Get<SpaceOsModuleAuthOptions>()
            ?? throw new InvalidOperationException(
                "Missing 'Jwt' configuration section. Module hosts must configure Jwt:Authority + " +
                "Jwt:Audience (Keycloak mode) or Jwt:Mode=Development for local runs (ADR-061).");

        services.Configure<SpaceOsModuleAuthOptions>(section);

        if (string.Equals(options.Mode, SpaceOsModuleAuthOptions.DevelopmentMode, StringComparison.OrdinalIgnoreCase))
            return AddDevelopmentScheme(services, options, environment);

        if (!string.Equals(options.Mode, SpaceOsModuleAuthOptions.KeycloakMode, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Unknown Jwt:Mode '{options.Mode}'. Supported values: " +
                $"'{SpaceOsModuleAuthOptions.KeycloakMode}' (default), '{SpaceOsModuleAuthOptions.DevelopmentMode}'.");
        }

        // Development entitlements must never be silently accepted by the real JWT
        // scheme. A typo in Jwt:Mode must stop the host before it serves a principal
        // whose local module grants could be mistaken for production configuration.
        if (section.GetSection("Development").GetSection("EnabledModules").Exists())
        {
            throw new InvalidOperationException(
                "Jwt:Development:EnabledModules is only valid when Jwt:Mode=Development. " +
                "Remove the development entitlement configuration before using Keycloak mode.");
        }

        if (string.IsNullOrWhiteSpace(options.Authority))
        {
            throw new InvalidOperationException(
                "Jwt:Authority is not configured. Use the platform authority " +
                "(e.g. https://joinerytech.hu/auth/realms/spaceos) — ADR-061.");
        }

        if (string.IsNullOrWhiteSpace(options.Audience))
        {
            throw new InvalidOperationException(
                "Jwt:Audience is not configured. Each module host has its own audience " +
                "(e.g. 'ehs-api', 'qa-api') — ADR-061.");
        }

        if (string.IsNullOrWhiteSpace(options.AuthorizedParty))
        {
            throw new InvalidOperationException(
                "Jwt:AuthorizedParty is not configured. Pin the exact OIDC azp client id; " +
                "wildcard or inferred browser clients are not accepted.");
        }

        if (options.TokenType is not ("JWT" or "at+jwt"))
        {
            throw new InvalidOperationException(
                "Jwt:TokenType must be the exact Keycloak JOSE header type 'JWT' or the RFC 9068 type 'at+jwt'.");
        }

        if (!string.Equals(options.AccessTokenPayloadType, "Bearer", StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "Jwt:AccessTokenPayloadType must be the exact Keycloak access-token payload typ 'Bearer'.");
        }

        ValidateOidcAuthoritySecurityOptions(options.OidcAuthority);

        services.TryAddSingleton<IOnlineIdentityAuthorityStateProvider,
            DefaultDenyOnlineIdentityAuthorityStateProvider>();
        services.RemoveAll<OidcAuthorityClock>();
        services.AddSingleton(serviceProvider => new OidcAuthorityClock(
            options.Authority!,
            environment,
            serviceProvider.GetService<OidcAuthorityTestClockOverride>()));
        // The online cutoff check must use this source-owned clock; a host-provided validator
        // instance must not replace that security boundary.
        services.RemoveAll<CanonicalOidcAccessTokenValidator>();
        services.AddSingleton(static serviceProvider => new CanonicalOidcAccessTokenValidator(
            serviceProvider.GetRequiredService<OidcAuthorityClock>()));
        services.RemoveAll<OidcAuthorityRuntimeState>();
        services.AddSingleton(serviceProvider => new OidcAuthorityRuntimeState(
            serviceProvider.GetRequiredService<OidcAuthorityClock>()));
        services.RemoveAll<StrictOidcConfigurationManager>();
        services.AddSingleton(serviceProvider => new StrictOidcConfigurationManager(
            options.Authority!.TrimEnd('/') + "/.well-known/openid-configuration",
            options.Authority,
            options.OidcAuthority,
            serviceProvider.GetRequiredService<OidcAuthorityRuntimeState>(),
            environment,
            serviceProvider.GetService<OidcAuthorityTestTransportOverride>()));
        services.RemoveAll<OidcJwtBearerRuntimeAttestation>();
        services.AddSingleton(serviceProvider => new OidcJwtBearerRuntimeAttestation(
            serviceProvider.GetRequiredService<StrictOidcConfigurationManager>(),
            options,
            requireHttpsMetadata: !environment.IsDevelopment()));
        services.TryAddSingleton<IOidcAuthorityPrewarmStartGate,
            ImmediateOidcAuthorityPrewarmStartGate>();
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IHostedService,
            OidcAuthorityPrewarmHostedService>());

        services.TryAddEnumerable(ServiceDescriptor.Singleton<IPostConfigureOptions<JwtBearerOptions>,
            JwtBearerPostConfigureOptions>());
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddScheme<JwtBearerOptions, SourceOwnedJwtBearerHandler>(
                JwtBearerDefaults.AuthenticationScheme,
                displayName: null,
                jwt => ConfigureJwtBearer(jwt, options, environment));
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .PostConfigure<OidcJwtBearerRuntimeAttestation>(
                static (jwt, runtimeAttestation) => runtimeAttestation.ConfigureAndSeal(jwt));

        services.AddAuthorization();
        services.AddHealthChecks().AddCheck<OidcAuthorityReadinessHealthCheck>(
            "oidc-authority",
            failureStatus: HealthStatus.Unhealthy,
            tags: ["ready"]);
        return services;
    }

    /// <summary>
    /// The kernel-reference JWT bearer block (<c>SpaceOS.Kernel.Api/Program.cs</c> KC-T1):
    /// authority-based JWKS, preserved claim names, ProblemDetails 401/403 and Keycloak
    /// realm-role mapping. Kept in one place so the seven hosts can never drift again
    /// (the HR copy had already lost the role mapping and the ProblemDetails responses).
    /// </summary>
    private static void ConfigureJwtBearer(
        JwtBearerOptions jwt,
        SpaceOsModuleAuthOptions options,
        IHostEnvironment environment)
    {
        jwt.Authority = options.Authority;
        jwt.Audience = options.Audience;
        jwt.MetadataAddress = options.Authority!.TrimEnd('/') + "/.well-known/openid-configuration";
        jwt.RequireHttpsMetadata = !environment.IsDevelopment();
        jwt.BackchannelTimeout = TimeSpan.FromMilliseconds(
            options.OidcAuthority.BackchannelTimeoutMilliseconds);
        jwt.RefreshInterval = TimeSpan.FromSeconds(options.OidcAuthority.RefreshIntervalSeconds);
        jwt.AutomaticRefreshInterval = TimeSpan.FromMinutes(
            options.OidcAuthority.AutomaticRefreshIntervalMinutes);
        jwt.RefreshOnIssuerKeyNotFound = true;

        // Preserve canonical JWT claim names as-is. MapInboundClaims=true aliases standard
        // names and would make the exact native projection differ between consumers.
        jwt.MapInboundClaims = false;

    }

    private static void ValidateOidcAuthoritySecurityOptions(OidcAuthoritySecurityOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        if (options.BackchannelTimeoutMilliseconds is < 100 or > 5000
            || options.RefreshIntervalSeconds is < 1 or > 300
            || options.AutomaticRefreshIntervalMinutes is < 5 or > 60
            || options.MaximumConfigurationAgeSeconds is < 5 or > 3600
            || options.MaximumConfigurationAgeSeconds < 2 * options.RefreshIntervalSeconds
            || options.MaximumDocumentBytes is < 4096 or > 262144
            || options.MaximumSigningKeys is < 1 or > 32)
        {
            throw new InvalidOperationException(
                "Jwt:OidcAuthority security bounds are invalid. Timeout, refresh, maximum age, " +
                "document size and signing-key count must remain inside the source-reviewed limits.");
        }
    }

    /// <summary>
    /// Registers the development-only permissive scheme (kontrolling precedent, lifted into
    /// the package per ADR-061). Deliberately fatal outside Development.
    /// </summary>
    private static IServiceCollection AddDevelopmentScheme(
        IServiceCollection services,
        SpaceOsModuleAuthOptions options,
        IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
        {
            throw new InvalidOperationException(
                "Jwt:Mode=Development authenticates every caller and must not run in the " +
                $"'{environment.EnvironmentName}' environment. Configure Keycloak (Jwt:Authority + " +
                "Jwt:Audience) before deploying this host.");
        }

        if (options.Development.TenantId is not { } tenantId || tenantId == Guid.Empty)
        {
            throw new InvalidOperationException(
                "Jwt:Development:TenantId is required in Development mode — the synthetic identity " +
                "must carry a real tenant so the tenancy pipeline behaves exactly like production.");
        }

        if (options.Development.EnabledModules.Any(module => !TenantResolver.IsAllowedAuthorityModuleId(module))
            || options.Development.EnabledModules.Distinct(StringComparer.Ordinal).Count()
               != options.Development.EnabledModules.Length)
        {
            throw new InvalidOperationException(
                "Jwt:Development:EnabledModules must contain unique canonical module identifiers.");
        }

        services
            .AddAuthentication(DevelopmentAuthenticationHandler.SchemeName)
            .AddScheme<AuthenticationSchemeOptions, DevelopmentAuthenticationHandler>(
                DevelopmentAuthenticationHandler.SchemeName, static _ => { });

        services.AddAuthorization();
        return services;
    }
}
