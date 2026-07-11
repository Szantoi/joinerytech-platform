using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get tickets by type for routing analysis.
/// </summary>
public record GetTicketsByTypeQuery(
    TicketType TicketType,
    Guid TenantId
) : IRequest<Result<TicketListDto[]>>;
