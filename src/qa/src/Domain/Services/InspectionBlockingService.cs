using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Domain.Services;

/// <summary>
/// CRITICAL SERVICE: Determines if failed inspections block production.
/// Integration point with Production module.
/// </summary>
public class InspectionBlockingService
{
    /// <summary>
    /// Checks if an inspection blocks production based on result and checkpoint critical level.
    /// Logic: Result == Fail AND CriticalLevel == Critical
    /// </summary>
    public bool IsProductionBlocked(Inspection inspection, QACheckpoint checkpoint)
    {
        if (inspection == null) throw new ArgumentNullException(nameof(inspection));
        if (checkpoint == null) throw new ArgumentNullException(nameof(checkpoint));

        return inspection.Result == InspectionResult.Fail
               && checkpoint.CriticalLevel == CriticalLevel.Critical;
    }

    /// <summary>
    /// Gets all blocking inspections for a given order.
    /// Used by Production module to check if order can proceed.
    /// </summary>
    public IEnumerable<Inspection> GetBlockingInspections(
        Guid orderId,
        IEnumerable<Inspection> inspections)
    {
        if (inspections == null) throw new ArgumentNullException(nameof(inspections));

        return inspections
            .Where(i => i.OrderId == orderId
                        && i.Result == InspectionResult.Fail
                        && i.Status == InspectionStatus.Completed)
            .ToList();
    }

    /// <summary>
    /// Checks if any inspection in the collection is blocking production.
    /// </summary>
    public bool HasBlockingInspections(Guid orderId, IEnumerable<Inspection> inspections)
    {
        return GetBlockingInspections(orderId, inspections).Any();
    }
}
