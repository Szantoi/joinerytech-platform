namespace SpaceOS.Modules.Kontrolling.Application.DTOs;

using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Cost adjustment list DTO (lightweight for list views)
/// </summary>
public record CostAdjustmentListDto(
    Guid CostAdjustmentId,
    Guid ProjectId,
    string Reason,
    MoneyDto AdjustmentAmount,
    AdjustmentScope Scope,
    DateTime CreatedAt
);
