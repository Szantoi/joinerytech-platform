using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ardalis.Result;
using FluentAssertions;
using MediatR;
using Moq;
using SpaceOS.Modules.QA.Api;
using SpaceOS.Modules.QA.Api.Endpoints;
using SpaceOS.Modules.QA.Application.Commands;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Application.Queries;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Api;

/// <summary>
/// Contract tests for the QA wire vocabulary (ADR-059, <see cref="QaWire"/>):
/// a vocabulary pin per enum, case-sensitivity (English member names must NOT
/// parse), unknown-key → 400 listing the vocabulary, and a full round-trip
/// through the TestServer (Hungarian in the request → Hungarian in the response).
/// </summary>
public sealed class QaWireTests
{
    // ── Vocabulary pins ──────────────────────────────────────────────────────

    [Fact]
    public void InspectionStatus_Vocabulary()
        => Enum.GetValues<InspectionStatus>().Select(QaWire.InspectionStatus.ToWire)
            .Should().Equal("nyitott", "folyamatban", "lezarva");

    [Fact]
    public void InspectionResult_Vocabulary()
        => Enum.GetValues<InspectionResult>().Select(QaWire.InspectionResult.ToWire)
            .Should().Equal("fuggoben", "megfelelt", "selejt", "felteteles");

    [Fact]
    public void CheckpointType_Vocabulary()
        => Enum.GetValues<CheckpointType>().Select(QaWire.CheckpointType.ToWire)
            .Should().Equal("beerkezo", "gyartaskozi", "vegso");

    [Fact]
    public void CriteriaType_Vocabulary()
        => Enum.GetValues<CriteriaType>().Select(QaWire.CriteriaType.ToWire)
            .Should().Equal("vizualis", "meretes", "funkcionalis");

    [Fact]
    public void CriticalLevel_Vocabulary()
        => Enum.GetValues<CriticalLevel>().Select(QaWire.CriticalLevel.ToWire)
            .Should().Equal("kritikus", "jelentos", "enyhe");

    [Fact]
    public void FailureType_Vocabulary()
        => Enum.GetValues<FailureType>().Select(QaWire.FailureType.ToWire)
            .Should().Equal("karc", "hezag", "illeszkedes", "szin", "meret",
                "felulet", "funkcionalis", "hianyzo", "serules", "egyeb");

    [Fact]
    public void TicketStatus_Vocabulary()
        => Enum.GetValues<TicketStatus>().Select(QaWire.TicketStatus.ToWire)
            .Should().Equal("bejelentve", "kiosztva", "folyamatban", "megoldva", "elutasitva");

    [Fact]
    public void TicketType_Vocabulary()
        => Enum.GetValues<TicketType>().Select(QaWire.TicketType.ToWire)
            .Should().Equal("garancia", "javitas", "hiany");

    [Fact]
    public void Priority_Vocabulary()
        => Enum.GetValues<CrmTaskPriority>().Select(QaWire.Priority.ToWire)
            .Should().Equal("alacsony", "kozepes", "magas", "kritikus");

    [Fact]
    public void ActionType_Vocabulary()
        => Enum.GetValues<ActionType>().Select(QaWire.ActionType.ToWire)
            .Should().Equal("javitas", "csere", "visszaterites", "nincs_intezkedes");

    // ── Case-sensitivity ─────────────────────────────────────────────────────

    [Theory]
    [InlineData("Reported")]
    [InlineData("reported")]
    [InlineData("Bejelentve")]
    public void TicketStatus_EnglishOrMiscasedKey_DoesNotParse(string wire)
        => QaWire.TicketStatus.TryParse(wire, out _).Should().BeFalse();

    [Theory]
    [InlineData("Scratch")]
    [InlineData("Karc")]
    public void FailureType_EnglishOrMiscasedKey_DoesNotParse(string wire)
        => QaWire.FailureType.TryParse(wire, out _).Should().BeFalse();

    // ── Endpoint contract: unknown key → 400 listing the vocabulary ─────────

    private static readonly Guid TicketGuid = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static TicketDto SampleDto(TicketStatus status = TicketStatus.Reported) => new(
        Id: TicketGuid,
        TicketType: TicketType.Repair,
        Status: status,
        Priority: CrmTaskPriority.Medium,
        OrderId: null,
        ProductId: null,
        InspectionId: null,
        Title: "Élzárás sérült a nappali szekrényen",
        Description: "A jobb oldali ajtó élzárása több helyen levált.",
        ReportedBy: Guid.NewGuid(),
        AssignedTo: null,
        ResolutionNotes: null,
        ResolutionActions: Array.Empty<ResolutionActionDto>(),
        ReportedAt: DateTime.UtcNow,
        AssignedAt: null,
        StartedAt: null,
        ResolvedAt: null
    );

    [Fact]
    public async Task ListTickets_UnknownStatusKey_Returns400ListingVocabulary()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await QaEndpointTestHost.StartAsync(
            mediator.Object, endpoints => endpoints.MapTicketEndpoints());

        var response = await host.Client.GetAsync("/api/qa/tickets?status=nemletezik");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("bejelentve").And.Contain("nemletezik");
    }

    [Fact]
    public async Task ListTickets_OldEnglishStatusKey_Returns400()
    {
        // ADR-059 contract tightening: the legacy English member name no
        // longer parses even though it once matched the domain enum spelling.
        var mediator = new Mock<IMediator>();
        await using var host = await QaEndpointTestHost.StartAsync(
            mediator.Object, endpoints => endpoints.MapTicketEndpoints());

        var response = await host.Client.GetAsync("/api/qa/tickets?status=Reported");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateTicket_UnknownTicketTypeKey_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await QaEndpointTestHost.StartAsync(
            mediator.Object, endpoints => endpoints.MapTicketEndpoints());

        var response = await host.Client.PostAsJsonAsync("/api/qa/tickets", new
        {
            ticketType = "warranty-x",
            priority = "kozepes",
            title = "Élzárás sérült a nappali szekrényen",
            description = "A jobb oldali ajtó élzárása több helyen levált.",
            reportedBy = Guid.NewGuid(),
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateTicket_HungarianRoundTrip_RequestAndResponseUseWireKeys()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateTicketCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<TicketId>.Success(new TicketId(TicketGuid)));
        mediator
            .Setup(m => m.Send(It.IsAny<GetTicketQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<TicketDto>.Success(SampleDto()));

        await using var host = await QaEndpointTestHost.StartAsync(
            mediator.Object, endpoints => endpoints.MapTicketEndpoints());

        var response = await host.Client.PostAsJsonAsync("/api/qa/tickets", new
        {
            ticketType = "garancia",
            priority = "magas",
            title = "Élzárás sérült a nappali szekrényen",
            description = "A jobb oldali ajtó élzárása több helyen levált.",
            reportedBy = Guid.NewGuid(),
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("status").GetString().Should().Be("bejelentve");
        body.RootElement.GetProperty("ticketType").GetString().Should().Be("javitas"); // SampleDto fixed value
    }
}
