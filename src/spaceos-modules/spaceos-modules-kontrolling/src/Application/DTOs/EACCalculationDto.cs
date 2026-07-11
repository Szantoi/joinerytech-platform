namespace SpaceOS.Modules.Kontrolling.Application.DTOs;

using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// EAC (Estimate at Completion) calculation DTO
/// </summary>
public record EACCalculationDto(
    Guid ProjectId,
    Dictionary<CostCategory, CategoryCostDto> CostByCategory,
    MoneyDto TotalEac,
    MoneyDto Overhead,
    OverheadAllocationMethod OverheadMethod,
    DateTime CalculatedAt
);
