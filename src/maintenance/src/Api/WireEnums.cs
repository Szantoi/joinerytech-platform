namespace SpaceOS.Modules.Maintenance.Api;

using SpaceOS.Modules.Hosting.Wire;
using Enums = SpaceOS.Modules.Maintenance.Domain.Enums;

/// <summary>
/// The maintenance module's wire vocabulary.
/// </summary>
/// <remarks>
/// Enums travel as strings, but the maintenance contract's spellings are a
/// TRANSLATION, not a convention (ADR-059: canonical Hungarian keys on the
/// wire, English names in the domain): <c>WorkOrderStatus.Scheduled</c> is
/// <c>"utemezve"</c>, <c>AssetKind.Machine</c> is <c>"gep"</c>. No naming
/// policy derives those, so each map is written out explicitly and is the
/// single place the wire vocabulary is defined — the JSON converters
/// (<see cref="MaintenanceApiJsonOptions"/>) and the request-body parsing in
/// the endpoints both read it. Mechanics come from the shared hosting package
/// (<see cref="EnumWireMap{TEnum}"/> + <see cref="WireEnumConverter{TEnum}"/>,
/// ADR-059 / ADR-061 §3); this file keeps only the vocabulary, mirrored by the
/// portal's zod enums.
/// </remarks>
public static class MaintenanceWire
{
    /// <summary>Asset kinds (equipment types).</summary>
    public static readonly EnumWireMap<Enums.AssetKind> AssetKind = new(
        new Dictionary<Enums.AssetKind, string>
        {
            [Enums.AssetKind.Machine] = "gep",
            [Enums.AssetKind.Vehicle] = "jarmu",
            [Enums.AssetKind.Tool] = "szerszam",
            [Enums.AssetKind.Infrastructure] = "infrastruktura",
            [Enums.AssetKind.IT] = "it",
            [Enums.AssetKind.Room] = "helyiseg"
        });

    /// <summary>Computed asset statuses (never stored).</summary>
    public static readonly EnumWireMap<Enums.AssetStatus> AssetStatus = new(
        new Dictionary<Enums.AssetStatus, string>
        {
            [Enums.AssetStatus.Operational] = "uzemel",
            [Enums.AssetStatus.Maintenance] = "karbantartas",
            [Enums.AssetStatus.Breakdown] = "geptores",
            [Enums.AssetStatus.Retired] = "selejtezve"
        });

    /// <summary>Maintenance-plan trigger kinds.</summary>
    public static readonly EnumWireMap<Enums.MaintenanceTrigger> MaintenanceTrigger = new(
        new Dictionary<Enums.MaintenanceTrigger, string>
        {
            [Enums.MaintenanceTrigger.Interval] = "idokoz",
            [Enums.MaintenanceTrigger.OperatingHours] = "uzemora"
        });

    /// <summary>Work order FSM statuses.</summary>
    public static readonly EnumWireMap<Enums.WorkOrderStatus> WorkOrderStatus = new(
        new Dictionary<Enums.WorkOrderStatus, string>
        {
            [Enums.WorkOrderStatus.Reported] = "bejelentve",
            [Enums.WorkOrderStatus.Scheduled] = "utemezve",
            [Enums.WorkOrderStatus.InProgress] = "folyamatban",
            [Enums.WorkOrderStatus.Completed] = "kesz",
            [Enums.WorkOrderStatus.Postponed] = "halasztva",
            [Enums.WorkOrderStatus.Rejected] = "elutasitva"
        });

    /// <summary>Work order types.</summary>
    public static readonly EnumWireMap<Enums.WorkOrderType> WorkOrderType = new(
        new Dictionary<Enums.WorkOrderType, string>
        {
            [Enums.WorkOrderType.Corrective] = "javitas",
            [Enums.WorkOrderType.Preventive] = "megelozo",
            [Enums.WorkOrderType.Cleaning] = "takaritas"
        });

    /// <summary>Work order priorities.</summary>
    public static readonly EnumWireMap<Enums.WorkOrderPriority> WorkOrderPriority = new(
        new Dictionary<Enums.WorkOrderPriority, string>
        {
            [Enums.WorkOrderPriority.Critical] = "kritikus",
            [Enums.WorkOrderPriority.High] = "magas",
            [Enums.WorkOrderPriority.Medium] = "kozepes",
            [Enums.WorkOrderPriority.Low] = "alacsony"
        });

    /// <summary>Assignment types (internal technician / external contractor).</summary>
    public static readonly EnumWireMap<Enums.AssignmentType> AssignmentType = new(
        new Dictionary<Enums.AssignmentType, string>
        {
            [Enums.AssignmentType.Internal] = "belso",
            [Enums.AssignmentType.External] = "kulso"
        });
}
