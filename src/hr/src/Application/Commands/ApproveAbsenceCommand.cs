using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Command to approve an absence request.
/// FSM: Pending → Approved
/// </summary>
public class ApproveAbsenceCommand : IRequest<Result>
{
    public required AbsenceId AbsenceId { get; init; }
    public required Guid ApprovedByUserId { get; init; }
}
