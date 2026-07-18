namespace SpaceOS.Modules.Kontrolling.Api;

using SpaceOS.Modules.Hosting.Wire;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// The controlling module's wire vocabulary.
/// </summary>
/// <remarks>
/// Enums travel as strings, but the controlling contract's spellings are a
/// TRANSLATION, not a convention: <c>CostCategory.Material</c> is
/// <c>"anyag"</c> on the wire, and <c>OnHold</c> is <c>"on_hold"</c>. No
/// naming policy derives those, so the map is written out explicitly and is
/// the single place the wire vocabulary is defined — the JSON converters and
/// the query-string binding both read it. The mechanics
/// (<see cref="EnumWireMap{TEnum}"/> + <see cref="WireEnumConverter{TEnum}"/>)
/// were promoted from here into the shared SpaceOS.Modules.Hosting package
/// (ADR-059 / ADR-061 §3) — this file keeps only the vocabulary.
/// </remarks>
public static class KontrollingWire
{
    /// <summary>Canonical Hungarian cost-category keys.</summary>
    public static readonly EnumWireMap<CostCategory> Category = new(
        new Dictionary<CostCategory, string>
        {
            [CostCategory.Material] = "anyag",
            [CostCategory.Labor] = "munka",
            [CostCategory.Subcontracting] = "bermunka",
            [CostCategory.Logistics] = "szallitas",
            [CostCategory.Supplier] = "beszallito",
            [CostCategory.Overhead] = "rezsi"
        });

    /// <summary>Project lifecycle labels.</summary>
    public static readonly EnumWireMap<ProjectLifecycleStatus> Status = new(
        new Dictionary<ProjectLifecycleStatus, string>
        {
            [ProjectLifecycleStatus.Draft] = "draft",
            [ProjectLifecycleStatus.Active] = "active",
            [ProjectLifecycleStatus.Install] = "install",
            [ProjectLifecycleStatus.Done] = "done",
            [ProjectLifecycleStatus.OnHold] = "on_hold"
        });

    /// <summary>Cost-adjustment scopes.</summary>
    public static readonly EnumWireMap<AdjustmentScope> Scope = new(
        new Dictionary<AdjustmentScope, string>
        {
            [AdjustmentScope.Project] = "project",
            [AdjustmentScope.Portfolio] = "portfolio"
        });
}
