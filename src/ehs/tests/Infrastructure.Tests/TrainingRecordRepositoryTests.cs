using FluentAssertions;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.TrainingRecordAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Repositories;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

/// <summary>
/// Integration tests for TrainingRecordRepository.
/// </summary>
public class TrainingRecordRepositoryTests : PostgresTestBase
{
    private TrainingRecordRepository Repository => new(DbContext);
    private readonly Guid _tenantId = Guid.NewGuid();

    [Fact]
    public async Task AddAsync_ShouldPersistTrainingRecord()
    {
        // Arrange
        var record = TrainingRecord.Create(
            _tenantId,
            Guid.NewGuid(),
            "First Aid Training",
            DateTimeOffset.UtcNow.AddMonths(-1),
            "Safety Department",
            DateTimeOffset.UtcNow.AddYears(1),
            "CERT-FA-2026-001");

        // Act
        await Repository.AddAsync(record, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Assert
        var retrieved = await Repository.GetByIdAsync(record.TrainingRecordId, _tenantId, CancellationToken.None);
        retrieved.Should().NotBeNull();
        retrieved!.TrainingType.Should().Be("First Aid Training");
        retrieved.IssuedBy.Should().Be("Safety Department");
        retrieved.CertificateNumber.Should().Be("CERT-FA-2026-001");
        retrieved.Status.Should().Be(TrainingStatus.Valid);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenTrainingRecordDoesNotExist()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await Repository.GetByIdAsync(nonExistentId, _tenantId, CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_ShouldCalculateStatusCorrectly_WhenExpiring()
    {
        // Arrange - expires in 15 days (Expiring status)
        var record = TrainingRecord.Create(
            _tenantId,
            Guid.NewGuid(),
            "Fire Safety Training",
            DateTimeOffset.UtcNow.AddMonths(-11),
            "Fire Department",
            DateTimeOffset.UtcNow.AddDays(15));

        await Repository.AddAsync(record, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        var retrieved = await Repository.GetByIdAsync(record.TrainingRecordId, _tenantId, CancellationToken.None);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Status.Should().Be(TrainingStatus.Expiring);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldCalculateStatusCorrectly_WhenExpired()
    {
        // Arrange - expired 10 days ago
        var record = TrainingRecord.Create(
            _tenantId,
            Guid.NewGuid(),
            "Safety Training",
            DateTimeOffset.UtcNow.AddYears(-2),
            "HR Department",
            DateTimeOffset.UtcNow.AddDays(-10));

        await Repository.AddAsync(record, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        var retrieved = await Repository.GetByIdAsync(record.TrainingRecordId, _tenantId, CancellationToken.None);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Status.Should().Be(TrainingStatus.Expired);
    }

    [Fact]
    public async Task ListAsync_ShouldReturnAllTrainingRecords_WhenNoFilterProvided()
    {
        // Arrange
        await AddTestTrainingRecordsAsync();

        // Act
        var result = await Repository.ListAsync(new TrainingRecordFilter(), _tenantId, CancellationToken.None);

        // Assert
        result.Should().HaveCountGreaterThanOrEqualTo(3);
    }

    [Fact]
    public async Task ListAsync_ShouldFilterByEmployeeId()
    {
        // Arrange
        var employeeId = Guid.NewGuid();
        var record1 = TrainingRecord.Create(_tenantId, employeeId, "Training A", DateTimeOffset.UtcNow.AddMonths(-1), "Issuer", DateTimeOffset.UtcNow.AddMonths(11));
        var record2 = TrainingRecord.Create(_tenantId, employeeId, "Training B", DateTimeOffset.UtcNow.AddMonths(-2), "Issuer", DateTimeOffset.UtcNow.AddMonths(10));
        var record3 = TrainingRecord.Create(_tenantId, Guid.NewGuid(), "Training C", DateTimeOffset.UtcNow.AddMonths(-1), "Issuer", DateTimeOffset.UtcNow.AddMonths(11));

        await Repository.AddAsync(record1, CancellationToken.None);
        await Repository.AddAsync(record2, CancellationToken.None);
        await Repository.AddAsync(record3, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        var filter = new TrainingRecordFilter(EmployeeId: employeeId);
        var result = await Repository.ListAsync(filter, _tenantId, CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(r => r.EmployeeId.Should().Be(employeeId));
    }

    [Fact]
    public async Task ListAsync_ShouldFilterByStatus()
    {
        // Arrange
        var validRecord = TrainingRecord.Create(_tenantId, Guid.NewGuid(), "Valid Training", DateTimeOffset.UtcNow.AddMonths(-1), "Issuer", DateTimeOffset.UtcNow.AddMonths(6));
        var expiringRecord = TrainingRecord.Create(_tenantId, Guid.NewGuid(), "Expiring Training", DateTimeOffset.UtcNow.AddMonths(-11), "Issuer", DateTimeOffset.UtcNow.AddDays(15));

        await Repository.AddAsync(validRecord, CancellationToken.None);
        await Repository.AddAsync(expiringRecord, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        var filter = new TrainingRecordFilter(Status: TrainingStatus.Valid);
        var result = await Repository.ListAsync(filter, _tenantId, CancellationToken.None);

        // Assert
        result.Should().HaveCountGreaterThanOrEqualTo(1);
        result.Should().AllSatisfy(r => r.Status.Should().Be(TrainingStatus.Valid));
    }

    [Fact]
    public async Task GetExpiringAsync_ShouldReturnTrainingsExpiringWithinDays()
    {
        // Arrange
        var validRecord = TrainingRecord.Create(_tenantId, Guid.NewGuid(), "Valid Training", DateTimeOffset.UtcNow.AddMonths(-1), "Issuer", DateTimeOffset.UtcNow.AddDays(60));
        var expiringRecord = TrainingRecord.Create(_tenantId, Guid.NewGuid(), "Expiring Training", DateTimeOffset.UtcNow.AddMonths(-11), "Issuer", DateTimeOffset.UtcNow.AddDays(20));
        var expiredRecord = TrainingRecord.Create(_tenantId, Guid.NewGuid(), "Expired Training", DateTimeOffset.UtcNow.AddYears(-2), "Issuer", DateTimeOffset.UtcNow.AddDays(-5));

        await Repository.AddAsync(validRecord, CancellationToken.None);
        await Repository.AddAsync(expiringRecord, CancellationToken.None);
        await Repository.AddAsync(expiredRecord, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        var result = await Repository.GetExpiringAsync(_tenantId, 30, CancellationToken.None);

        // Assert
        result.Should().Contain(r => r.TrainingRecordId == expiringRecord.TrainingRecordId);
        result.Should().NotContain(r => r.TrainingRecordId == validRecord.TrainingRecordId);
    }

    [Fact]
    public async Task GetExpiringTrainingsAsync_ShouldReturnOnlyFutureExpiringTrainings()
    {
        // Arrange
        var validRecord = TrainingRecord.Create(_tenantId, Guid.NewGuid(), "Valid Training", DateTimeOffset.UtcNow.AddMonths(-1), "Issuer", DateTimeOffset.UtcNow.AddMonths(6));
        var expiringRecord = TrainingRecord.Create(_tenantId, Guid.NewGuid(), "Expiring Training", DateTimeOffset.UtcNow.AddMonths(-11), "Issuer", DateTimeOffset.UtcNow.AddDays(15));
        var expiredRecord = TrainingRecord.Create(_tenantId, Guid.NewGuid(), "Expired Training", DateTimeOffset.UtcNow.AddYears(-2), "Issuer", DateTimeOffset.UtcNow.AddDays(-10));

        await Repository.AddAsync(validRecord, CancellationToken.None);
        await Repository.AddAsync(expiringRecord, CancellationToken.None);
        await Repository.AddAsync(expiredRecord, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        var result = await Repository.GetExpiringTrainingsAsync(_tenantId, 30, CancellationToken.None);

        // Assert - should only return expiring (future), NOT expired (past)
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
        result.Should().Contain(t => t.TrainingRecordId == expiringRecord.TrainingRecordId);
        result.Should().NotContain(t => t.TrainingRecordId == expiredRecord.TrainingRecordId);
        result.Should().NotContain(t => t.TrainingRecordId == validRecord.TrainingRecordId);
    }

    [Fact]
    public async Task ExistsAsync_ShouldReturnTrue_WhenTrainingRecordExists()
    {
        // Arrange
        var record = TrainingRecord.Create(
            _tenantId,
            Guid.NewGuid(),
            "Test Training",
            DateTimeOffset.UtcNow.AddMonths(-1),
            "Test Issuer",
            DateTimeOffset.UtcNow.AddYears(1));

        await Repository.AddAsync(record, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        var exists = await Repository.ExistsAsync(record.TrainingRecordId, _tenantId, CancellationToken.None);

        // Assert
        exists.Should().BeTrue();
    }

    [Fact]
    public async Task ExistsAsync_ShouldReturnFalse_WhenTrainingRecordDoesNotExist()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var exists = await Repository.ExistsAsync(nonExistentId, _tenantId, CancellationToken.None);

        // Assert
        exists.Should().BeFalse();
    }

    private async Task AddTestTrainingRecordsAsync()
    {
        var records = new[]
        {
            TrainingRecord.Create(_tenantId, Guid.NewGuid(), "First Aid Training", DateTimeOffset.UtcNow.AddMonths(-1), "Safety Dept", DateTimeOffset.UtcNow.AddYears(1)),
            TrainingRecord.Create(_tenantId, Guid.NewGuid(), "Fire Safety Training", DateTimeOffset.UtcNow.AddMonths(-2), "Fire Dept", DateTimeOffset.UtcNow.AddMonths(10)),
            TrainingRecord.Create(_tenantId, Guid.NewGuid(), "Hazmat Training", DateTimeOffset.UtcNow.AddMonths(-3), "EHS Dept", DateTimeOffset.UtcNow.AddMonths(9))
        };

        foreach (var record in records)
        {
            await Repository.AddAsync(record, CancellationToken.None);
        }

        await DbContext.SaveChangesAsync();
    }
}
