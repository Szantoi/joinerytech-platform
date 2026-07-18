using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Infrastructure;
using SpaceOS.Modules.Hosting.Wire;

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
    /// Wire JSON setup shared by the host and the endpoint tests: enums travel
    /// as the portal's canonical Hungarian wire keys via the shared
    /// <see cref="WireEnumConverter{TEnum}"/> seam (ADR-059, kontrolling
    /// precedent — see <see cref="DmsWire"/>): DocumentStatus
    /// "piszkozat"/"ellenorzes"/"kiadott"/"archivalt", DocType "rajz"/…,
    /// DocLinkType "project"/…, ExpiryState "lejart"/"lejaro". Unknown keys
    /// throw JsonException → 400; parsing is case-sensitive (the contract is
    /// exact). <see cref="JsonStringEnumConverter"/> is registered LAST as the
    /// fallback for any enum without an explicit map, keeping the "enums as
    /// strings" convention intact.
    /// </summary>
    public static IServiceCollection AddDmsApiJsonOptions(this IServiceCollection services)
    {
        services.ConfigureHttpJsonOptions(options =>
        {
            var converters = options.SerializerOptions.Converters;
            converters.Add(new WireEnumConverter<DocumentStatus>(DmsWire.Status));
            converters.Add(new WireEnumConverter<DocType>(DmsWire.Type));
            converters.Add(new WireEnumConverter<DocLinkType>(DmsWire.LinkType));
            converters.Add(new WireEnumConverter<ExpiryState>(DmsWire.Expiry));
            converters.Add(new JsonStringEnumConverter());
        });

        return services;
    }
}
