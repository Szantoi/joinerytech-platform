namespace SpaceOS.Modules.Kontrolling.Tests.Application.Queries;

using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using SpaceOS.Modules.Kontrolling.Application.Queries;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Aggregates;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using Xunit;

public sealed class GetOverheadConfigQueryHandlerTests
{
    private readonly Mock<IOverheadConfigRepository> _repositoryMock;
    private readonly IMemoryCache _cache;
    private readonly GetOverheadConfigQueryHandler _handler;

    public GetOverheadConfigQueryHandlerTests()
    {
        _repositoryMock = new Mock<IOverheadConfigRepository>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _handler = new GetOverheadConfigQueryHandler(_repositoryMock.Object, _cache);
    }

    [Fact]
    public async Task Handle_WithExistingConfig_ShouldReturnDto()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var updatedBy = Guid.NewGuid();
        var config = OverheadConfig.Create(
            tenantId,
            OverheadAllocationMethod.DirectCostPercentage,
            0.15m,
            updatedBy
        );

        _repositoryMock
            .Setup(x => x.GetByTenantAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(config);

        var query = new GetOverheadConfigQuery(tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.TenantId.Should().Be(tenantId);
        result.Value.AllocationMethod.Should().Be(OverheadAllocationMethod.DirectCostPercentage);
        result.Value.OverheadRate.Should().Be(0.15m);
    }

    [Fact]
    public async Task Handle_WithNonExistingConfig_ShouldReturnNotFound()
    {
        // Arrange
        var tenantId = Guid.NewGuid();

        _repositoryMock
            .Setup(x => x.GetByTenantAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((OverheadConfig?)null);

        var query = new GetOverheadConfigQuery(tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Status.Should().Be(Ardalis.Result.ResultStatus.NotFound);
    }

    [Fact]
    public async Task Handle_CachedResult_ShouldNotCallRepositoryAgain()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var config = OverheadConfig.Create(
            tenantId,
            OverheadAllocationMethod.LaborHours,
            5000m,
            Guid.NewGuid()
        );

        _repositoryMock
            .Setup(x => x.GetByTenantAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(config);

        var query = new GetOverheadConfigQuery(tenantId);

        // Act
        await _handler.Handle(query, CancellationToken.None);
        await _handler.Handle(query, CancellationToken.None);

        // Assert
        _repositoryMock.Verify(
            x => x.GetByTenantAsync(tenantId, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Theory]
    [InlineData(OverheadAllocationMethod.DirectCostPercentage)]
    [InlineData(OverheadAllocationMethod.LaborHours)]
    [InlineData(OverheadAllocationMethod.Revenue)]
    public async Task Handle_WithDifferentMethods_ShouldMapCorrectly(OverheadAllocationMethod method)
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var config = OverheadConfig.Create(
            tenantId,
            method,
            0.2m,
            Guid.NewGuid()
        );

        _repositoryMock
            .Setup(x => x.GetByTenantAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(config);

        var query = new GetOverheadConfigQuery(tenantId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Value.AllocationMethod.Should().Be(method);
    }
}
