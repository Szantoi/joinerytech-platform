using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get blocking inspections for an order (Result = Fail, CriticalLevel = Critical).
/// CRITICAL: Integration point with Production module - blocks order production.
/// </summary>
public record GetBlockingInspectionsQuery(
    Guid OrderId,
    Guid TenantId
) : IRequest<Result<InspectionListDto[]>>;
