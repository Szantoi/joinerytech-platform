using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Command to request a new absence.
/// </summary>
public class RequestAbsenceCommand : IRequest<Result<AbsenceId>>
{
    public required Guid TenantId { get; init; }
    public required EmployeeId EmployeeId { get; init; }
    public required AbsenceType Type { get; init; }
    public required DateTime StartDate { get; init; }
    public required DateTime EndDate { get; init; }
    public required string Reason { get; init; }
}
