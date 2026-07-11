using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Command to reject an absence request.
/// FSM: Pending → Rejected
/// </summary>
public class RejectAbsenceCommand : IRequest<Result>
{
    public required AbsenceId AbsenceId { get; init; }
    public required Guid RejectedByUserId { get; init; }
    public required string RejectionReason { get; init; }
}
