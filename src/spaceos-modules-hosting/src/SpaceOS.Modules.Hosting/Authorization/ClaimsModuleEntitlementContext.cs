using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.Hosting.Authorization;

/// <summary>Claim-backed interim module gate used before the Kernel Instance Context is available.</summary>
public sealed class ClaimsModuleEntitlementContext : IModuleEntitlementContext
{
    private static readonly IReadOnlySet<string> Empty = new HashSet<string>(StringComparer.Ordinal);
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<ClaimsModuleEntitlementContext> _logger;

    /// <summary>Creates the request-scoped context.</summary>
    public ClaimsModuleEntitlementContext(
        IHttpContextAccessor httpContextAccessor,
        ILogger<ClaimsModuleEntitlementContext> logger)
    {
        ArgumentNullException.ThrowIfNull(httpContextAccessor);
        ArgumentNullException.ThrowIfNull(logger);
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    /// <inheritdoc />
    public IReadOnlySet<string> EnabledModules
    {
        get
        {
            var context = _httpContextAccessor.HttpContext;
            if (context?.User.Identity?.IsAuthenticated != true
                || context.Items.TryGetValue(TenancyDefaults.HttpContextItemKey, out var value) != true
                || value is not Guid tenantId)
            {
                return Empty;
            }

            return TenantResolver.GetEnabledModules(context.User, tenantId, _logger);
        }
    }

    /// <inheritdoc />
    public bool IsEnabled(string moduleId) => EnabledModules.Contains(moduleId);
}
