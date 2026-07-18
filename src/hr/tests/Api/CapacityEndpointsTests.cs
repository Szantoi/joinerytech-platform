using System.Net;
using System.Text.Json;
using Ardalis.Result;
using FluentAssertions;
using MediatR;
using Moq;
using SpaceOS.Modules.HR.Api.Endpoints;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Application.Queries;
using SpaceOS.Modules.HR.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Api;

/// <summary>
/// REST-layer contract tests for CapacityEndpoints (TestServer + mocked IMediator):
/// the mandatory/validated `week` parameter and the computed-grid response shape.
/// Mirror: portal src/modules/hr/mocks/handlers.capacity.ts (week guards → 400).
/// </summary>
public class CapacityEndpointsTests
{
    private static readonly DateOnly Monday = new(2026, 8, 3);
    private static readonly Guid EmployeeGuid = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private static WeekCapacityDto SampleGrid() => new(
        Week: Monday,
        Days: Enumerable.Range(0, 5).Select(Monday.AddDays).ToList(),
        Rows: new[]
        {
            new EmployeeWeekCapacityDto(
                EmployeeId: EmployeeGuid,
                Days: new[]
                {
                    new CapacityDayDto(Monday, true, 8m, 0m, 8m, false, null),
                    new CapacityDayDto(Monday.AddDays(1), true, 0m, 0m, 0m, false,
                        new CapacityAbsenceRefDto(Guid.NewGuid(), AbsenceType.Vacation))
                },
                Capacity: 8m,
                Assigned: 0m,
                Utilization: 0m)
        });

    private static Task<HrEndpointTestHost> StartHostAsync(IMediator mediator)
        => HrEndpointTestHost.StartAsync(mediator, endpoints => endpoints.MapCapacityEndpoints());

    [Fact]
    public async Task GetCapacity_ReturnsOkWithComputedGrid()
    {
        GetWeekCapacityQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetWeekCapacityQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<WeekCapacityDto>> query, CancellationToken _) =>
                captured = (GetWeekCapacityQuery)query)
            .ReturnsAsync(Result<WeekCapacityDto>.Success(SampleGrid()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/hr/capacity?week=2026-08-03");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.TenantId.Value.Should().Be(HrEndpointTestHost.TenantId);
        captured.Week.Should().Be(Monday);

        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("week").GetString().Should().Be("2026-08-03");
        body.RootElement.GetProperty("days").GetArrayLength().Should().Be(5);

        var row = body.RootElement.GetProperty("rows")[0];
        row.GetProperty("capacity").GetDecimal().Should().Be(8m);
        // Blocking absence: the day carries no capacity and names the absence type as a string.
        var blockedDay = row.GetProperty("days")[1];
        blockedDay.GetProperty("capacity").GetDecimal().Should().Be(0m);
        // ADR-059: absence type in the Hungarian wire spelling (HrWire.AbsenceType).
        blockedDay.GetProperty("absence").GetProperty("type").GetString().Should().Be("szabadsag");
    }

    [Fact]
    public async Task GetCapacity_MissingWeek_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.GetAsync("/api/hr/capacity");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetCapacity_MalformedWeek_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.GetAsync("/api/hr/capacity?week=2026-8-3");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetCapacity_NonMondayWeek_Returns400()
    {
        // The Monday rule is a domain rule: the handler answers Invalid → the endpoint maps 400.
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetWeekCapacityQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<WeekCapacityDto>.Invalid(
                new ValidationError("The week parameter must be a Monday (got: 2026-08-05)")));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/hr/capacity?week=2026-08-05");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("error").GetString().Should().Contain("Monday");
    }
}
