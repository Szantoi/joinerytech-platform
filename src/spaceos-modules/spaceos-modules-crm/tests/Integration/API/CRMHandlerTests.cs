using FluentAssertions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.CRM.Application.Commands.ContactLead;
using SpaceOS.Modules.CRM.Application.Commands.ConvertLeadToOpportunity;
using SpaceOS.Modules.CRM.Application.Commands.CreateLead;
using SpaceOS.Modules.CRM.Application.Commands.DisqualifyLead;
using SpaceOS.Modules.CRM.Application.Commands.QualifyLead;
using SpaceOS.Modules.CRM.Application.Commands.AddLeadActivity;
using SpaceOS.Modules.CRM.Application.Queries.GetLeadById;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Integration.API;

/// <summary>
/// Integration tests for CRM command/query handlers
/// Tests full CQRS pipeline with real database
/// </summary>
public class CRMHandlerTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container;
    private ServiceProvider _serviceProvider = null!;
    private IMediator _mediator = null!;

    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();

    public CRMHandlerTests()
    {
        _container = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("crm_handler_test")
            .WithUsername("test")
            .WithPassword("test")
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        var services = new ServiceCollection();

        // Add DbContext
        services.AddDbContext<CrmDbContext>(options =>
            options.UseNpgsql(_container.GetConnectionString()));

        // Add MediatR
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(CreateLeadCommand).Assembly));

        // Add repositories
        services.AddScoped(typeof(SpaceOS.Modules.CRM.Application.Interfaces.ILeadRepository),
            typeof(SpaceOS.Modules.CRM.Infrastructure.Repositories.LeadRepository));
        services.AddScoped(typeof(SpaceOS.Modules.CRM.Application.Interfaces.IOpportunityRepository),
            typeof(SpaceOS.Modules.CRM.Infrastructure.Repositories.OpportunityRepository));

        _serviceProvider = services.BuildServiceProvider();
        _mediator = _serviceProvider.GetRequiredService<IMediator>();

        // Run migrations
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CrmDbContext>();
        await context.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _serviceProvider.DisposeAsync();
        await _container.DisposeAsync();
    }

    [Fact]
    public async Task CreateLeadHandler_WithValidData_ShouldReturnLeadId()
    {
        // Arrange
        var command = new CreateLeadCommand
        {
            TenantId = _tenantId,
            Name = "Acme Corp",
            Email = "john.doe@acme.com",
            Phone = null,
            Company = "Acme Corporation",
            Source = "Website",
            AssignedTo = _userId
        };

        // Act
        var result = await _mediator.Send(command);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetLeadByIdHandler_AfterCreation_ShouldReturnLeadData()
    {
        // Arrange: Create a Lead first
        var leadId = await CreateTestLead("Test Company", "test@example.com");

        var query = new GetLeadByIdQuery
        {
            TenantId = _tenantId,
            LeadId = leadId
        };

        // Act
        var result = await _mediator.Send(query);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.Id.Should().Be(leadId);
        result.Value.Name.Should().Be("Test Company");
        result.Value.Email.Should().Be("test@example.com");
        result.Value.Status.Should().Be("New");
    }

    [Fact]
    public async Task ContactLeadHandler_WithValidId_ShouldTransitionToContacted()
    {
        // Arrange: Create a Lead
        var leadId = await CreateTestLead("Contact Test", "contact@example.com");

        var command = new ContactLeadCommand
        {
            TenantId = _tenantId,
            LeadId = leadId
        };

        // Act
        var result = await _mediator.Send(command);

        // Assert
        result.IsSuccess.Should().BeTrue();

        // Verify state changed
        var query = new GetLeadByIdQuery { TenantId = _tenantId, LeadId = leadId };
        var leadResult = await _mediator.Send(query);
        leadResult.Value.Status.Should().Be("Contacted");
    }

    [Fact]
    public async Task QualifyLeadHandler_AfterContact_ShouldTransitionToQualified()
    {
        // Arrange: Create and contact a Lead
        var leadId = await CreateTestLead("Qualify Test", "qualify@example.com");

        // Add activity (required for qualification)
        var addActivityCmd = new AddLeadActivityCommand
        {
            TenantId = _tenantId,
            LeadId = leadId,
            ActivityType = "Call",
            Description = "Discovery call",
            CreatedBy = _userId
        };
        await _mediator.Send(addActivityCmd);

        var contactCmd = new ContactLeadCommand { TenantId = _tenantId, LeadId = leadId };
        await _mediator.Send(contactCmd);

        var qualifyCmd = new QualifyLeadCommand
        {
            TenantId = _tenantId,
            LeadId = leadId
        };

        // Act
        var result = await _mediator.Send(qualifyCmd);

        // Assert
        result.IsSuccess.Should().BeTrue();

        // Verify state changed
        var query = new GetLeadByIdQuery { TenantId = _tenantId, LeadId = leadId };
        var leadResult = await _mediator.Send(query);
        leadResult.Value.Status.Should().Be("Qualified");
    }

    [Fact]
    public async Task ConvertLeadToOpportunityHandler_WhenQualified_ShouldReturnOpportunityId()
    {
        // Arrange: Create, contact, and qualify a Lead
        var leadId = await CreateTestLead("Convert Test", "convert@example.com");

        // Add activity
        var addActivityCmd = new AddLeadActivityCommand
        {
            TenantId = _tenantId,
            LeadId = leadId,
            ActivityType = "Email",
            Description = "Initial contact",
            CreatedBy = _userId
        };
        await _mediator.Send(addActivityCmd);

        var contactCmd = new ContactLeadCommand { TenantId = _tenantId, LeadId = leadId };
        await _mediator.Send(contactCmd);

        var qualifyCmd = new QualifyLeadCommand { TenantId = _tenantId, LeadId = leadId };
        await _mediator.Send(qualifyCmd);

        var convertCmd = new ConvertLeadToOpportunityCommand
        {
            TenantId = _tenantId,
            LeadId = leadId,
            EstimatedValue = 100000,
            Currency = "HUF"
        };

        // Act
        var result = await _mediator.Send(convertCmd);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeEmpty();

        // Verify Lead status changed to ConvertedToOpportunity
        var query = new GetLeadByIdQuery { TenantId = _tenantId, LeadId = leadId };
        var leadResult = await _mediator.Send(query);
        leadResult.Value.Status.Should().Be("ConvertedToOpportunity");
        leadResult.Value.OpportunityRef.Should().Be(result.Value);
    }

    [Fact]
    public async Task DisqualifyLeadHandler_WithReason_ShouldTransitionToDisqualified()
    {
        // Arrange: Create a Lead
        var leadId = await CreateTestLead("Disqualify Test", "disqualify@example.com");

        var command = new DisqualifyLeadCommand
        {
            TenantId = _tenantId,
            LeadId = leadId,
            Reason = "Not interested in services"
        };

        // Act
        var result = await _mediator.Send(command);

        // Assert
        result.IsSuccess.Should().BeTrue();

        // Verify state changed
        var query = new GetLeadByIdQuery { TenantId = _tenantId, LeadId = leadId };
        var leadResult = await _mediator.Send(query);
        leadResult.Value.Status.Should().Be("Disqualified");
    }

    private async Task<Guid> CreateTestLead(string name, string email)
    {
        var command = new CreateLeadCommand
        {
            TenantId = _tenantId,
            Name = name,
            Email = email,
            Phone = null,
            Company = "Test Contact",
            Source = "Website",
            AssignedTo = _userId
        };

        var result = await _mediator.Send(command);
        return result.Value;
    }
}
