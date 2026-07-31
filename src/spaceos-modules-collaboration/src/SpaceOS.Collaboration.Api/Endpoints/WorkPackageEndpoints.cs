using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.Projections;
using SpaceOS.Collaboration.Application.WorkPackages;
using SpaceOS.Collaboration.Contracts;

namespace SpaceOS.Collaboration.Api.Endpoints;

/// <summary>
/// The delegated work-package lifecycle over HTTP (B2B-10 F3/2, conditional since F3/3).
/// </summary>
/// <remarks>
/// <para>
/// Everything here is grant-gated behind the scenes: reading needs
/// <c>collaboration.workpackage.read</c>, moving needs <c>collaboration.workpackage.execute</c>,
/// and the host needs neither on its own agreement. The endpoints do not repeat that rule — they
/// could only get it subtly different.
/// </para>
/// <para>
/// <b>Every transition here demands <c>If-Match</c></b> (F3/3). These routes have a read endpoint
/// to get a tag from, so there is no excuse for a blind write — and a blind write is exactly how
/// two people end up answering the same offered package.
/// </para>
/// <para>
/// The create (F5/1) is the one write with no tag to match, so its retry-safety is a mandatory
/// <c>Idempotency-Key</c> instead — same rule ("no blind writes"), different instrument.
/// </para>
/// </remarks>
public static class WorkPackageEndpoints
{
    /// <summary>Maps the work-package routes onto an already-gated group.</summary>
    public static RouteGroupBuilder MapWorkPackageEndpoints(this RouteGroupBuilder group)
    {
        ArgumentNullException.ThrowIfNull(group);

        // Nested under the agreement on purpose: the agreement CARRIES the packages, and putting
        // it in the route is what lets the guard 404 a non-party before the payload means anything.
        group.MapPost("/agreements/{agreementId:guid}/work-packages", async (
            Guid agreementId, CreateWorkPackageRequest request, HttpContext http,
            ICollaborationCallerContext callers, IMediator mediator, CancellationToken cancellationToken) =>
        {
            // A transition retried blind is refused by its If-Match; a create retried blind makes
            // a SECOND package. The key is the create's only retry-safety, so it is not optional.
            CollaborationIdempotencyMiddleware.RequireKey(http.Request);

            // Binding leaves an omitted object null; without this the anchor's absence would
            // surface as a 500 instead of the 400 it is.
            if (request.WorkScope is null)
            {
                throw new ArgumentException(
                    "A new work package must carry its work scope (projectId, epicId).", nameof(request));
            }

            var caller = callers.Current;
            var view = await mediator.Send(
                new CreateWorkPackageCommand(
                    agreementId, caller.TenantId, caller.UserId,
                    request.Title, request.ScopeDescription ?? string.Empty, request.DueAtUtc,
                    request.WorkScope.ProjectId, request.WorkScope.EpicId, request.WorkScope.TaskId),
                cancellationToken);

            ConditionalRequests.SetETag(http.Response, view.RowVersion);

            return Results.CreatedAtRoute(
                "GetWorkPackage", new { workPackageId = view.WorkPackageId }, view);
        })
        .WithName("CreateWorkPackage")
        .WithTags("Collaboration work packages");

        var packages = group.MapGroup("/work-packages").WithTags("Collaboration work packages");

        packages.MapGet("/{workPackageId:guid}", async (
            Guid workPackageId, HttpContext http, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var view = await mediator.Send(
                new GetWorkPackageQuery(workPackageId, caller.TenantId, caller.UserId), cancellationToken);

            return Respond(http, view);
        })
        .WithName("GetWorkPackage");

        packages.MapPost("/{workPackageId:guid}/offer", (
            Guid workPackageId, HttpContext http, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
            SendAsync(http, callers, mediator, cancellationToken,
                (id, caller, version) => new OfferWorkPackageCommand(id, caller.TenantId, caller.UserId, version), workPackageId))
            .WithName("OfferWorkPackage");

        packages.MapPost("/{workPackageId:guid}/accept", (
            Guid workPackageId, HttpContext http, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
            SendAsync(http, callers, mediator, cancellationToken,
                (id, caller, version) => new AcceptWorkPackageCommand(id, caller.TenantId, caller.UserId, version), workPackageId))
            .WithName("AcceptWorkPackage");

        packages.MapPost("/{workPackageId:guid}/start", (
            Guid workPackageId, HttpContext http, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
            SendAsync(http, callers, mediator, cancellationToken,
                (id, caller, version) => new StartWorkPackageProgressCommand(id, caller.TenantId, caller.UserId, version), workPackageId))
            .WithName("StartWorkPackageProgress");

        packages.MapPost("/{workPackageId:guid}/reject", (
            Guid workPackageId, WorkPackageReasonRequest request, HttpContext http,
            ICollaborationCallerContext callers, IMediator mediator, CancellationToken cancellationToken) =>
            SendAsync(http, callers, mediator, cancellationToken,
                (id, caller, version) => new RejectWorkPackageCommand(id, caller.TenantId, caller.UserId, request.Reason, version), workPackageId))
            .WithName("RejectWorkPackage");

        packages.MapPost("/{workPackageId:guid}/submit", (
            Guid workPackageId, SubmitWorkPackageRequest request, HttpContext http,
            ICollaborationCallerContext callers, IMediator mediator, CancellationToken cancellationToken) =>
            SendAsync(http, callers, mediator, cancellationToken,
                (id, caller, version) => new SubmitWorkPackageCommand(id, caller.TenantId, caller.UserId, request.DeliverableRef, version), workPackageId))
            .WithName("SubmitWorkPackage");

        packages.MapPost("/{workPackageId:guid}/request-changes", (
            Guid workPackageId, WorkPackageReasonRequest request, HttpContext http,
            ICollaborationCallerContext callers, IMediator mediator, CancellationToken cancellationToken) =>
            SendAsync(http, callers, mediator, cancellationToken,
                (id, caller, version) => new RequestWorkPackageChangesCommand(id, caller.TenantId, caller.UserId, request.Reason, version), workPackageId))
            .WithName("RequestWorkPackageChanges");

        packages.MapPost("/{workPackageId:guid}/complete", (
            Guid workPackageId, CompleteWorkPackageRequest request, HttpContext http,
            ICollaborationCallerContext callers, IMediator mediator, CancellationToken cancellationToken) =>
            SendAsync(http, callers, mediator, cancellationToken,
                (id, caller, version) => new CompleteWorkPackageCommand(id, caller.TenantId, caller.UserId, request.CompletionProofRef, version), workPackageId))
            .WithName("CompleteWorkPackage");

        packages.MapPost("/{workPackageId:guid}/cancel", (
            Guid workPackageId, WorkPackageReasonRequest request, HttpContext http,
            ICollaborationCallerContext callers, IMediator mediator, CancellationToken cancellationToken) =>
            SendAsync(http, callers, mediator, cancellationToken,
                (id, caller, version) => new CancelWorkPackageCommand(id, caller.TenantId, caller.UserId, request.Reason, version), workPackageId))
            .WithName("CancelWorkPackage");

        return group;
    }

    /// <summary>
    /// One place where the actor and the precondition are attached, so no endpoint can forget either.
    /// </summary>
    private static async Task<IResult> SendAsync(
        HttpContext http,
        ICollaborationCallerContext callers,
        IMediator mediator,
        CancellationToken cancellationToken,
        Func<Guid, CollaborationCaller, int?, IWorkPackageCommand> build,
        Guid workPackageId)
    {
        var caller = callers.Current;
        var expected = ConditionalRequests.ReadIfMatch(http.Request, required: true);
        var view = await mediator.Send(build(workPackageId, caller, expected), cancellationToken);

        return Respond(http, view);
    }

    /// <summary>Answers with the projection and the tag the caller needs for its next write.</summary>
    private static IResult Respond(HttpContext http, WorkPackageReadModel view)
    {
        ConditionalRequests.SetETag(http.Response, view.RowVersion);

        return Results.Ok(view);
    }
}
