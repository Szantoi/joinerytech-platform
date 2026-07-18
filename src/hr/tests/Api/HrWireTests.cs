using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ardalis.Result;
using FluentAssertions;
using MediatR;
using Moq;
using SpaceOS.Modules.Hosting.Wire;
using SpaceOS.Modules.HR.Api;
using SpaceOS.Modules.HR.Api.Endpoints;
using SpaceOS.Modules.HR.Application.Commands;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Application.Queries;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Api;

/// <summary>
/// ADR-059 wire-vocabulary tests: pins the exact Hungarian spellings the portal's
/// zod schemas expect (modules/hr/services/*.ts), the case-SENSITIVE parse contract,
/// and the endpoint behaviour of the seam (400 listing the accepted keys, Hungarian
/// round-trip through the TestServer). Kontrolling KontrollingWireTests precedent.
/// </summary>
public sealed class HrWireTests
{
    // ========== VOCABULARY PINS (exact, ordered — the client contract) ==========

    [Fact]
    public void EveryDepartment_HasAHungarianSpelling()
        => Enum.GetValues<Department>().Select(HrWire.Department.ToWire)
            .Should().Equal("gyartas", "szereles", "logisztika", "tervezes", "ertekesites", "iroda");

    [Fact]
    public void EverySkillKey_HasAHungarianSpelling()
        => Enum.GetValues<SkillKey>().Select(HrWire.SkillKey.ToWire)
            .Should().Equal(
                "szabas", "elzaras", "cnc", "osszeszereles", "felulet",
                "szerel", "szallit", "felmer", "tervezes", "ertekesites");

    [Fact]
    public void EveryPayGradeBand_HasAHungarianSpelling()
        => Enum.GetValues<PayGradeBand>().Select(HrWire.PayGradeBand.ToWire)
            .Should().Equal("seged", "szakmunkas", "mester", "mernok", "vezeto");

    [Fact]
    public void EveryAbsenceStatus_HasAHungarianSpelling()
        => Enum.GetValues<AbsenceStatus>().Select(HrWire.AbsenceStatus.ToWire)
            .Should().Equal("kert", "jovahagyva", "elutasitva", "folyamatban", "lezarva");

    [Fact]
    public void EveryAbsenceType_HasAHungarianSpelling()
        => Enum.GetValues<AbsenceType>().Select(HrWire.AbsenceType.ToWire)
            .Should().Equal("szabadsag", "betegseg", "fizetes_nelkuli", "egyeb");

    // ========== PARSE CONTRACT ==========

    [Fact]
    public void ParsingIsCaseSensitive_AndRejectsEnglishMemberNames()
    {
        // The contract spells them lowercase; accepting "Gyartas" (or the English
        // domain member name) would invite clients to drift.
        HrWire.Department.TryParse("gyartas", out var department).Should().BeTrue();
        department.Should().Be(Department.Production);

        HrWire.Department.TryParse("Gyartas", out _).Should().BeFalse();
        HrWire.Department.TryParse("Production", out _).Should().BeFalse();
        HrWire.Department.TryParse(null, out _).Should().BeFalse();
    }

    [Fact]
    public void AddingAnEnumMemberWithoutASpelling_FailsFast()
    {
        // Guards the whole scheme: a member with no wire name would otherwise
        // serialise as something the client cannot parse.
        var act = () => new EnumWireMap<Department>(
            new Dictionary<Department, string> { [Department.Production] = "gyartas" });

        act.Should().Throw<ArgumentException>().WithMessage("*without a wire spelling*");
    }

    // ========== ENDPOINT SEAM ==========

    [Fact]
    public async Task UnknownQueryKey_Returns400_ListingTheAcceptedSpellings()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await HrEndpointTestHost.StartAsync(
            mediator.Object, endpoints => endpoints.MapEmployeeEndpoints());

        var response = await host.Client.GetAsync("/api/hr/employees?dept=butorasztalos");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = JsonDocument.Parse(await response.Content.ReadAsStringAsync())
            .RootElement.GetProperty("error").GetString();
        error.Should().Contain("butorasztalos");
        foreach (var spelling in HrWire.Department.Spellings)
        {
            error.Should().Contain(spelling);
        }
    }

    [Fact]
    public async Task AbsenceRoundTrip_HungarianIn_HungarianOut()
    {
        var absenceGuid = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var employeeGuid = Guid.Parse("33333333-3333-3333-3333-333333333333");
        RequestAbsenceCommand? captured = null;

        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<RequestAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<AbsenceId>> cmd, CancellationToken _) =>
                captured = (RequestAbsenceCommand)cmd)
            .ReturnsAsync(Result<AbsenceId>.Success(AbsenceId.From(absenceGuid)));
        mediator
            .Setup(m => m.Send(It.IsAny<GetAbsenceQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Success(new AbsenceDto(
                Id: absenceGuid,
                EmployeeId: employeeGuid,
                EmployeeName: "Kovács János",
                Type: AbsenceType.SickLeave,
                StartDate: new DateOnly(2026, 8, 3),
                EndDate: new DateOnly(2026, 8, 7),
                Status: AbsenceStatus.Pending,
                WorkDays: 5,
                Reason: "Betegség",
                ApprovedByUserId: null,
                ApprovedAt: null,
                RejectedByUserId: null,
                RejectedAt: null,
                RejectionReason: null)));

        await using var host = await HrEndpointTestHost.StartAsync(
            mediator.Object, endpoints => endpoints.MapAbsenceEndpoints());

        var response = await host.Client.PostAsJsonAsync("/api/hr/absences", new
        {
            employeeId = employeeGuid,
            type = "betegseg",
            startDate = "2026-08-03",
            endDate = "2026-08-07",
            reason = "Betegség"
        });

        // Hungarian in: the wire key parsed into the English domain member…
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        captured!.Type.Should().Be(AbsenceType.SickLeave);

        // …and Hungarian out: the DTO serialises back in the wire vocabulary.
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("type").GetString().Should().Be("betegseg");
        body.RootElement.GetProperty("status").GetString().Should().Be("kert");
    }

    [Fact]
    public async Task RequestAbsence_HungarianType_IsAccepted_EnglishName_Returns400()
    {
        var absenceGuid = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var employeeGuid = Guid.Parse("33333333-3333-3333-3333-333333333333");

        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<RequestAbsenceCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceId>.Success(AbsenceId.From(absenceGuid)));
        mediator
            .Setup(m => m.Send(It.IsAny<GetAbsenceQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AbsenceDto>.Success(new AbsenceDto(
                Id: absenceGuid,
                EmployeeId: employeeGuid,
                EmployeeName: "Kovács János",
                Type: AbsenceType.Vacation,
                StartDate: new DateOnly(2026, 8, 3),
                EndDate: new DateOnly(2026, 8, 7),
                Status: AbsenceStatus.Pending,
                WorkDays: 5,
                Reason: "Nyári szabadság",
                ApprovedByUserId: null,
                ApprovedAt: null,
                RejectedByUserId: null,
                RejectedAt: null,
                RejectionReason: null)));

        await using var host = await HrEndpointTestHost.StartAsync(
            mediator.Object, endpoints => endpoints.MapAbsenceEndpoints());

        var accepted = await host.Client.PostAsJsonAsync("/api/hr/absences", new
        {
            employeeId = employeeGuid,
            type = "szabadsag",
            startDate = "2026-08-03",
            endDate = "2026-08-07",
            reason = "Nyári szabadság"
        });
        accepted.StatusCode.Should().Be(HttpStatusCode.Created);

        // ADR-059: the English member name is NOT part of the wire contract any more.
        var rejected = await host.Client.PostAsJsonAsync("/api/hr/absences", new
        {
            employeeId = employeeGuid,
            type = "Vacation",
            startDate = "2026-08-03",
            endDate = "2026-08-07",
            reason = "Nyári szabadság"
        });
        rejected.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = JsonDocument.Parse(await rejected.Content.ReadAsStringAsync())
            .RootElement.GetProperty("error").GetString();
        error.Should().Contain("Vacation");
        error.Should().Contain("szabadsag");
    }
}
