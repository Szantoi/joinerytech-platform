using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using SpaceOS.Modules.HR.Application.Contracts;
using SpaceOS.Modules.HR.Infrastructure;
using SpaceOS.Modules.HR.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Integration.Api;

/// <summary>
/// Test fixture for HR API integration tests.
/// Provides PostgreSQL container and configured DbContext for testing.
/// Pattern reused from DMS Week 4 API Layer.
/// </summary>
public class ApiTestFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer;
    private IServiceProvider? _serviceProvider;
    public HttpClient? Client { get; private set; }
    public HRDbContext? DbContext { get; private set; }

    public ApiTestFixture()
    {
        _dbContainer = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("hr_test")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
    }

    public async Task InitializeAsync()
    {
        // Start PostgreSQL container
        await _dbContainer.StartAsync().ConfigureAwait(false);

        // Setup DI container
        var services = new ServiceCollection();

        // Configuration
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "ConnectionStrings:HRDatabase", _dbContainer.GetConnectionString() }
            })
            .Build();

        // Register HR infrastructure
        services.AddHRInfrastructure(configuration);

        // Add MediatR with validation behavior
        // Note: HR Application commands/queries are in the same assembly as DbContext
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(HRDbContext).Assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        // Note: Validators are auto-registered by MediatR from the HR.Application assembly

        // Add HTTP context accessor
        services.AddHttpContextAccessor();

        // Register mock tenant context
        services.AddScoped<ITenantContext>(provider =>
            new TestTenantContext(Guid.Parse("11111111-1111-1111-1111-111111111111")));

        _serviceProvider = services.BuildServiceProvider();

        // Get DbContext
        DbContext = _serviceProvider.GetRequiredService<HRDbContext>();

        // Apply migrations
        await DbContext.Database.MigrateAsync().ConfigureAwait(false);

        // Create HTTP client for API testing
        Client = new HttpClient { BaseAddress = new Uri("http://localhost") };

        // Add default JWT token to all requests
        Client.DefaultRequestHeaders.Add("Authorization", $"Bearer {GenerateTestJwt()}");
    }

    public async Task DisposeAsync()
    {
        if (DbContext != null)
            await DbContext.DisposeAsync().ConfigureAwait(false);

        if (_serviceProvider is IAsyncDisposable asyncDisposable)
            await asyncDisposable.DisposeAsync().ConfigureAwait(false);
        else
            (_serviceProvider as IDisposable)?.Dispose();

        Client?.Dispose();

        if (_dbContainer != null)
            await _dbContainer.DisposeAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// Generate a test JWT token with tenant claim.
    /// </summary>
    private static string GenerateTestJwt()
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("test-secret-key-that-is-at-least-32-characters-long-for-testing"));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("tenant_id", "11111111-1111-1111-1111-111111111111"),
            new Claim("sub", "test-user"),
            new Claim("email", "test@example.com")
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

    /// <summary>
    /// Create a new test tenant context with the specified tenant ID.
    /// </summary>
    public void SetTenantContext(Guid tenantId)
    {
        var tenantContext = _serviceProvider!.GetRequiredService<ITenantContext>();
        if (tenantContext is TestTenantContext testContext)
        {
            testContext.SetTenantId(tenantId);
        }
    }
}

/// <summary>
/// Minimal tenant context implementation for testing.
/// </summary>
internal class TestTenantContext : ITenantContext
{
    public Guid TenantId { get; private set; }

    public TestTenantContext(Guid tenantId)
    {
        TenantId = tenantId;
    }

    public void SetTenantId(Guid tenantId)
    {
        TenantId = tenantId;
    }
}

/// <summary>
/// MediatR validation pipeline behavior for testing.
/// </summary>
internal class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        if (!_validators.Any())
            return await next().ConfigureAwait(false);

        var context = new ValidationContext<TRequest>(request);
        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, ct))
        ).ConfigureAwait(false);

        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        if (failures.Count != 0)
            throw new FluentValidation.ValidationException(failures);

        return await next().ConfigureAwait(false);
    }
}

/// <summary>
/// XUnit collection fixture for sharing ApiTestFixture across test classes.
/// </summary>
[CollectionDefinition("HR API Tests")]
public class ApiTestCollection : ICollectionFixture<ApiTestFixture>
{
    // Collection fixture for test organization
}
