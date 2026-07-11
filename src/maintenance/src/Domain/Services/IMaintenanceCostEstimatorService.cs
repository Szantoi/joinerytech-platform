using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;

namespace SpaceOS.Modules.Maintenance.Domain.Services;

/// <summary>
/// Interface for maintenance cost estimator service.
/// </summary>
public interface IMaintenanceCostEstimatorService
{
    /// <summary>
    /// Estimates the total cost of a work order (parts + labor).
    /// </summary>
    Money EstimateCost(WorkOrder workOrder, decimal hourlyLaborRate);
}
