using System.Net;
using System.Text.Json;
using Ardalis.Result;
using FluentAssertions;
using MediatR;
using Moq;
using SpaceOS.Modules.QA.Api.Endpoints;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Application.Queries;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Api;

/// <summary>
/// REST-layer contract tests for GET /api/qa/metrics — the GetQAMetricsQuery
/// exposure (portal mirror: services/qa/calc.ts calcQaMetrics / QAMetricsDto).
/// Default date window is config-driven (QA:Metrics:DefaultWindowDays).
/// </summary>
public class QAMetricsEndpointsTests
{
    private static readonly QAMetricsDto SampleMetrics = new()
    {
        TotalInspections = 8,
        PassedInspections = 6,
        FailedInspections = 2,
        PassRate = 0.75m,
        TotalTickets = 6,
        OpenTickets = 3,
        AverageResolutionTime = 30.5
    };

    private static Task<QaEndpointTestHost> StartHostAsync(
        IMediator mediator, Dictionary<string, string?>? config = null)
        => QaEndpointTestHost.StartAsync(
            mediator, endpoints => endpoints.MapQAMetricsEndpoints(), config);

    [Fact]
    public async Task GetQAMetrics_ReturnsOkWithDtoBody()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetQAMetricsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<QAMetricsDto>.Success(SampleMetrics));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/qa/metrics");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("passRate").GetDecimal().Should().Be(0.75m);
        body.RootElement.GetProperty("openTickets").GetInt32().Should().Be(3);
        body.RootElement.GetProperty("averageResolutionTime").GetDouble().Should().Be(30.5);
    }

    [Fact]
    public async Task GetQAMetrics_ExplicitRange_IsPassedToQuery()
    {
        GetQAMetricsQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetQAMetricsQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<QAMetricsDto>> query, CancellationToken _) =>
                captured = (GetQAMetricsQuery)query)
            .ReturnsAsync(Result<QAMetricsDto>.Success(SampleMetrics));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync(
            "/api/qa/metrics?from=2026-06-01T00:00:00Z&to=2026-07-01T00:00:00Z");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.TenantId.Should().Be(QaEndpointTestHost.TenantId);
        captured.StartDate.Should().Be(DateTime.Parse("2026-06-01T00:00:00Z").ToUniversalTime());
        captured.EndDate.Should().Be(DateTime.Parse("2026-07-01T00:00:00Z").ToUniversalTime());
    }

    [Fact]
    public async Task GetQAMetrics_DefaultWindow_ComesFromConfiguration()
    {
        GetQAMetricsQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetQAMetricsQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<QAMetricsDto>> query, CancellationToken _) =>
                captured = (GetQAMetricsQuery)query)
            .ReturnsAsync(Result<QAMetricsDto>.Success(SampleMetrics));

        await using var host = await StartHostAsync(mediator.Object, new Dictionary<string, string?>
        {
            { QAMetricsEndpoints.DefaultWindowDaysConfigKey, "10" }
        });
        var response = await host.Client.GetAsync("/api/qa/metrics");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        (captured!.EndDate - captured.StartDate).TotalDays.Should().BeApproximately(10, 0.01);
    }

    [Fact]
    public async Task GetQAMetrics_FromAfterTo_Returns400WithoutDispatch()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.GetAsync(
            "/api/qa/metrics?from=2026-07-01T00:00:00Z&to=2026-06-01T00:00:00Z");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        mediator.Verify(
            m => m.Send(It.IsAny<GetQAMetricsQuery>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
