using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Collaboration.Application.Agreements;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Contracts;
using Microsoft.Net.Http.Headers;

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
/// <b>Since F3/4 every transition here demands <c>If-Match</c></b> as well. F3/3 had left it
/// optional for one reason only — there was no way to obtain a tag — and the read endpoint above
/// removes that excuse. The Doorstar contract is published in F4, so tightening now costs nobody
/// a migration.
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

        agreements.MapGet("/{agreementId:guid}", async (
            Guid agreementId, HttpContext http, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var view = await mediator.Send(
                new GetAgreementQuery(agreementId, caller.TenantId, caller.UserId), cancellationToken);

            ConditionalRequests.SetETag(http.Response, view.RowVersion);

            return Results.Ok(view);
        })
        .WithName("GetAgreement");

        agreements.MapPost("/{agreementId:guid}/propose", async (
            Guid agreementId, HttpContext http, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var expected = ConditionalRequests.ReadIfMatch(http.Request, required: true);
            var result = await mediator.Send(
                new ProposeAgreementCommand(agreementId, caller.TenantId, caller.UserId, expected), cancellationToken);

            return Respond(http, agreementId, result);
        })
        .WithName("ProposeAgreement");

        agreements.MapPost("/{agreementId:guid}/accept", async (
            Guid agreementId, AcceptAgreementRequest request, HttpContext http, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var expected = ConditionalRequests.ReadIfMatch(http.Request, required: true);
            var result = await mediator.Send(
                new AcceptAgreementCommand(
                    agreementId, caller.TenantId, caller.UserId,
                    request.TermsRevisionId, request.AcceptanceEvidence, expected),
                cancellationToken);

            return Respond(http, agreementId, result);
        })
        .WithName("AcceptAgreement");

        agreements.MapPost("/{agreementId:guid}/reject", async (
            Guid agreementId, RejectAgreementRequest request, HttpContext http, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var expected = ConditionalRequests.ReadIfMatch(http.Request, required: true);
            var result = await mediator.Send(
                new RejectAgreementCommand(agreementId, caller.TenantId, caller.UserId, request.Reason, expected),
                cancellationToken);

            return Respond(http, agreementId, result);
        })
        .WithName("RejectAgreement");

        agreements.MapPost("/{agreementId:guid}/cancel", async (
            Guid agreementId, CancelAgreementRequest request, HttpContext http, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var expected = ConditionalRequests.ReadIfMatch(http.Request, required: true);
            var result = await mediator.Send(
                new CancelAgreementCommand(agreementId, caller.TenantId, caller.UserId, request.Reason, expected),
                cancellationToken);

            return Respond(http, agreementId, result);
        })
        .WithName("CancelAgreement");

        agreements.MapPost("/{agreementId:guid}/supersede", async (
            Guid agreementId, SupersedeAgreementRequest request, HttpContext http, ICollaborationCallerContext callers,
            IMediator mediator, CancellationToken cancellationToken) =>
        {
            var caller = callers.Current;
            var expected = ConditionalRequests.ReadIfMatch(http.Request, required: true);
            var result = await mediator.Send(
                new SupersedeAgreementCommand(
                    agreementId, caller.TenantId, caller.UserId, request.SupersedingTermsRevisionId, expected),
                cancellationToken);

            return Respond(http, agreementId, result);
        })
        .WithName("SupersedeAgreement");

        return group;
    }

    /// <summary>
    /// One response shape for every transition: the new state, and the tag for the NEXT request.
    /// </summary>
    /// <remarks>
    /// Returning the fresh <c>ETag</c> is what makes a chain of calls possible while there is no
    /// agreement read endpoint (that arrives with the projection in F3/4). Without it the client
    /// would send the first transition blind and then have no way to learn where it ended up.
    /// </remarks>
    private static IResult Respond(HttpContext http, Guid agreementId, AgreementTransitionResult result)
    {
        ConditionalRequests.SetETag(http.Response, result.RowVersion);

        return Results.Ok(new AgreementStatusResponse(agreementId, result.Status.ToString(), result.RowVersion));
    }
}
