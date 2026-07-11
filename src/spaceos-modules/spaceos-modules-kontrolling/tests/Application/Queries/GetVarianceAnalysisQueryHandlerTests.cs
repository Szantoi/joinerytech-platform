namespace SpaceOS.Modules.Kontrolling.Tests.Application.Queries;

using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using SpaceOS.Modules.Kontrolling.Application.Queries;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Aggregates;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;
using Xunit;

public sealed class GetVarianceAnalysisQueryHandlerTests
{
    private readonly Mock<IProjectCostCalculationService> _calculationServiceMock;
    private readonly IMemoryCache _cache;
    private readonly GetVarianceAnalysisQueryHandler _handler;

    public GetVarianceAnalysisQueryHandlerTests()
    {
        _calculationServiceMock = new Mock<IProjectCostCalculationService>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _handler = new GetVarianceAnalysisQueryHandler(_calculationServiceMock.Object, _cache);
    }

    [Fact]
    public async Task Handle_WithValidProjectId_ShouldReturnVarianceAnalysisDto()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calculation = CreateSampleCalculation(projectId);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calculation);

        var query = new GetVarianceAnalysisQuery(projectId, tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.ProjectId.Should().Be(projectId);
        result.Value.Variances.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Handle_IdentifiesWorstPerformingCategory_Correctly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calculation = CreateCalculationWithHighMaterialVariance(projectId);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calculation);

        var query = new GetVarianceAnalysisQuery(projectId, tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Value.WorstPerformingCategory.Should().Be(CostCategory.Material);
    }

    [Fact]
    public async Task Handle_CalculatesVariancePercentages_Correctly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calculation = CreateSampleCalculation(projectId);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calculation);

        var query = new GetVarianceAnalysisQuery(projectId, tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        foreach (var variance in result.Value.Variances.Values)
        {
            variance.VariancePercentage.Should().NotBe(decimal.MaxValue);
        }
    }

    [Fact]
    public async Task Handle_WithZeroPlannedCost_ShouldHandleGracefully()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calculation = CreateCalculationWithZeroPlanned(projectId);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calculation);

        var query = new GetVarianceAnalysisQuery(projectId, tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Variances[CostCategory.Material].VariancePercentage.Should().Be(0);
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

        var query = new GetVarianceAnalysisQuery(projectId, tenantId);

        // Act
        await _handler.Handle(query, CancellationToken.None);
        await _handler.Handle(query, CancellationToken.None);

        // Assert
        _calculationServiceMock.Verify(
            x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()),
            Times.Once);
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
            [CostCategory.Labor] = (Money.FromHUF(10_000_000), Money.FromHUF(9_500_000))
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

    private static ProjectCostCalculation CreateCalculationWithHighMaterialVariance(Guid projectId)
    {
        var revenue = new Revenue(
            Planned: Money.FromHUF(50_000_000),
            Actual: Money.FromHUF(48_000_000)
        );

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>
        {
            [CostCategory.Material] = (Money.FromHUF(10_000_000), Money.FromHUF(20_000_000)), // 100% variance
            [CostCategory.Labor] = (Money.FromHUF(10_000_000), Money.FromHUF(10_500_000)) // 5% variance
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

    private static ProjectCostCalculation CreateCalculationWithZeroPlanned(Guid projectId)
    {
        var revenue = new Revenue(
            Planned: Money.FromHUF(50_000_000),
            Actual: Money.FromHUF(48_000_000)
        );

        var costData = new Dictionary<CostCategory, (Money planned, Money actual)>
        {
            [CostCategory.Material] = (Money.Zero("HUF"), Money.FromHUF(5_000_000))
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
