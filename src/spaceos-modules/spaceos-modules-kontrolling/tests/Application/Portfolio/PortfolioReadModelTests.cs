namespace SpaceOS.Modules.Kontrolling.Tests.Application.Portfolio;

using FluentAssertions;
using SpaceOS.Modules.Kontrolling.Api;
using SpaceOS.Modules.Kontrolling.Application.Portfolio;
using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;
using Xunit;

/// <summary>
/// Unit tests for the controlling read model's calculation rules and its
/// configuration guards.
/// </summary>
/// <remarks>
/// The HTTP-level behaviour is covered by <c>KontrollingEndpointsTests</c>;
/// these pin the rules that are easy to get subtly wrong and expensive to
/// notice — category selection, the plan/actual asymmetry of adjustments, and
/// the fail-fast configuration guards.
/// </remarks>
public sealed class ProjectCostViewTests
{
    private static ProjectCostLine Line(CostCategory category, decimal plan, decimal actual)
        => new(category, "sor", Money.FromHUF(plan), Money.FromHUF(actual));

    [Theory]
    [InlineData(1000, 250, 0.75)]
    [InlineData(1000, 1200, -0.2)]   // loss
    [InlineData(1000, 1000, 0)]
    public void MarginPct_IsAFraction(decimal revenue, decimal cost, decimal expected)
        => ProjectCostView.MarginPct(revenue, cost).Should().Be(expected);

    [Fact]
    public void MarginPct_WithoutRevenue_IsUndefined()
    {
        // Not zero: a margin on no revenue has no meaning, and reporting 0
        // would render as a real "0% margin" in the UI.
        ProjectCostView.MarginPct(0m, 100m).Should().BeNull();
    }

    [Fact]
    public void CategoryCosts_UsesCanonicalOrder_AndOnlyTouchedCategories()
    {
        var costs = ProjectCostView.CategoryCosts([
            Line(CostCategory.Overhead, 100m, 100m),
            Line(CostCategory.Material, 200m, 200m)
        ]);

        costs.Select(c => c.Category).Should().Equal(CostCategory.Material, CostCategory.Overhead);
    }

    [Fact]
    public void CategoryCosts_SumsRepeatedCategoryLines()
    {
        var costs = ProjectCostView.CategoryCosts([
            Line(CostCategory.Material, 620_000m, 684_000m),
            Line(CostCategory.Material, 0m, 42_000m)
        ]);

        var material = costs.Single();
        material.Plan.Should().Be(620_000m);
        material.Actual.Should().Be(726_000m);
    }

    [Fact]
    public void CategoryCosts_ProjectsTheHigherOfPlanAndActual()
    {
        var costs = ProjectCostView.CategoryCosts([
            Line(CostCategory.Material, 300_000m, 100_000m),  // under budget
            Line(CostCategory.Labor, 100_000m, 250_000m)      // over budget
        ]);

        // EAC assumes an under-spent category will still cost its plan, and an
        // over-spent one will not become cheaper again.
        costs[0].Projected.Should().Be(300_000m);
        costs[0].Variance.Should().Be(-200_000m);
        costs[1].Projected.Should().Be(250_000m);
        costs[1].Variance.Should().Be(150_000m);
    }

    [Fact]
    public void CategoryCosts_AdjustmentsMoveActualOnly_NeverPlan()
    {
        var adjustment = CostAdjustment.Create(
            Guid.NewGuid(), Guid.NewGuid(), CostCategory.Material,
            Money.FromHUF(-50_000m), AdjustmentScope.Project, "Jóváírás", Guid.NewGuid());

        var costs = ProjectCostView.CategoryCosts(
            [Line(CostCategory.Material, 300_000m, 300_000m)], [adjustment]);

        // The plan is what was agreed; a correction restates what was spent.
        costs.Single().Plan.Should().Be(300_000m);
        costs.Single().Actual.Should().Be(250_000m);
    }

    [Fact]
    public void CategoryCosts_AdjustmentCanIntroduceACategoryWithNoLine()
    {
        var adjustment = CostAdjustment.Create(
            Guid.NewGuid(), Guid.NewGuid(), CostCategory.Overhead,
            Money.FromHUF(10_000m), AdjustmentScope.Project, "Rezsi-korrekció", Guid.NewGuid());

        var costs = ProjectCostView.CategoryCosts(
            [Line(CostCategory.Material, 100m, 100m)], [adjustment]);

        var overhead = costs.Single(c => c.Category == CostCategory.Overhead);
        overhead.Plan.Should().Be(0m);
        overhead.Actual.Should().Be(10_000m);
    }

    [Fact]
    public void Totals_WithoutAPlan_LeaveVariancePctUndefined()
    {
        var costs = ProjectCostView.CategoryCosts([Line(CostCategory.Material, 0m, 50_000m)]);

        var totals = ProjectCostView.Totals(contractValue: 100_000m, costs);

        // Overspending against no plan is not "infinitely over budget".
        totals.Variance.Should().Be(50_000m);
        totals.VariancePct.Should().BeNull();
    }
}

/// <inheritdoc cref="PortfolioCostView"/>
public sealed class PortfolioCostViewTests
{
    private static readonly Guid Tenant = Guid.NewGuid();

    private static ControllingProjectData Project(
        string code,
        ProjectLifecycleStatus status = ProjectLifecycleStatus.Active,
        decimal contractValue = 1_000_000m,
        params ProjectCostLine[] lines)
        => new(Guid.NewGuid(), code, $"Projekt {code}", "Ügyfél",
            status, Money.FromHUF(contractValue), Money.Zero(), lines);

    private static ProjectCostLine Line(CostCategory category, decimal plan, decimal actual)
        => new(category, "sor", Money.FromHUF(plan), Money.FromHUF(actual));

    [Fact]
    public void PortfolioScopedAdjustment_IsNotAttributedToAnyProject()
    {
        // The domain's CostAdjustment.AppliesTo reports a portfolio-scoped
        // adjustment as applying to EVERY project; summing that across the
        // portfolio would multiply one correction by the project count.
        var portfolioAdjustment = CostAdjustment.Create(
            Tenant, null, CostCategory.Overhead, Money.FromHUF(50_000m),
            AdjustmentScope.Portfolio, "Energia-átalány", Guid.NewGuid());

        var project = Project("PRJ-A", lines: Line(CostCategory.Overhead, 100_000m, 100_000m));
        var row = PortfolioCostView.ToListItem(project, [portfolioAdjustment]);

        row.ActualTotal.Should().Be(100_000m);

        // ...but it does count once at the portfolio level.
        var summary = PortfolioCostView.Summarize(
            [row], [portfolioAdjustment], PortfolioThresholds.Default, DateTime.UtcNow);

        summary.ActualCostTotal.Should().Be(150_000m);
    }

    [Fact]
    public void DeletedAdjustments_AreIgnoredEverywhere()
    {
        var adjustment = CostAdjustment.Create(
            Tenant, null, CostCategory.Overhead, Money.FromHUF(50_000m),
            AdjustmentScope.Portfolio, "Korrekció", Guid.NewGuid());
        adjustment.Delete(Guid.NewGuid());

        var project = Project("PRJ-A", lines: Line(CostCategory.Overhead, 100_000m, 100_000m));
        var row = PortfolioCostView.ToListItem(project, [adjustment]);

        var summary = PortfolioCostView.Summarize(
            [row], [adjustment], PortfolioThresholds.Default, DateTime.UtcNow);

        summary.ActualCostTotal.Should().Be(100_000m);
    }

    [Fact]
    public void Summarize_WithNoProjects_ReportsUndefinedMargins()
    {
        var summary = PortfolioCostView.Summarize(
            [], [], PortfolioThresholds.Default, new DateTime(2026, 7, 16));

        summary.ProjectCount.Should().Be(0);
        summary.EacMarginPct.Should().BeNull();
        // The trend still carries the current month, with margins floored at 0
        // for the chart.
        summary.MarginTrend.Should().ContainSingle()
            .Which.Month.Should().Be("2026-07");
    }

    [Fact]
    public void Variance_DrillDownIsOrderedByWorstOverspendFirst()
    {
        var rows = new[]
        {
            PortfolioCostView.ToListItem(Project("PRJ-A", lines: Line(CostCategory.Material, 100m, 90m)), []),
            PortfolioCostView.ToListItem(Project("PRJ-B", lines: Line(CostCategory.Material, 100m, 160m)), []),
            PortfolioCostView.ToListItem(Project("PRJ-C", lines: Line(CostCategory.Material, 100m, 120m)), [])
        };

        var variance = PortfolioCostView.Variance(rows).Single();

        variance.Projects.Select(p => p.ProjectId).Should().Equal("PRJ-B", "PRJ-C", "PRJ-A");
    }
}

/// <inheritdoc cref="PortfolioThresholds"/>
public sealed class PortfolioThresholdsTests
{
    [Fact]
    public void APercentageInsteadOfAFraction_IsRejected()
    {
        // 15 would mean "flag every project whose margin is under 1500%".
        var act = () => new PortfolioThresholds(15m, [ProjectLifecycleStatus.Active]);

        act.Should().Throw<ArgumentOutOfRangeException>()
            .WithMessage("*fraction below 1*");
    }

    [Fact]
    public void AnEmptyStatusSet_IsRejected()
    {
        // Would silently disable the at-risk KPI.
        var act = () => new PortfolioThresholds(0.15m, []);

        act.Should().Throw<ArgumentException>().WithMessage("*at least one lifecycle label*");
    }

    [Theory]
    [InlineData(ProjectLifecycleStatus.Active, 0.10, true)]
    [InlineData(ProjectLifecycleStatus.Install, 0.10, true)]
    [InlineData(ProjectLifecycleStatus.OnHold, 0.10, true)]
    [InlineData(ProjectLifecycleStatus.Active, 0.15, false)]   // exactly at the threshold
    [InlineData(ProjectLifecycleStatus.Active, 0.30, false)]
    [InlineData(ProjectLifecycleStatus.Draft, 0.10, false)]    // not running yet
    [InlineData(ProjectLifecycleStatus.Done, 0.10, false)]     // nothing left to save
    public void IsAtRisk_NeedsARunningProjectBelowTheThreshold(
        ProjectLifecycleStatus status, decimal margin, bool expected)
        => PortfolioThresholds.Default.IsAtRisk(status, margin).Should().Be(expected);

    [Fact]
    public void AnUnknownMargin_IsNeverAtRisk()
    {
        // No contract value means nothing to measure against.
        PortfolioThresholds.Default
            .IsAtRisk(ProjectLifecycleStatus.Active, null).Should().BeFalse();
    }
}

/// <inheritdoc cref="EnumWireMap{TEnum}"/>
public sealed class KontrollingWireTests
{
    [Fact]
    public void EveryCostCategory_HasAHungarianSpelling()
    {
        // The map's constructor enforces completeness; this pins the exact
        // vocabulary the client's zod enum expects.
        Enum.GetValues<CostCategory>().Select(KontrollingWire.Category.ToWire)
            .Should().Equal("anyag", "munka", "bermunka", "szallitas", "beszallito", "rezsi");
    }

    [Fact]
    public void EveryLifecycleLabel_HasASpelling()
        => Enum.GetValues<ProjectLifecycleStatus>().Select(KontrollingWire.Status.ToWire)
            .Should().Equal("draft", "active", "install", "done", "on_hold");

    [Fact]
    public void AddingAnEnumMemberWithoutASpelling_FailsFast()
    {
        // Guards the whole scheme: a member with no wire name would otherwise
        // serialise as something the client cannot parse.
        var act = () => new EnumWireMap<CostCategory>(
            new Dictionary<CostCategory, string> { [CostCategory.Material] = "anyag" });

        act.Should().Throw<ArgumentException>().WithMessage("*without a wire spelling*");
    }

    [Fact]
    public void ParsingIsCaseSensitive()
    {
        // The contract spells them lowercase; accepting "Anyag" would invite
        // clients to drift.
        KontrollingWire.Category.TryParse("anyag", out var category).Should().BeTrue();
        category.Should().Be(CostCategory.Material);

        KontrollingWire.Category.TryParse("Anyag", out _).Should().BeFalse();
        KontrollingWire.Category.TryParse(null, out _).Should().BeFalse();
    }
}
