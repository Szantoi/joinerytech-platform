using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.WorkPackages;
using SpaceOS.Collaboration.Contracts;

namespace SpaceOS.Collaboration.Api.Endpoints;

/// <summary>
/// The delegated work-package lifecycle over HTTP (B2B-10 F3/2).
/// </summary>
/// <remarks>
/// Everything here is grant-gated behind the scenes: reading needs
/// <c>collaboration.workpackage.read</c>, moving needs <c>collaboration.workpackage.execute</c>,
/// and the host needs neither on its own agreement. The endpoints do not repeat that rule — they
/// could only get it subtly different.
/// </remarks>
public static class WorkPackageEndpoints
{
    /// <summary>Maps the work-package routes onto an already-gated group.</summary>
    public static RouteGroupBuilder MapWorkPackageEndpoints(this RouteGroupBuilder group)
    {
        ArgumentNullException.ThrowIfNull(group);

        var packages = group.MapGroup("/work-packages").WithTags("Collaboration work packages");

        packages.MapGet("/{workPackageId:guid}", async (
            Guid workPackageId, ICollaborationCallerContext callers, IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var view = await mediator.Send(
                new GetWorkPackageQuery(workPackageId, caller.TenantId, caller.UserId), cancellationToken);

            return Results.Ok(view);
        })
        .WithName("GetWorkPackage");

        packages.MapPost("/{workPackageId:guid}/offer", (
            Guid workPackageId, ICollaborationCallerContext callers, IMediator mediator, CancellationToken cancellationToken) =>
            Send(mediator, callers, cancellationToken, (id, caller) => new OfferWorkPackageCommand(id, caller.TenantId, caller.UserId), workPackageId))
            .WithName("OfferWorkPackage");

        packages.MapPost("/{workPackageId:guid}/accept", (
            Guid workPackageId, ICollaborationCallerContext callers, IMediator mediator, CancellationToken cancellationToken) =>
            Send(mediator, callers, cancellationToken, (id, caller) => new AcceptWorkPackageCommand(id, caller.TenantId, caller.UserId), workPackageId))
            .WithName("AcceptWorkPackage");

        packages.MapPost("/{workPackageId:guid}/start", (
            Guid workPackageId, ICollaborationCallerContext callers, IMediator mediator, CancellationToken cancellationToken) =>
            Send(mediator, callers, cancellationToken, (id, caller) => new StartWorkPackageProgressCommand(id, caller.TenantId, caller.UserId), workPackageId))
            .WithName("StartWorkPackageProgress");

        packages.MapPost("/{workPackageId:guid}/reject", (
            Guid workPackageId, WorkPackageReasonRequest request, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
            Send(mediator, callers, cancellationToken, (id, caller) => new RejectWorkPackageCommand(id, caller.TenantId, caller.UserId, request.Reason), workPackageId))
            .WithName("RejectWorkPackage");

        packages.MapPost("/{workPackageId:guid}/submit", (
            Guid workPackageId, SubmitWorkPackageRequest request, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
            Send(mediator, callers, cancellationToken, (id, caller) => new SubmitWorkPackageCommand(id, caller.TenantId, caller.UserId, request.DeliverableRef), workPackageId))
            .WithName("SubmitWorkPackage");

        packages.MapPost("/{workPackageId:guid}/request-changes", (
            Guid workPackageId, WorkPackageReasonRequest request, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
            Send(mediator, callers, cancellationToken, (id, caller) => new RequestWorkPackageChangesCommand(id, caller.TenantId, caller.UserId, request.Reason), workPackageId))
            .WithName("RequestWorkPackageChanges");

        packages.MapPost("/{workPackageId:guid}/complete", (
            Guid workPackageId, CompleteWorkPackageRequest request, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
            Send(mediator, callers, cancellationToken, (id, caller) => new CompleteWorkPackageCommand(id, caller.TenantId, caller.UserId, request.CompletionProofRef), workPackageId))
            .WithName("CompleteWorkPackage");

        packages.MapPost("/{workPackageId:guid}/cancel", (
            Guid workPackageId, WorkPackageReasonRequest request, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
            Send(mediator, callers, cancellationToken, (id, caller) => new CancelWorkPackageCommand(id, caller.TenantId, caller.UserId, request.Reason), workPackageId))
            .WithName("CancelWorkPackage");

        return group;
    }

    /// <summary>
    /// One place where the actor is attached to a command, so no endpoint can forget to.
    /// </summary>
    private static async Task<IResult> Send(
        IMediator mediator,
        ICollaborationCallerContext callers,
        CancellationToken cancellationToken,
        Func<Guid, CollaborationCaller, IWorkPackageCommand> build,
        Guid workPackageId)
    {
        var caller = callers.Current;
        var view = await mediator.Send(build(workPackageId, caller), cancellationToken);

        return Results.Ok(view);
    }
}
