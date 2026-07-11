namespace SpaceOS.Modules.Kontrolling.Application.DTOs;

using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Cost adjustment DTO
/// </summary>
public record CostAdjustmentDto(
    Guid CostAdjustmentId,
    Guid ProjectId,
    Guid TenantId,
    string Reason,
    MoneyDto AdjustmentAmount,
    CostCategory? Category,
    AdjustmentScope Scope,
    DateTime CreatedAt,
    Guid CreatedBy,
    bool IsDeleted
);
