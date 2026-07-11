using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Testcontainers.PostgreSql;
using Xunit;
using SpaceOS.Modules.QA.Application;
using SpaceOS.Modules.QA.Infrastructure;
using SpaceOS.Modules.QA.Infrastructure.Persistence;

namespace SpaceOS.Modules.QA.Tests.Integration.Api;

/// <summary>
/// API test fixture providing PostgreSQL Testcontainer and configured DI for integration tests.
/// Reuses DMS pattern with QA-specific configuration.
/// </summary>
public class ApiTestFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer;
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

        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "ConnectionStrings:QADatabase", _dbContainer.GetConnectionString() }
            })
            .Build();

        services.AddQAInfrastructure(configuration);
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(QADbContext).Assembly));

        services.AddHttpContextAccessor();
        services.AddScoped<ITenantContext>(provider =>
            new TestTenantContext(Guid.Parse("11111111-1111-1111-1111-111111111111")));

        _serviceProvider = services.BuildServiceProvider();
        DbContext = _serviceProvider.GetRequiredService<QADbContext>();
        await DbContext.Database.MigrateAsync().ConfigureAwait(false);

        Client = new HttpClient { BaseAddress = new Uri("http://localhost") };
        Client.DefaultRequestHeaders.Add("Authorization", $"Bearer {GenerateTestJwt()}");
        Client.DefaultRequestHeaders.Add("X-Tenant-Id", "11111111-1111-1111-1111-111111111111");
    }

    public async Task DisposeAsync()
    {
        if (_serviceProvider is IAsyncDisposable asyncDisposable)
        {
            await asyncDisposable.DisposeAsync().ConfigureAwait(false);
        }
        else if (_serviceProvider is IDisposable disposable)
        {
            disposable.Dispose();
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

/// <summary>
/// Mock ITenantContext for testing with fixed tenant ID.
/// </summary>
public class TestTenantContext : ITenantContext
{
    public Guid TenantId { get; }

    public TestTenantContext(Guid tenantId)
    {
        TenantId = tenantId;
    }
}
