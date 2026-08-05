using MediatR;
using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Application.Projects;

/// <summary>
/// One row of the tenant's project list — the fields the portal grid and the API list endpoint
/// need, and nothing that requires loading the aggregate.
/// </summary>
/// <param name="RowVersion">The version a client would send as <c>If-Match</c> (PROJ-06).</param>
public sealed record ProjectSummary(
    Guid Id,
    string Code,
    string Name,
    ProjectLifecycleStatus Status,
    Guid? CustomerId,
    DateTimeOffset CreatedAtUtc,
    int RowVersion);

/// <summary>
/// The read-side port for listing projects.
/// </summary>
/// <remarks>
/// Separate from <see cref="Repositories.IProjectRepository"/> on purpose: the repository loads
/// aggregates for mutation, one at a time and with their epics; a list is a projection that never
/// needs the aggregate and must not pay for it. Like every read in this module, the answer is
/// tenant-scoped by the ambient tenant (query filter + RLS), so there is no tenant parameter.
/// </remarks>
public interface IProjectDirectory
{
    /// <summary>The calling tenant's projects, newest first.</summary>
    Task<IReadOnlyList<ProjectSummary>> ListAsync(CancellationToken cancellationToken = default);
}

/// <summary>Loads one project with its epic assignments.</summary>
/// <remarks>Throws <see cref="ProjectNotFoundException"/> rather than returning <c>null</c>, so
/// every caller inherits the "absent and not-yours answer identically" stance instead of each
/// inventing its own 404.</remarks>
public sealed record GetProjectQuery(Guid ProjectId) : IRequest<Project>;

/// <summary>Lists the calling tenant's projects.</summary>
public sealed record ListProjectsQuery : IRequest<IReadOnlyList<ProjectSummary>>;

/// <summary>The two project read paths.</summary>
public sealed class ProjectQueryHandlers(
    Repositories.IProjectRepository repository,
    IProjectDirectory directory) :
    IRequestHandler<GetProjectQuery, Project>,
    IRequestHandler<ListProjectsQuery, IReadOnlyList<ProjectSummary>>
{
    /// <inheritdoc />
    public async Task<Project> Handle(GetProjectQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        return await repository.GetByIdAsync(query.ProjectId, cancellationToken).ConfigureAwait(false)
            ?? throw new ProjectNotFoundException(query.ProjectId);
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<ProjectSummary>> Handle(
        ListProjectsQuery query, CancellationToken cancellationToken) =>
        directory.ListAsync(cancellationToken);
}
