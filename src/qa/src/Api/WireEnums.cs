namespace SpaceOS.Modules.QA.Api;

using SpaceOS.Modules.Hosting.Wire;
using SpaceOS.Modules.QA.Domain.Enums;

/// <summary>
/// The QA module's wire vocabulary (ADR-059).
/// </summary>
/// <remarks>
/// Enums travel as strings, but the QA contract's spellings are a TRANSLATION,
/// not a convention: <c>TicketStatus.Reported</c> is <c>"bejelentve"</c> on the
/// wire, <c>FailureType.Scratch</c> is <c>"karc"</c>. No naming policy derives
/// those, so the map is written out explicitly and is the single place the wire
/// vocabulary is defined — the JSON converters and the query-string/body-string
/// parsing both read it (kontrolling precedent; mechanics live in the shared
/// SpaceOS.Modules.Hosting package, ADR-059 / ADR-061 §3).
/// The keys mirror the portal's zod schema (case-SENSITIVE exact match).
/// NOTE: the dead <c>TicketPriority</c> enum is deliberately NOT mapped — it
/// never crosses the wire (tickets use <see cref="CrmTaskPriority"/>) and is a
/// deletion candidate.
/// </remarks>
public static class QaWire
{
    /// <summary>
    /// Inspection FSM states. The portal's "megfelelt"/"selejt" VIEW-states are
    /// DERIVED from Completed + result (ADR-063) — they are not wire statuses;
    /// only these three cross the wire.
    /// </summary>
    public static readonly EnumWireMap<InspectionStatus> InspectionStatus = new(
        new Dictionary<InspectionStatus, string>
        {
            [Domain.Enums.InspectionStatus.Planned] = "nyitott",
            [Domain.Enums.InspectionStatus.InProgress] = "folyamatban",
            [Domain.Enums.InspectionStatus.Completed] = "lezarva"
        });

    /// <summary>Inspection outcomes.</summary>
    public static readonly EnumWireMap<InspectionResult> InspectionResult = new(
        new Dictionary<InspectionResult, string>
        {
            [Domain.Enums.InspectionResult.Pending] = "fuggoben",
            [Domain.Enums.InspectionResult.Pass] = "megfelelt",
            [Domain.Enums.InspectionResult.Fail] = "selejt",
            [Domain.Enums.InspectionResult.Conditional] = "felteteles"
        });

    /// <summary>Checkpoint placements in the production flow.</summary>
    public static readonly EnumWireMap<CheckpointType> CheckpointType = new(
        new Dictionary<CheckpointType, string>
        {
            [Domain.Enums.CheckpointType.Incoming] = "beerkezo",
            [Domain.Enums.CheckpointType.InProcess] = "gyartaskozi",
            [Domain.Enums.CheckpointType.Final] = "vegso"
        });

    /// <summary>Inspection criteria kinds.</summary>
    public static readonly EnumWireMap<CriteriaType> CriteriaType = new(
        new Dictionary<CriteriaType, string>
        {
            [Domain.Enums.CriteriaType.Visual] = "vizualis",
            [Domain.Enums.CriteriaType.Dimensional] = "meretes",
            [Domain.Enums.CriteriaType.Functional] = "funkcionalis"
        });

    /// <summary>Checkpoint criticality (production-blocking behaviour).</summary>
    public static readonly EnumWireMap<CriticalLevel> CriticalLevel = new(
        new Dictionary<CriticalLevel, string>
        {
            [Domain.Enums.CriticalLevel.Critical] = "kritikus",
            [Domain.Enums.CriticalLevel.Major] = "jelentos",
            [Domain.Enums.CriticalLevel.Minor] = "enyhe"
        });

    /// <summary>Failure-note defect categories.</summary>
    public static readonly EnumWireMap<FailureType> FailureType = new(
        new Dictionary<FailureType, string>
        {
            [Domain.Enums.FailureType.Scratch] = "karc",
            [Domain.Enums.FailureType.Gap] = "hezag",
            [Domain.Enums.FailureType.Misalignment] = "illeszkedes",
            [Domain.Enums.FailureType.Color] = "szin",
            [Domain.Enums.FailureType.Dimension] = "meret",
            [Domain.Enums.FailureType.Surface] = "felulet",
            [Domain.Enums.FailureType.Functional] = "funkcionalis",
            [Domain.Enums.FailureType.Missing] = "hianyzo",
            [Domain.Enums.FailureType.Damage] = "serules",
            [Domain.Enums.FailureType.Other] = "egyeb"
        });

    /// <summary>Ticket FSM states.</summary>
    public static readonly EnumWireMap<TicketStatus> TicketStatus = new(
        new Dictionary<TicketStatus, string>
        {
            [Domain.Enums.TicketStatus.Reported] = "bejelentve",
            [Domain.Enums.TicketStatus.Assigned] = "kiosztva",
            [Domain.Enums.TicketStatus.InProgress] = "folyamatban",
            [Domain.Enums.TicketStatus.Resolved] = "megoldva",
            [Domain.Enums.TicketStatus.Rejected] = "elutasitva"
        });

    /// <summary>Ticket kinds.</summary>
    public static readonly EnumWireMap<TicketType> TicketType = new(
        new Dictionary<TicketType, string>
        {
            [Domain.Enums.TicketType.Warranty] = "garancia",
            [Domain.Enums.TicketType.Repair] = "javitas",
            [Domain.Enums.TicketType.Missing] = "hiany"
        });

    /// <summary>Ticket priorities (the CRM-borrowed scale — the live one).</summary>
    public static readonly EnumWireMap<CrmTaskPriority> Priority = new(
        new Dictionary<CrmTaskPriority, string>
        {
            [CrmTaskPriority.Low] = "alacsony",
            [CrmTaskPriority.Medium] = "kozepes",
            [CrmTaskPriority.High] = "magas",
            [CrmTaskPriority.Critical] = "kritikus"
        });

    /// <summary>Resolution action kinds.</summary>
    public static readonly EnumWireMap<ActionType> ActionType = new(
        new Dictionary<ActionType, string>
        {
            [Domain.Enums.ActionType.Repair] = "javitas",
            [Domain.Enums.ActionType.Replace] = "csere",
            [Domain.Enums.ActionType.Refund] = "visszaterites",
            [Domain.Enums.ActionType.NoAction] = "nincs_intezkedes"
        });
}
