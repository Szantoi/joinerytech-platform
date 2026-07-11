namespace SpaceOS.Modules.Kontrolling.Application.DTOs;

using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Portfolio summary DTO - aggregated cost view across all projects
/// </summary>
public record PortfolioSummaryDto(
    int ProjectCount,
    MoneyDto TotalRevenue,
    MoneyDto TotalEac,
    MarginDto AggregatedMargin,
    List<ProjectSummaryDto> TopPerformingProjects,
    List<ProjectSummaryDto> WorstPerformingProjects,
    List<VarianceWarningDto> TopVariances,
    DateTime CalculatedAt
);

/// <summary>
/// Project summary DTO - high-level project info
/// </summary>
public record ProjectSummaryDto(
    Guid ProjectId,
    string ProjectName,
    MoneyDto Revenue,
    MoneyDto Eac,
    MarginDto Margin
);

/// <summary>
/// Variance warning DTO - alerts for high variances
/// </summary>
public record VarianceWarningDto(
    Guid ProjectId,
    string ProjectName,
    CostCategory Category,
    MoneyDto Variance,
    decimal VariancePercentage
);
