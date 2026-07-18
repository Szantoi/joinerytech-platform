using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Testcontainers.PostgreSql;
using Xunit;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.QA.Api.Endpoints;
using SpaceOS.Modules.QA.Infrastructure;
using SpaceOS.Modules.QA.Infrastructure.Persistence;

namespace SpaceOS.Modules.QA.Tests.Integration.Api;

/// <summary>
/// Collection definition for the "QA API Tests" collection — without this the collection
/// had no fixture wiring and every test in it failed at discovery ("constructor parameters
/// did not have matching fixture data"), i.e. the API integration set never ran
/// (QA-INTEGRATION-FIX debt, repaired in ADR-IMPL-HOSTING).
/// </summary>
[CollectionDefinition("QA API Tests")]
public class QaApiTestCollection : ICollectionFixture<ApiTestFixture>
{
}

/// <summary>
/// API test fixture providing PostgreSQL Testcontainer and configured DI for integration tests.
/// Reuses DMS pattern with QA-specific configuration.
/// </summary>
public class ApiTestFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer;
    private IHost? _host;
    private IServiceProvider? _serviceProvider;
    public HttpClient? Client { get; private set; }
    public QADbContext? DbContext { get; private set; }

    public ApiTestFixture()
    {
        _dbContainer = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("qa_test")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync().ConfigureAwait(false);

        var configuration = new Dictionary<string, string?>
        {
            // Key repaired: AddQAInfrastructure reads ConnectionStrings:QA — the old
            // "QADatabase" key silently fell back to localhost (QA-INTEGRATION-FIX debt).
            { "ConnectionStrings:QA", _dbContainer.GetConnectionString() }
        };

        // Real TestServer host over the real database (DMS fixture precedent) — the old
        // fixture handed out a phantom HttpClient (http://localhost, no server behind it),
        // so every endpoint-driven test failed with connection refused.
        _host = await new HostBuilder()
            .ConfigureAppConfiguration(config => config.AddInMemoryCollection(configuration))
            .ConfigureWebHost(webBuilder => webBuilder
                .UseTestServer()
                .ConfigureServices((context, services) =>
                {
                    services.AddRouting();
                    services.AddLogging();
                    services.AddAuthentication(Tests.Api.TestAuthHandler.Scheme)
                        .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions,
                            Tests.Api.TestAuthHandler>(Tests.Api.TestAuthHandler.Scheme, _ => { });
                    services.AddAuthorization();
                    services.ConfigureHttpJsonOptions(options =>
                        options.SerializerOptions.Converters.Add(
                            new System.Text.Json.Serialization.JsonStringEnumConverter()));
                    services.AddQAInfrastructure(context.Configuration);
                    services.AddQAApplication();
                })
                .Configure(app =>
                {
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.UseSpaceOsModuleTenancy();
                    app.UseEndpoints(endpoints =>
                    {
                        endpoints.MapQACheckpointEndpoints();
                        endpoints.MapInspectionEndpoints();
                        endpoints.MapTicketEndpoints();
                        endpoints.MapQAMetricsEndpoints();
                    });
                }))
            .StartAsync()
            .ConfigureAwait(false);

        _serviceProvider = _host.Services;
        DbContext = _serviceProvider.GetRequiredService<QADbContext>();
        await DbContext.Database.MigrateAsync().ConfigureAwait(false);

        Client = _host.GetTestClient();
        Client.DefaultRequestHeaders.Add("Authorization", $"Bearer {GenerateTestJwt()}");
        Client.DefaultRequestHeaders.Add("X-Tenant-Id", "11111111-1111-1111-1111-111111111111");
    }

    public async Task DisposeAsync()
    {
        Client?.Dispose();
        if (_host is not null)
        {
            await _host.StopAsync().ConfigureAwait(false);
            _host.Dispose();
        }

        await _dbContainer.StopAsync().ConfigureAwait(false);
    }

    private static string GenerateTestJwt()
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("test-secret-key-that-is-at-least-32-characters-long-for-testing"));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim("tenant_id", "11111111-1111-1111-1111-111111111111"),
            new Claim(ClaimTypes.NameIdentifier, "test-user-id")
        };

        var token = new JwtSecurityToken(
            issuer: "test-issuer",
            audience: "test-audience",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
