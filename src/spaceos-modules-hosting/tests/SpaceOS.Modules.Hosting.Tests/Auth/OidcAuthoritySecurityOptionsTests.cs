using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using SpaceOS.Modules.Hosting.Auth;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

public sealed class OidcAuthoritySecurityOptionsTests
{
    [Fact]
    public void Defaults_are_source_pinned()
    {
        var options = new OidcAuthoritySecurityOptions();

        Assert.Equal(1500, options.BackchannelTimeoutMilliseconds);
        Assert.Equal(30, options.RefreshIntervalSeconds);
        Assert.Equal(5, options.AutomaticRefreshIntervalMinutes);
        Assert.Equal(600, options.MaximumConfigurationAgeSeconds);
        Assert.Equal(64 * 1024, options.MaximumDocumentBytes);
        Assert.Equal(16, options.MaximumSigningKeys);
    }

    [Theory]
    [InlineData("BackchannelTimeoutMilliseconds", "99")]
    [InlineData("BackchannelTimeoutMilliseconds", "5001")]
    [InlineData("RefreshIntervalSeconds", "0")]
    [InlineData("RefreshIntervalSeconds", "301")]
    [InlineData("AutomaticRefreshIntervalMinutes", "4")]
    [InlineData("AutomaticRefreshIntervalMinutes", "61")]
    [InlineData("MaximumConfigurationAgeSeconds", "4")]
    [InlineData("MaximumConfigurationAgeSeconds", "3601")]
    [InlineData("MaximumDocumentBytes", "4095")]
    [InlineData("MaximumDocumentBytes", "262145")]
    [InlineData("MaximumSigningKeys", "0")]
    [InlineData("MaximumSigningKeys", "33")]
    public void Security_values_outside_source_reviewed_bounds_fail_registration(
        string option,
        string value)
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(
                Configuration((option, value)),
                ProductionEnvironment()));

        Assert.Contains("security bounds are invalid", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Maximum_configuration_age_cannot_be_shorter_than_refresh_interval()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            new ServiceCollection().AddSpaceOsModuleAuth(
                Configuration(
                    ("RefreshIntervalSeconds", "60"),
                    ("MaximumConfigurationAgeSeconds", "30")),
                ProductionEnvironment()));

        Assert.Contains("security bounds are invalid", exception.Message, StringComparison.Ordinal);
    }

    private static IConfiguration Configuration(params (string Option, string Value)[] overrides)
    {
        var values = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["Jwt:Mode"] = SpaceOsModuleAuthOptions.KeycloakMode,
            ["Jwt:Authority"] = "https://identity.example.test/realms/spaceos",
            ["Jwt:Audience"] = "maintenance-api",
            ["Jwt:AuthorizedParty"] = "portal-app",
        };
        foreach (var (option, value) in overrides)
            values[$"Jwt:OidcAuthority:{option}"] = value;

        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    private static IHostEnvironment ProductionEnvironment()
        => new HostingEnvironment { EnvironmentName = Environments.Production };
}
