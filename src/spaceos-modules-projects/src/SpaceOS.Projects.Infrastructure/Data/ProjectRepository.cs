using Microsoft.EntityFrameworkCore;
using SpaceOS.Projects.Application.Repositories;
using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Infrastructure.Data;

/// <summary>EF-backed <see cref="IProjectRepository"/>.</summary>
/// <remarks>
/// Every query here runs under the context's tenant query filter AND the database's RLS policy.
/// Nothing in this class calls <c>IgnoreQueryFilters</c>: the only code that legitimately does is
/// the RLS proof suite, which needs the filter out of the way to prove the database holds the line
/// on its own.
/// </remarks>
public sealed class ProjectRepository(ProjectsDbContext dbContext) : IProjectRepository
{
    /// <inheritdoc />
    public Task<Project?> GetByIdAsync(Guid projectId, CancellationToken cancellationToken = default) =>
        dbContext.Projects
            .Include(project => project.Epics)
            .SingleOrDefaultAsync(project => project.Id == projectId, cancellationToken);

    /// <inheritdoc />
    public Task<Project?> GetByCodeAsync(ProjectCode code, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(code);

        // Compared on the converted string: the value converter makes this a plain column
        // comparison, and the code is already normalised by ProjectCode.Create.
        return dbContext.Projects
            .Include(project => project.Epics)
            .SingleOrDefaultAsync(project => project.Code == code, cancellationToken);
    }

    /// <inheritdoc />
    public Task<bool> CodeExistsAsync(ProjectCode code, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(code);

        return dbContext.Projects.AnyAsync(project => project.Code == code, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<Guid?> FindOwningProjectIdAsync(
        Guid epicId, CancellationToken cancellationToken = default)
    {
        // Queried through the assignment set (which carries its own tenant filter) rather than by
        // walking every project's collection: the (TenantId, EpicId) index answers this directly.
        var owner = await dbContext.Set<ProjectEpicAssignment>()
            .Where(assignment => assignment.EpicId == epicId)
            .Select(assignment => (Guid?)assignment.ProjectId)
            .SingleOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        return owner;
    }

    /// <inheritdoc />
    public void Add(Project project)
    {
        ArgumentNullException.ThrowIfNull(project);
        dbContext.Projects.Add(project);
    }

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
