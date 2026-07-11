using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.DeleteCostAdjustment;

/// <summary>
/// Command to soft-delete a cost adjustment
/// </summary>
public record DeleteCostAdjustmentCommand(
    Guid AdjustmentId,
    Guid TenantId,
    Guid DeletedBy
) : IRequest<Result>;
