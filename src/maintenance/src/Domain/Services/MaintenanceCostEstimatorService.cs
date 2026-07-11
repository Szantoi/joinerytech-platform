using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;

namespace SpaceOS.Modules.Maintenance.Domain.Services;

/// <summary>
/// Maintenance cost estimator service.
/// Calculates the estimated total cost of a work order based on parts and labor.
/// </summary>
public class MaintenanceCostEstimatorService : IMaintenanceCostEstimatorService
{
    /// <summary>
    /// Estimates the total cost of a work order.
    ///
    /// Formula: Sum(parts.TotalPrice) + (estimatedHours * hourlyLaborRate)
    /// </summary>
    public Money EstimateCost(WorkOrder workOrder, decimal hourlyLaborRate)
    {
        if (workOrder == null) throw new ArgumentNullException(nameof(workOrder));
        if (hourlyLaborRate < 0) throw new ArgumentException("Hourly labor rate cannot be negative", nameof(hourlyLaborRate));

        // Calculate parts cost (all parts should have same currency)
        var partsCost = Money.Zero("HUF");
        foreach (var part in workOrder.Parts)
        {
            partsCost = partsCost.Add(part.TotalPrice);
        }

        // Calculate labor cost
        var estimatedHours = workOrder.EstimatedHours ?? 0;
        var laborCost = Money.Create(estimatedHours * hourlyLaborRate, "HUF");

        // Total cost
        return partsCost.Add(laborCost);
    }
}
