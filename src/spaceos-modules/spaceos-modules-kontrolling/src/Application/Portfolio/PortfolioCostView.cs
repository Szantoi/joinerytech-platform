namespace SpaceOS.Modules.Kontrolling.Application.Portfolio;

using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Rolls the per-project cost pictures up into the executive portfolio views:
/// the summary KPIs and the category variance analysis.
/// </summary>
/// <remarks>
/// <para>
/// SCOPE SEMANTICS — the one rule that governs this whole type. A
/// project-scoped adjustment belongs to exactly one project, so it lands in
/// that project's actuals and flows naturally into every total. A
/// portfolio-scoped adjustment belongs to no single project, so it is added
/// ONCE to the portfolio totals and never to a project.
/// </para>
/// <para>
/// This deliberately diverges from <see cref="CostAdjustment.AppliesTo"/>,
/// which reports a portfolio-scoped adjustment as applying to EVERY project.
/// Summing that across projects would multiply a single correction by the
/// project count. The read model therefore partitions by scope instead of
/// asking <c>AppliesTo</c>. See the task doc's follow-up: the two readings
/// should converge on one explicit rule.
/// </para>
/// </remarks>
public static class PortfolioCostView
{
    /// <summary>
    /// Computes one project's list row from its master data and the live
    /// adjustments of the tenant (project-scoped ones are matched here).
    /// </summary>
    public static ProjectListItemDto ToListItem(
        ControllingProjectData project,
        IReadOnlyList<CostAdjustment> allAdjustments)
    {
        var (byCategory, totals) = ProjectCostView.Calculate(
            project,
            ProjectScoped(allAdjustments, project.ProjectId));

        return new ProjectListItemDto(
            Id: project.ProjectCode,
            Name: project.Name,
            Customer: project.Customer,
            Status: project.Status,
            ContractValue: project.ContractValue.Amount,
            Invoiced: project.Invoiced.Amount,
            ByCategory: byCategory,
            PlanTotal: totals.PlanTotal,
            ActualTotal: totals.ActualTotal,
            EacTotal: totals.EacTotal,
            Variance: totals.Variance,
            VariancePct: totals.VariancePct,
            PlanMarginPct: totals.PlanMarginPct,
            ActualMarginPct: totals.ActualMarginPct,
            EacMarginPct: totals.EacMarginPct);
    }

    /// <summary>Live, project-scoped adjustments belonging to one project.</summary>
    public static IReadOnlyList<CostAdjustment> ProjectScoped(
        IEnumerable<CostAdjustment> adjustments,
        Guid projectId) =>
        adjustments
            .Where(a => !a.IsDeleted
                        && a.Scope == AdjustmentScope.Project
                        && a.ProjectId == projectId)
            .ToList();

    /// <summary>Live, portfolio-scoped adjustments — they belong to no project.</summary>
    public static IReadOnlyList<CostAdjustment> PortfolioScoped(
        IEnumerable<CostAdjustment> adjustments) =>
        adjustments
            .Where(a => !a.IsDeleted && a.Scope == AdjustmentScope.Portfolio)
            .ToList();

    /// <summary>
    /// The executive summary across every project of the tenant.
    /// </summary>
    /// <param name="marginTrend">
    /// Historic trend points to prepend to the current month. See
    /// <c>GetPortfolioSummaryViewQueryHandler</c> — the module stores no cost
    /// history, so this is currently empty.
    /// </param>
    public static PortfolioSummaryViewDto Summarize(
        IReadOnlyList<ProjectListItemDto> projects,
        IReadOnlyList<CostAdjustment> allAdjustments,
        PortfolioThresholds thresholds,
        DateTime asOf,
        IReadOnlyList<MarginTrendPointDto>? marginTrend = null)
    {
        // Counted once, at the portfolio level — see the type's remarks.
        var portfolioAdjustment = PortfolioScoped(allAdjustments).Sum(a => a.Amount.Amount);

        var contractTotal = projects.Sum(p => p.ContractValue);
        var invoicedTotal = projects.Sum(p => p.Invoiced);
        var planCostTotal = projects.Sum(p => p.PlanTotal);
        var actualCostTotal = projects.Sum(p => p.ActualTotal) + portfolioAdjustment;
        var eacTotal = projects.Sum(p => p.EacTotal) + portfolioAdjustment;

        var atRiskProjects = projects
            .Where(p => thresholds.IsAtRisk(p.Status, p.EacMarginPct))
            .Select(p => new AtRiskProjectDto(p.Id, p.Name, p.EacMarginPct))
            .ToList();

        var overruns = projects.Where(p => p.EacTotal > p.PlanTotal).ToList();

        var planMarginPct = ProjectCostView.MarginPct(contractTotal, planCostTotal);
        var actualMarginPct = ProjectCostView.MarginPct(contractTotal, actualCostTotal);

        // The current month is computed from live data, so the last trend point
        // is always consistent with the KPIs above.
        var currentPoint = new MarginTrendPointDto(
            Month: asOf.ToString("yyyy-MM", System.Globalization.CultureInfo.InvariantCulture),
            PlanMarginPct: planMarginPct ?? 0m,
            ActualMarginPct: actualMarginPct ?? 0m);

        return new PortfolioSummaryViewDto(
            ProjectCount: projects.Count,
            ContractTotal: contractTotal,
            InvoicedTotal: invoicedTotal,
            PlanCostTotal: planCostTotal,
            ActualCostTotal: actualCostTotal,
            EacTotal: eacTotal,
            PlanMarginPct: planMarginPct,
            ActualMarginPct: actualMarginPct,
            EacMarginPct: ProjectCostView.MarginPct(contractTotal, eacTotal),
            ProjectsAtRisk: atRiskProjects.Count,
            AtRiskProjects: atRiskProjects,
            EacOverrunCount: overruns.Count,
            EacOverrunTotal: overruns.Sum(p => p.EacTotal - p.PlanTotal),
            MarginTrend: [.. marginTrend ?? [], currentPoint]);
    }

    /// <summary>
    /// Portfolio-wide plan vs. actual per category, each with a per-project
    /// drill-down ordered worst-overspend first. Categories no project touches
    /// are omitted.
    /// </summary>
    /// <remarks>
    /// Built from project costs, so it reflects project-scoped adjustments
    /// only — a portfolio-scoped correction belongs to no project and so has
    /// no drill-down row to live in.
    /// </remarks>
    public static IReadOnlyList<VarianceRowDto> Variance(IReadOnlyList<ProjectListItemDto> projects)
    {
        return Enum.GetValues<CostCategory>()
            .Select(category =>
            {
                var rows = projects
                    .Select(project => (project, cost: project.ByCategory
                        .FirstOrDefault(c => c.Category == category)))
                    .Where(x => x.cost is not null)
                    .Select(x => new VarianceProjectRowDto(
                        ProjectId: x.project.Id,
                        Name: x.project.Name,
                        Plan: x.cost!.Plan,
                        Actual: x.cost.Actual,
                        Variance: x.cost.Variance))
                    .OrderByDescending(r => r.Variance)
                    .ToList();

                var plan = rows.Sum(r => r.Plan);
                var actual = rows.Sum(r => r.Actual);
                var variance = actual - plan;

                return new VarianceRowDto(
                    Category: category,
                    Plan: plan,
                    Actual: actual,
                    Variance: variance,
                    VariancePct: plan > 0 ? variance / plan : null,
                    Projects: rows);
            })
            .Where(row => row.Projects.Count > 0)
            .ToList();
    }
}
