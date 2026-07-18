using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ardalis.Result;
using FluentAssertions;
using MediatR;
using Moq;
using SpaceOS.Modules.CRM.Api.Endpoints;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Api;

/// <summary>
/// REST-layer contract tests for the cross-entity endpoints (tasks, activity feed,
/// forecast). Mirror: portal <c>modules/crm/mocks/handlers.tasks.ts</c>.
/// </summary>
public class CrmTaskEndpointsTests
{
    private static readonly Guid TaskId = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly Guid RefId = Guid.Parse("66666666-6666-6666-6666-666666666666");

    private static CrmTaskListItemDto SampleTask(TaskSla sla = TaskSla.Overdue, bool done = false) => new()
    {
        Id = TaskId,
        RefType = CrmRefType.Lead,
        RefId = RefId,
        RefTitle = "Kovács Béla",
        Title = "Visszahívás",
        Priority = "magas",
        DueDate = DateTimeOffset.UtcNow.AddDays(-1),
        IsCompleted = done,
        Sla = sla,
        AssignedToUserId = Guid.NewGuid()
    };

    private static Task<CrmEndpointTestHost> StartHostAsync(IMediator mediator)
        => CrmEndpointTestHost.StartAsync(mediator, endpoints => endpoints.MapCrmTaskEndpoints());

    // ══════════ Tasks ══════════

    [Fact]
    public async Task ListTasks_ReturnsOk_WithComputedSlaAsString()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetCrmTasksQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<CrmTaskListItemDto[]>.Success([SampleTask()]));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/crm/tasks");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement[0].GetProperty("sla").GetString().Should().Be("overdue");
        body.RootElement[0].GetProperty("refType").GetString().Should().Be("lead");
    }

    [Fact]
    public async Task ListTasks_PassesDoneFilter()
    {
        GetCrmTasksQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetCrmTasksQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<CrmTaskListItemDto[]>> q, CancellationToken _) => captured = (GetCrmTasksQuery)q)
            .ReturnsAsync(Result<CrmTaskListItemDto[]>.Success([]));

        await using var host = await StartHostAsync(mediator.Object);
        await host.Client.GetAsync("/api/crm/tasks?done=false");

        captured.Should().NotBeNull();
        captured!.Done.Should().BeFalse();
        captured.TenantId.Should().Be(CrmEndpointTestHost.TenantId);
    }

    [Fact]
    public async Task ListTasks_WithoutDoneFilter_PassesNull()
    {
        GetCrmTasksQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetCrmTasksQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<CrmTaskListItemDto[]>> q, CancellationToken _) => captured = (GetCrmTasksQuery)q)
            .ReturnsAsync(Result<CrmTaskListItemDto[]>.Success([]));

        await using var host = await StartHostAsync(mediator.Object);
        await host.Client.GetAsync("/api/crm/tasks");

        captured!.Done.Should().BeNull();
    }

    [Fact]
    public async Task CompleteTask_Success_Returns200WithFreshTask()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteCrmTaskCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<CrmTaskListItemDto>.Success(SampleTask(TaskSla.Ok, done: true)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/crm/tasks/{TaskId}/complete", new { completedBy = Guid.NewGuid() });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("isCompleted").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task CompleteTask_UnknownId_Returns404()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteCrmTaskCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<CrmTaskListItemDto>.NotFound("Task not found"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync(
            $"/api/crm/tasks/{TaskId}/complete", new { completedBy = Guid.NewGuid() });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ══════════ Activity feed ══════════

    [Fact]
    public async Task RecentActivities_PassesLimit()
    {
        GetRecentActivitiesQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetRecentActivitiesQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<RecentActivityDto[]>> q, CancellationToken _) =>
                captured = (GetRecentActivitiesQuery)q)
            .ReturnsAsync(Result<RecentActivityDto[]>.Success([]));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/crm/activities/recent?limit=3");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.Limit.Should().Be(3);
    }

    [Fact]
    public async Task RecentActivities_WithoutLimit_PassesNull_SoConfigDefaultApplies()
    {
        GetRecentActivitiesQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetRecentActivitiesQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<RecentActivityDto[]>> q, CancellationToken _) =>
                captured = (GetRecentActivitiesQuery)q)
            .ReturnsAsync(Result<RecentActivityDto[]>.Success([]));

        await using var host = await StartHostAsync(mediator.Object);
        await host.Client.GetAsync("/api/crm/activities/recent");

        captured!.Limit.Should().BeNull();
    }

    [Fact]
    public async Task RecentActivities_InvalidLimit_Returns400()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetRecentActivitiesQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<RecentActivityDto[]>.Invalid(
                new ValidationError { ErrorMessage = "Limit must be greater than zero" }));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/crm/activities/recent?limit=0");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ══════════ Forecast ══════════

    [Fact]
    public async Task Forecast_ReturnsOkWithWeightedStages()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetPipelineForecastQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<PipelineForecastDto>.Success(new PipelineForecastDto
            {
                TenantId = CrmEndpointTestHost.TenantId,
                AsOf = DateTimeOffset.UtcNow,
                Currency = "HUF",
                WeightedTotalValue = 1_000_000m,
                Stages =
                [
                    new PipelineStageDto
                    {
                        Status = "Negotiation",
                        Count = 2,
                        TotalValue = 1_250_000m,
                        AverageProbability = 80m,
                        WeightedValue = 1_000_000m
                    }
                ]
            }));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/crm/forecast");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("weightedTotalValue").GetDecimal().Should().Be(1_000_000m);
        body.RootElement.GetProperty("stages")[0].GetProperty("averageProbability").GetDecimal().Should().Be(80m);
    }
}
