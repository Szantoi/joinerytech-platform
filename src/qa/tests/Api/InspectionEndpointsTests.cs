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
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Api;

/// <summary>
/// REST-layer contract tests for the Inspection FSM transition endpoints:
/// they must return the fresh InspectionDto (200) instead of 204 (portal
/// optimistic-update contract), carry the denormalized checklist criteria,
/// and map illegal transitions to 409 / payload validation to 400.
/// Mirror: portal src/mocks/qaApi/handlers.inspections.ts (MSW contract).
/// </summary>
public class InspectionEndpointsTests
{
    private static readonly Guid InspectionGuid = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private static InspectionDto SampleDto(
        InspectionStatus status = InspectionStatus.InProgress,
        InspectionResult result = InspectionResult.Pending) => new(
        Id: InspectionGuid,
        CheckpointId: Guid.NewGuid(),
        CheckpointName: "Végső minőségellenőrzés",
        Criteria: new[]
        {
            new InspectionCriteriaDto(Guid.NewGuid().ToString(), CriteriaType.Visual, "Felület karcmentes"),
            new InspectionCriteriaDto(Guid.NewGuid().ToString(), CriteriaType.Dimensional, "Méretek tűrésen belül"),
        },
        OrderId: null,
        ProductId: null,
        Status: status,
        Result: result,
        InspectorId: Guid.NewGuid(),
        Notes: null,
        FailureNotes: Array.Empty<FailureNoteDto>(),
        PlannedAt: DateTime.UtcNow.AddHours(-2),
        StartedAt: DateTime.UtcNow.AddHours(-1),
        CompletedAt: null
    );

    private static Task<QaEndpointTestHost> StartHostAsync(IMediator mediator)
        => QaEndpointTestHost.StartAsync(mediator, endpoints => endpoints.MapInspectionEndpoints());

    [Fact]
    public async Task StartInspection_Success_Returns200WithFreshDtoInsteadOf204()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<StartInspectionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Success());
        mediator
            .Setup(m => m.Send(It.IsAny<GetInspectionQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<InspectionDto>.Success(SampleDto(InspectionStatus.InProgress)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsync($"/api/qa/inspections/{InspectionGuid}/start", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("id").GetGuid().Should().Be(InspectionGuid);
        body.RootElement.GetProperty("status").GetString().Should().Be("InProgress");
    }

    [Fact]
    public async Task StartInspection_IllegalTransition_Returns409()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<StartInspectionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Conflict("Cannot transition from Completed to InProgress"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsync($"/api/qa/inspections/{InspectionGuid}/start", null);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Cannot transition from Completed to InProgress");
    }

    [Fact]
    public async Task CompletePass_Success_Returns200WithCompletedDtoAndCriteria()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteInspectionWithPassCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Success());
        mediator
            .Setup(m => m.Send(It.IsAny<GetInspectionQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<InspectionDto>.Success(
                SampleDto(InspectionStatus.Completed, InspectionResult.Pass)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/complete/pass", new { notes = "Minden szempont rendben" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("status").GetString().Should().Be("Completed");
        body.RootElement.GetProperty("result").GetString().Should().Be("Pass");
        // Denormalized checklist criteria (portal MSW contract: inspection.criteria)
        body.RootElement.GetProperty("criteria").GetArrayLength().Should().Be(2);
        body.RootElement.GetProperty("criteria")[0].GetProperty("type").GetString().Should().Be("Visual");
    }

    [Fact]
    public async Task CompletePass_IllegalTransition_Returns409()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteInspectionWithPassCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Conflict("Cannot transition from Planned to Completed"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/complete/pass", new { notes = (string?)null });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task CompleteFail_WithoutFailureNotes_Returns400()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteInspectionWithFailCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Invalid(
                new ValidationError("Failure notes are required when inspection fails")));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/complete/fail",
            new { failureNotes = Array.Empty<object>() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Failure notes are required when inspection fails");
    }

    [Fact]
    public async Task CompleteFail_Success_Returns200WithFailedDto()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteInspectionWithFailCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Success());
        mediator
            .Setup(m => m.Send(It.IsAny<GetInspectionQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<InspectionDto>.Success(
                SampleDto(InspectionStatus.Completed, InspectionResult.Fail)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/qa/inspections/{InspectionGuid}/complete/fail",
            new
            {
                failureNotes = new[]
                {
                    new { failureType = "Scratch", description = "Mély karc a fedlapon", photoUrl = (string?)null }
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("result").GetString().Should().Be("Fail");
    }
}
