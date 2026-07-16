using Ardalis.Result;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.HR.Application.Configuration;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Application.Queries;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Domain.Services;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Application;

/// <summary>
/// ADR-060 projection tests: the EmployeeDto carries the pay grade band key AND the
/// tenant-config hourly rate as two flat fields (portal employeeSchema mirror) — the
/// rate is resolved at projection time via the options pattern ("Hr:PayGrades"),
/// never read from the aggregate.
/// </summary>
public class EmployeePayGradeProjectionTests
{
    private static Employee CreateEmployee(PayGradeBand band) => Employee.Create(
        Guid.NewGuid(),
        "Kovács János",
        "CNC gépkezelő",
        Department.Production,
        Guid.NewGuid(),
        band,
        40m,
        "kovacs.janos@example.hu");

    [Theory]
    [InlineData(PayGradeBand.Helper, 2600)]
    [InlineData(PayGradeBand.SkilledWorker, 3800)]
    [InlineData(PayGradeBand.Master, 5200)]
    [InlineData(PayGradeBand.Engineer, 6400)]
    [InlineData(PayGradeBand.Lead, 8000)]
    public void ToDto_ResolvesTheHourlyRateFromConfigPerBand(PayGradeBand band, decimal expectedRate)
    {
        var dto = HrDtoMapper.ToDto(CreateEmployee(band), HrPayGradeConfiguration.Default);

        dto.PayGrade.Should().Be(band);
        dto.HourlyRate.Should().Be(expectedRate);
    }

    [Fact]
    public async Task GetEmployeeQueryHandler_UsesTheBoundTenantRate()
    {
        var employee = CreateEmployee(PayGradeBand.Master);
        var repository = new Mock<IEmployeeRepository>();
        repository
            .Setup(r => r.GetByIdAsync(employee.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(employee);

        // Tenant config overrides the Master band rate (the other bands keep defaults).
        var options = Options.Create(new HrPayGradesOptions { Master = 5900m });
        var handler = new GetEmployeeQueryHandler(repository.Object, options);

        var result = await handler.Handle(new GetEmployeeQuery(employee.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.PayGrade.Should().Be(PayGradeBand.Master);
        result.Value.HourlyRate.Should().Be(5900m);
    }

    [Fact]
    public async Task GetEmployeesQueryHandler_ProjectsRatesForEveryRow()
    {
        var tenantId = SpaceOS.Kernel.Domain.ValueObjects.TenantId.From(Guid.NewGuid());
        var employees = new[]
        {
            CreateEmployee(PayGradeBand.Helper),
            CreateEmployee(PayGradeBand.Lead)
        };
        var repository = new Mock<IEmployeeRepository>();
        repository
            .Setup(r => r.ListAsync(tenantId, null, null, null, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(employees);

        var handler = new GetEmployeesQueryHandler(
            repository.Object, Options.Create(new HrPayGradesOptions()));

        var result = await handler.Handle(new GetEmployeesQuery(tenantId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Select(dto => dto.HourlyRate).Should().Equal(2600m, 8000m);
    }

    [Fact]
    public void Handler_InvalidPayGradeConfig_FailsFastOnConstruction()
    {
        // Invalid tenant config must not answer requests with wrong money data —
        // the handler fails on resolution (EHS fail-fast precedent).
        var repository = Mock.Of<IEmployeeRepository>();
        var options = Options.Create(new HrPayGradesOptions { Helper = 0m });

        var act = () => new GetEmployeeQueryHandler(repository, options);

        act.Should().Throw<DomainException>()
            .WithMessage("Hr:PayGrades:Helper must be a positive hourly rate");
    }
}
