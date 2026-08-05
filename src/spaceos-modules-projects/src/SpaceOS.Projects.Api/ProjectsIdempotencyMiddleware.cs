using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Projects.Application.Idempotency;

namespace SpaceOS.Projects.Api;

/// <summary>
/// Makes a keyed write safe to retry (PROJ-06; the collaboration module's B2B-10 F3/3
/// middleware, unchanged in mechanics).
/// </summary>
/// <remarks>
/// <para>
/// Middleware rather than an endpoint filter because the body must be readable to fingerprint it,
/// and by the time a minimal-API filter runs the body has been consumed by model binding.
/// </para>
/// <para>
/// <b>The fingerprint includes the body</b> — same key, same endpoint, different payload is a
/// <c>422</c>, not a false replay. Only successful answers are recorded, so a client can fix and
/// retry a refused request under the same key.
/// </para>
/// </remarks>
public sealed class ProjectsIdempotencyMiddleware(
    RequestDelegate next,
    ILogger<ProjectsIdempotencyMiddleware> logger)
{
    /// <summary>The header a client sends to make its write retry-safe.</summary>
    public const string KeyHeader = "Idempotency-Key";

    /// <summary>Marks a response that was recorded earlier rather than produced now.</summary>
    public const string ReplayHeader = "Idempotency-Replayed";

    /// <summary>Longest key accepted; the column is bounded and so is this.</summary>
    public const int MaxKeyLength = 200;

    /// <summary>
    /// Demands the header on an endpoint whose blind retry would act twice.
    /// </summary>
    /// <remarks>
    /// The middleware itself is opt-in — it protects whoever sends a key. The create is the one
    /// write where opting out is not a smaller guarantee but none: a mutation retried blind is
    /// refused by its <c>If-Match</c>; a create retried blind mints a second project and burns a
    /// second code.
    /// </remarks>
    /// <exception cref="ProjectsIdempotencyKeyRequiredException">The header is absent.</exception>
    public static void RequireKey(HttpRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.Headers[KeyHeader]))
        {
            throw new ProjectsIdempotencyKeyRequiredException();
        }
    }

    public async Task InvokeAsync(HttpContext context, IIdempotencyStore store, ITenantContext tenants)
    {
        if (!IsCandidate(context) || !tenants.HasTenant)
        {
            await next(context);
            return;
        }

        var key = context.Request.Headers[KeyHeader].ToString().Trim();

        if (key.Length > MaxKeyLength)
        {
            await WriteProblemAsync(
                context, StatusCodes.Status400BadRequest,
                $"An {KeyHeader} may be at most {MaxKeyLength} characters.");
            return;
        }

        var tenantId = tenants.TenantId;
        var fingerprint = await FingerprintAsync(context);
        var claim = await store.ClaimAsync(tenantId, key, fingerprint, context.RequestAborted);

        switch (claim.Outcome)
        {
            case IdempotencyOutcome.Replay:
                logger.LogInformation(
                    "Replaying the recorded answer for idempotency key of tenant {TenantId}.", tenantId);
                await ReplayAsync(context, claim);
                return;

            case IdempotencyOutcome.InFlight:
                await WriteProblemAsync(
                    context, StatusCodes.Status409Conflict,
                    "A request with this Idempotency-Key is still being processed.");
                return;

            case IdempotencyOutcome.FingerprintMismatch:
                await WriteProblemAsync(
                    context, StatusCodes.Status422UnprocessableEntity,
                    "This Idempotency-Key was already used for a different request.");
                return;
        }

        await RunAndRecordAsync(context, store, tenantId, key);
    }

    private static bool IsCandidate(HttpContext context)
        => HttpMethods.IsPost(context.Request.Method)
           && context.Request.Path.StartsWithSegments(ProjectsApiExtensions.RouteBase)
           && !string.IsNullOrWhiteSpace(context.Request.Headers[KeyHeader]);

    /// <summary>Identifies the request: what was called, on what, with what.</summary>
    private static async Task<string> FingerprintAsync(HttpContext context)
    {
        context.Request.EnableBuffering();

        using var buffer = new MemoryStream();
        await context.Request.Body.CopyToAsync(buffer);
        context.Request.Body.Position = 0;

        var material = Encoding.UTF8.GetBytes(
            $"{context.Request.Method}\n{context.Request.Path}\n{context.Request.QueryString}\n");

        var hash = SHA256.HashData([.. material, .. buffer.ToArray()]);

        return Convert.ToHexString(hash);
    }

    private static async Task ReplayAsync(HttpContext context, IdempotencyClaim claim)
    {
        context.Response.StatusCode = claim.StatusCode ?? StatusCodes.Status200OK;
        context.Response.Headers[ReplayHeader] = "true";
        context.Response.ContentType = "application/json";

        if (!string.IsNullOrEmpty(claim.Body))
        {
            await context.Response.WriteAsync(claim.Body);
        }
    }

    private async Task RunAndRecordAsync(HttpContext context, IIdempotencyStore store, Guid tenantId, string key)
    {
        var original = context.Response.Body;
        using var captured = new MemoryStream();
        context.Response.Body = captured;

        try
        {
            await next(context);
        }
        catch
        {
            // The claim must not outlive a request that blew up, or the client could never retry.
            context.Response.Body = original;
            await store.AbandonAsync(tenantId, key, CancellationToken.None);
            throw;
        }

        context.Response.Body = original;
        captured.Position = 0;
        var body = await new StreamReader(captured).ReadToEndAsync();

        if (context.Response.StatusCode is >= 200 and < 300)
        {
            await store.CompleteAsync(tenantId, key, context.Response.StatusCode, body, CancellationToken.None);
        }
        else
        {
            await store.AbandonAsync(tenantId, key, CancellationToken.None);
        }

        await context.Response.WriteAsync(body);
    }

    private static async Task WriteProblemAsync(HttpContext context, int status, string detail)
    {
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(new
        {
            type = $"https://httpstatuses.io/{status}",
            title = status == StatusCodes.Status409Conflict ? "Conflict" : "Idempotency-Key rejected",
            status,
            detail
        });
    }
}

/// <summary>
/// The endpoint refuses to create without an <c>Idempotency-Key</c> — mapped to <c>400</c>.
/// </summary>
public sealed class ProjectsIdempotencyKeyRequiredException()
    : Exception("This endpoint requires an Idempotency-Key header, so that a retry cannot create twice.");

/// <summary>Pipeline registration for <see cref="ProjectsIdempotencyMiddleware"/>.</summary>
public static class ProjectsIdempotencyMiddlewareExtensions
{
    /// <summary>
    /// Adds retry-safety for keyed writes. Must be registered AFTER the tenancy middleware: keys
    /// are scoped per tenant, and a key claimed without one would be claimed for everybody.
    /// </summary>
    public static IApplicationBuilder UseProjectsIdempotency(this IApplicationBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);
        return app.UseMiddleware<ProjectsIdempotencyMiddleware>();
    }
}
