using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.DMS.Infrastructure;

namespace SpaceOS.Modules.DMS.Api;

/// <summary>
/// DMS module service registration for a host (EHS AddEhsModule precedent).
/// </summary>
public static class DmsServiceCollectionExtensions
{
    /// <summary>
    /// Registers all DMS module services: shared tenancy (ADR-061 — claims tenant
    /// context + RLS session interceptor), DbContext, repositories, blob store,
    /// expiry options and MediatR handlers.
    /// </summary>
    public static IServiceCollection AddDmsModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Infrastructure (shared tenancy + adapter, DbContext + shared RLS
        // interceptor, repositories, blob store, options)
        services.AddDMSInfrastructure(configuration);

        // Application (MediatR handlers)
        services.AddDMSApplication();

        return services;
    }

    /// <summary>
    /// Wire JSON setup shared by the host and the endpoint tests (Maintenance
    /// AddMaintenanceApiJsonOptions precedent): enums travel as CAMELCASE
    /// strings so the portal's canonical keys match exactly — DocType "rajz",
    /// DocLinkType "project", ExpiryState "lejart"; DocumentStatus is the
    /// English FSM naming ("draft"/"underReview"/"released"/"archived" —
    /// wire-language ADR candidate). String values remain accepted on input.
    /// </summary>
    public static IServiceCollection AddDmsApiJsonOptions(this IServiceCollection services)
    {
        services.ConfigureHttpJsonOptions(options =>
            options.SerializerOptions.Converters.Add(
                new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));

        return services;
    }
}
