using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.Maintenance.Infrastructure;
using SpaceOS.Modules.Maintenance.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Integration.Api;

/// <summary>
/// Test fixture for Maintenance API integration tests.
/// Provides PostgreSQL container and configured DbContext for testing.
/// Pattern reused from DMS/HR Week 4 API Layer.
/// </summary>
public class ApiTestFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer;
    private IServiceProvider? _serviceProvider;
    public HttpClient? Client { get; private set; }
    public MaintenanceDbContext? DbContext { get; private set; }

    public ApiTestFixture()
    {
        _dbContainer = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("maintenance_test")
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
                { "ConnectionStrings:MaintenanceDatabase", _dbContainer.GetConnectionString() }
            })
            .Build();

        // Fixed tenant BEFORE the module DI: AddSpaceOsModuleTenancy uses TryAdd,
        // so this pre-registration replaces the claims-backed context in tests.
        services.AddScoped<ITenantContext>(_ =>
            new FixedTenantContext(Guid.Parse("11111111-1111-1111-1111-111111111111")));

        // Register Maintenance infrastructure
        services.AddMaintenanceInfrastructure(configuration);

        // Add MediatR with validation behavior
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(MaintenanceDbContext).Assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        // Add HTTP context accessor
        services.AddHttpContextAccessor();

        _serviceProvider = services.BuildServiceProvider();

        // Get DbContext
        DbContext = _serviceProvider.GetRequiredService<MaintenanceDbContext>();

        // Apply migrations
        await DbContext.Database.MigrateAsync().ConfigureAwait(false);

        // Create HTTP client for API testing
        Client = new HttpClient { BaseAddress = new Uri("http://localhost") };

        // Add default bearer token to all requests (opaque test token — no real
        // JWT validation happens against this client, so no signing is needed)
        Client.DefaultRequestHeaders.Add("Authorization", "Bearer test-token");
        Client.DefaultRequestHeaders.Add("X-Tenant-Id", "11111111-1111-1111-1111-111111111111");
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
[CollectionDefinition("Maintenance API Tests")]
public class ApiTestCollection : ICollectionFixture<ApiTestFixture>
{
    // Collection fixture for test organization
}
