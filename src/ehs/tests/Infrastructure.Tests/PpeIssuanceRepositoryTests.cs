using FluentAssertions;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Repositories;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

/// <summary>
/// Integration tests for PpeIssuanceRepository (PPE FSM persistence).
/// </summary>
public class PpeIssuanceRepositoryTests : PostgresTestBase
{
    private PpeIssuanceRepository Repository => new(DbContext);
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _employeeId = Guid.NewGuid();
    private readonly Guid _ppeItemId = Guid.NewGuid();

    [Fact]
    public async Task AddAsync_ShouldPersistIssuedPpe()
    {
        // Arrange
        var issuance = PpeIssuance.Issue(_tenantId, _employeeId, _ppeItemId, Guid.NewGuid(), 2);

        // Act
        await Repository.AddAsync(issuance, CancellationToken.None);

        // Assert
        var retrieved = await Repository.GetByIdAsync(issuance.IssuanceId, _tenantId, CancellationToken.None);
        retrieved.Should().NotBeNull();
        retrieved!.Status.Should().Be(PpeIssuanceStatus.Issued);
        retrieved.EmployeeId.Should().Be(_employeeId);
        retrieved.Quantity.Should().Be(2);
    }

    [Fact]
    public async Task UpdateAsync_ShouldPersistFsmTransitions()
    {
        // Arrange — Issued → Acknowledged → Returned round trip
        var issuance = PpeIssuance.Issue(_tenantId, _employeeId, _ppeItemId, Guid.NewGuid(), 1);
        await Repository.AddAsync(issuance, CancellationToken.None);

        issuance.Acknowledge();
        issuance.Return();

        // Act
        await Repository.UpdateAsync(issuance, CancellationToken.None);

        // Assert
        var retrieved = await Repository.GetByIdAsync(issuance.IssuanceId, _tenantId, CancellationToken.None);
        retrieved!.Status.Should().Be(PpeIssuanceStatus.Returned);
        retrieved.AcknowledgedAt.Should().NotBeNull();
        retrieved.ReturnedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task AddReplacementAsync_ShouldPersistPairAtomically()
    {
        // Arrange — Acknowledged issuance gets replaced
        var issuance = PpeIssuance.Issue(_tenantId, _employeeId, _ppeItemId, Guid.NewGuid(), 1);
        await Repository.AddAsync(issuance, CancellationToken.None);
        issuance.Acknowledge();
        var replacement = issuance.Replace(Guid.NewGuid());

        // Act — one SaveChanges persists both
        await Repository.AddReplacementAsync(issuance, replacement, CancellationToken.None);

        // Assert
        var oldOne = await Repository.GetByIdAsync(issuance.IssuanceId, _tenantId, CancellationToken.None);
        var newOne = await Repository.GetByIdAsync(replacement.IssuanceId, _tenantId, CancellationToken.None);

        oldOne!.Status.Should().Be(PpeIssuanceStatus.Replaced);
        oldOne.ReplacementIssuanceId.Should().Be(replacement.IssuanceId);
        newOne!.Status.Should().Be(PpeIssuanceStatus.Issued);
    }

    [Fact]
    public async Task ListAsync_ShouldFilterByEmployeeStatusAndExpiry()
    {
        // Arrange
        var outstanding = PpeIssuance.Issue(
            _tenantId, _employeeId, _ppeItemId, Guid.NewGuid(), 1,
            expiresAt: DateTimeOffset.UtcNow.AddDays(10));  // expiring within 30d
        var longLived = PpeIssuance.Issue(
            _tenantId, _employeeId, _ppeItemId, Guid.NewGuid(), 1,
            expiresAt: DateTimeOffset.UtcNow.AddMonths(12));
        var otherEmployee = PpeIssuance.Issue(
            _tenantId, Guid.NewGuid(), _ppeItemId, Guid.NewGuid(), 1);

        await Repository.AddAsync(outstanding, CancellationToken.None);
        await Repository.AddAsync(longLived, CancellationToken.None);
        await Repository.AddAsync(otherEmployee, CancellationToken.None);

        // Act + Assert — employee sheet
        var employeeSheet = await Repository.ListAsync(
            new PpeIssuanceFilter(EmployeeId: _employeeId), _tenantId, CancellationToken.None);
        employeeSheet.Should().HaveCount(2);

        // Act + Assert — expiring window keeps only the short-dated outstanding item
        var expiring = await Repository.ListAsync(
            new PpeIssuanceFilter(ExpiringWithinDays: 30), _tenantId, CancellationToken.None);
        expiring.Should().ContainSingle().Which.IssuanceId.Should().Be(outstanding.IssuanceId);
    }
}
