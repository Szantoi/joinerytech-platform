namespace SpaceOS.Modules.Kontrolling.Application.Portfolio;

using System.Text.Json.Serialization;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

// Wire DTOs of the controlling REST contract.
//
// These mirror the frozen client contract (portal modules/controlling/services
// zod schemas) one-to-one. They are FLAT on purpose — plain numbers instead of
// the module's internal MoneyDto {amount, currency}, and business-key strings
// instead of Guids — because the contract is the measure.
//
// Conventions across every DTO in this file:
//   - Percentages are FRACTIONS (0.15 = 15%), never 0..100.
//   - A percentage is null when its denominator is zero (no contract value /
//     no planned cost) — "undefined", not "zero".
//   - Enums travel as strings; see Api/KontrollingApiJsonOptions for the wire
//     spelling.
//   - Amounts are HUF; the currency is not carried per field. See the task
//     doc's follow-up on multi-currency.

/// <summary>One category's computed cost picture.</summary>
/// <param name="Projected">EAC projection: MAX(plan, actual) — the domain's <c>CategoryCost.Projected</c>.</param>
/// <param name="Variance">actual − plan (positive = overspend).</param>
public sealed record CategoryCostViewDto(
    CostCategory Category,
    decimal Plan,
    decimal Actual,
    decimal Projected,
    decimal Variance);

/// <summary>A single planned/actual cost line of a project.</summary>
public sealed record CostLineViewDto(
    CostCategory Category,
    string Label,
    decimal Plan,
    decimal Actual,
    // The client schema declares `note` OPTIONAL, not nullable — a literal
    // null would fail its validation, so the property is omitted when absent.
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? Note);

/// <summary>Project detail: master data plus its cost lines.</summary>
public sealed record ProjectDetailDto(
    string Id,
    string Name,
    string Customer,
    ProjectLifecycleStatus Status,
    decimal ContractValue,
    decimal Invoiced,
    IReadOnlyList<CostLineViewDto> Lines);

/// <summary>
/// Portfolio list row: master data plus the computed summary
/// (the list intentionally carries no cost lines — only the roll-up).
/// </summary>
public sealed record ProjectListItemDto(
    string Id,
    string Name,
    string Customer,
    ProjectLifecycleStatus Status,
    decimal ContractValue,
    decimal Invoiced,
    IReadOnlyList<CategoryCostViewDto> ByCategory,
    decimal PlanTotal,
    decimal ActualTotal,
    decimal EacTotal,
    decimal Variance,
    decimal? VariancePct,
    decimal? PlanMarginPct,
    decimal? ActualMarginPct,
    decimal? EacMarginPct);

/// <summary>Project cost calculation (EAC, variance, margins) at a point in time.</summary>
public sealed record ProjectCalculationDto(
    string ProjectId,
    IReadOnlyList<CategoryCostViewDto> ByCategory,
    decimal PlanTotal,
    decimal ActualTotal,
    decimal EacTotal,
    decimal Variance,
    decimal? VariancePct,
    decimal? PlanMarginPct,
    decimal? ActualMarginPct,
    decimal? EacMarginPct,
    DateTime CalculatedAt);

/// <summary>A running project flagged by the at-risk KPI.</summary>
public sealed record AtRiskProjectDto(
    string Id,
    string Name,
    decimal? EacMarginPct);

/// <summary>One point of the margin trend chart.</summary>
/// <param name="Month">Calendar month, <c>YYYY-MM</c>.</param>
public sealed record MarginTrendPointDto(
    string Month,
    decimal PlanMarginPct,
    decimal ActualMarginPct);

/// <summary>Executive portfolio roll-up across every project of the tenant.</summary>
/// <param name="EacOverrunCount">Projects whose EAC exceeds their planned cost.</param>
/// <param name="EacOverrunTotal">Σ of the positive (EAC − plan) overruns.</param>
public sealed record PortfolioSummaryViewDto(
    int ProjectCount,
    decimal ContractTotal,
    decimal InvoicedTotal,
    decimal PlanCostTotal,
    decimal ActualCostTotal,
    decimal EacTotal,
    decimal? PlanMarginPct,
    decimal? ActualMarginPct,
    decimal? EacMarginPct,
    int ProjectsAtRisk,
    IReadOnlyList<AtRiskProjectDto> AtRiskProjects,
    int EacOverrunCount,
    decimal EacOverrunTotal,
    IReadOnlyList<MarginTrendPointDto> MarginTrend);

/// <summary>Per-project drill-down row of a variance category.</summary>
public sealed record VarianceProjectRowDto(
    string ProjectId,
    string Name,
    decimal Plan,
    decimal Actual,
    decimal Variance);

/// <summary>Portfolio-wide plan vs. actual for one category.</summary>
public sealed record VarianceRowDto(
    CostCategory Category,
    decimal Plan,
    decimal Actual,
    decimal Variance,
    decimal? VariancePct,
    IReadOnlyList<VarianceProjectRowDto> Projects);

/// <summary>A cost adjustment (post-calculation correction) as the contract exposes it.</summary>
/// <param name="ProjectId">The project's business key; <c>null</c> for portfolio scope.</param>
/// <param name="Amount">Signed (negative = credit); never zero.</param>
public sealed record CostAdjustmentViewDto(
    string Id,
    string? ProjectId,
    CostCategory Category,
    decimal Amount,
    AdjustmentScope Scope,
    string Reason,
    string CreatedBy,
    DateTime CreatedAt);
