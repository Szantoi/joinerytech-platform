using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ardalis.Result;
using FluentAssertions;
using MediatR;
using Moq;
using SpaceOS.Modules.QA.Api.Endpoints;
using SpaceOS.Modules.QA.Application.Commands;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Application.Queries;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Api;

/// <summary>
/// REST-layer contract tests for TicketEndpoints (TestServer + mocked IMediator):
/// route set, request parsing, and the module error contract
/// (200 fresh DTO / 201 created / 400 invalid payload / 404 / 409 illegal FSM transition).
/// Mirror: portal src/mocks/qaApi/handlers.tickets.ts (MSW contract).
/// </summary>
public class TicketEndpointsTests
{
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

    private static Task<QaEndpointTestHost> StartHostAsync(IMediator mediator)
        => QaEndpointTestHost.StartAsync(mediator, endpoints => endpoints.MapTicketEndpoints());

    // ========== LIST + DETAIL ==========

    [Fact]
    public async Task ListTickets_ReturnsOkWithDtoArray()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetTicketsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<TicketDto[]>.Success(new[] { SampleDto() }));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/qa/tickets?open=true&q=szekreny");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetArrayLength().Should().Be(1);
        body.RootElement[0].GetProperty("status").GetString().Should().Be("bejelentve");
    }

    [Fact]
    public async Task ListTickets_PassesFiltersToQuery()
    {
        GetTicketsQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetTicketsQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<TicketDto[]>> query, CancellationToken _) =>
                captured = (GetTicketsQuery)query)
            .ReturnsAsync(Result<TicketDto[]>.Success(Array.Empty<TicketDto>()));

        await using var host = await StartHostAsync(mediator.Object);
        var inspectionId = Guid.NewGuid();
        var response = await host.Client.GetAsync(
            $"/api/qa/tickets?status=folyamatban&priority=magas&inspectionId={inspectionId}&open=true&q=zsanér");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.TenantId.Should().Be(QaEndpointTestHost.TenantId);
        captured.Status.Should().Be(TicketStatus.InProgress);
        captured.Priority.Should().Be(CrmTaskPriority.High);
        captured.InspectionId.Should().Be(inspectionId);
        captured.OpenOnly.Should().BeTrue();
        captured.SearchText.Should().Be("zsanér");
    }

    [Fact]
    public async Task ListTickets_InvalidStatusFilter_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.GetAsync("/api/qa/tickets?status=nemletezik");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetTicket_Found_ReturnsOkDto()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetTicketQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<TicketDto>.Success(SampleDto()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync($"/api/qa/tickets/{TicketGuid}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("id").GetGuid().Should().Be(TicketGuid);
    }

    [Fact]
    public async Task GetTicket_Missing_Returns404()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetTicketQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<TicketDto>.NotFound("Ticket not found"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync($"/api/qa/tickets/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ========== CREATE ==========

    [Fact]
    public async Task CreateTicket_Valid_Returns201WithBodyAndLocation()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateTicketCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<TicketId>.Success(new TicketId(TicketGuid)));
        mediator
            .Setup(m => m.Send(It.IsAny<GetTicketQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<TicketDto>.Success(SampleDto()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync("/api/qa/tickets", new
        {
            ticketType = "javitas",
            priority = "kozepes",
            title = "Élzárás sérült a nappali szekrényen",
            description = "A jobb oldali ajtó élzárása több helyen levált.",
            reportedBy = Guid.NewGuid()
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location!.ToString().Should().Be($"/api/qa/tickets/{TicketGuid}");
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("id").GetGuid().Should().Be(TicketGuid);
        body.RootElement.GetProperty("status").GetString().Should().Be("bejelentve");
    }

    [Fact]
    public async Task CreateTicket_InvalidTicketType_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PostAsJsonAsync("/api/qa/tickets", new
        {
            ticketType = "nemletezo",
            priority = "Medium",
            title = "Cím",
            description = "Leírás legalább tíz karakter.",
            reportedBy = Guid.NewGuid()
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        mediator.Verify(
            m => m.Send(It.IsAny<CreateTicketCommand>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task CreateTicket_DomainValidationFails_Returns400()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateTicketCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<TicketId>.Invalid(
                new ValidationError("Ticket title must be between 5 and 200 characters")));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync("/api/qa/tickets", new
        {
            ticketType = "garancia",
            priority = "alacsony",
            title = "Rvd",
            description = "Leírás legalább tíz karakter.",
            reportedBy = Guid.NewGuid()
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Ticket title must be between 5 and 200 characters");
    }

    // ========== FSM TRANSITIONS ==========

    [Fact]
    public async Task AssignTicket_Success_Returns200WithFreshDto()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<AssignTicketCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Success());
        mediator
            .Setup(m => m.Send(It.IsAny<GetTicketQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<TicketDto>.Success(SampleDto(TicketStatus.Assigned)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/qa/tickets/{TicketGuid}/assign", new { assigneeId = Guid.NewGuid() });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("status").GetString().Should().Be("kiosztva");
    }

    [Fact]
    public async Task AssignTicket_IllegalTransition_Returns409WithGuardMessage()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<AssignTicketCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Conflict("Cannot transition from Resolved to Assigned")); // translated at the API seam

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/qa/tickets/{TicketGuid}/assign", new { assigneeId = Guid.NewGuid() });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Cannot transition from megoldva to kiosztva");
    }

    [Fact]
    public async Task StartTicket_Missing_Returns404()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<StartTicketCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.NotFound("Ticket not found"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsync($"/api/qa/tickets/{Guid.NewGuid()}/start", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ResolveTicket_WithoutActions_Returns400()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ResolveTicketCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Invalid(new ValidationError("At least one resolution action is required")));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/qa/tickets/{TicketGuid}/resolve",
            new { resolutionActions = Array.Empty<object>() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("At least one resolution action is required");
    }

    [Fact]
    public async Task ResolveTicket_InvalidActionType_Returns400WithoutDispatch()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PutAsJsonAsync(
            $"/api/qa/tickets/{TicketGuid}/resolve",
            new
            {
                resolutionActions = new[]
                {
                    new { actionType = "nemletezik", description = "Csere", costAmount = 1000 }
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        mediator.Verify(
            m => m.Send(It.IsAny<ResolveTicketCommand>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ResolveTicket_Success_Returns200WithResolvedDto()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ResolveTicketCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Success());
        mediator
            .Setup(m => m.Send(It.IsAny<GetTicketQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<TicketDto>.Success(SampleDto(TicketStatus.Resolved)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/qa/tickets/{TicketGuid}/resolve",
            new
            {
                resolutionActions = new[]
                {
                    new { actionType = "javitas", description = "Élzárás újraragasztva", costAmount = 4500 }
                },
                resolutionNotes = "Helyszíni javítás"
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("status").GetString().Should().Be("megoldva");
    }

    [Fact]
    public async Task RejectTicket_IllegalTransition_Returns409()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<RejectTicketCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Conflict("Cannot transition from Reported to Rejected"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/qa/tickets/{TicketGuid}/reject", new { reason = "Nem indokolt reklamáció" });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task ReopenTicket_Success_Returns200()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ReopenTicketCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Success());
        mediator
            .Setup(m => m.Send(It.IsAny<GetTicketQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<TicketDto>.Success(SampleDto(TicketStatus.Reported)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsync($"/api/qa/tickets/{TicketGuid}/reopen", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ========== ESCALATION (guarded, not FSM) ==========

    [Fact]
    public async Task EscalateTicket_GuardViolation_Returns409()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<EscalateTicketPriorityCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Conflict("New priority must be higher than current priority"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/qa/tickets/{TicketGuid}/escalate", new { priority = "alacsony" });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task EscalateTicket_InvalidPriority_Returns400WithoutDispatch()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PutAsJsonAsync(
            $"/api/qa/tickets/{TicketGuid}/escalate", new { priority = "nemletezik" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        mediator.Verify(
            m => m.Send(It.IsAny<EscalateTicketPriorityCommand>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
