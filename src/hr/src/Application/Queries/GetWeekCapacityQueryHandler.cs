using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Domain.Services;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Handler for GetWeekCapacityQuery: active employees + the week's overlapping absences
/// → the domain's capacity grid (one source of truth with the Production module's
/// scheduling maths). The client never computes its own grid.
/// </summary>
public class GetWeekCapacityQueryHandler : IRequestHandler<GetWeekCapacityQuery, Result<WeekCapacityDto>>
{
    private readonly IEmployeeRepository _employeeRepository;
    private readonly IAbsenceRepository _absenceRepository;
    private readonly ICapacityCalculationService _capacityService;
    private readonly ILogger<GetWeekCapacityQueryHandler> _logger;

    public GetWeekCapacityQueryHandler(
        IEmployeeRepository employeeRepository,
        IAbsenceRepository absenceRepository,
        ICapacityCalculationService capacityService,
        ILogger<GetWeekCapacityQueryHandler> logger)
    {
        _employeeRepository = employeeRepository;
        _absenceRepository = absenceRepository;
        _capacityService = capacityService;
        _logger = logger;
    }

    public async Task<Result<WeekCapacityDto>> Handle(GetWeekCapacityQuery request, CancellationToken ct)
    {
        if (request.Week.DayOfWeek != DayOfWeek.Monday)
        {
            return Result<WeekCapacityDto>.Invalid(
                new ValidationError($"The week parameter must be a Monday (got: {request.Week:yyyy-MM-dd})"));
        }

        var employees = await _employeeRepository
            .ListAsync(request.TenantId, ct: ct)
            .ConfigureAwait(false);

        var weekEnd = request.Week.AddDays(_capacityService.Configuration.WorkdaysPerWeek - 1);
        var absences = await _absenceRepository
            .GetOverlappingAsync(request.TenantId, request.Week, weekEnd, ct)
            .ConfigureAwait(false);

        var grid = _capacityService.CalculateWeekGrid(employees, request.Week, absences);

        LogHighUtilization(grid);

        return Result<WeekCapacityDto>.Success(HrDtoMapper.ToDto(grid));
    }

    /// <summary>
    /// Operational signal on the CONFIG-DRIVEN warn threshold (Hr:Capacity:UtilizationWarnThreshold):
    /// the rows above it are the ones the capacity screen flags as "high load".
    /// </summary>
    private void LogHighUtilization(WeekCapacityGrid grid)
    {
        var threshold = _capacityService.Configuration.UtilizationWarnThreshold;
        var high = grid.Rows.Where(r => r.Utilization > threshold).ToList();

        if (high.Count > 0)
        {
            _logger.LogWarning(
                "Week {Week:yyyy-MM-dd}: {Count} employee(s) above the {Threshold:P0} utilization warn threshold",
                grid.Week, high.Count, threshold);
        }
    }
}
