using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Events;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;
using SpaceOS.Modules.CRM.Infrastructure.Repositories;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Integration.Repositories;

/// <summary>
/// Integration tests for LeadRepository with real PostgreSQL (Testcontainers)
/// Tests EF Core persistence, domain events, and query operations
/// </summary>
public class LeadRepositoryTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container;
    private CrmDbContext _context = null!;
    private LeadRepository _repository = null!;

    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _assignedTo = Guid.NewGuid();

    public LeadRepositoryTests()
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

        _repository = new LeadRepository(_context);
    }

    public async Task DisposeAsync()
    {
        await _context.DisposeAsync();
        await _container.DisposeAsync();
    }

    [Fact]
    public async Task AddLead_WithDomainEvents_ShouldPersistAndCaptureEvents()
    {
        // Arrange
        var contactInfo = CreateTestContact();
        var lead = Lead.Create(contactInfo, LeadSource.Webshop, _assignedTo, _tenantId);

        // Assert: Domain event created
        var events = lead.PopDomainEvents();
        events.Should().ContainSingle(e => e is LeadCreatedEvent);

        // Act: Persist to database
        await _repository.AddAsync(lead);
        await _context.SaveChangesAsync();

        // Assert: Lead persisted
        var savedLead = await _repository.GetByIdAsync(lead.Id);
        savedLead.Should().NotBeNull();
        savedLead!.Id.Should().Be(lead.Id);
        savedLead.TenantId.Should().Be(_tenantId);
        savedLead.ContactInfo.Name.Should().Be(contactInfo.Name);
        savedLead.ContactInfo.Email.Value.Should().Be(contactInfo.Email.Value);
        savedLead.Status.Should().Be(LeadState.New);
        savedLead.Source.Should().Be(LeadSource.Webshop);
    }

    [Fact]
    public async Task UpdateLead_WithStatusChange_ShouldPersistChanges()
    {
        // Arrange: Create and save Lead
        var contactInfo = CreateTestContact();
        var lead = Lead.Create(contactInfo, LeadSource.Referral, _assignedTo, _tenantId);

        await _repository.AddAsync(lead);
        await _context.SaveChangesAsync();

        lead.Status.Should().Be(LeadState.New);

        // Act: Update status
        lead.Contact();
        lead.Status.Should().Be(LeadState.Contacted);

        await _context.SaveChangesAsync();

        // Assert: Changes persisted
        var updatedLead = await _repository.GetByIdAsync(lead.Id);
        updatedLead.Should().NotBeNull();
        updatedLead!.Status.Should().Be(LeadState.Contacted);
    }

    [Fact]
    public async Task GetByIdAsync_WhenLeadExists_ShouldReturnLead()
    {
        // Arrange: Create and save Lead
        var contactInfo = CreateTestContact();
        var lead = Lead.Create(contactInfo, LeadSource.Partner, _assignedTo, _tenantId);

        await _repository.AddAsync(lead);
        await _context.SaveChangesAsync();

        // Act: Retrieve by ID
        var retrievedLead = await _repository.GetByIdAsync(lead.Id);

        // Assert: Lead found
        retrievedLead.Should().NotBeNull();
        retrievedLead!.Id.Should().Be(lead.Id);
        retrievedLead.ContactInfo.Name.Should().Be(contactInfo.Name);
    }

    [Fact]
    public async Task GetByIdAsync_WhenLeadDoesNotExist_ShouldReturnNull()
    {
        // Arrange: Non-existent ID
        var nonExistentId = Guid.NewGuid();

        // Act: Try to retrieve
        var retrievedLead = await _repository.GetByIdAsync(nonExistentId);

        // Assert: Not found
        retrievedLead.Should().BeNull();
    }

    [Fact]
    public async Task AddLead_WithActivitiesAndTasks_ShouldPersistOwnedCollections()
    {
        // Arrange: Create Lead with activities and tasks
        var contactInfo = CreateTestContact();
        var lead = Lead.Create(contactInfo, LeadSource.Webshop, _assignedTo, _tenantId);

        var activityId = lead.AddActivity(ActivityType.Call, "Discovery call", _assignedTo);
        var taskId = lead.AddTask("Follow up", DateTime.UtcNow.AddDays(3), CrmTaskPriority.High, _assignedTo);

        lead.Activities.Should().HaveCount(1);
        lead.Tasks.Should().HaveCount(1);

        // Act: Persist
        await _repository.AddAsync(lead);
        await _context.SaveChangesAsync();

        // Assert: Owned collections persisted
        var savedLead = await _repository.GetByIdAsync(lead.Id);
        savedLead.Should().NotBeNull();
        savedLead!.Activities.Should().HaveCount(1);
        savedLead.Activities.First().ActivityId.Should().Be(activityId);
        savedLead.Activities.First().Description.Should().Be("Discovery call");

        savedLead.Tasks.Should().HaveCount(1);
        savedLead.Tasks.First().TaskId.Should().Be(taskId);
        savedLead.Tasks.First().Title.Should().Be("Follow up");
        savedLead.Tasks.First().Priority.Should().Be(CrmTaskPriority.High);
    }

    private ContactInfo CreateTestContact(string name = "Test Company", string email = "test@example.com")
    {
        return new ContactInfo(
            name,
            new Email(email),
            null,
            "Test Contact Person");
    }
}
