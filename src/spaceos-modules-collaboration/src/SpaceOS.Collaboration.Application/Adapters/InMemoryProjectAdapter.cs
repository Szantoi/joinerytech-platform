namespace SpaceOS.Collaboration.Application.Adapters;

/// <summary>
/// Seeded stand-in for compositions without a Kernel (B2B-10 F5/2 reshaped it with the port).
/// </summary>
/// <remarks>
/// <b>Fail-closed by default:</b> an epic nobody registered resolves to <c>null</c>, exactly as
/// the Kernel answers for a foreign or absent one. A stand-in that resolved everything would
/// keep every create-path test green with the resolution step deleted — the permissive-double
/// mistake this module's test kit exists to avoid.
/// </remarks>
public class InMemoryProjectAdapter : IProjectAdapter
{
    private readonly Dictionary<Guid, ProjectReference> _projects = new();

    public void RegisterProject(ProjectReference project)
    {
        ArgumentNullException.ThrowIfNull(project);
        _projects[project.FlowEpicId] = project;
    }

    public Task<ProjectReference?> ResolveFlowEpicAsync(Guid flowEpicId, CancellationToken cancellationToken = default)
        => Task.FromResult(_projects.TryGetValue(flowEpicId, out var project) ? project : null);
}
