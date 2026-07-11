using Ehs.Application.Services;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace Ehs.Infrastructure.Services;

/// <summary>
/// Implementation of ICurrentUserService using ASP.NET Core HttpContext.
/// Extracts user identity from JWT claims for RLS policy enforcement.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
    }

    public Guid? GetOrganizationId()
    {
        var organizationIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("organization_id")?.Value
            ?? _httpContextAccessor.HttpContext?.User?.FindFirst("org_id")?.Value;

        if (string.IsNullOrEmpty(organizationIdClaim))
        {
            return null;
        }

        return Guid.TryParse(organizationIdClaim, out var orgId) ? orgId : null;
    }

    public string? GetUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? _httpContextAccessor.HttpContext?.User?.FindFirst("sub")?.Value;
    }

    public string? GetUserEmail()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Email)?.Value
            ?? _httpContextAccessor.HttpContext?.User?.FindFirst("email")?.Value;
    }

    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
}
