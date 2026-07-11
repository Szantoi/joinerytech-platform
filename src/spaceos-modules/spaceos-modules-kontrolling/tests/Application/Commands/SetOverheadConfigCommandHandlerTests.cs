namespace SpaceOS.Modules.Kontrolling.Tests.Application.Commands;

using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using SpaceOS.Modules.Kontrolling.Application.Commands.SetOverheadConfig;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using Xunit;

public sealed class SetOverheadConfigCommandHandlerTests
{
    private readonly Mock<IOverheadConfigRepository> _repositoryMock;
    private readonly IMemoryCache _cache;
    private readonly SetOverheadConfigCommandHandler _handler;

    public SetOverheadConfigCommandHandlerTests()
    {
        _repositoryMock = new Mock<IOverheadConfigRepository>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _handler = new SetOverheadConfigCommandHandler(_repositoryMock.Object, _cache);
    }

    [Fact]
    public async Task Handle_WithValidCommand_ShouldUpsertConfig()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var updatedBy = Guid.NewGuid();
        var command = new SetOverheadConfigCommand(
            tenantId,
            OverheadAllocationMethod.DirectCostPercentage,
            0.15m,
            updatedBy
        );

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _repositoryMock.Verify(
            x => x.UpsertAsync(It.Is<OverheadConfig>(c =>
                c.TenantId == tenantId &&
                c.Method == OverheadAllocationMethod.DirectCostPercentage &&
                c.Rate == 0.15m &&
                c.UpdatedBy == updatedBy
            ), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Theory]
    [InlineData(OverheadAllocationMethod.DirectCostPercentage, 0.15)]
    [InlineData(OverheadAllocationMethod.LaborHours, 5000)]
    [InlineData(OverheadAllocationMethod.Revenue, 0.1)]
    public async Task Handle_WithDifferentMethods_ShouldSucceed(OverheadAllocationMethod method, decimal rate)
    {
        // Arrange
        var command = new SetOverheadConfigCommand(
            Guid.NewGuid(),
            method,
            rate,
            Guid.NewGuid()
        );

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _repositoryMock.Verify(
            x => x.UpsertAsync(It.Is<OverheadConfig>(c => c.Method == method && c.Rate == rate),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_ShouldInvalidateCache()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var command = new SetOverheadConfigCommand(
            tenantId,
            OverheadAllocationMethod.LaborHours,
            5000m,
            Guid.NewGuid()
        );

        // Pre-populate cache
        var cacheKey = $"overhead-config-{tenantId}";
        _cache.Set(cacheKey, "test-value");

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        _cache.TryGetValue(cacheKey, out _).Should().BeFalse();
    }

    [Fact]
    public async Task Handle_ShouldInvalidatePortfolioCache()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var command = new SetOverheadConfigCommand(
            tenantId,
            OverheadAllocationMethod.Revenue,
            0.1m,
            Guid.NewGuid()
        );

        // Pre-populate cache
        var portfolioCacheKey = $"portfolio-{tenantId}";
        _cache.Set(portfolioCacheKey, "test-value");

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        _cache.TryGetValue(portfolioCacheKey, out _).Should().BeFalse();
    }

    [Fact]
    public async Task Handle_SetsUpdatedAtTimestamp()
    {
        // Arrange
        var beforeExecution = DateTime.UtcNow.AddSeconds(-1);
        var command = new SetOverheadConfigCommand(
            Guid.NewGuid(),
            OverheadAllocationMethod.DirectCostPercentage,
            0.2m,
            Guid.NewGuid()
        );

        // Act
        await _handler.Handle(command, CancellationToken.None);
        var afterExecution = DateTime.UtcNow.AddSeconds(1);

        // Assert
        _repositoryMock.Verify(
            x => x.UpsertAsync(It.Is<OverheadConfig>(c =>
                c.UpdatedAt >= beforeExecution &&
                c.UpdatedAt <= afterExecution
            ), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
