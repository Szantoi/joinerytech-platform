using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.HR.Domain.Exceptions;

/// <summary>
/// Raised when the Absence aggregate rejects an FSM status transition
/// (<see cref="FSM.AbsenceStatusTransitions"/>). Distinguishes "illegal transition"
/// from plain payload validation so the API layer can map it to HTTP 409 Conflict
/// instead of 400 Bad Request — the QA module's InvalidStatusTransitionException /
/// Maintenance WorkOrderStateConflictException precedent, and the mirror of the
/// portal MSW guard (409 on a forbidden ABSENCE_FSM action).
/// </summary>
public class InvalidStatusTransitionException : DomainException
{
    public InvalidStatusTransitionException(string message) : base(message)
    {
    }
}
