using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Application.Repositories;

/// <summary>
/// The project aggregate's persistence port.
/// </summary>
/// <remarks>
/// <para>
/// Every read here is already tenant-scoped by the time it returns: the EF query filter narrows
/// it and PostgreSQL RLS enforces it (ADR-062). No method therefore takes a tenant argument —
/// a repository that accepted one would invite a caller to pass the wrong one, and would make
/// the tenant look like a parameter when it is really ambient.
/// </para>
/// </remarks>
public interface IProjectRepository
{
    /// <summary>Loads a project with its epic assignments, or <c>null</c> if the caller cannot see it.</summary>
    Task<Project?> GetByIdAsync(Guid projectId, CancellationToken cancellationToken = default);

    /// <summary>Loads a project by its business key, or <c>null</c>.</summary>
    Task<Project?> GetByCodeAsync(ProjectCode code, CancellationToken cancellationToken = default);

    /// <summary>Whether this tenant already has a project carrying that code.</summary>
    /// <remarks>
    /// The unique index is the real guard; this exists so the API can answer with a conflict
    /// instead of a database exception. The check is <b>not</b> a substitute for the index: two
    /// concurrent creates can both see "free" here, and the index is what stops the second one.
    /// </remarks>
    Task<bool> CodeExistsAsync(ProjectCode code, CancellationToken cancellationToken = default);

    /// <summary>
    /// The project that currently owns <paramref name="epicId"/>, or <c>null</c> if it is free.
    /// </summary>
    /// <remarks>
    /// Feeds <see cref="Project.EnsureEpicUnassigned"/>. The rule lives in the domain and the fact
    /// it needs is fetched here, because the owner is another aggregate and only a query can know.
    /// <b>The answer is tenant-scoped</b>, which is the right scope and worth saying out loud: an
    /// epic assigned inside another tenant is invisible, so this reports "free". Two tenants
    /// claiming one Kernel epic is a cross-tenant question that neither this module's RLS nor its
    /// query filter can see — resolving it belongs to the Kernel, where the epic actually lives.
    /// </remarks>
    Task<Guid?> FindOwningProjectIdAsync(Guid epicId, CancellationToken cancellationToken = default);

    /// <summary>Stages a newly created project.</summary>
    void Add(Project project);

    /// <summary>Commits the staged changes.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
