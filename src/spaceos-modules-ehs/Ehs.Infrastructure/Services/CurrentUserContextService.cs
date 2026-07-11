// Ehs.Infrastructure/Services/CurrentUserContextService.cs

using Ehs.Application.Common;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace Ehs.Infrastructure.Services;

/// <summary>
/// HttpContext-based implementation of ICurrentUserContext.
/// </summary>
public sealed class CurrentUserContextService : ICurrentUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserContextService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid TenantId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user is null || !user.Identity!.IsAuthenticated)
                throw new UnauthorizedAccessException("User is not authenticated.");

            var tenantIdClaim = user.FindFirstValue("tenantId") ?? user.FindFirstValue("tenant_id");
            if (string.IsNullOrWhiteSpace(tenantIdClaim))
                throw new UnauthorizedAccessException("TenantId claim not found.");

            return Guid.Parse(tenantIdClaim);
        }
    }

    public Guid UserId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user is null || !user.Identity!.IsAuthenticated)
                throw new UnauthorizedAccessException("User is not authenticated.");

            var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
            if (string.IsNullOrWhiteSpace(userIdClaim))
                throw new UnauthorizedAccessException("UserId claim not found.");

            return Guid.Parse(userIdClaim);
        }
    }

    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
}
