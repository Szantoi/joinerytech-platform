using FluentAssertions;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;
using Xunit;

namespace SpaceOS.Modules.Ehs.Domain.Tests;

public class RiskAssessmentTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _assessedBy = Guid.NewGuid();

    [Theory]
    [InlineData(Severity.Negligible, Likelihood.Rare, 1, RiskLevel.Low)]       // 1×1 = 1
    [InlineData(Severity.Minor, Likelihood.Unlikely, 4, RiskLevel.Low)]        // 2×2 = 4
    [InlineData(Severity.Moderate, Likelihood.Possible, 9, RiskLevel.Medium)]  // 3×3 = 9
    [InlineData(Severity.Major, Likelihood.Likely, 16, RiskLevel.High)]        // 4×4 = 16
    [InlineData(Severity.Catastrophic, Likelihood.AlmostCertain, 25, RiskLevel.High)] // 5×5 = 25
    public void Create_ShouldCalculateRiskScoreAndLevel(
        Severity severity,
        Likelihood likelihood,
        int expectedScore,
        RiskLevel expectedLevel)
    {
        // Arrange
        var reviewDate = DateTimeOffset.UtcNow.AddMonths(6);

        // Act
        var assessment = RiskAssessment.Create(
            _tenantId,
            "Working at height without safety harness",
            severity,
            likelihood,
            _assessedBy,
            reviewDate);

        // Assert
        assessment.RiskScore.Should().Be(expectedScore);
        assessment.RiskLevel.Should().Be(expectedLevel);
    }

    [Fact]
    public void Create_ShouldSetStatusToActive()
    {
        // Arrange & Act
        var assessment = CreateRiskAssessment(Severity.Moderate, Likelihood.Possible);

        // Assert
        assessment.Status.Should().Be(RiskStatus.Active);
    }

    [Fact]
    public void AddControl_ShouldAddRiskControlMeasure()
    {
        // Arrange
        var assessment = CreateRiskAssessment(Severity.Major, Likelihood.Likely);

        // Act
        assessment.AddControl("Install safety harnesses", "Safety Officer");

        // Assert
        assessment.Controls.Should().HaveCount(1);
        assessment.Controls[0].ControlMeasure.Should().Be("Install safety harnesses");
    }

    [Fact]
    public void Archive_ShouldSetStatusToArchived()
    {
        // Arrange
        var assessment = CreateRiskAssessment(Severity.Minor, Likelihood.Rare);

        // Act
        assessment.Archive();

        // Assert
        assessment.Status.Should().Be(RiskStatus.Archived);
    }

    [Fact]
    public void AddControl_ShouldThrowWhenArchived()
    {
        // Arrange
        var assessment = CreateRiskAssessment(Severity.Minor, Likelihood.Rare);
        assessment.Archive();

        // Act
        var act = () => assessment.AddControl("Test control", "Test person");

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot add controls to archived risk assessment");
    }

    [Fact]
    public void Create_ShouldRaiseRiskAssessmentCreatedEvent()
    {
        // Act
        var assessment = CreateRiskAssessment(Severity.Catastrophic, Likelihood.AlmostCertain);

        // Assert
        var domainEvents = assessment.PopDomainEvents();
        domainEvents.Should().ContainSingle();
        domainEvents.First().Should().BeOfType<RiskAssessmentCreatedEvent>();

        var createdEvent = (RiskAssessmentCreatedEvent)domainEvents.First();
        createdEvent.RiskLevel.Should().Be(RiskLevel.High);
    }

    [Theory]
    [InlineData(Severity.Negligible, Likelihood.Rare, RiskLevel.Low)]         // 1×1 = 1
    [InlineData(Severity.Minor, Likelihood.Possible, RiskLevel.Medium)]        // 2×3 = 6
    [InlineData(Severity.Moderate, Likelihood.Likely, RiskLevel.Medium)]       // 3×4 = 12
    [InlineData(Severity.Major, Likelihood.AlmostCertain, RiskLevel.High)]     // 4×5 = 20
    public void RiskMatrix_ShouldCalculateCorrectLevels(
        Severity severity,
        Likelihood likelihood,
        RiskLevel expectedLevel)
    {
        // Act
        var assessment = CreateRiskAssessment(severity, likelihood);

        // Assert
        assessment.RiskLevel.Should().Be(expectedLevel);
    }

    // Helper method
    private RiskAssessment CreateRiskAssessment(Severity severity, Likelihood likelihood)
    {
        return RiskAssessment.Create(
            _tenantId,
            "Test hazard",
            severity,
            likelihood,
            _assessedBy,
            DateTimeOffset.UtcNow.AddMonths(6));
    }
}
