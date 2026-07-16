using FluentAssertions;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Exceptions;
using SpaceOS.Modules.QA.Domain.StrongIds;
using SpaceOS.Modules.QA.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Domain.FSM;

/// <summary>
/// The FSM guards (and the status/rank-guarded escalation) must throw the
/// dedicated InvalidStatusTransitionException — the API layer maps it to
/// HTTP 409 Conflict, while plain DomainException payload validation stays 400.
/// </summary>
public class InvalidStatusTransitionExceptionTests
{
    private static Ticket CreateTicket() => Ticket.Create(
        Guid.NewGuid(),
        TicketType.Repair,
        CrmTaskPriority.Medium,
        "Élzárás sérült a szekrényen",
        "A jobb oldali ajtó élzárása több helyen levált.",
        Guid.NewGuid());

    private static Inspection CreateInspection() => Inspection.Create(
        Guid.NewGuid(),
        QACheckpointId.New(),
        Guid.NewGuid(),
        DateTime.UtcNow.AddHours(1));

    [Fact]
    public void Ticket_StartWithoutAssign_ThrowsInvalidStatusTransition()
    {
        var ticket = CreateTicket();

        var act = () => ticket.Start();

        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage("*Cannot transition from Reported to InProgress*");
    }

    [Fact]
    public void Ticket_ResolveFromReported_ThrowsInvalidStatusTransition()
    {
        var ticket = CreateTicket();
        var actions = new List<ResolutionAction>
        {
            ResolutionAction.Create(ActionType.Repair, "Újraragasztás", Money.Zero("HUF"))
        };

        var act = () => ticket.Resolve(actions);

        act.Should().Throw<InvalidStatusTransitionException>();
    }

    [Fact]
    public void Ticket_ReopenNonRejected_ThrowsInvalidStatusTransition()
    {
        var ticket = CreateTicket();

        var act = () => ticket.Reopen();

        act.Should().Throw<InvalidStatusTransitionException>();
    }

    [Fact]
    public void Ticket_EscalateToNotHigherPriority_ThrowsInvalidStatusTransition()
    {
        var ticket = CreateTicket(); // Medium

        var act = () => ticket.EscalatePriority(CrmTaskPriority.Low);

        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage("*must be higher*");
    }

    [Fact]
    public void Ticket_EscalateResolved_ThrowsInvalidStatusTransition()
    {
        var ticket = CreateTicket();
        ticket.Assign(Guid.NewGuid());
        ticket.Start();
        ticket.Resolve(new List<ResolutionAction>
        {
            ResolutionAction.Create(ActionType.Replace, "Ajtó cseréje", Money.Zero("HUF"))
        });

        var act = () => ticket.EscalatePriority(CrmTaskPriority.Critical);

        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage("*Cannot escalate resolved*");
    }

    [Fact]
    public void Inspection_CompletePassFromPlanned_ThrowsInvalidStatusTransition()
    {
        var inspection = CreateInspection();

        var act = () => inspection.CompleteWithPass();

        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage("*Cannot transition from Planned to Completed*");
    }

    [Fact]
    public void Inspection_StartTwice_ThrowsInvalidStatusTransition()
    {
        var inspection = CreateInspection();
        inspection.Start();

        var act = () => inspection.Start();

        act.Should().Throw<InvalidStatusTransitionException>();
    }
}
