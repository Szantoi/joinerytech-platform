namespace SpaceOS.Collaboration.Application.Adapters;

public record ProjectReference(Guid FlowEpicId, string Title, Guid ProjectOwnerTenantId);

public interface IProjectAdapter
{
    Task<ProjectReference?> GetProjectRefAsync(Guid flowEpicId, Guid requestingTenantId, CancellationToken cancellationToken = default);
}
