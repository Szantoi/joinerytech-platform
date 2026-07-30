using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Application.Projections;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data;

/// <summary>EF-backed read-side queries for the agreement view (B2B-10 F3/4).</summary>
/// <remarks>
/// Both queries run under the same tenant filters and RLS policies as everything else, so a view
/// assembled here cannot count or hash a row the caller may not see.
/// </remarks>
public sealed class AgreementViewQueries(CollaborationDbContext database) : IAgreementViewQueries
{
    /// <inheritdoc />
    public async Task<string?> GetTermsHashAsync(
        Guid termsRevisionId, CancellationToken cancellationToken = default)
        => await database.TermsRevisions
            .Where(revision => revision.Id == termsRevisionId)
            .Select(revision => revision.CanonicalHash)
            .FirstOrDefaultAsync(cancellationToken);

    /// <inheritdoc />
    public Task<int> CountOpenWorkPackagesAsync(
        Guid agreementId, CancellationToken cancellationToken = default)
        => database.WorkPackages
            // The closed set comes from the domain rather than being spelled out here: a copy of
            // that list in a Where clause is precisely what drifts when a state is added.
            .Where(package => package.AgreementId == agreementId
                && !DelegatedWorkPackage.ClosedStatuses.Contains(package.Status))
            .CountAsync(cancellationToken);
}
