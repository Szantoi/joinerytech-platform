using FluentAssertions;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Services;
using SpaceOS.Modules.QA.Domain.StrongIds;
using SpaceOS.Modules.QA.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Domain.Services;

public class RootCauseAnalysisServiceTests
{
    private readonly RootCauseAnalysisService _service = new();
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly QACheckpointId _checkpointId = QACheckpointId.New();

    [Fact]
    public void AnalyzeRootCauses_WithFailedInspections_ShouldReturnParetoAnalysis()
    {
        // Arrange
        var inspections = CreateFailedInspections(
            (FailureType.Dimension, 5),
            (FailureType.Surface, 3),
            (FailureType.Functional, 2));

        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        // Act
        var result = _service.AnalyzeRootCauses(inspections, fromDate, toDate).ToList();

        // Assert
        result.Should().HaveCount(3);

        // Ordered by count descending
        result[0].FailureType.Should().Be(FailureType.Dimension);
        result[0].Count.Should().Be(5);
        result[0].Percentage.Should().BeApproximately(50.0, 0.1); // 5/10 = 50%
        result[0].CumulativePercentage.Should().BeApproximately(50.0, 0.1);

        result[1].FailureType.Should().Be(FailureType.Surface);
        result[1].Count.Should().Be(3);
        result[1].Percentage.Should().BeApproximately(30.0, 0.1); // 3/10 = 30%
        result[1].CumulativePercentage.Should().BeApproximately(80.0, 0.1); // 50 + 30

        result[2].FailureType.Should().Be(FailureType.Functional);
        result[2].Count.Should().Be(2);
        result[2].Percentage.Should().BeApproximately(20.0, 0.1); // 2/10 = 20%
        result[2].CumulativePercentage.Should().BeApproximately(100.0, 0.1); // 80 + 20
    }

    [Fact]
    public void AnalyzeRootCauses_WithNoFailedInspections_ShouldReturnEmpty()
    {
        // Arrange
        var passedInspection = Inspection.Create(
            _tenantId,
            _checkpointId,
            Guid.NewGuid(),
            DateTime.UtcNow);

        passedInspection.Start();
        passedInspection.CompleteWithPass();

        var inspections = new List<Inspection> { passedInspection };
        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        // Act
        var result = _service.AnalyzeRootCauses(inspections, fromDate, toDate);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void GetTopFailureCategories_ShouldReturnTopN()
    {
        // Arrange
        var inspections = CreateFailedInspections(
            (FailureType.Dimension, 10),
            (FailureType.Surface, 7),
            (FailureType.Functional, 5),
            (FailureType.Gap, 3),
            (FailureType.Scratch, 1));

        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        // Act
        var result = _service.GetTopFailureCategories(inspections, fromDate, toDate, topN: 3).ToList();

        // Assert
        result.Should().HaveCount(3);
        result[0].FailureType.Should().Be(FailureType.Dimension);
        result[1].FailureType.Should().Be(FailureType.Surface);
        result[2].FailureType.Should().Be(FailureType.Functional);
    }

    [Fact]
    public void AnalyzeTicketRootCauses_WithResolvedTickets_ShouldReturnAnalysis()
    {
        // Arrange
        var tickets = new List<Ticket>();

        // Warranty tickets
        for (int i = 0; i < 3; i++)
        {
            var ticket = CreateResolvedTicket(
                TicketType.Warranty,
                CrmTaskPriority.High,
                new List<ResolutionAction>
                {
                    ResolutionAction.Create(ActionType.Replace, "Replaced part", Money.Create(10000m, "HUF"))
                });
            tickets.Add(ticket);
        }

        // Repair tickets
        for (int i = 0; i < 2; i++)
        {
            var ticket = CreateResolvedTicket(
                TicketType.Repair,
                CrmTaskPriority.Medium,
                new List<ResolutionAction>
                {
                    ResolutionAction.Create(ActionType.Repair, "Repaired", Money.Create(5000m, "HUF"))
                });
            tickets.Add(ticket);
        }

        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        // Act
        var result = _service.AnalyzeTicketRootCauses(tickets, fromDate, toDate).ToList();

        // Assert
        result.Should().HaveCount(2);

        var warrantyAnalysis = result.First(r => r.TicketType == TicketType.Warranty);
        warrantyAnalysis.Count.Should().Be(3);
        warrantyAnalysis.TotalCost.Should().Be(30000m); // 3 * 10000

        var repairAnalysis = result.First(r => r.TicketType == TicketType.Repair);
        repairAnalysis.Count.Should().Be(2);
        repairAnalysis.TotalCost.Should().Be(10000m); // 2 * 5000
    }

    [Fact]
    public void AnalyzeTicketRootCauses_ShouldOrderByTotalCostDescending()
    {
        // Arrange
        var expensiveTicket = CreateResolvedTicket(
            TicketType.Warranty,
            CrmTaskPriority.Critical,
            new List<ResolutionAction>
            {
                ResolutionAction.Create(ActionType.Replace, "Expensive part", Money.Create(50000m, "HUF"))
            });

        var cheapTicket = CreateResolvedTicket(
            TicketType.Repair,
            CrmTaskPriority.Low,
            new List<ResolutionAction>
            {
                ResolutionAction.Create(ActionType.Repair, "Minor fix", Money.Create(1000m, "HUF"))
            });

        var tickets = new List<Ticket> { expensiveTicket, cheapTicket };
        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        // Act
        var result = _service.AnalyzeTicketRootCauses(tickets, fromDate, toDate).ToList();

        // Assert
        result[0].TicketType.Should().Be(TicketType.Warranty); // Most expensive first
        result[1].TicketType.Should().Be(TicketType.Repair);
    }

    [Fact]
    public void IdentifyRecurringPatterns_WithRecurringFailures_ShouldReturnPatterns()
    {
        // Arrange
        var inspections = new List<Inspection>();

        // Create 4 inspections with same checkpoint and failure type
        for (int i = 0; i < 4; i++)
        {
            var inspection = Inspection.Create(
                _tenantId,
                _checkpointId,
                Guid.NewGuid(),
                DateTime.UtcNow.AddHours(1));

            inspection.Start();

            var failureNotes = new List<FailureNote>
            {
                FailureNote.Create(FailureType.Dimension, "Recurring dimensional issue")
            };

            inspection.CompleteWithFail(failureNotes);
            inspections.Add(inspection);
        }

        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        // Act
        var result = _service.IdentifyRecurringPatterns(inspections, fromDate, toDate, minimumOccurrences: 3).ToList();

        // Assert
        result.Should().HaveCount(1);
        result[0].CheckpointId.Should().Be(_checkpointId.Value);
        result[0].FailureType.Should().Be(FailureType.Dimension);
        result[0].Occurrences.Should().Be(4);
    }

    [Fact]
    public void IdentifyRecurringPatterns_BelowThreshold_ShouldNotReturn()
    {
        // Arrange
        var inspections = new List<Inspection>();

        // Create only 2 inspections (below threshold of 3)
        for (int i = 0; i < 2; i++)
        {
            var inspection = Inspection.Create(
                _tenantId,
                _checkpointId,
                Guid.NewGuid(),
                DateTime.UtcNow);

            inspection.Start();

            var failureNotes = new List<FailureNote>
            {
                FailureNote.Create(FailureType.Surface, "Visual defect")
            };

            inspection.CompleteWithFail(failureNotes);
            inspections.Add(inspection);
        }

        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        // Act
        var result = _service.IdentifyRecurringPatterns(inspections, fromDate, toDate, minimumOccurrences: 3);

        // Assert
        result.Should().BeEmpty();
    }

    // Helper methods

    private List<Inspection> CreateFailedInspections(params (FailureType Type, int Count)[] failureCounts)
    {
        var inspections = new List<Inspection>();

        foreach (var (type, count) in failureCounts)
        {
            for (int i = 0; i < count; i++)
            {
                var inspection = Inspection.Create(
                    _tenantId,
                    _checkpointId,
                    Guid.NewGuid(),
                    DateTime.UtcNow.AddHours(1));

                inspection.Start();

                var failureNotes = new List<FailureNote>
                {
                    FailureNote.Create(type, $"Failure of type {type}")
                };

                inspection.CompleteWithFail(failureNotes);
                inspections.Add(inspection);
            }
        }

        return inspections;
    }

    private Ticket CreateResolvedTicket(
        TicketType ticketType,
        CrmTaskPriority priority,
        List<ResolutionAction> resolutionActions)
    {
        var ticket = Ticket.Create(
            _tenantId,
            ticketType,
            priority,
            $"{ticketType} ticket",
            $"Description for {ticketType} ticket",
            Guid.NewGuid());

        ticket.Assign(Guid.NewGuid());
        ticket.Start();
        ticket.Resolve(resolutionActions);

        return ticket;
    }
}
