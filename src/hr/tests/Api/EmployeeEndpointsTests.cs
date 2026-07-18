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
        PayGrade: PayGradeBand.SkilledWorker,
        HourlyRate: 3800m,
        WeeklyHours: 40m,
        Email: "kovacs.janos@example.hu",
        VacationBase: 20,
        Active: true,
        Skills: new[] { new EmployeeSkillDto(SkillKey.Cnc, SkillLevel.Master) });

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
        // ADR-059: the wire vocabulary is the Hungarian portal contract (HrWire).
        employee.GetProperty("department").GetString().Should().Be("gyartas");
        // ADR-060: the pay grade is a band key, the hourly rate is a separate flat field
        // (tenant config) — mirroring the portal employeeSchema (payGrade + hourlyRate).
        employee.GetProperty("payGrade").GetString().Should().Be("szakmunkas");
        employee.GetProperty("hourlyRate").GetDecimal().Should().Be(3800m);
        employee.GetProperty("skills")[0].GetProperty("key").GetString().Should().Be("cnc");
        // ADR-060 §5: SkillLevel is the ONE enum that travels as a NUMBER (1|2|3).
        employee.GetProperty("skills")[0].GetProperty("level").ValueKind
            .Should().Be(JsonValueKind.Number);
        employee.GetProperty("skills")[0].GetProperty("level").GetInt32().Should().Be(3);
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
            "/api/hr/employees?dept=gyartas&q=kovács&skill=elzaras");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.TenantId.Value.Should().Be(HrEndpointTestHost.TenantId);
        captured.Department.Should().Be(Department.Production);
        captured.Skill.Should().Be(SkillKey.EdgeBanding);
        captured.SearchText.Should().Be("kovács");
        captured.ActiveOnly.Should().BeTrue();
    }

    // ADR-059 landed: the Hungarian portal keys (gyartas, szabas, …) ARE the accepted
    // wire vocabulary — the former "invalid filter" guards flipped into positive tests.
    [Fact]
    public async Task ListEmployees_HungarianDeptFilter_IsAccepted()
    {
        GetEmployeesQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetEmployeesQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<IReadOnlyList<EmployeeDto>>> query, CancellationToken _) =>
                captured = (GetEmployeesQuery)query)
            .ReturnsAsync(Result<IReadOnlyList<EmployeeDto>>.Success(Array.Empty<EmployeeDto>()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/hr/employees?dept=gyartas");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.Department.Should().Be(Department.Production);
    }

    [Fact]
    public async Task ListEmployees_HungarianSkillFilter_IsAccepted()
    {
        GetEmployeesQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetEmployeesQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<IReadOnlyList<EmployeeDto>>> query, CancellationToken _) =>
                captured = (GetEmployeesQuery)query)
            .ReturnsAsync(Result<IReadOnlyList<EmployeeDto>>.Success(Array.Empty<EmployeeDto>()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/hr/employees?skill=szabas");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.Skill.Should().Be(SkillKey.Cutting);
    }

    [Theory] // ADR-059: truly unknown keys AND the English member names are rejected.
    [InlineData("dept=butorasztalos")]
    [InlineData("dept=Production")]
    [InlineData("dept=Office")]
    [InlineData("skill=politurozas")]
    [InlineData("skill=Cutting")]
    [InlineData("skill=EdgeBanding")]
    public async Task ListEmployees_UnknownOrEnglishFilterKeys_Return400(string filter)
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.GetAsync($"/api/hr/employees?{filter}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory] // ADR-060 regression guard: the retired industrial scaffold keys are rejected.
    [InlineData("dept=IT")]
    [InlineData("dept=Administration")]
    [InlineData("dept=Maintenance")]
    [InlineData("skill=Welding")]
    [InlineData("skill=ManualLathe")]
    [InlineData("skill=ForkliftDriver")]
    public async Task ListEmployees_RetiredTaxonomyKeys_Return400(string filter)
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.GetAsync($"/api/hr/employees?{filter}");

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
        // ADR-060 §5: the level is a NUMBER on the wire (1 = basic .. 3 = master);
        // the keys are the ADR-059 Hungarian wire vocabulary.
        var response = await host.Client.PutAsJsonAsync(
            $"/api/hr/employees/{EmployeeGuid}/skills",
            new
            {
                skills = new[] { new { key = "elzaras", level = 3 } },
                removeSkills = new[] { "felulet" }
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.SkillsToUpdate.Should().ContainKey(SkillKey.EdgeBanding)
            .WhoseValue.Should().Be(SkillLevel.Master);
        captured.SkillsToRemove.Should().ContainSingle().Which.Should().Be(SkillKey.SurfaceFinishing);
    }

    [Fact]
    public async Task UpdateSkills_InvalidSkillKey_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PutAsJsonAsync(
            $"/api/hr/employees/{EmployeeGuid}/skills",
            new { skills = new[] { new { key = "faragas", level = 3 } } });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory] // Levels outside the portal's 1..3 scale are rejected.
    [InlineData(0)]
    [InlineData(4)]
    public async Task UpdateSkills_OutOfRangeLevel_Returns400(int level)
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PutAsJsonAsync(
            $"/api/hr/employees/{EmployeeGuid}/skills",
            new { skills = new[] { new { key = "szabas", level } } });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact] // The retired string form ("Expert") is no longer a valid level payload.
    public async Task UpdateSkills_StringLevel_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PutAsJsonAsync(
            $"/api/hr/employees/{EmployeeGuid}/skills",
            new { skills = new[] { new { key = "szabas", level = "Expert" } } });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
