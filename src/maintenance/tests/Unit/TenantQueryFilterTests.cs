using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Infrastructure.Persistence;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Unit;

/// <summary>
/// ADR-062 second isolation layer: the tenant query filter on the Maintenance DbContext
/// must hide other tenants' rows even without PostgreSQL RLS (Docker-free InMemory
/// verification, QA-module pattern).
/// </summary>
public class TenantQueryFilterTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static DbContextOptions<MaintenanceDbContext> Options(string dbName) =>
        new DbContextOptionsBuilder<MaintenanceDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

    private static Asset CreateAsset(Guid tenantId, string code) =>
        Asset.Create(tenantId, code, "CNC megmunkáló", AssetKind.Machine, Guid.NewGuid(), "Üzemcsarnok A");

    [Fact]
    public async Task Query_filter_hides_other_tenants_rows()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new MaintenanceDbContext(Options(dbName)))
        {
            seedContext.Assets.Add(CreateAsset(TenantA, "CNC-A1"));
            seedContext.Assets.Add(CreateAsset(TenantB, "CNC-B1"));
            await seedContext.SaveChangesAsync();
        }

        await using var tenantScoped = new MaintenanceDbContext(Options(dbName), new FixedTenantContext(TenantA));
        var visible = await tenantScoped.Assets.ToListAsync();

        visible.Should().OnlyContain(a => a.TenantId == TenantA);
        visible.Should().HaveCount(1);
    }

    [Fact]
    public async Task Without_tenant_scope_the_filter_is_open_for_background_work()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new MaintenanceDbContext(Options(dbName)))
        {
            seedContext.Assets.Add(CreateAsset(TenantA, "CNC-A1"));
            seedContext.Assets.Add(CreateAsset(TenantB, "CNC-B1"));
            await seedContext.SaveChangesAsync();
        }

        await using var unscoped = new MaintenanceDbContext(Options(dbName));
        (await unscoped.Assets.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task Work_order_filter_hides_other_tenants_rows()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new MaintenanceDbContext(Options(dbName)))
        {
            var assetA = CreateAsset(TenantA, "CNC-A1");
            var assetB = CreateAsset(TenantB, "CNC-B1");
            seedContext.Assets.AddRange(assetA, assetB);
            seedContext.WorkOrders.Add(WorkOrder.Create(
                TenantA, assetA.Id, WorkOrderType.Corrective, WorkOrderPriority.High,
                "Szíj csere", "A hajtószíj elszakadt üzem közben"));
            seedContext.WorkOrders.Add(WorkOrder.Create(
                TenantB, assetB.Id, WorkOrderType.Corrective, WorkOrderPriority.High,
                "Szíj csere", "A hajtószíj elszakadt üzem közben"));
            await seedContext.SaveChangesAsync();
        }

        await using var tenantScoped = new MaintenanceDbContext(Options(dbName), new FixedTenantContext(TenantB));
        var visible = await tenantScoped.WorkOrders.ToListAsync();

        visible.Should().OnlyContain(w => w.TenantId == TenantB);
        visible.Should().HaveCount(1);
    }
}
