using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.Hosting.Authorization;

/// <summary>Registers and applies fail-closed, canonical module entitlement policies.</summary>
public static class ModuleEntitlementAuthorizationExtensions
{
    private const string PolicyPrefix = "SpaceOS.Module.Enabled.";

    /// <summary>
    /// Registers a named policy that requires the resolved tenant to have the requested
    /// canonical module enabled and a method-appropriate permission. Read methods require
    /// <c>view</c>, <c>edit</c> or <c>admin</c>; every other method requires <c>edit</c> or
    /// <c>admin</c>. Missing/malformed claims and unavailable tenant context deny.
    /// </summary>
    public static IServiceCollection AddRequiredEnabledModulePolicy(
        this IServiceCollection services,
        string moduleId)
    {
        ArgumentNullException.ThrowIfNull(services);
        ValidateModuleId(moduleId);

        // The policy can be installed without AddSpaceOsModuleTenancy(). Its handler
        // still needs request access to resolve the signed JWT claims fail-closed.
        services.AddHttpContextAccessor();
        services.AddAuthorization(options =>
            options.AddPolicy(PolicyName(moduleId), policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.Requirements.Add(new EnabledModuleRequirement(moduleId));
            }));
        services.TryAddEnumerable(
            ServiceDescriptor.Scoped<IAuthorizationHandler, EnabledModuleAuthorizationHandler>());
        return services;
    }

    /// <summary>Applies the canonical module gate to every endpoint in a route group.</summary>
    public static RouteGroupBuilder RequireEnabledModule(this RouteGroupBuilder group, string moduleId)
    {
        ArgumentNullException.ThrowIfNull(group);
        ValidateModuleId(moduleId);
        return group.RequireAuthorization(PolicyName(moduleId));
    }

    /// <summary>Gets the deterministic authorization policy name for a canonical module ID.</summary>
    public static string PolicyName(string moduleId)
    {
        ValidateModuleId(moduleId);
        return PolicyPrefix + moduleId;
    }

    private static void ValidateModuleId(string moduleId)
    {
        if (!TenantResolver.IsCanonicalModuleId(moduleId))
        {
            throw new ArgumentException(
                "Module authorization requires an ADR-067 canonical module ID (for example 'spaceos.maintenance').",
                nameof(moduleId));
        }
    }

    private sealed record EnabledModuleRequirement(string ModuleId) : IAuthorizationRequirement;

    private sealed class EnabledModuleAuthorizationHandler
        : AuthorizationHandler<EnabledModuleRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<EnabledModuleAuthorizationHandler> _logger;

        public EnabledModuleAuthorizationHandler(
            IHttpContextAccessor httpContextAccessor,
            ILogger<EnabledModuleAuthorizationHandler> logger)
        {
            ArgumentNullException.ThrowIfNull(httpContextAccessor);
            ArgumentNullException.ThrowIfNull(logger);
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            EnabledModuleRequirement requirement)
        {
            var httpContext = context.Resource as HttpContext ?? _httpContextAccessor.HttpContext;
            if (httpContext is null || context.User.Identity?.IsAuthenticated != true)
                return Task.CompletedTask;

            // Authorization runs before endpoint middleware in common host recipes. Resolve
            // from the JWT again here instead of relying on HttpContext.Items, while applying
            // the exact same header allowlist rule as TenantResolutionMiddleware.
            var requestedTenant = FirstHeader(httpContext, TenancyDefaults.TenantHeader)
                                  ?? FirstHeader(httpContext, TenancyDefaults.ActiveTenantHeader);
            var tenant = TenantResolver.Resolve(context.User, requestedTenant, _logger);
            if (tenant.Status == TenantResolutionStatus.Resolved
                && TenantResolver.GetEnabledModules(context.User, tenant.TenantId, _logger)
                    .Contains(requirement.ModuleId)
                && HasMethodPermission(
                    TenantResolver.GetPermissions(context.User, tenant.TenantId, _logger),
                    requirement.ModuleId,
                    httpContext.Request.Method))
            {
                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }

        private static string? FirstHeader(HttpContext context, string name)
            => context.Request.Headers.TryGetValue(name, out StringValues values)
                ? values.FirstOrDefault(static value => !string.IsNullOrWhiteSpace(value))
                : null;

        private static bool HasMethodPermission(
            IReadOnlySet<string> permissions,
            string moduleId,
            string method)
        {
            if (permissions.Contains($"{moduleId}.admin")
                || permissions.Contains($"{moduleId}.edit"))
            {
                return true;
            }

            return HttpMethods.IsGet(method)
                   || HttpMethods.IsHead(method)
                   || HttpMethods.IsOptions(method)
                ? permissions.Contains($"{moduleId}.view")
                : false;
        }
    }
}
