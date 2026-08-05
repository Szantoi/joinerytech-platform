using Microsoft.EntityFrameworkCore;
using SpaceOS.Projects.Application.Projects;

namespace SpaceOS.Projects.Infrastructure.Data;

/// <summary>EF-backed <see cref="IProjectDirectory"/> — the list projection.</summary>
/// <remarks>
/// <c>AsNoTracking</c> and a column projection: a list never mutates, so paying the change tracker
/// or loading the epic collections for every row would be cost without a reader. The tenant scope
/// comes from the context's query filter plus RLS, same as every other read.
/// </remarks>
public sealed class ProjectDirectory(ProjectsDbContext dbContext) : IProjectDirectory
{
    /// <inheritdoc />
    public async Task<IReadOnlyList<ProjectSummary>> ListAsync(
        CancellationToken cancellationToken = default) =>
        await dbContext.Projects
            .AsNoTracking()
            .OrderByDescending(project => project.CreatedAtUtc)
            .Select(project => new ProjectSummary(
                project.Id,
                project.Code.Value,
                project.Name,
                project.Status,
                project.CustomerId,
                project.CreatedAtUtc,
                project.RowVersion))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
}
