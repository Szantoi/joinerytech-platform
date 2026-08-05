using SpaceOS.Modules.Hosting.Wire;
using SpaceOS.Projects.Application.Projects;
using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Api.Wire;

/// <summary>
/// The wire spellings of <see cref="ProjectLifecycleStatus"/> (ADR-059 <see cref="EnumWireMap{TEnum}"/>).
/// </summary>
/// <remarks>
/// <para>
/// The spellings are the portal's, measured in PROJ-01: its Projects world already speaks
/// <c>draft/active/install/done/on_hold</c> from its mock era, and this API exists to put a real
/// backend behind that world — making it re-spell its own vocabulary would be a breaking change
/// for the module's first consumer, bought with nothing.
/// </para>
/// <para>
/// The map is exhaustive by constructor contract: adding a sixth status without a spelling fails
/// at type initialisation, not on the first request that hits it.
/// </para>
/// </remarks>
public static class ProjectStatusWire
{
    /// <summary>The single wire map — both directions read it, so they cannot drift.</summary>
    public static readonly EnumWireMap<ProjectLifecycleStatus> Map = new(
        new Dictionary<ProjectLifecycleStatus, string>
        {
            [ProjectLifecycleStatus.Draft] = "draft",
            [ProjectLifecycleStatus.Active] = "active",
            [ProjectLifecycleStatus.Install] = "install",
            [ProjectLifecycleStatus.Done] = "done",
            [ProjectLifecycleStatus.OnHold] = "on_hold"
        });

    /// <summary>Parses a caller-sent status, or refuses with the allowed spellings.</summary>
    /// <exception cref="ArgumentException">Not a spelling this API ever issued — mapped to 400.</exception>
    public static ProjectLifecycleStatus Parse(string? wire)
    {
        if (Map.TryParse(wire, out var status))
        {
            return status;
        }

        throw new ArgumentException(
            $"'{wire}' is not a project status; expected one of: {string.Join(", ", Map.Spellings)}.");
    }
}

/// <summary>Create request. The code is allocated server-side (§7.3) — there is no code field.</summary>
/// <param name="Origin">Where the project was born, or <c>null</c> for standalone (§7.2 — both births legal).</param>
public sealed record CreateProjectRequest(string Name, Guid? CustomerId = null, ProjectOriginWire? Origin = null);

/// <summary>The opaque origin reference on the wire.</summary>
public sealed record ProjectOriginWire(string System, Guid ExternalId);

/// <summary>Rename request.</summary>
public sealed record RenameProjectRequest(string Name);

/// <summary>Status change request; <paramref name="Status"/> uses the wire spellings.</summary>
public sealed record ChangeProjectStatusRequest(string Status);

/// <summary>Epic assignment request.</summary>
public sealed record AssignEpicRequest(Guid EpicId);

/// <summary>One epic membership row.</summary>
public sealed record ProjectEpicWire(Guid EpicId, DateTimeOffset AssignedAtUtc);

/// <summary>The full project resource.</summary>
public sealed record ProjectResponse(
    Guid Id,
    string Code,
    string Name,
    string Status,
    Guid? CustomerId,
    ProjectOriginWire? Origin,
    DateTimeOffset CreatedAtUtc,
    int RowVersion,
    IReadOnlyList<ProjectEpicWire> Epics)
{
    /// <summary>Maps the aggregate out.</summary>
    public static ProjectResponse From(Project project)
    {
        ArgumentNullException.ThrowIfNull(project);

        return new ProjectResponse(
            project.Id,
            project.Code.Value,
            project.Name,
            ProjectStatusWire.Map.ToWire(project.Status),
            project.CustomerId,
            project.Origin is { } origin ? new ProjectOriginWire(origin.System, origin.ExternalId) : null,
            project.CreatedAtUtc,
            project.RowVersion,
            project.Epics
                .Select(epic => new ProjectEpicWire(epic.EpicId, epic.AssignedAtUtc))
                .ToList());
    }
}

/// <summary>One list row.</summary>
public sealed record ProjectSummaryResponse(
    Guid Id,
    string Code,
    string Name,
    string Status,
    Guid? CustomerId,
    DateTimeOffset CreatedAtUtc,
    int RowVersion)
{
    /// <summary>Maps the read-model row out.</summary>
    public static ProjectSummaryResponse From(ProjectSummary summary)
    {
        ArgumentNullException.ThrowIfNull(summary);

        return new ProjectSummaryResponse(
            summary.Id,
            summary.Code,
            summary.Name,
            ProjectStatusWire.Map.ToWire(summary.Status),
            summary.CustomerId,
            summary.CreatedAtUtc,
            summary.RowVersion);
    }
}

/// <summary>What a mutation answers: the id and the next <c>If-Match</c> version.</summary>
/// <remarks>Mutations do not echo the whole resource — the client that wants the new state GETs
/// it; the create is the one exception (the caller must learn its allocated code).</remarks>
public sealed record ProjectMutationResponse(Guid ProjectId, int RowVersion);
