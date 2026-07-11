using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;
using SpaceOS.Modules.CRM.Infrastructure.Repositories;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Integration.Repositories;

/// <summary>
/// Integration tests for OpportunityRepository with real PostgreSQL
/// Tests persistence of opportunity lifecycle and FSM state transitions
/// </summary>
public class OpportunityRepositoryTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container;
    private CrmDbContext _context = null!;
    private OpportunityRepository _repository = null!;

    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _assignedTo = Guid.NewGuid();

    public OpportunityRepositoryTests()
    {
        _container = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("crm_test")
            .WithUsername("test")
            .WithPassword("test")
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        var options = new DbContextOptionsBuilder<CrmDbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;

        _context = new CrmDbContext(options);
        await _context.Database.MigrateAsync();

        _repository = new OpportunityRepository(_context);
    }

    public async Task DisposeAsync()
    {
        await _context.DisposeAsync();
        await _container.DisposeAsync();
    }

    [Fact]
    public async Task AddOpportunity_CreatedDirectly_ShouldPersist()
    {
        // Arrange: Create Opportunity without Lead reference
        var contactInfo = CreateTestContact();
        var estimatedValue = new Money(100000, Currency.HUF);
        var opportunity = Opportunity.Create(contactInfo, estimatedValue, _assignedTo, _tenantId);

        opportunity.Status.Should().Be(OpportunityStatus.Draft);
        opportunity.LeadRef.Should().BeNull();

        // Act: Persist
        await _repository.AddAsync(opportunity);
        await _context.SaveChangesAsync();

        // Assert: Opportunity persisted
        var savedOpportunity = await _repository.GetByIdAsync(opportunity.Id);
        savedOpportunity.Should().NotBeNull();
        savedOpportunity!.Id.Should().Be(opportunity.Id);
        savedOpportunity.TenantId.Should().Be(_tenantId);
        savedOpportunity.ContactInfo.Name.Should().Be(contactInfo.Name);
        savedOpportunity.EstimatedValue.Should().Be(estimatedValue);
        savedOpportunity.Status.Should().Be(OpportunityStatus.Draft);
    }

    [Fact]
    public async Task AddOpportunity_CreatedFromLead_ShouldPersistLeadRef()
    {
        // Arrange: Create Opportunity from Lead
        var leadId = Guid.NewGuid();
        var contactInfo = CreateTestContact();
        var estimatedValue = new Money(50000, Currency.EUR);
        var opportunity = Opportunity.CreateFromLead(leadId, contactInfo, estimatedValue, _assignedTo, _tenantId);

        opportunity.LeadRef.Should().Be(leadId);

        // Act: Persist
        await _repository.AddAsync(opportunity);
        await _context.SaveChangesAsync();

        // Assert: LeadRef preserved
        var savedOpportunity = await _repository.GetByIdAsync(opportunity.Id);
        savedOpportunity.Should().NotBeNull();
        savedOpportunity!.LeadRef.Should().Be(leadId);
    }

    [Fact]
    public async Task UpdateOpportunity_WithFSMProgression_ShouldPersistStateChanges()
    {
        // Arrange: Create and save Opportunity in Draft
        var contactInfo = CreateTestContact();
        var estimatedValue = new Money(75000, Currency.USD);
        var opportunity = Opportunity.Create(contactInfo, estimatedValue, _assignedTo, _tenantId);

        await _repository.AddAsync(opportunity);
        await _context.SaveChangesAsync();

        opportunity.Status.Should().Be(OpportunityStatus.Draft);

        // Act: Progress through FSM
        opportunity.Propose(DateTime.UtcNow.AddMonths(2));
        opportunity.Status.Should().Be(OpportunityStatus.Proposal);

        await _context.SaveChangesAsync();

        // Assert: State change persisted
        var updated1 = await _repository.GetByIdAsync(opportunity.Id);
        updated1!.Status.Should().Be(OpportunityStatus.Proposal);

        // Act: Continue FSM progression
        opportunity.Negotiate(new Money(80000, Currency.USD), 70);
        opportunity.Status.Should().Be(OpportunityStatus.Negotiation);

        await _context.SaveChangesAsync();

        // Assert: Second state change persisted
        var updated2 = await _repository.GetByIdAsync(opportunity.Id);
        updated2!.Status.Should().Be(OpportunityStatus.Negotiation);
        updated2.EstimatedValue.Amount.Should().Be(80000);
        updated2.Probability.Should().Be(70);
    }

    [Fact]
    public async Task UpdateOpportunity_WinTransition_ShouldPersistWonState()
    {
        // Arrange: Create Opportunity and move to Negotiation
        var contactInfo = CreateTestContact();
        var estimatedValue = new Money(120000, Currency.HUF);
        var opportunity = Opportunity.Create(contactInfo, estimatedValue, _assignedTo, _tenantId);

        opportunity.Propose(DateTime.UtcNow.AddMonths(1));
        opportunity.Negotiate(null, 80);

        await _repository.AddAsync(opportunity);
        await _context.SaveChangesAsync();

        // Act: Win the opportunity
        var wonBy = Guid.NewGuid();
        opportunity.Win(wonBy);

        await _context.SaveChangesAsync();

        // Assert: Won state persisted
        var wonOpportunity = await _repository.GetByIdAsync(opportunity.Id);
        wonOpportunity.Should().NotBeNull();
        wonOpportunity!.Status.Should().Be(OpportunityStatus.Won);
        wonOpportunity.Probability.Should().Be(100);
        wonOpportunity.ClosedAt.Should().NotBeNull();
    }

    private ContactInfo CreateTestContact(string name = "Test Company", string email = "opportunity@example.com")
    {
        return new ContactInfo(
            name,
            new Email(email),
            null,
            "Opportunity Contact");
    }
}
