using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.QA.Domain.Exceptions;

/// <summary>
/// Raised when an aggregate rejects an FSM status transition (or a status-guarded
/// action such as priority escalation). Distinguishes "illegal transition" from
/// plain payload validation so the API layer can map it to HTTP 409 Conflict
/// (EHS RiskAssessmentEndpoints precedent) instead of 400 Bad Request.
/// </summary>
public class InvalidStatusTransitionException : DomainException
{
    public InvalidStatusTransitionException(string message) : base(message)
    {
    }
}
