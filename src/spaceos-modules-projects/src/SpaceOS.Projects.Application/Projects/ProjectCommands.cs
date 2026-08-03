using MediatR;
using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Application.Projects;

/// <summary>
/// What a project mutation reports back: the aggregate and its new concurrency token.
/// </summary>
/// <param name="ProjectId">The project that moved.</param>
/// <param name="RowVersion">The version to send as the next <c>If-Match</c> (PROJ-06).</param>
public sealed record ProjectMutationResult(Guid ProjectId, int RowVersion);

/// <summary>A command that may carry an <c>If-Match</c> precondition.</summary>
/// <remarks>
/// The header parsing is the API's job (PROJ-06); what belongs here is the <i>check</i>, so that a
/// caller which never goes through HTTP cannot skip it. <c>null</c> means "no precondition given"
/// and is allowed — refusing every unconditional write is an API-level policy decision, not one
/// this layer should make on its behalf.
/// </remarks>
public interface IConditionalProjectCommand
{
    /// <summary>The row version the caller believes is current, or <c>null</c>.</summary>
    int? ExpectedRowVersion { get; }
}

/// <summary>
/// Opens a new project for the calling tenant.
/// </summary>
/// <remarks>
/// <para>
/// <b>No code parameter, deliberately.</b> Gábor's §7.2 decision (2026-08-03) made two independent
/// birth paths legal — CRM and standalone — and two callers minting their own codes is how the
/// portal and Kontrolling ended up with two different formats for one concept. The code is
/// therefore allocated on this side, by <see cref="IProjectCodeAllocator"/>.
/// </para>
/// <para>
/// <b>No tenant parameter, deliberately.</b> The tenant is ambient (<see cref="ICurrentTenant"/>);
/// a command that carried it would let a caller name someone else's.
/// </para>
/// </remarks>
/// <param name="Name">What people call this job.</param>
/// <param name="CustomerId">The CRM customer, if known yet.</param>
/// <param name="Origin">Where it was born, or <c>null</c> for a standalone project (§7.2).</param>
public sealed record CreateProjectCommand(
    string Name,
    Guid? CustomerId = null,
    ProjectOrigin? Origin = null) : IRequest<ProjectMutationResult>;

/// <summary>Renames a project.</summary>
public sealed record RenameProjectCommand(
    Guid ProjectId, string Name, int? ExpectedRowVersion = null)
    : IRequest<ProjectMutationResult>, IConditionalProjectCommand;

/// <summary>Moves the lifecycle label.</summary>
public sealed record ChangeProjectStatusCommand(
    Guid ProjectId, ProjectLifecycleStatus Status, int? ExpectedRowVersion = null)
    : IRequest<ProjectMutationResult>, IConditionalProjectCommand;

/// <summary>Ties a Kernel flow-epic to a project.</summary>
/// <remarks>
/// Whether the epic EXISTS is not checked here. That answer lives in the Kernel, and reaching it
/// needs the on-behalf-of HTTP adapter the collaboration module already proved out (B2B-10 F5/2) —
/// which belongs to the API host (PROJ-06), because only a request scope can carry the caller's
/// token. What this layer guards is the invariant it can actually see: an epic already claimed by
/// another project of this tenant.
/// </remarks>
public sealed record AssignEpicCommand(
    Guid ProjectId, Guid EpicId, int? ExpectedRowVersion = null)
    : IRequest<ProjectMutationResult>, IConditionalProjectCommand;

/// <summary>Detaches a flow-epic from a project.</summary>
public sealed record ReleaseEpicCommand(
    Guid ProjectId, Guid EpicId, int? ExpectedRowVersion = null)
    : IRequest<ProjectMutationResult>, IConditionalProjectCommand;
