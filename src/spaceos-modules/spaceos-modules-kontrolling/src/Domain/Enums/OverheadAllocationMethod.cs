namespace SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Method for allocating overhead costs to projects
/// </summary>
public enum OverheadAllocationMethod
{
    /// <summary>
    /// Overhead = direct costs * rate (default method)
    /// </summary>
    DirectCostPercentage = 1,

    /// <summary>
    /// Overhead = total labor hours * hourly rate
    /// </summary>
    LaborHours = 2,

    /// <summary>
    /// Overhead = revenue * rate
    /// </summary>
    Revenue = 3
}
