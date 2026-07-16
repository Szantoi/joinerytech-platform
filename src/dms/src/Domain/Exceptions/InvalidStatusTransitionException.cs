using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.DMS.Domain.Exceptions;

/// <summary>
/// Raised when the Document aggregate rejects an FSM status transition or a
/// status-guarded action (e.g. uploading a version to an archived document).
/// Distinguishes "illegal transition" from plain payload validation so the API
/// layer maps it to HTTP 409 Conflict instead of 400 Bad Request
/// (EHS RiskAssessmentEndpoints / QA InvalidStatusTransitionException precedent;
/// portal MSW guardTransition mirror).
/// </summary>
public class InvalidStatusTransitionException : DomainException
{
    public InvalidStatusTransitionException(string message) : base(message)
    {
    }
}
