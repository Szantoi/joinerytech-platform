using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Exceptions;
using SpaceOS.Modules.HR.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Domain;

/// <summary>
/// The Absence FSM guards raise InvalidStatusTransitionException (API 409), while
/// payload problems stay plain DomainException (API 400). This separation is what the
/// portal contract rests on — a forbidden action must never look like a bad request.
/// </summary>
public class AbsenceTransitionGuardTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _approver = Guid.NewGuid();

    private Absence CreatePending() => Absence.Create(
        _tenantId,
        EmployeeId.New(),
        AbsenceType.Vacation,
        new DateOnly(2026, 8, 3),
        new DateOnly(2026, 8, 7),
        "Nyári szabadság");

    private Absence CreateApproved()
    {
        var absence = CreatePending();
        absence.Approve(_approver);
        return absence;
    }

    // ── The forbidden edges are 409-shaped ──────────────────────────────────

    [Fact]
    public void Approve_AlreadyApproved_ThrowsInvalidStatusTransition()
    {
        var absence = CreateApproved();

        var act = () => absence.Approve(_approver);

        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage("*approve*Approved*");
    }

    [Fact]
    public void Start_FromPending_ThrowsInvalidStatusTransition()
    {
        var absence = CreatePending();

        var act = () => absence.StartAbsence();

        act.Should().Throw<InvalidStatusTransitionException>();
    }

    [Fact]
    public void Complete_FromApproved_ThrowsInvalidStatusTransition()
    {
        var absence = CreateApproved();

        var act = () => absence.CompleteAbsence();

        act.Should().Throw<InvalidStatusTransitionException>();
    }

    [Fact]
    public void Reopen_FromPending_ThrowsInvalidStatusTransition()
    {
        var absence = CreatePending();

        var act = () => absence.Reopen();

        act.Should().Throw<InvalidStatusTransitionException>();
    }

    [Fact]
    public void AnyTransition_FromCompleted_ThrowsInvalidStatusTransition()
    {
        var absence = CreateApproved();
        absence.StartAbsence();
        absence.CompleteAbsence();

        // Completed is terminal: every action is rejected.
        absence.Invoking(a => a.Approve(_approver)).Should().Throw<InvalidStatusTransitionException>();
        absence.Invoking(a => a.StartAbsence()).Should().Throw<InvalidStatusTransitionException>();
        absence.Invoking(a => a.CompleteAbsence()).Should().Throw<InvalidStatusTransitionException>();
        absence.Invoking(a => a.Reopen()).Should().Throw<InvalidStatusTransitionException>();
    }

    // ── Payload problems stay 400-shaped ────────────────────────────────────

    [Fact]
    public void Reject_WithoutReason_ThrowsPlainDomainException_Not409()
    {
        var absence = CreatePending();

        var act = () => absence.Reject(_approver, "   ");

        act.Should().Throw<DomainException>()
            .And.Should().NotBeOfType<InvalidStatusTransitionException>();
    }

    [Fact]
    public void Approve_WithEmptyApprover_ThrowsPlainDomainException_Not409()
    {
        var absence = CreatePending();

        var act = () => absence.Approve(Guid.Empty);

        act.Should().Throw<DomainException>()
            .And.Should().NotBeOfType<InvalidStatusTransitionException>();
    }

    // ── The happy path still walks the whole chain ──────────────────────────

    [Fact]
    public void FullChain_PendingToCompleted_Succeeds()
    {
        var absence = CreatePending();

        absence.Approve(_approver);
        absence.Status.Should().Be(AbsenceStatus.Approved);

        absence.StartAbsence();
        absence.Status.Should().Be(AbsenceStatus.InProgress);

        absence.CompleteAbsence();
        absence.Status.Should().Be(AbsenceStatus.Completed);
    }

    [Fact]
    public void RejectThenReopen_ClearsRejection_AndReturnsToPending()
    {
        var absence = CreatePending();
        absence.Reject(_approver, "Csúcsszezon");

        absence.Reopen();

        absence.Status.Should().Be(AbsenceStatus.Pending);
        absence.RejectionReason.Should().BeNull();
        absence.RejectedByUserId.Should().BeNull();
        absence.RejectedAt.Should().BeNull();
    }
}
