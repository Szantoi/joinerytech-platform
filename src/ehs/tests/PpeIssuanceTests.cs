using FluentAssertions;
using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;
using Xunit;

namespace SpaceOS.Modules.Ehs.Domain.Tests;

/// <summary>
/// FSM tests for PpeIssuance: kiadva(Issued) → atvett(Acknowledged) →
/// visszavett(Returned) | cserelve(Replaced). Every legal transition passes,
/// every illegal transition is rejected.
/// </summary>
public class PpeIssuanceTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _employeeId = Guid.NewGuid();
    private readonly Guid _ppeItemId = Guid.NewGuid();
    private readonly Guid _issuedBy = Guid.NewGuid();

    // ── FSM entry ────────────────────────────────────────────────────────

    [Fact]
    public void Issue_ShouldCreateIssuanceInIssuedStatus()
    {
        // Act
        var issuance = CreateIssuedPpe();

        // Assert
        issuance.Status.Should().Be(PpeIssuanceStatus.Issued);
        issuance.EmployeeId.Should().Be(_employeeId);
        issuance.Quantity.Should().Be(2);
        issuance.AcknowledgedAt.Should().BeNull();
    }

    [Fact]
    public void Issue_ShouldRaisePpeIssuedEvent()
    {
        // Act
        var issuance = CreateIssuedPpe();

        // Assert
        issuance.PopDomainEvents().Should().ContainSingle()
            .Which.Should().BeOfType<PpeIssuedEvent>();
    }

    [Fact]
    public void Issue_ShouldThrowWhenQuantityNotPositive()
    {
        // Act
        var act = () => PpeIssuance.Issue(_tenantId, _employeeId, _ppeItemId, _issuedBy, 0);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("Quantity must be positive*");
    }

    // ── Issued → Acknowledged ────────────────────────────────────────────

    [Fact]
    public void Acknowledge_ShouldTransitionFromIssuedToAcknowledged()
    {
        // Arrange
        var issuance = CreateIssuedPpe();

        // Act
        issuance.Acknowledge();

        // Assert
        issuance.Status.Should().Be(PpeIssuanceStatus.Acknowledged);
        issuance.AcknowledgedAt.Should().NotBeNull();
    }

    [Fact]
    public void Acknowledge_ShouldThrowWhenAlreadyAcknowledged()
    {
        // Arrange
        var issuance = CreateAcknowledgedPpe();

        // Act
        var act = () => issuance.Acknowledge();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only issued PPE can be acknowledged");
    }

    // ── Acknowledged → Returned ──────────────────────────────────────────

    [Fact]
    public void Return_ShouldTransitionFromAcknowledgedToReturned()
    {
        // Arrange
        var issuance = CreateAcknowledgedPpe();

        // Act
        issuance.Return();

        // Assert
        issuance.Status.Should().Be(PpeIssuanceStatus.Returned);
        issuance.ReturnedAt.Should().NotBeNull();
    }

    [Fact]
    public void Return_ShouldThrowWhenOnlyIssued()
    {
        // Arrange — not yet acknowledged
        var issuance = CreateIssuedPpe();

        // Act
        var act = () => issuance.Return();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only acknowledged PPE can be returned");
    }

    [Fact]
    public void Return_ShouldThrowWhenAlreadyReturned()
    {
        // Arrange — Returned is terminal
        var issuance = CreateAcknowledgedPpe();
        issuance.Return();

        // Act
        var act = () => issuance.Return();

        // Assert
        act.Should().Throw<InvalidOperationException>();
    }

    // ── Acknowledged → Replaced ──────────────────────────────────────────

    [Fact]
    public void Replace_ShouldTransitionToReplacedAndSpawnNewIssuance()
    {
        // Arrange
        var issuance = CreateAcknowledgedPpe();
        issuance.PopDomainEvents();
        var replacedBy = Guid.NewGuid();

        // Act
        var replacement = issuance.Replace(replacedBy);

        // Assert — old issuance is terminal Replaced, pointing at the new one
        issuance.Status.Should().Be(PpeIssuanceStatus.Replaced);
        issuance.ReplacedAt.Should().NotBeNull();
        issuance.ReplacementIssuanceId.Should().Be(replacement.IssuanceId);

        // Assert — replacement starts its own lifecycle in Issued
        replacement.Status.Should().Be(PpeIssuanceStatus.Issued);
        replacement.EmployeeId.Should().Be(_employeeId);
        replacement.PpeItemId.Should().Be(_ppeItemId);
        replacement.Quantity.Should().Be(issuance.Quantity);
        replacement.IssuedBy.Should().Be(replacedBy);

        // Assert — replaced event emitted
        issuance.PopDomainEvents().Should().ContainSingle()
            .Which.Should().BeOfType<PpeReplacedEvent>();
    }

    [Fact]
    public void Replace_ShouldThrowWhenOnlyIssued()
    {
        // Arrange — not yet acknowledged
        var issuance = CreateIssuedPpe();

        // Act
        var act = () => issuance.Replace(Guid.NewGuid());

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only acknowledged PPE can be replaced");
    }

    [Fact]
    public void Replace_ShouldThrowWhenAlreadyReplaced()
    {
        // Arrange — Replaced is terminal
        var issuance = CreateAcknowledgedPpe();
        issuance.Replace(Guid.NewGuid());

        // Act
        var act = () => issuance.Replace(Guid.NewGuid());

        // Assert
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Acknowledge_ShouldThrowOnTerminalStates()
    {
        // Returned is terminal
        var returned = CreateAcknowledgedPpe();
        returned.Return();
        var actReturned = () => returned.Acknowledge();
        actReturned.Should().Throw<InvalidOperationException>();

        // Replaced is terminal
        var replaced = CreateAcknowledgedPpe();
        replaced.Replace(Guid.NewGuid());
        var actReplaced = () => replaced.Acknowledge();
        actReplaced.Should().Throw<InvalidOperationException>();
    }

    // ── Computed expiry ──────────────────────────────────────────────────

    [Fact]
    public void IsExpired_ShouldBeFalseWithoutExpiry()
    {
        CreateIssuedPpe().IsExpired.Should().BeFalse();
    }

    [Fact]
    public void IsExpired_ShouldBeFalseWhenExpiryInFuture()
    {
        var issuance = PpeIssuance.Issue(
            _tenantId, _employeeId, _ppeItemId, _issuedBy, 1,
            expiresAt: DateTimeOffset.UtcNow.AddMonths(6));

        issuance.IsExpired.Should().BeFalse();
    }

    // ── PpeItem catalogue guards ─────────────────────────────────────────

    [Fact]
    public void PpeItem_Deactivate_ShouldThrowWhenAlreadyInactive()
    {
        // Arrange
        var item = PpeItem.Create(_tenantId, "Védőkesztyű", PpeCategory.Hand, "EN 388", 6);
        item.Deactivate();

        // Act
        var act = () => item.Deactivate();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("PPE item is already inactive");
    }

    [Fact]
    public void PpeItem_Update_ShouldThrowWhenInactive()
    {
        // Arrange
        var item = PpeItem.Create(_tenantId, "Védőkesztyű", PpeCategory.Hand);
        item.Deactivate();

        // Act
        var act = () => item.Update("Védőkesztyű v2", PpeCategory.Hand, "EN 388", 6);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot update an inactive PPE item");
    }

    // Helpers
    private PpeIssuance CreateIssuedPpe()
    {
        return PpeIssuance.Issue(_tenantId, _employeeId, _ppeItemId, _issuedBy, 2);
    }

    private PpeIssuance CreateAcknowledgedPpe()
    {
        var issuance = CreateIssuedPpe();
        issuance.Acknowledge();
        return issuance;
    }
}
