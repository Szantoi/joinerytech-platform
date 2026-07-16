using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to list tickets with the portal contract's server-side filters
/// (status, priority, linked inspection, open-only, free-text search).
/// Returns full TicketDto items, newest report first (portal MSW contract).
/// </summary>
public record GetTicketsQuery(
    Guid TenantId,
    TicketStatus? Status = null,
    CrmTaskPriority? Priority = null,
    Guid? InspectionId = null,
    bool OpenOnly = false,
    string? SearchText = null
) : IRequest<Result<TicketDto[]>>;
