using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get tickets by order ID.
/// </summary>
public record GetTicketsByOrderQuery(
    Guid OrderId,
    Guid TenantId
) : IRequest<Result<TicketListDto[]>>;
