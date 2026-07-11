namespace SpaceOS.Modules.Kontrolling.Application.Commands.CreateCostAdjustment;

using MediatR;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Command to create a manual cost adjustment
/// </summary>
public record CreateCostAdjustmentCommand(
    Guid TenantId,
    Guid? ProjectId,
    CostCategory Category,
    decimal Amount,
    string Currency,
    AdjustmentScope Scope,
    string Reason,
    Guid CreatedByUserId
) : IRequest<Guid>;
