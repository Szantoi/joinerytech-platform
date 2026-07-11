using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get resolved tickets in date range (for root cause analysis).
/// CRITICAL: Used for Pareto analysis (80/20 rule) to identify most common issue types.
/// </summary>
public record GetResolvedTicketsQuery(
    DateTime FromDate,
    DateTime ToDate,
    Guid TenantId
) : IRequest<Result<TicketListDto[]>>;
