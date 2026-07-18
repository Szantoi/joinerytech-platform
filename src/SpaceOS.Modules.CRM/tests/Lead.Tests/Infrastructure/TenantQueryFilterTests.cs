using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Infrastructure;

/// <summary>
/// ADR-062 second isolation layer: the tenant query filter on the CRM DbContext must hide
/// other tenants' rows even without PostgreSQL RLS (Docker-free InMemory verification).
/// </summary>
public class TenantQueryFilterTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static DbContextOptions<CrmDbContext> Options(string dbName) =>
        new DbContextOptionsBuilder<CrmDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

    private static Lead LeadFor(Guid tenantId, string name)
    {
        var contact = ContactInfo.Create(name, $"{Guid.NewGuid():N}@joinerytech.local", null, null);
        return Lead.Create(tenantId, contact, LeadSource.Website, Guid.NewGuid(), Guid.NewGuid()).Value;
    }

    [Fact]
    public async Task Query_filter_hides_other_tenants_rows()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new CrmDbContext(Options(dbName)))
        {
            seedContext.Leads.Add(LeadFor(TenantA, "Tenant A lead"));
            seedContext.Leads.Add(LeadFor(TenantB, "Tenant B lead"));
            await seedContext.SaveChangesAsync();
        }

        await using var tenantScoped = new CrmDbContext(Options(dbName), new FixedTenantContext(TenantA));
        var visible = await tenantScoped.Leads.ToListAsync();

        visible.Should().OnlyContain(l => l.TenantId == TenantA);
        visible.Should().HaveCount(1);
    }

    [Fact]
    public async Task Without_tenant_scope_the_filter_is_open_for_background_work()
    {
        var dbName = Guid.NewGuid().ToString();

        await using (var seedContext = new CrmDbContext(Options(dbName)))
        {
            seedContext.Leads.Add(LeadFor(TenantA, "Tenant A lead"));
            seedContext.Leads.Add(LeadFor(TenantB, "Tenant B lead"));
            await seedContext.SaveChangesAsync();
        }

        await using var unscoped = new CrmDbContext(Options(dbName));
        (await unscoped.Leads.CountAsync()).Should().Be(2);
    }
}
