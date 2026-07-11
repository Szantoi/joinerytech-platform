using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get all inspections for a specific order.
/// </summary>
public record GetInspectionsByOrderQuery(
    Guid OrderId,
    Guid TenantId
) : IRequest<Result<InspectionListDto[]>>;
