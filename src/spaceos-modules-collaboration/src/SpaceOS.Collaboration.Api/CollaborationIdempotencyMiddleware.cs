using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SpaceOS.Collaboration.Application.Idempotency;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Collaboration.Api;

/// <summary>
/// Makes a keyed write safe to retry (B2B-10 F3/3).
/// </summary>
/// <remarks>
/// <para>
/// This is middleware rather than an endpoint filter for one concrete reason: the request body has
/// to be readable to fingerprint it, and by the time a minimal-API filter runs the body has
/// already been consumed by model binding. Buffering has to be turned on before that, which only
/// something upstream of routing can do.
/// </para>
/// <para>
/// <b>The fingerprint includes the body.</b> Method and path alone would let "same key, same
/// endpoint, different payload" replay the first answer — a guest that submitted deliverable A and
/// then, by mistake, sent deliverable B under the same key would be told B succeeded while nothing
/// recorded it. With the body in the fingerprint that is a <c>422</c> instead.
/// </para>
/// <para>
/// Only successful answers are recorded. A refusal usually names something the client can fix, and
/// holding the key would reject the corrected retry as a duplicate of a call that never took effect.
/// </para>
/// </remarks>
public sealed class CollaborationIdempotencyMiddleware(
    RequestDelegate next,
    ILogger<CollaborationIdempotencyMiddleware> logger)
{
    /// <summary>The header a client sends to make its write retry-safe.</summary>
    public const string KeyHeader = "Idempotency-Key";

    /// <summary>Marks a response that was recorded earlier rather than produced now.</summary>
    public const string ReplayHeader = "Idempotency-Replayed";

    /// <summary>Longest key accepted; the column is bounded and so is this.</summary>
    public const int MaxKeyLength = 200;

    /// <summary>
    /// Demands the header on an endpoint whose blind retry would act twice (B2B-10 F5/1).
    /// </summary>
    /// <remarks>
    /// The middleware itself is opt-in — it protects whoever sends a key. A create is the one
    /// write where opting out is not a smaller guarantee but none: a transition retried blind is
    /// refused by its <c>If-Match</c>, a create retried blind makes a second package. The demand
    /// sits on the endpoint (not here) so the middleware keeps one job; this helper keeps the
    /// header's name and the refusal in the file that owns them.
    /// </remarks>
    /// <exception cref="CollaborationIdempotencyKeyRequiredException">The header is absent.</exception>
    public static void RequireKey(HttpRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.Headers[KeyHeader]))
        {
            throw new CollaborationIdempotencyKeyRequiredException();
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
           && context.Request.Path.StartsWithSegments(CollaborationApiExtensions.RouteBase)
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
/// <remarks>
/// The create-side sibling of <see cref="CollaborationPreconditionRequiredException"/>: 428 is
/// reserved for conditional-request headers (RFC 6585), and there is no tag to go read — the
/// client only has to mint a key, which the message says.
/// </remarks>
public sealed class CollaborationIdempotencyKeyRequiredException()
    : Exception("This endpoint requires an Idempotency-Key header, so that a retry cannot create twice.");

/// <summary>Pipeline registration for <see cref="CollaborationIdempotencyMiddleware"/>.</summary>
public static class CollaborationIdempotencyMiddlewareExtensions
{
    /// <summary>
    /// Adds retry-safety for keyed writes. Must be registered AFTER the tenancy middleware: keys
    /// are scoped per tenant, and a key claimed without one would be claimed for everybody.
    /// </summary>
    public static IApplicationBuilder UseCollaborationIdempotency(this IApplicationBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);
        return app.UseMiddleware<CollaborationIdempotencyMiddleware>();
    }
}
