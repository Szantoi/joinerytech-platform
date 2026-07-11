using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get tickets by status (for workflow tracking).
/// </summary>
public record GetTicketsByStatusQuery(
    TicketStatus Status,
    Guid TenantId
) : IRequest<Result<TicketListDto[]>>;
