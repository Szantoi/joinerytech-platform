using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Api;
using SpaceOS.Modules.Maintenance.Api.Endpoints;
using SpaceOS.Modules.Maintenance.Application.Commands;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Api;

/// <summary>
/// In-memory endpoint test host (TestServer, no database, no containers):
/// real routing + real MediatR handlers + real aggregate, with in-memory
/// repositories — exercises the transition endpoints' HTTP contract
/// (PUT, fresh WorkOrderDto body, 404/409/400, enum-as-string wire format).
/// </summary>
public sealed class WorkOrderEndpointTestHost : IAsyncLifetime
{
    public static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private WebApplication? _app;

    public InMemoryWorkOrderRepository WorkOrders { get; } = new();
    public InMemoryAssetRepository Assets { get; } = new();
    public HttpClient Client { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Logging.ClearProviders();

        // Wire format: enums as strings (EHS precedent — host-level converter)
        builder.Services.AddMaintenanceApiJsonOptions();

        builder.Services
            .AddAuthentication(TestAuthHandler.Scheme)
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.Scheme, _ => { });
        builder.Services.AddAuthorization();

        builder.Services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(StartWorkOrderCommand).Assembly));

        builder.Services.AddSingleton<IWorkOrderRepository>(WorkOrders);
        builder.Services.AddSingleton<IAssetRepository>(Assets);

        _app = builder.Build();
        _app.UseAuthentication();
        _app.UseAuthorization();
        _app.MapWorkOrderEndpoints();

        await _app.StartAsync().ConfigureAwait(false);

        Client = _app.GetTestClient();
        Client.DefaultRequestHeaders.Add("X-Tenant-Id", TenantId.ToString());
    }

    public async Task DisposeAsync()
    {
        Client.Dispose();
        if (_app != null)
        {
            await _app.DisposeAsync().ConfigureAwait(false);
        }
    }

    /// <summary>Seeds an asset and returns it (default code: CNC-01).</summary>
    public Asset SeedAsset(string code = "CNC-01")
    {
        var asset = Asset.Create(TenantId, code, "CNC megmunkáló", AssetKind.Machine, Guid.NewGuid(), "Üzemcsarnok A");
        Assets.Seed(asset);
        return asset;
    }

    /// <summary>
    /// Seeds a work order driven to the requested status via real aggregate actions.
    /// </summary>
    public WorkOrder SeedWorkOrder(
        AssetId assetId,
        WorkOrderStatus status = WorkOrderStatus.Reported,
        bool assigned = false)
    {
        var workOrder = WorkOrder.Create(
            TenantId, assetId, WorkOrderType.Corrective, WorkOrderPriority.High,
            "Szíj csere", "A hajtószíj elszakadt üzem közben");

        if (status != WorkOrderStatus.Reported && status != WorkOrderStatus.Rejected)
        {
            workOrder.Schedule(DateTime.UtcNow.AddDays(1), 2.0m);
        }

        if (assigned || status == WorkOrderStatus.InProgress || status == WorkOrderStatus.Completed)
        {
            workOrder.AssignInternalTechnician(Guid.NewGuid());
        }

        switch (status)
        {
            case WorkOrderStatus.InProgress:
                workOrder.StartWork();
                break;
            case WorkOrderStatus.Completed:
                workOrder.StartWork();
                workOrder.Complete(1.5m);
                break;
            case WorkOrderStatus.Postponed:
                workOrder.Postpone("Alkatrészre várunk");
                break;
            case WorkOrderStatus.Rejected:
                workOrder.Reject("Nem indokolt");
                break;
        }

        WorkOrders.Seed(workOrder);
        return workOrder;
    }
}

/// <summary>Always-authenticated test scheme (endpoints use RequireAuthorization).</summary>
internal sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public new const string Scheme = "Test";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "test-user") }, Scheme);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

/// <summary>In-memory IWorkOrderRepository (endpoint tests — no database).</summary>
public sealed class InMemoryWorkOrderRepository : IWorkOrderRepository
{
    private readonly Dictionary<Guid, WorkOrder> _store = new();

    public void Seed(WorkOrder workOrder) => _store[workOrder.Id.Value] = workOrder;

    public Task<WorkOrder?> GetByIdAsync(WorkOrderId id, CancellationToken ct = default)
        => Task.FromResult(_store.TryGetValue(id.Value, out var workOrder) ? workOrder : null);

    public Task<IEnumerable<WorkOrder>> GetActiveByAssetAsync(AssetId assetId, CancellationToken ct = default)
        => Task.FromResult(_store.Values.Where(w =>
            w.AssetId == assetId
            && w.Status != WorkOrderStatus.Completed
            && w.Status != WorkOrderStatus.Rejected));

    public Task<IEnumerable<WorkOrder>> GetByStatusAsync(TenantId tenantId, WorkOrderStatus status, CancellationToken ct = default)
        => Task.FromResult(_store.Values.Where(w => w.TenantId == tenantId.Value && w.Status == status));

    public Task<IEnumerable<WorkOrder>> GetInProgressWithDowntimeAsync(TenantId tenantId, CancellationToken ct = default)
        => Task.FromResult(_store.Values.Where(w =>
            w.TenantId == tenantId.Value
            && w.Status == WorkOrderStatus.InProgress
            && w.RequiresDowntime));

    public Task<IEnumerable<WorkOrder>> GetDuePreventiveAsync(TenantId tenantId, DateOnly today, CancellationToken ct = default)
        => Task.FromResult(Enumerable.Empty<WorkOrder>());

    public Task AddAsync(WorkOrder workOrder, CancellationToken ct = default)
    {
        Seed(workOrder);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(WorkOrder workOrder, CancellationToken ct = default)
    {
        Seed(workOrder);
        return Task.CompletedTask;
    }
}

/// <summary>In-memory IAssetRepository (endpoint tests — no database).</summary>
public sealed class InMemoryAssetRepository : IAssetRepository
{
    private readonly Dictionary<Guid, Asset> _store = new();

    public void Seed(Asset asset) => _store[asset.Id.Value] = asset;

    public Task<Asset?> GetByIdAsync(AssetId id, CancellationToken ct = default)
        => Task.FromResult(_store.TryGetValue(id.Value, out var asset) ? asset : null);

    public Task<Asset?> GetByCodeAsync(TenantId tenantId, string code, CancellationToken ct = default)
        => Task.FromResult(_store.Values.FirstOrDefault(a => a.TenantId == tenantId.Value && a.Code == code));

    public Task<IEnumerable<Asset>> GetActiveByKindAsync(TenantId tenantId, AssetKind kind, CancellationToken ct = default)
        => Task.FromResult(_store.Values.Where(a => a.TenantId == tenantId.Value && a.Kind == kind));

    public Task<IEnumerable<Asset>> GetActiveByFacilityAsync(TenantId tenantId, FacilityId facilityId, CancellationToken ct = default)
        => Task.FromResult(Enumerable.Empty<Asset>());

    public Task<IEnumerable<Asset>> GetByMachineIdAsync(TenantId tenantId, string machineId, CancellationToken ct = default)
        => Task.FromResult(Enumerable.Empty<Asset>());

    public Task AddAsync(Asset asset, CancellationToken ct = default)
    {
        Seed(asset);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Asset asset, CancellationToken ct = default)
    {
        Seed(asset);
        return Task.CompletedTask;
    }
}
