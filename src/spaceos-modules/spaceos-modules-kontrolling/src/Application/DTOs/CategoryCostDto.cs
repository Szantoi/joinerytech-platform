namespace SpaceOS.Modules.Kontrolling.Application.DTOs;

/// <summary>
/// Category cost DTO - cost breakdown for a single category
/// </summary>
public record CategoryCostDto(
    MoneyDto Planned,
    MoneyDto Actual,
    MoneyDto Projected,
    MoneyDto Variance
);
