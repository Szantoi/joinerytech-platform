namespace SpaceOS.Modules.Kontrolling.Host;

using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

/// <summary>
/// An authentication scheme for LOCAL DEVELOPMENT ONLY that authenticates
/// every caller.
/// </summary>
/// <remarks>
/// <para>
/// WHY THIS EXISTS. The module endpoints call <c>RequireAuthorization()</c>
/// (the EHS/QA/Maintenance precedent), but the platform has no shared
/// authentication wiring for module hosts yet — no module registers a scheme,
/// and the kernel ships no handler. Without any scheme registered, every
/// request fails with "No authenticationScheme was specified", so the host
/// could not be run or demoed at all.
/// </para>
/// <para>
/// This does NOT decide the platform's authentication story — choosing that
/// (Keycloak/JWT bearer, shared across all module hosts) is an open decision
/// recorded in the task doc. It only unblocks local development.
/// </para>
/// <para>
/// SAFETY: <see cref="AddDevelopmentAuthentication"/> throws unless the host is
/// in the Development environment, so this scheme cannot be deployed by
/// accident.
/// </para>
/// </remarks>
public sealed class DevelopmentAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    /// <summary>Name of the development scheme.</summary>
    public const string SchemeName = "Development";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, "development-user")], SchemeName);

        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}

/// <summary>Registration of the development-only authentication scheme.</summary>
public static class DevelopmentAuthenticationExtensions
{
    /// <summary>
    /// Registers the permissive development scheme.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// The host is not in the Development environment. Deliberately fatal: a
    /// scheme that authenticates everyone must never start outside development.
    /// </exception>
    public static IServiceCollection AddDevelopmentAuthentication(
        this IServiceCollection services,
        IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
        {
            throw new InvalidOperationException(
                "The Development authentication scheme authenticates every caller and must " +
                $"not run in the '{environment.EnvironmentName}' environment. Configure real " +
                "authentication for this host before deploying it.");
        }

        services
            .AddAuthentication(DevelopmentAuthenticationHandler.SchemeName)
            .AddScheme<AuthenticationSchemeOptions, DevelopmentAuthenticationHandler>(
                DevelopmentAuthenticationHandler.SchemeName, _ => { });

        return services;
    }
}
