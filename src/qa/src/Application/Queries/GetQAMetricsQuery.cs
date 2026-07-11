using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get QA metrics for a date range.
/// Returns pass/fail rates for inspections and average ticket resolution time.
/// </summary>
public record GetQAMetricsQuery(
    DateTime StartDate,
    DateTime EndDate,
    Guid TenantId
) : IRequest<Result<QAMetricsDto>>;
