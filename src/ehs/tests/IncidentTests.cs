using FluentAssertions;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;
using Xunit;

namespace SpaceOS.Modules.Ehs.Domain.Tests;

public class IncidentTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _reportedBy = Guid.NewGuid();
    private readonly Guid _investigatedBy = Guid.NewGuid();
    private readonly Guid _assignedTo = Guid.NewGuid();

    [Fact]
    public void Create_ShouldCreateIncidentInReportedStatus()
    {
        // Arrange
        var incidentDate = DateTimeOffset.UtcNow.AddHours(-2);

        // Act
        var incident = Incident.Create(
            _tenantId,
            IncidentType.Accident,
            incidentDate,
            "Workshop Floor",
            "Employee slipped on wet floor",
            Severity.Minor,
            _reportedBy);

        // Assert
        incident.Should().NotBeNull();
        incident.Status.Should().Be(IncidentStatus.Reported);
        incident.IncidentType.Should().Be(IncidentType.Accident);
        incident.Severity.Should().Be(Severity.Minor);
        incident.ReportedBy.Should().Be(_reportedBy);
    }

    [Fact]
    public void StartInvestigation_ShouldTransitionFromReportedToInvestigated()
    {
        // Arrange
        var incident = CreateReportedIncident();

        // Act
        incident.StartInvestigation(_investigatedBy);

        // Assert
        incident.Status.Should().Be(IncidentStatus.Investigated);
        incident.InvestigatedBy.Should().Be(_investigatedBy);
        incident.InvestigatedAt.Should().NotBeNull();
    }

    [Fact]
    public void StartInvestigation_ShouldThrowWhenNotInReportedStatus()
    {
        // Arrange
        var incident = CreateReportedIncident();
        incident.StartInvestigation(_investigatedBy);

        // Act
        var act = () => incident.StartInvestigation(_investigatedBy);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Can only investigate reported incidents");
    }

    [Fact]
    public void AddCorrectiveAction_ShouldTransitionFromInvestigatedToPlanned()
    {
        // Arrange
        var incident = CreateInvestigatedIncident();

        // Act
        var dueDate = DateTimeOffset.UtcNow.AddDays(7);
        incident.AddCorrectiveAction("Install anti-slip mats", _assignedTo, dueDate);

        // Assert
        incident.Status.Should().Be(IncidentStatus.CorrectiveActionPlanned);
        incident.CorrectiveActions.Should().HaveCount(1);
        incident.CorrectiveActions[0].Description.Should().Be("Install anti-slip mats");
    }

    [Fact]
    public void CloseIncident_ShouldTransitionFromPlannedToClosed()
    {
        // Arrange
        var incident = CreateIncidentWithCorrectiveAction();

        // Act
        incident.CloseIncident();

        // Assert
        incident.Status.Should().Be(IncidentStatus.Closed);
        incident.ClosedAt.Should().NotBeNull();
    }

    [Fact]
    public void ReopenIncident_ShouldTransitionFromClosedToReopened()
    {
        // Arrange
        var incident = CreateIncidentWithCorrectiveAction();
        incident.CloseIncident();

        // Act
        incident.ReopenIncident();

        // Assert
        incident.Status.Should().Be(IncidentStatus.Reopened);
    }

    [Fact]
    public void AddWitness_ShouldAddWitnessStatement()
    {
        // Arrange
        var incident = CreateReportedIncident();
        var witnessId = Guid.NewGuid();

        // Act
        incident.AddWitness(witnessId, "I saw the employee slip on the wet floor");

        // Assert
        incident.Witnesses.Should().HaveCount(1);
        incident.Witnesses[0].EmployeeId.Should().Be(witnessId);
        incident.Witnesses[0].Statement.Should().Contain("wet floor");
    }

    [Fact]
    public void Create_ShouldRaiseIncidentReportedEvent()
    {
        // Act
        var incident = CreateReportedIncident();

        // Assert
        var domainEvents = incident.PopDomainEvents();
        domainEvents.Should().ContainSingle();
        domainEvents.First().Should().BeOfType<IncidentReportedEvent>();
    }

    // Helper methods
    private Incident CreateReportedIncident()
    {
        return Incident.Create(
            _tenantId,
            IncidentType.Accident,
            DateTimeOffset.UtcNow.AddHours(-1),
            "Workshop",
            "Test incident",
            Severity.Minor,
            _reportedBy);
    }

    private Incident CreateInvestigatedIncident()
    {
        var incident = CreateReportedIncident();
        incident.StartInvestigation(_investigatedBy);
        return incident;
    }

    private Incident CreateIncidentWithCorrectiveAction()
    {
        var incident = CreateInvestigatedIncident();
        incident.AddCorrectiveAction("Test action", _assignedTo, DateTimeOffset.UtcNow.AddDays(7));
        return incident;
    }
}
