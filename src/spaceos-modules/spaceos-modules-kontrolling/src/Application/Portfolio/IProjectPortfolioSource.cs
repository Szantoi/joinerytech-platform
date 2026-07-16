namespace SpaceOS.Modules.Kontrolling.Application.Portfolio;

using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Source of the project master data and planned/actual cost lines the
/// controlling read model reports on.
/// </summary>
/// <remarks>
/// <para>
/// ARCHITECTURAL SEAM. Kontrolling is a read-side module: it owns the
/// <see cref="Domain.Entities.CostAdjustment"/> entity and the
/// <see cref="Domain.Aggregates.ProjectCostCalculation"/> maths, but it does
/// NOT own projects. Project identity, customer, lifecycle label, contract
/// value, invoiced amount and the cost lines all belong to other modules
/// (CRM order → project, manufacturing preparation, time logs, warehouse,
/// logistics, inbound invoices).
/// </para>
/// <para>
/// This port declares exactly what the module needs from them. Until the real
/// cross-module integration exists, the host binds a configuration-seeded
/// in-memory implementation (see Infrastructure/Portfolio) — the same seam the
/// existing <see cref="Services.IIntegrationDataProvider"/> stub occupies.
/// Convergence of the two ports is a documented follow-up.
/// </para>
/// </remarks>
public interface IProjectPortfolioSource
{
    /// <summary>
    /// Every project of the tenant that the controlling views report on
    /// (all lifecycle labels, including Draft and Done).
    /// </summary>
    Task<IReadOnlyList<ControllingProjectData>> GetProjectsAsync(
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// A single project by its business key, or <c>null</c> when unknown.
    /// </summary>
    Task<ControllingProjectData?> GetProjectAsync(
        Guid tenantId,
        string projectCode,
        CancellationToken ct = default);
}

/// <summary>
/// A project as the controlling read model sees it: master data plus the
/// planned/actual cost lines it aggregates.
/// </summary>
/// <param name="ProjectId">
/// Internal identifier. <see cref="Domain.Entities.CostAdjustment.ProjectId"/>
/// references this, so adjustments stay Guid-keyed.
/// </param>
/// <param name="ProjectCode">
/// Business key (e.g. <c>PRJ-2026-014</c>) — the identifier the REST contract
/// exposes and the portal addresses projects by.
/// </param>
/// <param name="Status">Lifecycle label — see <see cref="ProjectLifecycleStatus"/> (not an FSM).</param>
/// <param name="ContractValue">Agreed revenue — the denominator of every margin.</param>
/// <param name="Invoiced">Revenue billed so far.</param>
public sealed record ControllingProjectData(
    Guid ProjectId,
    string ProjectCode,
    string Name,
    string Customer,
    ProjectLifecycleStatus Status,
    Money ContractValue,
    Money Invoiced,
    IReadOnlyList<ProjectCostLine> Lines);

/// <summary>
/// One planned/actual cost line of a project, already attributed to a category.
/// </summary>
/// <param name="Label">Human-readable origin of the line (e.g. "Gyártás (műhely-napló)").</param>
/// <param name="Note">Optional controller remark explaining a deviation.</param>
public sealed record ProjectCostLine(
    CostCategory Category,
    string Label,
    Money Plan,
    Money Actual,
    string? Note = null);
