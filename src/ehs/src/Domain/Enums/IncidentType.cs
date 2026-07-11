namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Type of workplace incident
/// </summary>
public enum IncidentType
{
    /// <summary>Actual injury or damage occurred</summary>
    Accident = 1,

    /// <summary>Incident that could have caused injury but didn't</summary>
    NearMiss = 2,

    /// <summary>Identified hazardous condition requiring attention</summary>
    HazardousCondition = 3
}
