using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using SpaceOS.Modules.Hosting.Authorization;
using SpaceOS.Modules.Hosting.Auth;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

/// <summary>
/// Fail-fast contract of <see cref="SpaceOsModuleAuthExtensions.AddSpaceOsModuleAuth"/>:
/// a misconfigured host must refuse to start (ADR-061) — never boot unprotected, and never
/// reproduce the CRM "scheme-less AddAuthentication" bug.
/// </summary>
public sealed class AuthRegistrationTests
{
    private static IConfiguration Config(params (string Key, string? Value)[] pairs)
        => new ConfigurationBuilder()
            .AddInMemoryCollection(pairs.Select(p => new KeyValuePair<string, string?>(p.Key, p.Value)))
            .Build();

    private static IHostEnvironment Environment(string name)
        => new HostingEnvironment { EnvironmentName = name };

    [Fact]
    public void Missing_Jwt_section_throws()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(Config(), Environment("Production")));

        Assert.Contains("Missing 'Jwt' configuration section", exception.Message);
    }

    [Fact]
    public void Missing_Authority_throws()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(
                Config(("Jwt:Audience", "ehs-api")), Environment("Production")));

        Assert.Contains("Jwt:Authority", exception.Message);
    }

    [Fact]
    public void Missing_Audience_throws()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(
                Config(("Jwt:Authority", "https://joinerytech.hu/auth/realms/spaceos")),
                Environment("Production")));

        Assert.Contains("Jwt:Audience", exception.Message);
    }

    [Fact]
    public void Missing_AuthorizedParty_throws()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(
                Config(
                    ("Jwt:Authority", "https://joinerytech.hu/auth/realms/spaceos"),
                    ("Jwt:Audience", "ehs-api")),
                Environment("Production")));

        Assert.Contains("Jwt:AuthorizedParty", exception.Message);
    }

    [Fact]
    public void Unsupported_Jose_token_type_throws()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(
                Config(
                    ("Jwt:Authority", "https://joinerytech.hu/auth/realms/spaceos"),
                    ("Jwt:Audience", "ehs-api"),
                    ("Jwt:AuthorizedParty", "portal-app"),
                    ("Jwt:TokenType", "Bearer")),
                Environment("Production")));

        Assert.Contains("Jwt:TokenType", exception.Message);
    }

    [Fact]
    public void Unsupported_access_token_payload_type_throws()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(
                Config(
                    ("Jwt:Authority", "https://joinerytech.hu/auth/realms/spaceos"),
                    ("Jwt:Audience", "ehs-api"),
                    ("Jwt:AuthorizedParty", "portal-app"),
                    ("Jwt:AccessTokenPayloadType", "ID")),
                Environment("Production")));

        Assert.Contains("Jwt:AccessTokenPayloadType", exception.Message);
    }

    [Fact]
    public void Unknown_mode_throws()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(
                Config(("Jwt:Mode", "Anonymous")), Environment("Production")));

        Assert.Contains("Unknown Jwt:Mode", exception.Message);
    }

    [Fact]
    public void Development_mode_outside_Development_environment_throws()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(
                Config(
                    ("Jwt:Mode", "Development"),
                    ("Jwt:Development:TenantId", Guid.NewGuid().ToString())),
                Environment("Production")));

        Assert.Contains("must not run in the 'Production' environment", exception.Message);
    }

    [Fact]
    public void Development_mode_without_tenant_throws()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(
                Config(("Jwt:Mode", "Development")), Environment("Development")));

        Assert.Contains("Jwt:Development:TenantId", exception.Message);
    }

    [Fact]
    public void Keycloak_mode_with_development_entitlements_throws()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(
                Config(
                    ("Jwt:Authority", "https://joinerytech.hu/auth/realms/spaceos"),
                    ("Jwt:Audience", "maintenance-api"),
                    ("Jwt:Development:EnabledModules:0", "spaceos.maintenance")),
                Environment("Production")));

        Assert.Contains("Jwt:Development:EnabledModules", exception.Message);
    }

    [Fact]
    public void Valid_Keycloak_configuration_registers_authentication()
    {
        var services = new ServiceCollection();

        services.AddSpaceOsModuleAuth(
            Config(
                ("Jwt:Authority", "https://joinerytech.hu/auth/realms/spaceos"),
                ("Jwt:Audience", "ehs-api"),
                ("Jwt:AuthorizedParty", "portal-app")),
            Environment("Production"));

        Assert.Contains(services, static d =>
            d.ServiceType == typeof(Microsoft.AspNetCore.Authentication.IAuthenticationService));
        Assert.Contains(services, static d =>
            d.ServiceType == typeof(IOnlineIdentityAuthorityStateProvider));
    }

    [Fact]
    public void Module_policy_registers_its_own_http_context_accessor()
    {
        var services = new ServiceCollection();

        services.AddRequiredEnabledModulePolicy("spaceos.maintenance");

        using var provider = services.BuildServiceProvider();
        Assert.NotNull(provider.GetService<IHttpContextAccessor>());
    }

    [Theory]
    [InlineData("spaceos.maintenance-")]
    [InlineData("spaceos.maint--enance")]
    [InlineData("spaceos.-maintenance")]
    public void Module_policy_rejects_noncanonical_module_id_shapes(string moduleId)
    {
        var exception = Assert.Throws<ArgumentException>(() =>
            new ServiceCollection().AddRequiredEnabledModulePolicy(moduleId));

        Assert.Equal("moduleId", exception.ParamName);
    }
}
