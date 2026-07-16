using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.DMS.Application.Contracts;
using SpaceOS.Modules.DMS.Infrastructure;
using SpaceOS.Modules.DMS.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Integration.Api;

/// <summary>
/// Integration test fixture: real PostgreSQL (Testcontainers) + the module DI
/// (AddDMSInfrastructure/AddDMSApplication) with migrations applied.
///
/// DMS-BE-HOST repair: the original fixture handed out a plain HttpClient
/// pointed at http://localhost with a JWT — there was no server behind it, so
/// the HTTP tests could never pass; and the hand-written migrations lacked
/// [Migration] attributes, so MigrateAsync applied NOTHING. The fixture now
/// exposes scoped service access for persistence-level integration tests
/// (the REST layer is covered by the TestServer contract tests in tests/Api).
/// </summary>
public class ApiTestFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer;
    private ServiceProvider? _serviceProvider;

    public const string TenantHeader = "X-Tenant-Id";
    public static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public ApiTestFixture()
    {
        _dbContainer = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("dms_test")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
    }

    /// <summary>Creates a fresh DI scope (fresh DbContext — reload-proof assertions).</summary>
    public IServiceScope CreateScope() => _serviceProvider!.CreateScope();

    public async Task InitializeAsync()
    {
        // Start PostgreSQL container
        await _dbContainer.StartAsync().ConfigureAwait(false);

        // Setup DI container (module registration mirror)
        var services = new ServiceCollection();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "ConnectionStrings:DMSDatabase", _dbContainer.GetConnectionString() }
            })
            .Build();

        services.AddLogging();
        services.AddDMSInfrastructure(configuration);
        services.AddDMSApplication();

        // Fixed tenant context (RLS scoping input; the container role is the
        // table owner, so RLS does not filter here — policy behavior is an ops
        // concern, the isolation smoke lives with the platform test suite)
        services.AddScoped<ITenantContext>(_ => new TestTenantContext(TenantId));

        _serviceProvider = services.BuildServiceProvider();

        // Apply migrations (all three are discoverable since the attribute fix)
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DMSDbContext>();
        await dbContext.Database.MigrateAsync().ConfigureAwait(false);
    }

    public async Task DisposeAsync()
    {
        if (_serviceProvider != null)
            await _serviceProvider.DisposeAsync().ConfigureAwait(false);

        await _dbContainer.DisposeAsync().ConfigureAwait(false);
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
[CollectionDefinition("DMS API Tests")]
public class ApiTestCollection : ICollectionFixture<ApiTestFixture>
{
    // Collection fixture for test organization
}
