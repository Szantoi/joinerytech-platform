using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace SpaceOS.Modules.Hosting.Tenancy;

/// <summary>
/// Resolves the caller's tenant once per request — from the JWT, with optional
/// allowlist-validated header selection — and publishes it under
/// <see cref="TenancyDefaults.HttpContextItemKey"/> for <see cref="ClaimsTenantContext"/>
/// and the RLS session interceptor (ADR-061 T1).
/// </summary>
/// <remarks>
/// <para>Behaviour matrix:</para>
/// <list type="bullet">
/// <item><description>Unauthenticated request → pass-through (authorization gates handle 401).</description></item>
/// <item><description>Authenticated, token has tenant, no/matching header → tenant published, pass-through.</description></item>
/// <item><description>Authenticated, header not in the token's tenant set → <b>403</b> ProblemDetails (forgery rejected).</description></item>
/// <item><description>Authenticated, token carries no tenant claim → <b>403</b> ProblemDetails (fail-loud, never a fallback tenant).</description></item>
/// </list>
/// <para>Must be registered after <c>UseAuthentication()</c>.</para>
/// </remarks>
public sealed class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;

    /// <summary>Creates the middleware.</summary>
    /// <param name="next">The next request delegate.</param>
    /// <param name="logger">Logger for rejection diagnostics.</param>
    public TenantResolutionMiddleware(RequestDelegate next, ILogger<TenantResolutionMiddleware> logger)
    {
        ArgumentNullException.ThrowIfNull(next);
        ArgumentNullException.ThrowIfNull(logger);
        _next = next;
        _logger = logger;
    }

    /// <summary>Processes the request.</summary>
    /// <param name="context">The HTTP context.</param>
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        var header = FirstHeader(context, TenancyDefaults.TenantHeader)
                     ?? FirstHeader(context, TenancyDefaults.ActiveTenantHeader);

        var result = TenantResolver.Resolve(context.User, header, _logger);
        var subject = context.User.FindFirst("sub")?.Value
                      ?? context.User.Identity?.Name;

        switch (result.Status)
        {
            case TenantResolutionStatus.Resolved:
                context.Items[TenancyDefaults.HttpContextItemKey] = result.TenantId;
                _logger.LogDebug("Tenant {TenantId} resolved for subject {Sub}.", result.TenantId, subject);
                await _next(context).ConfigureAwait(false);
                return;

            case TenantResolutionStatus.HeaderNotInTokenTenants:
                _logger.LogWarning(
                    "Rejected tenant selection header {HeaderValue}: not in the token tenant set of subject {Sub}.",
                    result.RejectedHeaderValue, subject);
                await WriteForbiddenAsync(context,
                    "The requested tenant is not in the caller's authorized tenant list.")
                    .ConfigureAwait(false);
                return;

            case TenantResolutionStatus.NoTenantClaim:
            default:
                _logger.LogWarning(
                    "Authenticated subject {Sub} carries no tenant identity (tid/spaceos_tenants/tenant_id claim missing).",
                    subject);
                await WriteForbiddenAsync(context,
                    "The access token carries no tenant identity.")
                    .ConfigureAwait(false);
                return;
        }
    }

    private static string? FirstHeader(HttpContext context, string name)
        => context.Request.Headers.TryGetValue(name, out StringValues values)
            ? values.FirstOrDefault(static v => !string.IsNullOrWhiteSpace(v))
            : null;

    /// <summary>Writes the kernel-shaped 403 ProblemDetails response.</summary>
    private static Task WriteForbiddenAsync(HttpContext context, string detail)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        var problem = new
        {
            type = "https://tools.ietf.org/html/rfc7231#section-6.5.3",
            title = "Forbidden",
            status = 403,
            detail,
        };
        // Explicit content type: WriteAsJsonAsync would otherwise stamp application/json.
        return context.Response.WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json");
    }
}
