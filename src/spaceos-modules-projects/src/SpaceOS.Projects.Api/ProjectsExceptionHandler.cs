using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SpaceOS.Projects.Api.Kernel;
using SpaceOS.Projects.Application.Projects;

namespace SpaceOS.Projects.Api;

/// <summary>
/// Turns the module's failures into RFC 7807 responses with a correlation id (PROJ-06).
/// </summary>
/// <remarks>
/// <para>
/// The map is closed over the exceptions this module knowingly throws. Anything else falls
/// through to the framework's plain 500 — an unknown failure must never be dressed up as a
/// business answer, and its message must never reach the wire (the S1 redaction class: a
/// provider's exception text can carry connection strings).
/// </para>
/// <para>
/// The correlation id goes out both as the <c>X-Correlation-Id</c> header and as a
/// <c>correlationId</c> extension member, so support can connect a caller's report to the log
/// without the API explaining its refusals to everyone.
/// </para>
/// </remarks>
public sealed class ProjectsExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<ProjectsExceptionHandler> logger) : IExceptionHandler
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
            // Not ours: the pipeline's default handling produces the 500, with no message of ours
            // or the provider's attached.
            return false;
        }

        var correlationId = Activity.Current?.Id ?? httpContext.TraceIdentifier;

        logger.LogWarning(
            exception,
            "Projects request {Method} {Path} refused with {Status} ({CorrelationId}).",
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
        // Absent and not-yours answer identically — the exception's own doc says why.
        ProjectNotFoundException =>
            (StatusCodes.Status404NotFound, "Not found", "The project was not found."),

        // The caller worked from a stale copy. Naming the current version is safe — the caller
        // can see the project — and saves a round trip it would otherwise guess at.
        ProjectPreconditionFailedException precondition =>
            (StatusCodes.Status412PreconditionFailed, "Precondition failed",
                $"The project is at version {precondition.ActualRowVersion}; the request expected {precondition.ExpectedRowVersion}."),

        ProjectsPreconditionRequiredException required =>
            (StatusCodes.Status428PreconditionRequired, "Precondition required", required.Message),

        // The create-side sibling of the 428: there is no tag to go read, only a key to mint.
        ProjectsIdempotencyKeyRequiredException keyRequired =>
            (StatusCodes.Status400BadRequest, "Idempotency-Key required", keyRequired.Message),

        // The assignment named an epic the Kernel does not know for this caller (F5/2). The
        // message is safe: the epic id is the caller's own input, and the fix is on their side.
        FlowEpicUnresolvedException unresolved =>
            (StatusCodes.Status422UnprocessableEntity, "Flow-epic does not resolve", unresolved.Message),

        // Trust between the services is misconfigured — nothing the caller can fix, and nothing
        // a retry will change.
        EpicResolutionRejectedException =>
            (StatusCodes.Status502BadGateway, "Upstream refused",
                "The Kernel refused this service's credentials; the operators have been signalled."),

        // The Kernel could not answer now: fail-closed assignment, honest retry advice.
        EpicResolutionUnavailableException =>
            (StatusCodes.Status503ServiceUnavailable, "Upstream unavailable",
                "The Kernel could not be reached to verify the flow-epic; try again later."),

        ArgumentException argument =>
            (StatusCodes.Status400BadRequest, "Invalid request", argument.Message),

        // The aggregate refused: legitimate caller, wrong moment. The message is the domain's own
        // ("Flow-epic X is already part of this project") and safe — it never carries
        // infrastructure detail, and the caller can see everything it names.
        InvalidOperationException domain =>
            (StatusCodes.Status409Conflict, "Conflict", domain.Message),

        _ => (null, string.Empty, null)
    };
}
