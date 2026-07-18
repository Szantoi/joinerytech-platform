using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Infrastructure.Persistence;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Infrastructure;

/// <summary>
/// ADR-062 second isolation layer: the tenant query filter on the HR DbContext must hide
/// other tenants' rows even without PostgreSQL RLS (Docker-free InMemory verification).
/// </summary>
public class TenantQueryFilterTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static DbContextOptions<HRDbContext> Options(string dbName) =>
        new DbContextOptionsBuilder<HRDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

    private static Employee EmployeeFor(Guid tenantId, string name) =>
        Employee.Create(
            tenantId,
            name,
            "asztalos",
            Department.Production,
            Guid.NewGuid(),
            PayGradeBand.SkilledWorker,
            40m,
            $"{Guid.NewGuid():N}@joinerytech.local");

    [Fact]
    public async Task Query_filter_hides_other_tenants_rows()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new HRDbContext(Options(dbName)))
        {
            seedContext.Employees.Add(EmployeeFor(TenantA, "Tenant A worker"));
            seedContext.Employees.Add(EmployeeFor(TenantB, "Tenant B worker"));
            await seedContext.SaveChangesAsync();
        }

        await using var tenantScoped = new HRDbContext(Options(dbName), new FixedTenantContext(TenantA));
        var visible = await tenantScoped.Employees.ToListAsync();

        visible.Should().OnlyContain(e => e.TenantId == TenantA);
        visible.Should().HaveCount(1);
    }

    [Fact]
    public async Task Without_tenant_scope_the_filter_is_open_for_background_work()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new HRDbContext(Options(dbName)))
        {
            seedContext.Employees.Add(EmployeeFor(TenantA, "Tenant A worker"));
            seedContext.Employees.Add(EmployeeFor(TenantB, "Tenant B worker"));
            await seedContext.SaveChangesAsync();
        }

        await using var unscoped = new HRDbContext(Options(dbName));
        (await unscoped.Employees.CountAsync()).Should().Be(2);
    }
}
