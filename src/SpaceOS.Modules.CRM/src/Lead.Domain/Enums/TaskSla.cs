namespace SpaceOS.Modules.CRM.Domain.Enums;

/// <summary>
/// Task SLA state — COMPUTED from the due date, never stored
/// (portal mirror: <c>modules/crm/services/sla.ts</c> — 'ok' | 'soon' | 'overdue').
/// </summary>
public enum TaskSla
{
    /// <summary>More than the configured warning window remains.</summary>
    Ok = 0,

    /// <summary>Due within the configured warning window (Crm:Tasks:SlaSoonDays).</summary>
    Soon = 1,

    /// <summary>Past the due date — SLA breach.</summary>
    Overdue = 2
}

/// <summary>
/// Which aggregate a CRM task or activity hangs off (portal mirror: 'lead' | 'opp').
/// </summary>
public enum CrmRefType
{
    Lead = 0,
    Opportunity = 1
}
