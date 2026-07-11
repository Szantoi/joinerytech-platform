namespace SpaceOS.Modules.Kontrolling.Application.DTOs;

using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Variance analysis DTO - detailed variance breakdown by category
/// </summary>
public record VarianceAnalysisDto(
    Guid ProjectId,
    Dictionary<CostCategory, VarianceDetailDto> Variances,
    MoneyDto TotalVariance,
    decimal VariancePercentage,
    CostCategory? WorstPerformingCategory,
    DateTime AnalyzedAt
);

/// <summary>
/// Variance detail DTO for a single category
/// </summary>
public record VarianceDetailDto(
    MoneyDto Planned,
    MoneyDto Actual,
    MoneyDto Variance,
    decimal VariancePercentage
);
