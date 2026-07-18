namespace SpaceOS.Modules.Kontrolling.Tests.Infrastructure;

using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.Kontrolling.Domain.Aggregates;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Infrastructure.Persistence;
using Xunit;

/// <summary>
/// ADR-062 second isolation layer: the tenant query filter on the Kontrolling DbContext
/// must hide other tenants' rows even without PostgreSQL RLS (Docker-free InMemory
/// verification).
/// </summary>
public class TenantQueryFilterTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static DbContextOptions<KontrollingDbContext> Options(string dbName) =>
        new DbContextOptionsBuilder<KontrollingDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

    [Fact]
    public async Task Query_filter_hides_other_tenants_rows()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new KontrollingDbContext(Options(dbName)))
        {
            seedContext.OverheadConfigs.Add(OverheadConfig.Create(
                TenantA, OverheadAllocationMethod.DirectCostPercentage, 0.12m, Guid.NewGuid()));
            seedContext.OverheadConfigs.Add(OverheadConfig.Create(
                TenantB, OverheadAllocationMethod.DirectCostPercentage, 0.15m, Guid.NewGuid()));
            await seedContext.SaveChangesAsync();
        }

        await using var tenantScoped = new KontrollingDbContext(Options(dbName), new FixedTenantContext(TenantA));
        var visible = await tenantScoped.OverheadConfigs.ToListAsync();

        visible.Should().OnlyContain(o => o.TenantId == TenantA);
        visible.Should().HaveCount(1);
    }

    [Fact]
    public async Task Without_tenant_scope_the_filter_is_open_for_background_work()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new KontrollingDbContext(Options(dbName)))
        {
            seedContext.OverheadConfigs.Add(OverheadConfig.Create(
                TenantA, OverheadAllocationMethod.DirectCostPercentage, 0.12m, Guid.NewGuid()));
            seedContext.OverheadConfigs.Add(OverheadConfig.Create(
                TenantB, OverheadAllocationMethod.DirectCostPercentage, 0.15m, Guid.NewGuid()));
            await seedContext.SaveChangesAsync();
        }

        await using var unscoped = new KontrollingDbContext(Options(dbName));
        (await unscoped.OverheadConfigs.CountAsync()).Should().Be(2);
    }
}
