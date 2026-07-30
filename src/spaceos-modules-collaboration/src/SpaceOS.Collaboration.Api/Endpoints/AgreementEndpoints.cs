using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Collaboration.Application.Agreements;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Contracts;

namespace SpaceOS.Collaboration.Api.Endpoints;

/// <summary>
/// The agreement lifecycle over HTTP (B2B-10 F3/2).
/// </summary>
/// <remarks>
/// <para>
/// Every handler here does the same three things: take the actor FROM THE TOKEN, hand the command
/// to MediatR, and report the new status. No endpoint reads a tenant or a user from the payload —
/// the request records have no such field (see <see cref="AcceptAgreementRequest"/>).
/// </para>
/// <para>
/// Transitions are <c>POST</c>s on a named action rather than a <c>PATCH</c> of a status field. A
/// status one can write is a status a client can invent: "accept" and "reject" are different
/// events with different evidence requirements, and flattening them into one writable field would
/// put the FSM on the client's side of the wire.
/// </para>
/// </remarks>
public static class AgreementEndpoints
{
    /// <summary>Maps the agreement routes onto an already-gated group.</summary>
    public static RouteGroupBuilder MapAgreementEndpoints(this RouteGroupBuilder group)
    {
        ArgumentNullException.ThrowIfNull(group);

        var agreements = group.MapGroup("/agreements").WithTags("Collaboration agreements");

        agreements.MapPost("/{agreementId:guid}/propose", async (
            Guid agreementId, ICollaborationCallerContext callers, IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var status = await mediator.Send(
                new ProposeAgreementCommand(agreementId, caller.TenantId, caller.UserId), cancellationToken);

            return Results.Ok(new AgreementStatusResponse(agreementId, status.ToString()));
        })
        .WithName("ProposeAgreement");

        agreements.MapPost("/{agreementId:guid}/accept", async (
            Guid agreementId, AcceptAgreementRequest request, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var status = await mediator.Send(
                new AcceptAgreementCommand(
                    agreementId, caller.TenantId, caller.UserId,
                    request.TermsRevisionId, request.AcceptanceEvidence),
                cancellationToken);

            return Results.Ok(new AgreementStatusResponse(agreementId, status.ToString()));
        })
        .WithName("AcceptAgreement");

        agreements.MapPost("/{agreementId:guid}/reject", async (
            Guid agreementId, RejectAgreementRequest request, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var status = await mediator.Send(
                new RejectAgreementCommand(agreementId, caller.TenantId, caller.UserId, request.Reason),
                cancellationToken);

            return Results.Ok(new AgreementStatusResponse(agreementId, status.ToString()));
        })
        .WithName("RejectAgreement");

        agreements.MapPost("/{agreementId:guid}/cancel", async (
            Guid agreementId, CancelAgreementRequest request, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var status = await mediator.Send(
                new CancelAgreementCommand(agreementId, caller.TenantId, caller.UserId, request.Reason),
                cancellationToken);

            return Results.Ok(new AgreementStatusResponse(agreementId, status.ToString()));
        })
        .WithName("CancelAgreement");

        agreements.MapPost("/{agreementId:guid}/supersede", async (
            Guid agreementId, SupersedeAgreementRequest request, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var status = await mediator.Send(
                new SupersedeAgreementCommand(
                    agreementId, caller.TenantId, caller.UserId, request.SupersedingTermsRevisionId),
                cancellationToken);

            return Results.Ok(new AgreementStatusResponse(agreementId, status.ToString()));
        })
        .WithName("SupersedeAgreement");

        return group;
    }
}
