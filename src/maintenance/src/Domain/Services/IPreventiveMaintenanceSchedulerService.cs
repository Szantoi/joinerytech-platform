using SpaceOS.Modules.Maintenance.Domain.ValueObjects;

namespace SpaceOS.Modules.Maintenance.Domain.Services;

/// <summary>
/// Interface for preventive maintenance scheduler service.
/// </summary>
public interface IPreventiveMaintenanceSchedulerService
{
    /// <summary>
    /// Determines if a maintenance plan is due based on trigger type.
    /// </summary>
    bool IsDue(MaintenancePlan plan, DateOnly currentDate, decimal currentOperatingHours);
}
