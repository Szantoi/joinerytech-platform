namespace SpaceOS.Modules.Kontrolling.Tests.Application.Commands;

using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using SpaceOS.Modules.Kontrolling.Application.Commands.DeleteCostAdjustment;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;
using Xunit;

public sealed class DeleteCostAdjustmentCommandHandlerTests
{
    private readonly Mock<ICostAdjustmentRepository> _repositoryMock;
    private readonly IMemoryCache _cache;
    private readonly DeleteCostAdjustmentCommandHandler _handler;

    public DeleteCostAdjustmentCommandHandlerTests()
    {
        _repositoryMock = new Mock<ICostAdjustmentRepository>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _handler = new DeleteCostAdjustmentCommandHandler(_repositoryMock.Object, _cache);
    }

    [Fact]
    public async Task Handle_WithExistingAdjustment_ShouldSoftDelete()
    {
        // Arrange
        var adjustmentId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var deletedBy = Guid.NewGuid();
        var adjustment = CostAdjustment.Create(
            tenantId,
            Guid.NewGuid(),
            CostCategory.Material,
            Money.FromHUF(5000),
            AdjustmentScope.Project,
            "Test adjustment",
            Guid.NewGuid()
        );

        _repositoryMock
            .Setup(x => x.GetByIdAsync(adjustmentId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(adjustment);

        var command = new DeleteCostAdjustmentCommand(adjustmentId, tenantId, deletedBy);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        adjustment.IsDeleted.Should().BeTrue();
        adjustment.DeletedBy.Should().Be(deletedBy);
        _repositoryMock.Verify(
            x => x.SaveChangesAsync(It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_WithNonExistingAdjustment_ShouldReturnNotFound()
    {
        // Arrange
        var adjustmentId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();

        _repositoryMock
            .Setup(x => x.GetByIdAsync(adjustmentId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((CostAdjustment?)null);

        var command = new DeleteCostAdjustmentCommand(adjustmentId, tenantId, Guid.NewGuid());

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Status.Should().Be(Ardalis.Result.ResultStatus.NotFound);
    }

    [Fact]
    public async Task Handle_WithAlreadyDeletedAdjustment_ShouldReturnError()
    {
        // Arrange
        var adjustmentId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var adjustment = CostAdjustment.Create(
            tenantId,
            Guid.NewGuid(),
            CostCategory.Labor,
            Money.FromHUF(3000),
            AdjustmentScope.Project,
            "Already deleted",
            Guid.NewGuid()
        );
        adjustment.Delete(Guid.NewGuid()); // Already deleted

        _repositoryMock
            .Setup(x => x.GetByIdAsync(adjustmentId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(adjustment);

        var command = new DeleteCostAdjustmentCommand(adjustmentId, tenantId, Guid.NewGuid());

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Status.Should().Be(Ardalis.Result.ResultStatus.Error);
        result.Errors.Should().Contain("Cost adjustment is already deleted");
    }

    [Fact]
    public async Task Handle_WithProjectScopedAdjustment_ShouldInvalidateProjectCache()
    {
        // Arrange
        var adjustmentId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var adjustment = CostAdjustment.Create(
            tenantId,
            projectId,
            CostCategory.Material,
            Money.FromHUF(5000),
            AdjustmentScope.Project,
            "Project adjustment",
            Guid.NewGuid()
        );

        _repositoryMock
            .Setup(x => x.GetByIdAsync(adjustmentId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(adjustment);

        // Pre-populate cache
        _cache.Set($"project-cost-{projectId}", "test");
        _cache.Set($"eac-{projectId}", "test");

        var command = new DeleteCostAdjustmentCommand(adjustmentId, tenantId, Guid.NewGuid());

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        _cache.TryGetValue($"project-cost-{projectId}", out _).Should().BeFalse();
        _cache.TryGetValue($"eac-{projectId}", out _).Should().BeFalse();
    }

    [Fact]
    public async Task Handle_ShouldInvalidatePortfolioCache()
    {
        // Arrange
        var adjustmentId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var adjustment = CostAdjustment.Create(
            tenantId,
            Guid.NewGuid(),
            CostCategory.Logistics,
            Money.FromHUF(2000),
            AdjustmentScope.Project,
            "Test",
            Guid.NewGuid()
        );

        _repositoryMock
            .Setup(x => x.GetByIdAsync(adjustmentId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(adjustment);

        // Pre-populate cache
        _cache.Set($"portfolio-{tenantId}", "test");

        var command = new DeleteCostAdjustmentCommand(adjustmentId, tenantId, Guid.NewGuid());

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        _cache.TryGetValue($"portfolio-{tenantId}", out _).Should().BeFalse();
    }

    [Fact]
    public async Task Handle_SetsDeletedAtTimestamp()
    {
        // Arrange
        var adjustmentId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var adjustment = CostAdjustment.Create(
            tenantId,
            Guid.NewGuid(),
            CostCategory.Material,
            Money.FromHUF(5000),
            AdjustmentScope.Project,
            "Test",
            Guid.NewGuid()
        );

        _repositoryMock
            .Setup(x => x.GetByIdAsync(adjustmentId, tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(adjustment);

        var command = new DeleteCostAdjustmentCommand(adjustmentId, tenantId, Guid.NewGuid());

        var beforeExecution = DateTime.UtcNow.AddSeconds(-1);

        // Act
        await _handler.Handle(command, CancellationToken.None);

        var afterExecution = DateTime.UtcNow.AddSeconds(1);

        // Assert
        adjustment.DeletedAt.Should().NotBeNull();
        adjustment.DeletedAt.Should().BeOnOrAfter(beforeExecution);
        adjustment.DeletedAt.Should().BeOnOrBefore(afterExecution);
    }
}
