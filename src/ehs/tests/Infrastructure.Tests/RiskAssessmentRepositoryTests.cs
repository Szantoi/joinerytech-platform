using FluentAssertions;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Repositories;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

/// <summary>
/// Integration tests for RiskAssessmentRepository (5×5 matrix, FSM Draft→…→Archived).
/// </summary>
public class RiskAssessmentRepositoryTests : PostgresTestBase
{
    private RiskAssessmentRepository Repository => new(DbContext);
    private readonly Guid _tenantId = Guid.NewGuid();
    private static readonly RiskBandConfiguration Bands = RiskBandConfiguration.Default;

    [Fact]
    public async Task AddAsync_ShouldPersistRiskAssessment()
    {
        // Arrange
        var assessment = RiskAssessment.Create(
            _tenantId,
            "Electrical hazard in workshop",
            Severity.Major,
            Likelihood.Likely,
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddMonths(6),
            Bands);

        // Act
        await Repository.AddAsync(assessment, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Assert
        var retrieved = await Repository.GetByIdAsync(assessment.RiskAssessmentId, _tenantId, CancellationToken.None);
        retrieved.Should().NotBeNull();
        retrieved!.HazardDescription.Should().Be("Electrical hazard in workshop");
        retrieved.Severity.Should().Be(Severity.Major);
        retrieved.Likelihood.Should().Be(Likelihood.Likely);
        retrieved.RiskScore.Should().Be(16); // 4 × 4
        retrieved.RiskLevel.Should().Be(RiskLevel.High);
        retrieved.Status.Should().Be(RiskStatus.Draft);
    }

    [Fact]
    public async Task AddAsync_ShouldPersistLocationReference()
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var assessment = RiskAssessment.Create(
            _tenantId,
            "Forklift traffic hazard",
            Severity.Moderate,
            Likelihood.Likely,
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddMonths(6),
            Bands,
            locationId);

        // Act
        await Repository.AddAsync(assessment, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Assert
        var retrieved = await Repository.GetByIdAsync(assessment.RiskAssessmentId, _tenantId, CancellationToken.None);
        retrieved!.LocationId.Should().Be(locationId);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenRiskAssessmentDoesNotExist()
    {
        var result = await Repository.GetByIdAsync(Guid.NewGuid(), _tenantId, CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_ShouldIncludeControls()
    {
        // Arrange
        var assessment = RiskAssessment.Create(
            _tenantId,
            "Chemical storage risk",
            Severity.Moderate,
            Likelihood.Possible,
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddMonths(3),
            Bands);

        assessment.AddControl("Install ventilation system", "John Doe");
        assessment.AddControl("Provide PPE", "Jane Smith");

        await Repository.AddAsync(assessment, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        var retrieved = await Repository.GetByIdAsync(assessment.RiskAssessmentId, _tenantId, CancellationToken.None);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Controls.Should().HaveCount(2);
        retrieved.Controls[0].ControlMeasure.Should().Be("Install ventilation system");
        retrieved.Controls[1].ControlMeasure.Should().Be("Provide PPE");
    }

    [Fact]
    public async Task ListAsync_ShouldReturnAllRiskAssessments_WhenNoFilterProvided()
    {
        await AddTestRiskAssessmentsAsync();

        var result = await Repository.ListAsync(new RiskAssessmentFilter(), _tenantId, CancellationToken.None);

        result.Should().HaveCountGreaterThanOrEqualTo(3);
    }

    [Fact]
    public async Task ListAsync_ShouldFilterByRiskLevel()
    {
        await AddTestRiskAssessmentsAsync();

        var filter = new RiskAssessmentFilter(RiskLevel: RiskLevel.High);
        var result = await Repository.ListAsync(filter, _tenantId, CancellationToken.None);

        result.Should().HaveCountGreaterThanOrEqualTo(1);
        result.Should().AllSatisfy(r => r.RiskLevel.Should().Be(RiskLevel.High));
    }

    [Fact]
    public async Task ListAsync_ShouldFilterByStatus()
    {
        await AddTestRiskAssessmentsAsync();

        var filter = new RiskAssessmentFilter(Status: RiskStatus.Draft);
        var result = await Repository.ListAsync(filter, _tenantId, CancellationToken.None);

        result.Should().HaveCountGreaterThanOrEqualTo(1);
        result.Should().AllSatisfy(r => r.Status.Should().Be(RiskStatus.Draft));
    }

    [Fact]
    public async Task ListAsync_ShouldFilterByLocation()
    {
        // Arrange
        var locationId = Guid.NewGuid();
        var assessment = RiskAssessment.Create(
            _tenantId, "Location-specific hazard", Severity.Minor, Likelihood.Possible,
            Guid.NewGuid(), DateTimeOffset.UtcNow.AddMonths(6), Bands, locationId);

        await Repository.AddAsync(assessment, CancellationToken.None);
        await AddTestRiskAssessmentsAsync();  // no-location entries

        // Act
        var filter = new RiskAssessmentFilter(LocationId: locationId);
        var result = await Repository.ListAsync(filter, _tenantId, CancellationToken.None);

        // Assert
        result.Should().ContainSingle();
        result[0].LocationId.Should().Be(locationId);
    }

    [Fact]
    public async Task ListAsync_ShouldFilterByReviewDueDate()
    {
        await AddTestRiskAssessmentsAsync();
        var futureDate = DateTimeOffset.UtcNow.AddMonths(3);

        var filter = new RiskAssessmentFilter(ReviewDueBefore: futureDate);
        var result = await Repository.ListAsync(filter, _tenantId, CancellationToken.None);

        result.Should().HaveCountGreaterThanOrEqualTo(1);
        result.Should().AllSatisfy(r => r.ReviewDueDate.Should().BeBefore(futureDate));
    }

    [Fact]
    public async Task GetMatrixProjectionAsync_ShouldReturnNonArchivedCoordinates()
    {
        // Arrange
        await AddTestRiskAssessmentsAsync();

        // Approve + archive one entry — it must disappear from the projection
        var archived = RiskAssessment.Create(
            _tenantId, "Archived hazard", Severity.Minor, Likelihood.Rare,
            Guid.NewGuid(), DateTimeOffset.UtcNow.AddMonths(6), Bands);
        archived.SubmitForReview();
        archived.Approve();
        archived.Archive();
        await Repository.AddAsync(archived, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        var projection = await Repository.GetMatrixProjectionAsync(_tenantId, CancellationToken.None);

        // Assert
        projection.Should().HaveCountGreaterThanOrEqualTo(3);
        projection.Should().AllSatisfy(p => p.Status.Should().NotBe(RiskStatus.Archived));
    }

    [Fact]
    public async Task UpdateAsync_ShouldPersistFsmTransitionAndControls()
    {
        // Arrange
        var assessment = RiskAssessment.Create(
            _tenantId,
            "Fall hazard",
            Severity.Moderate,
            Likelihood.Possible,
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddMonths(6),
            Bands);

        await Repository.AddAsync(assessment, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        assessment.SubmitForReview();
        var control = assessment.AddControl("Install guardrails", "Safety Manager");
        assessment.LinkControlCorrectiveAction(control.RiskControlId, Guid.NewGuid());
        await Repository.UpdateAsync(assessment, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Assert
        var retrieved = await Repository.GetByIdAsync(assessment.RiskAssessmentId, _tenantId, CancellationToken.None);
        retrieved.Should().NotBeNull();
        retrieved!.Status.Should().Be(RiskStatus.UnderReview);
        retrieved.Controls.Should().HaveCount(1);
        retrieved.Controls[0].ControlMeasure.Should().Be("Install guardrails");
        retrieved.Controls[0].CorrectiveActionId.Should().NotBeNull();
    }

    [Fact]
    public async Task ExistsAsync_ShouldReturnTrue_WhenRiskAssessmentExists()
    {
        // Arrange
        var assessment = RiskAssessment.Create(
            _tenantId,
            "Test hazard",
            Severity.Minor,
            Likelihood.Unlikely,
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddMonths(12),
            Bands);

        await Repository.AddAsync(assessment, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        var exists = await Repository.ExistsAsync(assessment.RiskAssessmentId, _tenantId, CancellationToken.None);

        // Assert
        exists.Should().BeTrue();
    }

    [Fact]
    public async Task ExistsAsync_ShouldReturnFalse_WhenRiskAssessmentDoesNotExist()
    {
        var exists = await Repository.ExistsAsync(Guid.NewGuid(), _tenantId, CancellationToken.None);

        exists.Should().BeFalse();
    }

    private async Task AddTestRiskAssessmentsAsync()
    {
        var assessments = new[]
        {
            RiskAssessment.Create(_tenantId, "Low risk hazard", Severity.Minor, Likelihood.Unlikely, Guid.NewGuid(), DateTimeOffset.UtcNow.AddMonths(12), Bands),
            RiskAssessment.Create(_tenantId, "Medium risk hazard", Severity.Moderate, Likelihood.Possible, Guid.NewGuid(), DateTimeOffset.UtcNow.AddMonths(6), Bands),
            RiskAssessment.Create(_tenantId, "High risk hazard", Severity.Major, Likelihood.Likely, Guid.NewGuid(), DateTimeOffset.UtcNow.AddMonths(1), Bands)
        };

        foreach (var assessment in assessments)
        {
            await Repository.AddAsync(assessment, CancellationToken.None);
        }

        await DbContext.SaveChangesAsync();
    }
}
