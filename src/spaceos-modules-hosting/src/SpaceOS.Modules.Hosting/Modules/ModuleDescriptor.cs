namespace SpaceOS.Modules.Hosting.Modules;

/// <summary>
/// Immutable identity used by a module package and its shared host bootstrap.
/// Package metadata must not be exposed by anonymous liveness endpoints.
/// </summary>
public sealed record ModuleDescriptor
{
    /// <summary>Creates a validated descriptor for one loadable module package.</summary>
    public ModuleDescriptor(string moduleId, string version, string migrationsAssembly)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(moduleId);
        ArgumentException.ThrowIfNullOrWhiteSpace(version);
        ArgumentException.ThrowIfNullOrWhiteSpace(migrationsAssembly);

        ModuleId = moduleId;
        Version = version;
        MigrationsAssembly = migrationsAssembly;
    }

    /// <summary>Canonical catalog identifier, for example <c>spaceos.maintenance</c>.</summary>
    public string ModuleId { get; }

    /// <summary>Package version, for host bootstrap and authenticated telemetry only.</summary>
    public string Version { get; }

    /// <summary>Assembly that contains the module's Entity Framework migrations.</summary>
    public string MigrationsAssembly { get; }
}
