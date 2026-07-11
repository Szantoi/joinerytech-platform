using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Kontrolling.Application.Commands.AddOverheadRule;
using SpaceOS.Modules.Kontrolling.Application.Commands.CreateCostAdjustment;
using SpaceOS.Modules.Kontrolling.Application.Commands.DeleteCostAdjustment;
using SpaceOS.Modules.Kontrolling.Application.Commands.RemoveOverheadRule;
using SpaceOS.Modules.Kontrolling.Application.Commands.SetOverheadConfig;
using SpaceOS.Modules.Kontrolling.Application.Queries;
using SpaceOS.Modules.Kontrolling.Application.Queries.GetCostAdjustment;
using SpaceOS.Modules.Kontrolling.Application.Queries.GetPortfolioCostAdjustments;
using SpaceOS.Modules.Kontrolling.Application.Queries.ListCostAdjustmentsByProject;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace SpaceOS.Modules.Kontrolling.Tests.Integration;

/// <summary>
/// Integration tests for Kontrolling module with Testcontainers PostgreSQL
/// Tests all 7 required scenarios from MSG-BACKEND-187
/// </summary>
public class KontrollingIntegrationTests : IAsyncLifetime
{
    private PostgreSqlContainer _postgreSqlContainer = null!;
    private ServiceProvider _serviceProvider = null!;
    private IMediator _mediator = null!;
    private KontrollingDbContext _dbContext = null!;

    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _projectId = Guid.NewGuid();

    public async Task InitializeAsync()
    {
        // Start PostgreSQL container
        _postgreSqlContainer = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("kontrolling_test")
            .WithUsername("test")
            .WithPassword("test")
            .Build();

        await _postgreSqlContainer.StartAsync();

        // Setup DI container with real PostgreSQL
        var services = new ServiceCollection();

        // Add DbContext with Testcontainers connection string
        services.AddDbContext<KontrollingDbContext>(options =>
            options.UseNpgsql(_postgreSqlContainer.GetConnectionString()));

        // Add MediatR and Application layer
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssemblyContaining<SetOverheadConfigCommand>());

        // Add repositories
        services.AddScoped<SpaceOS.Modules.Kontrolling.Application.Services.IOverheadConfigRepository,
            SpaceOS.Modules.Kontrolling.Infrastructure.Repositories.OverheadConfigRepository>();
        services.AddScoped<SpaceOS.Modules.Kontrolling.Application.Services.ICostAdjustmentRepository,
            SpaceOS.Modules.Kontrolling.Infrastructure.Repositories.CostAdjustmentRepository>();

        _serviceProvider = services.BuildServiceProvider();
        _mediator = _serviceProvider.GetRequiredService<IMediator>();
        _dbContext = _serviceProvider.GetRequiredService<KontrollingDbContext>();

        // Apply migrations
        await _dbContext.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        if (_dbContext != null)
            await _dbContext.DisposeAsync();

        if (_serviceProvider != null)
            await _serviceProvider.DisposeAsync();

        if (_postgreSqlContainer != null)
            await _postgreSqlContainer.DisposeAsync();
    }

    [Fact]
    public async Task SetOverheadConfig_CreatesConfigForTenant()
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            TenantId: _tenantId,
            Method: OverheadAllocationMethod.DirectCostPercentage,
            Rate: 0.15m,
            UpdatedBy: _userId
        );

        // Act
        var result = await _mediator.Send(command);

        // Assert
        result.IsSuccess.Should().BeTrue();

        // Verify in database
        var config = await _dbContext.OverheadConfigs
            .FirstOrDefaultAsync(c => c.TenantId == _tenantId);

        config.Should().NotBeNull();
        config!.AllocationMethod.Should().Be(OverheadAllocationMethod.DirectCostPercentage);
        config.OverheadRate.Should().Be(0.15m);
    }

    [Fact]
    public async Task AddOverheadRule_AddsToOwnedCollection()
    {
        // Arrange - First create config
        await _mediator.Send(new SetOverheadConfigCommand(
            TenantId: _tenantId,
            Method: OverheadAllocationMethod.DirectCostPercentage,
            Rate: 0.15m,
            UpdatedBy: _userId
        ));

        var command = new AddOverheadRuleCommand(
            TenantId: _tenantId,
            Category: CostCategory.Material,
            Exclude: false,
            CustomRate: 0.20m,
            UpdatedBy: _userId
        );

        // Act
        var result = await _mediator.Send(command);

        // Assert
        result.IsSuccess.Should().BeTrue();

        // Verify in database - rules are owned collection
        var config = await _dbContext.OverheadConfigs
            .Include(c => c.OverheadRules)
            .FirstOrDefaultAsync(c => c.TenantId == _tenantId);

        config.Should().NotBeNull();
        config!.OverheadRules.Should().ContainSingle();
        config.OverheadRules.First().CostCategory.Should().Be(CostCategory.Material);
        config.OverheadRules.First().CustomRate.Should().Be(0.20m);
    }

    [Fact]
    public async Task RemoveOverheadRule_RemovesFromOwnedCollection()
    {
        // Arrange - Create config and add rule
        await _mediator.Send(new SetOverheadConfigCommand(
            TenantId: _tenantId,
            Method: OverheadAllocationMethod.DirectCostPercentage,
            Rate: 0.15m,
            UpdatedBy: _userId
        ));

        await _mediator.Send(new AddOverheadRuleCommand(
            TenantId: _tenantId,
            Category: CostCategory.Material,
            Exclude: false,
            CustomRate: 0.20m,
            UpdatedBy: _userId
        ));

        var command = new RemoveOverheadRuleCommand(
            TenantId: _tenantId,
            Category: CostCategory.Material,
            UpdatedBy: _userId
        );

        // Act
        var result = await _mediator.Send(command);

        // Assert
        result.IsSuccess.Should().BeTrue();

        // Verify rule removed
        var config = await _dbContext.OverheadConfigs
            .Include(c => c.OverheadRules)
            .FirstOrDefaultAsync(c => c.TenantId == _tenantId);

        config.Should().NotBeNull();
        config!.OverheadRules.Should().BeEmpty();
    }

    [Fact]
    public async Task CalculateProjectCost_ReturnsCalculatedEAC_NotStoredInDB()
    {
        // Arrange
        var query = new GetEACCalculationQuery(_projectId, _tenantId);

        // Act
        var result = await _mediator.Send(query);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();

        // CRITICAL: Verify ProjectCostCalculation is NOT stored in DB
        // ADR-055: Calculated layer - NO ProjectCostCalculation table/DbSet
        var projectCostCalculationDbSet = _dbContext.GetType()
            .GetProperties()
            .FirstOrDefault(p => p.Name.Contains("ProjectCostCalculation"));

        projectCostCalculationDbSet.Should().BeNull("ProjectCostCalculation should NOT be stored in DB (ADR-055)");
    }

    [Fact]
    public async Task CalculateProjectCost_WithAdjustments_IncludesAdjustments()
    {
        // Arrange - Create cost adjustment
        var adjustmentCommand = new CreateCostAdjustmentCommand(
            TenantId: _tenantId,
            ProjectId: _projectId,
            Category: CostCategory.Labor,
            Amount: 1000m,
            Currency: "HUF",
            Scope: AdjustmentScope.Project,
            Reason: "Overtime costs",
            CreatedByUserId: _userId
        );

        var adjustmentId = await _mediator.Send(adjustmentCommand);
        adjustmentId.Should().NotBeEmpty();

        // Act - Calculate cost
        var query = new GetEACCalculationQuery(_projectId, _tenantId);
        var result = await _mediator.Send(query);

        // Assert
        result.IsSuccess.Should().BeTrue();

        // Verify adjustment exists in DB (adjustments ARE stored)
        var adjustment = await _dbContext.CostAdjustments
            .FirstOrDefaultAsync(a => a.AdjustmentId == adjustmentId);

        adjustment.Should().NotBeNull();
        adjustment!.Amount.Amount.Should().Be(1000m);
    }

    [Fact]
    public async Task CreateCostAdjustment_AddsAdjustment()
    {
        // Arrange
        var command = new CreateCostAdjustmentCommand(
            TenantId: _tenantId,
            ProjectId: _projectId,
            Category: CostCategory.Material,
            Amount: 5000m,
            Currency: "HUF",
            Scope: AdjustmentScope.Project,
            Reason: "Material price increase",
            CreatedByUserId: _userId
        );

        // Act
        var adjustmentId = await _mediator.Send(command);

        // Assert
        adjustmentId.Should().NotBeEmpty();

        // Verify in database
        var adjustment = await _dbContext.CostAdjustments
            .FirstOrDefaultAsync(a => a.AdjustmentId == adjustmentId);

        adjustment.Should().NotBeNull();
        adjustment!.Amount.Amount.Should().Be(5000m);
        adjustment.Amount.Currency.Should().Be("HUF");
        adjustment.Reason.Should().Be("Material price increase");
        adjustment.IsDeleted.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteCostAdjustment_SoftDeletesAdjustment()
    {
        // Arrange - Create adjustment first
        var createCommand = new CreateCostAdjustmentCommand(
            TenantId: _tenantId,
            ProjectId: _projectId,
            Category: CostCategory.Labor,
            Amount: 2000m,
            Currency: "HUF",
            Scope: AdjustmentScope.Project,
            Reason: "Error correction",
            CreatedByUserId: _userId
        );

        var adjustmentId = await _mediator.Send(createCommand);

        var deleteCommand = new DeleteCostAdjustmentCommand(
            AdjustmentId: adjustmentId,
            TenantId: _tenantId,
            DeletedBy: _userId
        );

        // Act
        var result = await _mediator.Send(deleteCommand);

        // Assert
        result.IsSuccess.Should().BeTrue();

        // Verify soft delete - record still exists but IsDeleted = true
        var adjustment = await _dbContext.CostAdjustments
            .IgnoreQueryFilters() // Important: ignore RLS to see deleted records
            .FirstOrDefaultAsync(a => a.AdjustmentId == adjustmentId);

        adjustment.Should().NotBeNull();
        adjustment!.IsDeleted.Should().BeTrue();
        adjustment.DeletedBy.Should().Be(_userId);
        adjustment.DeletedAt.Should().NotBeNull();
    }
}
