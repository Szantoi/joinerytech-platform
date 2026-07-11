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

public sealed class GetCostBreakdownQueryHandlerTests
{
    private readonly Mock<IProjectCostCalculationService> _calculationServiceMock;
    private readonly IMemoryCache _cache;
    private readonly GetCostBreakdownQueryHandler _handler;

    public GetCostBreakdownQueryHandlerTests()
    {
        _calculationServiceMock = new Mock<IProjectCostCalculationService>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _handler = new GetCostBreakdownQueryHandler(_calculationServiceMock.Object, _cache);
    }

    [Fact]
    public async Task Handle_WithValidProjectId_ShouldReturnCostSummaryDto()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calculation = CreateSampleCalculation(projectId);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calculation);

        var query = new GetCostBreakdownQuery(projectId, tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.ProjectId.Should().Be(projectId);
        result.Value.Revenue.Should().NotBeNull();
        result.Value.Costs.Should().NotBeNull();
        result.Value.Margins.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_CalculatesMargins_Correctly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calculation = CreateSampleCalculation(projectId);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calculation);

        var query = new GetCostBreakdownQuery(projectId, tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Value.Margins.PlannedMargin.Should().NotBeNull();
        result.Value.Margins.ActualMargin.Should().NotBeNull();
        result.Value.Margins.EacMargin.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_MapsCosts_Correctly()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var calculation = CreateSampleCalculation(projectId);

        _calculationServiceMock
            .Setup(x => x.CalculateAsync(projectId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(calculation);

        var query = new GetCostBreakdownQuery(projectId, tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Value.Costs.Planned.Amount.Should().BeGreaterThan(0);
        result.Value.Costs.Actual.Amount.Should().BeGreaterThan(0);
        result.Value.Costs.Eac.Amount.Should().BeGreaterThan(0);
        result.Value.Costs.Variance.Amount.Should().NotBe(0);
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

        var query = new GetCostBreakdownQuery(projectId, tenantId);

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
}
