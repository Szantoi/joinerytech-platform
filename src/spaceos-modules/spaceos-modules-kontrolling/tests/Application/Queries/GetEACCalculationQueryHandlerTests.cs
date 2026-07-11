namespace SpaceOS.Modules.Kontrolling.Tests.Application.Queries;

using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Queries;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Aggregates;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;
using Xunit;

public sealed class GetEACCalculationQueryHandlerTests
{
    private readonly Mock<IProjectCostCalculationService> _calculationServiceMock;
    private readonly IMemoryCache _cache;
    private readonly GetEACCalculationQueryHandler _handler;

    public GetEACCalculationQueryHandlerTests()
    {
        _calculationServiceMock = new Mock<IProjectCostCalculationService>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _handler = new GetEACCalculationQueryHandler(_calculationServiceMock.Object, _cache);
    }

    [Fact]
    public async Task Handle_WithValidProjectId_ShouldReturnEACCalculationDto()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calculation = CreateSampleCalculation(projectId);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calculation);

        var query = new GetEACCalculationQuery(projectId, tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.ProjectId.Should().Be(projectId);
        result.Value.CostByCategory.Should().HaveCount(3);
        result.Value.TotalEac.Amount.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task Handle_CachedResult_ShouldNotCallServiceAgain()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calculation = CreateSampleCalculation(projectId);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calculation);

        var query = new GetEACCalculationQuery(projectId, tenantId);

        // Act
        await _handler.Handle(query, CancellationToken.None);
        await _handler.Handle(query, CancellationToken.None); // Second call should use cache

        // Assert
        _calculationServiceMock.Verify(
            x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_WithDifferentProjects_ShouldCacheSeparately()
    {
        // Arrange
        var project1 = Guid.NewGuid();
        var project2 = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calc1 = CreateSampleCalculation(project1);
        var calc2 = CreateSampleCalculation(project2);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(project1, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calc1);
        _calculationServiceMock
            .Setup(x => x.CalculateAsync(project2, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calc2);

        var query1 = new GetEACCalculationQuery(project1, tenantId);
        var query2 = new GetEACCalculationQuery(project2, tenantId);

        // Act
        var result1 = await _handler.Handle(query1, CancellationToken.None);
        var result2 = await _handler.Handle(query2, CancellationToken.None);

        // Assert
        result1.Value.ProjectId.Should().Be(project1);
        result2.Value.ProjectId.Should().Be(project2);
        _calculationServiceMock.Verify(
            x => x.CalculateAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }

    [Fact]
    public async Task Handle_MapsAllCategories_Correctly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calculation = CreateSampleCalculation(projectId);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calculation);

        var query = new GetEACCalculationQuery(projectId, tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Value.CostByCategory.Should().ContainKey(CostCategory.Material);
        result.Value.CostByCategory.Should().ContainKey(CostCategory.Labor);
        result.Value.CostByCategory.Should().ContainKey(CostCategory.Logistics);

        var materialCost = result.Value.CostByCategory[CostCategory.Material];
        materialCost.Planned.Amount.Should().BeGreaterThan(0);
        materialCost.Actual.Amount.Should().BeGreaterThan(0);
        materialCost.Projected.Amount.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task Handle_MapsOverheadMethod_Correctly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calculation = CreateSampleCalculation(projectId);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calculation);

        var query = new GetEACCalculationQuery(projectId, tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Value.OverheadMethod.Should().Be(OverheadAllocationMethod.DirectCostPercentage);
    }

    private static ProjectCostCalculation CreateSampleCalculation(Guid projectId)
    {
        var revenue = new Revenue(
            Planned: Money.FromHUF(50_000_000),
            Actual: Money.FromHUF(48_000_000)
        );

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>
        {
            [CostCategory.Material] = (Money.FromHUF(15_000_000), Money.FromHUF(16_000_000)),
            [CostCategory.Labor] = (Money.FromHUF(10_000_000), Money.FromHUF(9_500_000)),
            [CostCategory.Logistics] = (Money.FromHUF(2_000_000), Money.FromHUF(2_100_000))
        };

        return ProjectCostCalculation.Calculate(
            projectId,
            Guid.NewGuid(),
            revenue,
            costData,
            OverheadAllocationMethod.DirectCostPercentage,
            0.15m
        );
    }
}
