using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Command to deactivate an employee (soft delete).
/// Note: Domain does not support termination date/reason fields.
/// </summary>
public class DeactivateEmployeeCommand : IRequest<Result>
{
    public required EmployeeId EmployeeId { get; init; }
}
