using FluentAssertions;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Repositories;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

/// <summary>
/// Integration tests for EhsLocationRepository (hierarchical location registry).
/// </summary>
[Collection(EhsInfrastructureCollection.Name)]
public class EhsLocationRepositoryTests : PostgresTestBase
{
    public EhsLocationRepositoryTests(EhsPostgresFixture fixture) : base(fixture) { }

    private EhsLocationRepository Repository => new(DbContext);
    private readonly Guid _tenantId = Guid.NewGuid();

    [Fact]
    public async Task AddAsync_ShouldPersistLocation()
    {
        // Arrange
        var location = EhsLocation.Create(_tenantId, "VAC", "Vác — főüzem", LocationKind.Site);

        // Act
        await Repository.AddAsync(location, CancellationToken.None);

        // Assert
        var retrieved = await Repository.GetByIdAsync(location.LocationId, _tenantId, CancellationToken.None);
        retrieved.Should().NotBeNull();
        retrieved!.Code.Should().Be("VAC");
        retrieved.Kind.Should().Be(LocationKind.Site);
        retrieved.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task ListAsync_ShouldFilterByActiveAndKind()
    {
        // Arrange — site + hall (child) + deactivated zone
        var site = EhsLocation.Create(_tenantId, "VAC", "Vác — főüzem", LocationKind.Site);
        var hall = EhsLocation.Create(_tenantId, "VAC-A", "A csarnok", LocationKind.Hall, site.LocationId);
        var zone = EhsLocation.Create(_tenantId, "VAC-A1", "A1 zóna", LocationKind.Zone, hall.LocationId);
        zone.Deactivate(hasActiveChildren: false);

        await Repository.AddAsync(site, CancellationToken.None);
        await Repository.AddAsync(hall, CancellationToken.None);
        await Repository.AddAsync(zone, CancellationToken.None);

        // Act + Assert — activeOnly hides the deactivated zone
        var active = await Repository.ListAsync(new LocationFilter(ActiveOnly: true), _tenantId, CancellationToken.None);
        active.Should().HaveCount(2);

        // Act + Assert — kind filter
        var halls = await Repository.ListAsync(new LocationFilter(Kind: LocationKind.Hall), _tenantId, CancellationToken.None);
        halls.Should().ContainSingle().Which.Code.Should().Be("VAC-A");
    }

    [Fact]
    public async Task HasActiveChildrenAsync_ShouldDetectActiveChildren()
    {
        // Arrange
        var site = EhsLocation.Create(_tenantId, "VAC", "Vác — főüzem", LocationKind.Site);
        var hall = EhsLocation.Create(_tenantId, "VAC-A", "A csarnok", LocationKind.Hall, site.LocationId);
        await Repository.AddAsync(site, CancellationToken.None);
        await Repository.AddAsync(hall, CancellationToken.None);

        // Act + Assert — site has an active child
        (await Repository.HasActiveChildrenAsync(site.LocationId, _tenantId, CancellationToken.None))
            .Should().BeTrue();

        // Deactivate the child → guard clears
        hall.Deactivate(hasActiveChildren: false);
        await Repository.UpdateAsync(hall, CancellationToken.None);

        (await Repository.HasActiveChildrenAsync(site.LocationId, _tenantId, CancellationToken.None))
            .Should().BeFalse();
    }

    [Fact]
    public async Task GetByIdAsync_ShouldIsolateTenants()
    {
        // Arrange
        var location = EhsLocation.Create(_tenantId, "VAC", "Vác — főüzem", LocationKind.Site);
        await Repository.AddAsync(location, CancellationToken.None);

        // Act — different tenant must not see the location
        var otherTenantResult = await Repository.GetByIdAsync(location.LocationId, Guid.NewGuid(), CancellationToken.None);

        // Assert
        otherTenantResult.Should().BeNull();
    }
}
