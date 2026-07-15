using FluentAssertions;
using SpaceOS.Modules.Ehs.Domain.Aggregates.HazardousMaterialAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;
using Xunit;

namespace SpaceOS.Modules.Ehs.Domain.Tests;

public class HazardousMaterialTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _locationId = Guid.NewGuid();

    [Fact]
    public void Create_ShouldCreateActiveMaterial()
    {
        // Act
        var material = CreateMaterial();

        // Assert
        material.Should().NotBeNull();
        material.Status.Should().Be(MaterialStatus.Active);
        material.Name.Should().Be("Aceton");
        material.GhsHazardClasses.Should().Contain("GHS02");
    }

    [Fact]
    public void Create_ShouldRaiseRegisteredEvent()
    {
        // Act
        var material = CreateMaterial();

        // Assert
        material.PopDomainEvents().Should().ContainSingle()
            .Which.Should().BeOfType<HazardousMaterialRegisteredEvent>();
    }

    [Fact]
    public void Create_ShouldThrowWhenExpiryBeforeIssue()
    {
        // Act
        var act = () => HazardousMaterial.Create(
            _tenantId, "Aceton", "VWR", _locationId, 25m, "l",
            sdsIssuedAt: DateTimeOffset.UtcNow,
            sdsExpiresAt: DateTimeOffset.UtcNow.AddDays(-1));

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("SdsExpiresAt must be after SdsIssuedAt*");
    }

    // ── SDS validity computation (TrainingStatus pattern) ────────────────

    [Fact]
    public void CheckSdsValidity_ShouldReturnValidWhenMoreThan30Days()
    {
        HazardousMaterial.CheckSdsValidity(DateTimeOffset.UtcNow.AddDays(31))
            .Should().Be(SdsValidity.Valid);
    }

    [Fact]
    public void CheckSdsValidity_ShouldReturnExpiringWithin30Days()
    {
        HazardousMaterial.CheckSdsValidity(DateTimeOffset.UtcNow.AddDays(15))
            .Should().Be(SdsValidity.Expiring);
    }

    [Fact]
    public void CheckSdsValidity_ShouldReturnExpiringJustBeforeExpiry()
    {
        HazardousMaterial.CheckSdsValidity(DateTimeOffset.UtcNow.AddHours(1))
            .Should().Be(SdsValidity.Expiring);
    }

    [Fact]
    public void CheckSdsValidity_ShouldReturnExpiredWhenPast()
    {
        HazardousMaterial.CheckSdsValidity(DateTimeOffset.UtcNow.AddDays(-1))
            .Should().Be(SdsValidity.Expired);
    }

    [Fact]
    public void SdsValidity_ShouldBeComputedFromExpiryDate()
    {
        // Arrange — SDS valid for a year
        var material = CreateMaterial();

        // Assert
        material.SdsValidity.Should().Be(SdsValidity.Valid);
    }

    // ── RenewSds ─────────────────────────────────────────────────────────

    [Fact]
    public void RenewSds_ShouldUpdateDatesAndDocument()
    {
        // Arrange
        var material = CreateMaterial();
        material.PopDomainEvents();
        var newIssuedAt = DateTimeOffset.UtcNow;
        var newExpiresAt = newIssuedAt.AddYears(2);
        var newDocumentId = Guid.NewGuid();

        // Act
        material.RenewSds(newIssuedAt, newExpiresAt, newDocumentId);

        // Assert
        material.SdsIssuedAt.Should().Be(newIssuedAt);
        material.SdsExpiresAt.Should().Be(newExpiresAt);
        material.SdsDocumentId.Should().Be(newDocumentId);
        material.PopDomainEvents().Should().ContainSingle()
            .Which.Should().BeOfType<SdsRenewedEvent>();
    }

    [Fact]
    public void RenewSds_ShouldThrowWhenArchived()
    {
        // Arrange
        var material = CreateMaterial();
        material.Archive();

        // Act
        var act = () => material.RenewSds(DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddYears(1));

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot renew SDS of an archived hazardous material");
    }

    // ── Lifecycle: Active → Archived ─────────────────────────────────────

    [Fact]
    public void Archive_ShouldTransitionToArchived()
    {
        // Arrange
        var material = CreateMaterial();
        material.PopDomainEvents();

        // Act
        material.Archive();

        // Assert
        material.Status.Should().Be(MaterialStatus.Archived);
        material.PopDomainEvents().Should().ContainSingle()
            .Which.Should().BeOfType<HazardousMaterialArchivedEvent>();
    }

    [Fact]
    public void Archive_ShouldThrowWhenAlreadyArchived()
    {
        // Arrange
        var material = CreateMaterial();
        material.Archive();

        // Act
        var act = () => material.Archive();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Hazardous material is already archived");
    }

    [Fact]
    public void UpdateMasterData_ShouldThrowWhenArchived()
    {
        // Arrange
        var material = CreateMaterial();
        material.Archive();

        // Act
        var act = () => material.UpdateMasterData("X", "Y", _locationId, 1m, "kg", null, null);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot update an archived hazardous material");
    }

    // Helper
    private HazardousMaterial CreateMaterial()
    {
        return HazardousMaterial.Create(
            _tenantId,
            "Aceton",
            "VWR",
            _locationId,
            25m,
            "l",
            sdsIssuedAt: DateTimeOffset.UtcNow.AddDays(-10),
            sdsExpiresAt: DateTimeOffset.UtcNow.AddYears(1),
            casNumber: "67-64-1",
            ghsHazardClasses: new List<string> { "GHS02", "GHS07" });
    }
}
