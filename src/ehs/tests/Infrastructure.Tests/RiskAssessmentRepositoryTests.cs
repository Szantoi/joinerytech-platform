using FluentAssertions;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Repositories;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

/// <summary>
/// Integration tests for RiskAssessmentRepository.
/// </summary>
public class RiskAssessmentRepositoryTests : PostgresTestBase
{
    private RiskAssessmentRepository Repository => new(DbContext);
    private readonly Guid _tenantId = Guid.NewGuid();

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
            DateTimeOffset.UtcNow.AddMonths(6));

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
        retrieved.Status.Should().Be(RiskStatus.Active);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenRiskAssessmentDoesNotExist()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await Repository.GetByIdAsync(nonExistentId, _tenantId, CancellationToken.None);

        // Assert
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
            DateTimeOffset.UtcNow.AddMonths(3));

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
        // Arrange
        await AddTestRiskAssessmentsAsync();

        // Act
        var result = await Repository.ListAsync(new RiskAssessmentFilter(), _tenantId, CancellationToken.None);

        // Assert
        result.Should().HaveCountGreaterThanOrEqualTo(3);
    }

    [Fact]
    public async Task ListAsync_ShouldFilterByRiskLevel()
    {
        // Arrange
        await AddTestRiskAssessmentsAsync();

        // Act
        var filter = new RiskAssessmentFilter(RiskLevel: RiskLevel.High);
        var result = await Repository.ListAsync(filter, _tenantId, CancellationToken.None);

        // Assert
        result.Should().HaveCountGreaterThanOrEqualTo(1);
        result.Should().AllSatisfy(r => r.RiskLevel.Should().Be(RiskLevel.High));
    }

    [Fact]
    public async Task ListAsync_ShouldFilterByStatus()
    {
        // Arrange
        await AddTestRiskAssessmentsAsync();

        // Act
        var filter = new RiskAssessmentFilter(Status: RiskStatus.Active);
        var result = await Repository.ListAsync(filter, _tenantId, CancellationToken.None);

        // Assert
        result.Should().HaveCountGreaterThanOrEqualTo(1);
        result.Should().AllSatisfy(r => r.Status.Should().Be(RiskStatus.Active));
    }

    [Fact]
    public async Task ListAsync_ShouldFilterByReviewDueDate()
    {
        // Arrange
        await AddTestRiskAssessmentsAsync();
        var futureDate = DateTimeOffset.UtcNow.AddMonths(3);

        // Act
        var filter = new RiskAssessmentFilter(ReviewDueBefore: futureDate);
        var result = await Repository.ListAsync(filter, _tenantId, CancellationToken.None);

        // Assert
        result.Should().HaveCountGreaterThanOrEqualTo(1);
        result.Should().AllSatisfy(r => r.ReviewDueDate.Should().BeBefore(futureDate));
    }

    [Fact]
    public async Task GetRiskMatrixAsync_ShouldReturnMatrixData()
    {
        // Arrange
        await AddTestRiskAssessmentsAsync();

        // Act
        var matrix = await Repository.GetRiskMatrixAsync(_tenantId, CancellationToken.None);

        // Assert
        matrix.Should().NotBeNull();
        matrix.CellCounts.Should().HaveCountGreaterThan(0);
        matrix.CellCounts.Values.Sum().Should().BeGreaterThanOrEqualTo(3);
    }

    [Fact]
    public async Task GetRiskMatrixSummaryAsync_ShouldReturnSummaryCounts()
    {
        // Arrange
        await AddTestRiskAssessmentsAsync();

        // Act
        var summary = await Repository.GetRiskMatrixSummaryAsync(_tenantId, CancellationToken.None);

        // Assert
        summary.Should().NotBeNull();
        summary.TotalAssessments.Should().BeGreaterThanOrEqualTo(3);
        summary.ByRiskLevel.Should().ContainKey("Low");
        summary.ByRiskLevel.Should().ContainKey("High");
        summary.ByStatus.Should().ContainKey("Active");
        summary.MatrixCells.Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public async Task UpdateAsync_ShouldPersistChanges()
    {
        // Arrange
        var assessment = RiskAssessment.Create(
            _tenantId,
            "Fall hazard",
            Severity.Moderate,
            Likelihood.Possible,
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddMonths(6));

        await Repository.AddAsync(assessment, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Act
        assessment.AddControl("Install guardrails", "Safety Manager");
        await Repository.UpdateAsync(assessment, CancellationToken.None);
        await DbContext.SaveChangesAsync();

        // Assert
        var retrieved = await Repository.GetByIdAsync(assessment.RiskAssessmentId, _tenantId, CancellationToken.None);
        retrieved.Should().NotBeNull();
        retrieved!.Controls.Should().HaveCount(1);
        retrieved.Controls[0].ControlMeasure.Should().Be("Install guardrails");
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
            DateTimeOffset.UtcNow.AddMonths(12));

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
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var exists = await Repository.ExistsAsync(nonExistentId, _tenantId, CancellationToken.None);

        // Assert
        exists.Should().BeFalse();
    }

    private async Task AddTestRiskAssessmentsAsync()
    {
        var assessments = new[]
        {
            RiskAssessment.Create(_tenantId, "Low risk hazard", Severity.Minor, Likelihood.Unlikely, Guid.NewGuid(), DateTimeOffset.UtcNow.AddMonths(12)),
            RiskAssessment.Create(_tenantId, "Medium risk hazard", Severity.Moderate, Likelihood.Possible, Guid.NewGuid(), DateTimeOffset.UtcNow.AddMonths(6)),
            RiskAssessment.Create(_tenantId, "High risk hazard", Severity.Major, Likelihood.Likely, Guid.NewGuid(), DateTimeOffset.UtcNow.AddMonths(1))
        };

        foreach (var assessment in assessments)
        {
            await Repository.AddAsync(assessment, CancellationToken.None);
        }

        await DbContext.SaveChangesAsync();
    }
}
