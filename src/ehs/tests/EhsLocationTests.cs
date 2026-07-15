using FluentAssertions;
using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;
using Xunit;

namespace SpaceOS.Modules.Ehs.Domain.Tests;

public class EhsLocationTests
{
    private readonly Guid _tenantId = Guid.NewGuid();

    [Fact]
    public void Create_ShouldCreateActiveLocation()
    {
        // Act
        var location = EhsLocation.Create(_tenantId, "VAC-A", "Vác — főüzem / A csarnok", LocationKind.Hall);

        // Assert
        location.Should().NotBeNull();
        location.IsActive.Should().BeTrue();
        location.Code.Should().Be("VAC-A");
        location.Kind.Should().Be(LocationKind.Hall);
        location.ParentLocationId.Should().BeNull();
    }

    [Fact]
    public void Create_ShouldRaiseLocationCreatedEvent()
    {
        // Act
        var location = EhsLocation.Create(_tenantId, "VAC", "Vác — főüzem", LocationKind.Site);

        // Assert
        var domainEvents = location.PopDomainEvents();
        domainEvents.Should().ContainSingle();
        domainEvents.First().Should().BeOfType<LocationCreatedEvent>();
    }

    [Fact]
    public void Create_ShouldThrowWhenCodeMissing()
    {
        // Act
        var act = () => EhsLocation.Create(_tenantId, "", "Vác — főüzem", LocationKind.Site);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldLinkParent()
    {
        // Arrange
        var site = EhsLocation.Create(_tenantId, "VAC", "Vác — főüzem", LocationKind.Site);

        // Act
        var hall = EhsLocation.Create(_tenantId, "VAC-A", "A csarnok", LocationKind.Hall, site.LocationId);

        // Assert
        hall.ParentLocationId.Should().Be(site.LocationId);
    }

    [Fact]
    public void Update_ShouldChangeNameAndParent()
    {
        // Arrange
        var location = EhsLocation.Create(_tenantId, "VAC-A", "A csarnok", LocationKind.Hall);
        var newParentId = Guid.NewGuid();

        // Act
        location.Update("VAC-A2", "A2 csarnok", LocationKind.Zone, newParentId);

        // Assert
        location.Code.Should().Be("VAC-A2");
        location.Name.Should().Be("A2 csarnok");
        location.Kind.Should().Be(LocationKind.Zone);
        location.ParentLocationId.Should().Be(newParentId);
    }

    [Fact]
    public void Update_ShouldThrowWhenLocationIsItsOwnParent()
    {
        // Arrange
        var location = EhsLocation.Create(_tenantId, "VAC-A", "A csarnok", LocationKind.Hall);

        // Act
        var act = () => location.Update("VAC-A", "A csarnok", LocationKind.Hall, location.LocationId);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("A location cannot be its own parent*");
    }

    [Fact]
    public void Update_ShouldThrowWhenInactive()
    {
        // Arrange
        var location = EhsLocation.Create(_tenantId, "VAC-A", "A csarnok", LocationKind.Hall);
        location.Deactivate(hasActiveChildren: false);

        // Act
        var act = () => location.Update("VAC-B", "B csarnok", LocationKind.Hall, null);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot update an inactive location");
    }

    [Fact]
    public void Deactivate_ShouldSoftDeleteAndRaiseEvent()
    {
        // Arrange
        var location = EhsLocation.Create(_tenantId, "VAC-A", "A csarnok", LocationKind.Hall);
        location.PopDomainEvents();

        // Act
        location.Deactivate(hasActiveChildren: false);

        // Assert
        location.IsActive.Should().BeFalse();
        location.PopDomainEvents().Should().ContainSingle()
            .Which.Should().BeOfType<LocationDeactivatedEvent>();
    }

    [Fact]
    public void Deactivate_ShouldThrowWhenAlreadyInactive()
    {
        // Arrange
        var location = EhsLocation.Create(_tenantId, "VAC-A", "A csarnok", LocationKind.Hall);
        location.Deactivate(hasActiveChildren: false);

        // Act
        var act = () => location.Deactivate(hasActiveChildren: false);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Location is already inactive");
    }

    [Fact]
    public void Deactivate_ShouldThrowWhenActiveChildrenExist()
    {
        // Arrange
        var location = EhsLocation.Create(_tenantId, "VAC", "Vác — főüzem", LocationKind.Site);

        // Act
        var act = () => location.Deactivate(hasActiveChildren: true);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot deactivate a location that has active child locations");
    }
}
