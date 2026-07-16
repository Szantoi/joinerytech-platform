namespace SpaceOS.Modules.Kontrolling.Tests.Api;

using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.Kontrolling.Api;
using SpaceOS.Modules.Kontrolling.Api.Endpoints;
using SpaceOS.Modules.Kontrolling.Application.Portfolio;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;
using Xunit;

/// <summary>
/// In-memory endpoint test host: TestServer, no database and no containers
/// (Maintenance <c>WorkOrderEndpointTestHost</c> precedent).
/// </summary>
/// <remarks>
/// Real routing, real MediatR handlers, real domain entities and the real
/// production JSON wire format — only the repositories and the project source
/// are in-memory. So these tests exercise the actual HTTP contract: routes,
/// query filters, status codes and the enum spellings the client parses.
/// </remarks>
public sealed class KontrollingEndpointTestHost : IAsyncLifetime
{
    public static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid UserId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    /// <summary>Fixed clock, so calculatedAt and the trend month are assertable.</summary>
    public static readonly DateTimeOffset Now = new(2026, 7, 16, 10, 0, 0, TimeSpan.Zero);

    private WebApplication? _app;

    public InMemoryCostAdjustmentRepository Adjustments { get; } = new();
    public InMemoryProjectPortfolioSource Projects { get; } = new();
    public HttpClient Client { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Logging.ClearProviders();

        // Production wire format: the contract's enum spellings.
        builder.Services.AddKontrollingApiJsonOptions();

        builder.Services
            .AddAuthentication(TestAuthHandler.Scheme)
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.Scheme, _ => { });
        builder.Services.AddAuthorization();

        builder.Services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(ListProjectsQuery).Assembly));

        builder.Services.AddMemoryCache();
        builder.Services.AddSingleton(PortfolioThresholds.Default);
        builder.Services.AddSingleton<TimeProvider>(new FixedTimeProvider(Now));
        builder.Services.AddSingleton<ICostAdjustmentRepository>(Adjustments);
        builder.Services.AddSingleton<IProjectPortfolioSource>(Projects);

        // Pulled in by the assembly-wide MediatR scan (the module's native
        // cost queries); not exercised by these tests.
        builder.Services.AddSingleton<IOverheadConfigRepository>(new StubOverheadConfigRepository());
        builder.Services.AddSingleton<IIntegrationDataProvider, IntegrationDataProvider>();
        builder.Services.AddSingleton<IProjectCostCalculationService, ProjectCostCalculationService>();

        _app = builder.Build();
        _app.UseAuthentication();
        _app.UseAuthorization();
        _app.MapKontrollingEndpoints();

        await _app.StartAsync().ConfigureAwait(false);

        Client = _app.GetTestClient();
        Client.DefaultRequestHeaders.Add("X-Tenant-Id", TenantId.ToString());
        Client.DefaultRequestHeaders.Add("X-User-Id", UserId.ToString());
    }

    public async Task DisposeAsync()
    {
        Client.Dispose();
        if (_app is not null)
        {
            await _app.DisposeAsync().ConfigureAwait(false);
        }
    }
}

/// <summary>Always-authenticated scheme so RequireAuthorization() passes.</summary>
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public new const string Scheme = "Test";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "test-user")], Scheme);
        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme)));
    }
}

/// <summary>Clock frozen at a known instant.</summary>
public sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now;
}

/// <summary>In-memory <see cref="ICostAdjustmentRepository"/>.</summary>
/// <remarks>
/// Stores real <see cref="CostAdjustment"/> entities, so the soft-delete
/// semantics under test are the domain's own, not a test double's guess.
/// </remarks>
public sealed class InMemoryCostAdjustmentRepository : ICostAdjustmentRepository
{
    private readonly List<CostAdjustment> _adjustments = [];

    /// <summary>Seeds an adjustment directly, bypassing the write path.</summary>
    public CostAdjustment Seed(CostAdjustment adjustment)
    {
        _adjustments.Add(adjustment);
        return adjustment;
    }

    public Task<IEnumerable<CostAdjustment>> GetByProjectAsync(
        Guid projectId, Guid tenantId, CancellationToken ct = default)
        => Task.FromResult(_adjustments.Where(a =>
            a.TenantId == tenantId && a.ProjectId == projectId && !a.IsDeleted));

    public Task<IEnumerable<CostAdjustment>> GetPortfolioAdjustmentsAsync(
        Guid tenantId, CancellationToken ct = default)
        => Task.FromResult(_adjustments.Where(a =>
            a.TenantId == tenantId && a.Scope == AdjustmentScope.Portfolio && !a.IsDeleted));

    public Task AddAsync(CostAdjustment adjustment, CancellationToken ct = default)
    {
        _adjustments.Add(adjustment);
        return Task.CompletedTask;
    }

    public Task<CostAdjustment?> GetByIdAsync(Guid adjustmentId, Guid tenantId, CancellationToken ct = default)
        => Task.FromResult(_adjustments.FirstOrDefault(a =>
            a.TenantId == tenantId && a.AdjustmentId == adjustmentId && !a.IsDeleted));

    public Task<IReadOnlyList<CostAdjustment>> GetAllAsync(Guid tenantId, CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<CostAdjustment>>(_adjustments
            .Where(a => a.TenantId == tenantId && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.AdjustmentId)
            .ToList());

    // Mirrors the real repository: includes soft-deleted rows, so the caller
    // can tell "already deleted" (409) from "unknown" (404).
    public Task<CostAdjustment?> GetForUpdateAsync(Guid adjustmentId, Guid tenantId, CancellationToken ct = default)
        => Task.FromResult(_adjustments.FirstOrDefault(a =>
            a.TenantId == tenantId && a.AdjustmentId == adjustmentId));

    public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
}

/// <summary>In-memory <see cref="IProjectPortfolioSource"/>.</summary>
public sealed class InMemoryProjectPortfolioSource : IProjectPortfolioSource
{
    private readonly List<(Guid TenantId, ControllingProjectData Project)> _projects = [];

    /// <summary>Seeds a project with the given cost lines.</summary>
    public ControllingProjectData Seed(
        Guid tenantId,
        string code,
        ProjectLifecycleStatus status = ProjectLifecycleStatus.Active,
        decimal contractValue = 1_000_000m,
        decimal invoiced = 0m,
        params ProjectCostLine[] lines)
    {
        var project = new ControllingProjectData(
            ProjectId: Guid.NewGuid(),
            ProjectCode: code,
            Name: $"Projekt {code}",
            Customer: "Teszt Ügyfél Kft.",
            Status: status,
            ContractValue: Money.FromHUF(contractValue),
            Invoiced: Money.FromHUF(invoiced),
            Lines: lines);

        _projects.Add((tenantId, project));
        return project;
    }

    public Task<IReadOnlyList<ControllingProjectData>> GetProjectsAsync(
        Guid tenantId, CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<ControllingProjectData>>(
            _projects.Where(p => p.TenantId == tenantId).Select(p => p.Project).ToList());

    public Task<ControllingProjectData?> GetProjectAsync(
        Guid tenantId, string projectCode, CancellationToken ct = default)
        => Task.FromResult(_projects
            .Where(p => p.TenantId == tenantId && p.Project.ProjectCode == projectCode)
            .Select(p => p.Project)
            .FirstOrDefault());
}

/// <summary>Empty overhead-config repository — not under test here.</summary>
public sealed class StubOverheadConfigRepository : IOverheadConfigRepository
{
    public Task<global::SpaceOS.Modules.Kontrolling.Domain.Aggregates.OverheadConfig?> GetByTenantAsync(Guid tenantId, CancellationToken ct = default)
        => Task.FromResult<global::SpaceOS.Modules.Kontrolling.Domain.Aggregates.OverheadConfig?>(null);

    public Task SaveAsync(global::SpaceOS.Modules.Kontrolling.Domain.Aggregates.OverheadConfig config, CancellationToken ct = default)
        => Task.CompletedTask;
}
