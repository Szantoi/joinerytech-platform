using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

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

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(jwt => ConfigureJwtBearer(jwt, options, environment));

        services.AddAuthorization();
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
        jwt.RequireHttpsMetadata = !environment.IsDevelopment();

        // Preserve JWT claim names as-is (e.g. "tid", "spaceos_tenants"). The default
        // MapInboundClaims=true would remap "tid" to the Microsoft tenantid URI and the
        // tenant resolver would silently break (kernel Program.cs:88 — not optional).
        jwt.MapInboundClaims = false;

        jwt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "preferred_username",
            RoleClaimType = ClaimTypes.Role,
        };

        jwt.Events = new JwtBearerEvents
        {
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                var problem = new
                {
                    type = "https://tools.ietf.org/html/rfc7235#section-3.1",
                    title = "Unauthorized",
                    status = 401,
                    detail = "A valid JWT Bearer token is required.",
                };
                // Explicit content type: WriteAsJsonAsync would otherwise stamp application/json
                // (latent kernel bug — noted in the ADR-IMPL-HOSTING task doc).
                return context.Response.WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json");
            },
            OnForbidden = context =>
            {
                context.Response.StatusCode = 403;
                var problem = new
                {
                    type = "https://tools.ietf.org/html/rfc7231#section-6.5.3",
                    title = "Forbidden",
                    status = 403,
                    detail = "Insufficient permissions for this operation.",
                };
                return context.Response.WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json");
            },
            OnTokenValidated = context =>
            {
                // Map Keycloak realm_access.roles → ClaimTypes.Role (kernel parity —
                // this is exactly the part the HR copy had silently lost).
                var realmAccess = context.Principal?.FindFirst("realm_access")?.Value;
                if (realmAccess is not null)
                {
                    try
                    {
                        var parsed = JsonDocument.Parse(realmAccess);
                        if (parsed.RootElement.TryGetProperty("roles", out var roles)
                            && context.Principal!.Identity is ClaimsIdentity identity)
                        {
                            foreach (var role in roles.EnumerateArray())
                            {
                                var roleName = role.GetString();
                                if (!string.IsNullOrEmpty(roleName))
                                    identity.AddClaim(new Claim(ClaimTypes.Role, roleName));
                            }
                        }
                    }
                    catch (JsonException)
                    {
                        // Malformed realm_access — leave the principal without realm roles;
                        // role-gated endpoints will 403 (kernel parity).
                    }
                }

                return Task.CompletedTask;
            },
        };
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

        services
            .AddAuthentication(DevelopmentAuthenticationHandler.SchemeName)
            .AddScheme<AuthenticationSchemeOptions, DevelopmentAuthenticationHandler>(
                DevelopmentAuthenticationHandler.SchemeName, static _ => { });

        services.AddAuthorization();
        return services;
    }
}
