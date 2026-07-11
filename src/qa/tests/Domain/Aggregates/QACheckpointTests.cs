using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Events;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Domain.Aggregates;

public class QACheckpointTests
{
    private readonly Guid _tenantId = Guid.NewGuid();

    [Fact]
    public void Create_ShouldCreateValidCheckpoint()
    {
        // Arrange & Act
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Door Frame Inspection",
            CheckpointType.InProcess,
            CriticalLevel.Critical,
            "Inspect door frame dimensions");

        // Assert
        checkpoint.Should().NotBeNull();
        checkpoint.Name.Should().Be("Door Frame Inspection");
        checkpoint.CheckpointType.Should().Be(CheckpointType.InProcess);
        checkpoint.CriticalLevel.Should().Be(CriticalLevel.Critical);
        checkpoint.IsActive.Should().BeTrue();
        checkpoint.Criteria.Should().BeEmpty();

        var domainEvents = checkpoint.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<CheckpointCreatedEvent>();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidName_ShouldThrow(string? invalidName)
    {
        // Act
        var act = () => QACheckpoint.Create(
            _tenantId,
            invalidName!,
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Checkpoint name is required");
    }

    [Theory]
    [InlineData("AB")] // Too short
    [InlineData("This is a very long checkpoint name that exceeds the maximum allowed length of one hundred characters limit")] // Too long
    public void Create_WithInvalidNameLength_ShouldThrow(string invalidName)
    {
        // Act
        var act = () => QACheckpoint.Create(
            _tenantId,
            invalidName,
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Checkpoint name must be between 3 and 100 characters");
    }

    [Fact]
    public void Update_ShouldUpdateCheckpointProperties()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Initial Name",
            CheckpointType.InProcess,
            CriticalLevel.Minor);

        checkpoint.ClearDomainEvents();

        // Act
        checkpoint.Update("Updated Name", CriticalLevel.Critical, "Updated description");

        // Assert
        checkpoint.Name.Should().Be("Updated Name");
        checkpoint.CriticalLevel.Should().Be(CriticalLevel.Critical);
        checkpoint.Description.Should().Be("Updated description");

        var domainEvents = checkpoint.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<CheckpointUpdatedEvent>();
    }

    [Fact]
    public void Update_OnInactiveCheckpoint_ShouldThrow()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Test Checkpoint",
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        checkpoint.Deactivate();

        // Act
        var act = () => checkpoint.Update("New Name", CriticalLevel.Major);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot update inactive checkpoint");
    }

    [Fact]
    public void AddCriteria_ShouldAddValidCriteria()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Door Inspection",
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        checkpoint.ClearDomainEvents();

        // Act
        checkpoint.AddCriteria(CriteriaType.Dimensional, "Check height: 2100mm +/- 2mm");

        // Assert
        checkpoint.Criteria.Should().HaveCount(1);
        checkpoint.Criteria.First().Type.Should().Be(CriteriaType.Dimensional);
        checkpoint.Criteria.First().Description.Should().Be("Check height: 2100mm +/- 2mm");

        var domainEvents = checkpoint.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<CheckpointCriteriaAddedEvent>();
    }

    [Fact]
    public void AddCriteria_WithDuplicateType_ShouldThrow()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Door Inspection",
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        checkpoint.AddCriteria(CriteriaType.Dimensional, "First dimensional check");

        // Act
        var act = () => checkpoint.AddCriteria(CriteriaType.Dimensional, "Second dimensional check");

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Criteria type Dimensional already exists for this checkpoint");
    }

    [Fact]
    public void RemoveCriteria_ShouldRemoveExistingCriteria()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Door Inspection",
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        checkpoint.AddCriteria(CriteriaType.Dimensional, "Height check");
        var criteriaId = checkpoint.Criteria.First().Id;

        checkpoint.ClearDomainEvents();

        // Act
        checkpoint.RemoveCriteria(criteriaId);

        // Assert
        checkpoint.Criteria.Should().BeEmpty();

        var domainEvents = checkpoint.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<CheckpointCriteriaRemovedEvent>();
    }

    [Fact]
    public void RemoveCriteria_WithNonexistentId_ShouldThrow()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Door Inspection",
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        var nonexistentId = Guid.NewGuid().ToString();

        // Act
        var act = () => checkpoint.RemoveCriteria(nonexistentId);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage($"Criteria {nonexistentId} not found");
    }

    [Fact]
    public void Deactivate_ShouldDeactivateCheckpoint()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Test Checkpoint",
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        checkpoint.ClearDomainEvents();

        // Act
        checkpoint.Deactivate();

        // Assert
        checkpoint.IsActive.Should().BeFalse();

        var domainEvents = checkpoint.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<CheckpointDeactivatedEvent>();
    }

    [Fact]
    public void Deactivate_OnAlreadyInactiveCheckpoint_ShouldThrow()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Test Checkpoint",
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        checkpoint.Deactivate();

        // Act
        var act = () => checkpoint.Deactivate();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Checkpoint is already inactive");
    }

    [Fact]
    public void Reactivate_ShouldReactivateCheckpoint()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Test Checkpoint",
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        checkpoint.Deactivate();
        checkpoint.ClearDomainEvents();

        // Act
        checkpoint.Reactivate();

        // Assert
        checkpoint.IsActive.Should().BeTrue();

        var domainEvents = checkpoint.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<CheckpointReactivatedEvent>();
    }

    [Fact]
    public void Reactivate_OnAlreadyActiveCheckpoint_ShouldThrow()
    {
        // Arrange
        var checkpoint = QACheckpoint.Create(
            _tenantId,
            "Test Checkpoint",
            CheckpointType.InProcess,
            CriticalLevel.Critical);

        // Act
        var act = () => checkpoint.Reactivate();

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Checkpoint is already active");
    }
}
