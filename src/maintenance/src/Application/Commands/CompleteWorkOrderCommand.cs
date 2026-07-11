using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to complete a work order.
/// </summary>
public record CompleteWorkOrderCommand(
    WorkOrderId WorkOrderId,
    decimal ActualHours,
    string? CompletionNote,
    Guid TenantId
) : IRequest<Result>;
