namespace SpaceOS.Modules.Kontrolling.Application.DTOs;

/// <summary>
/// Project cost summary DTO - high-level cost overview
/// </summary>
public record CostSummaryDto(
    Guid ProjectId,
    MoneyDto Revenue,
    CostsDto Costs,
    MarginsDto Margins,
    DateTime CalculatedAt
);

/// <summary>
/// Costs breakdown DTO
/// </summary>
public record CostsDto(
    MoneyDto Planned,
    MoneyDto Actual,
    MoneyDto Eac,
    MoneyDto Variance,
    decimal VariancePercentage
);

/// <summary>
/// Margins breakdown DTO
/// </summary>
public record MarginsDto(
    MarginDto PlannedMargin,
    MarginDto ActualMargin,
    MarginDto EacMargin
);
