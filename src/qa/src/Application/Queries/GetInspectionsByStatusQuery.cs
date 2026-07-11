using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get inspections by status (for workflow tracking).
/// </summary>
public record GetInspectionsByStatusQuery(
    InspectionStatus Status,
    Guid TenantId
) : IRequest<Result<InspectionListDto[]>>;
