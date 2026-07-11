using FluentAssertions;
using SpaceOS.Modules.Ehs.Domain.Aggregates.TrainingRecordAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;
using Xunit;

namespace SpaceOS.Modules.Ehs.Domain.Tests;

public class TrainingRecordTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _employeeId = Guid.NewGuid();

    [Fact]
    public void Create_ShouldCreateTrainingRecordWithoutExpiry()
    {
        // Arrange
        var completedAt = DateTimeOffset.UtcNow.AddDays(-30);

        // Act
        var record = TrainingRecord.Create(
            _tenantId,
            _employeeId,
            "First Aid",
            completedAt,
            "Red Cross",
            expiresAt: null,
            certificateNumber: "FA-12345");

        // Assert
        record.Should().NotBeNull();
        record.TrainingType.Should().Be("First Aid");
        record.Status.Should().Be(TrainingStatus.Valid);
        record.ExpiresAt.Should().BeNull();
    }

    [Fact]
    public void CheckTrainingExpiry_ShouldReturnValid_WhenMoreThan30Days()
    {
        // Arrange
        var expiresAt = DateTimeOffset.UtcNow.AddDays(60);

        // Act
        var status = TrainingRecord.CheckTrainingExpiry(expiresAt);

        // Assert
        status.Should().Be(TrainingStatus.Valid);
    }

    [Fact]
    public void CheckTrainingExpiry_ShouldReturnExpiring_When30DaysOrLess()
    {
        // Arrange
        var expiresAt = DateTimeOffset.UtcNow.AddDays(15);

        // Act
        var status = TrainingRecord.CheckTrainingExpiry(expiresAt);

        // Assert
        status.Should().Be(TrainingStatus.Expiring);
    }

    [Fact]
    public void CheckTrainingExpiry_ShouldReturnExpired_WhenPastExpiration()
    {
        // Arrange
        var expiresAt = DateTimeOffset.UtcNow.AddDays(-10);

        // Act
        var status = TrainingRecord.CheckTrainingExpiry(expiresAt);

        // Assert
        status.Should().Be(TrainingStatus.Expired);
    }

    [Fact]
    public void CheckTrainingExpiry_ShouldReturnValid_WhenNoExpiration()
    {
        // Act
        var status = TrainingRecord.CheckTrainingExpiry(null);

        // Assert
        status.Should().Be(TrainingStatus.Valid);
    }

    [Fact]
    public void Renew_ShouldCreateNewTrainingRecord()
    {
        // Arrange
        var originalRecord = CreateTrainingRecord(DateTimeOffset.UtcNow.AddYears(-1));
        var newCompletedAt = DateTimeOffset.UtcNow;
        var newExpiresAt = DateTimeOffset.UtcNow.AddYears(1);

        // Act
        var renewedRecord = originalRecord.Renew(newCompletedAt, newExpiresAt, "FA-67890");

        // Assert
        renewedRecord.Should().NotBeNull();
        renewedRecord.TrainingRecordId.Should().NotBe(originalRecord.TrainingRecordId);
        renewedRecord.CompletedAt.Should().Be(newCompletedAt);
        renewedRecord.ExpiresAt.Should().Be(newExpiresAt);
        renewedRecord.CertificateNumber.Should().Be("FA-67890");
    }

    [Fact]
    public void Create_ShouldRaiseTrainingRecordCreatedEvent()
    {
        // Act
        var record = CreateTrainingRecord(DateTimeOffset.UtcNow.AddDays(-7));

        // Assert
        var domainEvents = record.PopDomainEvents();
        domainEvents.Should().ContainSingle();
        domainEvents.First().Should().BeOfType<TrainingRecordCreatedEvent>();

        var createdEvent = (TrainingRecordCreatedEvent)domainEvents.First();
        createdEvent.EmployeeId.Should().Be(_employeeId);
        createdEvent.TrainingType.Should().Be("Fire Safety");
    }

    [Theory]
    [InlineData(90, TrainingStatus.Valid)]     // >30 days
    [InlineData(30, TrainingStatus.Expiring)]  // =30 days
    [InlineData(15, TrainingStatus.Expiring)]  // <30 days
    [InlineData(1, TrainingStatus.Expiring)]   // 1 day
    [InlineData(-1, TrainingStatus.Expired)]   // expired
    public void Status_ShouldCalculateCorrectly(int daysUntilExpiry, TrainingStatus expectedStatus)
    {
        // Arrange
        var expiresAt = DateTimeOffset.UtcNow.AddDays(daysUntilExpiry);
        var record = TrainingRecord.Create(
            _tenantId,
            _employeeId,
            "Test Training",
            DateTimeOffset.UtcNow.AddDays(-30),
            "Test Authority",
            expiresAt);

        // Act
        var actualStatus = record.Status;

        // Assert
        actualStatus.Should().Be(expectedStatus);
    }

    // Helper method
    private TrainingRecord CreateTrainingRecord(DateTimeOffset completedAt)
    {
        return TrainingRecord.Create(
            _tenantId,
            _employeeId,
            "Fire Safety",
            completedAt,
            "Fire Department",
            DateTimeOffset.UtcNow.AddYears(1),
            "FS-12345");
    }
}
