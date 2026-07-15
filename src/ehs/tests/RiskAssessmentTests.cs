using FluentAssertions;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;
using Xunit;

namespace SpaceOS.Modules.Ehs.Domain.Tests;

/// <summary>
/// RiskAssessment aggregate tests — 5×5 matrix (RISKS-5X5-BE):
/// score/band calculation with CONFIG-DRIVEN band boundaries (band-edge cases!),
/// FSM Draft → UnderReview → Approved → Archived (legal + illegal transitions),
/// unified CAPA linking on controls, and the RiskMatrix cell aggregation.
/// </summary>
public class RiskAssessmentTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _assessedBy = Guid.NewGuid();
    private static readonly RiskBandConfiguration DefaultBands = RiskBandConfiguration.Default;

    // ── Score + band calculation (default bands: Low ≤4, Medium ≤9, High ≤16, Critical ≥17) ──

    [Theory]
    [InlineData(Severity.Negligible, Likelihood.Rare, 1, RiskLevel.Low)]                 // 1×1 = 1 (min)
    [InlineData(Severity.Minor, Likelihood.Unlikely, 4, RiskLevel.Low)]                  // 2×2 = 4 (Low upper edge)
    [InlineData(Severity.Catastrophic, Likelihood.Rare, 5, RiskLevel.Medium)]            // 5×1 = 5 (Medium lower edge)
    [InlineData(Severity.Moderate, Likelihood.Possible, 9, RiskLevel.Medium)]            // 3×3 = 9 (Medium upper edge)
    [InlineData(Severity.Catastrophic, Likelihood.Unlikely, 10, RiskLevel.High)]         // 5×2 = 10 (High lower edge)
    [InlineData(Severity.Major, Likelihood.Likely, 16, RiskLevel.High)]                  // 4×4 = 16 (High upper edge)
    [InlineData(Severity.Major, Likelihood.AlmostCertain, 20, RiskLevel.Critical)]       // 4×5 = 20 (Critical)
    [InlineData(Severity.Catastrophic, Likelihood.AlmostCertain, 25, RiskLevel.Critical)] // 5×5 = 25 (max)
    public void Create_ShouldCalculateRiskScoreAndLevel_AtBandEdges(
        Severity severity,
        Likelihood likelihood,
        int expectedScore,
        RiskLevel expectedLevel)
    {
        var assessment = CreateAssessment(severity, likelihood);

        assessment.RiskScore.Should().Be(expectedScore);
        assessment.RiskLevel.Should().Be(expectedLevel);
    }

    [Fact]
    public void Create_WithCustomBands_ShouldClassifyByConfiguredThresholds()
    {
        // Custom config: Low ≤2, Medium ≤6, High ≤12, Critical ≥13
        var customBands = new RiskBandConfiguration(2, 6, 12);

        var assessment = RiskAssessment.Create(
            _tenantId, "Hazard", Severity.Moderate, Likelihood.Possible,  // 3×3 = 9
            _assessedBy, DateTimeOffset.UtcNow.AddMonths(6), customBands);

        // 9 is Medium with default bands but High with the custom ones → config drives the band
        assessment.RiskLevel.Should().Be(RiskLevel.High);
    }

    // ── RiskBandConfiguration (config value object) ──

    [Theory]
    [InlineData(1, RiskLevel.Low)]
    [InlineData(4, RiskLevel.Low)]       // Low upper edge
    [InlineData(5, RiskLevel.Medium)]    // Medium lower edge
    [InlineData(9, RiskLevel.Medium)]    // Medium upper edge
    [InlineData(10, RiskLevel.High)]     // High lower edge
    [InlineData(16, RiskLevel.High)]     // High upper edge
    [InlineData(17, RiskLevel.Critical)] // Critical lower edge
    [InlineData(25, RiskLevel.Critical)]
    public void BandConfiguration_LevelFor_ShouldClassifyEdgeScores(int score, RiskLevel expected)
    {
        DefaultBands.LevelFor(score).Should().Be(expected);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(26)]
    public void BandConfiguration_LevelFor_ShouldRejectOutOfRangeScore(int score)
    {
        var act = () => DefaultBands.LevelFor(score);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData(0, 9, 16)]   // LowMax below minimum
    [InlineData(9, 9, 16)]   // MediumMax not above LowMax
    [InlineData(4, 16, 16)]  // HighMax not above MediumMax
    [InlineData(4, 9, 25)]   // HighMax leaves no room for Critical
    public void BandConfiguration_ShouldRejectInvalidThresholds(int lowMax, int mediumMax, int highMax)
    {
        var act = () => new RiskBandConfiguration(lowMax, mediumMax, highMax);

        act.Should().Throw<ArgumentException>();
    }

    // ── Creation guards ──

    [Fact]
    public void Create_ShouldStartInDraft_AndRaiseCreatedEvent()
    {
        var assessment = CreateAssessment(Severity.Catastrophic, Likelihood.AlmostCertain);

        assessment.Status.Should().Be(RiskStatus.Draft);

        var domainEvents = assessment.PopDomainEvents();
        domainEvents.Should().ContainSingle();
        var created = domainEvents.First().Should().BeOfType<RiskAssessmentCreatedEvent>().Subject;
        created.RiskLevel.Should().Be(RiskLevel.Critical);
    }

    [Fact]
    public void Create_ShouldStoreOptionalLocationReference()
    {
        var locationId = Guid.NewGuid();

        var assessment = RiskAssessment.Create(
            _tenantId, "Forgó alkatrészek", Severity.Major, Likelihood.Unlikely,
            _assessedBy, DateTimeOffset.UtcNow.AddMonths(6), DefaultBands, locationId);

        assessment.LocationId.Should().Be(locationId);
    }

    [Fact]
    public void Create_ShouldRejectMissingHazardDescription()
    {
        var act = () => RiskAssessment.Create(
            _tenantId, "  ", Severity.Minor, Likelihood.Rare,
            _assessedBy, DateTimeOffset.UtcNow.AddMonths(6), DefaultBands);

        act.Should().Throw<ArgumentException>().WithParameterName("hazardDescription");
    }

    [Fact]
    public void Create_ShouldRejectPastReviewDueDate()
    {
        var act = () => RiskAssessment.Create(
            _tenantId, "Hazard", Severity.Minor, Likelihood.Rare,
            _assessedBy, DateTimeOffset.UtcNow.AddDays(-1), DefaultBands);

        act.Should().Throw<ArgumentException>().WithParameterName("reviewDueDate");
    }

    [Theory]
    [InlineData((Severity)0, Likelihood.Rare, "severity")]
    [InlineData((Severity)6, Likelihood.Rare, "severity")]
    [InlineData(Severity.Minor, (Likelihood)0, "likelihood")]
    [InlineData(Severity.Minor, (Likelihood)6, "likelihood")]
    public void Create_ShouldRejectRatingsOutsideOneToFiveScale(
        Severity severity, Likelihood likelihood, string expectedParam)
    {
        var act = () => RiskAssessment.Create(
            _tenantId, "Hazard", severity, likelihood,
            _assessedBy, DateTimeOffset.UtcNow.AddMonths(6), DefaultBands);

        act.Should().Throw<ArgumentException>().WithParameterName(expectedParam);
    }

    [Fact]
    public void Create_ShouldRejectEmptyLocationId()
    {
        var act = () => RiskAssessment.Create(
            _tenantId, "Hazard", Severity.Minor, Likelihood.Rare,
            _assessedBy, DateTimeOffset.UtcNow.AddMonths(6), DefaultBands, Guid.Empty);

        act.Should().Throw<ArgumentException>().WithParameterName("locationId");
    }

    // ── UpdateDetails (Draft only) ──

    [Fact]
    public void UpdateDetails_InDraft_ShouldRecalculateScoreAndBand()
    {
        var assessment = CreateAssessment(Severity.Minor, Likelihood.Unlikely);  // 4 → Low

        assessment.UpdateDetails(
            "Updated hazard", Severity.Catastrophic, Likelihood.AlmostCertain,   // 25 → Critical
            DateTimeOffset.UtcNow.AddMonths(3), DefaultBands);

        assessment.HazardDescription.Should().Be("Updated hazard");
        assessment.RiskScore.Should().Be(25);
        assessment.RiskLevel.Should().Be(RiskLevel.Critical);
        assessment.PopDomainEvents().Should().ContainSingle(e => e is RiskAssessmentUpdatedEvent);
    }

    [Fact]
    public void UpdateDetails_AfterSubmission_ShouldThrow()
    {
        var assessment = CreateAssessment(Severity.Minor, Likelihood.Unlikely);
        assessment.SubmitForReview();

        var act = () => assessment.UpdateDetails(
            "Changed", Severity.Minor, Likelihood.Rare,
            DateTimeOffset.UtcNow.AddMonths(3), DefaultBands);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only a draft risk assessment can be updated");
    }

    // ── FSM: legal transitions ──

    [Fact]
    public void Fsm_FullLifecycle_DraftToArchived_ShouldSucceed()
    {
        var assessment = CreateAssessment(Severity.Major, Likelihood.Likely);

        assessment.SubmitForReview();
        assessment.Status.Should().Be(RiskStatus.UnderReview);
        assessment.SubmittedAt.Should().NotBeNull();

        assessment.Approve();
        assessment.Status.Should().Be(RiskStatus.Approved);
        assessment.ApprovedAt.Should().NotBeNull();

        assessment.Archive();
        assessment.Status.Should().Be(RiskStatus.Archived);
        assessment.ArchivedAt.Should().NotBeNull();

        assessment.PopDomainEvents().Should().SatisfyRespectively(
            e => e.Should().BeOfType<RiskAssessmentCreatedEvent>(),
            e => e.Should().BeOfType<RiskAssessmentSubmittedForReviewEvent>(),
            e => e.Should().BeOfType<RiskAssessmentApprovedEvent>(),
            e => e.Should().BeOfType<RiskAssessmentArchivedEvent>());
    }

    [Fact]
    public void Fsm_ReturnToDraft_ShouldReopenForEditing()
    {
        var assessment = CreateAssessment(Severity.Major, Likelihood.Likely);
        assessment.SubmitForReview();

        assessment.ReturnToDraft();

        assessment.Status.Should().Be(RiskStatus.Draft);
        assessment.SubmittedAt.Should().BeNull();

        // Reopened draft is editable again
        var act = () => assessment.UpdateDetails(
            "Reworked hazard", Severity.Moderate, Likelihood.Possible,
            DateTimeOffset.UtcNow.AddMonths(6), DefaultBands);
        act.Should().NotThrow();
    }

    // ── FSM: illegal transitions (API → 409) ──

    [Fact]
    public void Fsm_Approve_FromDraft_ShouldThrow()
    {
        var assessment = CreateAssessment(Severity.Minor, Likelihood.Rare);

        var act = () => assessment.Approve();

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only a risk assessment under review can be approved");
    }

    [Fact]
    public void Fsm_Archive_FromDraft_ShouldThrow()
    {
        var assessment = CreateAssessment(Severity.Minor, Likelihood.Rare);

        var act = () => assessment.Archive();

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only an approved risk assessment can be archived");
    }

    [Fact]
    public void Fsm_Archive_FromUnderReview_ShouldThrow()
    {
        var assessment = CreateAssessment(Severity.Minor, Likelihood.Rare);
        assessment.SubmitForReview();

        var act = () => assessment.Archive();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Fsm_SubmitForReview_Twice_ShouldThrow()
    {
        var assessment = CreateAssessment(Severity.Minor, Likelihood.Rare);
        assessment.SubmitForReview();

        var act = () => assessment.SubmitForReview();

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only a draft risk assessment can be submitted for review");
    }

    [Fact]
    public void Fsm_ReturnToDraft_FromApproved_ShouldThrow()
    {
        var assessment = CreateAssessment(Severity.Minor, Likelihood.Rare);
        assessment.SubmitForReview();
        assessment.Approve();

        var act = () => assessment.ReturnToDraft();

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only a risk assessment under review can be returned to draft");
    }

    [Fact]
    public void Fsm_Archive_Twice_ShouldThrow()
    {
        var assessment = CreateApprovedAssessment();
        assessment.Archive();

        var act = () => assessment.Archive();

        act.Should().Throw<InvalidOperationException>();
    }

    // ── Controls + unified CAPA linking ──

    [Fact]
    public void AddControl_ShouldAddMeasure_AndReturnControlForCapaLinking()
    {
        var assessment = CreateAssessment(Severity.Major, Likelihood.Likely);

        var control = assessment.AddControl("Install safety guards", "Safety Officer");

        assessment.Controls.Should().ContainSingle();
        control.ControlMeasure.Should().Be("Install safety guards");
        control.CorrectiveActionId.Should().BeNull();
    }

    [Fact]
    public void AddControl_OnApprovedAssessment_ShouldSucceed()
    {
        var assessment = CreateApprovedAssessment();

        var act = () => assessment.AddControl("Additional guard", "Safety Officer");

        act.Should().NotThrow();
    }

    [Fact]
    public void AddControl_OnArchivedAssessment_ShouldThrow()
    {
        var assessment = CreateApprovedAssessment();
        assessment.Archive();

        var act = () => assessment.AddControl("Test control", "Test person");

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot add controls to an archived risk assessment");
    }

    [Fact]
    public void LinkControlCorrectiveAction_ShouldLinkUnifiedCapa()
    {
        var assessment = CreateAssessment(Severity.Major, Likelihood.Likely);
        var control = assessment.AddControl("Guard rail", "Safety Officer");
        var capaId = Guid.NewGuid();

        assessment.LinkControlCorrectiveAction(control.RiskControlId, capaId);

        assessment.Controls[0].CorrectiveActionId.Should().Be(capaId);
    }

    [Fact]
    public void LinkControlCorrectiveAction_Twice_ShouldThrow()
    {
        var assessment = CreateAssessment(Severity.Major, Likelihood.Likely);
        var control = assessment.AddControl("Guard rail", "Safety Officer");
        assessment.LinkControlCorrectiveAction(control.RiskControlId, Guid.NewGuid());

        var act = () => assessment.LinkControlCorrectiveAction(control.RiskControlId, Guid.NewGuid());

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Risk control is already linked to a corrective action");
    }

    [Fact]
    public void LinkControlCorrectiveAction_UnknownControl_ShouldThrow()
    {
        var assessment = CreateAssessment(Severity.Major, Likelihood.Likely);

        var act = () => assessment.LinkControlCorrectiveAction(Guid.NewGuid(), Guid.NewGuid());

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Risk control * not found on this risk assessment");
    }

    [Fact]
    public void CorrectiveAction_CreateForRiskAssessment_ShouldSetUnifiedCapaSource()
    {
        var riskAssessmentId = Guid.NewGuid();

        var capa = CorrectiveAction.CreateForRiskAssessment(
            _tenantId, riskAssessmentId, "Fix the guard", Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddDays(14));

        capa.Source.Should().Be(CapaSource.RiskAssessment);
        capa.SourceId.Should().Be(riskAssessmentId);
        capa.IncidentId.Should().BeNull();
        capa.FindingId.Should().BeNull();
        capa.IsCompleted.Should().BeFalse();
    }

    // ── RiskMatrix: 5×5 cell aggregation (dashboard summary) ──

    [Fact]
    public void RiskMatrix_BuildCells_ShouldMaterializeAll25Cells_IncludingEmpty()
    {
        var cells = RiskMatrix.BuildCells(
            Array.Empty<(Severity, Likelihood)>(), DefaultBands);

        cells.Should().HaveCount(25);
        cells.Should().OnlyContain(c => c.Count == 0);

        // Every Severity × Likelihood coordinate appears exactly once
        cells.Select(c => (c.Severity, c.Likelihood)).Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public void RiskMatrix_BuildCells_ShouldCountAssessmentsPerCell()
    {
        var assessments = new[]
        {
            (Severity.Major, Likelihood.Likely),        // 4×4
            (Severity.Major, Likelihood.Likely),        // 4×4 (same cell)
            (Severity.Negligible, Likelihood.Rare)      // 1×1
        };

        var cells = RiskMatrix.BuildCells(assessments, DefaultBands);

        cells.Single(c => c.Severity == Severity.Major && c.Likelihood == Likelihood.Likely)
            .Count.Should().Be(2);
        cells.Single(c => c.Severity == Severity.Negligible && c.Likelihood == Likelihood.Rare)
            .Count.Should().Be(1);
        cells.Sum(c => c.Count).Should().Be(3);
    }

    [Fact]
    public void RiskMatrix_BuildCells_ShouldClassifyCellsByConfiguredBands()
    {
        var cells = RiskMatrix.BuildCells(Array.Empty<(Severity, Likelihood)>(), DefaultBands);

        cells.Single(c => c.Severity == Severity.Minor && c.Likelihood == Likelihood.Unlikely)     // 4
            .RiskLevel.Should().Be(RiskLevel.Low);
        cells.Single(c => c.Severity == Severity.Moderate && c.Likelihood == Likelihood.Possible)  // 9
            .RiskLevel.Should().Be(RiskLevel.Medium);
        cells.Single(c => c.Severity == Severity.Major && c.Likelihood == Likelihood.Likely)       // 16
            .RiskLevel.Should().Be(RiskLevel.High);
        cells.Single(c => c.Severity == Severity.Catastrophic && c.Likelihood == Likelihood.AlmostCertain) // 25
            .RiskLevel.Should().Be(RiskLevel.Critical);
    }

    // ── Helpers ──

    private RiskAssessment CreateAssessment(Severity severity, Likelihood likelihood)
    {
        return RiskAssessment.Create(
            _tenantId,
            "Test hazard",
            severity,
            likelihood,
            _assessedBy,
            DateTimeOffset.UtcNow.AddMonths(6),
            DefaultBands);
    }

    private RiskAssessment CreateApprovedAssessment()
    {
        var assessment = CreateAssessment(Severity.Moderate, Likelihood.Possible);
        assessment.SubmitForReview();
        assessment.Approve();
        return assessment;
    }
}
