using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.Maintenance.Domain.Exceptions;

/// <summary>
/// Thrown when a work order action is not allowed in the aggregate's current state:
/// an illegal FSM transition, an assignment attempt in a non-assignable status,
/// or starting work without an assignee.
/// API error contract: this maps to 409 Conflict (input validation errors remain
/// plain <see cref="DomainException"/> and map to 400 Bad Request) — mirrors the
/// EHS module contract and the portal MSW contract (guardTransition → 409).
/// </summary>
public class WorkOrderStateConflictException : DomainException
{
    public WorkOrderStateConflictException(string message) : base(message)
    {
    }
}
