namespace SpaceOS.Modules.Kontrolling.Tests.Application.Commands;

using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using SpaceOS.Modules.Kontrolling.Application.Commands.UpdateOverheadConfig;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using Xunit;

public sealed class UpdateOverheadConfigCommandHandlerTests
{
    private readonly Mock<IOverheadConfigRepository> _repositoryMock;
    private readonly IMemoryCache _cache;
    private readonly UpdateOverheadConfigCommandHandler _handler;

    public UpdateOverheadConfigCommandHandlerTests()
    {
        _repositoryMock = new Mock<IOverheadConfigRepository>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _handler = new UpdateOverheadConfigCommandHandler(_repositoryMock.Object, _cache);
    }

    [Fact]
    public async Task Handle_WithExistingConfig_ShouldUpdateConfig()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var existingConfig = new OverheadConfig(
            tenantId,
            OverheadAllocationMethod.LaborHours,
            5000m,
            DateTime.UtcNow.AddDays(-1),
            Guid.NewGuid()
        );

        _repositoryMock
            .Setup(x => x.GetByTenantAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingConfig);

        var command = new UpdateOverheadConfigCommand(
            tenantId,
            OverheadAllocationMethod.DirectCostPercentage,
            0.2m,
            Guid.NewGuid()
        );

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _repositoryMock.Verify(
            x => x.UpsertAsync(It.Is<OverheadConfig>(c =>
                c.TenantId == tenantId &&
                c.Method == OverheadAllocationMethod.DirectCostPercentage &&
                c.Rate == 0.2m
            ), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_WithNonExistingConfig_ShouldReturnNotFound()
    {
        // Arrange
        var tenantId = Guid.NewGuid();

        _repositoryMock
            .Setup(x => x.GetByTenantAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((OverheadConfig?)null);

        var command = new UpdateOverheadConfigCommand(
            tenantId,
            OverheadAllocationMethod.Revenue,
            0.1m,
            Guid.NewGuid()
        );

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Status.Should().Be(Ardalis.Result.ResultStatus.NotFound);
        _repositoryMock.Verify(
            x => x.UpsertAsync(It.IsAny<OverheadConfig>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Handle_ShouldInvalidateCache()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var existingConfig = new OverheadConfig(
            tenantId,
            OverheadAllocationMethod.LaborHours,
            5000m,
            DateTime.UtcNow.AddDays(-1),
            Guid.NewGuid()
        );

        _repositoryMock
            .Setup(x => x.GetByTenantAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingConfig);

        var command = new UpdateOverheadConfigCommand(
            tenantId,
            OverheadAllocationMethod.Revenue,
            0.15m,
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
    public async Task Handle_UpdatesTimestamp()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var oldTimestamp = DateTime.UtcNow.AddDays(-10);
        var existingConfig = new OverheadConfig(
            tenantId,
            OverheadAllocationMethod.LaborHours,
            5000m,
            oldTimestamp,
            Guid.NewGuid()
        );

        _repositoryMock
            .Setup(x => x.GetByTenantAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingConfig);

        var command = new UpdateOverheadConfigCommand(
            tenantId,
            OverheadAllocationMethod.Revenue,
            0.1m,
            Guid.NewGuid()
        );

        var beforeExecution = DateTime.UtcNow.AddSeconds(-1);

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
