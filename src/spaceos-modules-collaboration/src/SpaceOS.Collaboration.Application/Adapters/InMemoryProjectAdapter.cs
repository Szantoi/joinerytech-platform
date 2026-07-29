namespace SpaceOS.Collaboration.Application.Adapters;

public class InMemoryProjectAdapter : IProjectAdapter
{
    private readonly Dictionary<Guid, ProjectReference> _projects = new();

    public void RegisterProject(ProjectReference project)
    {
        _projects[project.FlowEpicId] = project;
    }

    public Task<ProjectReference?> GetProjectRefAsync(Guid flowEpicId, Guid requestingTenantId, CancellationToken cancellationToken = default)
    {
        if (_projects.TryGetValue(flowEpicId, out var project))
        {
            if (project.ProjectOwnerTenantId == requestingTenantId)
                return Task.FromResult<ProjectReference?>(project);
        }

        return Task.FromResult<ProjectReference?>(null);
    }
}
