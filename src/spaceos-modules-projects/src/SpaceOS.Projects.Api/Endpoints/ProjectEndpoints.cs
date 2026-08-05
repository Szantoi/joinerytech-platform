using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Projects.Api.Kernel;
using SpaceOS.Projects.Api.Wire;
using SpaceOS.Projects.Application.Projects;
using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Api.Endpoints;

/// <summary>
/// The project resource (PROJ-06): create, read, rename, relabel, and the epic membership.
/// </summary>
/// <remarks>
/// <para>
/// Every mutation requires <c>If-Match</c> (the read endpoints hand out the tag) and answers with
/// the new tag; the create requires <c>Idempotency-Key</c> instead — its retry-safety cannot come
/// from a precondition, because there is nothing to match yet.
/// </para>
/// <para>
/// Failures leave through <see cref="ProjectsExceptionHandler"/> as RFC 7807 — no endpoint here
/// writes an error body of its own, so the mapping cannot fork per call site.
/// </para>
/// </remarks>
public static class ProjectEndpoints
{
    /// <summary>Maps the routes onto the (already authorized, module-gated) group.</summary>
    public static RouteGroupBuilder MapProjectEndpoints(this RouteGroupBuilder group)
    {
        ArgumentNullException.ThrowIfNull(group);

        var projects = group.MapGroup("/projects");

        projects.MapPost("", Create).WithName("CreateProject");
        projects.MapGet("", List).WithName("ListProjects");
        projects.MapGet("/{projectId:guid}", Get).WithName("GetProject");
        projects.MapPut("/{projectId:guid}/name", Rename).WithName("RenameProject");
        projects.MapPut("/{projectId:guid}/status", ChangeStatus).WithName("ChangeProjectStatus");
        projects.MapPost("/{projectId:guid}/epics", AssignEpic).WithName("AssignProjectEpic");
        projects.MapDelete("/{projectId:guid}/epics/{epicId:guid}", ReleaseEpic).WithName("ReleaseProjectEpic");

        return group;
    }

    /// <summary>
    /// Creates a project. The response is the full resource — the caller must learn the code the
    /// allocator minted for it (§7.3), which is the one thing it could not know beforehand.
    /// </summary>
    private static async Task<IResult> Create(
        CreateProjectRequest request, HttpContext http, IMediator mediator, CancellationToken ct)
    {
        ProjectsIdempotencyMiddleware.RequireKey(http.Request);

        var result = await mediator.Send(
            new CreateProjectCommand(
                request.Name,
                request.CustomerId,
                request.Origin is { } origin ? ProjectOrigin.Create(origin.System, origin.ExternalId) : null),
            ct);

        var project = await mediator.Send(new GetProjectQuery(result.ProjectId), ct);

        ConditionalRequests.SetETag(http.Response, result.RowVersion);

        return Results.Created(
            $"{ProjectsApiExtensions.RouteBase}/projects/{result.ProjectId}",
            ProjectResponse.From(project));
    }

    private static async Task<IResult> List(IMediator mediator, CancellationToken ct)
    {
        var summaries = await mediator.Send(new ListProjectsQuery(), ct);

        return Results.Ok(summaries.Select(ProjectSummaryResponse.From).ToList());
    }

    private static async Task<IResult> Get(
        Guid projectId, HttpContext http, IMediator mediator, CancellationToken ct)
    {
        var project = await mediator.Send(new GetProjectQuery(projectId), ct);

        ConditionalRequests.SetETag(http.Response, project.RowVersion);

        return Results.Ok(ProjectResponse.From(project));
    }

    private static Task<IResult> Rename(
        Guid projectId, RenameProjectRequest request, HttpContext http, IMediator mediator, CancellationToken ct)
        => SendAsync(
            http, mediator,
            expected => new RenameProjectCommand(projectId, request.Name, expected), ct);

    private static Task<IResult> ChangeStatus(
        Guid projectId, ChangeProjectStatusRequest request, HttpContext http, IMediator mediator, CancellationToken ct)
        => SendAsync(
            http, mediator,
            expected => new ChangeProjectStatusCommand(projectId, ProjectStatusWire.Parse(request.Status), expected), ct);

    /// <summary>
    /// Ties a Kernel flow-epic to the project — after the Kernel confirmed, on behalf of the
    /// caller, that the epic exists for them (F5/2). The resolution runs BEFORE the command, so
    /// nothing is mutated on the strength of a check that has not happened.
    /// </summary>
    private static async Task<IResult> AssignEpic(
        Guid projectId, AssignEpicRequest request, HttpContext http, IMediator mediator,
        IFlowEpicResolver kernelEpics, CancellationToken ct)
    {
        if (!await kernelEpics.FlowEpicExistsAsync(request.EpicId, ct))
        {
            throw new FlowEpicUnresolvedException(request.EpicId);
        }

        return await SendAsync(
            http, mediator,
            expected => new AssignEpicCommand(projectId, request.EpicId, expected), ct);
    }

    private static Task<IResult> ReleaseEpic(
        Guid projectId, Guid epicId, HttpContext http, IMediator mediator, CancellationToken ct)
        => SendAsync(
            http, mediator,
            expected => new ReleaseEpicCommand(projectId, epicId, expected), ct);

    /// <summary>
    /// The shared mutation spine: read the (required) precondition, send, answer with the new tag.
    /// </summary>
    private static async Task<IResult> SendAsync(
        HttpContext http,
        IMediator mediator,
        Func<int?, IRequest<ProjectMutationResult>> buildCommand,
        CancellationToken ct)
    {
        var expected = ConditionalRequests.ReadIfMatch(http.Request);

        var result = await mediator.Send(buildCommand(expected), ct);

        ConditionalRequests.SetETag(http.Response, result.RowVersion);

        return Results.Ok(new ProjectMutationResponse(result.ProjectId, result.RowVersion));
    }
}
