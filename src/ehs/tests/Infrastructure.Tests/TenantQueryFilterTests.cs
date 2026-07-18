using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Data;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

/// <summary>
/// ADR-062 second isolation layer: the tenant query filter on the EHS DbContext must hide
/// other tenants' rows even without PostgreSQL RLS (Docker-free InMemory verification).
/// </summary>
public class TenantQueryFilterTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static DbContextOptions<EhsDbContext> Options(string dbName) =>
        new DbContextOptionsBuilder<EhsDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

    [Fact]
    public async Task Query_filter_hides_other_tenants_rows()
    {
        var dbName = Guid.NewGuid().ToString();

        // Seed with an unfiltered context (no tenant → filter disabled, kernel pattern).
        await using (var seedContext = new EhsDbContext(Options(dbName)))
        {
            seedContext.Locations.Add(EhsLocation.Create(TenantA, "A-01", "Tenant A hall", LocationKind.Building));
            seedContext.Locations.Add(EhsLocation.Create(TenantB, "B-01", "Tenant B hall", LocationKind.Building));
            await seedContext.SaveChangesAsync();
        }

        // Read with Tenant A's context — only Tenant A's row may be visible.
        await using var tenantContext = new EhsDbContext(Options(dbName), new FixedTenantContext(TenantA));
        var visible = await tenantContext.Locations.ToListAsync();

        visible.Should().OnlyContain(l => l.TenantId == TenantA);
        visible.Should().HaveCount(1);
    }

    [Fact]
    public async Task Without_tenant_scope_the_filter_is_open_for_background_work()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new EhsDbContext(Options(dbName)))
        {
            seedContext.Locations.Add(EhsLocation.Create(TenantA, "A-01", "Tenant A hall", LocationKind.Building));
            seedContext.Locations.Add(EhsLocation.Create(TenantB, "B-01", "Tenant B hall", LocationKind.Building));
            await seedContext.SaveChangesAsync();
        }

        await using var unscopedContext = new EhsDbContext(Options(dbName));
        (await unscopedContext.Locations.CountAsync()).Should().Be(2);
    }
}
