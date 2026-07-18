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
using SpaceOS.Modules.HR.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Api;

/// <summary>
/// REST-layer contract tests for AbsenceEndpoints (TestServer + mocked IMediator):
/// route set, filter parsing, and the module error contract
/// (200 fresh DTO / 201 created / 400 invalid payload / 404 / 409 forbidden FSM transition).
/// Mirror: portal src/modules/hr/mocks/handlers.absences.ts (MSW contract).
/// </summary>
public class AbsenceEndpointsTests
{
    private static readonly Guid AbsenceGuid = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid EmployeeGuid = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid ApproverGuid = Guid.Parse("44444444-4444-4444-4444-444444444444");

    private static AbsenceDto SampleDto(AbsenceStatus status = AbsenceStatus.Pending) => new(
        Id: AbsenceGuid,
        EmployeeId: EmployeeGuid,
        EmployeeName: "Kovács János",
        Type: AbsenceType.Vacation,
        StartDate: new DateOnly(2026, 8, 3),
        EndDate: new DateOnly(2026, 8, 7),
        Status: status,
        WorkDays: 5,
        Reason: "Nyári szabadság",
        ApprovedByUserId: null,
        ApprovedAt: null,
        RejectedByUserId: null,
        RejectedAt: null,
        RejectionReason: null);

    private static Task<HrEndpointTestHost> StartHostAsync(IMediator mediator)
        => HrEndpointTestHost.StartAsync(mediator, endpoints => endpoints.MapAbsenceEndpoints());

    // ========== LIST + DETAIL ==========

    [Fact]
    public async Task ListAbsences_ReturnsOkWithDtoArray_EnumsAsStrings()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetAbsencesQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IReadOnlyList<AbsenceDto>>.Success(new[] { SampleDto() }));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/hr/absences");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetArrayLength().Should().Be(1);
        // ADR-059: the wire vocabulary is the Hungarian portal contract (HrWire).
        body.RootElement[0].GetProperty("status").GetString().Should().Be("kert");
        body.RootElement[0].GetProperty("type").GetString().Should().Be("szabadsag");
        body.RootElement[0].GetProperty("employeeName").GetString().Should().Be("Kovács János");
    }

    [Fact]
    public async Task ListAbsences_PassesFiltersToQuery()
    {
        GetAbsencesQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetAbsencesQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<IReadOnlyList<AbsenceDto>>> query, CancellationToken _) =>
                captured = (GetAbsencesQuery)query)
            .ReturnsAsync(Result<IReadOnlyList<AbsenceDto>>.Success(Array.Empty<AbsenceDto>()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync($"/api/hr/absences?status=jovahagyva&empId={EmployeeGuid}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.TenantId.Value.Should().Be(HrEndpointTestHost.TenantId);
        captured.Status.Should().Be(AbsenceStatus.Approved);
        captured.EmployeeId!.Value.Should().Be(EmployeeGuid);
    }

    [Fact]
    public async Task ListAbsences_InvalidStatusFilter_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.GetAsync("/api/hr/absences?status=nemletezik");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetAbsence_Found_ReturnsOkDto()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetAbsenceQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Success(SampleDto()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync($"/api/hr/absences/{AbsenceGuid}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("id").GetGuid().Should().Be(AbsenceGuid);
        body.RootElement.GetProperty("workDays").GetInt32().Should().Be(5);
    }

    [Fact]
    public async Task GetAbsence_Missing_Returns404()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetAbsenceQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.NotFound("nincs"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync($"/api/hr/absences/{AbsenceGuid}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ========== FSM ENTRY ==========

    [Fact]
    public async Task RequestAbsence_ReturnsCreatedWithFreshDto()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<RequestAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceId>.Success(AbsenceId.From(AbsenceGuid)));
        mediator
            .Setup(m => m.Send(It.IsAny<GetAbsenceQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Success(SampleDto()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync("/api/hr/absences", new
        {
            employeeId = EmployeeGuid,
            type = "szabadsag",
            startDate = "2026-08-03",
            endDate = "2026-08-07",
            reason = "Nyári szabadság"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location!.ToString().Should().Be($"/api/hr/absences/{AbsenceGuid}");
    }

    [Fact]
    public async Task RequestAbsence_InvalidType_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PostAsJsonAsync("/api/hr/absences", new
        {
            employeeId = EmployeeGuid,
            type = "nyaralas",
            startDate = "2026-08-03",
            endDate = "2026-08-07",
            reason = "x"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ========== FSM TRANSITIONS ==========

    [Fact]
    public async Task ApproveAbsence_ReturnsOkWithFreshDto_AndPassesApprover()
    {
        ApproveAbsenceCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ApproveAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<AbsenceDto>> cmd, CancellationToken _) =>
                captured = (ApproveAbsenceCommand)cmd)
            .ReturnsAsync(Result<AbsenceDto>.Success(SampleDto(AbsenceStatus.Approved)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/hr/absences/{AbsenceGuid}/approve", new { approvedBy = ApproverGuid });

        // Portal contract: the transition answers 200 with the FRESH DTO, not 204.
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("status").GetString().Should().Be("jovahagyva");

        captured.Should().NotBeNull();
        captured!.AbsenceId.Value.Should().Be(AbsenceGuid);
        captured.ApprovedByUserId.Should().Be(ApproverGuid);
    }

    [Fact]
    public async Task ApproveAbsence_ForbiddenTransition_Returns409WithGuardMessage()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ApproveAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Conflict("Cannot approve absence in Approved status"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/hr/absences/{AbsenceGuid}/approve", new { approvedBy = ApproverGuid });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        // ADR-059: the API seam translates the domain guard's English member names
        // into the wire vocabulary (HrWire.AbsenceStatus.TranslateNames).
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("error").GetString().Should().Contain("jovahagyva status");
    }

    [Fact]
    public async Task ApproveAbsence_Missing_Returns404()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ApproveAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.NotFound("nincs"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/hr/absences/{AbsenceGuid}/approve", new { approvedBy = ApproverGuid });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task RejectAbsence_PassesReason_ReturnsOk()
    {
        RejectAbsenceCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<RejectAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<AbsenceDto>> cmd, CancellationToken _) =>
                captured = (RejectAbsenceCommand)cmd)
            .ReturnsAsync(Result<AbsenceDto>.Success(SampleDto(AbsenceStatus.Rejected)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/hr/absences/{AbsenceGuid}/reject",
            new { rejectedBy = ApproverGuid, reason = "Csúcsszezon" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.RejectionReason.Should().Be("Csúcsszezon");
    }

    [Fact]
    public async Task RejectAbsence_WithoutReason_Returns400()
    {
        // The aggregate enforces the mandatory reason → Invalid → 400 (MSW mirror).
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<RejectAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Invalid(new ValidationError("Rejection reason is required")));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/hr/absences/{AbsenceGuid}/reject", new { rejectedBy = ApproverGuid });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("error").GetString().Should().Contain("reason is required");
    }

    [Theory]
    [InlineData("start", AbsenceStatus.InProgress)]
    [InlineData("complete", AbsenceStatus.Completed)]
    [InlineData("reopen", AbsenceStatus.Pending)]
    public async Task PayloadlessTransitions_ReturnOkWithFreshDto(string action, AbsenceStatus expected)
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<StartAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Success(SampleDto(AbsenceStatus.InProgress)));
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Success(SampleDto(AbsenceStatus.Completed)));
        mediator
            .Setup(m => m.Send(It.IsAny<ReopenAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Success(SampleDto(AbsenceStatus.Pending)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsync($"/api/hr/absences/{AbsenceGuid}/{action}", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("status").GetString()
            .Should().Be(SpaceOS.Modules.HR.Api.HrWire.AbsenceStatus.ToWire(expected));
    }

    [Theory]
    [InlineData("start")]
    [InlineData("complete")]
    [InlineData("reopen")]
    public async Task PayloadlessTransitions_ForbiddenTransition_Returns409(string action)
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<StartAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Conflict("guard"));
        mediator
            .Setup(m => m.Send(It.IsAny<CompleteAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Conflict("guard"));
        mediator
            .Setup(m => m.Send(It.IsAny<ReopenAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Conflict("guard"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsync($"/api/hr/absences/{AbsenceGuid}/{action}", null);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}
