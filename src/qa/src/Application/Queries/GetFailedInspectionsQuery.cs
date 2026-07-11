using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get failed inspections in date range (for Pareto analysis - root cause tracking).
/// CRITICAL: Used for quality improvement and 80/20 analysis.
/// </summary>
public record GetFailedInspectionsQuery(
    DateTime FromDate,
    DateTime ToDate,
    Guid TenantId
) : IRequest<Result<InspectionListDto[]>>;
