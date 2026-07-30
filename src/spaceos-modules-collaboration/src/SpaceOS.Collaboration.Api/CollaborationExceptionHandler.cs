using System.Diagnostics;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.Concurrency;

namespace SpaceOS.Collaboration.Api;

/// <summary>
/// Turns the module's failures into RFC 7807 responses with a correlation id (B2B-10 F3/2).
/// </summary>
/// <remarks>
/// <para>
/// The Doorstar platform security contract asks for a stable error shape plus a correlation id;
/// the same mapping is what keeps the authorization decisions honest on the wire — a
/// <c>404</c> for a tenant that is not a party and a <c>403</c> for one that is but lacks a grant.
/// </para>
/// <para>
/// <b>The response never carries the reason for a denial.</b> Whether the grant was missing,
/// revoked or expired goes to the log with the tenant and the agreement; telling the caller would
/// hand an outsider a map of somebody else's permissions. The correlation id is what connects the
/// two, so support can answer "why was I refused" without the API answering it to everyone.
/// </para>
/// </remarks>
public sealed class CollaborationExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<CollaborationExceptionHandler> logger) : IExceptionHandler
{
    /// <summary>Header carrying the id that ties a response to its log entries.</summary>
    public const string CorrelationIdHeader = "X-Correlation-Id";

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (status, title, detail) = Map(exception);

        if (status is null)
        {
            // Not ours: let the pipeline's default handling produce a 500 rather than dressing up
            // an unknown failure as a business answer.
            return false;
        }

        var correlationId = Activity.Current?.Id ?? httpContext.TraceIdentifier;

        logger.LogWarning(
            exception,
            "Collaboration request {Method} {Path} refused with {Status} ({CorrelationId}).",
            httpContext.Request.Method,
            httpContext.Request.Path,
            status,
            correlationId);

        httpContext.Response.StatusCode = status.Value;
        httpContext.Response.Headers[CorrelationIdHeader] = correlationId;

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails =
            {
                Status = status,
                Title = title,
                Detail = detail,
                Type = $"https://httpstatuses.io/{status}",
                Extensions = { ["correlationId"] = correlationId }
            }
        });
    }

    private static (int? Status, string Title, string? Detail) Map(Exception exception) => exception switch
    {
        // Authenticated-but-unusable identity is a 401: the caller has to come back with a token
        // that carries a tenant and a user, not with different permissions.
        CollaborationCallerUnresolvedException =>
            (StatusCodes.Status401Unauthorized, "Unauthenticated", "The request carries no usable collaboration identity."),

        // Deliberately indistinguishable from a plain denial on the wire.
        CollaborationActorMismatchException =>
            (StatusCodes.Status403Forbidden, "Forbidden", "The request is not permitted."),

        CollaborationAccessDeniedException =>
            (StatusCodes.Status403Forbidden, "Forbidden", "The request is not permitted."),

        // Absent and not-a-party answer identically — see the guard.
        CollaborationResourceNotFoundException =>
            (StatusCodes.Status404NotFound, "Not found", "The resource was not found."),

        // The caller was working from a stale copy. Telling it the current version is safe — it is
        // a party — and saves it a round trip it would otherwise guess at.
        CollaborationPreconditionFailedException precondition =>
            (StatusCodes.Status412PreconditionFailed, "Precondition failed",
                $"The resource is at version {precondition.Actual}; the request expected {precondition.Expected}."),

        CollaborationPreconditionRequiredException required =>
            (StatusCodes.Status428PreconditionRequired, "Precondition required", required.Message),

        // Lost the race after being current: distinct from 412 on purpose (see the exception).
        CollaborationConcurrencyConflictException =>
            (StatusCodes.Status409Conflict, "Conflict",
                "The resource was modified by another writer; read it again and retry."),

        ValidationException validation =>
            (StatusCodes.Status400BadRequest, "Invalid request", FirstValidationMessage(validation)),

        ArgumentException argument =>
            (StatusCodes.Status400BadRequest, "Invalid request", argument.Message),

        // The aggregate refused the transition: legitimate caller, wrong moment. The message is
        // the domain's own ("Cannot Accept an agreement in Draft; it must be Proposed") and is
        // safe here — only a party ever gets this far.
        InvalidOperationException domain =>
            (StatusCodes.Status409Conflict, "Conflict", domain.Message),

        _ => (null, string.Empty, null)
    };

    private static string FirstValidationMessage(ValidationException validation)
        => validation.Errors.FirstOrDefault()?.ErrorMessage ?? "The request failed validation.";
}
