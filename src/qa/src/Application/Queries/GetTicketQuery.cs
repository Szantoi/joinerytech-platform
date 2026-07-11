using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get a single ticket by ID.
/// </summary>
public record GetTicketQuery(
    TicketId TicketId,
    Guid TenantId
) : IRequest<Result<TicketDto>>;
