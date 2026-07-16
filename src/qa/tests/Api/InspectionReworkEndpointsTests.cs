using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ardalis.Result;
using FluentAssertions;
using MediatR;
using Microsoft.Extensions.Configuration;
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
/// REST-layer contract tests for the ADR-063 rework loop endpoints:
/// POST /complete/conditional (Conditional result + auto rework Ticket, fresh
/// InspectionDto with openTicketId) and POST /rework (201 + new Inspection
/// referencing the original via reworkOfInspectionId). Error contract:
/// 404 = not found, 409 = state guard, 400 = payload validation.
/// </summary>
public class InspectionReworkEndpointsTests
{
    private static readonly Guid InspectionGuid = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid ReworkInspectionGuid = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly Guid TicketGuid = Guid.Parse("66666666-6666-6666-6666-666666666666");

    private static InspectionDto SampleDto(
        Guid? id = null,
        InspectionStatus status = InspectionStatus.Completed,
        InspectionResult result = InspectionResult.Conditional,
        Guid? reworkOfInspectionId = null,
        Guid? openTicketId = null) => new(
        Id: id ?? InspectionGuid,
        CheckpointId: Guid.NewGuid(),
        CheckpointName: "Végső minőségellenőrzés",
        Criteria: Array.Empty<InspectionCriteriaDto>(),
        OrderId: null,
        ProductId: null,
        Status: status,
        Result: result,
        InspectorId: Guid.NewGuid(),
        Notes: null,
        FailureNotes: new[] { new FailureNoteDto(FailureType.Scratch, "Kisebb felületi karc a fedlapon", null) },
        PlannedAt: DateTime.UtcNow.AddHours(-2),
        StartedAt: DateTime.UtcNow.AddHours(-1),
        CompletedAt: DateTime.UtcNow,
        ReworkOfInspectionId: reworkOfInspectionId,
        OpenTicketId: openTicketId
    );

    private static object ConditionalBody() => new
    {
        failureNotes = new[]
        {
            new { failureType = "Scratch", description = "Kisebb felületi karc a fedlapon", photoUrl = (string?)null }
        },
        notes = "Javítás után újraellenőrzés"
    };

    private static Task<QaEndpointTestHost> StartHostAsync(
        IMediator mediator, Dictionary<string, string?>? configuration = null)
        => QaEndpointTestHost.StartAsync(
            mediator, endpoints => endpoints.MapInspectionEndpoints(), configuration);

    // ═══ POST /{id}/complete/conditional ════════════════════════════════════

    [Fact]
    public async Task CompleteConditional_Success_Returns200WithConditionalDtoAndOpenTicketId()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteInspectionWithConditionalCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<Guid>.Success(TicketGuid));
        mediator
            .Setup(m => m.Send(It.IsAny<GetInspectionQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<InspectionDto>.Success(SampleDto(openTicketId: TicketGuid)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/complete/conditional", ConditionalBody());

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("status").GetString().Should().Be("Completed");
        body.RootElement.GetProperty("result").GetString().Should().Be("Conditional");
        // The portal derives "javitasra" from openTicketId (Completed + Conditional + open ticket)
        body.RootElement.GetProperty("openTicketId").GetGuid().Should().Be(TicketGuid);
    }

    [Fact]
    public async Task CompleteConditional_DefaultConfig_SendsMediumPriorityCommand()
    {
        CompleteInspectionWithConditionalCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteInspectionWithConditionalCommand>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<Result<Guid>>, CancellationToken>((cmd, _) =>
                captured = (CompleteInspectionWithConditionalCommand)cmd)
            .ReturnsAsync(Result<Guid>.Success(TicketGuid));
        mediator
            .Setup(m => m.Send(It.IsAny<GetInspectionQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<InspectionDto>.Success(SampleDto(openTicketId: TicketGuid)));

        await using var host = await StartHostAsync(mediator.Object);
        await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/complete/conditional", ConditionalBody());

        captured.Should().NotBeNull();
        captured!.ReworkTicketPriority.Should().Be(CrmTaskPriority.Medium);
        captured.TenantId.Should().Be(QaEndpointTestHost.TenantId);
        captured.InspectionId.Value.Should().Be(InspectionGuid);
    }

    [Fact]
    public async Task CompleteConditional_ConfiguredPriority_SendsConfiguredPriorityCommand()
    {
        CompleteInspectionWithConditionalCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteInspectionWithConditionalCommand>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<Result<Guid>>, CancellationToken>((cmd, _) =>
                captured = (CompleteInspectionWithConditionalCommand)cmd)
            .ReturnsAsync(Result<Guid>.Success(TicketGuid));
        mediator
            .Setup(m => m.Send(It.IsAny<GetInspectionQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<InspectionDto>.Success(SampleDto(openTicketId: TicketGuid)));

        await using var host = await StartHostAsync(mediator.Object, new Dictionary<string, string?>
        {
            [InspectionEndpoints.ReworkTicketPriorityConfigKey] = "High"
        });
        await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/complete/conditional", ConditionalBody());

        captured.Should().NotBeNull();
        captured!.ReworkTicketPriority.Should().Be(CrmTaskPriority.High);
    }

    [Fact]
    public void ResolveReworkTicketPriority_InvalidConfigValue_FailsFast()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [InspectionEndpoints.ReworkTicketPriorityConfigKey] = "Urgent"
            })
            .Build();

        var act = () => InspectionEndpoints.ResolveReworkTicketPriority(configuration);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage($"*{InspectionEndpoints.ReworkTicketPriorityConfigKey}*Urgent*");
    }

    [Fact]
    public async Task CompleteConditional_IllegalTransition_Returns409()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteInspectionWithConditionalCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<Guid>.Conflict("Cannot transition from Planned to Completed"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/complete/conditional", ConditionalBody());

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Cannot transition from Planned to Completed");
    }

    [Fact]
    public async Task CompleteConditional_WithoutFailureNotes_Returns400()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteInspectionWithConditionalCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<Guid>.Invalid(
                new ValidationError("Failure notes are required when inspection passes conditionally")));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/complete/conditional",
            new { failureNotes = Array.Empty<object>() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Failure notes are required when inspection passes conditionally");
    }

    [Fact]
    public async Task CompleteConditional_UnknownFailureType_Returns400WithoutDispatch()
    {
        var mediator = new Mock<IMediator>(MockBehavior.Strict);

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/complete/conditional",
            new
            {
                failureNotes = new[]
                {
                    new { failureType = "NotAFailureType", description = "Ismeretlen hibatípus teszt" }
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Invalid failure type");
    }

    [Fact]
    public async Task CompleteConditional_NotFound_Returns404()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteInspectionWithConditionalCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<Guid>.NotFound("Inspection not found"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/complete/conditional", ConditionalBody());

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ═══ POST /{id}/rework ══════════════════════════════════════════════════

    [Fact]
    public async Task CreateRework_Success_Returns201WithLocationAndReworkReference()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateReworkInspectionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<InspectionId>.Success(new InspectionId(ReworkInspectionGuid)));
        mediator
            .Setup(m => m.Send(It.IsAny<GetInspectionQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<InspectionDto>.Success(SampleDto(
                id: ReworkInspectionGuid,
                status: InspectionStatus.Planned,
                result: InspectionResult.Pending,
                reworkOfInspectionId: InspectionGuid)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/rework",
            new { inspectorId = Guid.NewGuid(), plannedAt = DateTime.UtcNow.AddHours(4) });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location!.ToString().Should().Be($"/api/qa/inspections/{ReworkInspectionGuid}");
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("id").GetGuid().Should().Be(ReworkInspectionGuid);
        body.RootElement.GetProperty("status").GetString().Should().Be("Planned");
        // The new inspection references the conditionally passed original
        body.RootElement.GetProperty("reworkOfInspectionId").GetGuid().Should().Be(InspectionGuid);
    }

    [Fact]
    public async Task CreateRework_OriginalNotConditional_Returns409()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateReworkInspectionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<InspectionId>.Conflict(
                "Rework inspection requires a Completed inspection with Conditional result (current: Completed/Pass)"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/rework",
            new { inspectorId = Guid.NewGuid(), plannedAt = DateTime.UtcNow.AddHours(4) });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Conditional");
    }

    [Fact]
    public async Task CreateRework_OriginalNotFound_Returns404()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateReworkInspectionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<InspectionId>.NotFound("Inspection not found"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/rework",
            new { inspectorId = Guid.NewGuid(), plannedAt = DateTime.UtcNow.AddHours(4) });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateRework_PastPlannedAt_Returns400()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateReworkInspectionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<InspectionId>.Invalid(
                new ValidationError("PlannedAt must be in the future or present")));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/rework",
            new { inspectorId = Guid.NewGuid(), plannedAt = DateTime.UtcNow.AddHours(-4) });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("PlannedAt must be in the future or present");
    }
}
