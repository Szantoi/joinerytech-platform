using Microsoft.AspNetCore.Http;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Collaboration.Api.Authorization;

/// <summary>
/// The authenticated caller, as resolved from the request (B2B-10 F3/2).
/// </summary>
/// <remarks>
/// <para>
/// Both halves come from the token and nowhere else: the tenant through the ADR-061
/// <see cref="ITenantContext"/> (the JWT's <c>tid</c>; an <c>X-Tenant-Id</c> header is only ever
/// honoured when it names a tenant the token itself lists), and the user through
/// <see cref="ClaimsPrincipalUserIdExtensions.GetRequiredUserId"/>. Neither reads the body.
/// </para>
/// <para>
/// That is the whole point of this class: the F1 commands carry an actor field, and this is the
/// only thing in the process entitled to fill it in.
/// </para>
/// </remarks>
public sealed class HttpCollaborationCallerContext(
    IHttpContextAccessor httpContextAccessor,
    ITenantContext tenantContext) : ICollaborationCallerContext
{
    /// <inheritdoc />
    public CollaborationCaller Current
    {
        get
        {
            var user = httpContextAccessor.HttpContext?.User
                ?? throw new CollaborationCallerUnresolvedException(
                    "There is no HTTP context; the collaboration caller can only be resolved inside a request.");

            if (user.Identity?.IsAuthenticated != true)
            {
                throw new CollaborationCallerUnresolvedException(
                    "The request is not authenticated, so no collaboration caller exists.");
            }

            if (!tenantContext.HasTenant)
            {
                // Fail-loud rather than falling back to an empty tenant: an authenticated request
                // whose tenant could not be resolved is a configuration fault, and treating it as
                // "tenant Guid.Empty" would make every such request look like the same tenant.
                throw new CollaborationCallerUnresolvedException(
                    "The request is authenticated but no tenant was resolved (ADR-061 tenancy middleware).");
            }

            try
            {
                return CollaborationCaller.Create(tenantContext.TenantId, user.GetRequiredUserId());
            }
            catch (Exception exception) when (exception is InvalidOperationException or ArgumentException)
            {
                // A token without a usable user id cannot back an audit trail, and every
                // transition here writes one.
                throw new CollaborationCallerUnresolvedException(
                    "The authenticated token carries no usable tenant/user pair for a collaboration audit record.");
            }
        }
    }
}
