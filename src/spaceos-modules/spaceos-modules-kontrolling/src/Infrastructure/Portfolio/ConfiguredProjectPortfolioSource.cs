namespace SpaceOS.Modules.Kontrolling.Infrastructure.Portfolio;

using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Kontrolling.Application.Portfolio;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Configuration-bound <see cref="IProjectPortfolioSource"/> — the interim
/// implementation until the real cross-module integration exists.
/// </summary>
/// <remarks>
/// <para>
/// INTERIM BY DESIGN, NOT A SHORTCUT. Project master data and cost lines
/// belong to other modules (CRM order → project, manufacturing preparation,
/// time logs, warehouse, logistics, inbound invoices), none of which this
/// platform exposes yet — that is the gap the port documents. Binding the
/// projects from configuration keeps the seam explicit and the host runnable
/// and demoable, without inventing a projects table that the real integration
/// would have to tear out again.
/// </para>
/// <para>
/// The development host seeds the section with the same portfolio the client's
/// mock served, so the API is a drop-in replacement for it. In production the
/// section is empty and the endpoints report an empty portfolio — truthfully.
/// Replacing this with the real integration is the module's next task.
/// </para>
/// </remarks>
public sealed class ConfiguredProjectPortfolioSource : IProjectPortfolioSource
{
    /// <summary>The configured projects, grouped by the tenant that owns them.</summary>
    private readonly IReadOnlyDictionary<Guid, IReadOnlyList<ControllingProjectData>> _byTenant;

    /// <exception cref="InvalidOperationException">
    /// A configured project is unusable (no id, no business key, or a duplicate
    /// key within a tenant). Fails fast at startup rather than serving a
    /// portfolio that silently misses or double-counts a project.
    /// </exception>
    public ConfiguredProjectPortfolioSource(
        ProjectPortfolioOptions options,
        ILogger<ConfiguredProjectPortfolioSource> logger)
    {
        _byTenant = options.Projects
            .GroupBy(p => p.TenantId)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var projects = group.Select(Map).ToList();

                    var duplicate = projects
                        .GroupBy(p => p.ProjectCode, StringComparer.Ordinal)
                        .FirstOrDefault(g => g.Count() > 1);

                    if (duplicate is not null)
                    {
                        throw new InvalidOperationException(
                            $"{ProjectPortfolioOptions.SectionName}: tenant {group.Key} has " +
                            $"{duplicate.Count()} projects with the business key '{duplicate.Key}'.");
                    }

                    return (IReadOnlyList<ControllingProjectData>)projects;
                });

        logger.LogInformation(
            "Controlling project source bound from configuration: {Count} project(s) " +
            "across {TenantCount} tenant(s). This is the interim source — see IProjectPortfolioSource.",
            _byTenant.Sum(kvp => kvp.Value.Count), _byTenant.Count);
    }

    public Task<IReadOnlyList<ControllingProjectData>> GetProjectsAsync(
        Guid tenantId,
        CancellationToken ct = default)
        => Task.FromResult(_byTenant.TryGetValue(tenantId, out var projects) ? projects : []);

    public Task<ControllingProjectData?> GetProjectAsync(
        Guid tenantId,
        string projectCode,
        CancellationToken ct = default)
    {
        var projects = _byTenant.TryGetValue(tenantId, out var found) ? found : [];
        return Task.FromResult(
            projects.FirstOrDefault(p => string.Equals(p.ProjectCode, projectCode, StringComparison.Ordinal)));
    }

    private static ControllingProjectData Map(ProjectOptions options)
    {
        if (options.ProjectId == Guid.Empty)
        {
            throw new InvalidOperationException(
                $"{ProjectPortfolioOptions.SectionName}: project '{options.Code}' has no ProjectId.");
        }

        if (string.IsNullOrWhiteSpace(options.Code))
        {
            throw new InvalidOperationException(
                $"{ProjectPortfolioOptions.SectionName}: project {options.ProjectId} " +
                "has no business key (Code).");
        }

        return new ControllingProjectData(
            ProjectId: options.ProjectId,
            ProjectCode: options.Code,
            Name: options.Name,
            Customer: options.Customer,
            Status: options.Status,
            ContractValue: Money.FromHUF(options.ContractValue),
            Invoiced: Money.FromHUF(options.Invoiced),
            Lines: options.Lines
                .Select(l => new ProjectCostLine(
                    l.Category,
                    l.Label,
                    Money.FromHUF(l.Plan),
                    Money.FromHUF(l.Actual),
                    string.IsNullOrWhiteSpace(l.Note) ? null : l.Note))
                .ToList());
    }
}

/// <summary>
/// Configuration shape of <see cref="ConfiguredProjectPortfolioSource"/>
/// (section <c>Kontrolling:ProjectSource</c>).
/// </summary>
public sealed class ProjectPortfolioOptions
{
    /// <summary>Configuration section this is bound from.</summary>
    public const string SectionName = "Kontrolling:ProjectSource";

    /// <summary>The configured projects. Empty means an empty portfolio.</summary>
    public IList<ProjectOptions> Projects { get; init; } = [];
}

/// <summary>One configured project.</summary>
public sealed class ProjectOptions
{
    /// <summary>Owning tenant.</summary>
    public Guid TenantId { get; init; }

    /// <summary>Internal id; cost adjustments reference this.</summary>
    public Guid ProjectId { get; init; }

    /// <summary>Business key, e.g. <c>PRJ-2026-014</c>.</summary>
    public string Code { get; init; } = string.Empty;

    /// <summary>Project name.</summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>Customer name.</summary>
    public string Customer { get; init; } = string.Empty;

    /// <summary>Lifecycle label (not an FSM).</summary>
    public ProjectLifecycleStatus Status { get; init; }

    /// <summary>Agreed revenue.</summary>
    public decimal ContractValue { get; init; }

    /// <summary>Revenue billed so far.</summary>
    public decimal Invoiced { get; init; }

    /// <summary>Planned/actual cost lines.</summary>
    public IList<CostLineOptions> Lines { get; init; } = [];
}

/// <summary>One configured cost line.</summary>
public sealed class CostLineOptions
{
    /// <summary>Cost category.</summary>
    public CostCategory Category { get; init; }

    /// <summary>Human-readable origin of the line.</summary>
    public string Label { get; init; } = string.Empty;

    /// <summary>Planned cost.</summary>
    public decimal Plan { get; init; }

    /// <summary>Actual cost booked so far.</summary>
    public decimal Actual { get; init; }

    /// <summary>Optional controller remark.</summary>
    public string? Note { get; init; }
}
