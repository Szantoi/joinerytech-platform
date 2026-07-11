using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;
using SpaceOS.Modules.CRM.Infrastructure.Repositories;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Integration.Security;

/// <summary>
/// RLS (Row-Level Security) policy tests for tenant isolation
/// Verifies that tenants cannot access each other's data
/// </summary>
public class RLSPolicyTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container;
    private CrmDbContext _contextTenantA = null!;
    private CrmDbContext _contextTenantB = null!;

    private readonly Guid _tenantA = Guid.NewGuid();
    private readonly Guid _tenantB = Guid.NewGuid();
    private readonly Guid _userA = Guid.NewGuid();
    private readonly Guid _userB = Guid.NewGuid();

    public RLSPolicyTests()
    {
        _container = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("crm_rls_test")
            .WithUsername("test")
            .WithPassword("test")
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        var connectionString = _container.GetConnectionString();

        // Create DbContext for Tenant A
        var optionsA = new DbContextOptionsBuilder<CrmDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        _contextTenantA = new CrmDbContext(optionsA);
        await _contextTenantA.Database.MigrateAsync();

        // Set Tenant A context
        await _contextTenantA.Database.ExecuteSqlAsync(
            $"SET app.current_tenant = {_tenantA}");

        // Create DbContext for Tenant B
        var optionsB = new DbContextOptionsBuilder<CrmDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        _contextTenantB = new CrmDbContext(optionsB);

        // Set Tenant B context
        await _contextTenantB.Database.ExecuteSqlAsync(
            $"SET app.current_tenant = {_tenantB}");
    }

    public async Task DisposeAsync()
    {
        await _contextTenantA.DisposeAsync();
        await _contextTenantB.DisposeAsync();
        await _container.DisposeAsync();
    }

    [Fact]
    public async Task GetLeads_WhenTenantAQueryTenantBData_ShouldReturnEmpty()
    {
        // Arrange: Create Lead for Tenant B
        var repositoryB = new LeadRepository(_contextTenantB);
        var contactInfoB = new ContactInfo("Tenant B Company", new Email("tenantb@example.com"), null, "B Contact");
        var leadB = Lead.Create(contactInfoB, LeadSource.Webshop, _userB, _tenantB);

        await repositoryB.AddAsync(leadB);
        await _contextTenantB.SaveChangesAsync();

        // Act: Query with Tenant A credentials (RLS should block access)
        var repositoryA = new LeadRepository(_contextTenantA);
        var leadsVisibleToA = await _contextTenantA.Leads.ToListAsync();

        // Assert: Tenant A should NOT see Tenant B's lead
        leadsVisibleToA.Should().BeEmpty();
    }

    [Fact]
    public async Task GetOpportunities_WhenDifferentTenant_ShouldOnlySeeOwnData()
    {
        // Arrange: Create Opportunity for Tenant A
        var repositoryA = new OpportunityRepository(_contextTenantA);
        var contactInfoA = new ContactInfo("Tenant A Company", new Email("tenanta@example.com"), null, "A Contact");
        var opportunityA = Opportunity.Create(contactInfoA, new Money(50000, Currency.HUF), _userA, _tenantA);

        await repositoryA.AddAsync(opportunityA);
        await _contextTenantA.SaveChangesAsync();

        // Arrange: Create Opportunity for Tenant B
        var repositoryB = new OpportunityRepository(_contextTenantB);
        var contactInfoB = new ContactInfo("Tenant B Company", new Email("tenantb@example.com"), null, "B Contact");
        var opportunityB = Opportunity.Create(contactInfoB, new Money(75000, Currency.EUR), _userB, _tenantB);

        await repositoryB.AddAsync(opportunityB);
        await _contextTenantB.SaveChangesAsync();

        // Act: Query with Tenant A credentials
        var opportunitiesA = await _contextTenantA.Opportunities.ToListAsync();

        // Act: Query with Tenant B credentials
        var opportunitiesB = await _contextTenantB.Opportunities.ToListAsync();

        // Assert: Each tenant sees only their own data
        opportunitiesA.Should().HaveCount(1);
        opportunitiesA.First().Id.Should().Be(opportunityA.Id);
        opportunitiesA.First().TenantId.Should().Be(_tenantA);

        opportunitiesB.Should().HaveCount(1);
        opportunitiesB.First().Id.Should().Be(opportunityB.Id);
        opportunitiesB.First().TenantId.Should().Be(_tenantB);
    }

    [Fact]
    public async Task UpdateLead_WhenDifferentTenant_ShouldNotFindLead()
    {
        // Arrange: Create Lead for Tenant A
        var repositoryA = new LeadRepository(_contextTenantA);
        var contactInfoA = new ContactInfo("Tenant A Lead", new Email("leadA@example.com"), null, "A Contact");
        var leadA = Lead.Create(contactInfoA, LeadSource.Referral, _userA, _tenantA);

        await repositoryA.AddAsync(leadA);
        await _contextTenantA.SaveChangesAsync();

        var leadAId = leadA.Id;

        // Act: Try to retrieve with Tenant B credentials (RLS should block)
        var repositoryB = new LeadRepository(_contextTenantB);
        var leadFromB = await repositoryB.GetByIdAsync(leadAId);

        // Assert: Tenant B should NOT be able to access Tenant A's lead
        leadFromB.Should().BeNull();
    }

    [Fact]
    public async Task MultiTenantQuery_WithRLSEnabled_ShouldIsolateData()
    {
        // Arrange: Create 2 Leads for Tenant A, 1 Lead for Tenant B
        var repositoryA = new LeadRepository(_contextTenantA);
        var lead1A = Lead.Create(
            new ContactInfo("Company A1", new Email("a1@example.com"), null, "Contact A1"),
            LeadSource.Webshop,
            _userA,
            _tenantA);

        var lead2A = Lead.Create(
            new ContactInfo("Company A2", new Email("a2@example.com"), null, "Contact A2"),
            LeadSource.Partner,
            _userA,
            _tenantA);

        await repositoryA.AddAsync(lead1A);
        await repositoryA.AddAsync(lead2A);
        await _contextTenantA.SaveChangesAsync();

        var repositoryB = new LeadRepository(_contextTenantB);
        var lead1B = Lead.Create(
            new ContactInfo("Company B1", new Email("b1@example.com"), null, "Contact B1"),
            LeadSource.Referral,
            _userB,
            _tenantB);

        await repositoryB.AddAsync(lead1B);
        await _contextTenantB.SaveChangesAsync();

        // Act: Query all Leads from each tenant's perspective
        var leadsFromA = await _contextTenantA.Leads.ToListAsync();
        var leadsFromB = await _contextTenantB.Leads.ToListAsync();

        // Assert: Each tenant sees only their own data
        leadsFromA.Should().HaveCount(2);
        leadsFromA.Should().OnlyContain(l => l.TenantId == _tenantA);

        leadsFromB.Should().HaveCount(1);
        leadsFromB.Should().OnlyContain(l => l.TenantId == _tenantB);
    }
}
