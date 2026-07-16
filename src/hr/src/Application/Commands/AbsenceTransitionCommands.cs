using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// The Absence FSM transition commands — one dedicated command per action
/// (no generic "set status"), mirroring the aggregate's methods and the portal's
/// ABSENCE_FSM action set. All of them return the fresh AbsenceDto.
///
/// FSM (Domain/FSM/AbsenceStatusTransitions):
///   Pending    → Approved | Rejected   (approve / reject)
///   Approved   → InProgress            (start)
///   InProgress → Completed             (complete, terminal)
///   Rejected   → Pending               (reopen)
/// </summary>

/// <summary>FSM: Pending → Approved.</summary>
public class ApproveAbsenceCommand : IRequest<Result<AbsenceDto>>, IAbsenceTransitionCommand
{
    public required AbsenceId AbsenceId { get; init; }
    public required Guid ApprovedByUserId { get; init; }
}

/// <summary>FSM: Pending → Rejected. The rejection reason is mandatory.</summary>
public class RejectAbsenceCommand : IRequest<Result<AbsenceDto>>, IAbsenceTransitionCommand
{
    public required AbsenceId AbsenceId { get; init; }
    public required Guid RejectedByUserId { get; init; }
    public required string RejectionReason { get; init; }
}

/// <summary>FSM: Approved → InProgress.</summary>
public class StartAbsenceCommand : IRequest<Result<AbsenceDto>>, IAbsenceTransitionCommand
{
    public required AbsenceId AbsenceId { get; init; }
}

/// <summary>FSM: InProgress → Completed (terminal).</summary>
public class CompleteAbsenceCommand : IRequest<Result<AbsenceDto>>, IAbsenceTransitionCommand
{
    public required AbsenceId AbsenceId { get; init; }
}

/// <summary>
/// FSM: Rejected → Pending. Clears the rejection (the request goes back for decision).
/// Note: the domain has no Cancel operation — reopen is the retry path.
/// </summary>
public class ReopenAbsenceCommand : IRequest<Result<AbsenceDto>>, IAbsenceTransitionCommand
{
    public required AbsenceId AbsenceId { get; init; }
}
