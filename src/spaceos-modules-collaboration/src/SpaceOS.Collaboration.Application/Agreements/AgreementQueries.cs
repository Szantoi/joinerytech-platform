using MediatR;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.Projections;

namespace SpaceOS.Collaboration.Application.Agreements;

/// <summary>Reads one agreement as the asking party may see it (B2B-10 F3/4).</summary>
public sealed record GetAgreementQuery(Guid AgreementId, Guid ActorTenantId, Guid ActorUserId)
    : IRequest<AgreementReadModel>;

/// <summary>
/// Participation is enough to read an agreement — no grant required.
/// </summary>
/// <remarks>
/// Gábor's decision (2026-07-30): the agreement itself is participation-based, because the grants
/// are issued BY the agreement. A guest that needed a grant to read the proposal could never reach
/// the state in which grants exist. What the agreement CARRIES stays grant-gated.
/// </remarks>
public sealed class GetAgreementHandler(
    ICollaborationAccessGuard accessGuard,
    CollaborationProjectionService projections) : IRequestHandler<GetAgreementQuery, AgreementReadModel>
{
    public async Task<AgreementReadModel> Handle(GetAgreementQuery query, CancellationToken cancellationToken)
    {
        var agreement = await accessGuard.EnsureParticipationAsync(
            query.AgreementId, query.ActorTenantId, cancellationToken);

        // The guard has already answered "may this tenant see it", so the projection cannot return
        // null here; if it ever did, that would be the two layers disagreeing and is worth a throw
        // rather than a null the endpoint would turn into an empty 200.
        return await projections.ProjectAgreementAsync(agreement, query.ActorTenantId, cancellationToken)
            ?? throw new InvalidOperationException(
                "The access guard admitted a tenant the projection refuses; the two disagree.");
    }
}
