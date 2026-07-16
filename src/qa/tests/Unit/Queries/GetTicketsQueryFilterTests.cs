using FluentAssertions;
using SpaceOS.Modules.QA.Application.Queries;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Unit.Queries;

/// <summary>
/// Pure in-memory filter/sort step of GetTicketsQueryHandler
/// (portal MSW list contract: open-only guard, case-insensitive free-text
/// search, newest report first).
/// </summary>
public class GetTicketsQueryFilterTests
{
    private static Ticket CreateTicket(
        string title = "Élzárás sérült a szekrényen",
        string description = "A jobb oldali ajtó élzárása több helyen levált.",
        DateTime? reportedAt = null)
    {
        var ticket = Ticket.Create(
            Guid.NewGuid(),
            TicketType.Repair,
            CrmTaskPriority.Medium,
            title,
            description,
            Guid.NewGuid());

        if (reportedAt.HasValue)
        {
            // Deterministic ordering test data (ReportedAt is set by the aggregate)
            typeof(Ticket).GetProperty(nameof(Ticket.ReportedAt))!
                .SetValue(ticket, reportedAt.Value);
        }

        return ticket;
    }

    [Fact]
    public void OpenOnly_KeepsReportedAssignedInProgress_DropsRejectedAndResolved()
    {
        var reported = CreateTicket();

        var assigned = CreateTicket();
        assigned.Assign(Guid.NewGuid());

        var inProgress = CreateTicket();
        inProgress.Assign(Guid.NewGuid());
        inProgress.Start();

        var rejected = CreateTicket();
        rejected.Assign(Guid.NewGuid());
        rejected.Start();
        rejected.Reject("Nem indokolt reklamáció");

        var resolved = CreateTicket();
        resolved.Assign(Guid.NewGuid());
        resolved.Start();
        resolved.Resolve(new List<ResolutionAction>
        {
            ResolutionAction.Create(ActionType.Repair, "Újraragasztás", Money.Zero("HUF"))
        });

        var result = GetTicketsQueryHandler.ApplyInMemoryFilters(
            new[] { reported, assigned, inProgress, rejected, resolved },
            openOnly: true,
            searchText: null).ToList();

        result.Should().HaveCount(3);
        result.Select(t => t.Status).Should().BeEquivalentTo(new[]
        {
            TicketStatus.Reported, TicketStatus.Assigned, TicketStatus.InProgress
        });
    }

    [Fact]
    public void SearchText_MatchesTitleAndDescription_CaseInsensitive()
    {
        var byTitle = CreateTicket(title: "Zsanér kilazult a konyhaajtón");
        var byDescription = CreateTicket(description: "A ZSANÉR csavarjai kilazultak szállításkor.");
        var noMatch = CreateTicket(title: "Fiókfront színeltérés", description: "A front árnyalata eltér a rendelttől.");

        var result = GetTicketsQueryHandler.ApplyInMemoryFilters(
            new[] { byTitle, byDescription, noMatch },
            openOnly: false,
            searchText: "zsanér").ToList();

        result.Should().HaveCount(2);
        result.Should().NotContain(noMatch);
    }

    [Fact]
    public void Result_IsSortedByReportedAtDescending()
    {
        var oldest = CreateTicket(reportedAt: new DateTime(2026, 7, 1, 8, 0, 0, DateTimeKind.Utc));
        var newest = CreateTicket(reportedAt: new DateTime(2026, 7, 14, 8, 0, 0, DateTimeKind.Utc));
        var middle = CreateTicket(reportedAt: new DateTime(2026, 7, 7, 8, 0, 0, DateTimeKind.Utc));

        var result = GetTicketsQueryHandler.ApplyInMemoryFilters(
            new[] { oldest, newest, middle },
            openOnly: false,
            searchText: null).ToList();

        result.Should().ContainInOrder(newest, middle, oldest);
    }

    [Fact]
    public void BlankSearchText_DoesNotFilter()
    {
        var tickets = new[] { CreateTicket(), CreateTicket() };

        var result = GetTicketsQueryHandler.ApplyInMemoryFilters(
            tickets, openOnly: false, searchText: "   ").ToList();

        result.Should().HaveCount(2);
    }
}
