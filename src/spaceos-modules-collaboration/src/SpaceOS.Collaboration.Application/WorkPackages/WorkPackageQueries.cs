using MediatR;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.Projections;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.WorkPackages;

/// <summary>Reads one delegated work package as the asking party may see it (B2B-10 F3/2).</summary>
public sealed record GetWorkPackageQuery(Guid WorkPackageId, Guid ActorTenantId, Guid ActorUserId)
    : IRequest<WorkPackageReadModel>;

/// <summary>
/// Reading is a permission of its own: <see cref="CollaborationCapability.WorkPackageRead"/>.
/// </summary>
/// <remarks>
/// Separating read from execute is what makes a "look but don't touch" collaboration expressible —
/// a guest brought in to see the scope before it commits. With a single capability the host would
/// have to choose between showing nothing and handing over the whole lifecycle.
/// </remarks>
public sealed class GetWorkPackageHandler(
    ICollaborationAccessGuard accessGuard,
    IWorkPackageRepository repository,
    CollaborationProjectionService projections) : IRequestHandler<GetWorkPackageQuery, WorkPackageReadModel>
{
    public async Task<WorkPackageReadModel> Handle(GetWorkPackageQuery query, CancellationToken cancellationToken)
    {
        var workPackage = await repository.GetByIdAsync(query.WorkPackageId, cancellationToken)
            ?? throw new CollaborationResourceNotFoundException(
                nameof(DelegatedWorkPackage), query.WorkPackageId);

        await accessGuard.EnsureCapabilityAsync(
            workPackage.AgreementId,
            query.ActorTenantId,
            CollaborationCapability.WorkPackageRead,
            cancellationToken);

        // The projection also refuses a non-party, but by here the guard has already answered
        // that; the null-forgiveness below is safe for exactly that reason.
        return projections.ProjectWorkPackage(workPackage, query.ActorTenantId)!;
    }
}
