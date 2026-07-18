using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.HR.Api;
using SpaceOS.Modules.HR.Api.Endpoints;
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
    /// <summary>Fixed fixture tenant — matches the test auth scheme's tid claim.</summary>
    public static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private readonly PostgreSqlContainer _dbContainer;
    private IHost? _host;
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

        var configuration = new Dictionary<string, string?>
        {
            { "ConnectionStrings:HRDatabase", _dbContainer.GetConnectionString() }
        };

        // Real TestServer host over the real database (QA/DMS fixture repair pattern) —
        // the old fixture handed out a phantom HttpClient (http://localhost, no server),
        // so every endpoint-driven test failed with connection refused.
        _host = await new HostBuilder()
            .ConfigureAppConfiguration(config => config.AddInMemoryCollection(configuration))
            .ConfigureWebHost(webBuilder => webBuilder
                .UseTestServer()
                .ConfigureServices((context, services) =>
                {
                    services.AddRouting();
                    services.AddLogging(logging => logging.SetMinimumLevel(LogLevel.Warning));
                    services.AddAuthentication(HrTestAuthHandler.Scheme)
                        .AddScheme<AuthenticationSchemeOptions, HrTestAuthHandler>(HrTestAuthHandler.Scheme, _ => { });
                    services.AddAuthorization();
                    // Production host mirror: ADR-059 Hungarian wire vocabulary (HrWire).
                    services.AddHrApiJsonOptions();

                    // HR infrastructure (DbContext + shared tenancy + repositories)
                    services.AddHRInfrastructure(context.Configuration);

                    // MediatR with the validation behavior the production pipeline mirrors
                    services.AddMediatR(cfg =>
                    {
                        cfg.RegisterServicesFromAssembly(typeof(HRDbContext).Assembly);
                        cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
                    });
                })
                .Configure(app =>
                {
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.UseSpaceOsModuleTenancy();
                    app.UseEndpoints(endpoints =>
                    {
                        endpoints.MapEmployeeEndpoints();
                        endpoints.MapAbsenceEndpoints();
                        endpoints.MapCapacityEndpoints();
                    });
                }))
            .StartAsync()
            .ConfigureAwait(false);

        _serviceProvider = _host.Services;

        // Get DbContext
        DbContext = _serviceProvider.GetRequiredService<HRDbContext>();

        // Apply migrations
        await DbContext.Database.MigrateAsync().ConfigureAwait(false);

        // HTTP client for API testing (TestServer-backed)
        Client = _host.GetTestClient();
        Client.DefaultRequestHeaders.Add("Authorization", $"Bearer {GenerateTestJwt()}");
        Client.DefaultRequestHeaders.Add("X-Tenant-Id", TenantId.ToString());
    }

    public async Task DisposeAsync()
    {
        Client?.Dispose();

        if (_host is not null)
        {
            await _host.StopAsync().ConfigureAwait(false);
            _host.Dispose();
        }

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

}

/// <summary>
/// Always-authenticated test scheme carrying a real "tid" claim (ADR-061): hosts resolve
/// the tenant from the token, and the X-Tenant-Id header is only accepted when it matches.
/// </summary>
internal sealed class HrTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public new const string Scheme = "Test";

    public HrTestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var identity = new ClaimsIdentity(
            new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "test-user"),
                new Claim("tid", ApiTestFixture.TenantId.ToString()),
            }, Scheme);
        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme)));
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
