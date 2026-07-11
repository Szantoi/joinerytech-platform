using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Command to reopen a rejected absence request.
/// FSM: Rejected → Pending
/// Note: Domain does not have a Cancel operation. Use Reopen to retry rejected absences.
/// </summary>
public class ReopenAbsenceCommand : IRequest<Result>
{
    public required AbsenceId AbsenceId { get; init; }
}
