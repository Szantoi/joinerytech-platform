using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Query to get a paginated list of work orders with optional filters.
/// </summary>
public record GetWorkOrdersQuery(
    WorkOrderStatus? Status,
    WorkOrderType? Type,
    int Page,
    int PageSize,
    Guid TenantId
) : IRequest<Result<WorkOrderListDto[]>>;
