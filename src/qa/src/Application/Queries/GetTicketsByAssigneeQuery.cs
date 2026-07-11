using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get tickets assigned to a specific user.
/// </summary>
public record GetTicketsByAssigneeQuery(
    Guid AssigneeId,
    Guid TenantId
) : IRequest<Result<TicketListDto[]>>;
