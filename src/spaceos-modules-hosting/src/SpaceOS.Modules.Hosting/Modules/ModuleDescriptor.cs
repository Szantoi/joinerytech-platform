namespace SpaceOS.Modules.Hosting.Modules;

/// <summary>
/// Immutable identity exposed by a module package to a shared host and its health endpoint.
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

    /// <summary>Package version exposed by the host.</summary>
    public string Version { get; }

    /// <summary>Assembly that contains the module's Entity Framework migrations.</summary>
    public string MigrationsAssembly { get; }
}
