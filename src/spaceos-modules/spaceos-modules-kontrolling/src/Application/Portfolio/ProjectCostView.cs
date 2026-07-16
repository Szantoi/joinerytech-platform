namespace SpaceOS.Modules.Kontrolling.Application.Portfolio;

using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Computes the contract-shaped cost picture of a project from its cost lines
/// and the live cost adjustments.
/// </summary>
/// <remarks>
/// <para>
/// THE SOURCE OF TRUTH for every calculated field the API emits. The portal's
/// <c>services/controlling/calc.ts</c> mirrors this; it is the mirror, not the
/// original.
/// </para>
/// <para>
/// The per-category maths is delegated to the domain
/// (<see cref="CategoryCost.Calculate"/>): projected = MAX(plan, actual),
/// variance = actual − plan, EAC = Σ projected. This type only adds the
/// read-model concerns the domain aggregate has no opinion on: which
/// categories appear, how adjustments fold into actuals, and the
/// fraction/null percentage conventions of the wire contract.
/// </para>
/// <para>
/// Adjustments shift the ACTUAL cost of their category — never the plan.
/// A plan is what was agreed; a post-calculation correction restates what was
/// really spent.
/// </para>
/// </remarks>
public static class ProjectCostView
{
    /// <summary>
    /// Margin fraction: (revenue − cost) / revenue.
    /// Undefined (<c>null</c>) without revenue — a margin on nothing has no meaning.
    /// </summary>
    public static decimal? MarginPct(decimal revenue, decimal cost) =>
        revenue > 0 ? (revenue - cost) / revenue : null;

    /// <summary>
    /// Per-category cost picture, in the canonical category order, containing
    /// only the categories the project actually touches.
    /// </summary>
    /// <param name="lines">The project's planned/actual cost lines.</param>
    /// <param name="adjustments">
    /// Live adjustments to fold into the actuals. The caller decides which are
    /// in scope — see <see cref="PortfolioCostView"/> for why portfolio-scoped
    /// ones are excluded here.
    /// </param>
    public static IReadOnlyList<CategoryCostViewDto> CategoryCosts(
        IEnumerable<ProjectCostLine> lines,
        IEnumerable<CostAdjustment>? adjustments = null)
    {
        var plan = new Dictionary<CostCategory, decimal>();
        var actual = new Dictionary<CostCategory, decimal>();

        foreach (var line in lines)
        {
            plan[line.Category] = plan.GetValueOrDefault(line.Category) + line.Plan.Amount;
            actual[line.Category] = actual.GetValueOrDefault(line.Category) + line.Actual.Amount;
        }

        foreach (var adjustment in adjustments ?? Enumerable.Empty<CostAdjustment>())
        {
            actual[adjustment.Category] =
                actual.GetValueOrDefault(adjustment.Category) + adjustment.Amount.Amount;
        }

        // The enum's declaration order IS the canonical presentation order.
        return Enum.GetValues<CostCategory>()
            .Where(category => plan.ContainsKey(category) || actual.ContainsKey(category))
            .Select(category =>
            {
                var cost = CategoryCost.Calculate(
                    Money.FromHUF(plan.GetValueOrDefault(category)),
                    Money.FromHUF(actual.GetValueOrDefault(category)));

                return new CategoryCostViewDto(
                    category,
                    cost.Planned.Amount,
                    cost.Actual.Amount,
                    cost.Projected.Amount,
                    cost.Variance.Amount);
            })
            .ToList();
    }

    /// <summary>
    /// Rolls per-category costs up into the totals, variance and margins of
    /// the wire contract.
    /// </summary>
    /// <param name="contractValue">Agreed revenue — the margin denominator.</param>
    public static ProjectCostTotals Totals(
        decimal contractValue,
        IReadOnlyList<CategoryCostViewDto> byCategory)
    {
        var planTotal = byCategory.Sum(c => c.Plan);
        var actualTotal = byCategory.Sum(c => c.Actual);
        var eacTotal = byCategory.Sum(c => c.Projected);
        var variance = actualTotal - planTotal;

        return new ProjectCostTotals(
            PlanTotal: planTotal,
            ActualTotal: actualTotal,
            EacTotal: eacTotal,
            Variance: variance,
            VariancePct: planTotal > 0 ? variance / planTotal : null,
            PlanMarginPct: MarginPct(contractValue, planTotal),
            ActualMarginPct: MarginPct(contractValue, actualTotal),
            EacMarginPct: MarginPct(contractValue, eacTotal));
    }

    /// <summary>
    /// The full computed picture of one project: categories plus totals.
    /// </summary>
    public static (IReadOnlyList<CategoryCostViewDto> ByCategory, ProjectCostTotals Totals) Calculate(
        ControllingProjectData project,
        IEnumerable<CostAdjustment>? adjustments = null)
    {
        var byCategory = CategoryCosts(project.Lines, adjustments);
        return (byCategory, Totals(project.ContractValue.Amount, byCategory));
    }
}

/// <summary>
/// Project-level roll-up. Percentages are fractions, <c>null</c> when their
/// denominator is zero.
/// </summary>
/// <param name="EacTotal">Estimate at completion: Σ MAX(plan, actual) per category.</param>
public sealed record ProjectCostTotals(
    decimal PlanTotal,
    decimal ActualTotal,
    decimal EacTotal,
    decimal Variance,
    decimal? VariancePct,
    decimal? PlanMarginPct,
    decimal? ActualMarginPct,
    decimal? EacMarginPct);
