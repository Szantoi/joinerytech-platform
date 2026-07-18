using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Infrastructure.Persistence;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Unit;

/// <summary>
/// ADR-062 second isolation layer: the tenant query filter on the QA DbContext must hide
/// other tenants' rows even without PostgreSQL RLS (Docker-free InMemory verification).
/// </summary>
public class TenantQueryFilterTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static DbContextOptions<QADbContext> Options(string dbName) =>
        new DbContextOptionsBuilder<QADbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

    [Fact]
    public async Task Query_filter_hides_other_tenants_rows()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new QADbContext(Options(dbName)))
        {
            seedContext.QACheckpoints.Add(QACheckpoint.Create(
                TenantA, "Tenant A checkpoint", CheckpointType.Incoming, CriticalLevel.Minor));
            seedContext.QACheckpoints.Add(QACheckpoint.Create(
                TenantB, "Tenant B checkpoint", CheckpointType.Incoming, CriticalLevel.Minor));
            await seedContext.SaveChangesAsync();
        }

        await using var tenantScoped = new QADbContext(Options(dbName), new FixedTenantContext(TenantA));
        var visible = await tenantScoped.QACheckpoints.ToListAsync();

        visible.Should().OnlyContain(c => c.TenantId == TenantA);
        visible.Should().HaveCount(1);
    }

    [Fact]
    public async Task Without_tenant_scope_the_filter_is_open_for_background_work()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new QADbContext(Options(dbName)))
        {
            seedContext.QACheckpoints.Add(QACheckpoint.Create(
                TenantA, "Tenant A checkpoint", CheckpointType.Incoming, CriticalLevel.Minor));
            seedContext.QACheckpoints.Add(QACheckpoint.Create(
                TenantB, "Tenant B checkpoint", CheckpointType.Incoming, CriticalLevel.Minor));
            await seedContext.SaveChangesAsync();
        }

        await using var unscoped = new QADbContext(Options(dbName));
        (await unscoped.QACheckpoints.CountAsync()).Should().Be(2);
    }
}
