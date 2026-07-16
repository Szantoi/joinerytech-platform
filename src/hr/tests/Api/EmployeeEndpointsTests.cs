using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ardalis.Result;
using FluentAssertions;
using MediatR;
using Moq;
using SpaceOS.Modules.HR.Api.Endpoints;
using SpaceOS.Modules.HR.Application.Commands;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Application.Queries;
using SpaceOS.Modules.HR.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Api;

/// <summary>
/// REST-layer contract tests for EmployeeEndpoints (TestServer + mocked IMediator):
/// the server-side filters (dept / q / skill), the string-enum wire format and the
/// error contract. Mirror: portal src/modules/hr/mocks/handlers.employees.ts.
/// </summary>
public class EmployeeEndpointsTests
{
    private static readonly Guid EmployeeGuid = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private static EmployeeDto SampleDto() => new(
        Id: EmployeeGuid,
        TenantId: HrEndpointTestHost.TenantId,
        Name: "Kovács János",
        Initials: "KJ",
        Role: "CNC gépkezelő",
        Department: Department.Production,
        FacilityId: Guid.Parse("55555555-5555-5555-5555-555555555555"),
        PayGrade: new PayGradeDto("Szakmunkás", 4200m),
        WeeklyHours: 40m,
        Email: "kovacs.janos@example.hu",
        VacationBase: 20,
        Active: true,
        Skills: new[] { new EmployeeSkillDto(SkillKey.CNCProgramming, SkillLevel.Advanced) });

    private static Task<HrEndpointTestHost> StartHostAsync(IMediator mediator)
        => HrEndpointTestHost.StartAsync(mediator, endpoints => endpoints.MapEmployeeEndpoints());

    [Fact]
    public async Task ListEmployees_ReturnsOkWithDtoArray_EnumsAsStrings()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetEmployeesQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IReadOnlyList<EmployeeDto>>.Success(new[] { SampleDto() }));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/hr/employees");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetArrayLength().Should().Be(1);

        var employee = body.RootElement[0];
        employee.GetProperty("department").GetString().Should().Be("Production");
        employee.GetProperty("payGrade").GetProperty("hourlyRate").GetDecimal().Should().Be(4200m);
        employee.GetProperty("skills")[0].GetProperty("key").GetString().Should().Be("CNCProgramming");
        employee.GetProperty("skills")[0].GetProperty("level").GetString().Should().Be("Advanced");
    }

    [Fact]
    public async Task ListEmployees_PassesFiltersToQuery()
    {
        GetEmployeesQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetEmployeesQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<IReadOnlyList<EmployeeDto>>> query, CancellationToken _) =>
                captured = (GetEmployeesQuery)query)
            .ReturnsAsync(Result<IReadOnlyList<EmployeeDto>>.Success(Array.Empty<EmployeeDto>()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync(
            "/api/hr/employees?dept=Production&q=kovács&skill=Welding");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.TenantId.Value.Should().Be(HrEndpointTestHost.TenantId);
        captured.Department.Should().Be(Department.Production);
        captured.Skill.Should().Be(SkillKey.Welding);
        captured.SearchText.Should().Be("kovács");
        captured.ActiveOnly.Should().BeTrue();
    }

    [Fact]
    public async Task ListEmployees_InvalidDeptFilter_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.GetAsync("/api/hr/employees?dept=gyartas");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ListEmployees_InvalidSkillFilter_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.GetAsync("/api/hr/employees?skill=szabas");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetEmployee_Found_ReturnsOkDto()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetEmployeeQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<EmployeeDto>.Success(SampleDto()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync($"/api/hr/employees/{EmployeeGuid}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("id").GetGuid().Should().Be(EmployeeGuid);
        body.RootElement.GetProperty("initials").GetString().Should().Be("KJ");
    }

    [Fact]
    public async Task GetEmployee_Missing_Returns404()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetEmployeeQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<EmployeeDto>.NotFound("nincs"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync($"/api/hr/employees/{EmployeeGuid}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateSkills_ParsesPayload_ReturnsFreshEmployee()
    {
        UpdateEmployeeSkillsCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<UpdateEmployeeSkillsCommand>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result> cmd, CancellationToken _) =>
                captured = (UpdateEmployeeSkillsCommand)cmd)
            .ReturnsAsync(Result.Success());
        mediator
            .Setup(m => m.Send(It.IsAny<GetEmployeeQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<EmployeeDto>.Success(SampleDto()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/hr/employees/{EmployeeGuid}/skills",
            new
            {
                skills = new[] { new { key = "Welding", level = "Expert" } },
                removeSkills = new[] { "Painting" }
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.SkillsToUpdate.Should().ContainKey(SkillKey.Welding)
            .WhoseValue.Should().Be(SkillLevel.Expert);
        captured.SkillsToRemove.Should().ContainSingle().Which.Should().Be(SkillKey.Painting);
    }

    [Fact]
    public async Task UpdateSkills_InvalidSkillKey_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PutAsJsonAsync(
            $"/api/hr/employees/{EmployeeGuid}/skills",
            new { skills = new[] { new { key = "faragas", level = "Expert" } } });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
