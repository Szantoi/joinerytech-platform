namespace SpaceOS.Modules.Hosting.Authorization;

/// <summary>
/// Read-only, request-scoped view of the module IDs enabled for the resolved tenant.
/// Missing, malformed or tenant-mismatched claims expose an empty set.
/// </summary>
public interface IModuleEntitlementContext
{
    /// <summary>Whether the resolved tenant is enabled for the requested canonical module ID.</summary>
    bool IsEnabled(string moduleId);

    /// <summary>Canonical module IDs enabled for the resolved tenant.</summary>
    IReadOnlySet<string> EnabledModules { get; }
}
