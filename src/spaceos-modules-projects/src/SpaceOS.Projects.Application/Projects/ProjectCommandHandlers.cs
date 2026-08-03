using MediatR;
using SpaceOS.Projects.Application.Repositories;
using SpaceOS.Projects.Application.Tenancy;
using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Application.Projects;

/// <summary>
/// The five project commands. Each one loads, asks the domain to change something, and saves —
/// the rules stay in the aggregate.
/// </summary>
/// <remarks>
/// One class for all five rather than five files: they share the load-check-save spine, and
/// splitting them would spread that spine across five places where it could quietly diverge.
/// </remarks>
public sealed class ProjectCommandHandlers(
    IProjectRepository repository,
    ICurrentTenant currentTenant,
    IProjectCodeAllocator codeAllocator,
    TimeProvider timeProvider) :
    IRequestHandler<CreateProjectCommand, ProjectMutationResult>,
    IRequestHandler<RenameProjectCommand, ProjectMutationResult>,
    IRequestHandler<ChangeProjectStatusCommand, ProjectMutationResult>,
    IRequestHandler<AssignEpicCommand, ProjectMutationResult>,
    IRequestHandler<ReleaseEpicCommand, ProjectMutationResult>
{
    /// <inheritdoc />
    public async Task<ProjectMutationResult> Handle(
        CreateProjectCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        var code = await codeAllocator.AllocateAsync(cancellationToken).ConfigureAwait(false);

        var project = Project.Create(
            currentTenant.TenantId,
            code,
            command.Name,
            timeProvider.GetUtcNow(),
            command.CustomerId,
            command.Origin);

        repository.Add(project);
        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new ProjectMutationResult(project.Id, project.RowVersion);
    }

    /// <inheritdoc />
    public Task<ProjectMutationResult> Handle(
        RenameProjectCommand command, CancellationToken cancellationToken) =>
        MutateAsync(command, command.ProjectId, project => project.Rename(command.Name), cancellationToken);

    /// <inheritdoc />
    public Task<ProjectMutationResult> Handle(
        ChangeProjectStatusCommand command, CancellationToken cancellationToken) =>
        MutateAsync(command, command.ProjectId, project => project.MoveTo(command.Status), cancellationToken);

    /// <inheritdoc />
    public async Task<ProjectMutationResult> Handle(
        AssignEpicCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        // The cross-aggregate fact is fetched here; the RULE that judges it stays in the domain.
        // Fetched BEFORE the load so a project cannot be mutated on the strength of a check that
        // has not run yet.
        var currentOwner = await repository
            .FindOwningProjectIdAsync(command.EpicId, cancellationToken)
            .ConfigureAwait(false);

        return await MutateAsync(
            command,
            command.ProjectId,
            project =>
            {
                // A re-assignment to the SAME project is not a conflict with another project; let
                // the aggregate's own "already part of this project" rule answer that one, so the
                // caller gets the accurate message rather than "belongs to <itself>".
                if (currentOwner != command.ProjectId)
                    Project.EnsureEpicUnassigned(currentOwner, command.EpicId);

                project.AssignEpic(command.EpicId, timeProvider.GetUtcNow());
            },
            cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public Task<ProjectMutationResult> Handle(
        ReleaseEpicCommand command, CancellationToken cancellationToken) =>
        MutateAsync(command, command.ProjectId, project => project.ReleaseEpic(command.EpicId), cancellationToken);

    /// <summary>
    /// The shared spine: load (or 404), check the precondition, mutate, save.
    /// </summary>
    /// <exception cref="ProjectNotFoundException">Not visible to the calling tenant.</exception>
    /// <exception cref="ProjectPreconditionFailedException">Stale <c>If-Match</c>.</exception>
    private async Task<ProjectMutationResult> MutateAsync(
        IConditionalProjectCommand command,
        Guid projectId,
        Action<Project> mutate,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        var project = await repository.GetByIdAsync(projectId, cancellationToken).ConfigureAwait(false)
            ?? throw new ProjectNotFoundException(projectId);

        // The precondition is checked AFTER the project is known to be visible, so a wrong
        // version can never reveal that an invisible project exists (B2B-10 F3/3a's ordering
        // lesson: the version must not become an oracle).
        if (command.ExpectedRowVersion is { } expected && expected != project.RowVersion)
            throw new ProjectPreconditionFailedException(projectId, expected, project.RowVersion);

        mutate(project);
        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new ProjectMutationResult(project.Id, project.RowVersion);
    }
}
